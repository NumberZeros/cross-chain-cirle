import type { Chain } from '../types';

// Supported chains configuration matching backend seed data
export const SUPPORTED_CHAINS: Chain[] = [
  {
    id: 'ethereum-mainnet',
    name: 'Ethereum',
    chainId: '1',
    type: 'EVM',
    environment: 'MAINNET',
    cctpEnabled: true,
    cctpDomain: 0,
    tokenMessenger: '0xbd3fa81b58ba92a82136038b25adec7066af3155',
    messageTransmitter: '0x0a992d191deec32afe36203ad87d7d289a738f81',
    usdcContract: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    rpcUrl: 'https://eth.llamarpc.com',
    explorerUrl: 'https://etherscan.io',
    nativeCurrency: 'ETH',
    isActive: true,
    iconUrl: 'https://cryptologos.cc/logos/ethereum-eth-logo.svg',
  },
  {
    id: 'polygon-mainnet',
    name: 'Polygon',
    chainId: '137',
    type: 'EVM',
    environment: 'MAINNET',
    cctpEnabled: true,
    cctpDomain: 7,
    tokenMessenger: '0x9daF8c91AEFAE50b9c0E69629D3F6Ca40cA3B3FE',
    messageTransmitter: '0xF3be9355363857F3e001be68856A2f96b4C39Ba9',
    usdcContract: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
    rpcUrl: 'https://polygon.llamarpc.com',
    explorerUrl: 'https://polygonscan.com',
    nativeCurrency: 'MATIC',
    isActive: true,
    iconUrl: 'https://cryptologos.cc/logos/polygon-matic-logo.svg',
  },
  {
    id: 'arbitrum-mainnet',
    name: 'Arbitrum',
    chainId: '42161',
    type: 'EVM',
    environment: 'MAINNET',
    cctpEnabled: true,
    cctpDomain: 3,
    tokenMessenger: '0x19330d10D9Cc8751218eaf51E8885D058642E08A',
    messageTransmitter: '0xC30362313FBBA5cf9163F0bb16a0e01f01A896ca',
    usdcContract: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    explorerUrl: 'https://arbiscan.io',
    nativeCurrency: 'ETH',
    isActive: true,
    iconUrl: 'https://cryptologos.cc/logos/arbitrum-arb-logo.svg',
  },
  {
    id: 'base-mainnet',
    name: 'Base',
    chainId: '8453',
    type: 'EVM',
    environment: 'MAINNET',
    cctpEnabled: true,
    cctpDomain: 6,
    tokenMessenger: '0x1682Ae6375C4E4A97e4B583BC394c861A46D8962',
    messageTransmitter: '0xAD09780d193884d503182aD4588450C416D6F9D4',
    usdcContract: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    rpcUrl: 'https://mainnet.base.org',
    explorerUrl: 'https://basescan.org',
    nativeCurrency: 'ETH',
    isActive: true,
    iconUrl: 'https://cryptologos.cc/logos/usd-base-coin-usdb-logo.svg',
  },
  {
    id: 'solana-mainnet',
    name: 'Solana',
    chainId: 'mainnet-beta',
    type: 'SOLANA',
    environment: 'MAINNET',
    cctpEnabled: true,
    cctpDomain: 5,
    tokenMessenger: 'CCTPmbSD7gX1bxKPAmg77w8oFzNFpaQiQUWD43TKaecd',
    messageTransmitter: 'CCTPiPYPc6AsJuwueEnWgSgucamXDZwBd53dQ11YiKX3',
    usdcContract: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    rpcUrl: import.meta.env.VITE_SOLANA_MAINNET_RPC_URL || 'https://api.mainnet-beta.solana.com',
    explorerUrl: 'https://solscan.io',
    nativeCurrency: 'SOL',
    isActive: true,
    iconUrl: 'https://cryptologos.cc/logos/solana-sol-logo.svg',
  },
];

// Testnet chains
export const TESTNET_CHAINS: Chain[] = [
  {
    id: 'ethereum-sepolia',
    name: 'Ethereum Sepolia',
    chainId: '11155111',
    type: 'EVM',
    environment: 'TESTNET',
    cctpEnabled: true,
    cctpDomain: 0,
    tokenMessenger: '0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5',
    messageTransmitter: '0x7865fAfC2db2093669d92c0F33AeEF291086BEFD',
    usdcContract: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
    rpcUrl: 'https://ethereum-sepolia.publicnode.com',
    explorerUrl: 'https://sepolia.etherscan.io',
    nativeCurrency: 'ETH',
    isActive: true,
  },
  {
    id: 'polygon-amoy',
    name: 'Polygon Amoy',
    chainId: '80002',
    type: 'EVM',
    environment: 'TESTNET',
    cctpEnabled: true,
    cctpDomain: 7,
    tokenMessenger: '0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5',
    messageTransmitter: '0x7865fAfC2db2093669d92c0F33AeEF291086BEFD',
    usdcContract: '0x41e94eb019c0762f9bfcf9fb1e58725bfb0e7582',
    rpcUrl: 'https://rpc-amoy.polygon.technology',
    explorerUrl: 'https://www.oklink.com/amoy',
    nativeCurrency: 'MATIC',
    isActive: true,
  },
  {
    id: 'solana-devnet',
    name: 'Solana Devnet',
    chainId: 'devnet',
    type: 'SOLANA',
    environment: 'TESTNET',
    cctpEnabled: true,
    cctpDomain: 5,
    tokenMessenger: 'CCTPmbSD7gX1bxKPAmg77w8oFzNFpaQiQUWD43TKaecd',
    messageTransmitter: 'CCTPiPYPc6AsJuwueEnWgSgucamXDZwBd53dQ11YiKX3',
    usdcContract: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
    rpcUrl: 'https://api.devnet.solana.com',
    explorerUrl: 'https://solscan.io',
    nativeCurrency: 'SOL',
    isActive: true,
  },
];

// Get all chains based on environment
export const getAllChains = (includeTestnet = false): Chain[] => {
  return includeTestnet ? [...SUPPORTED_CHAINS, ...TESTNET_CHAINS] : SUPPORTED_CHAINS;
};

// Get chain by ID
export const getChainById = (chainId: string): Chain | undefined => {
  return getAllChains(true).find((chain) => chain.id === chainId);
};

// Get chain by numeric chain ID (for wallet integration)
export const getChainByNumericId = (numericId: string | number): Chain | undefined => {
  return getAllChains(true).find((chain) => chain.chainId === String(numericId));
};

// Map wallet chain ID to backend chain ID
export const mapWalletChainIdToBackend = (walletChainId: number): string | undefined => {
  const chain = getChainByNumericId(walletChainId);
  return chain?.id;
};

// Map backend chain ID to wallet chain ID
export const mapBackendChainIdToWallet = (backendChainId: string): number | undefined => {
  const chain = getChainById(backendChainId);
  return chain?.type === 'EVM' ? Number(chain.chainId) : undefined;
};
