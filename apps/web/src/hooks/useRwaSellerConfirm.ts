/**
 * useRwaSellerConfirm Hook
 * 卖家确认 RWA 订单流程
 */

import { useState, useCallback, useEffect } from 'react';
import { useWallet, useI18n, UniversalSwapService, ordersApi, SEPOLIA_CONFIG } from '@mobazha/core';
import type { Order } from '@mobazha/core';

/**
 * 确认步骤
 */
export type RwaConfirmStep =
  | 'idle'
  | 'connecting'
  | 'approving'
  | 'confirming'
  | 'syncing'
  | 'completed'
  | 'error';

/**
 * 确认状态
 */
export interface RwaConfirmState {
  step: RwaConfirmStep;
  isProcessing: boolean;
  error: string | null;
  txHash: string | null;
}

/**
 * Hook 返回值
 */
export interface UseRwaSellerConfirmReturn {
  // 状态
  state: RwaConfirmState;
  isConnected: boolean;
  walletAddress: string | null;

  // 方法
  confirmOrder: () => Promise<void>;
  declineOrder: () => Promise<void>;
  reset: () => void;

  // 辅助
  canConfirm: boolean;
}

/**
 * Hook 参数
 */
export interface UseRwaSellerConfirmOptions {
  order: Order | null;
  orderId: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

/**
 * RWA 卖家确认订单 Hook
 */
export function useRwaSellerConfirm({
  order,
  orderId,
  onSuccess,
  onError,
}: UseRwaSellerConfirmOptions): UseRwaSellerConfirmReturn {
  const { t } = useI18n();
  const { isConnected, walletInfo, openModal, getCurrentChainId } = useWallet();

  // 状态
  const [state, setState] = useState<RwaConfirmState>({
    step: 'idle',
    isProcessing: false,
    error: null,
    txHash: null,
  });

  // Swap 服务实例
  const [swapService, setSwapService] = useState<UniversalSwapService | null>(null);

  // 初始化 Swap 服务
  useEffect(() => {
    const initService = async () => {
      if (!isConnected || !walletInfo) {
        setSwapService(null);
        return;
      }

      try {
        const chainId = getCurrentChainId();
        const chainIdNum = chainId ? Number(chainId) : 0;
        const chainName = chainIdNum === 1 ? 'ETH' : chainIdNum === 11155111 ? 'ETH' : 'ETH';
        const isTestnet = chainIdNum === 11155111 || chainIdNum === 97 || chainIdNum === 84532;

        const service = new UniversalSwapService();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  // 检查是否可以确认
  const canConfirm = !!(order && swapService && isConnected);

  // 获取 Token 信息
  const getTokenInfo = useCallback(() => {
    if (!order) return null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const listing = order.contract?.orderOpen?.listings?.[0]?.listing as any;

    if (!listing) return null;

    return {
      tokenStandard: listing.item?.tokenStandard || listing.metadata?.tokenStandard || 'ERC721',
      tokenContract: listing.metadata?.cryptoListingAddress,
      tokenId: listing.metadata?.tokenId || '1',
    };
  }, [order]);

  // 确认订单
  const confirmOrder = useCallback(async () => {
    if (!order || !swapService) {
      const error = new Error(t('rwa.confirm.serviceNotReady') || '服务未就绪');
      setState(prev => ({ ...prev, error: error.message, step: 'error' }));
      onError?.(error);
      return;
    }

    try {
      setState(prev => ({ ...prev, isProcessing: true, error: null }));

      const tokenInfo = getTokenInfo();
      if (!tokenInfo || !tokenInfo.tokenContract) {
        throw new Error(t('rwa.confirm.missingTokenInfo') || '无法获取 Token 信息');
      }

      // Step 1: 授权 Token
      setState(prev => ({ ...prev, step: 'approving' }));
      console.warn('🔧 授权 Token 给 UniversalSwap 合约...');

      const approvalResult = await swapService.approveToken(
        tokenInfo.tokenStandard,
        tokenInfo.tokenContract,
        tokenInfo.tokenId
      );

      if (!approvalResult.success) {
        throw new Error(t('rwa.confirm.approveFailed') || 'Token 授权失败');
      }
      console.warn('✅ Token 授权成功');

      // Step 2: 调用 confirmOrder（需传入卖家收款地址）
      setState(prev => ({ ...prev, step: 'confirming' }));

      // 获取卖家收款地址（当前连接的钱包地址）
      const sellerReceiveAddress = walletInfo?.address;
      if (!sellerReceiveAddress) {
        throw new Error(t('rwa.confirm.missingWalletAddress') || '无法获取钱包地址');
      }

      console.warn('🔧 确认订单...');
      console.warn('   卖家收款地址:', sellerReceiveAddress);

      const confirmResult = await swapService.confirmOrderByExternalId(
        orderId,
        sellerReceiveAddress // 新增：卖家收款地址
      );

      if (!confirmResult.success) {
        throw new Error(t('rwa.confirm.confirmFailed') || '确认订单失败');
      }
      console.warn('✅ 链上确认成功，交易哈希:', confirmResult.transactionHash);

      // Step 3: 同步后端状态
      setState(prev => ({
        ...prev,
        step: 'syncing',
        txHash: confirmResult.transactionHash || null,
      }));
      console.warn('🔧 同步后端状态...');

      try {
        await ordersApi.confirmOrder({
          orderID: orderId,
          reject: false,
        });
        console.warn('✅ 后端状态同步成功');
      } catch (syncErr) {
        console.warn('⚠️ 后端状态同步失败（链上交易已完成）:', syncErr);
      }

      // 完成
      setState(prev => ({
        ...prev,
        step: 'completed',
        isProcessing: false,
      }));
      onSuccess?.();
    } catch (err) {
      console.error('❌ 确认订单失败:', err);
      const error = err instanceof Error ? err : new Error('Confirm failed');
      setState(prev => ({
        ...prev,
        step: 'error',
        isProcessing: false,
        error: error.message,
      }));
      onError?.(error);
    }
  }, [order, swapService, orderId, onSuccess, onError, t, getTokenInfo, walletInfo]);

  // 拒绝订单
  const declineOrder = useCallback(async () => {
    if (!order || !swapService) {
      const error = new Error(t('rwa.confirm.serviceNotReady') || '服务未就绪');
      setState(prev => ({ ...prev, error: error.message, step: 'error' }));
      onError?.(error);
      return;
    }

    try {
      setState(prev => ({ ...prev, isProcessing: true, error: null }));

      // 调用后端拒绝订单
      await ordersApi.confirmOrder({
        orderID: orderId,
        reject: true,
      });

      setState(prev => ({
        ...prev,
        step: 'completed',
        isProcessing: false,
      }));
      onSuccess?.();
    } catch (err) {
      console.error('❌ 拒绝订单失败:', err);
      const error = err instanceof Error ? err : new Error('Decline failed');
      setState(prev => ({
        ...prev,
        step: 'error',
        isProcessing: false,
        error: error.message,
      }));
      onError?.(error);
    }
  }, [order, swapService, orderId, onSuccess, onError, t]);

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
    walletAddress: walletInfo?.address || null,
    confirmOrder,
    declineOrder,
    reset,
    canConfirm,
  };
}

export default useRwaSellerConfirm;
