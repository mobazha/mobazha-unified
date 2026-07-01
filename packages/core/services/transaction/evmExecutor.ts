/**
 * EVM Payment Executor
 * EVM 链支付执行器 — 包装 UnifiedTransactionService
 *
 * 实现 ChainPaymentExecutor 接口，将 EVM 特定逻辑（approve + deposit、
 * nonce 管理、legacy tx 类型）封装在统一接口之后。
 *
 * 所有业务逻辑保留在 UnifiedTransactionService 中，本文件只是适配器。
 */

import type { JsonRpcSigner } from 'ethers';
import { UnifiedTransactionService } from './transactionService';
import type {
  ChainPaymentExecutor,
  ChainCategory,
  TransactionData,
  TxExecutionResult,
  ContractPaymentDetails,
} from './types';

export class EVMPaymentExecutor implements ChainPaymentExecutor {
  readonly category: ChainCategory = 'evm';
  private service: UnifiedTransactionService;

  constructor() {
    this.service = new UnifiedTransactionService();
  }

  /**
   * 使用 ethers JsonRpcSigner 初始化
   * @param params - JsonRpcSigner 实例
   */
  async initialize(params: unknown): Promise<boolean> {
    const signer = params as JsonRpcSigner;
    if (!signer) {
      console.warn('[EVMPaymentExecutor] initialize: invalid signer');
      return false;
    }
    return this.service.initializeWithSigner(signer);
  }

  /**
   * 执行通用 EVM 交易（confirm, cancel, refund 等）
   * @param instructions - EVM TransactionData { to, data, value }
   */
  async executeTransaction(instructions: unknown): Promise<TxExecutionResult> {
    const txData = instructions as TransactionData;
    if (!txData?.to) {
      return { success: false, error: 'Invalid EVM instructions: missing "to" field' };
    }
    return this.service.executeTransaction(txData);
  }

  /**
   * 执行合约支付（approve ERC20 + deposit to escrow）
   * @param instructions - EVM TransactionData { to, data, value }
   * @param details - 合约支付参数（tokenAddress, contractAddress, amount）
   */
  async executeContractPayment(
    instructions: unknown,
    details?: ContractPaymentDetails
  ): Promise<TxExecutionResult> {
    const txData = instructions as TransactionData;
    if (!txData?.to) {
      return { success: false, error: 'Invalid EVM instructions: missing "to" field' };
    }

    return this.service.executeContractPayment(
      details?.tokenAddress,
      details?.contractAddress || txData.to,
      details?.amount || '0',
      txData
    );
  }

  isReady(): boolean {
    return this.service.isServiceReady();
  }

  cleanup(): void {
    this.service.cleanup();
  }
}
