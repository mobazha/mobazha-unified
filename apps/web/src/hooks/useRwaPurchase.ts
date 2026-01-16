/**
 * useRwaPurchase Hook
 * 封装 RWA 购买完整流程
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  useWallet,
  useI18n,
  UniversalSwapService,
  TradeMode,
  type TradeModeType,
} from '@mobazha/core';
import type { Order } from '@mobazha/core';

/**
 * 购买步骤
 */
export type RwaPurchaseStep =
  | 'idle'
  | 'connecting'
  | 'approving'
  | 'executing'
  | 'locking'
  | 'waiting'
  | 'completed'
  | 'error';

/**
 * 购买状态
 */
export interface RwaPurchaseState {
  step: RwaPurchaseStep;
  isProcessing: boolean;
  error: string | null;
  txHash: string | null;
}

/**
 * Hook 返回值
 */
export interface UseRwaPurchaseReturn {
  // 状态
  state: RwaPurchaseState;
  isConnected: boolean;
  isConnecting: boolean;
  walletAddress: string | null;

  // 方法
  connect: () => Promise<void>;
  startPurchase: () => Promise<void>;
  cancelPurchase: () => Promise<void>;
  reset: () => void;

  // 辅助
  isConfirmRequired: boolean;
  formattedTimeout: string;
}

/**
 * Hook 参数
 */
export interface UseRwaPurchaseOptions {
  order: Order | null;
  rwaTradeMode?: number;
  escrowTimeoutSeconds?: number;
  cryptoListingCurrencyCode?: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

/**
 * 格式化超时时间
 */
function formatTimeout(seconds: number): string {
  if (seconds >= 86400) {
    const days = Math.floor(seconds / 86400);
    return `${days} days`;
  }
  if (seconds >= 3600) {
    const hours = Math.floor(seconds / 3600);
    return `${hours} hours`;
  }
  const minutes = Math.floor(seconds / 60);
  return `${minutes} minutes`;
}

/**
 * RWA 购买流程 Hook
 *
 * 封装完整的 RWA 购买流程，包括：
 * - 钱包连接
 * - 代币授权
 * - 即时交换或锁定支付
 * - 状态管理
 * - 错误处理
 *
 * @example
 * ```tsx
 * const {
 *   state,
 *   isConnected,
 *   connect,
 *   startPurchase,
 *   cancelPurchase,
 *   isConfirmRequired,
 * } = useRwaPurchase({
 *   order,
 *   rwaTradeMode: 1,
 *   escrowTimeoutSeconds: 86400,
 *   onSuccess: () => router.push('/orders'),
 * });
 * ```
 */
export function useRwaPurchase({
  order,
  rwaTradeMode = 0,
  escrowTimeoutSeconds = 86400,
  cryptoListingCurrencyCode,
  onSuccess,
  onError,
}: UseRwaPurchaseOptions): UseRwaPurchaseReturn {
  const { t } = useI18n();
  const { isConnected, isConnecting, walletInfo, openModal, getCurrentChainId } = useWallet();

  // 状态
  const [state, setState] = useState<RwaPurchaseState>({
    step: 'idle',
    isProcessing: false,
    error: null,
    txHash: null,
  });

  // Swap 服务实例
  const [swapService, setSwapService] = useState<UniversalSwapService | null>(null);

  // 是否为确认交易模式
  const isConfirmRequired = useMemo(() => {
    return rwaTradeMode === 1 || rwaTradeMode === TradeMode.ConfirmRequired;
  }, [rwaTradeMode]);

  // 格式化超时时间
  const formattedTimeout = useMemo(() => {
    return formatTimeout(escrowTimeoutSeconds);
  }, [escrowTimeoutSeconds]);

  // 初始化 Swap 服务
  useEffect(() => {
    const initService = async () => {
      if (!isConnected || !walletInfo) {
        setSwapService(null);
        return;
      }

      try {
        // 获取链名称
        const chainId = getCurrentChainId();
        const chainIdNum = chainId ? Number(chainId) : 0;
        const chainName = chainIdNum === 1 ? 'ETH' : chainIdNum === 11155111 ? 'ETH' : 'ETH';
        const isTestnet = chainIdNum === 11155111 || chainIdNum === 97 || chainIdNum === 84532;

        const service = new UniversalSwapService();
        // UniversalSwapService.initialize 需要原始的 EIP-1193 provider
        const rawProvider = (window as any).ethereum;
        if (rawProvider) {
          await service.initialize(rawProvider, chainName, walletInfo.address, isTestnet);
          setSwapService(service);
        }
      } catch (err) {
        console.error('Failed to initialize swap service:', err);
      }
    };

    initService();
  }, [isConnected, walletInfo, getCurrentChainId]);

  // 连接钱包
  const connect = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, step: 'connecting', isProcessing: true, error: null }));
      await openModal({ view: 'Connect' });
      setState(prev => ({ ...prev, step: 'idle', isProcessing: false }));
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Connection failed');
      setState(prev => ({
        ...prev,
        step: 'error',
        isProcessing: false,
        error: error.message,
      }));
      onError?.(error);
    }
  }, [openModal, onError]);

  // 开始购买
  const startPurchase = useCallback(async () => {
    if (!order || !swapService) {
      const error = new Error(t('rwa.purchase.serviceNotReady'));
      setState(prev => ({ ...prev, error: error.message, step: 'error' }));
      onError?.(error);
      return;
    }

    try {
      setState(prev => ({ ...prev, isProcessing: true, error: null }));

      // 获取订单的外部 ID
      const externalOrderId =
        (order.contract as any)?.OrderID || (order.contract as any)?.orderID || '';

      // 1. 授权支付代币
      setState(prev => ({ ...prev, step: 'approving' }));

      if (isConfirmRequired) {
        // 确认交易模式：锁定资金
        setState(prev => ({ ...prev, step: 'locking' }));

        const result = await swapService.buyByExternalId(externalOrderId);

        if (result.success && result.transactionHash) {
          setState(prev => ({
            ...prev,
            step: 'waiting',
            txHash: result.transactionHash!,
            isProcessing: false,
          }));
        } else {
          throw new Error(result.message || t('rwa.purchase.lockFailed'));
        }
      } else {
        // 即时交易模式：直接执行交换
        setState(prev => ({ ...prev, step: 'executing' }));

        const result = await swapService.executeSwapByExternalId(externalOrderId);

        if (result.success && result.transactionHash) {
          setState(prev => ({
            ...prev,
            step: 'completed',
            txHash: result.transactionHash!,
            isProcessing: false,
          }));
          onSuccess?.();
        } else {
          throw new Error(result.message || t('rwa.purchase.executeFailed'));
        }
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Purchase failed');
      setState(prev => ({
        ...prev,
        step: 'error',
        isProcessing: false,
        error: error.message,
      }));
      onError?.(error);
    }
  }, [order, swapService, isConfirmRequired, onSuccess, onError, t]);

  // 取消购买（锁定模式）
  const cancelPurchase = useCallback(async () => {
    if (!order || !swapService) return;

    try {
      setState(prev => ({ ...prev, isProcessing: true, error: null }));

      const externalOrderId =
        (order.contract as any)?.OrderID || (order.contract as any)?.orderID || '';
      const result = await swapService.cancelByBuyerByExternalId(externalOrderId);

      if (result.success) {
        setState(prev => ({
          ...prev,
          step: 'idle',
          isProcessing: false,
          txHash: null,
        }));
      } else {
        throw new Error(result.message || t('rwa.purchase.cancelFailed'));
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Cancel failed');
      setState(prev => ({
        ...prev,
        isProcessing: false,
        error: error.message,
      }));
      onError?.(error);
    }
  }, [order, swapService, onError, t]);

  // 重置状态
  const reset = useCallback(() => {
    setState({
      step: 'idle',
      isProcessing: false,
      error: null,
      txHash: null,
    });
  }, []);

  return {
    state,
    isConnected,
    isConnecting,
    walletAddress: walletInfo?.address || null,
    connect,
    startPurchase,
    cancelPurchase,
    reset,
    isConfirmRequired,
    formattedTimeout,
  };
}

export default useRwaPurchase;
