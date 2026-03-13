'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Header, Footer } from '@/components';
import { Container } from '@/components/layouts';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton-compat';
import { Copy } from 'lucide-react';
import {
  useI18n,
  isOrderFulfilled,
  type OrderAction,
  type UserRole as CoreUserRole,
} from '@mobazha/core';
import { useOrderDetailPage } from '@/hooks/useOrderDetailPage';
import {
  OrderFooter,
  OrderProgressBar,
  OrderChat,
  AcceptOrderDialog,
  FulfillOrderDialog,
  OrderConfirmDialog,
  WriteReviewDialog,
  type OrderConfirmType,
} from '@/components/Order';
import { FiatRefundDialog } from './FiatRefundDialog';
import {
  OrderProductCard,
  OrderSummaryCard,
  OrderPaymentCard,
  OrderShippingCard,
  OrderTimelineCard,
  OrderCounterpartyCard,
  OrderDisputeBanner,
  OrderMemoCard,
  getProgressBarState,
  getStatusLabel,
} from '@/components/Order/cards';

export interface OrderDetailDesktopProps {
  orderId: string;
  viewingContext?: 'sale' | 'purchase';
}

export function OrderDetailDesktop({ orderId, viewingContext }: OrderDetailDesktopProps) {
  const router = useRouter();
  const { t } = useI18n();

  const {
    displayOrder,
    coreOrder,
    isLoading,
    error,
    refetch,
    currentUserPeerID,
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
  } = useOrderDetailPage(orderId, viewingContext);

  // --- UI-only state ---
  const [confirmDialog, setConfirmDialog] = useState<OrderConfirmType | null>(null);
  const [showFiatRefundDialog, setShowFiatRefundDialog] = useState(false);
  const [showAcceptDialog, setShowAcceptDialog] = useState(false);
  const [showFulfillDialog, setShowFulfillDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<'summary' | 'discussion' | 'contract'>('summary');

  // --- Computed ---
  const progressState = useMemo(() => {
    if (!displayOrder) return { states: [], currentState: 0, disputeState: 0 };
    return getProgressBarState(
      displayOrder.status,
      t,
      !!displayOrder.dispute,
      displayOrder.dispute?.status === 'resolved'
    );
  }, [displayOrder, t]);

  const statusLabel = useMemo(() => {
    if (!displayOrder) return '';
    return getStatusLabel(displayOrder.status, t);
  }, [displayOrder, t]);

  // --- OrderFooter action handler ---
  const handleOrderAction = useCallback(
    (action: OrderAction) => {
      switch (action) {
        case 'Pay':
          router.push(`/payment?orderID=${orderId}`);
          break;
        case 'Cancel':
          setConfirmDialog('cancel');
          break;
        case 'Complete':
          executeConfirmAction('complete');
          break;
        case 'Accept':
          setShowAcceptDialog(true);
          break;
        case 'Decline':
          setConfirmDialog('decline');
          break;
        case 'Fulfill':
          setShowFulfillDialog(true);
          break;
        case 'Refund':
          if (displayOrder?.fiatPayment) {
            setShowFiatRefundDialog(true);
          } else {
            setConfirmDialog('refund');
          }
          break;
        case 'Claim':
          setConfirmDialog('claim');
          break;
        case 'AcceptPayout':
          setConfirmDialog('acceptPayout');
          break;
        case 'Dispute':
          break;
        case 'WriteReview':
          break;
      }
    },
    [router, orderId, executeConfirmAction, displayOrder]
  );

  const handleFiatRefund = useCallback(
    async (params: { amount?: number; currency?: string; reason?: string }) => {
      setShowFiatRefundDialog(false);
      await executeConfirmAction('refund', params);
    },
    [executeConfirmAction]
  );

  const handleConfirmAction = useCallback(async () => {
    if (!confirmDialog) return;
    const actionType = confirmDialog;
    setConfirmDialog(null);
    await executeConfirmAction(actionType);
  }, [confirmDialog, executeConfirmAction]);

  // --- Loading state ---
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="py-8">
          <Container size="xl">
            <Skeleton variant="text" width={100} height={20} className="mb-4" />
            <Card className="mb-6 p-6">
              <Skeleton variant="text" width="40%" height={32} className="mb-4" />
              <Skeleton variant="rounded" width="100%" height={60} className="my-6 mx-8" />
              {[1, 2, 3].map(i => (
                <div key={i} className="flex gap-3 mb-4">
                  <Skeleton variant="circular" width={16} height={16} />
                  <div className="flex-1">
                    <Skeleton variant="text" width="60%" height={18} />
                    <Skeleton variant="text" width="30%" height={14} className="mt-1" />
                  </div>
                </div>
              ))}
            </Card>
          </Container>
        </main>
        <Footer />
      </div>
    );
  }

  // --- Error state ---
  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <Container className="py-8">
          <Card className="py-16 text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-error/15 flex items-center justify-center">
              <svg
                className="w-10 h-10 text-error"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">
              {t('order.loadOrderFailed')}
            </h2>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => refetch()}>{t('order.tryAgain')}</Button>
          </Card>
        </Container>
        <Footer />
      </div>
    );
  }

  if (!displayOrder) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <Container className="py-8">
          <Card className="py-16 text-center">
            <h2 className="text-xl font-semibold text-foreground mb-2">
              {t('order.orderNotFound')}
            </h2>
            <p className="text-muted-foreground mb-4">{t('order.orderNotFoundMessage')}</p>
            <Button onClick={() => router.push('/orders')}>{t('order.backToOrders')}</Button>
          </Card>
        </Container>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="py-8">
        <Container size="xl">
          {/* Back button */}
          <button
            onClick={() => router.back()}
            className="group flex items-center gap-2 text-muted-foreground hover:text-primary mb-4 text-sm transition-colors"
          >
            <div className="w-6 h-6 rounded-full bg-muted/50 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </div>
            {t('order.backToOrders')}
          </button>

          {/* Main content card */}
          <Card className="mb-6 p-6 border border-border/60 shadow-sm overflow-hidden">
            {/* Order ID */}
            <div className="flex items-start gap-2 mb-3">
              <h1 className="text-sm font-medium text-muted-foreground flex-shrink-0">
                {t('order.orderIdLabel')}
              </h1>
              <span
                className="text-sm font-mono text-foreground break-all leading-relaxed"
                title={displayOrder.orderId}
              >
                {displayOrder.orderId}
              </span>
              <button
                onClick={copyOrderId}
                className="text-primary hover:text-primary/80 text-xs font-medium flex items-center gap-1 flex-shrink-0"
              >
                <Copy className="w-3 h-3" />
                <span>{t('common.copy')}</span>
              </button>
            </div>

            {/* Tab navigation */}
            <div className="border-b border-border mb-4">
              <div className="flex gap-6">
                {(['summary', 'discussion', 'contract'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`pb-2.5 text-sm font-medium transition-colors relative ${
                      activeTab === tab
                        ? 'text-primary'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {t(`order.tabs.${tab}`)}
                    {activeTab === tab && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab content */}
            {activeTab === 'summary' && (
              <div>
                <OrderProductCard displayOrder={displayOrder} className="mb-4" />
                <OrderSummaryCard
                  displayOrder={displayOrder}
                  statusLabel={statusLabel}
                  className="mb-4"
                />

                {/* Progress bar */}
                <div className="mt-4 mb-6 px-8">
                  <OrderProgressBar
                    states={progressState.states}
                    currentState={progressState.currentState}
                    disputeState={progressState.disputeState}
                  />
                </div>

                <OrderDisputeBanner
                  displayOrder={displayOrder}
                  onOpenDispute={() => handleOrderAction('Dispute')}
                />

                <OrderTimelineCard
                  displayOrder={displayOrder}
                  coreOrder={coreOrder}
                  className="mb-4"
                />
                <OrderPaymentCard
                  displayOrder={displayOrder}
                  coreOrder={coreOrder}
                  className="mb-4"
                />
                <OrderMemoCard displayOrder={displayOrder} className="mb-4" />
                <OrderShippingCard displayOrder={displayOrder} />
              </div>
            )}

            {activeTab === 'discussion' && (
              <OrderChat
                orderId={orderId}
                participants={chatParticipants}
                messages={chatMessages}
                currentUserId={currentUserPeerID || ''}
                onSendMessage={sendMessage}
                className="h-[calc(100vh-400px)] min-h-[400px]"
              />
            )}

            {activeTab === 'contract' && (
              <div>
                <pre className="text-[12px] leading-[18px] font-mono text-foreground whitespace-pre-wrap break-all p-4 bg-muted/20 rounded-lg">
                  {coreOrder ? JSON.stringify(coreOrder, null, 2) : t('common.noData')}
                </pre>
                <Button onClick={copyContract} variant="outline" size="sm" className="mt-3 gap-2">
                  <Copy className="w-3.5 h-3.5" />
                  {t('order.actions.copyToClipboard')}
                </Button>
              </div>
            )}
          </Card>

          {/* Participants grid */}
          <OrderCounterpartyCard displayOrder={displayOrder} variant="full" />

          {/* Spacer for fixed footer */}
          <div className="h-16" />
        </Container>
      </main>

      {/* Fixed action footer */}
      <OrderFooter
        orderState={coreOrder?.state || 'PENDING'}
        userRole={displayOrder.userRole as CoreUserRole}
        timestamp={displayOrder.createdAt}
        isModerated={!!displayOrder.moderator}
        isFulfilled={coreOrder ? isOrderFulfilled(coreOrder) : false}
        paymentMethod={coreOrder?.contract?.paymentSent?.method?.toString()}
        totalAmount={displayOrder.total}
        currency={displayOrder.currency}
        paymentCoin={coreOrder?.contract?.paymentSent?.coin}
        onAction={handleOrderAction}
      />

      {/* Dialogs */}
      {confirmDialog && (
        <OrderConfirmDialog
          open={!!confirmDialog}
          onOpenChange={open => !open && setConfirmDialog(null)}
          type={confirmDialog}
          onConfirm={handleConfirmAction}
          isLoading={isActionLoading}
        />
      )}

      {displayOrder?.fiatPayment && (
        <FiatRefundDialog
          open={showFiatRefundDialog}
          onOpenChange={setShowFiatRefundDialog}
          onConfirm={handleFiatRefund}
          isLoading={isActionLoading}
          totalAmount={displayOrder.pricingAmount}
          currency={displayOrder.pricingCurrency}
        />
      )}

      <AcceptOrderDialog
        open={showAcceptDialog}
        onOpenChange={setShowAcceptDialog}
        orderId={acceptOrderProps.orderId}
        blockchain={acceptOrderProps.blockchain}
        paymentCoin={acceptOrderProps.paymentCoin}
        onSuccess={acceptOrderProps.onSuccess}
      />

      <FulfillOrderDialog
        open={showFulfillDialog}
        onOpenChange={setShowFulfillDialog}
        orderId={fulfillOrderProps.orderId}
        contractType={fulfillOrderProps.contractType}
        blockchain={fulfillOrderProps.blockchain}
        onSuccess={fulfillOrderProps.onSuccess}
      />

      <WriteReviewDialog
        open={showReviewDialog}
        productTitle={reviewProductTitle}
        onSubmit={submitReviewAndComplete}
        onSkip={skipReviewAndComplete}
        onClose={closeReviewDialog}
        isSubmitting={isActionLoading}
      />

      <Footer />
    </div>
  );
}
