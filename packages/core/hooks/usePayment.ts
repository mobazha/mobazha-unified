/**
 * usePayment Hook
 * 统一支付 React Hook - 支持 EVM 链和扫描支付
 */

import { useState, useCallback, useEffect } from 'react';
import { useWallet } from './useWallet';
import { useEscrow } from './useEscrow';
import { ordersApi } from '../services/api/orders';
import type { ChainId, EscrowParams, TransactionResult } from '../services/payment/types';

// 支付方式类型
export type CheckoutPaymentMethod = 'evm_wallet' | 'scan' | 'direct';

// 支付状态
export type PaymentState =
  | 'idle'
  | 'preparing'
  | 'awaiting_payment'
  | 'processing'
  | 'confirming'
  | 'completed'
  | 'failed'
  | 'refunded';

// 支付币种
export interface PaymentCoin {
  code: string;
  name: string;
  type: 'native' | 'token' | 'utxo';
  chainId?: ChainId;
  tokenAddress?: string;
  icon?: string;
}

// 支付指令
export interface PaymentInstructions {
  orderId: string;
  address: string;
  amount: string;
  currency: string;
  qrCode?: string;
  memo?: string;
  expiresAt?: number;
}

// 支付结果
export interface PaymentResult {
  orderId: string;
  txHash?: string;
  method: CheckoutPaymentMethod;
  status: PaymentState;
  paidAmount?: string;
  remainingAmount?: string;
  confirmations?: number;
}

export interface UsePaymentReturn {
  // 状态
  paymentState: PaymentState;
  isLoading: boolean;
  error: string | null;
  instructions: PaymentInstructions | null;
  result: PaymentResult | null;

  // 钱包支付（EVM）
  payWithWallet: (params: {
    orderId: string;
    seller: string;
    amount: string;
    currency: string;
    moderator?: string;
    tokenAddress?: string;
    releaseTime?: number;
  }) => Promise<TransactionResult | null>;

  // 扫描支付（BTC/LTC）
  getPaymentInstructions: (
    orderId: string,
    currency: string
  ) => Promise<PaymentInstructions | null>;
  checkPaymentStatus: (orderId: string) => Promise<PaymentResult | null>;

  // 直接支付（节点钱包）
  payFromNodeWallet: (params: {
    orderId: string;
    coin: string;
    address: string;
    amount: string;
  }) => Promise<boolean>;

  // 工具
  getAvailablePaymentMethods: (currency: string) => CheckoutPaymentMethod[];
  getSupportedCoins: () => PaymentCoin[];
  resetPayment: () => void;
}

// 支持的币种列表
const SUPPORTED_COINS: PaymentCoin[] = [
  // EVM 原生币
  { code: 'ETH', name: 'Ethereum', type: 'native', chainId: 1 },
  { code: 'BNB', name: 'BNB Chain', type: 'native', chainId: 56 },
  { code: 'MATIC', name: 'Polygon', type: 'native', chainId: 137 },
  { code: 'ARB', name: 'Arbitrum', type: 'native', chainId: 42161 },
  // 稳定币 (示例)
  {
    code: 'USDT',
    name: 'Tether USD',
    type: 'token',
    chainId: 1,
    tokenAddress: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  },
  {
    code: 'USDC',
    name: 'USD Coin',
    type: 'token',
    chainId: 1,
    tokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  },
  // UTXO 币种
  { code: 'BTC', name: 'Bitcoin', type: 'utxo' },
  { code: 'LTC', name: 'Litecoin', type: 'utxo' },
];

/**
 * 统一支付 Hook
 */
export function usePayment(): UsePaymentReturn {
  const { isConnected, walletInfo, switchChain } = useWallet();
  const {
    createEscrow,
    transactionResult,
    error: escrowError,
    isLoading: escrowLoading,
  } = useEscrow();

  const [paymentState, setPaymentState] = useState<PaymentState>('idle');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [instructions, setInstructions] = useState<PaymentInstructions | null>(null);
  const [result, setResult] = useState<PaymentResult | null>(null);

  // 同步 escrow 错误
  useEffect(() => {
    if (escrowError) {
      setError(escrowError);
    }
  }, [escrowError]);

  // 同步 escrow 加载状态
  useEffect(() => {
    if (escrowLoading) {
      setIsLoading(true);
    }
  }, [escrowLoading]);

  /**
   * 钱包支付（EVM 链）
   */
  const payWithWallet = useCallback(
    async (params: {
      orderId: string;
      seller: string;
      amount: string;
      currency: string;
      moderator?: string;
      tokenAddress?: string;
      releaseTime?: number;
    }): Promise<TransactionResult | null> => {
      if (!isConnected) {
        setError('请先连接钱包');
        return null;
      }

      setPaymentState('preparing');
      setError(null);

      // 找到币种对应的链
      const coin = SUPPORTED_COINS.find(
        c => c.code === params.currency || c.tokenAddress === params.tokenAddress
      );
      if (!coin?.chainId) {
        setError(`不支持的支付币种: ${params.currency}`);
        return null;
      }

      // 切换到正确的链
      if (walletInfo?.chainId !== coin.chainId) {
        setPaymentState('preparing');
        const switched = await switchChain(coin.chainId);
        if (!switched) {
          setError('切换网络失败');
          setPaymentState('failed');
          return null;
        }
      }

      setPaymentState('processing');

      // 创建托管参数
      const escrowParams: EscrowParams = {
        orderId: params.orderId,
        seller: params.seller,
        amount: params.amount,
        moderator: params.moderator,
        releaseTime: params.releaseTime || Math.floor(Date.now() / 1000) + 86400 * 30, // 默认 30 天
      };

      try {
        const txResult = await createEscrow(escrowParams, params.tokenAddress);

        if (txResult) {
          setPaymentState('confirming');
          setResult({
            orderId: params.orderId,
            txHash: txResult.hash,
            method: 'evm_wallet',
            status: txResult.status === 'confirmed' ? 'completed' : 'confirming',
            paidAmount: params.amount,
            confirmations: txResult.confirmations,
          });

          if (txResult.status === 'confirmed') {
            setPaymentState('completed');
          }
        } else {
          setPaymentState('failed');
        }

        return txResult;
      } catch (err) {
        setPaymentState('failed');
        setError(err instanceof Error ? err.message : '支付失败');
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [isConnected, walletInfo?.chainId, switchChain, createEscrow]
  );

  /**
   * 获取扫描支付指令（BTC/LTC）
   */
  const getPaymentInstructions = useCallback(
    async (orderId: string, currency: string): Promise<PaymentInstructions | null> => {
      setIsLoading(true);
      setError(null);
      setPaymentState('preparing');

      try {
        const response = await ordersApi.getPaymentInstructions({ orderId, coin: currency });

        if (response.error) {
          throw new Error(response.error);
        }

        const paymentInstructions: PaymentInstructions = {
          orderId,
          address: response.address || '',
          amount: response.amount || '0',
          currency,
          // QR 码可以在前端生成
          qrCode: `bitcoin:${response.address}?amount=${response.amount}`,
          expiresAt: Date.now() + 3600000, // 1 小时过期
        };

        setInstructions(paymentInstructions);
        setPaymentState('awaiting_payment');
        return paymentInstructions;
      } catch (err) {
        setError(err instanceof Error ? err.message : '获取支付信息失败');
        setPaymentState('failed');
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * 检查支付状态
   */
  const checkPaymentStatus = useCallback(async (orderId: string): Promise<PaymentResult | null> => {
    try {
      const response = await ordersApi.getPaymentRemaining(orderId);

      const paymentResult: PaymentResult = {
        orderId,
        method: 'scan',
        status:
          response.remaining === '0' || response.remaining === undefined
            ? 'completed'
            : 'awaiting_payment',
        paidAmount: String(response.paid || 0),
        remainingAmount: String(response.remaining || 0),
      };

      setResult(paymentResult);

      if (response.remaining === '0' || response.remaining === undefined) {
        setPaymentState('completed');
      }

      return paymentResult;
    } catch {
      return null;
    }
  }, []);

  /**
   * 从节点钱包直接支付
   */
  const payFromNodeWallet = useCallback(
    async (params: {
      orderId: string;
      coin: string;
      address: string;
      amount: string;
    }): Promise<boolean> => {
      setIsLoading(true);
      setError(null);
      setPaymentState('processing');

      try {
        const response = await ordersApi.fundOrder(params);

        if (!response.success) {
          throw new Error(response.error || '支付失败');
        }

        setResult({
          orderId: params.orderId,
          txHash: response.txid,
          method: 'direct',
          status: 'confirming',
          paidAmount: String(params.amount),
        });

        setPaymentState('confirming');
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : '支付失败');
        setPaymentState('failed');
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * 获取可用的支付方式
   */
  const getAvailablePaymentMethods = useCallback(
    (currency: string): CheckoutPaymentMethod[] => {
      const coin = SUPPORTED_COINS.find(c => c.code === currency);
      if (!coin) return [];

      const methods: CheckoutPaymentMethod[] = [];

      if (coin.type === 'native' || coin.type === 'token') {
        // EVM 币种可以用钱包支付
        if (isConnected) {
          methods.push('evm_wallet');
        }
      }

      if (coin.type === 'utxo') {
        // UTXO 币种使用扫描支付
        methods.push('scan');
      }

      // 节点钱包直接支付（如果有）
      methods.push('direct');

      return methods;
    },
    [isConnected]
  );

  /**
   * 获取支持的币种
   */
  const getSupportedCoins = useCallback((): PaymentCoin[] => {
    return SUPPORTED_COINS;
  }, []);

  /**
   * 重置支付状态
   */
  const resetPayment = useCallback(() => {
    setPaymentState('idle');
    setError(null);
    setInstructions(null);
    setResult(null);
    setIsLoading(false);
  }, []);

  // 同步交易结果
  useEffect(() => {
    if (transactionResult) {
      setResult(prev => ({
        ...(prev || { orderId: '', method: 'evm_wallet' as CheckoutPaymentMethod }),
        txHash: transactionResult.hash,
        status: transactionResult.status === 'confirmed' ? 'completed' : 'confirming',
        confirmations: transactionResult.confirmations,
      }));
    }
  }, [transactionResult]);

  return {
    // 状态
    paymentState,
    isLoading,
    error,
    instructions,
    result,

    // 钱包支付
    payWithWallet,

    // 扫描支付
    getPaymentInstructions,
    checkPaymentStatus,

    // 直接支付
    payFromNodeWallet,

    // 工具
    getAvailablePaymentMethods,
    getSupportedCoins,
    resetPayment,
  };
}

export default usePayment;
