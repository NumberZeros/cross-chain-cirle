import { toast } from 'sonner';
import { create } from 'zustand';

import { type BridgeProgressEvent, bridgeService } from '../services/bridge';
import type { CCTPTransactionStatus, InitiateTransferDto } from '../types';

interface CurrentTransfer {
  readonly transactionId: string;
  readonly sourceChainId: string;
  readonly destChainId: string;
  readonly amount: string;
  readonly status: CCTPTransactionStatus;
  readonly sourceTxHash?: string;
  readonly destTxHash?: string;
  readonly errorMessage?: string;
}

interface InitiateTransferParams extends InitiateTransferDto {
  evmProvider?: unknown;
  solanaProvider?: unknown;
  recipientAddress: string; // REQUIRED: where USDC will be minted
}

interface RecoverTransferParams {
  sourceTxHash: string;
  sourceChainId: string;
  destChainId: string;
  amount: string;
  evmProvider?: unknown;
  solanaProvider?: unknown;
  // Note: recipientAddress is NOT needed for recovery - it's extracted from the attestation
}

interface TransferState {
  readonly current: CurrentTransfer | null;
  readonly isSubmitting: boolean;

  readonly initiateTransfer: (params: InitiateTransferParams) => Promise<void>;
  readonly recoverTransfer: (params: RecoverTransferParams) => Promise<void>;
  readonly reset: () => void;
}

// Helper to check if error message indicates mint already completed (SUCCESS)
const isMintAlreadyCompletedError = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message : String(error);
  return (
    (message.includes('Custom') && message.includes('0')) ||
    message.includes('already redeemed') ||
    message.includes('mint-already-completed') ||
    message.includes('mint-check-wallet') ||
    message.includes('mint-signature-expired') ||
    message.includes('message already received')
  );
};

export const useTransferStore = create<TransferState>((set) => ({
  current: null,
  isSubmitting: false,

  recoverTransfer: async ({
    sourceTxHash,
    sourceChainId,
    destChainId,
    amount,
    evmProvider,
    solanaProvider,
  }) => {
    set({ isSubmitting: true });
    try {
      const transactionId = crypto.randomUUID();
      set({
        current: {
          transactionId,
          sourceChainId,
          destChainId,
          amount,
          status: 'BURNING', // Assume burn succeeded
          sourceTxHash,
        },
      });

      const result = await bridgeService.recoverTransfer({
        sourceTxHash,
        sourceChainId,
        destChainId,
        amount,
        evmProvider,
        solanaProvider,
        onProgress: (event: BridgeProgressEvent) => {
          set((state) => {
            if (!state.current) return state;
            let newStatus = state.current.status;
            let destTxHash = state.current.destTxHash;

            const stepName = event.step.toLowerCase();
            if (event.state === 'pending') {
              if (stepName.includes('attestation')) newStatus = 'ATTESTING';
              if (stepName.includes('mint') || stepName.includes('receive'))
                newStatus = 'MINTING';
            }
            if (event.state === 'success') {
              if (stepName.includes('attestation')) newStatus = 'ATTESTED';
              if (stepName.includes('mint') || stepName.includes('receive')) {
                newStatus = 'COMPLETED';
                destTxHash = event.txHash;
              }
            }
            return {
              current: {
                ...state.current,
                status: newStatus,
                destTxHash: destTxHash || state.current.destTxHash,
              },
            };
          });
        },
      });

      // Check if mint completed despite error
      const mintStep = result.steps.find(
        (s) =>
          s.name.toLowerCase().includes('mint') ||
          s.name.toLowerCase().includes('receive'),
      );
      const mintHash = mintStep?.txHash;
      const isMintCompleted =
        mintHash && (mintHash !== 'mint-already-completed' || result.state === 'success');

      if (result.state !== 'success' && !isMintCompleted) {
        const sdkError = result.steps.find((s) => s.state === 'error');
        const sdkMsg =
          sdkError && 'errorMessage' in sdkError
            ? String((sdkError as { errorMessage?: unknown }).errorMessage ?? '')
            : '';
        throw new Error(sdkMsg || 'Recovery failed');
      }

      set((state) => ({
        current: state.current
          ? {
              ...state.current,
              status: 'COMPLETED',
              destTxHash: mintHash || state.current.destTxHash,
            }
          : null,
      }));

      const message =
        mintHash === 'mint-already-completed'
          ? 'Transfer already completed! USDC was previously minted to destination wallet.'
          : 'Transfer recovered successfully!';
      toast.success(message);
    } catch (error: unknown) {
      // Check if error is actually success (Custom:0 = already redeemed)
      if (isMintAlreadyCompletedError(error)) {
        set((state) => ({
          current: state.current
            ? {
                ...state.current,
                status: 'COMPLETED',
                destTxHash: 'mint-already-completed',
              }
            : null,
        }));
        toast.success('Transfer already completed! USDC was previously minted.');
        return;
      }

      const message = error instanceof Error ? error.message : 'Unexpected error';
      toast.error('Recovery failed', { description: message });
      set((state) => ({
        current: state.current
          ? {
              ...state.current,
              status: 'FAILED',
              errorMessage: message,
            }
          : null,
      }));
    } finally {
      set({ isSubmitting: false });
    }
  },

  initiateTransfer: async ({
    sourceChainId,
    destChainId,
    amount,
    evmProvider,
    solanaProvider,
    recipientAddress,
  }) => {
    set({ isSubmitting: true });
    try {
      const transactionId = crypto.randomUUID();

      set({
        current: {
          transactionId,
          sourceChainId,
          destChainId,
          amount,
          status: 'PENDING',
        },
      });

      // Execute bridge with progress tracking and explicit providers
      const result = await bridgeService.bridgeUSDC({
        sourceChainId,
        destChainId,
        amount,
        recipientAddress,
        evmProvider,
        solanaProvider,
        onProgress: (event: BridgeProgressEvent) => {
          set((state) => {
            if (!state.current) return state;

            let newStatus = state.current.status;
            let sourceTxHash = state.current.sourceTxHash;
            let destTxHash = state.current.destTxHash;

            /**
             * Mapping SDK Action Names to UI CCTPTransactionStatus:
             *
             * 'usdc.approve' -> APPROVING (we use PENDING)
             * 'cctp.v2.depositForBurn' -> BURNING -> BURNED
             * 'attestation' -> ATTESTING -> ATTESTED
             * 'cctp.v2.receiveMessage' -> MINTING -> COMPLETED
             */

            // Start of a step
            const stepName = event.step.toLowerCase();
            if (event.state === 'pending') {
              if (stepName.includes('burn') || stepName.includes('deposit'))
                newStatus = 'BURNING';
              if (stepName.includes('attestation')) newStatus = 'ATTESTING';
              if (stepName.includes('mint') || stepName.includes('receive'))
                newStatus = 'MINTING';
            }

            // Completion of a step
            if (event.state === 'success') {
              if (stepName.includes('burn') || stepName.includes('deposit')) {
                newStatus = 'BURNED';
                sourceTxHash = event.txHash;
              } else if (stepName.includes('attestation')) {
                newStatus = 'ATTESTED';
              } else if (stepName.includes('mint') || stepName.includes('receive')) {
                newStatus = 'COMPLETED';
                destTxHash = event.txHash;
              }
            }

            return {
              current: {
                ...state.current,
                status: newStatus,
                sourceTxHash: sourceTxHash || state.current.sourceTxHash,
                destTxHash: destTxHash || state.current.destTxHash,
              },
            };
          });
        },
      });

      const burnHash = result.steps.find(
        (s) =>
          s.name.toLowerCase().includes('burn') ||
          s.name.toLowerCase().includes('deposit'),
      )?.txHash;
      const mintHash = result.steps.find(
        (s) =>
          s.name.toLowerCase().includes('mint') ||
          s.name.toLowerCase().includes('receive'),
      )?.txHash;

      set((state) => ({
        current: state.current
          ? {
              ...state.current,
              status: 'COMPLETED',
              sourceTxHash: burnHash || state.current.sourceTxHash,
              destTxHash: mintHash || state.current.destTxHash,
            }
          : null,
      }));

      const message =
        mintHash === 'mint-already-completed'
          ? 'Transfer already completed! USDC was previously minted to destination wallet.'
          : 'Transfer completed successfully!';
      toast.success(message);
    } catch (error: unknown) {
      // Check if error is actually success (Custom:0 = already redeemed)
      if (isMintAlreadyCompletedError(error)) {
        set((state) => ({
          current: state.current
            ? {
                ...state.current,
                status: 'COMPLETED',
                destTxHash: 'mint-already-completed',
              }
            : null,
        }));
        toast.success('Transfer already completed! USDC was previously minted.');
        return;
      }

      let errorMsg = error instanceof Error ? error.message : 'Unexpected error';

      if (errorMsg.includes('Requested resource not available')) {
        errorMsg =
          'Your wallet is busy. Please close any open MetaMask popups and try again.';
      }

      if (errorMsg.includes('Unsupported account') || errorMsg.includes('Ethereum')) {
        errorMsg =
          'Wallet conflict detected. If using Phantom, ensure your account supports Ethereum, or try disabling Phantom as the default EVM wallet.';
      }

      set((state) => ({
        current: state.current
          ? { ...state.current, status: 'FAILED', errorMessage: errorMsg }
          : null,
      }));

      toast.error('Transfer failed', {
        description: errorMsg,
      });

      throw new Error(errorMsg);
    } finally {
      set({ isSubmitting: false });
    }
  },

  reset: () => {
    set({ current: null });
  },
}));
