// Chain Types
export type ChainType = 'EVM' | 'SOLANA';
export type ChainEnvironment = 'MAINNET' | 'TESTNET';

export interface Chain {
  id: string;
  name: string;
  chainId: string;
  type: ChainType;
  environment: ChainEnvironment;
  cctpEnabled: boolean;
  cctpDomain: number;
  tokenMessenger: string;
  messageTransmitter: string;
  usdcContract: string;
  rpcUrl: string;
  explorerUrl: string;
  nativeCurrency: string;
  isActive: boolean;
  iconUrl?: string;
}

// CCTP Transaction Status
export const CCTP_TRANSACTION_STATUS = {
  PENDING: 'PENDING',
  BURNING: 'BURNING',
  BURNED: 'BURNED',
  ATTESTING: 'ATTESTING',
  ATTESTED: 'ATTESTED',
  MINTING: 'MINTING',
  // gateway-socket broadcasts this value on mint confirmation
  MINTED: 'MINTED',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  EXPIRED: 'EXPIRED',
} as const;

export type CCTPTransactionStatus =
  (typeof CCTP_TRANSACTION_STATUS)[keyof typeof CCTP_TRANSACTION_STATUS];

// Wallet Types
export const WALLET_TYPE = {
  METAMASK: 'METAMASK',
  COINBASE_WALLET: 'COINBASE_WALLET',
  WALLET_CONNECT: 'WALLET_CONNECT',
  PHANTOM: 'PHANTOM',
  INJECTED: 'INJECTED',
  OTHER: 'OTHER',
} as const;

export type WalletType = (typeof WALLET_TYPE)[keyof typeof WALLET_TYPE];

export interface Wallet {
  id: string;
  userId: string;
  address: string;
  walletType: WalletType;
  chain: string;
  isConnected: boolean;
  isPrimary: boolean;
  label?: string;
}

// Authentication DTOs
export interface NonceRequestDto {
  address: string;
  chainType: ChainType;
}

export interface NonceResponseDto {
  nonce: string;
  message: string;
  expiresIn: number;
}

export interface VerifyRequestDto {
  address: string;
  chainType: ChainType;
  signature: string;
  nonce: string;
}

export interface AuthResponseDto {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  userId: string;
  address: string;
}

// Transfer DTOs
export interface InitiateTransferDto {
  sourceChainId: string;
  destChainId: string;
  amount: string;
}

export interface TransferStatusDto {
  transactionId: string;
  status: CCTPTransactionStatus;
  sourceTxHash?: string;
  destTxHash?: string;
  timestamp: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface BurnConfirmedEvent {
  transactionId: string;
  source_tx_hash: string;
  blockNumber?: string;
  timestamp: string;
}

export interface AttestationReceivedEvent {
  transactionId: string;
  attestation: string;
  messageHash?: string;
  timestamp: string;
}

export interface MintConfirmedEvent {
  transactionId: string;
  dest_tx_hash: string;
  blockNumber?: string;
  timestamp: string;
}

export interface TransferCompletedEvent {
  transactionId: string;
  source_tx_hash: string;
  dest_tx_hash: string;
  amount: string;
  totalTimeMs?: number;
  timestamp: string;
}

export interface TransferFailedEvent {
  transactionId: string;
  errorMessage: string;
  timestamp: string;
}

// Transfer Speed
export type TransferSpeed = 'FAST' | 'SLOW';

export interface CCTPTransaction {
  id: string;
  userId: string;
  sourceChainId: string;
  destChainId: string;
  amount: string;
  status: CCTPTransactionStatus;
  sourceTxHash?: string;
  destTxHash?: string;
  attestation?: string;
  messageHash?: string;
  transferSpeed: TransferSpeed;
  createdAt: string;
  updatedAt: string;
}
