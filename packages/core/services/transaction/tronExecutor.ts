/**
 * TRON Payment Executor
 * TRON 链支付执行器 — 通过 TronLink 或 WalletConnect 执行 TRC-20 Escrow 交易
 *
 * 实现 ChainPaymentExecutor 接口：
 * - initialize(): 接收 tronWeb 实例（来自 TronLink injection 或 WC adapter）
 * - executeTransaction(): 执行通用链上交易（confirm, cancel, refund）
 * - executeContractPayment(): approve TRC-20 + addTokenTransaction
 *
 * TRON 交易模型与 EVM 类似（Solidity 合约），但使用 tronWeb ABI 编码。
 */

import type {
  ChainPaymentExecutor,
  ChainCategory,
  TxExecutionResult,
  ContractPaymentDetails,
} from './types';

interface TronWeb {
  ready: boolean;
  defaultAddress?: { base58?: string; hex?: string };
  trx: {
    sign(transaction: unknown): Promise<unknown>;
    sendRawTransaction(signedTx: unknown): Promise<{ txid?: string; result?: boolean }>;
    getBalance(address: string): Promise<number>;
  };
  transactionBuilder: {
    triggerSmartContract(
      contractAddress: string,
      functionSelector: string,
      options: Record<string, unknown>,
      parameters: Array<{ type: string; value: unknown }>,
      issuerAddress: string
    ): Promise<{ transaction: unknown; result?: { result?: boolean } }>;
    triggerConfirmedConstantContract(
      contractAddress: string,
      functionSelector: string,
      options: Record<string, unknown>,
      parameters: Array<{ type: string; value: unknown }>,
      issuerAddress: string
    ): Promise<{ constant_result?: string[] }>;
  };
  toSun(amount: number): number;
}

interface TronTransactionData {
  to: string;
  data?: string;
  value?: string;
  functionSelector?: string;
  parameters?: Array<{ type: string; value: unknown }>;
}

export class TronPaymentExecutor implements ChainPaymentExecutor {
  readonly category: ChainCategory = 'tron';
  private tronWeb: TronWeb | null = null;

  /**
   * 使用 tronWeb 实例初始化（来自 window.tronWeb 或 WC adapter）
   */
  async initialize(params: unknown): Promise<boolean> {
    const tw = params as TronWeb;
    if (!tw?.ready) {
      console.warn('[TronPaymentExecutor] initialize: tronWeb not ready');
      return false;
    }
    this.tronWeb = tw;
    return true;
  }

  /**
   * 执行通用 TRON 交易（confirm, cancel, refund 等）
   * 后端返回的 instructions 包含 to、functionSelector、parameters
   */
  async executeTransaction(instructions: unknown): Promise<TxExecutionResult> {
    if (!this.tronWeb) {
      return { success: false, error: 'TronWeb not initialized' };
    }

    const txData = instructions as TronTransactionData;
    if (!txData?.to) {
      return { success: false, error: 'Invalid TRON instructions: missing "to" field' };
    }

    try {
      const address = this.tronWeb.defaultAddress?.base58;
      if (!address) {
        return { success: false, error: 'No TRON wallet address connected' };
      }

      const result = await this.triggerAndSign(txData, address);
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('[TronPaymentExecutor] executeTransaction failed:', message);
      return { success: false, error: message };
    }
  }

  /**
   * 执行合约支付（TRC-20 approve + addTokenTransaction）
   */
  async executeContractPayment(
    instructions: unknown,
    details?: ContractPaymentDetails
  ): Promise<TxExecutionResult> {
    if (!this.tronWeb) {
      return { success: false, error: 'TronWeb not initialized' };
    }

    const txData = instructions as TronTransactionData;
    if (!txData?.to) {
      return { success: false, error: 'Invalid TRON instructions: missing "to" field' };
    }

    try {
      const address = this.tronWeb.defaultAddress?.base58;
      if (!address) {
        return { success: false, error: 'No TRON wallet address connected' };
      }

      if (details?.tokenAddress && details.contractAddress && details.amount) {
        const approvalResult = await this.ensureAllowance(
          details.tokenAddress,
          details.contractAddress,
          details.amount,
          address
        );
        if (!approvalResult.success) {
          return approvalResult;
        }
      }

      const result = await this.triggerAndSign(txData, address);
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('[TronPaymentExecutor] executeContractPayment failed:', message);
      return { success: false, error: message };
    }
  }

  isReady(): boolean {
    return this.tronWeb?.ready === true && !!this.tronWeb.defaultAddress?.base58;
  }

  cleanup(): void {
    this.tronWeb = null;
  }

  // ── Private helpers ──────────────────────────────────

  private async triggerAndSign(
    txData: TronTransactionData,
    issuerAddress: string
  ): Promise<TxExecutionResult> {
    if (!this.tronWeb) {
      return { success: false, error: 'TronWeb not available' };
    }

    const functionSelector = txData.functionSelector || '';
    const parameters = txData.parameters || [];
    const callValue = txData.value ? parseInt(txData.value, 10) : 0;

    const { transaction, result } = await this.tronWeb.transactionBuilder.triggerSmartContract(
      txData.to,
      functionSelector,
      { callValue, feeLimit: 150_000_000 },
      parameters,
      issuerAddress
    );

    if (!result?.result) {
      return { success: false, error: 'Failed to build TRON transaction' };
    }

    const signedTx = await this.tronWeb.trx.sign(transaction);
    const broadcast = await this.tronWeb.trx.sendRawTransaction(signedTx);

    if (!broadcast.result) {
      return { success: false, error: 'TRON transaction broadcast failed' };
    }

    return { success: true, transactionHash: broadcast.txid };
  }

  private async ensureAllowance(
    tokenAddress: string,
    spender: string,
    amount: string,
    owner: string
  ): Promise<TxExecutionResult> {
    if (!this.tronWeb) {
      return { success: false, error: 'TronWeb not available' };
    }

    try {
      const allowanceResult =
        await this.tronWeb.transactionBuilder.triggerConfirmedConstantContract(
          tokenAddress,
          'allowance(address,address)',
          {},
          [
            { type: 'address', value: owner },
            { type: 'address', value: spender },
          ],
          owner
        );

      const currentAllowance = BigInt('0x' + (allowanceResult.constant_result?.[0] || '0'));
      const requiredAmount = BigInt(amount);

      if (currentAllowance >= requiredAmount) {
        return { success: true };
      }
    } catch {
      // Allowance check failed — proceed with approve anyway
    }

    const approveResult = await this.triggerAndSign(
      {
        to: tokenAddress,
        functionSelector: 'approve(address,uint256)',
        parameters: [
          { type: 'address', value: spender },
          { type: 'uint256', value: amount },
        ],
      },
      owner
    );

    return approveResult;
  }
}
