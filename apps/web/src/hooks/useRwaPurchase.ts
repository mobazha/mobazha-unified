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
  ordersApi,
  SEPOLIA_CONFIG,
  mustCanonicalCoin,
  mustAssetIdFromTokenId,
  parseCanonicalPaymentCoin,
} from '@mobazha/core';
import type { Order } from '@mobazha/core';

// 以太坊零地址常量
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const DEFAULT_PAYMENT_COIN = mustAssetIdFromTokenId('ETHUSDT');

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
  claimExpired: () => Promise<void>;
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

  // 根据支付币种获取支付代币地址
  const getPaymentTokenAddress = useCallback((paymentCoin: string): string => {
    const canonicalCoin = mustCanonicalCoin(paymentCoin);
    const parsedCoin = parseCanonicalPaymentCoin(canonicalCoin);
    if (parsedCoin?.namespace === 'eip155') {
      if (parsedCoin.standard === 'native') {
        return ZERO_ADDRESS;
      }
      if (parsedCoin.standard === 'erc20' && parsedCoin.assetRef) {
        return parsedCoin.assetRef;
      }
    }

    // ETH 原生支付
    return ZERO_ADDRESS;
  }, []);

  // 从订单获取支付金额
  const getPaymentAmount = useCallback((): number => {
    if (!order) return 0;

    const orderOpen = (order.contract as any)?.orderOpen;
    const listing = orderOpen?.listings?.[0]?.listing;
    const item = orderOpen?.items?.[0];

    const price = Number(listing?.item?.price) || 0;
    const quantity = Number(item?.quantity) || 1;
    const pricingDivisibility = listing?.metadata?.pricingCurrency?.divisibility || 2;

    // 将价格从最小单位转换为 USDT (6 位小数)
    const usdAmount = (price * quantity) / Math.pow(10, pricingDivisibility);
    const paymentAmount = Math.floor(usdAmount * 1e6); // USDT 有 6 位小数

    return paymentAmount; // 返回数字类型，后端期望 uint64
  }, [order]);

  // 开始购买（新设计：买家创建订单并支付）
  const startPurchase = useCallback(async () => {
    if (!order || !swapService) {
      const error = new Error(t('rwa.purchase.serviceNotReady'));
      setState(prev => ({ ...prev, error: error.message, step: 'error' }));
      onError?.(error);
      return;
    }

    try {
      setState(prev => ({ ...prev, isProcessing: true, error: null }));

      // 获取订单的外部 ID (Mobazha orderID)
      const externalOrderId =
        (order.contract as any)?.OrderID || (order.contract as any)?.orderID || '';

      // 获取支付信息
      const orderOpen = (order.contract as any)?.orderOpen;
      const listing = orderOpen?.listings?.[0]?.listing;
      const item = orderOpen?.items?.[0];
      const paymentCoin = orderOpen?.pricingCoin || DEFAULT_PAYMENT_COIN;
      const paymentTokenAddress = getPaymentTokenAddress(paymentCoin);
      const paymentAmount = getPaymentAmount();

      // 从后端获取身份地址（buyerAddress 和 vendorAddress 是 Mobazha 系统中的链上统一身份地址）
      const paymentInstructions = await ordersApi.getPaymentInstructions({
        orderId: externalOrderId,
        coin: paymentCoin,
      });

      if (paymentInstructions.error) {
        throw new Error(paymentInstructions.error);
      }

      if (!paymentInstructions.buyerAddress) {
        throw new Error(t('rwa.purchase.missingBuyerAddress'));
      }

      if (!paymentInstructions.vendorAddress) {
        throw new Error(t('rwa.purchase.missingSellerAddress'));
      }

      // 身份地址（从后端获取，代表 Mobazha 系统中的用户身份）
      const buyerIdentity = paymentInstructions.buyerAddress;

      // 买家接收 Token 的地址（用户选择的收款账户或当前钱包）
      const buyerReceiveAddress = walletInfo?.address || '';

      // 获取 RWA Token 信息
      const metadata = listing?.metadata || {};
      const quantity = Number(item?.quantity) || 1;

      // 获取 RWA Listing ID（即时和确认交易模式都需要 listingId）
      const rwaListingIdRaw = metadata.rwaListingId;
      const rwaListingId = parseInt(rwaListingIdRaw, 10);
      if (isNaN(rwaListingId) || rwaListingId <= 0) {
        throw new Error(
          `Product is missing a valid rwaListingId (current value: ${rwaListingIdRaw}). Cannot purchase. Please contact the seller to relist the product.`
        );
      }

      // 获取交易模式
      const isInstantMode = rwaTradeMode === TradeMode.Instant;

      console.log(`🛒 RWA 购买参数（${isInstantMode ? '即时交易' : '确认交易'}模式）:`, {
        externalOrderId,
        rwaListingId,
        buyerIdentity,
        buyerReceiveAddress,
        quantity,
        paymentCoin,
        paymentTokenAddress,
        paymentAmount,
        isInstantMode,
      });

      // Step 1: 授权支付代币
      setState(prev => ({ ...prev, step: 'approving' }));

      if (paymentTokenAddress !== ZERO_ADDRESS) {
        console.log('🔧 授权支付代币...');
        const approvalResult = await swapService.approvePaymentToken(
          paymentTokenAddress,
          paymentAmount.toString() // swapService 需要字符串
        );

        if (!approvalResult.success) {
          throw new Error(t('rwa.purchase.approveFailed'));
        }
        console.log('✅ 授权成功');
      }

      // 获取 UniversalSwap 合约地址
      const universalSwapAddress = SEPOLIA_CONFIG.universalSwapAddress;

      if (isInstantMode) {
        // ========== 即时交易模式：使用 instantBuy ==========
        setState(prev => ({ ...prev, step: 'executing' }));
        console.log('⚡ 执行即时购买（instantBuy）...');

        const result = await swapService.instantBuy({
          listingId: rwaListingId.toString(),
          externalOrderId: externalOrderId,
          buyerIdentity: buyerIdentity,
          buyerReceiveAddress: buyerReceiveAddress,
          tokenAmount: quantity.toString(),
          paymentToken: paymentTokenAddress,
          paymentAmount: paymentAmount.toString(), // swapService 需要字符串
        });

        if (result.success && result.transactionHash) {
          console.log('✅ 即时购买成功，原子交换已完成');
          console.log('   合约订单ID:', result.orderId);

          // 提交支付数据到后端
          try {
            console.log('🔧 提交支付数据到后端...');
            await ordersApi.submitPayment({
              orderID: externalOrderId,
              transactionID: result.transactionHash,
              coin: paymentCoin,
              amount: paymentAmount,
              timestamp: new Date().toISOString(),
              method: 4, // RWA_INSTANT（即时交易模式）
              paymentTokenAddress: paymentTokenAddress,
              contractAddress: universalSwapAddress,
              buyerReceiveAddress: buyerReceiveAddress,
              contractOrderId: result.orderId,
              rwaTradeMode: 0, // Instant
              rwaOrderCompleted: true, // 链上交易已完成
            });
            console.log('✅ 后端状态同步成功');
          } catch (submitErr) {
            console.warn('⚠️ 后端状态同步失败（链上交易已完成）:', submitErr);
          }

          // 即时交易模式：交易已完成
          setState(prev => ({
            ...prev,
            step: 'completed',
            txHash: result.transactionHash!,
            isProcessing: false,
          }));
        } else {
          throw new Error(result.message || t('rwa.purchase.executeFailed'));
        }
      } else {
        // ========== 确认交易模式：使用 createOrderFromListing ==========
        setState(prev => ({ ...prev, step: 'locking' }));
        console.log('🔒 通过延迟 Listing 创建订单并支付...');

        const result = await swapService.createOrderFromListing({
          listingId: rwaListingId.toString(),
          buyerIdentity: buyerIdentity,
          buyerReceiveAddress: buyerReceiveAddress,
          tokenAmount: quantity.toString(),
          paymentToken: paymentTokenAddress,
          price: paymentAmount.toString(), // swapService 需要字符串
          externalOrderId: externalOrderId,
        });

        if (result.success && result.transactionHash) {
          console.log('✅ 订单创建成功，资金已锁定');
          console.log('   合约订单ID:', result.orderId);
          console.log('   交易模式:', result.tradeMode);

          // 提交支付数据到后端
          try {
            console.log('🔧 提交支付数据到后端...');
            await ordersApi.submitPayment({
              orderID: externalOrderId,
              transactionID: result.transactionHash,
              coin: paymentCoin,
              amount: paymentAmount,
              timestamp: new Date().toISOString(),
              method: 3, // RWA_ESCROW（确认交易模式）
              paymentTokenAddress: paymentTokenAddress,
              contractAddress: universalSwapAddress,
              buyerReceiveAddress: buyerReceiveAddress,
              contractOrderId: result.orderId,
              rwaTradeMode: 1, // ConfirmRequired
              rwaOrderCompleted: false, // 需要卖家确认
            });
            console.log('✅ 后端状态同步成功');
          } catch (submitErr) {
            console.warn('⚠️ 后端状态同步失败（链上交易已完成）:', submitErr);
          }

          // 确认交易模式：资金锁定，等待卖家确认
          setState(prev => ({
            ...prev,
            step: 'waiting',
            txHash: result.transactionHash!,
            isProcessing: false,
          }));
        } else {
          throw new Error(result.message || t('rwa.purchase.executeFailed'));
        }
      }
    } catch (err) {
      console.error('❌ 购买失败:', err);
      const error = err instanceof Error ? err : new Error('Purchase failed');

      // 提供更友好的错误消息
      let errorMessage = error.message;
      if (errorMessage.includes('Token not approved') || errorMessage.includes('Token 未授权')) {
        errorMessage = t('rwa.purchase.sellerTokenNotApproved');
      } else if (
        errorMessage.includes('Seller not owner') ||
        errorMessage.includes('卖家不是 Token 所有者')
      ) {
        errorMessage = t('rwa.purchase.sellerNotOwner');
      }

      setState(prev => ({
        ...prev,
        step: 'error',
        isProcessing: false,
        error: errorMessage,
      }));
      onError?.(new Error(errorMessage));
    }
  }, [
    order,
    swapService,
    isConfirmRequired,
    escrowTimeoutSeconds,
    onSuccess,
    onError,
    t,
    getCurrentChainId,
    getPaymentTokenAddress,
    getPaymentAmount,
    walletInfo,
  ]);

  // 取消购买（锁定模式）
  const cancelPurchase = useCallback(async () => {
    if (!order || !swapService) return;

    try {
      setState(prev => ({ ...prev, isProcessing: true, error: null }));

      const externalOrderId =
        (order.contract as any)?.OrderID || (order.contract as any)?.orderID || '';
      const result = await swapService.cancelByBuyerByExternalId(externalOrderId);

      if (result.success) {
        // 通知后端更新订单状态
        try {
          const apiResult = await ordersApi.cancelOrder({
            orderID: externalOrderId,
            transactionID: result.transactionHash || '',
          });
          console.log('Backend cancelOrder result:', apiResult);
        } catch (apiErr) {
          console.warn('Failed to notify backend:', apiErr);
        }

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

  // 认领超时退款
  const claimExpired = useCallback(async () => {
    if (!order || !swapService) return;

    try {
      setState(prev => ({ ...prev, isProcessing: true, error: null }));

      const externalOrderId =
        (order.contract as any)?.OrderID || (order.contract as any)?.orderID || '';
      const result = await swapService.claimExpiredByExternalId(externalOrderId);

      if (result.success) {
        // 通知后端更新订单状态
        try {
          const apiResult = await ordersApi.cancelOrder({
            orderID: externalOrderId,
            transactionID: result.transactionHash || '',
          });
          console.log('Backend cancelOrder (claimExpired) result:', apiResult);
        } catch (apiErr) {
          console.warn('Failed to notify backend:', apiErr);
        }

        setState(prev => ({
          ...prev,
          step: 'idle',
          isProcessing: false,
          txHash: null,
        }));
      } else {
        throw new Error(result.message || t('rwa.purchase.claimFailed'));
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Claim failed');
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
    claimExpired,
    reset,
    isConfirmRequired,
    formattedTimeout,
  };
}

export default useRwaPurchase;
