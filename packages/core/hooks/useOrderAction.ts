'use client';

/**
 * useOrderAction Hook
 * Community Edition: UTXO order actions only (BTC/BCH/LTC/ZEC).
 */

import { useState, useCallback } from 'react';
import { useI18n } from './useI18n';
import { isUTXOChain } from '../data/tokens';
import { allowsPaymentCoin } from '../edition/capabilities';
import type { OrderInstructionsResponse } from '../services/api/orders';

/**
 * 订单操作选项
 */
export interface OrderActionOptions {
  /**
   * 获取操作指令的函数
   * 用于 EVM/Solana 链，检查是否需要链上交易
   *
   * @param initiatorAddress 发起者钱包地址
   * @returns 指令响应
   */
  getInstructions?: (initiatorAddress: string) => Promise<OrderInstructionsResponse>;

  /**
   * 执行操作的函数
   * 调用后端 API 完成订单状态变更
   *
   * @param txID 链上交易 ID（如果执行了链上交易）
   * @returns 操作结果
   */
  executeAction: (txID?: string) => Promise<{ success: boolean; error?: string }>;

  /**
   * 订单的支付币种
   * 用于判断链类型（UTXO vs EVM/Solana）
   */
  paymentCoin?: string;

  /**
   * 操作成功回调
   */
  onSuccess?: () => void;

  /**
   * 操作失败回调
   */
  onError?: (error: Error) => void;

  /**
   * 是否需要钱包连接（用于 EVM/Solana 链）
   * 默认为 true
   */
  requireWallet?: boolean;
}

/**
 * useOrderAction 返回值
 */
export interface UseOrderActionReturn {
  /**
   * 执行订单操作
   */
  execute: (options: OrderActionOptions) => Promise<void>;

  /**
   * 是否正在执行
   */
  isLoading: boolean;

  /**
   * 是否正在等待钱包连接
   * 可用于显示"正在等待钱包连接..."的提示
   */
  isWaitingForWallet: boolean;

  /**
   * 最近的错误
   */
  error: Error | null;

  /**
   * 清除错误
   */
  clearError: () => void;
}

/**
 * Community Edition: UTXO order actions only. Non-UTXO frontend executors are excluded.
 */
export function useOrderAction(): UseOrderActionReturn {
  const { t } = useI18n();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const execute = useCallback(
    async (options: OrderActionOptions) => {
      const { executeAction, paymentCoin, onSuccess, onError } = options;

      setIsLoading(true);
      setError(null);

      try {
        if (allowsPaymentCoin(paymentCoin ?? '') && isUTXOChain(paymentCoin)) {
          const result = await executeAction();

          if (!result.success) {
            throw new Error(result.error || t('order.actions.operationFailed'));
          }

          onSuccess?.();
          return;
        }

        throw new Error(t('order.actions.operationFailed'));
      } catch (err) {
        const errorInstance = err instanceof Error ? err : new Error(String(err));
        console.error('[useOrderAction] Operation failed:', errorInstance);
        setError(errorInstance);
        onError?.(errorInstance);
        throw errorInstance;
      } finally {
        setIsLoading(false);
      }
    },
    [t]
  );

  return {
    execute,
    isLoading,
    isWaitingForWallet: false,
    error,
    clearError,
  };
}

export default useOrderAction;
