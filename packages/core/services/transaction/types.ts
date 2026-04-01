/**
 * Transaction Service Types
 * 交易服务类型定义
 */

// ── 基础类型 ──────────────────────────────────────────

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

/** 链的支付分类（与后端 PaymentModel 对齐） */
export type ChainCategory = 'evm' | 'solana' | 'utxo' | 'tron';

// 交易数据（EVM 格式）
export interface TransactionData {
  to: string;
  data?: string;
  value?: string;
}

// 交易执行结果
export interface TxExecutionResult {
  success: boolean;
  transactionHash?: string;
  /** Block number in which the transaction was mined (EVM/SOL) */
  blockNumber?: number;
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

// ── ChainPaymentExecutor 接口 ──────────────────────────

/**
 * 合约支付参数
 * 用于 EVM 的 approve + deposit 流程
 * Solana 忽略此参数（approval 内置于交易中）
 */
export interface ContractPaymentDetails {
  /** ERC20 代币地址（原生币为空） */
  tokenAddress?: string;
  /** 托管合约地址（EVM escrow） */
  contractAddress?: string;
  /** 支付金额（最小单位，用于 ERC20 approve 检查） */
  amount?: string;
}

/**
 * ChainPaymentExecutor — 链级支付执行器接口
 *
 * 每条链实现此接口，提供交易执行能力。
 * Registry 通过 ChainCategory 查找对应执行器。
 *
 * 生命周期：
 *   1. 从 registry 获取 executor
 *   2. initialize() 传入钱包/signer
 *   3. executeTransaction() 或 executeContractPayment()
 *   4. cleanup() 释放资源
 */
export interface ChainPaymentExecutor {
  /** 链分类 */
  readonly category: ChainCategory;

  /**
   * 初始化执行器（传入钱包 signer / provider）
   * 每次执行前必须调用
   */
  initialize(params: unknown): Promise<boolean>;

  /**
   * 执行通用链上交易（confirm, cancel, refund 等）
   * @param instructions 链特定的交易指令（EVM: TransactionData, Solana: GoInstruction[]）
   */
  executeTransaction(instructions: unknown): Promise<TxExecutionResult>;

  /**
   * 执行合约支付（初始付款场景）
   * EVM: approve ERC20 + deposit to escrow
   * Solana: 直接执行 program instructions
   */
  executeContractPayment(
    instructions: unknown,
    details?: ContractPaymentDetails
  ): Promise<TxExecutionResult>;

  /** 执行器是否就绪 */
  isReady(): boolean;

  /** 清理状态 */
  cleanup(): void;
}
