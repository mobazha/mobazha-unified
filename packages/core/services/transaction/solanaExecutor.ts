/**
 * Solana Payment Executor
 * Solana 链支付执行器
 *
 * 实现 ChainPaymentExecutor 接口。当前 Solana escrow 支付尚未实现
 * （后端 relay 未就绪，前端缺少 @solana/web3.js + AppKit Solana adapter），
 * 执行器返回明确的"不支持"错误，引导用户使用其他支付方式。
 *
 * 当 Solana 支付就绪后，此文件需要：
 * 1. 添加 @solana/web3.js 依赖
 * 2. 添加 @reown/appkit-adapter-solana 依赖
 * 3. 实现 Go 指令 → Solana Transaction 转换
 * 4. 实现 signAndSendTransaction + confirmTransaction 流程
 */

import type {
  ChainPaymentExecutor,
  ChainCategory,
  TxExecutionResult,
  ContractPaymentDetails,
} from './types';

// ── Go 后端 Solana 指令格式类型定义 ──────────────────

/** Solana Go 后端返回的单个账户 */
export interface SolanaGoAccountValue {
  PublicKey: string;
  IsSigner: boolean;
  IsWritable: boolean;
}

/** Solana Go 后端返回的单条指令 */
export interface SolanaGoInstruction {
  ProgID: string;
  AccountValues: SolanaGoAccountValue[];
  DataBytes: string; // base64 encoded
}

// ── Solana Payment Executor ─────────────────────────

export class SolanaPaymentExecutor implements ChainPaymentExecutor {
  readonly category: ChainCategory = 'solana';

  /**
   * 初始化 Solana 执行器
   * 当前为占位实现 — Solana 支付暂不支持
   *
   * 未来实现：接收 Solana Connection + WalletProvider
   * @param _params - 保留参数（未来用于 Connection / WalletProvider）
   */
  async initialize(_params: unknown): Promise<boolean> {
    // 占位：当 @solana/web3.js 和 AppKit Solana adapter 集成后实现
    console.warn('[SolanaPaymentExecutor] Solana payment execution not yet supported');
    return false;
  }

  /**
   * 执行 Solana 交易
   * 当前返回"不支持"错误
   *
   * 未来实现流程：
   * 1. convertSolanaGoInstructions(instructions) → TransactionInstruction[]
   * 2. 构建 Transaction，设置 blockhash + feePayer
   * 3. simulateTransaction() 预检
   * 4. walletProvider.signAndSendTransaction()
   * 5. confirmTransaction() 轮询确认
   */
  async executeTransaction(_instructions: unknown): Promise<TxExecutionResult> {
    return {
      success: false,
      error: 'Solana payment execution not yet supported. Please use an EVM chain for payment.',
    };
  }

  /**
   * 执行 Solana 合约支付
   * Solana 不需要单独的 approve 步骤，直接执行 program instructions
   */
  async executeContractPayment(
    instructions: unknown,
    _details?: ContractPaymentDetails
  ): Promise<TxExecutionResult> {
    return this.executeTransaction(instructions);
  }

  isReady(): boolean {
    // Solana executor 当前始终返回 false
    return false;
  }

  cleanup(): void {
    // No-op for stub implementation
  }
}

// ── Solana 指令转换工具（供未来实现使用）──────────────

/**
 * 验证 Solana Go 指令格式是否合法
 * 可在 Solana 支付就绪前用于 API 响应验证
 */
export function isValidSolanaGoInstructions(data: unknown): data is SolanaGoInstruction[] {
  if (!Array.isArray(data)) return false;
  return data.every(
    (item: Record<string, unknown>) =>
      typeof item.ProgID === 'string' &&
      Array.isArray(item.AccountValues) &&
      typeof item.DataBytes === 'string'
  );
}
