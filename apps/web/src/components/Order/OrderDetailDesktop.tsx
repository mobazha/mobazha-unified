'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Header, Footer } from '@/components';
import { Container } from '@/components/layouts';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton-compat';
import { Copy, Printer } from 'lucide-react';
import {
  useI18n,
  isOrderShipped,
  ordersApi,
  disputesApi,
  useFeature,
  type OrderAction,
  type UserRole as CoreUserRole,
} from '@mobazha/core';
import { useOrderDetailPage } from '@/hooks/useOrderDetailPage';
import { useToast } from '@/components/ui/use-toast';
import {
  OrderFooter,
  OrderChat,
  AcceptOrderDialog,
  ShipOrderDialog,
  OrderConfirmDialog,
  WriteReviewDialog,
  type OrderConfirmType,
} from '@/components/Order';
import { FiatRefundDialog } from './FiatRefundDialog';
import { DisputeModal } from '@/components/Order/modals/DisputeModal';
import { PackingSlipDialog } from '@/components/Order/PackingSlipDialog';
import {
  OrderProductCard,
  OrderSummaryCard,
  OrderPaymentCard,
  OrderShippingCard,
  OrderTimelineCard,
  OrderCounterpartyCard,
  OrderDisputeBanner,
  FiatDisputeBanner,
  OrderMemoCard,
  OrderStatusCard,
  getStatusLabel,
} from '@/components/Order/cards';
import {
  OrderProtectionStatus,
  type OrderProtectionStatusProps,
} from '@/components/Order/cards/OrderProtectionStatus';
import { RatingInviteBanner } from '@/components/Order/cards/RatingInviteBanner';
import { AfterSaleDisputeCard } from '@/components/Order/cards/AfterSaleDisputeCard';
import { FulfillmentStatusCard } from '@/components/Order/cards/FulfillmentStatusCard';

export interface OrderDetailDesktopProps {
  orderId: string;
  viewingContext?: 'sale' | 'purchase';
}

export function OrderDetailDesktop({ orderId, viewingContext }: OrderDetailDesktopProps) {
  const router = useRouter();
  const { t } = useI18n();
  const { toast } = useToast();
  const supplyChainEnabled = useFeature('supplyChainEnabled');

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
    shipOrderProps,
  } = useOrderDetailPage(orderId, viewingContext);

  // --- UI-only state ---
  const [confirmDialog, setConfirmDialog] = useState<OrderConfirmType | null>(null);
  const [showFiatRefundDialog, setShowFiatRefundDialog] = useState(false);
  const [showAcceptDialog, setShowAcceptDialog] = useState(false);
  const [showShipDialog, setShowShipDialog] = useState(false);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [isAfterSaleDispute, setIsAfterSaleDispute] = useState(false);
  const [isDisputeLoading, setIsDisputeLoading] = useState(false);
  const [showPackingSlip, setShowPackingSlip] = useState(false);
  const [activeTab, setActiveTab] = useState<'summary' | 'discussion' | 'contract'>('summary');

  // --- Computed ---
  const statusLabel = useMemo(() => {
    if (!displayOrder) return '';
    return getStatusLabel(displayOrder.status, t);
  }, [displayOrder, t]);

  const isPrePayment = useMemo(() => displayOrder?.status === 'awaiting_payment', [displayOrder]);

  const protectionStage = useMemo<OrderProtectionStatusProps['stage'] | null>(() => {
    if (!displayOrder?.protection) return null;
    return displayOrder.protection.stage as OrderProtectionStatusProps['stage'];
  }, [displayOrder]);

  const handleExtendProtection = useCallback(async () => {
    try {
      await ordersApi.extendProtection(orderId);
      toast({ description: t('trust.protection.extended') });
      refetch();
    } catch (err) {
      toast({ variant: 'destructive', description: String(err) });
    }
  }, [orderId, refetch, t, toast]);

  const showRatingInvite = useMemo(
    () =>
      displayOrder?.userRole === 'buyer' &&
      displayOrder?.status === 'completed' &&
      !displayOrder?.hasRated,
    [displayOrder]
  );

  const hasAfterSaleDispute = !!displayOrder?.afterSaleDispute;

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
        case 'Ship':
          setShowShipDialog(true);
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
          setIsAfterSaleDispute(false);
          setShowDisputeModal(true);
          break;
        case 'AfterSaleDispute':
          setIsAfterSaleDispute(true);
          setShowDisputeModal(true);
          break;
        case 'WriteReview':
          executeConfirmAction('complete');
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

  const handleDisputeSubmit = useCallback(
    async (claim: string, evidenceHashes?: string[]) => {
      setIsDisputeLoading(true);
      try {
        await ordersApi.openDispute(orderId, claim, evidenceHashes);
        setShowDisputeModal(false);
        toast({
          title: t('order.disputeOpened'),
          description: t('order.disputeOpenedSuccess'),
        });
        setTimeout(() => refetch(), 500);
      } catch (error) {
        toast({
          title: t('order.actions.error'),
          description: (error as Error).message,
          variant: 'destructive',
        });
      } finally {
        setIsDisputeLoading(false);
      }
    },
    [orderId, refetch, t, toast]
  );

  const handleAfterSaleDisputeSubmit = useCallback(
    async (reason: string, description: string) => {
      setIsDisputeLoading(true);
      try {
        await disputesApi.openAfterSaleDispute(orderId, reason, description);
        setShowDisputeModal(false);
        toast({
          title: t('order.disputeOpened'),
          description: t('order.afterSaleDisputeSuccess'),
        });
        setTimeout(() => refetch(), 500);
      } catch (error) {
        toast({
          title: t('order.actions.error'),
          description: (error as Error).message,
          variant: 'destructive',
        });
      } finally {
        setIsDisputeLoading(false);
      }
    },
    [orderId, refetch, t, toast]
  );

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
            aria-label={t('order.backToOrders')}
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
                className="text-sm font-mono text-foreground leading-relaxed"
                title={displayOrder.orderId}
              >
                {displayOrder.orderId.length > 16
                  ? `${displayOrder.orderId.slice(0, 8)}...${displayOrder.orderId.slice(-6)}`
                  : displayOrder.orderId}
              </span>
              <button
                onClick={copyOrderId}
                className="text-primary hover:text-primary/80 text-xs font-medium flex items-center gap-1 flex-shrink-0"
              >
                <Copy className="w-3 h-3" />
                <span>{t('common.copy')}</span>
              </button>
              {displayOrder.userRole === 'seller' && !isPrePayment && (
                <button
                  onClick={() => setShowPackingSlip(true)}
                  className="text-muted-foreground hover:text-foreground text-xs font-medium flex items-center gap-1 flex-shrink-0 ml-2"
                >
                  <Printer className="w-3 h-3" />
                  <span>{t('order.packingSlip.title')}</span>
                </button>
              )}
            </div>

            {/* Tab navigation */}
            <div className="border-b border-border mb-4">
              <div className="flex gap-6" role="tablist" aria-label={t('order.tabs.label')}>
                {(['summary', 'discussion', 'contract'] as const).map(tab => (
                  <button
                    key={tab}
                    role="tab"
                    aria-selected={activeTab === tab}
                    aria-controls={`tabpanel-${tab}`}
                    id={`tab-${tab}`}
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
              <div role="tabpanel" id="tabpanel-summary" aria-labelledby="tab-summary">
                {/* Status context card — gives users clear next-step guidance */}
                <OrderStatusCard displayOrder={displayOrder} className="mb-4" />

                {protectionStage && displayOrder.protection && (
                  <OrderProtectionStatus
                    stage={protectionStage}
                    daysRemaining={displayOrder.protection.daysRemaining}
                    autoCompleteAt={displayOrder.protection.autoCompleteAt}
                    extendable={displayOrder.protection.extendable}
                    extended={displayOrder.protection.extended}
                    afterSaleWindowDays={displayOrder.protection.afterSaleWindowDays}
                    userRole={
                      displayOrder.userRole === 'moderator' ? 'buyer' : displayOrder.userRole
                    }
                    protectionLevel={displayOrder.protection.protectionLevel}
                    onExtendProtection={handleExtendProtection}
                    className="mb-4"
                  />
                )}

                {showRatingInvite && (
                  <RatingInviteBanner
                    onWriteReview={() => executeConfirmAction('complete')}
                    onReportIssue={
                      displayOrder.protection?.stage === 'AFTER_SALE_WINDOW'
                        ? () => {
                            setIsAfterSaleDispute(true);
                            setShowDisputeModal(true);
                          }
                        : undefined
                    }
                    disputeFiled={hasAfterSaleDispute}
                    className="mb-4"
                  />
                )}

                {displayOrder.afterSaleDispute && (
                  <AfterSaleDisputeCard
                    dispute={displayOrder.afterSaleDispute}
                    userRole={displayOrder.userRole}
                    onMessageCounterparty={() => {
                      document
                        .querySelector<HTMLTextAreaElement>('[data-testid="chat-input"]')
                        ?.focus();
                    }}
                    className="mb-4"
                  />
                )}

                <OrderProductCard displayOrder={displayOrder} className="mb-4" />
                <OrderSummaryCard
                  displayOrder={displayOrder}
                  statusLabel={statusLabel}
                  className="mb-4"
                />

                {/* Fiat dispute banner (independent of order state) */}
                {displayOrder.fiatDispute && (
                  <FiatDisputeBanner
                    fiatDispute={displayOrder.fiatDispute}
                    userRole={displayOrder.userRole}
                  />
                )}

                {/* Active crypto dispute banner (only when dispute exists) */}
                {displayOrder.dispute && (
                  <OrderDisputeBanner
                    displayOrder={displayOrder}
                    onOpenDispute={() => handleOrderAction('Dispute')}
                  />
                )}

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

                {supplyChainEnabled && displayOrder.userRole === 'seller' && (
                  <FulfillmentStatusCard orderId={orderId} className="mb-4" />
                )}

                {/* Participants — inline within the card for cohesive layout */}
                <OrderCounterpartyCard
                  displayOrder={displayOrder}
                  variant="full"
                  className="mt-4"
                />

                {/* Subtle dispute entry — replaces the aggressive full-width button */}
                {!displayOrder.dispute &&
                  !!displayOrder.moderator &&
                  ((displayOrder.userRole === 'buyer' &&
                    ['paid', 'processing', 'shipped', 'delivered'].includes(displayOrder.status)) ||
                    (displayOrder.userRole === 'seller' &&
                      ['shipped', 'delivered'].includes(displayOrder.status))) && (
                    <div className="text-center mt-6 mb-2">
                      <button
                        onClick={() => handleOrderAction('Dispute')}
                        className="text-xs text-muted-foreground hover:text-destructive transition-colors underline underline-offset-2"
                        data-testid="order-detail-open-dispute"
                      >
                        {t('order.dispute.haveProblem')}
                      </button>
                    </div>
                  )}
              </div>
            )}

            {activeTab === 'discussion' && (
              <div role="tabpanel" id="tabpanel-discussion" aria-labelledby="tab-discussion">
                <OrderChat
                  orderId={orderId}
                  participants={chatParticipants}
                  messages={chatMessages}
                  currentUserId={currentUserPeerID || ''}
                  onSendMessage={sendMessage}
                  className="h-[calc(100vh-400px)] min-h-[400px]"
                />
              </div>
            )}

            {activeTab === 'contract' && (
              <div role="tabpanel" id="tabpanel-contract" aria-labelledby="tab-contract">
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

          {/* Spacer for fixed footer */}
          <div className="h-16" />
        </Container>
      </main>

      {/* Fixed action footer — hidden when RatingInviteBanner takes over */}
      {!showRatingInvite && (
        <OrderFooter
          orderState={coreOrder?.state || 'PENDING'}
          userRole={displayOrder.userRole as CoreUserRole}
          timestamp={displayOrder.createdAt}
          isModerated={!!displayOrder.moderator}
          isShipped={coreOrder ? isOrderShipped(coreOrder) : false}
          paymentMethod={coreOrder?.contract?.paymentSent?.method?.toString()}
          totalAmount={displayOrder.total}
          currency={displayOrder.currency}
          paymentCoin={coreOrder?.contract?.paymentSent?.coin}
          hasRated={displayOrder.hasRated}
          inAfterSaleWindow={displayOrder.protection?.stage === 'AFTER_SALE_WINDOW'}
          onAction={handleOrderAction}
        />
      )}

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
          totalAmount={displayOrder.pricingAmount ?? ''}
          currency={displayOrder.pricingCurrency ?? ''}
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

      <ShipOrderDialog
        open={showShipDialog}
        onOpenChange={setShowShipDialog}
        orderId={shipOrderProps.orderId}
        contractType={shipOrderProps.contractType}
        blockchain={shipOrderProps.blockchain}
        onSuccess={shipOrderProps.onSuccess}
      />

      <WriteReviewDialog
        open={showReviewDialog}
        productTitle={reviewProductTitle}
        onSubmit={submitReviewAndComplete}
        onSkip={skipReviewAndComplete}
        onClose={closeReviewDialog}
        isSubmitting={isActionLoading}
      />

      <DisputeModal
        isOpen={showDisputeModal}
        onClose={() => setShowDisputeModal(false)}
        onSubmit={handleDisputeSubmit}
        onAfterSaleSubmit={handleAfterSaleDisputeSubmit}
        isAfterSale={isAfterSaleDispute}
        isLoading={isDisputeLoading}
      />

      <PackingSlipDialog
        open={showPackingSlip}
        onOpenChange={setShowPackingSlip}
        order={displayOrder}
      />

      <Footer />
    </div>
  );
}
