/**
 * Payment Executor Registry
 * 支付执行器注册表 — 统一管理不同链的支付执行器
 *
 * 与后端 pkg/payment/Registry 模式一致：
 * - 注册：按 ChainCategory 注册执行器
 * - 查找：通过 ChainCategory 或 coin 标识符获取执行器
 * - 扩展：添加新链只需实现 ChainPaymentExecutor 并注册
 */

import type { ChainPaymentExecutor, ChainCategory } from './types';
import { EVMPaymentExecutor } from './evmExecutor';
import { SolanaPaymentExecutor } from './solanaExecutor';
import { TronPaymentExecutor } from './tronExecutor';

// ── Registry ────────────────────────────────────────

class ExecutorRegistry {
  private executors = new Map<ChainCategory, ChainPaymentExecutor>();

  /** 注册执行器 */
  register(category: ChainCategory, executor: ChainPaymentExecutor): void {
    this.executors.set(category, executor);
  }

  /** 按链分类获取执行器 */
  get(category: ChainCategory): ChainPaymentExecutor | undefined {
    return this.executors.get(category);
  }

  /** 获取所有已注册的分类 */
  categories(): ChainCategory[] {
    return Array.from(this.executors.keys());
  }
}

// ── 单例 Registry 初始化 ──────────────────────────

let registryInstance: ExecutorRegistry | null = null;

/**
 * 获取全局 ExecutorRegistry（单例）
 * 首次调用时自动注册 EVM 和 Solana 执行器
 */
export function getExecutorRegistry(): ExecutorRegistry {
  if (!registryInstance) {
    registryInstance = new ExecutorRegistry();
    registryInstance.register('evm', new EVMPaymentExecutor());
    registryInstance.register('solana', new SolanaPaymentExecutor());
    registryInstance.register('tron', new TronPaymentExecutor());
  }
  return registryInstance;
}

/** 重置 registry（用于测试） */
export function resetExecutorRegistry(): void {
  if (registryInstance) {
    for (const cat of registryInstance.categories()) {
      registryInstance.get(cat)?.cleanup();
    }
  }
  registryInstance = null;
}

// ── Coin → ChainCategory 解析 ─────────────────────

/** UTXO 链 coin 标识符 */
const UTXO_COINS = new Set(['BTC', 'BCH', 'LTC', 'ZEC']);

/** EVM 链 coin 标识符（含 ERC20 tokens） */
const EVM_COINS = new Set([
  'ETH',
  'BNB',
  'MATIC',
  'BASE',
  'CFX',
  // ERC20 tokens on various EVM chains
  'USDT',
  'USDC',
  'DAI',
  'BUSD',
]);

/** Solana 链 coin 标识符 */
const SOLANA_COINS = new Set(['SOL']);

/** TRON 链 coin 标识符（含 TRC20 tokens） */
const TRON_COINS = new Set(['TRX', 'TRONUSDT']);

/**
 * 从 coin 标识符解析链分类
 * 用于在 paymentChain 不可用时，通过 paymentCoin 推断链类型
 */
export function resolveChainCategory(coin: string): ChainCategory | null {
  const upper = coin.toUpperCase();
  if (UTXO_COINS.has(upper)) return 'utxo';
  if (EVM_COINS.has(upper)) return 'evm';
  if (SOLANA_COINS.has(upper)) return 'solana';
  if (TRON_COINS.has(upper)) return 'tron';
  return null;
}

/**
 * 从后端 paymentChain 字段解析链分类
 * paymentChain 值如 "ETHEREUM", "BSC", "SOLANA", "BITCOIN" 等
 */
export function resolveChainCategoryFromPaymentChain(paymentChain: string): ChainCategory | null {
  const upper = paymentChain.toUpperCase();

  // EVM chains
  if (['ETHEREUM', 'BSC', 'POLYGON', 'BASE', 'CONFLUX'].includes(upper)) {
    return 'evm';
  }

  // Solana
  if (upper === 'SOLANA') {
    return 'solana';
  }

  // TRON
  if (upper === 'TRON') {
    return 'tron';
  }

  // UTXO chains
  if (['BITCOIN', 'BITCOINCASH', 'LITECOIN', 'ZCASH'].includes(upper)) {
    return 'utxo';
  }

  return null;
}

/**
 * 获取支付执行器（便捷函数）
 * 优先使用 paymentChain（后端返回的链类型），回退到 coin 推断
 *
 * @param paymentChain - 后端返回的链类型（如 "ETHEREUM", "SOLANA"）
 * @param coin - 支付币种（如 "ETH", "SOL", "BTC"）
 * @returns 执行器实例，或 null（UTXO / 未知链）
 */
export function getPaymentExecutor(
  paymentChain?: string,
  coin?: string
): ChainPaymentExecutor | null {
  let category: ChainCategory | null = null;

  // 优先从 paymentChain 解析
  if (paymentChain) {
    category = resolveChainCategoryFromPaymentChain(paymentChain);
  }

  // 回退到 coin 推断
  if (!category && coin) {
    category = resolveChainCategory(coin);
  }

  // UTXO 不需要前端执行器（后端监听模式）
  if (!category || category === 'utxo') {
    return null;
  }

  return getExecutorRegistry().get(category) || null;
}

export { ExecutorRegistry };
