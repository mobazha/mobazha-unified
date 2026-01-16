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
  getContractAddress,
} from '@mobazha/core';
import type { Order } from '@mobazha/core';

// 以太坊零地址常量
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

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

  // 根据支付币种获取支付代币地址
  const getPaymentTokenAddress = useCallback((paymentCoin: string, chainId: number): string => {
    // 解析支付币种，如 ETHUSDT -> USDT
    const tokenSymbol = paymentCoin.replace(/^(ETH|BSC|MATIC|CFX)/, '');

    if (tokenSymbol === 'USDT') {
      return getContractAddress('USDT', chainId);
    } else if (tokenSymbol === 'USDC') {
      return getContractAddress('USDC', chainId);
    }

    // ETH 原生支付
    return ZERO_ADDRESS;
  }, []);

  // 从订单获取支付金额
  const getPaymentAmount = useCallback((): string => {
    if (!order) return '0';

    const orderOpen = (order.contract as any)?.orderOpen;
    const listing = orderOpen?.listings?.[0]?.listing;
    const item = orderOpen?.items?.[0];

    const price = Number(listing?.item?.price) || 0;
    const quantity = Number(item?.quantity) || 1;
    const pricingDivisibility = listing?.metadata?.pricingCurrency?.divisibility || 2;

    // 将价格从最小单位转换为 USDT (6 位小数)
    const usdAmount = (price * quantity) / Math.pow(10, pricingDivisibility);
    const paymentAmount = Math.floor(usdAmount * 1e6); // USDT 有 6 位小数

    return paymentAmount.toString();
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
      const paymentCoin = orderOpen?.pricingCoin || 'ETHUSDT';
      const chainId = getCurrentChainId() ? Number(getCurrentChainId()) : 11155111;
      const paymentTokenAddress = getPaymentTokenAddress(paymentCoin, chainId);
      const paymentAmount = getPaymentAmount();

      // 获取卖家地址（从 listing 的 vendorID 获取，需要后端提供以太坊地址）
      // TODO: 实际应用中需要通过 API 获取卖家的以太坊地址
      const vendorPeerID =
        listing?.vendorID?.peerID || orderOpen?.listings?.[0]?.vendorID?.peerID || '';

      // 获取 RWA Token 信息
      const metadata = listing?.metadata || {};
      const tokenStandard = listing?.item?.tokenStandard || 'ERC721';
      const tokenContract = metadata.cryptoListingAddress;
      const tokenId = metadata.tokenId || '1';
      const quantity = Number(item?.quantity) || 1;

      // 获取交易模式参数
      const tradeMode = isConfirmRequired ? 1 : 0;

      console.log('🛒 RWA 购买参数:', {
        externalOrderId,
        vendorPeerID,
        tokenStandard,
        tokenContract,
        tokenId,
        quantity,
        paymentCoin,
        paymentTokenAddress,
        paymentAmount,
        tradeMode: isConfirmRequired ? '确认交易' : '即时交易',
      });

      // 检查必要信息
      if (!tokenContract) {
        throw new Error(t('rwa.purchase.missingTokenContract') || '无法获取 Token 合约地址');
      }

      // Step 1: 授权支付代币
      setState(prev => ({ ...prev, step: 'approving' }));

      if (paymentTokenAddress !== ZERO_ADDRESS) {
        console.log('🔧 授权支付代币...');
        const approvalResult = await swapService.approvePaymentToken(
          paymentTokenAddress,
          paymentAmount
        );

        if (!approvalResult.success) {
          throw new Error(t('rwa.purchase.approveFailed') || '支付代币授权失败');
        }
        console.log('✅ 授权成功');
      }

      // Step 2: 调用 createOrderByBuyer（一步完成创建订单 + 支付/锁定）
      if (isConfirmRequired) {
        setState(prev => ({ ...prev, step: 'locking' }));
      } else {
        setState(prev => ({ ...prev, step: 'executing' }));
      }

      console.log('🔧 创建订单并支付...');

      // 注意：这里需要卖家的以太坊地址
      // 在实际实现中，需要通过 API 获取 vendorPeerID 对应的以太坊地址
      // 临时方案：从 listing metadata 中获取（如果卖家在上架时设置了）
      const sellerAddress = metadata.sellerWalletAddress || metadata.vendorWalletAddress;

      if (!sellerAddress) {
        throw new Error(t('rwa.purchase.missingSellerAddress') || '无法获取卖家钱包地址');
      }

      const result = await swapService.createOrderByBuyer({
        seller: sellerAddress,
        tokenStandard: tokenStandard,
        tokenContract: tokenContract,
        tokenId: tokenId,
        amount: quantity.toString(),
        paymentToken: paymentTokenAddress,
        price: paymentAmount,
        externalOrderId: externalOrderId, // 使用 Mobazha orderID
        tradeMode: tradeMode as 0 | 1,
        escrowTimeoutSeconds: escrowTimeoutSeconds,
      });

      if (result.success && result.transactionHash) {
        console.log('✅ 购买成功');
        console.log('   合约订单ID:', result.orderId);
        console.log('   交易模式:', result.tradeMode);

        // Step 3: 提交支付数据到后端
        const isInstantComplete = result.tradeMode === 'completed';
        // 获取 UniversalSwap 合约地址（目前仅支持 Sepolia）
        const universalSwapAddress = SEPOLIA_CONFIG.universalSwapAddress;

        try {
          console.log('🔧 提交支付数据到后端...');
          await ordersApi.submitPayment({
            orderID: externalOrderId,
            transactionID: result.transactionHash,
            coin: paymentCoin,
            amount: paymentAmount,
            timestamp: new Date().toISOString(),
            method: isConfirmRequired ? 4 : 3, // 4: RWA_PAYMENT_LOCKED, 3: RWA_ATOMIC_SWAP
            paymentTokenAddress: paymentTokenAddress,
            contractAddress: universalSwapAddress,
            buyerReceiveAddress: walletInfo?.address || '',
            contractOrderId: result.orderId,
            rwaTradeMode: tradeMode,
            rwaOrderCompleted: isInstantComplete,
          });
          console.log('✅ 后端状态同步成功');
        } catch (submitErr) {
          console.warn('⚠️ 后端状态同步失败（链上交易已完成）:', submitErr);
          // 后端同步失败不影响链上交易结果
        }

        if (result.tradeMode === 'locked') {
          // 确认交易模式：资金锁定，等待卖家确认
          setState(prev => ({
            ...prev,
            step: 'waiting',
            txHash: result.transactionHash!,
            isProcessing: false,
          }));
        } else {
          // 即时交易模式：交易完成
          setState(prev => ({
            ...prev,
            step: 'completed',
            txHash: result.transactionHash!,
            isProcessing: false,
          }));
          onSuccess?.();
        }
      } else {
        throw new Error(result.message || t('rwa.purchase.executeFailed'));
      }
    } catch (err) {
      console.error('❌ 购买失败:', err);
      const error = err instanceof Error ? err : new Error('Purchase failed');

      // 提供更友好的错误消息
      let errorMessage = error.message;
      if (errorMessage.includes('Token not approved') || errorMessage.includes('Token 未授权')) {
        errorMessage = t('rwa.purchase.sellerTokenNotApproved') || '卖家尚未授权 Token，请联系卖家';
      } else if (
        errorMessage.includes('Seller not owner') ||
        errorMessage.includes('卖家不是 Token 所有者')
      ) {
        errorMessage = t('rwa.purchase.sellerNotOwner') || '卖家已不拥有此 Token';
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
