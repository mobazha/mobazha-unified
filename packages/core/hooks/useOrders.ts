/**
 * 订单相关 Hooks
 */

import { useState, useEffect, useCallback } from 'react';
import type { OrderListItem, Order } from '../types';
import { ordersApi, type PurchaseData, type OrderEstimate, type PurchaseResult } from '../services/api/orders';

/**
 * 订单列表过滤选项
 */
export interface OrdersFilter {
  states?: string[];
  searchTerm?: string;
  sortByAscending?: boolean;
  limit?: number;
}

/**
 * 获取购买订单列表
 */
export function usePurchases(filter?: OrdersFilter) {
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await ordersApi.getPurchases();
      // 客户端过滤（可选）
      let filteredOrders = result;
      if (filter?.states && filter.states.length > 0) {
        filteredOrders = filteredOrders.filter(o => filter.states?.includes(o.state));
      }
      if (filter?.searchTerm) {
        const term = filter.searchTerm.toLowerCase();
        filteredOrders = filteredOrders.filter(
          o => o.title.toLowerCase().includes(term) || o.orderId.toLowerCase().includes(term)
        );
      }
      setOrders(filteredOrders);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取订单失败');
    } finally {
      setIsLoading(false);
    }
  }, [filter?.states, filter?.searchTerm]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { orders, isLoading, error, refetch };
}

/**
 * 获取销售订单列表
 */
export function useSales(filter?: OrdersFilter) {
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await ordersApi.getSales();
      // 客户端过滤
      let filteredOrders = result;
      if (filter?.states && filter.states.length > 0) {
        filteredOrders = filteredOrders.filter(o => filter.states?.includes(o.state));
      }
      if (filter?.searchTerm) {
        const term = filter.searchTerm.toLowerCase();
        filteredOrders = filteredOrders.filter(
          o => o.title.toLowerCase().includes(term) || o.orderId.toLowerCase().includes(term)
        );
      }
      setOrders(filteredOrders);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取订单失败');
    } finally {
      setIsLoading(false);
    }
  }, [filter?.states, filter?.searchTerm]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { orders, isLoading, error, refetch };
}

/**
 * 获取订单详情
 */
export function useOrder(orderId: string | null) {
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!orderId) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await ordersApi.getOrderDetails(orderId);
      setOrder(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取订单详情失败');
    } finally {
      setIsLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  // 标记为已读
  const markAsRead = useCallback(async () => {
    if (!orderId) return false;
    try {
      const result = await ordersApi.markOrderAsRead(orderId);
      if (result.success && order) {
        setOrder({ ...order, read: true });
      }
      return result.success;
    } catch {
      return false;
    }
  }, [orderId, order]);

  return { order, isLoading, error, refetch, markAsRead };
}

/**
 * 创建订单 Hook
 */
export function useCreateOrder() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [estimate, setEstimate] = useState<OrderEstimate | null>(null);

  /**
   * 估算订单总价
   */
  const estimateTotal = useCallback(async (data: PurchaseData): Promise<OrderEstimate | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await ordersApi.estimateOrderTotal(data);
      setEstimate(result);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : '估算订单失败');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * 获取结账明细
   */
  const getBreakdown = useCallback(async (data: PurchaseData): Promise<OrderEstimate | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await ordersApi.getCheckoutBreakdown(data);
      setEstimate(result);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取结账明细失败');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * 创建订单
   */
  const createOrder = useCallback(async (data: PurchaseData): Promise<PurchaseResult | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await ordersApi.purchaseListing(data);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建订单失败');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);
  const clearEstimate = useCallback(() => setEstimate(null), []);

  return {
    isLoading,
    error,
    estimate,
    estimateTotal,
    getBreakdown,
    createOrder,
    clearError,
    clearEstimate,
  };
}

/**
 * 订单支付 Hook
 */
export function useOrderPayment(orderId: string | null) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentInfo, setPaymentInfo] = useState<{
    address?: string;
    amount?: number;
    remaining?: number;
    paid?: number;
  } | null>(null);

  /**
   * 获取支付指令
   */
  const getPaymentInstructions = useCallback(
    async (coin: string) => {
      if (!orderId) return null;

      setIsLoading(true);
      setError(null);

      try {
        const result = await ordersApi.getPaymentInstructions({ orderId, coin });
        setPaymentInfo(prev => ({ ...prev, ...result }));
        return result;
      } catch (err) {
        setError(err instanceof Error ? err.message : '获取支付信息失败');
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [orderId]
  );

  /**
   * 获取剩余支付金额
   */
  const getPaymentRemaining = useCallback(async () => {
    if (!orderId) return null;

    try {
      const result = await ordersApi.getPaymentRemaining(orderId);
      setPaymentInfo(prev => ({ ...prev, ...result }));
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取支付状态失败');
      return null;
    }
  }, [orderId]);

  /**
   * 执行支付
   */
  const fundOrder = useCallback(
    async (params: { coin: string; address: string; amount: number; memo?: string }) => {
      if (!orderId) return null;

      setIsLoading(true);
      setError(null);

      try {
        const result = await ordersApi.fundOrder({
          ...params,
          orderId,
        });

        if (!result.success) {
          throw new Error(result.error || '支付失败');
        }

        return result;
      } catch (err) {
        setError(err instanceof Error ? err.message : '支付失败');
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [orderId]
  );

  return {
    isLoading,
    error,
    paymentInfo,
    getPaymentInstructions,
    getPaymentRemaining,
    fundOrder,
  };
}

/**
 * 订单操作 Hook
 */
export function useOrderActions() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * 确认订单（卖家）
   */
  const confirmOrder = useCallback(async (orderId: string, reject = false, note?: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await ordersApi.confirmOrder({ orderId, reject, note });
      if (!result.success) {
        throw new Error(result.error || '操作失败');
      }
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * 发货（卖家）
   */
  const fulfillOrder = useCallback(
    async (params: {
      orderId: string;
      physicalDelivery?: { shipper: string; trackingNumber: string }[];
      digitalDelivery?: { url?: string; password?: string };
      note?: string;
    }) => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await ordersApi.fulfillOrder(params);
        if (!result.success) {
          throw new Error(result.error || '操作失败');
        }
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : '操作失败');
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * 完成订单（买家）
   */
  const completeOrder = useCallback(
    async (params: {
      orderId: string;
      ratings?: Array<{
        slug: string;
        overall: number;
        quality?: number;
        description?: number;
        deliverySpeed?: number;
        customerService?: number;
        review?: string;
        anonymous?: boolean;
      }>;
    }) => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await ordersApi.completeOrder(params);
        if (!result.success) {
          throw new Error(result.error || '操作失败');
        }
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : '操作失败');
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * 取消订单
   */
  const cancelOrder = useCallback(async (orderId: string, transactionId?: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await ordersApi.cancelOrder(orderId, transactionId);
      if (!result.success) {
        throw new Error(result.error || '操作失败');
      }
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * 退款订单
   */
  const refundOrder = useCallback(async (orderId: string, transactionId?: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await ordersApi.refundOrder(orderId, transactionId);
      if (!result.success) {
        throw new Error(result.error || '操作失败');
      }
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * 开启争议
   */
  const openDispute = useCallback(async (orderId: string, claim: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await ordersApi.openDispute(orderId, claim);
      if (!result.success) {
        throw new Error(result.error || '操作失败');
      }
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * 接受争议裁决
   */
  const acceptDispute = useCallback(async (orderId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await ordersApi.acceptDispute(orderId);
      if (!result.success) {
        throw new Error(result.error || '操作失败');
      }
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * 重发订单消息
   */
  const resendMessage = useCallback(async (orderId: string, messageType: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await ordersApi.resendOrderMessage(orderId, messageType);
      if (!result.success) {
        throw new Error(result.error || '操作失败');
      }
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return {
    isLoading,
    error,
    // 卖家操作
    confirmOrder,
    fulfillOrder,
    refundOrder,
    // 买家操作
    completeOrder,
    cancelOrder,
    // 争议
    openDispute,
    acceptDispute,
    // 其他
    resendMessage,
    clearError,
  };
}

/**
 * 统一订单 Hook - 合并所有订单功能
 */
export function useOrders() {
  const purchases = usePurchases();
  const sales = useSales();
  const actions = useOrderActions();

  return {
    purchases,
    sales,
    actions,
  };
}

export default useOrders;
