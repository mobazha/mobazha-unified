import type { CryptoType } from './common';

/**
 * 钱包余额
 */
export interface WalletBalance {
  confirmed: number;
  unconfirmed: number;
  total: number;
  currency: CryptoType;
  height?: number;
}

/**
 * 多币种钱包余额
 */
export interface MultiWalletBalance {
  [key: string]: WalletBalance;
}

/**
 * 交易记录
 */
export interface Transaction {
  txid: string;
  value: number;
  confirmations: number;
  height: number;
  timestamp: string;
  address?: string;
  status: TransactionStatus;
  orderId?: string;
  thumbnail?: string;
  memo?: string;
  currency: CryptoType;
}

/**
 * 交易状态
 */
export type TransactionStatus = 'PENDING' | 'CONFIRMED' | 'DEAD' | 'UNCONFIRMED';

/**
 * 交易费用级别
 */
export type FeeLevel = 'PRIORITY' | 'NORMAL' | 'ECONOMIC' | 'SUPER_ECONOMIC';

/**
 * 交易费用估算
 */
export interface FeeEstimate {
  priority: number;
  normal: number;
  economic: number;
  superEconomic: number;
}

/**
 * 发送交易请求
 */
export interface SendTransactionRequest {
  address: string;
  amount: number;
  feeLevel: FeeLevel;
  memo?: string;
  currency: CryptoType;
  spendAll?: boolean;
}

/**
 * 发送交易响应
 */
export interface SendTransactionResponse {
  txid: string;
  amount: number;
  confirmedBalance: number;
  unconfirmedBalance: number;
  timestamp: string;
  success: boolean;
  error?: string;
}

/**
 * 钱包地址
 */
export interface WalletAddress {
  address: string;
  currency: CryptoType;
}

/**
 * 汇率
 */
export interface ExchangeRate {
  [currency: string]: {
    [fiat: string]: number;
  };
}

/**
 * 外部钱包连接
 */
export interface ExternalWallet {
  address: string;
  chainId: number;
  chainName: string;
  connected: boolean;
}
