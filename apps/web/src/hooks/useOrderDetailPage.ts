'use client';

import { useCallback, useState, useEffect, useMemo } from 'react';
import { useToast } from '@/components/ui/use-toast';
import {
  useOrderDetail,
  useUserStore,
  useI18n,
  ordersApi,
  onWebSocketMessage,
  useOrderAction,
  type WebSocketMessage,
} from '@mobazha/core';
import type { OrderConfirmType } from '@/components/Order';
import type { OrderChatMessage, OrderChatParticipant } from '@/components/Order';

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
    };
  };
}

export interface ReviewSubmitData {
  overall: number;
  review: string;
  anonymous: boolean;
}

export interface UseOrderDetailPageReturn {
  displayOrder: ReturnType<typeof useOrderDetail>['displayOrder'];
  coreOrder: ReturnType<typeof useOrderDetail>['coreOrder'];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  currentUserPeerID: string | null;

  paymentCoin: string | undefined;
  counterparty: { peerID?: string; name?: string; avatar?: string; location?: string } | null;
  chatParticipants: OrderChatParticipant[];

  isActionLoading: boolean;
  executeConfirmAction: (actionType: OrderConfirmType) => Promise<boolean>;

  showReviewDialog: boolean;
  reviewProductTitle: string;
  submitReviewAndComplete: (data: ReviewSubmitData) => Promise<void>;
  skipReviewAndComplete: () => Promise<void>;
  closeReviewDialog: () => void;

  copyOrderId: () => Promise<void>;
  copyContract: () => Promise<void>;

  chatMessages: OrderChatMessage[];
  sendMessage: (content: string) => Promise<void>;

  acceptOrderProps: {
    orderId: string;
    blockchain?: string;
    paymentCoin?: string;
    onSuccess: () => void;
  };
  fulfillOrderProps: {
    orderId: string;
    contractType?: string;
    blockchain?: string;
    onSuccess: () => void;
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

  const { displayOrder, coreOrder, isLoading, error, refetch } = useOrderDetail(
    orderId,
    viewingContext
  );

  const currentUser = useUserStore(state => state.profile);
  const currentUserPeerID = currentUser?.peerID || null;

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

  // --- Computed ---

  const paymentCoin =
    displayOrder?.paymentCoin || (coreOrder as OrderContractData)?.contract?.paymentSent?.coin;

  const counterparty = useMemo(() => {
    if (!displayOrder) return null;
    return displayOrder.userRole === 'buyer' ? displayOrder.vendor : displayOrder.buyer;
  }, [displayOrder]);

  const chatParticipants = useMemo<OrderChatParticipant[]>(() => {
    if (!displayOrder) return [];
    const list: OrderChatParticipant[] = [];
    if (displayOrder.vendor) {
      list.push({
        id: displayOrder.vendor.peerID || 'vendor',
        peerID: displayOrder.vendor.peerID || '',
        name: displayOrder.vendor.name || 'Seller',
        avatar: displayOrder.vendor.avatar,
        role: 'seller',
      });
    }
    if (displayOrder.buyer) {
      list.push({
        id: displayOrder.buyer.peerID || 'buyer',
        peerID: displayOrder.buyer.peerID || '',
        name: displayOrder.buyer.name || 'Buyer',
        avatar: displayOrder.buyer.avatar,
        role: 'buyer',
      });
    }
    if (displayOrder.moderator) {
      list.push({
        id: displayOrder.moderator.id || 'moderator',
        peerID: displayOrder.moderator.id || '',
        name: displayOrder.moderator.name || 'Moderator',
        avatar: displayOrder.moderator.avatar,
        role: 'moderator',
      });
    }
    return list;
  }, [displayOrder]);

  // --- Order action execution ---

  const { execute: executeOrderAction } = useOrderAction();
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [showReviewDialog, setShowReviewDialog] = useState(false);

  const reviewProductTitle = useMemo(() => {
    const orderData = coreOrder as OrderContractData | null;
    const listings = orderData?.contract?.orderOpen?.listings || [];
    return listings[0]?.listing?.slug || '';
  }, [coreOrder]);

  const doCompleteOrder = useCallback(
    async (reviewData?: { overall: number; review: string; anonymous: boolean }) => {
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

      try {
        const orderData = coreOrder as OrderContractData | null;
        const listings = orderData?.contract?.orderOpen?.listings || [];
        const overall = reviewData?.overall || 5;
        const reviewText = reviewData?.review || '';
        const anonymous = reviewData?.anonymous || false;

        const ratings = listings.map((item: { listing?: { slug?: string } }) => ({
          slug: item.listing?.slug || '',
          overall,
          quality: overall,
          description: overall,
          deliverySpeed: overall,
          customerService: overall,
          review: reviewText,
        }));

        await executeOrderAction({
          paymentCoin,
          getInstructions: addr =>
            ordersApi.getCompleteInstructions({ orderID: orderId, initiatorAddress: addr }),
          executeAction: txID =>
            ordersApi.completeOrder({ orderID: orderId, txID, ratings, anonymous }),
          onSuccess: () =>
            onSuccess(t('order.actions.completeSuccess'), t('order.actions.completeSuccessDesc')),
          onError,
        });
      } catch {
        // Unexpected error not handled by onError
      } finally {
        setIsActionLoading(false);
        setShowReviewDialog(false);
      }
    },
    [coreOrder, executeOrderAction, orderId, paymentCoin, refetch, t, toast]
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
    async (actionType: OrderConfirmType): Promise<boolean> => {
      setIsActionLoading(true);
      let succeeded = false;

      const onSuccess = (title: string, desc: string) => {
        succeeded = true;
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
              paymentCoin,
              getInstructions: addr =>
                ordersApi.getConfirmInstructions({
                  orderID: orderId,
                  reject: true,
                  initiatorAddress: addr,
                }),
              executeAction: txID =>
                ordersApi.confirmOrder({ orderID: orderId, reject: true, transactionID: txID }),
              onSuccess: () =>
                onSuccess(t('order.actions.declineSuccess'), t('order.actions.declineSuccessDesc')),
              onError,
            });
            break;
          case 'cancel':
            await executeOrderAction({
              paymentCoin,
              getInstructions: addr =>
                ordersApi.getCancelInstructions({ orderID: orderId, initiatorAddress: addr }),
              executeAction: txID =>
                ordersApi.cancelOrder({ orderID: orderId, transactionID: txID }),
              onSuccess: () =>
                onSuccess(t('order.actions.cancelSuccess'), t('order.actions.cancelSuccessDesc')),
              onError,
            });
            break;
          case 'refund':
            await executeOrderAction({
              paymentCoin,
              getInstructions: addr =>
                ordersApi.getRefundInstructions({ orderID: orderId, initiatorAddress: addr }),
              executeAction: txID =>
                ordersApi.refundOrder({ orderID: orderId, transactionID: txID }),
              onSuccess: () =>
                onSuccess(t('order.actions.refundSuccess'), t('order.actions.refundSuccessDesc')),
              onError,
            });
            break;
          case 'claim':
            await executeOrderAction({
              paymentCoin,
              executeAction: () => ordersApi.claimPayment(orderId),
              onSuccess: () =>
                onSuccess(t('order.actions.claimSuccess'), t('order.actions.claimSuccessDesc')),
              onError,
            });
            break;
          case 'acceptPayout':
            await executeOrderAction({
              paymentCoin,
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
    [coreOrder, executeOrderAction, orderId, paymentCoin, refetch, t, toast]
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

  // --- Chat (mock for now, Matrix integration later) ---

  const [chatMessages, setChatMessages] = useState<OrderChatMessage[]>([]);
  const sendMessage = useCallback(
    async (content: string) => {
      setChatMessages(prev => [
        ...prev,
        {
          id: `msg-${Date.now()}`,
          content,
          senderId: currentUserPeerID || 'unknown',
          timestamp: new Date().toISOString(),
          status: 'sent',
        },
      ]);
    },
    [currentUserPeerID]
  );

  // --- Dialog props ---

  const acceptOrderProps = useMemo(
    () => ({
      orderId,
      blockchain: (coreOrder as OrderContractData)?.contract?.orderOpen?.listings?.[0]?.listing
        ?.item?.blockchain as string | undefined,
      paymentCoin: (coreOrder as OrderContractData)?.contract?.paymentSent?.coin,
      onSuccess: refetch,
    }),
    [orderId, coreOrder, refetch]
  );

  const fulfillOrderProps = useMemo(
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

  return {
    displayOrder,
    coreOrder,
    isLoading,
    error,
    refetch,
    currentUserPeerID,
    paymentCoin,
    counterparty,
    chatParticipants,
    isActionLoading,
    executeConfirmAction,
    showReviewDialog,
    reviewProductTitle,
    submitReviewAndComplete,
    skipReviewAndComplete,
    closeReviewDialog,
    copyOrderId,
    copyContract,
    chatMessages,
    sendMessage,
    acceptOrderProps,
    fulfillOrderProps,
  };
}
