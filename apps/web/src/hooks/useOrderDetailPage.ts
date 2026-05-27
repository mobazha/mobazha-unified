'use client';

import { useCallback, useState, useEffect, useMemo, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/use-toast';
import {
  useOrderDetail,
  useUserStore,
  useI18n,
  ordersApi,
  fiatApi,
  onWebSocketMessage,
  useOrderAction,
  digitalAssetsApi,
  CONTRACT_TYPES,
  isFiatPaymentCoin,
  type DigitalDeliveryStatus,
  type WebSocketMessage,
  queryKeys,
} from '@mobazha/core';
import type { OrderConfirmType } from '@/components/Order';

interface OrderContractData {
  contract?: {
    orderOpen?: {
      listings?: Array<{
        listing?: {
          slug?: string;
          metadata?: { contractType?: string };
          item?: { blockchain?: string };
        };
      }>;
    };
    paymentSent?: {
      coin?: string;
      method?: { toString: () => string };
      settlementSpec?: {
        payMode?: string;
        escrowType?: string;
      };
    };
  };
}

export interface ReviewSubmitData {
  overall: number;
  review: string;
  anonymous: boolean;
  imageHashes?: string[];
}

export interface UseOrderDetailPageReturn {
  displayOrder: ReturnType<typeof useOrderDetail>['displayOrder'];
  coreOrder: ReturnType<typeof useOrderDetail>['coreOrder'];
  latestSettlementAction: ReturnType<typeof useOrderDetail>['latestSettlementAction'];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  currentUserPeerID: string | null;

  paymentCoin: string | undefined;
  counterparty: { peerID?: string; name?: string; avatar?: string; location?: string } | null;

  isActionLoading: boolean;
  isTransitioning: boolean;
  executeConfirmAction: (
    actionType: OrderConfirmType,
    refundParams?: { amount?: number; currency?: string; reason?: string }
  ) => Promise<boolean>;

  showReviewDialog: boolean;
  reviewProductTitle: string;
  submitReviewAndComplete: (data: ReviewSubmitData) => Promise<void>;
  skipReviewAndComplete: () => Promise<void>;
  closeReviewDialog: () => void;

  copyOrderId: () => Promise<void>;
  copyContract: () => Promise<void>;

  acceptOrderProps: {
    orderId: string;
    blockchain?: string;
    paymentCoin?: string;
    onSuccess: () => void;
  };
  shipOrderProps: {
    orderId: string;
    contractType?: string;
    blockchain?: string;
    onSuccess: () => void;
  };
  sellerDigitalDelivery: {
    isDigitalOrder: boolean;
    listingSlug?: string;
    listingSlugs: string[];
    isLoading: boolean;
    isSyncing: boolean;
    assetCount: number;
    hasPreconfiguredAssets: boolean;
    manualFallbackAllowed: boolean;
    canSyncDelivery: boolean;
    canRetryDelivery: boolean;
    status: DigitalDeliveryStatus['status'] | null;
    error: string | null;
    syncDelivery: () => Promise<boolean>;
    retryDelivery: () => Promise<boolean>;
    refreshStatus: () => void;
  };
}

/**
 * Shared business logic for order detail page.
 * Both OrderDetailDesktop and OrderDetailMobile consume this hook.
 * UI-specific state (dialog visibility, tab selection) stays in the view.
 */
export function useOrderDetailPage(
  orderId: string,
  viewingContext?: 'sale' | 'purchase'
): UseOrderDetailPageReturn {
  const { t } = useI18n();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { displayOrder, coreOrder, latestSettlementAction, isLoading, error, refetch } =
    useOrderDetail(orderId, viewingContext);

  const currentUser = useUserStore(state => state.profile);
  const currentUserPeerID = currentUser?.peerID || null;
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showReviewDialog, setShowReviewDialog] = useState(false);

  // Clear transitioning state when order state actually changes
  const orderStateRef = useRef(coreOrder?.state);
  useEffect(() => {
    if (coreOrder?.state && coreOrder.state !== orderStateRef.current) {
      orderStateRef.current = coreOrder.state;
      setIsTransitioning(false);
    }
  }, [coreOrder?.state]);

  // Safety timeout: clear transitioning after 30s if state never changes
  useEffect(() => {
    if (!isTransitioning) return;
    const timer = window.setTimeout(() => {
      setIsTransitioning(false);
      refetch();
    }, 30000);
    return () => window.clearTimeout(timer);
  }, [isTransitioning, refetch]);

  // --- WebSocket real-time order updates ---
  useEffect(() => {
    const unsubscribe = onWebSocketMessage((message: WebSocketMessage) => {
      const data = message.data as { notification?: { orderID?: string } } | undefined;
      if (data?.notification?.orderID === orderId) {
        setTimeout(() => refetch(), 500);
      }
    });
    return () => {
      unsubscribe();
    };
  }, [orderId, refetch]);

  useEffect(() => {
    const state = (latestSettlementAction?.state || '').trim().toLowerCase();
    if (state !== 'submitting' && state !== 'submitted') {
      return;
    }

    const timer = window.setInterval(() => {
      refetch();
    }, 5000);

    return () => {
      window.clearInterval(timer);
    };
  }, [latestSettlementAction?.actionId, latestSettlementAction?.state, refetch]);

  // --- Computed ---

  const paymentCoin =
    displayOrder?.paymentCoin || (coreOrder as OrderContractData)?.contract?.paymentSent?.coin;
  const canAttemptBackendSettlementAction = useMemo(() => {
    return !displayOrder?.fiatPayment && !isFiatPaymentCoin(paymentCoin);
  }, [displayOrder?.fiatPayment, paymentCoin]);

  const counterparty = useMemo((): {
    peerID?: string;
    name?: string;
    avatar?: string;
    location?: string;
  } | null => {
    if (!displayOrder) return null;
    const p = displayOrder.userRole === 'buyer' ? displayOrder.vendor : displayOrder.buyer;
    return p ? { peerID: p.peerID, name: p.name, avatar: p.avatar, location: p.location } : null;
  }, [displayOrder]);

  // --- Order action execution ---

  const { execute: executeOrderAction } = useOrderAction();

  const reviewProductTitle = useMemo(() => {
    const orderData = coreOrder as OrderContractData | null;
    const listings = orderData?.contract?.orderOpen?.listings || [];
    return listings[0]?.listing?.slug || '';
  }, [coreOrder]);

  const doCompleteOrder = useCallback(
    async (reviewData?: ReviewSubmitData) => {
      setIsActionLoading(true);

      const onSuccess = (title: string, desc: string) => {
        setIsTransitioning(true);
        toast({ title, description: desc });
        setTimeout(() => refetch(), 500);
      };
      const onError = (err: Error) => {
        toast({
          title: t('order.actions.error'),
          description: err.message,
          variant: 'destructive',
        });
      };

      try {
        const orderData = coreOrder as OrderContractData | null;
        const listings = orderData?.contract?.orderOpen?.listings || [];
        const overall = reviewData?.overall || 5;
        const reviewText = reviewData?.review || '';
        const anonymous = reviewData?.anonymous || false;

        const imageHashes = reviewData?.imageHashes;
        const ratings = listings.map((item: { listing?: { slug?: string } }) => ({
          slug: item.listing?.slug || '',
          overall,
          review: reviewText,
          imageHashes,
        }));

        const isAlreadyCompleted = displayOrder?.status === 'completed';

        if (isAlreadyCompleted && reviewData) {
          await ordersApi.rateOrder({ orderID: orderId, ratings, anonymous });
          onSuccess(t('order.actions.rateSuccess'), t('order.actions.rateSuccessDesc'));
        } else {
          await executeOrderAction({
            executeAction: () => ordersApi.completeOrder({ orderID: orderId, ratings, anonymous }),
            onSuccess: () =>
              onSuccess(t('order.actions.completeSuccess'), t('order.actions.completeSuccessDesc')),
            onError,
          });
        }
      } catch (err) {
        onError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setIsActionLoading(false);
        setShowReviewDialog(false);
      }
    },
    [coreOrder, displayOrder, executeOrderAction, orderId, refetch, t, toast]
  );

  const submitReviewAndComplete = useCallback(
    async (data: { overall: number; review: string; anonymous: boolean }) => {
      await doCompleteOrder(data);
    },
    [doCompleteOrder]
  );

  const skipReviewAndComplete = useCallback(async () => {
    await doCompleteOrder();
  }, [doCompleteOrder]);

  const closeReviewDialog = useCallback(() => {
    setShowReviewDialog(false);
  }, []);

  const executeConfirmAction = useCallback(
    async (
      actionType: OrderConfirmType,
      refundParams?: { amount?: number; currency?: string; reason?: string }
    ): Promise<boolean> => {
      setIsActionLoading(true);
      let succeeded = false;

      const onSuccess = (title: string, desc: string) => {
        succeeded = true;
        setIsTransitioning(true);
        toast({ title, description: desc });
        setTimeout(() => refetch(), 500);
      };
      const onError = (err: Error) => {
        toast({
          title: t('order.actions.error'),
          description: err.message,
          variant: 'destructive',
        });
      };

      try {
        switch (actionType) {
          case 'decline':
            await executeOrderAction({
              executeBackendSettlementAction: () =>
                ordersApi.executeSettlementAction({
                  orderID: orderId,
                  action: 'cancel',
                }),
              attemptBackendSettlementAction: canAttemptBackendSettlementAction,
              executeAction: txID =>
                ordersApi.confirmOrder({ orderID: orderId, decline: true, transactionID: txID }),
              onSuccess: () =>
                onSuccess(t('order.actions.declineSuccess'), t('order.actions.declineSuccessDesc')),
              onError,
            });
            break;
          case 'cancel':
            await executeOrderAction({
              executeBackendSettlementAction: () =>
                ordersApi.executeSettlementAction({
                  orderID: orderId,
                  action: 'cancel',
                }),
              attemptBackendSettlementAction: canAttemptBackendSettlementAction,
              executeAction: txID =>
                ordersApi.cancelOrder({ orderID: orderId, transactionID: txID }),
              onSuccess: () =>
                onSuccess(t('order.actions.cancelSuccess'), t('order.actions.cancelSuccessDesc')),
              onError,
            });
            break;
          case 'refund':
            if (displayOrder?.fiatPayment) {
              try {
                const fiat = displayOrder.fiatPayment;
                await fiatApi.refundPayment(fiat.provider, fiat.paymentID, refundParams);
                onSuccess(t('order.actions.refundSuccess'), t('order.actions.refundSuccessDesc'));
              } catch (err) {
                onError(err instanceof Error ? err : new Error(String(err)));
              }
            } else {
              await executeOrderAction({
                executeBackendSettlementAction: () =>
                  ordersApi.executeSettlementAction({
                    orderID: orderId,
                    action: 'cancel',
                  }),
                attemptBackendSettlementAction: canAttemptBackendSettlementAction,
                executeAction: txID =>
                  ordersApi.refundOrder({ orderID: orderId, transactionID: txID }),
                onSuccess: () =>
                  onSuccess(t('order.actions.refundSuccess'), t('order.actions.refundSuccessDesc')),
                onError,
              });
            }
            break;
          case 'claim':
            await executeOrderAction({
              executeAction: () => ordersApi.claimPayment(orderId),
              onSuccess: () =>
                onSuccess(t('order.actions.claimSuccess'), t('order.actions.claimSuccessDesc')),
              onError,
            });
            break;
          case 'acceptPayout':
            await executeOrderAction({
              executeAction: () => ordersApi.acceptDispute(orderId),
              onSuccess: () =>
                onSuccess(
                  t('order.actions.acceptPayoutSuccess'),
                  t('order.actions.acceptPayoutSuccessDesc')
                ),
              onError,
            });
            break;
          case 'complete':
            setShowReviewDialog(true);
            return true;
        }
      } catch {
        // Unexpected error not handled by onError
      } finally {
        setIsActionLoading(false);
      }
      return succeeded;
    },
    [
      displayOrder,
      executeOrderAction,
      orderId,
      refetch,
      t,
      toast,
      canAttemptBackendSettlementAction,
    ]
  );

  // --- Clipboard helpers ---

  const displayOrderId = displayOrder?.orderId ?? '';

  const copyOrderId = useCallback(async () => {
    if (!displayOrderId) {
      toast({ title: t('order.actions.orderIdUnavailable') });
      return;
    }
    try {
      await navigator.clipboard.writeText(displayOrderId);
      toast({ title: t('order.actions.orderIdCopied') });
    } catch {
      toast({
        title: t('order.actions.copyFailed'),
        description: t('order.actions.copyOrderIdManually'),
      });
    }
  }, [displayOrderId, toast, t]);

  const copyContract = useCallback(async () => {
    if (!coreOrder) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(coreOrder, null, 2));
      toast({ title: t('order.actions.contractCopied') });
    } catch {
      toast({ title: t('order.actions.copyFailed') });
    }
  }, [coreOrder, toast, t]);

  // --- Dialog props ---

  const handleAcceptOrderSuccess = useCallback(() => {
    setIsTransitioning(true);
    queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(orderId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.orders.sales() });
    queryClient.invalidateQueries({ queryKey: queryKeys.orders.purchases() });

    void refetch();
  }, [orderId, queryClient, refetch]);

  const acceptOrderProps = useMemo(
    () => ({
      orderId,
      blockchain: undefined,
      paymentCoin,
      onSuccess: handleAcceptOrderSuccess,
    }),
    [handleAcceptOrderSuccess, orderId, paymentCoin]
  );

  const shipOrderProps = useMemo(
    () => ({
      orderId,
      contractType: (coreOrder as OrderContractData)?.contract?.orderOpen?.listings?.[0]?.listing
        ?.metadata?.contractType,
      blockchain: (coreOrder as OrderContractData)?.contract?.orderOpen?.listings?.[0]?.listing
        ?.item?.blockchain as string | undefined,
      onSuccess: refetch,
    }),
    [orderId, coreOrder, refetch]
  );

  const sellerDigitalListingSlug = useMemo(
    () =>
      (coreOrder as OrderContractData)?.contract?.orderOpen?.listings?.[0]?.listing?.slug ||
      displayOrder?.slug ||
      '',
    [coreOrder, displayOrder?.slug]
  );

  const isSellerDigitalOrder =
    displayOrder?.userRole === 'seller' &&
    (shipOrderProps.contractType === CONTRACT_TYPES.DIGITAL_GOOD ||
      displayOrder?.contractType === CONTRACT_TYPES.DIGITAL_GOOD);

  const [sellerDigitalDeliveryState, setSellerDigitalDeliveryState] = useState<{
    loading: boolean;
    syncing: boolean;
    status: DigitalDeliveryStatus | null;
    error: string | null;
  }>({
    loading: false,
    syncing: false,
    status: null,
    error: null,
  });

  const [deliveryStatusVersion, setDeliveryStatusVersion] = useState(0);

  useEffect(() => {
    if (!isSellerDigitalOrder) {
      setSellerDigitalDeliveryState(prev =>
        prev.loading || prev.status || prev.error
          ? { loading: false, syncing: prev.syncing, status: null, error: null }
          : prev
      );
      return;
    }

    let cancelled = false;
    setSellerDigitalDeliveryState(prev => ({ ...prev, loading: true, error: null }));

    digitalAssetsApi
      .getDigitalDeliveryStatus(orderId)
      .then(status => {
        if (cancelled) return;
        setSellerDigitalDeliveryState(prev => ({
          ...prev,
          loading: false,
          status,
          error: null,
        }));
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setSellerDigitalDeliveryState(prev => ({
          ...prev,
          loading: false,
          status: null,
          error: err instanceof Error ? err.message : t('common.unknownError'),
        }));
      });

    return () => {
      cancelled = true;
    };
  }, [isSellerDigitalOrder, orderId, t, deliveryStatusVersion]);

  useEffect(() => {
    if (!isSellerDigitalOrder) return;
    const bump = () => setDeliveryStatusVersion(v => v + 1);
    const onVisible = () => {
      if (document.visibilityState === 'visible') bump();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('popstate', bump);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('popstate', bump);
    };
  }, [isSellerDigitalOrder]);

  const syncDigitalDelivery = useCallback(async (): Promise<boolean> => {
    const deliveryStatus = sellerDigitalDeliveryState.status;
    if (!isSellerDigitalOrder || deliveryStatus?.status !== 'delivered') {
      return false;
    }

    setSellerDigitalDeliveryState(prev => ({ ...prev, syncing: true }));
    try {
      const itemCount = Math.max(displayOrder?.items?.length || 0, 1);
      const result = await ordersApi.shipOrder({
        orderID: orderId,
        shipments: Array.from({ length: itemCount }, (_, itemIndex) => ({
          itemIndex,
          digitalDelivery: {
            url: `/v1/orders/${orderId}/digital-assets`,
          },
        })),
      });

      if (!result.success) {
        throw new Error(result.error || t('order.digitalDelivery.syncFailed'));
      }

      toast({
        title: t('order.digitalDelivery.syncSuccess'),
        description: t('order.digitalDelivery.syncSuccessDesc'),
      });
      setSellerDigitalDeliveryState(prev => ({
        ...prev,
        status: prev.status
          ? {
              ...prev.status,
              status: 'delivered',
              deliveryURL: prev.status.deliveryURL || `/v1/orders/${orderId}/digital-assets`,
              manualFallbackAllowed: false,
            }
          : prev.status,
      }));
      setTimeout(() => refetch(), 500);
      return true;
    } catch (err) {
      toast({
        title: t('order.actions.error'),
        description: err instanceof Error ? err.message : t('order.digitalDelivery.syncFailed'),
        variant: 'destructive',
      });
      return false;
    } finally {
      setSellerDigitalDeliveryState(prev => ({ ...prev, syncing: false }));
    }
  }, [
    displayOrder?.items?.length,
    isSellerDigitalOrder,
    orderId,
    refetch,
    sellerDigitalDeliveryState.status,
    t,
    toast,
  ]);

  const retryDigitalDelivery = useCallback(async (): Promise<boolean> => {
    const deliveryStatus = sellerDigitalDeliveryState.status;
    if (!isSellerDigitalOrder || deliveryStatus?.status !== 'ready') {
      return false;
    }

    setSellerDigitalDeliveryState(prev => ({ ...prev, syncing: true }));
    try {
      const status = await digitalAssetsApi.retryDigitalDelivery(orderId);
      setSellerDigitalDeliveryState(prev => ({
        ...prev,
        status,
        error: null,
      }));
      const delivered = status.status === 'delivered';
      toast({
        title: delivered
          ? t('order.digitalDelivery.retrySuccess')
          : status.status === 'manual_required'
            ? t('order.digitalDelivery.manualTitle')
            : t('order.digitalDelivery.pendingTitle'),
        description: delivered
          ? t('order.digitalDelivery.retrySuccessDesc')
          : status.status === 'manual_required'
            ? t('order.digitalDelivery.manualDesc')
            : t('order.digitalDelivery.pendingDesc'),
        variant: delivered ? undefined : 'destructive',
      });
      setTimeout(() => refetch(), 500);
      return delivered;
    } catch (err) {
      toast({
        title: t('order.digitalDelivery.retryFailed'),
        description: err instanceof Error ? err.message : t('order.digitalDelivery.retryFailed'),
        variant: 'destructive',
      });
      return false;
    } finally {
      setSellerDigitalDeliveryState(prev => ({ ...prev, syncing: false }));
    }
  }, [isSellerDigitalOrder, orderId, refetch, sellerDigitalDeliveryState.status, t, toast]);

  const refreshDeliveryStatus = useCallback(() => {
    setDeliveryStatusVersion(v => v + 1);
  }, []);

  const sellerDigitalDelivery = useMemo(() => {
    const deliveryStatus = sellerDigitalDeliveryState.status;
    const assetCount = deliveryStatus?.assetCount || 0;
    const hasPreconfiguredAssets =
      Boolean(deliveryStatus?.preconfiguredAssetHint) || assetCount > 0;
    const canSyncDelivery = deliveryStatus?.status === 'delivered';
    const canRetryDelivery = deliveryStatus?.status === 'ready' && hasPreconfiguredAssets;
    return {
      isDigitalOrder: Boolean(isSellerDigitalOrder),
      listingSlug: sellerDigitalListingSlug || deliveryStatus?.listingSlugs?.[0] || undefined,
      listingSlugs: deliveryStatus?.listingSlugs || [],
      isLoading: sellerDigitalDeliveryState.loading,
      isSyncing: sellerDigitalDeliveryState.syncing,
      assetCount,
      hasPreconfiguredAssets,
      manualFallbackAllowed: deliveryStatus?.manualFallbackAllowed === true,
      canSyncDelivery,
      canRetryDelivery,
      status: deliveryStatus?.status || null,
      error: sellerDigitalDeliveryState.error,
      syncDelivery: syncDigitalDelivery,
      retryDelivery: retryDigitalDelivery,
      refreshStatus: refreshDeliveryStatus,
    };
  }, [
    isSellerDigitalOrder,
    sellerDigitalDeliveryState.error,
    sellerDigitalDeliveryState.loading,
    sellerDigitalDeliveryState.status,
    sellerDigitalDeliveryState.syncing,
    sellerDigitalListingSlug,
    retryDigitalDelivery,
    syncDigitalDelivery,
    refreshDeliveryStatus,
  ]);

  return {
    displayOrder,
    coreOrder,
    latestSettlementAction,
    isLoading,
    error,
    refetch,
    currentUserPeerID,
    paymentCoin,
    counterparty,
    isActionLoading,
    isTransitioning,
    executeConfirmAction,
    showReviewDialog,
    reviewProductTitle,
    submitReviewAndComplete,
    skipReviewAndComplete,
    closeReviewDialog,
    copyOrderId,
    copyContract,
    acceptOrderProps,
    shipOrderProps,
    sellerDigitalDelivery,
  };
}
