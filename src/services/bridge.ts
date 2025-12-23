import {
  createSolanaAdapterFromProvider,
  type CreateSolanaAdapterFromProviderParams,
} from '@circle-fin/adapter-solana';
import { createViemAdapterFromProvider } from '@circle-fin/adapter-viem-v2';
import {
  Blockchain,
  type BridgeResult,
  type ChainDefinition,
} from '@circle-fin/bridge-kit';
import * as BKChains from '@circle-fin/bridge-kit/chains';
import { CCTPV2BridgingProvider } from '@circle-fin/provider-cctp-v2';
import { Connection } from '@solana/web3.js';
import type { EIP1193Provider } from 'viem';
import { getChainById } from '../config/chains';
import { parseUSDC } from '../utils/usdc';

// ============================================================================
// Type Definitions
// ============================================================================

interface WalletWindow {
  ethereum?: EIP1193Provider;
  solana?: CreateSolanaAdapterFromProviderParams['provider'];
}

declare const window: WalletWindow & typeof globalThis;

export interface BridgeProgressEvent {
  step: string;
  state: 'pending' | 'success' | 'error' | 'noop';
  txHash?: string;
  errorMessage?: string;
}

type EvmAdapter = Awaited<ReturnType<typeof createViemAdapterFromProvider>>;
type SolanaAdapter = Awaited<ReturnType<typeof createSolanaAdapterFromProvider>>;
type Adapter = EvmAdapter | SolanaAdapter;

interface WalletContext {
  chain: ChainDefinition;
  adapter: Adapter;
  address: string;
}

interface DestinationWalletContext extends WalletContext {
  recipientAddress?: string;
}

// ============================================================================
// Bridge Service Class
// ============================================================================

export class BridgeService {
  private readonly provider = new CCTPV2BridgingProvider();

  // --------------------------------------------------------------------------
  // Public Methods
  // --------------------------------------------------------------------------

  /**
   * Bridge USDC from source chain to destination chain
   *
   * This method uses Circle's CCTP V2 protocol to burn USDC on the source chain
   * and mint it on the destination chain to the specified recipient address.
   *
   * @param params - Bridge parameters
   * @param params.sourceChainId - Source chain identifier (e.g., 'polygon-mainnet')
   * @param params.destChainId - Destination chain identifier (e.g., 'solana-mainnet')
   * @param params.amount - Amount to bridge in USDC (e.g., '1.5')
   * @param params.recipientAddress - Destination address where USDC will be minted
   * @param params.evmProvider - EVM wallet provider
   * @param params.solanaProvider - Solana wallet provider
   * @param params.onProgress - Progress callback
   *
   * @returns Bridge result with transaction hashes
   */
  async bridgeUSDC(params: {
    sourceChainId: string;
    destChainId: string;
    amount: string;
    recipientAddress: string;
    evmProvider?: unknown;
    solanaProvider?: unknown;
    onProgress?: (event: BridgeProgressEvent) => void;
  }): Promise<BridgeResult> {
    const {
      sourceChainId,
      destChainId,
      amount,
      recipientAddress,
      evmProvider,
      solanaProvider,
      onProgress,
    } = params;

    // Validate inputs
    if (!recipientAddress) {
      throw new Error('Recipient address is required');
    }

    const amountBaseUnits = this.toUsdcBaseUnits(amount);

    try {
      // Step 1: Create adapters
      const { sourceAdapter, destAdapter, sourceAddress } = await this.createAdapters({
        sourceChainId,
        destChainId,
        evmProvider,
        solanaProvider,
      });

      // Step 2: Get chain definitions
      const sourceChainDef = this.getChainDefinition(sourceChainId);
      const destChainDef = this.getChainDefinition(destChainId);

      // Step 3: Get destination address for signing mint transaction
      const destIsSolana = this.isSolanaChain(destChainId);
      const destAddress = await this.getAddressFromAdapter(
        destAdapter,
        destChainDef,
        destIsSolana,
      );

      // Step 4: Create wallet contexts
      const sourceCtx = this.createWalletContext(
        sourceChainDef,
        sourceAdapter,
        sourceAddress,
      );
      const destCtx = this.createDestinationContext(
        destChainDef,
        destAdapter,
        destAddress,
        recipientAddress,
      );

      // Step 5: Approve (if needed)
      await this.executeApprove(sourceCtx, amountBaseUnits, onProgress);

      // Step 6: Burn USDC on source chain
      const burnTxHash = await this.executeBurn(
        sourceCtx,
        destCtx,
        amountBaseUnits,
        onProgress,
      );

      // Step 7: Fetch attestation
      const attestation = await this.fetchAttestation(sourceCtx, burnTxHash, onProgress);

      // Step 8: Mint USDC on destination chain
      const mintTxHash = await this.executeMint(
        sourceCtx,
        destCtx,
        attestation,
        onProgress,
      );

      return this.createSuccessResult({
        amount: amountBaseUnits,
        sourceAddress,
        sourceChainDef,
        recipientAddress,
        destChainDef,
        burnTxHash,
        mintTxHash,
        attestation,
      });
    } finally {
      // Small delay to ensure all subscriptions are cleaned up
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  /**
   * Recover a stuck transfer by completing the mint step
   *
   * When a transfer's burn succeeded but mint failed, this method can recover it
   * by fetching the attestation and completing the mint. The recipient address
   * is extracted from the original burn transaction and cannot be changed.
   *
   * @param params - Recovery parameters
   * @param params.sourceTxHash - Source chain burn transaction hash
   * @param params.sourceChainId - Source chain identifier
   * @param params.destChainId - Destination chain identifier
   * @param params.amount - Original burn amount (for validation)
   * @param params.evmProvider - EVM wallet provider
   * @param params.solanaProvider - Solana wallet provider
   * @param params.onProgress - Progress callback
   *
   * @returns Bridge result with mint transaction hash
   */
  async recoverTransfer(params: {
    sourceTxHash: string;
    sourceChainId: string;
    destChainId: string;
    amount: string;
    evmProvider?: unknown;
    solanaProvider?: unknown;
    onProgress?: (event: BridgeProgressEvent) => void;
  }): Promise<BridgeResult> {
    const {
      sourceTxHash,
      sourceChainId,
      destChainId,
      amount,
      evmProvider,
      solanaProvider,
      onProgress,
    } = params;

    // Normalize tx hash based on source chain type
    const sourceChainDef = this.getChainDefinition(sourceChainId);
    const sourceIsSolana = this.isSolanaChain(sourceChainId);

    const normalizedTxHash = sourceIsSolana
      ? sourceTxHash.trim() // Solana uses base58 - just trim
      : this.normalizeEvmTxHash(sourceTxHash);

    const amountBaseUnits = this.toUsdcBaseUnits(amount);

    try {
      // Step 1: Create adapters
      const { sourceAdapter, destAdapter, sourceAddress } = await this.createAdapters({
        sourceChainId,
        destChainId,
        evmProvider,
        solanaProvider,
      });

      // Step 2: Get chain definitions (already got sourceChainDef above)
      const destChainDef = this.getChainDefinition(destChainId);

      // Step 3: Fetch attestation to get original recipient
      const sourceCtx = this.createWalletContext(
        sourceChainDef,
        sourceAdapter,
        sourceAddress,
      );
      const attestation = await this.fetchAttestation(
        sourceCtx,
        normalizedTxHash,
        onProgress,
      );

      // Step 4: Extract original recipient from attestation
      const recipientAddress = this.extractRecipientFromAttestation(attestation);

      // Step 5: Get destination signer address (connected wallet)
      const destAddress = await this.getAddressFromAdapter(
        destAdapter,
        destChainDef,
        this.isSolanaChain(destChainId),
      );

      // Step 6: Create destination context
      // Important: Use connected wallet address for signing, but funds go to original recipient
      const destCtx = this.createDestinationContext(
        destChainDef,
        destAdapter,
        destAddress,
        recipientAddress,
      );

      // Step 7: Execute mint
      const mintTxHash = await this.executeMint(
        sourceCtx,
        destCtx,
        attestation,
        onProgress,
      );

      return this.createSuccessResult({
        amount: amountBaseUnits,
        sourceAddress,
        sourceChainDef,
        recipientAddress,
        destChainDef,
        burnTxHash: normalizedTxHash,
        mintTxHash,
        attestation,
      });
    } finally {
      // Small delay to ensure all subscriptions are cleaned up
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  // --------------------------------------------------------------------------
  // Private Helper Methods - Adapter Creation
  // --------------------------------------------------------------------------

  private async createAdapters(params: {
    sourceChainId: string;
    destChainId: string;
    evmProvider?: unknown;
    solanaProvider?: unknown;
  }): Promise<{
    sourceAdapter: Adapter;
    destAdapter: Adapter;
    sourceAddress: string;
  }> {
    const { sourceChainId, destChainId, evmProvider, solanaProvider } = params;

    const sourceIsSolana = this.isSolanaChain(sourceChainId);
    const destIsSolana = this.isSolanaChain(destChainId);

    // Create source adapter
    const sourceAdapter = await this.createAdapter(
      sourceChainId,
      sourceIsSolana,
      evmProvider,
      solanaProvider,
    );

    // Create destination adapter
    const destAdapter = await this.createAdapter(
      destChainId,
      destIsSolana,
      evmProvider,
      solanaProvider,
    );

    // Get source address
    const sourceChainDef = this.getChainDefinition(sourceChainId);
    const sourceAddress = await this.getAddressFromAdapter(
      sourceAdapter,
      sourceChainDef,
      sourceIsSolana,
    );

    return { sourceAdapter, destAdapter, sourceAddress };
  }

  private async createAdapter(
    chainId: string,
    isSolana: boolean,
    evmProvider?: unknown,
    solanaProvider?: unknown,
  ): Promise<Adapter> {
    const chainConfig = getChainById(chainId);

    if (isSolana) {
      const provider = solanaProvider || window.solana;
      if (!provider) {
        throw new Error(`Solana wallet not connected for ${chainId}`);
      }

      // Create connection with optimized settings to avoid infinite polling
      const connection = chainConfig?.rpcUrl
        ? new Connection(chainConfig.rpcUrl, {
            commitment: 'confirmed',
            confirmTransactionInitialTimeout: 60000, // 60 seconds
          })
        : undefined;

      return createSolanaAdapterFromProvider({
        provider: provider as CreateSolanaAdapterFromProviderParams['provider'],
        connection,
      });
    } else {
      const provider = this.resolveEip1193Provider(evmProvider);
      if (!provider) {
        throw new Error(`EVM wallet not connected for ${chainId}`);
      }
      return createViemAdapterFromProvider({ provider });
    }
  }

  private async getAddressFromAdapter(
    adapter: Adapter,
    chainDef: ChainDefinition,
    isSolana: boolean,
  ): Promise<string> {
    if (isSolana) {
      type SolChain = Parameters<SolanaAdapter['getAddress']>[0];
      return (adapter as SolanaAdapter).getAddress(chainDef as unknown as SolChain);
    } else {
      type EvmChain = Parameters<EvmAdapter['getAddress']>[0];
      return (adapter as EvmAdapter).getAddress(chainDef as unknown as EvmChain);
    }
  }

  private resolveEip1193Provider(maybeProvider?: unknown): EIP1193Provider | undefined {
    const p = maybeProvider as
      | { request?: unknown; transport?: { value?: unknown } }
      | undefined
      | null;

    // Direct EIP-1193 provider
    if (p && typeof p.request === 'function') {
      return p as unknown as EIP1193Provider;
    }

    // Some clients expose provider on transport.value
    const transportValue = p?.transport?.value as { request?: unknown } | undefined;
    if (transportValue && typeof transportValue.request === 'function') {
      return transportValue as unknown as EIP1193Provider;
    }

    // Fallback to window
    return window.ethereum;
  }

  // --------------------------------------------------------------------------
  // Private Helper Methods - Wallet Contexts
  // --------------------------------------------------------------------------

  private createWalletContext(
    chain: ChainDefinition,
    adapter: Adapter,
    address: string,
  ): WalletContext {
    return {
      chain,
      adapter,
      address,
    };
  }

  private createDestinationContext(
    chain: ChainDefinition,
    adapter: Adapter,
    signerAddress: string,
    recipientAddress: string,
  ): DestinationWalletContext {
    return {
      chain,
      adapter,
      address: signerAddress, // Used for signing
      recipientAddress, // Where funds will be minted
    };
  }

  // --------------------------------------------------------------------------
  // Private Helper Methods - CCTP Operations
  // --------------------------------------------------------------------------

  private async executeApprove(
    sourceCtx: WalletContext,
    amount: string,
    onProgress?: (event: BridgeProgressEvent) => void,
  ): Promise<void> {
    // Solana doesn't require USDC approval - skip this step
    // Check chain by looking at the chain definition name/id
    const chainDef = sourceCtx.chain as ChainDefinition & { name?: string };
    if (chainDef.name?.toLowerCase().includes('solana')) {
      onProgress?.({ step: 'approve', state: 'noop' });
      return;
    }

    onProgress?.({ step: 'approve', state: 'pending' });

    const approveRequest = await this.provider.approve(sourceCtx as never, amount);

    if (!approveRequest) {
      // No approval needed (already approved or not required)
      onProgress?.({ step: 'approve', state: 'noop' });
      return;
    }

    // Execute the approval transaction
    await approveRequest.execute();
    onProgress?.({ step: 'approve', state: 'success' });
  }

  private async executeBurn(
    sourceCtx: WalletContext,
    destCtx: DestinationWalletContext,
    amount: string,
    onProgress?: (event: BridgeProgressEvent) => void,
  ): Promise<string> {
    onProgress?.({ step: 'burn', state: 'pending' });

    let lastTxHash: string | undefined;

    try {
      // Retry logic for Solana transaction expiry on burn
      const txHash = await this.executeWithRetry(async () => {
        const burnRequest = await this.provider.burn({
          source: sourceCtx as never,
          destination: destCtx as never,
          amount,
          token: 'USDC',
          config: {} as never,
        });

        // Execute with timeout to prevent hanging on account polling
        const executePromise = burnRequest.execute().then((hash) => {
          lastTxHash = hash;
          return hash;
        });

        const timeoutPromise = new Promise<string>((_, reject) => {
          setTimeout(() => {
            // If we have a hash after 30s, assume burn succeeded
            if (lastTxHash) {
              // Don't reject, just return what we have
              return lastTxHash;
            }
            reject(new Error('Burn execution timeout after 30 seconds'));
          }, 30000); // Reduce to 30s since burn should be fast
        });

        const hash = await Promise.race([executePromise, timeoutPromise]);
        return hash;
      }, 3);

      onProgress?.({ step: 'burn', state: 'success', txHash });
      return txHash;
    } catch (error) {
      // Check if we got a tx hash before error (Solana signature expired but tx succeeded)
      if (lastTxHash && this.isSolanaTxExpiredError(error)) {
        // Transaction may have succeeded despite expired signature
        // Return the hash so we can proceed to attestation
        onProgress?.({ step: 'burn', state: 'success', txHash: lastTxHash });
        return lastTxHash;
      }

      onProgress?.({ step: 'burn', state: 'error' });

      // Format Solana-specific errors
      if (error instanceof Error) {
        throw new Error(this.formatSolanaBurnError(error));
      }
      throw error;
    }
  }

  private async fetchAttestation(
    sourceCtx: WalletContext,
    txHash: string,
    onProgress?: (event: BridgeProgressEvent) => void,
  ): Promise<never> {
    onProgress?.({ step: 'fetchAttestation', state: 'pending' });

    const attestation = await this.provider.fetchAttestation(sourceCtx as never, txHash);
    onProgress?.({ step: 'fetchAttestation', state: 'success' });

    return attestation as never;
  }

  private async executeMint(
    _sourceCtx: WalletContext,
    destCtx: WalletContext | DestinationWalletContext,
    attestation: never,
    onProgress?: (event: BridgeProgressEvent) => void,
  ): Promise<string> {
    onProgress?.({ step: 'mint', state: 'pending' });

    let txHash: string;
    let lastTxHash: string | undefined;
    const isSolana = this.isSolanaChain(this.getChainIdFromContext(destCtx));

    try {
      // Use SDK mint but with aggressive timeout to cut off unnecessary polling
      txHash = await this.executeWithRetry(
        async () => {
          const mintRequest = await this.provider.mint(
            _sourceCtx as never,
            destCtx as never,
            attestation,
          );

          // Execute with short timeout - transaction confirms quickly on both chains
          const executePromise = mintRequest.execute().then((hash) => {
            lastTxHash = hash;
            return hash;
          });

          // Different timeouts for EVM (faster) vs Solana (needs more time for finalization)
          const timeoutMs = isSolana ? 30000 : 20000;
          const timeoutPromise = new Promise<string>((_, reject) => {
            setTimeout(() => {
              // If we have a hash, return it immediately - polling is unnecessary
              if (lastTxHash) {
                return lastTxHash;
              }
              reject(
                new Error(`Mint execution timeout after ${timeoutMs / 1000} seconds`),
              );
            }, timeoutMs);
          });

          const hash = await Promise.race([executePromise, timeoutPromise]);
          return hash || lastTxHash || 'mint-completed';
        },
        1, // Single attempt - if it fails, it's likely already redeemed
      );
    } catch (error) {
      const errorMsg = String(error);

      // Priority 1: If we have txHash, mint succeeded regardless of error
      if (lastTxHash) {
        onProgress?.({ step: 'mint', state: 'success', txHash: lastTxHash });
        return lastTxHash;
      }

      // Priority 2: Check for "Custom:0" (Solana) or "already redeemed" (both chains)
      if (
        (errorMsg.includes('Custom') && errorMsg.includes('0')) ||
        errorMsg.includes('already redeemed') ||
        errorMsg.includes('message already received')
      ) {
        onProgress?.({
          step: 'mint',
          state: 'success',
          txHash: 'mint-already-completed',
        });
        return 'mint-already-completed';
      }

      // Priority 3: Check for timeout with partial success
      if (errorMsg.includes('timeout') || errorMsg.includes('Timeout')) {
        onProgress?.({ step: 'mint', state: 'success', txHash: 'mint-check-wallet' });
        return 'mint-check-wallet';
      }

      // Priority 4: Solana signature expired (transaction may have succeeded)
      if (isSolana && this.isSolanaTxExpiredError(error)) {
        onProgress?.({
          step: 'mint',
          state: 'success',
          txHash: 'mint-signature-expired',
        });
        return 'mint-signature-expired';
      }

      // Only now treat as actual error - format chain-specific error messages
      onProgress?.({ step: 'mint', state: 'error' });

      // Format error message based on chain type
      if (error instanceof Error) {
        if (isSolana) {
          throw new Error(this.formatSolanaMintError(error));
        } else {
          throw new Error(this.formatEvmMintError(error));
        }
      }
      throw error;
    }

    onProgress?.({ step: 'mint', state: 'success', txHash });
    return txHash;
  }

  // --------------------------------------------------------------------------
  // Private Helper Methods - Retry Logic
  // --------------------------------------------------------------------------

  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxAttempts: number,
    onRetry?: (attempt: number) => void,
  ): Promise<T> {
    let lastError: unknown;
    let lastResult: T | undefined;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await operation();
        lastResult = result;
        return result;
      } catch (error) {
        lastError = error;

        // If this is a Solana tx expiry error and we have attempts left, retry
        if (this.isSolanaTxExpiredError(error) && attempt < maxAttempts) {
          onRetry?.(attempt);
          continue;
        }

        // If we have a result before error (Solana case), return it
        if (lastResult !== undefined && this.isSolanaTxExpiredError(error)) {
          return lastResult;
        }

        // Otherwise, throw the error
        throw error;
      }
    }

    // If we got a result before retries exhausted, return it
    if (lastResult !== undefined) {
      return lastResult;
    }

    throw lastError ?? new Error('Operation failed after retries');
  }

  // --------------------------------------------------------------------------
  // Private Helper Methods - Error Handling
  // --------------------------------------------------------------------------

  private isSolanaTxExpiredError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error);
    return (
      message.includes('block height exceeded') ||
      message.includes('BlockheightExceeded') ||
      message.includes('Signature has expired') ||
      message.includes('signature has expired') ||
      message.includes('Blockhash not found') ||
      message.includes('blockhash not found') ||
      message.includes('has expired')
    );
  }

  private formatSolanaBurnError(error: Error): string {
    const message = error.message;

    // Check for Phantom wallet disconnect
    if (
      message.includes('disconnected port') ||
      message.includes('Attempting to use a disconnected port')
    ) {
      return (
        'Phantom Wallet Connection Lost:\n\n' +
        'Please refresh the page and try again.\n' +
        'If the issue persists, try:\n' +
        '1. Restarting the Phantom extension\n' +
        '2. Clearing browser cache\n' +
        '3. Using a different browser'
      );
    }

    // Check for insufficient SOL
    if (
      message.includes('InsufficientFundsForRent') ||
      message.includes('insufficient')
    ) {
      return (
        'Insufficient SOL for Burn Transaction:\n\n' +
        'Your Solana wallet needs at least 0.005 SOL to cover:\n' +
        '- Transaction fees (~0.0001 SOL)\n' +
        '- Rent for CCTP accounts (~0.004 SOL)\n\n' +
        'Please add some SOL to your wallet and try again.'
      );
    }

    // Check for expired signature
    if (message.includes('block height exceeded') || message.includes('has expired')) {
      return (
        'Transaction Signature Expired:\n\n' +
        'The transaction took too long to confirm.\n' +
        'This usually happens when the network is congested.\n\n' +
        'The burn will be retried automatically (attempt 1-3).'
      );
    }

    return this.formatSolanaMintError(error);
  }

  private formatSolanaMintError(error: Error): string {
    const message = error.message;

    // Check for Phantom wallet disconnect
    if (
      message.includes('disconnected port') ||
      message.includes('Attempting to use a disconnected port')
    ) {
      return (
        'Phantom Wallet Connection Lost:\n\n' +
        'Please refresh the page and try again.\n' +
        'If the issue persists, try:\n' +
        '1. Restarting the Phantom extension\n' +
        '2. Clearing browser cache\n' +
        '3. Using a different browser'
      );
    }

    // Check for insufficient SOL for rent
    if (message.includes('InsufficientFundsForRent')) {
      return (
        'Insufficient SOL for Transaction:\n\n' +
        'Your Solana wallet needs at least 0.002 SOL to cover:\n' +
        '- Transaction fees (~0.0001 SOL)\n' +
        '- Rent for temporary accounts (~0.0015 SOL)\n\n' +
        'Please add some SOL to your wallet and try again.\n\n' +
        `Wallet: ${message.match(/Wallet: (\w+)/)?.[1] || 'Unknown'}`
      );
    }

    // Check for common Solana CCTP errors
    if (message.includes('Custom') && message.includes('0')) {
      return (
        'CCTP Mint Failed: This usually means:\n' +
        '1. Attestation not yet available (wait 10-20 mins after burn)\n' +
        '2. Message already redeemed (USDC already minted)\n' +
        '3. Invalid message parameters\n\n' +
        'Try recovery mode after waiting, or check destination wallet for funds.\n\n' +
        `Original error: ${message}`
      );
    }

    if (message.includes('InstructionError')) {
      return (
        `Solana Transaction Failed: ${message}\n\n` +
        'This may be a temporary issue. Try recovery mode to retry the mint step.'
      );
    }

    const logs = this.extractSolanaSimulationLogs(error);
    if (logs.length === 0) return message;

    const tail = logs.slice(-25).join('\n');
    return `${message}\n\nSolana simulation logs:\n${tail}`;
  }

  private extractSolanaSimulationLogs(error: unknown): string[] {
    const e = error as {
      logs?: unknown;
      getLogs?: () => unknown;
      cause?: unknown;
      simulationLogs?: unknown;
      transactionLogs?: unknown;
      innerError?: unknown;
    };

    // Check direct logs property
    if (Array.isArray(e?.logs)) {
      return e.logs.map(String);
    }

    // Check getLogs() method
    if (typeof e?.getLogs === 'function') {
      try {
        const maybe = e.getLogs();
        if (Array.isArray(maybe)) return maybe.map(String);
      } catch {
        // ignore
      }
    }

    // Check alternate property names
    if (Array.isArray(e?.simulationLogs)) {
      return e.simulationLogs.map(String);
    }
    if (Array.isArray(e?.transactionLogs)) {
      return e.transactionLogs.map(String);
    }

    // Check nested cause
    if (e?.cause && typeof e.cause === 'object') {
      const c = e.cause as { logs?: unknown; simulationLogs?: unknown };
      if (Array.isArray(c.logs)) return c.logs.map(String);
      if (Array.isArray(c.simulationLogs)) return c.simulationLogs.map(String);
    }

    // Check inner error (recursive)
    if (e?.innerError && typeof e.innerError === 'object') {
      return this.extractSolanaSimulationLogs(e.innerError);
    }

    return [];
  }

  private formatEvmMintError(error: Error): string {
    const message = error.message || String(error);

    // Check for common EVM errors
    if (message.includes('insufficient funds')) {
      return (
        'Insufficient ETH/native token for gas fees.\n\n' +
        'Please add native tokens to your wallet and try again.'
      );
    }

    if (message.includes('user rejected') || message.includes('User denied')) {
      return 'Transaction was rejected by user.';
    }

    if (
      message.includes('nonce too low') ||
      message.includes('replacement transaction')
    ) {
      return 'Transaction nonce conflict.\n\n' + 'Please wait a moment and try again.';
    }

    if (
      message.includes('already known') ||
      message.includes('already redeemed') ||
      message.includes('message already received')
    ) {
      return (
        'USDC has already been minted to the destination address.\n\n' +
        'Check your destination wallet - the transfer may have completed successfully.'
      );
    }

    if (message.includes('execution reverted')) {
      return (
        'Smart contract execution reverted.\n\n' +
        'This may indicate:\n' +
        '1. Message not yet attested (wait 10-20 mins)\n' +
        '2. Invalid attestation data\n' +
        '3. Message already consumed\n\n' +
        'Try using recovery mode to retry.'
      );
    }

    // Return original message if no specific formatting applies
    return message;
  }

  // --------------------------------------------------------------------------
  // Private Helper Methods - Data Transformation
  // --------------------------------------------------------------------------

  private toUsdcBaseUnits(amount: string): string {
    return parseUSDC(amount).toString();
  }

  private normalizeEvmTxHash(input: string): string {
    const trimmed = input.trim();
    const match = trimmed.match(/0x[a-fA-F0-9]{64}/);
    const hash = match ? match[0] : trimmed;

    if (!/^0x[a-fA-F0-9]{64}$/.test(hash)) {
      throw new Error(
        'Invalid transaction hash format. Expected 0x + 64 hex characters.',
      );
    }

    return `0x${hash.slice(2).toLowerCase()}`;
  }

  private extractRecipientFromAttestation(attestation: unknown): string {
    const decoded = attestation as {
      decodedMessage?: { decodedMessageBody?: { mintRecipient?: string } };
    };

    const recipient = decoded.decodedMessage?.decodedMessageBody?.mintRecipient;

    if (!recipient) {
      throw new Error(
        'Cannot extract mint recipient from attestation. Invalid burn transaction.',
      );
    }

    return recipient;
  }

  private createSuccessResult(params: {
    amount: string;
    sourceAddress: string;
    sourceChainDef: ChainDefinition;
    recipientAddress: string;
    destChainDef: ChainDefinition;
    burnTxHash: string;
    mintTxHash: string;
    attestation: unknown;
  }): BridgeResult {
    return {
      amount: params.amount,
      token: 'USDC',
      state: 'success',
      provider: 'CCTPV2BridgingProvider',
      source: {
        address: params.sourceAddress,
        chain: params.sourceChainDef,
      },
      destination: {
        address: params.recipientAddress,
        chain: params.destChainDef,
      },
      steps: [
        { name: 'approve', state: 'noop' },
        { name: 'burn', state: 'success', txHash: params.burnTxHash },
        { name: 'fetchAttestation', state: 'success', data: params.attestation },
        { name: 'mint', state: 'success', txHash: params.mintTxHash },
      ],
    };
  }

  // --------------------------------------------------------------------------
  // Private Helper Methods - Chain Mapping
  // --------------------------------------------------------------------------

  private getChainDefinition(chainId: string): ChainDefinition {
    const blockchain = this.mapAppChainIdToBlockchain(chainId);
    return this.mapBlockchainToDefinition(blockchain);
  }

  private isSolanaChain(chainId: string): boolean {
    return chainId.toLowerCase().includes('solana');
  }

  private getChainIdFromContext(ctx: WalletContext | DestinationWalletContext): string {
    // Get chainId from ChainDefinition by reverse lookup
    // Using kebab-case keys because they represent external chain identifiers
    const mapping: Record<string, ChainDefinition> = Object.fromEntries([
      ['ethereum-mainnet', BKChains.Ethereum],
      ['polygon-mainnet', BKChains.Polygon],
      ['arbitrum-mainnet', BKChains.Arbitrum],
      ['base-mainnet', BKChains.Base],
      ['solana-mainnet', BKChains.Solana],
      ['ethereum-sepolia', BKChains.EthereumSepolia],
      ['polygon-amoy', BKChains.PolygonAmoy],
      ['arbitrum-sepolia', BKChains.ArbitrumSepolia],
      ['base-sepolia', BKChains.BaseSepolia],
      ['solana-devnet', BKChains.SolanaDevnet],
    ]);

    for (const [chainId, def] of Object.entries(mapping)) {
      if (def === ctx.chain) {
        return chainId;
      }
    }

    throw new Error('Cannot determine chainId from WalletContext');
  }

  private mapAppChainIdToBlockchain(appChainId: string): Blockchain {
    // Use an object with kebab-case keys as they are external identifiers
    const mapping: Record<string, Blockchain> = Object.fromEntries([
      ['ethereum-mainnet', Blockchain.Ethereum],
      ['polygon-mainnet', Blockchain.Polygon],
      ['arbitrum-mainnet', Blockchain.Arbitrum],
      ['base-mainnet', Blockchain.Base],
      ['solana-mainnet', Blockchain.Solana],
      ['ethereum-sepolia', Blockchain.Ethereum_Sepolia],
      ['polygon-amoy', Blockchain.Polygon_Amoy_Testnet],
      ['arbitrum-sepolia', Blockchain.Arbitrum_Sepolia],
      ['base-sepolia', Blockchain.Base_Sepolia],
      ['solana-devnet', Blockchain.Solana_Devnet],
    ]);
    // eslint-enable @typescript-eslint/naming-convention

    const blockchain = mapping[appChainId];
    if (!blockchain) {
      throw new Error(`Unsupported chain: ${appChainId}`);
    }

    return blockchain;
  }

  private mapBlockchainToDefinition(blockchain: Blockchain): ChainDefinition {
    const mapping: Partial<Record<Blockchain, ChainDefinition>> = {
      [Blockchain.Ethereum]: BKChains.Ethereum,
      [Blockchain.Polygon]: BKChains.Polygon,
      [Blockchain.Arbitrum]: BKChains.Arbitrum,
      [Blockchain.Base]: BKChains.Base,
      [Blockchain.Solana]: BKChains.Solana,
      [Blockchain.Ethereum_Sepolia]: BKChains.EthereumSepolia,
      [Blockchain.Polygon_Amoy_Testnet]: BKChains.PolygonAmoy,
      [Blockchain.Arbitrum_Sepolia]: BKChains.ArbitrumSepolia,
      [Blockchain.Base_Sepolia]: BKChains.BaseSepolia,
      [Blockchain.Solana_Devnet]: BKChains.SolanaDevnet,
    };

    const def = mapping[blockchain];
    if (!def) {
      throw new Error(`Unsupported blockchain: ${blockchain}`);
    }

    return def;
  }
}

export const bridgeService = new BridgeService();
