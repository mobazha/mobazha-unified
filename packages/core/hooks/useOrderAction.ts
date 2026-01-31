'use client';

/**
 * useOrderAction Hook
 * 统一订单操作 Hook - 处理所有订单状态变更操作
 *
 * 功能：
 * 1. 自动判断链类型（UTXO vs EVM/Solana）
 * 2. UTXO 链：直接调用 action API
 * 3. EVM/Solana 链：先获取 instructions，如需要则执行链上交易
 * 4. 统一的错误处理和加载状态管理
 * 5. 集成 Reown AppKit 进行钱包连接
 *
 * 参考桌面端 backbone/utils/order.js 中的 handleOrderOperation 实现
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useWallet } from './useWallet';
import { useI18n } from './useI18n';
import { isUTXOChain } from '../data/tokens';
import { getTransactionService } from '../services/transaction';
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
 * 等待钱包连接完成的超时时间（毫秒）
 */
const WALLET_CONNECT_TIMEOUT = 60000; // 60 秒
const WALLET_POLL_INTERVAL = 500; // 轮询间隔 500ms

/**
 * 统一订单操作 Hook
 *
 * @example
 * ```tsx
 * const { execute, isLoading, error, isWaitingForWallet } = useOrderAction();
 *
 * // 接受订单
 * await execute({
 *   paymentCoin: order.paymentCoin,
 *   getInstructions: (address) => ordersApi.getConfirmInstructions({
 *     orderID: orderId,
 *     reject: false,
 *     initiatorAddress: address,
 *     payoutAddress: receivingAddress,
 *   }),
 *   executeAction: (txID) => ordersApi.confirmOrder({
 *     orderID: orderId,
 *     reject: false,
 *     payoutAddress: receivingAddress,
 *     transactionID: txID,
 *   }),
 *   onSuccess: () => toast({ title: '订单已接受' }),
 * });
 * ```
 */
export function useOrderAction(): UseOrderActionReturn {
  const { walletInfo, getSigner, connect, isConnected } = useWallet();
  const { t } = useI18n();

  const [isLoading, setIsLoading] = useState(false);
  const [isWaitingForWallet, setIsWaitingForWallet] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // 用于追踪最新的钱包地址（通过 ref 可以在闭包中获取最新值）
  const walletAddressRef = useRef<string | null>(null);
  const isConnectedRef = useRef(false);

  // 同步钱包状态到 ref
  useEffect(() => {
    walletAddressRef.current = walletInfo?.address || null;
    isConnectedRef.current = isConnected;
  }, [walletInfo?.address, isConnected]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * 等待钱包连接完成
   * 使用轮询方式检查连接状态，因为 React 状态更新是异步的
   */
  const waitForWalletConnection = useCallback(async (): Promise<string> => {
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      const checkConnection = () => {
        // 检查是否超时
        if (Date.now() - startTime > WALLET_CONNECT_TIMEOUT) {
          reject(new Error(t('order.actions.walletConnectionTimeout')));
          return;
        }

        // 检查连接状态
        if (isConnectedRef.current && walletAddressRef.current) {
          resolve(walletAddressRef.current);
          return;
        }

        // 继续轮询
        setTimeout(checkConnection, WALLET_POLL_INTERVAL);
      };

      checkConnection();
    });
  }, [t]);

  const execute = useCallback(
    async (options: OrderActionOptions) => {
      const {
        getInstructions,
        executeAction,
        paymentCoin,
        onSuccess,
        onError,
        requireWallet = true,
      } = options;

      setIsLoading(true);
      setError(null);

      try {
        // 1. 判断链类型
        if (isUTXOChain(paymentCoin)) {
          // UTXO 链：直接调用 action API，后端处理多签
          const result = await executeAction();

          if (!result.success) {
            throw new Error(result.error || t('order.actions.operationFailed'));
          }

          onSuccess?.();
          return;
        }

        // 2. EVM/Solana 链：检查是否需要 instructions
        if (getInstructions) {
          let initiatorAddress = walletInfo?.address || '';

          // 先尝试获取 instructions（用当前地址或空地址）
          // 后端会根据订单的支付方式判断是否需要链上交易
          const response = await getInstructions(initiatorAddress);

          if (response.hasInstructions && response.instructions) {
            // 需要链上交易 - 此时必须连接钱包
            // 如果钱包未连接，现在才要求连接
            if (requireWallet && (!isConnected || !initiatorAddress)) {
              setIsWaitingForWallet(true);

              try {
                // 使用 AppKit 的 connect 方法打开连接弹窗
                const connectResult = await connect();

                if (!connectResult) {
                  // 用户可能取消了连接
                  throw new Error(t('order.actions.walletConnectionCancelled'));
                }

                // 等待钱包连接完成并获取地址
                initiatorAddress = await waitForWalletConnection();

                // 重新获取 instructions（使用新的钱包地址）
                // 这很重要，因为 instructions 中的数据可能依赖于 initiatorAddress
                const newResponse = await getInstructions(initiatorAddress);

                if (!newResponse.hasInstructions || !newResponse.instructions) {
                  // 连接钱包后发现不需要链上交易了（理论上不应该发生）
                  const result = await executeAction();
                  if (!result.success) {
                    throw new Error(result.error || t('order.actions.operationFailed'));
                  }
                  onSuccess?.();
                  return;
                }

                // 使用新的 instructions
                response.instructions = newResponse.instructions;
              } finally {
                setIsWaitingForWallet(false);
              }
            }

            // 验证钱包地址
            if (!initiatorAddress) {
              throw new Error(t('order.actions.walletConnectionRequired'));
            }

            // 需要链上交易，获取 signer
            const signer = await getSigner();
            if (!signer) {
              throw new Error(t('order.actions.walletSignerError'));
            }

            // 初始化交易服务
            const transactionService = getTransactionService();
            const initResult = await transactionService.initializeWithSigner(signer);
            if (!initResult) {
              throw new Error(t('order.actions.transactionServiceError'));
            }

            // 验证 instructions 数据
            const { to, data, value } = response.instructions;
            if (!to || !data) {
              console.error('[useOrderAction] Invalid instructions:', response.instructions);
              throw new Error(t('order.actions.invalidInstructions'));
            }

            // 执行链上交易
            const txResult = await transactionService.executeTransaction({
              to,
              data,
              value: value || '0',
            });

            if (!txResult.success || !txResult.transactionHash) {
              // 检查是否是零地址错误
              const errorMsg = txResult.error || '';
              if (errorMsg.includes('zero address')) {
                throw new Error(t('order.actions.zeroAddressError'));
              }
              throw new Error(errorMsg || t('order.actions.transactionFailed'));
            }

            // 调用 action API（带 txID）
            const result = await executeAction(txResult.transactionHash);

            if (!result.success) {
              throw new Error(result.error || t('order.actions.operationFailed'));
            }
          } else {
            // 无需链上交易，直接调用 action API（不需要钱包连接）
            const result = await executeAction();

            if (!result.success) {
              throw new Error(result.error || t('order.actions.operationFailed'));
            }
          }
        } else {
          // 没有提供 getInstructions 函数，直接调用 action API
          const result = await executeAction();

          if (!result.success) {
            throw new Error(result.error || t('order.actions.operationFailed'));
          }
        }

        onSuccess?.();
      } catch (err) {
        const errorInstance = err instanceof Error ? err : new Error(String(err));
        console.error('[useOrderAction] Operation failed:', errorInstance);
        setError(errorInstance);
        onError?.(errorInstance);
        throw errorInstance;
      } finally {
        setIsLoading(false);
        setIsWaitingForWallet(false);
      }
    },
    [walletInfo, getSigner, connect, isConnected, t, waitForWalletConnection]
  );

  return {
    execute,
    isLoading,
    isWaitingForWallet,
    error,
    clearError,
  };
}

export default useOrderAction;
