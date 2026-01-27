/**
 * Transaction Service Types
 * 交易服务类型定义
 */

// 网络类型
export type NetworkType =
  | 'ethereum'
  | 'polygon'
  | 'arbitrum'
  | 'base'
  | 'sepolia'
  | 'base-sepolia'
  | 'bsc'
  | 'bsc-testnet'
  | 'solana'
  | 'solana-devnet';

// 交易数据
export interface TransactionData {
  to: string;
  data?: string;
  value?: string;
}

// 交易执行结果
export interface TxExecutionResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
}

// ERC20 授权结果
export interface ApprovalResult {
  success: boolean;
  transactionHash?: string;
  skipped?: boolean;
  message?: string;
  error?: string;
}

// 服务状态
export interface ServiceStatus {
  currentNetworkType: NetworkType | null;
  walletAddress: string | null;
  isReady: boolean;
}

// 支付数据（用于合约支付）
export interface PaymentData {
  orderID: string;
  coin: string;
  amount: number | string;
  contractAddress?: string;
  paymentTokenAddress?: string;
}

// 交易指令
export interface TxInstructions {
  to: string;
  data: string;
  value: string;
}
