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
  orderUsesMonitoredBackendSettlement,
  orderUsesCancelableBackendSettlement,
  buildAcceptDisputeSettlementContext,
  type AcceptPayoutPhase,
  type CompletePhase,
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

export type { CompletePhase, AcceptPayoutPhase } from '@mobazha/core';

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
  completePhase: CompletePhase;
  acceptPayoutPhase: AcceptPayoutPhase;
  isModeratedOrder: boolean;
  executeConfirmAction: (
    actionType: OrderConfirmType,
    refundParams?: { amount?: number; currency?: string; reason?: string }
  ) => Promise<boolean>;

  showAcceptPayoutDialog: boolean;
  openAcceptPayoutDialog: () => void;
  closeAcceptPayoutDialog: () => void;
  confirmAcceptPayout: () => Promise<boolean>;

  showConfirmReceiptDialog: boolean;
  openConfirmReceiptDialog: () => void;
  closeConfirmReceiptDialog: () => void;
  confirmReceipt: () => Promise<void>;

  showReviewDialog: boolean;
  openReviewDialog: () => void;
  reviewProductTitle: string;
  submitRating: (data: ReviewSubmitData) => Promise<void>;
  closeReviewDialog: () => void;

  copyOrderId: () => Promise<void>;
  copyContract: () => Promise<void>;

  acceptOrderProps: {
    orderId: string;
    blockchain?: string;
    paymentCoin?: string;
    paymentEscrowType?: string;
    paymentProductMode?: string;
    contractType?: string;
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
  const [showConfirmReceiptDialog, setShowConfirmReceiptDialog] = useState(false);
  const [showAcceptPayoutDialog, setShowAcceptPayoutDialog] = useState(false);
  const [completePhase, setCompletePhase] = useState<CompletePhase>('idle');
  const [acceptPayoutPhase, setAcceptPayoutPhase] = useState<AcceptPayoutPhase>('idle');

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

  // Seller fallback: poll for buyer rating when WS notification is missed
  useEffect(() => {
    if (displayOrder?.userRole !== 'seller') return;
    if (displayOrder?.status !== 'completed') return;
    if (displayOrder?.buyerRating) return;

    let attempts = 0;
    const maxAttempts = 20;
    const timer = window.setInterval(() => {
      attempts += 1;
      refetch();
      if (attempts >= maxAttempts) {
        window.clearInterval(timer);
      }
    }, 15000);

    return () => {
      window.clearInterval(timer);
    };
  }, [displayOrder?.buyerRating, displayOrder?.status, displayOrder?.userRole, refetch]);

  // --- Computed ---

  const paymentCoin =
    displayOrder?.paymentCoin || (coreOrder as OrderContractData)?.contract?.paymentSent?.coin;
  const paymentEscrowType =
    displayOrder?.paymentEscrowType ||
    (coreOrder as OrderContractData)?.contract?.paymentSent?.settlementSpec?.escrowType;
  const paymentProductMode = displayOrder?.paymentProductMode;

  const isModeratedOrder = useMemo(
    () =>
      !!displayOrder &&
      (displayOrder.isModerated ||
        !!displayOrder.moderator ||
        displayOrder.protection?.protectionLevel === 'full'),
    [displayOrder]
  );

  const usesMonitoredBackendSettlement = useMemo(
    () =>
      orderUsesMonitoredBackendSettlement({
        isModerated: isModeratedOrder,
        escrowType: paymentEscrowType,
        paymentCoin,
      }),
    [isModeratedOrder, paymentEscrowType, paymentCoin]
  );

  const usesCancelableBackendSettlement = useMemo(
    () =>
      orderUsesCancelableBackendSettlement({
        paymentProductMode,
        escrowType: paymentEscrowType,
        paymentCoin,
      }),
    [paymentProductMode, paymentEscrowType, paymentCoin]
  );

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

  const clearCompletePhaseTimers = useCallback((timers: number[]) => {
    timers.forEach(timer => window.clearTimeout(timer));
  }, []);

  const startCompletePhaseProgress = useCallback(
    (options: {
      moderated: boolean;
      rateOnly: boolean;
      deferCompletingUntilReleaseDone?: boolean;
    }) => {
      const timers: number[] = [];
      const { moderated, rateOnly, deferCompletingUntilReleaseDone = false } = options;

      if (rateOnly) {
        setCompletePhase('syncing-rating');
        return timers;
      }

      setCompletePhase('confirming');

      if (moderated) {
        timers.push(
          window.setTimeout(() => {
            setCompletePhase(current => (current === 'idle' ? current : 'releasing'));
          }, 400) as unknown as number
        );
        if (!deferCompletingUntilReleaseDone) {
          timers.push(
            window.setTimeout(() => {
              setCompletePhase(current =>
                current === 'releasing' || current === 'confirming' ? 'completing' : current
              );
            }, 3500) as unknown as number
          );
        }
      } else {
        timers.push(
          window.setTimeout(() => {
            setCompletePhase(current => (current === 'idle' ? current : 'completing'));
          }, 600) as unknown as number
        );
      }

      return timers;
    },
    []
  );

  const startAcceptPayoutPhaseProgress = useCallback((usesBackendSettlement: boolean) => {
    setAcceptPayoutPhase(usesBackendSettlement ? 'releasing' : 'accepting');
    return [] as number[];
  }, []);

  const reviewProductTitle = useMemo(() => {
    const orderData = coreOrder as OrderContractData | null;
    const listings = orderData?.contract?.orderOpen?.listings || [];
    return listings[0]?.listing?.slug || '';
  }, [coreOrder]);

  const buildRatings = useCallback(
    (reviewData: ReviewSubmitData) => {
      const orderData = coreOrder as OrderContractData | null;
      const listings = orderData?.contract?.orderOpen?.listings || [];
      return listings.map((item: { listing?: { slug?: string } }) => ({
        slug: item.listing?.slug || '',
        overall: reviewData.overall || 5,
        review: reviewData.review || '',
        imageHashes: reviewData.imageHashes,
      }));
    },
    [coreOrder]
  );

  const confirmReceipt = useCallback(async () => {
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

    const usesBackendSettlementComplete = usesMonitoredBackendSettlement;

    const phaseTimers = startCompletePhaseProgress({
      moderated: isModeratedOrder,
      rateOnly: false,
      deferCompletingUntilReleaseDone: usesBackendSettlementComplete,
    });

    let succeeded = false;

    try {
      await executeOrderAction({
        executeBackendSettlementAction: async () => {
          const settlement = await ordersApi.executeSettlementAction({
            orderID: orderId,
            action: 'complete',
          });
          let resolved = settlement;
          if (settlement.mode === 'submitted' && settlement.actionId && !settlement.txHash) {
            resolved = await ordersApi.awaitSettlementActionTxHash({
              orderID: orderId,
              action: 'complete',
              actionId: settlement.actionId,
            });
          }
          if (usesBackendSettlementComplete) {
            setCompletePhase('completing');
          }
          return resolved;
        },
        attemptBackendSettlementAction: usesBackendSettlementComplete,
        executeAction: txID => ordersApi.completeOrder({ orderID: orderId, txID }),
        onSuccess: () => {
          succeeded = true;
          onSuccess(t('order.actions.completeSuccess'), t('order.actions.completeSuccessDesc'));
        },
        onError,
      });
    } catch {
      // useOrderAction already surfaces the error via onError; keep the dialog open.
    } finally {
      clearCompletePhaseTimers(phaseTimers);
      setCompletePhase('idle');
      setIsActionLoading(false);
      if (succeeded) {
        setShowConfirmReceiptDialog(false);
      }
    }
  }, [
    clearCompletePhaseTimers,
    executeOrderAction,
    usesMonitoredBackendSettlement,
    orderId,
    refetch,
    startCompletePhaseProgress,
    t,
    toast,
  ]);

  const submitRating = useCallback(
    async (reviewData: ReviewSubmitData) => {
      if (displayOrder?.status !== 'completed') {
        toast({
          title: t('order.actions.error'),
          description: t('order.actions.operationFailed'),
          variant: 'destructive',
        });
        return;
      }

      setIsActionLoading(true);

      const onSuccess = (title: string, desc: string) => {
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

      const phaseTimers = startCompletePhaseProgress({
        moderated: false,
        rateOnly: true,
      });

      let succeeded = false;

      try {
        const ratings = buildRatings(reviewData);
        await ordersApi.rateOrder({
          orderID: orderId,
          ratings,
          anonymous: reviewData.anonymous,
        });
        succeeded = true;
        onSuccess(t('order.actions.rateSuccess'), t('order.actions.rateSuccessDesc'));
      } catch (err) {
        onError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        clearCompletePhaseTimers(phaseTimers);
        setCompletePhase('idle');
        setIsActionLoading(false);
        if (succeeded) {
          setShowReviewDialog(false);
        }
      }
    },
    [
      buildRatings,
      clearCompletePhaseTimers,
      displayOrder?.status,
      orderId,
      refetch,
      startCompletePhaseProgress,
      t,
      toast,
    ]
  );

  const openConfirmReceiptDialog = useCallback(() => {
    setShowConfirmReceiptDialog(true);
  }, []);

  const closeConfirmReceiptDialog = useCallback(() => {
    if (isActionLoading) return;
    setShowConfirmReceiptDialog(false);
  }, [isActionLoading]);

  const openAcceptPayoutDialog = useCallback(() => {
    if (isActionLoading) return;
    setShowAcceptPayoutDialog(true);
  }, [isActionLoading]);

  const closeAcceptPayoutDialog = useCallback(() => {
    if (isActionLoading) return;
    setShowAcceptPayoutDialog(false);
  }, [isActionLoading]);

  const confirmAcceptPayout = useCallback(async (): Promise<boolean> => {
    if (isActionLoading) return false;

    setIsActionLoading(true);

    const payoutTimers = startAcceptPayoutPhaseProgress(usesMonitoredBackendSettlement);
    let succeeded = false;

    try {
      const settlementContext = buildAcceptDisputeSettlementContext({
        paymentCoin,
        isModerated: isModeratedOrder,
        escrowType: paymentEscrowType,
      });

      const result = await ordersApi.acceptDisputeWithSettlement(orderId, settlementContext, {
        onSettlementComplete: () => {
          if (usesMonitoredBackendSettlement) {
            setAcceptPayoutPhase('accepting');
          }
        },
      });

      if (result.success) {
        succeeded = true;
        setIsTransitioning(true);
        toast({
          title: t('order.actions.acceptPayoutSuccess'),
          description: t('order.actions.acceptPayoutSuccessDesc'),
        });
        setTimeout(() => refetch(), 500);
      } else {
        toast({
          title: t('order.actions.error'),
          description: result.error || t('order.actions.operationFailed'),
          variant: 'destructive',
        });
      }
    } catch (err) {
      toast({
        title: t('order.actions.error'),
        description: err instanceof Error ? err.message : t('order.actions.operationFailed'),
        variant: 'destructive',
      });
    } finally {
      clearCompletePhaseTimers(payoutTimers);
      setAcceptPayoutPhase('idle');
      setIsActionLoading(false);
      if (succeeded) {
        setShowAcceptPayoutDialog(false);
      }
    }

    return succeeded;
  }, [
    clearCompletePhaseTimers,
    isActionLoading,
    isModeratedOrder,
    orderId,
    paymentCoin,
    paymentEscrowType,
    refetch,
    startAcceptPayoutPhaseProgress,
    t,
    toast,
    usesMonitoredBackendSettlement,
  ]);

  const openReviewDialog = useCallback(() => {
    setShowReviewDialog(true);
  }, []);

  const closeReviewDialog = useCallback(() => {
    if (isActionLoading) return;
    setShowReviewDialog(false);
  }, [isActionLoading]);

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
              attemptBackendSettlementAction: usesCancelableBackendSettlement,
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
              attemptBackendSettlementAction: usesCancelableBackendSettlement,
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
                attemptBackendSettlementAction: usesCancelableBackendSettlement,
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
      usesMonitoredBackendSettlement,
      usesCancelableBackendSettlement,
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
      paymentEscrowType,
      paymentProductMode,
      contractType: (coreOrder as OrderContractData)?.contract?.orderOpen?.listings?.[0]?.listing
        ?.metadata?.contractType,
      onSuccess: handleAcceptOrderSuccess,
    }),
    [
      handleAcceptOrderSuccess,
      orderId,
      paymentCoin,
      paymentEscrowType,
      paymentProductMode,
      coreOrder,
    ]
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
  const digitalDeliveryOrderStateRef = useRef<string | undefined>(undefined);

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
    const nextOrderState = coreOrder?.state;
    if (!isSellerDigitalOrder) {
      digitalDeliveryOrderStateRef.current = nextOrderState;
      return;
    }
    if (!nextOrderState) {
      return;
    }
    if (
      digitalDeliveryOrderStateRef.current &&
      digitalDeliveryOrderStateRef.current !== nextOrderState
    ) {
      setDeliveryStatusVersion(v => v + 1);
    }
    digitalDeliveryOrderStateRef.current = nextOrderState;
  }, [coreOrder?.state, isSellerDigitalOrder]);

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
    const orderState = coreOrder?.state;
    const canRetryAfterPayment =
      orderState != null &&
      !['AWAITING_PAYMENT', 'AWAITING_PAYMENT_VERIFICATION', 'PENDING'].includes(orderState);
    const canRetryDelivery =
      deliveryStatus?.status === 'ready' && hasPreconfiguredAssets && canRetryAfterPayment;
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
    coreOrder?.state,
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
    completePhase,
    acceptPayoutPhase,
    isModeratedOrder,
    executeConfirmAction,
    showAcceptPayoutDialog,
    openAcceptPayoutDialog,
    closeAcceptPayoutDialog,
    confirmAcceptPayout,
    showConfirmReceiptDialog,
    openConfirmReceiptDialog,
    closeConfirmReceiptDialog,
    confirmReceipt,
    showReviewDialog,
    openReviewDialog,
    reviewProductTitle,
    submitRating,
    closeReviewDialog,
    copyOrderId,
    copyContract,
    acceptOrderProps,
    shipOrderProps,
    sellerDigitalDelivery,
  };
}
