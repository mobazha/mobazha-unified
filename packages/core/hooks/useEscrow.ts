/**
 * Escrow Hook
 * 托管合约 React Hook
 */

import { useState, useCallback, useEffect } from 'react';
import { getEscrowService } from '../services/payment/escrow';
import { useWallet } from './useWallet';
import type {
  ChainId,
  EscrowParams,
  PaymentInfo,
  TransactionResult,
  TokenInfo,
} from '../services/payment/types';

export interface UseEscrowReturn {
  // 状态
  isLoading: boolean;
  error: string | null;
  paymentInfo: PaymentInfo | null;
  transactionResult: TransactionResult | null;

  // 托管操作
  createEscrow: (params: EscrowParams, tokenAddress?: string) => Promise<TransactionResult | null>;
  releaseEscrow: (orderId: string) => Promise<TransactionResult | null>;
  refundEscrow: (orderId: string) => Promise<TransactionResult | null>;
  resolveDispute: (
    orderId: string,
    buyerAmount: string,
    sellerAmount: string
  ) => Promise<TransactionResult | null>;

  // 查询
  getEscrowInfo: (orderId: string) => Promise<PaymentInfo | null>;
  estimateGas: (params: EscrowParams) => Promise<string | null>;
  getTokenBalance: (tokenAddress: string) => Promise<string | null>;

  // 代币
  getSupportedTokens: () => TokenInfo[];

  // 监听
  watchEscrow: (
    orderId: string,
    callbacks: {
      onCreated?: (data: unknown) => void;
      onReleased?: (data: unknown) => void;
      onRefunded?: (data: unknown) => void;
      onDisputeResolved?: (data: unknown) => void;
    }
  ) => () => void;

  // 工具
  clearError: () => void;
  clearResult: () => void;
}

/**
 * 托管合约 Hook
 */
export function useEscrow(): UseEscrowReturn {
  const { isConnected, walletInfo } = useWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
  const [transactionResult, setTransactionResult] = useState<TransactionResult | null>(null);

  // 获取服务实例
  const escrowService = getEscrowService();

  // 创建托管
  const createEscrow = useCallback(
    async (params: EscrowParams, tokenAddress?: string): Promise<TransactionResult | null> => {
      if (!isConnected) {
        setError('请先连接钱包');
        return null;
      }

      setIsLoading(true);
      setError(null);
      setTransactionResult(null);

      try {
        let result: TransactionResult | null;

        if (tokenAddress) {
          result = await escrowService.createTokenEscrow(params, tokenAddress);
        } else {
          result = await escrowService.createNativeEscrow(params);
        }

        setTransactionResult(result);
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : '创建托管失败';
        setError(message);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [isConnected, escrowService]
  );

  // 释放托管
  const releaseEscrow = useCallback(
    async (orderId: string): Promise<TransactionResult | null> => {
      if (!isConnected) {
        setError('请先连接钱包');
        return null;
      }

      setIsLoading(true);
      setError(null);

      try {
        const result = await escrowService.release(orderId);
        setTransactionResult(result);
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : '释放托管失败';
        setError(message);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [isConnected, escrowService]
  );

  // 退款
  const refundEscrow = useCallback(
    async (orderId: string): Promise<TransactionResult | null> => {
      if (!isConnected) {
        setError('请先连接钱包');
        return null;
      }

      setIsLoading(true);
      setError(null);

      try {
        const result = await escrowService.refund(orderId);
        setTransactionResult(result);
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : '退款失败';
        setError(message);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [isConnected, escrowService]
  );

  // 解决争议
  const resolveDispute = useCallback(
    async (orderId: string, buyerAmount: string, sellerAmount: string): Promise<TransactionResult | null> => {
      if (!isConnected) {
        setError('请先连接钱包');
        return null;
      }

      setIsLoading(true);
      setError(null);

      try {
        const result = await escrowService.resolveDispute(orderId, buyerAmount, sellerAmount);
        setTransactionResult(result);
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : '解决争议失败';
        setError(message);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [isConnected, escrowService]
  );

  // 获取托管信息
  const getEscrowInfo = useCallback(
    async (orderId: string): Promise<PaymentInfo | null> => {
      if (!isConnected) return null;

      try {
        const info = await escrowService.getEscrowInfo(orderId);
        setPaymentInfo(info);
        return info;
      } catch {
        return null;
      }
    },
    [isConnected, escrowService]
  );

  // 估算 Gas
  const estimateGas = useCallback(
    async (params: EscrowParams): Promise<string | null> => {
      if (!isConnected) return null;

      try {
        const gas = await escrowService.estimateGas(params);
        return gas ? gas.toString() : null;
      } catch {
        return null;
      }
    },
    [isConnected, escrowService]
  );

  // 获取代币余额
  const getTokenBalance = useCallback(
    async (tokenAddress: string): Promise<string | null> => {
      if (!isConnected) return null;
      return escrowService.getTokenBalance(tokenAddress);
    },
    [isConnected, escrowService]
  );

  // 获取支持的代币
  const getSupportedTokens = useCallback((): TokenInfo[] => {
    const chainId = walletInfo?.chainId;
    if (!chainId) return [];
    return escrowService.getSupportedTokens(chainId as ChainId);
  }, [walletInfo?.chainId, escrowService]);

  // 监听托管事件
  const watchEscrow = useCallback(
    (
      orderId: string,
      callbacks: {
        onCreated?: (data: unknown) => void;
        onReleased?: (data: unknown) => void;
        onRefunded?: (data: unknown) => void;
        onDisputeResolved?: (data: unknown) => void;
      }
    ): (() => void) => {
      if (!isConnected) return () => {};
      return escrowService.listenToEscrowEvents(orderId, callbacks);
    },
    [isConnected, escrowService]
  );

  // 清除错误
  const clearError = useCallback(() => setError(null), []);

  // 清除结果
  const clearResult = useCallback(() => {
    setTransactionResult(null);
    setPaymentInfo(null);
  }, []);

  // 当钱包断开时清除状态
  useEffect(() => {
    if (!isConnected) {
      setPaymentInfo(null);
      setTransactionResult(null);
    }
  }, [isConnected]);

  return {
    // 状态
    isLoading,
    error,
    paymentInfo,
    transactionResult,

    // 托管操作
    createEscrow,
    releaseEscrow,
    refundEscrow,
    resolveDispute,

    // 查询
    getEscrowInfo,
    estimateGas,
    getTokenBalance,

    // 代币
    getSupportedTokens,

    // 监听
    watchEscrow,

    // 工具
    clearError,
    clearResult,
  };
}

export default useEscrow;

