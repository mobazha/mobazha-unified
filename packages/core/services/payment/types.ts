/**
 * Payment Service Types
 * 支付服务类型定义
 */

// 支持的链 ID
export enum ChainId {
  ETHEREUM = 1,
  ETHEREUM_SEPOLIA = 11155111,
  BSC = 56,
  BSC_TESTNET = 97,
  POLYGON = 137,
  POLYGON_MUMBAI = 80001,
  ARBITRUM = 42161,
  ARBITRUM_SEPOLIA = 421614,
  OPTIMISM = 10,
  OPTIMISM_SEPOLIA = 11155420,
  AVALANCHE = 43114,
  AVALANCHE_FUJI = 43113,
}

// 链信息
export interface ChainInfo {
  id: ChainId;
  name: string;
  shortName: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrls: string[];
  blockExplorerUrls: string[];
  iconUrl?: string;
  isTestnet: boolean;
  escrowContract?: string;
}

// 钱包连接状态
export enum WalletConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  ERROR = 'error',
}

// 钱包信息
export interface WalletInfo {
  address: string;
  chainId: ChainId;
  balance: string;
  provider: string; // MetaMask, WalletConnect, etc.
}

// 钱包连接事件
export enum WalletEvent {
  CONNECTED = 'wallet:connected',
  DISCONNECTED = 'wallet:disconnected',
  CHAIN_CHANGED = 'wallet:chainChanged',
  ACCOUNT_CHANGED = 'wallet:accountChanged',
  ERROR = 'wallet:error',
}

// 支付状态
export enum PaymentStatus {
  PENDING = 'pending',
  AWAITING_CONFIRMATION = 'awaiting_confirmation',
  CONFIRMED = 'confirmed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
  RELEASED = 'released',
  DISPUTED = 'disputed',
}

// 支付信息
export interface PaymentInfo {
  orderId: string;
  amount: string;
  currency: string;
  chainId: ChainId;
  escrowAddress: string;
  buyerAddress: string;
  sellerAddress: string;
  moderatorAddress?: string;
  transactionHash?: string;
  status: PaymentStatus;
  createdAt: number;
  updatedAt: number;
}

// 托管合约参数
export interface EscrowParams {
  orderId: string;
  amount: string;
  seller: string;
  moderator?: string;
  releaseTime: number; // 自动释放时间（秒）
  scriptHash?: string; // 多签脚本哈希
}

// 争议信息
export interface DisputeInfo {
  orderId: string;
  initiator: 'buyer' | 'seller';
  reason: string;
  evidence?: string[];
  resolution?: {
    winner: 'buyer' | 'seller';
    buyerAmount: string;
    sellerAmount: string;
    moderatorFee: string;
  };
  status: 'open' | 'resolved' | 'cancelled';
  createdAt: number;
}

// 交易参数
export interface TransactionParams {
  to: string;
  value: string;
  data?: string;
  gasLimit?: bigint;
  gasPrice?: bigint;
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
}

// 交易结果
export interface TransactionResult {
  hash: string;
  from: string;
  to: string;
  value: string;
  chainId: ChainId;
  status: 'pending' | 'confirmed' | 'failed';
  blockNumber?: number;
  confirmations?: number;
}

// 代币信息
export interface TokenInfo {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  chainId: ChainId;
  logoUrl?: string;
}

// 支持的稳定币
export const SUPPORTED_STABLECOINS: Record<ChainId, TokenInfo[]> = {
  [ChainId.ETHEREUM]: [
    {
      address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
      chainId: ChainId.ETHEREUM,
    },
    {
      address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      symbol: 'USDT',
      name: 'Tether USD',
      decimals: 6,
      chainId: ChainId.ETHEREUM,
    },
  ],
  [ChainId.BSC]: [
    {
      address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 18,
      chainId: ChainId.BSC,
    },
    {
      address: '0x55d398326f99059fF775485246999027B3197955',
      symbol: 'USDT',
      name: 'Tether USD',
      decimals: 18,
      chainId: ChainId.BSC,
    },
  ],
  [ChainId.POLYGON]: [
    {
      address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
      chainId: ChainId.POLYGON,
    },
    {
      address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
      symbol: 'USDT',
      name: 'Tether USD',
      decimals: 6,
      chainId: ChainId.POLYGON,
    },
  ],
  [ChainId.ARBITRUM]: [
    {
      address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
      chainId: ChainId.ARBITRUM,
    },
    {
      address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      symbol: 'USDT',
      name: 'Tether USD',
      decimals: 6,
      chainId: ChainId.ARBITRUM,
    },
  ],
  // Testnets
  [ChainId.ETHEREUM_SEPOLIA]: [],
  [ChainId.BSC_TESTNET]: [],
  [ChainId.POLYGON_MUMBAI]: [],
  [ChainId.ARBITRUM_SEPOLIA]: [],
  [ChainId.OPTIMISM]: [],
  [ChainId.OPTIMISM_SEPOLIA]: [],
  [ChainId.AVALANCHE]: [],
  [ChainId.AVALANCHE_FUJI]: [],
};

// 钱包服务配置
export interface WalletServiceConfig {
  projectId: string; // WalletConnect Project ID
  supportedChains: ChainId[];
  defaultChain: ChainId;
  autoConnect: boolean;
}

// 事件回调类型
export type WalletEventCallback = (data: unknown) => void;
