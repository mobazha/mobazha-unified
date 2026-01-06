/**
 * 订单相关 Hooks
 */

import { useState, useEffect, useCallback } from 'react';
import type { OrderListItem, Order } from '../types';
import { ordersApi } from '../services/api';

/**
 * 获取购买订单列表
 */
export function usePurchases() {
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await ordersApi.getPurchases();
      setOrders(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取订单失败');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { orders, isLoading, error, refetch };
}

/**
 * 获取销售订单列表
 */
export function useSales() {
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await ordersApi.getSales();
      setOrders(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取订单失败');
    } finally {
      setIsLoading(false);
    }
  }, [refetch]);

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

  return { order, isLoading, error, refetch };
}

/**
 * 订单操作 Hook
 */
export function useOrderActions() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirmOrder = useCallback(async (orderId: string, reject = false, note?: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await ordersApi.confirmOrder({ orderId, reject, note });
      return result.success;
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

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
        return result.success;
      } catch (err) {
        setError(err instanceof Error ? err.message : '操作失败');
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

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
        return result.success;
      } catch (err) {
        setError(err instanceof Error ? err.message : '操作失败');
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const cancelOrder = useCallback(async (orderId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await ordersApi.cancelOrder(orderId);
      return result.success;
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refundOrder = useCallback(async (orderId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await ordersApi.refundOrder(orderId);
      return result.success;
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const openDispute = useCallback(async (orderId: string, claim: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await ordersApi.openDispute(orderId, claim);
      return result.success;
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
    confirmOrder,
    fulfillOrder,
    completeOrder,
    cancelOrder,
    refundOrder,
    openDispute,
    clearError,
  };
}
