/**
 * 订单相关 Hooks — React Query 版本
 *
 * READ ops → useQuery + 手动分页
 * WRITE ops → useMutation + cache invalidation
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { OrderListItem } from '../types';
import {
  ordersApi,
  type PurchaseData,
  type OrderEstimate,
  type PurchaseResult,
} from '../services/api/orders';
import { useNotificationStore, selectOrderRefreshTrigger } from '../stores/notificationStore';
import { queryKeys } from './queryKeys';
import { formatQueryError } from './queryUtils';

export interface OrdersFilter {
  states?: string[];
  searchTerm?: string;
  sortByAscending?: boolean;
  limit?: number;
}

const DEFAULT_PAGE_SIZE = 20;

function applyClientFilter(orders: OrderListItem[], filter?: OrdersFilter): OrderListItem[] {
  let result = orders;
  if (filter?.states && filter.states.length > 0) {
    result = result.filter(o => filter.states?.includes(o.state));
  }
  if (filter?.searchTerm) {
    const term = filter.searchTerm.toLowerCase();
    result = result.filter(
      o => o.title.toLowerCase().includes(term) || o.orderID.toLowerCase().includes(term)
    );
  }
  return result;
}

// ─── Internal: shared order list logic for purchases/sales ───

type OrderListFetcher = (limit: string, cursor: string) => Promise<OrderListItem[]>;

function useOrderList(
  type: 'purchases' | 'sales',
  fetcher: OrderListFetcher,
  filter?: OrdersFilter
) {
  const pageSize = filter?.limit || DEFAULT_PAGE_SIZE;
  const filterKey = JSON.stringify({ states: filter?.states, search: filter?.searchTerm });
  const queryClient = useQueryClient();

  const [extraOrders, setExtraOrders] = useState<OrderListItem[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const cursorRef = useRef('');

  const queryKey =
    type === 'purchases'
      ? queryKeys.orders.purchases(filterKey)
      : queryKeys.orders.sales(filterKey);

  const {
    data: firstPage,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: () => fetcher(String(pageSize), ''),
    staleTime: 30 * 1000,
  });

  // Reset pagination state when firstPage changes (initial load or refetch)
  useEffect(() => {
    if (firstPage) {
      setExtraOrders([]);
      setHasMore(firstPage.length >= pageSize);
      cursorRef.current = firstPage[firstPage.length - 1]?.orderID || '';
    }
  }, [firstPage, pageSize]);

  const orders = useMemo(() => {
    const allRaw = [...(firstPage ?? []), ...extraOrders];
    return applyClientFilter(allRaw, filter);
  }, [firstPage, extraOrders, filter]);

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore || !cursorRef.current) return;

    setIsLoadingMore(true);
    try {
      const result = await fetcher(String(pageSize), cursorRef.current);

      if (result.length === 0) {
        setHasMore(false);
      } else {
        setExtraOrders(prev => [...prev, ...result]);
        setHasMore(result.length >= pageSize);
        cursorRef.current = result[result.length - 1]?.orderID || '';
      }
    } catch {
      // loadMore errors are non-critical
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMore, pageSize, fetcher]);

  // WebSocket notification → invalidate cache
  const refreshTrigger = useNotificationStore(selectOrderRefreshTrigger);
  const prevTrigger = useRef(refreshTrigger);
  useEffect(() => {
    if (prevTrigger.current !== refreshTrigger) {
      prevTrigger.current = refreshTrigger;
      const baseKey =
        type === 'purchases' ? queryKeys.orders.purchases() : queryKeys.orders.sales();
      queryClient.invalidateQueries({ queryKey: baseKey });
    }
  }, [refreshTrigger, queryClient, type]);

  return {
    orders,
    isLoading,
    isLoadingMore,
    error: formatQueryError(error),
    hasMore,
    refetch,
    loadMore,
  };
}

// ─── Public hooks ───

export function usePurchases(filter?: OrdersFilter) {
  return useOrderList('purchases', ordersApi.getPurchases, filter);
}

export function useSales(filter?: OrdersFilter) {
  return useOrderList('sales', ordersApi.getSales, filter);
}

export function useOrder(orderId: string | null) {
  const queryClient = useQueryClient();

  const {
    data: order,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.orders.detail(orderId!),
    queryFn: () => ordersApi.getOrderDetails(orderId!),
    enabled: !!orderId,
    staleTime: 30 * 1000,
  });

  // WebSocket notification → invalidate this order
  const detailRefreshTrigger = useNotificationStore(selectOrderRefreshTrigger);
  const prevDetailTrigger = useRef(detailRefreshTrigger);
  useEffect(() => {
    if (prevDetailTrigger.current !== detailRefreshTrigger) {
      prevDetailTrigger.current = detailRefreshTrigger;
      if (orderId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(orderId) });
      }
    }
  }, [detailRefreshTrigger, orderId, queryClient]);

  const markAsRead = useCallback(async () => {
    if (!orderId) return false;
    try {
      const result = await ordersApi.markOrderAsRead(orderId);
      if (result.success && order) {
        queryClient.setQueryData(queryKeys.orders.detail(orderId), { ...order, read: true });
      }
      return result.success;
    } catch {
      return false;
    }
  }, [orderId, order, queryClient]);

  return {
    order: order ?? null,
    isLoading,
    error: formatQueryError(error),
    refetch,
    markAsRead,
  };
}

// ─── Create order ───

export function useCreateOrder() {
  const queryClient = useQueryClient();
  const [estimate, setEstimate] = useState<OrderEstimate | null>(null);

  const estimateMutation = useMutation({
    mutationFn: (data: PurchaseData) => ordersApi.estimateOrderTotal(data),
    onSuccess: result => setEstimate(result),
  });

  const breakdownMutation = useMutation({
    mutationFn: (data: PurchaseData) => ordersApi.getCheckoutBreakdown(data),
    onSuccess: result => setEstimate(result),
  });

  const purchaseMutation = useMutation({
    mutationFn: (data: PurchaseData) => ordersApi.purchaseListing(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.purchases() });
    },
  });

  const estimateTotal = useCallback(
    async (data: PurchaseData): Promise<OrderEstimate | null> => {
      try {
        return await estimateMutation.mutateAsync(data);
      } catch {
        return null;
      }
    },
    [estimateMutation]
  );

  const getBreakdown = useCallback(
    async (data: PurchaseData): Promise<OrderEstimate | null> => {
      try {
        return await breakdownMutation.mutateAsync(data);
      } catch {
        return null;
      }
    },
    [breakdownMutation]
  );

  const createOrder = useCallback(
    async (data: PurchaseData): Promise<PurchaseResult | null> => {
      try {
        return await purchaseMutation.mutateAsync(data);
      } catch {
        return null;
      }
    },
    [purchaseMutation]
  );

  const isLoading =
    estimateMutation.isPending || breakdownMutation.isPending || purchaseMutation.isPending;

  const clearError = useCallback(() => {
    estimateMutation.reset();
    breakdownMutation.reset();
    purchaseMutation.reset();
  }, [estimateMutation, breakdownMutation, purchaseMutation]);

  const clearEstimate = useCallback(() => setEstimate(null), []);

  return {
    isLoading,
    error: formatQueryError(
      estimateMutation.error || breakdownMutation.error || purchaseMutation.error
    ),
    estimate,
    estimateTotal,
    getBreakdown,
    createOrder,
    clearError,
    clearEstimate,
  };
}

// ─── Order payment ───

export function useOrderPayment(orderId: string | null) {
  const [paymentInfo, setPaymentInfo] = useState<{
    address?: string;
    amount?: number;
    remaining?: number;
    paid?: number;
  } | null>(null);

  const instructionsMutation = useMutation({
    mutationFn: (coin: string) => ordersApi.getPaymentInstructions({ orderId: orderId!, coin }),
    onSuccess: result => setPaymentInfo(prev => ({ ...prev, ...result })),
  });

  const fundMutation = useMutation({
    mutationFn: (params: { coin: string; address: string; amount: number; memo?: string }) =>
      ordersApi.fundOrder({ ...params, orderId: orderId! }),
  });

  const getPaymentInstructions = useCallback(
    async (coin: string) => {
      if (!orderId) return null;
      try {
        return await instructionsMutation.mutateAsync(coin);
      } catch {
        return null;
      }
    },
    [orderId, instructionsMutation]
  );

  const getPaymentRemaining = useCallback(async () => {
    if (!orderId) return null;
    try {
      const result = await ordersApi.getPaymentRemaining(orderId);
      setPaymentInfo(prev => ({ ...prev, ...result }));
      return result;
    } catch {
      return null;
    }
  }, [orderId]);

  const fundOrder = useCallback(
    async (params: { coin: string; address: string; amount: number; memo?: string }) => {
      if (!orderId) return null;
      try {
        const result = await fundMutation.mutateAsync(params);
        if (!result.success) {
          throw new Error(result.error || 'Payment failed');
        }
        return result;
      } catch {
        return null;
      }
    },
    [orderId, fundMutation]
  );

  const isLoading = instructionsMutation.isPending || fundMutation.isPending;

  return {
    isLoading,
    error: formatQueryError(instructionsMutation.error || fundMutation.error),
    paymentInfo,
    getPaymentInstructions,
    getPaymentRemaining,
    fundOrder,
  };
}

// ─── Order actions (seller/buyer operations) ───

function useMutationAction<TParams>(
  mutationFn: (params: TParams) => Promise<{ success: boolean; error?: string }>,
  onSuccessFn?: () => void
) {
  const mutation = useMutation({
    mutationFn,
    onSuccess: () => onSuccessFn?.(),
  });

  const execute = useCallback(
    async (params: TParams): Promise<boolean> => {
      try {
        const result = await mutation.mutateAsync(params);
        if (!result.success) throw new Error(result.error || 'Action failed');
        return true;
      } catch {
        return false;
      }
    },
    [mutation]
  );

  return { execute, isPending: mutation.isPending, error: mutation.error, reset: mutation.reset };
}

export function useOrderActions() {
  const queryClient = useQueryClient();

  const invalidateOrders = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
  }, [queryClient]);

  const confirm = useMutationAction(
    (p: { orderID: string; reject?: boolean }) => ordersApi.confirmOrder(p),
    invalidateOrders
  );
  const fulfill = useMutationAction(
    (p: {
      orderID: string;
      physicalDelivery?: { shipper: string; trackingNumber: string };
      digitalDelivery?: { url?: string; password?: string };
      note?: string;
    }) => ordersApi.fulfillOrder(p),
    invalidateOrders
  );
  const complete = useMutationAction(
    (p: {
      orderID: string;
      txID?: string;
      ratings?: Array<{
        slug: string;
        overall: number;
        quality?: number;
        description?: number;
        deliverySpeed?: number;
        customerService?: number;
        review?: string;
      }>;
      anonymous?: boolean;
    }) => ordersApi.completeOrder(p),
    invalidateOrders
  );
  const cancel = useMutationAction(
    (p: { orderID: string; transactionID?: string }) => ordersApi.cancelOrder(p),
    invalidateOrders
  );
  const refund = useMutationAction(
    (p: { orderID: string; transactionID?: string }) => ordersApi.refundOrder(p),
    invalidateOrders
  );
  const dispute = useMutationAction(
    (p: { orderId: string; claim: string }) => ordersApi.openDispute(p.orderId, p.claim),
    invalidateOrders
  );
  const acceptDisp = useMutationAction(
    (orderId: string) => ordersApi.acceptDispute(orderId),
    invalidateOrders
  );
  const resend = useMutationAction((p: { orderId: string; messageType: string }) =>
    ordersApi.resendOrderMessage(p.orderId, p.messageType)
  );

  const confirmOrder = useCallback(
    (orderID: string, reject = false) => confirm.execute({ orderID, reject }),
    [confirm]
  );
  const fulfillOrder = useCallback(
    (params: {
      orderID: string;
      physicalDelivery?: { shipper: string; trackingNumber: string };
      digitalDelivery?: { url?: string; password?: string };
      note?: string;
    }) => fulfill.execute(params),
    [fulfill]
  );
  const completeOrder = useCallback(
    (params: {
      orderID: string;
      txID?: string;
      ratings?: Array<{
        slug: string;
        overall: number;
        quality?: number;
        description?: number;
        deliverySpeed?: number;
        customerService?: number;
        review?: string;
      }>;
      anonymous?: boolean;
    }) => complete.execute(params),
    [complete]
  );
  const cancelOrder = useCallback(
    (orderID: string, transactionID?: string) => cancel.execute({ orderID, transactionID }),
    [cancel]
  );
  const refundOrder = useCallback(
    (orderID: string, transactionID?: string) => refund.execute({ orderID, transactionID }),
    [refund]
  );
  const openDispute = useCallback(
    (orderId: string, claim: string) => dispute.execute({ orderId, claim }),
    [dispute]
  );
  const acceptDispute = useCallback((orderId: string) => acceptDisp.execute(orderId), [acceptDisp]);
  const resendMessage = useCallback(
    (orderId: string, messageType: string) => resend.execute({ orderId, messageType }),
    [resend]
  );

  const isLoading =
    confirm.isPending ||
    fulfill.isPending ||
    complete.isPending ||
    cancel.isPending ||
    refund.isPending ||
    dispute.isPending ||
    acceptDisp.isPending ||
    resend.isPending;

  const firstError =
    confirm.error ||
    fulfill.error ||
    complete.error ||
    cancel.error ||
    refund.error ||
    dispute.error ||
    acceptDisp.error ||
    resend.error;

  const clearError = useCallback(() => {
    confirm.reset();
    fulfill.reset();
    complete.reset();
    cancel.reset();
    refund.reset();
    dispute.reset();
    acceptDisp.reset();
    resend.reset();
  }, [confirm, fulfill, complete, cancel, refund, dispute, acceptDisp, resend]);

  return {
    isLoading,
    isConfirming: confirm.isPending,
    isFulfilling: fulfill.isPending,
    isCompleting: complete.isPending,
    isCancelling: cancel.isPending,
    isRefunding: refund.isPending,
    error: formatQueryError(firstError),
    confirmOrder,
    fulfillOrder,
    refundOrder,
    completeOrder,
    cancelOrder,
    openDispute,
    acceptDispute,
    resendMessage,
    clearError,
  };
}

// ─── Composite hook ───

export function useOrders() {
  const purchases = usePurchases();
  const sales = useSales();
  const actions = useOrderActions();

  return { purchases, sales, actions };
}

export default useOrders;
