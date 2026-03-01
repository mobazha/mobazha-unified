'use client';

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { MobilePageHeader } from '@/components/MobilePageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton-compat';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useI18n,
  isOrderFulfilled,
  getOrderActions,
  getPrimaryAction,
  getActionButtonConfig,
  type OrderAction,
  type UserRole as CoreUserRole,
} from '@mobazha/core';
import { useOrderDetailPage } from '@/hooks/useOrderDetailPage';
import { useTGMiniApp } from '@/components/TGMiniAppProvider/TGMiniAppProvider';
import {
  OrderChat,
  AcceptOrderDialog,
  FulfillOrderDialog,
  OrderConfirmDialog,
  WriteReviewDialog,
  type OrderConfirmType,
} from '@/components/Order';
import { OrderActionSheet } from './OrderActionSheet';
import { EscrowStatusBar } from '@/components/Trust';
import {
  OrderProductCard,
  OrderSummaryCard,
  OrderPaymentCard,
  OrderShippingCard,
  OrderTimelineCard,
  OrderCounterpartyCard,
  OrderContractView,
  OrderDisputeBanner,
  OrderMemoCard,
  getStatusLabel,
} from '@/components/Order/cards';

export interface OrderDetailMobileProps {
  orderId: string;
  viewingContext?: 'sale' | 'purchase';
}

export function OrderDetailMobile({ orderId, viewingContext }: OrderDetailMobileProps) {
  const router = useRouter();
  const { t } = useI18n();

  const {
    displayOrder,
    coreOrder,
    isLoading,
    error,
    refetch,
    currentUserPeerID,
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
  } = useOrderDetailPage(orderId, viewingContext);

  const { isAvailable: isTG, backButton, mainButton, haptic } = useTGMiniApp();

  // --- UI-only state ---
  const [confirmDialog, setConfirmDialog] = useState<OrderConfirmType | null>(null);
  const [showAcceptDialog, setShowAcceptDialog] = useState(false);
  const [showFulfillDialog, setShowFulfillDialog] = useState(false);
  const [showContractModal, setShowContractModal] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'discussion'>('details');

  // --- Computed ---
  const statusLabel = useMemo(() => {
    if (!displayOrder) return '';
    return getStatusLabel(displayOrder.status, t);
  }, [displayOrder, t]);

  // Dynamic accordion: auto-expand payment section when awaiting_payment
  const defaultAccordion = useMemo(() => {
    if (!displayOrder) return [];
    if (displayOrder.status === 'awaiting_payment') return ['payment'];
    if (['shipped', 'delivered'].includes(displayOrder.status)) return ['shipping'];
    return [];
  }, [displayOrder]);

  // --- Action handler ---
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
          setConfirmDialog('refund');
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
    [router, orderId, executeConfirmAction]
  );

  const handleConfirmAction = useCallback(async () => {
    if (!confirmDialog) return;
    const actionType = confirmDialog;
    setConfirmDialog(null);
    const ok = await executeConfirmAction(actionType);
    haptic?.notificationOccurred(ok ? 'success' : 'error');
  }, [confirmDialog, executeConfirmAction, haptic]);

  // --- TG BackButton ---
  useEffect(() => {
    if (!isTG || !backButton) return;
    const onBack = () => router.back();
    backButton.onClick(onBack);
    backButton.show();
    return () => {
      backButton.offClick(onBack);
      backButton.hide();
    };
  }, [isTG, backButton, router]);

  // --- TG MainButton (maps to primary order action) ---
  const handleOrderActionRef = useRef(handleOrderAction);

  useEffect(() => {
    handleOrderActionRef.current = handleOrderAction;
  }, [handleOrderAction]);

  const tgMainButtonActive = useMemo(() => {
    if (!isTG || !mainButton || !coreOrder || !displayOrder) return false;
    const actions = getOrderActions(
      coreOrder.state || 'PENDING',
      displayOrder.userRole as CoreUserRole,
      displayOrder.createdAt,
      !!displayOrder.moderator,
      isOrderFulfilled(coreOrder),
      coreOrder.contract?.paymentSent?.method?.toString()
    );
    return !!getPrimaryAction(actions);
  }, [isTG, mainButton, coreOrder, displayOrder]);

  useEffect(() => {
    if (!isTG || !mainButton || !coreOrder || !displayOrder) return;

    const actions = getOrderActions(
      coreOrder.state || 'PENDING',
      displayOrder.userRole as CoreUserRole,
      displayOrder.createdAt,
      !!displayOrder.moderator,
      isOrderFulfilled(coreOrder),
      coreOrder.contract?.paymentSent?.method?.toString()
    );
    const primary = getPrimaryAction(actions);
    if (!primary) {
      mainButton.hide();
      return;
    }

    const cfg = getActionButtonConfig(primary, t);
    mainButton.setText(cfg.label);
    const onMain = () => handleOrderActionRef.current(primary);
    mainButton.onClick(onMain);
    mainButton.show();
    return () => {
      mainButton.offClick(onMain);
      mainButton.hide();
    };
  }, [isTG, mainButton, coreOrder, displayOrder, t]);

  // --- Loading state ---
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <MobilePageHeader title={t('order.details')} />
        <div className="px-4 pt-2 pb-20">
          <Skeleton variant="rounded" width="100%" height={80} className="mb-3" />
          <Skeleton variant="rounded" width="100%" height={60} className="mb-3" />
          <Skeleton variant="rounded" width="100%" height={40} className="mb-3" />
          <Skeleton variant="rounded" width="100%" height={120} />
        </div>
      </div>
    );
  }

  // --- Error state ---
  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <MobilePageHeader title={t('order.details')} />
        <div className="px-4 py-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-error/15 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-error"
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
          <h2 className="text-lg font-semibold text-foreground mb-2">
            {t('order.loadOrderFailed')}
          </h2>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => refetch()} size="sm">
            {t('order.tryAgain')}
          </Button>
        </div>
      </div>
    );
  }

  if (!displayOrder) {
    return (
      <div className="min-h-screen bg-background">
        <MobilePageHeader title={t('order.details')} />
        <div className="px-4 py-12 text-center">
          <h2 className="text-lg font-semibold text-foreground mb-2">{t('order.orderNotFound')}</h2>
          <p className="text-sm text-muted-foreground mb-4">{t('order.orderNotFoundMessage')}</p>
          <Button onClick={() => router.push('/orders')} size="sm">
            {t('order.backToOrders')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header with order number + more menu */}
      <MobilePageHeader
        title={`Order #${displayOrder.orderId.slice(0, 8)}...`}
        rightAction={
          <button
            onClick={() => setShowMoreMenu(true)}
            className="w-11 h-11 flex items-center justify-center text-muted-foreground hover:text-foreground rounded-full active:bg-muted/50 touch-feedback"
            aria-label={t('common.moreActions')}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
          </button>
        }
      />

      {/* More actions bottom sheet */}
      {showMoreMenu && (
        <div className="fixed inset-0 z-[60]">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowMoreMenu(false)} />
          <div className="absolute left-0 right-0 bottom-0 bg-background rounded-t-2xl shadow-xl p-4 pb-[max(1rem,env(safe-area-inset-bottom))] pointer-events-auto">
            <div className="w-10 h-1 bg-muted rounded-full mx-auto mb-4" />
            <div className="space-y-1">
              {counterparty?.peerID && (
                <button
                  onClick={() => {
                    setShowMoreMenu(false);
                    router.push(`/store/${counterparty.peerID}`);
                  }}
                  className="w-full py-4 text-center text-[15px] font-medium hover:bg-muted/20 rounded-lg transition-colors"
                >
                  {t('order.actions.goToSellerPage')}
                </button>
              )}
              <button
                onClick={async () => {
                  setShowMoreMenu(false);
                  await copyOrderId();
                }}
                className="w-full py-4 text-center text-[15px] font-medium hover:bg-muted/20 rounded-lg transition-colors"
              >
                {t('order.actions.copyOrderId')}
              </button>
              <button
                onClick={() => {
                  setShowMoreMenu(false);
                  setShowContractModal(true);
                }}
                className="w-full py-4 text-center text-[15px] font-medium hover:bg-muted/20 rounded-lg transition-colors"
              >
                {t('order.actions.viewContract')}
              </button>
            </div>
            <div className="mt-2 pt-2 border-t border-border/60">
              <button
                onClick={() => setShowMoreMenu(false)}
                className="w-full py-4 text-center text-[15px] font-medium text-primary hover:bg-muted/20 rounded-lg transition-colors"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab bar */}
      <div className="sticky top-0 z-20 bg-background border-b border-border">
        <div className="flex">
          <button
            onClick={() => setActiveTab('details')}
            className={cn(
              'flex-1 py-2.5 text-sm font-medium text-center transition-colors relative',
              activeTab === 'details'
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {t('order.tabs.summary')}
            {activeTab === 'details' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('discussion')}
            className={cn(
              'flex-1 py-2.5 text-sm font-medium text-center transition-colors relative flex items-center justify-center gap-1.5',
              activeTab === 'discussion'
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <MessageCircle className="w-4 h-4" />
            {t('order.tabs.discussion')}
            {activeTab === 'discussion' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      {activeTab === 'details' ? (
        <div className="px-4 pt-3">
          {/* Escrow status bar */}
          <div className="mb-3">
            <EscrowStatusBar status={displayOrder.status} />
          </div>

          {/* Counterparty (compact) */}
          <OrderCounterpartyCard displayOrder={displayOrder} variant="compact" className="mb-3" />

          {/* Product + Summary always expanded */}
          <OrderProductCard displayOrder={displayOrder} className="mb-3" />
          <OrderSummaryCard
            displayOrder={displayOrder}
            statusLabel={statusLabel}
            className="mb-3"
          />

          {/* Dispute banner */}
          <OrderDisputeBanner
            displayOrder={displayOrder}
            onOpenDispute={() => handleOrderAction('Dispute')}
          />

          {/* Collapsible sections */}
          <Accordion type="multiple" defaultValue={defaultAccordion} className="mb-4">
            {/* Timeline */}
            <AccordionItem value="timeline">
              <AccordionTrigger className="text-sm font-semibold">
                {t('order.orderHistory')}
              </AccordionTrigger>
              <AccordionContent>
                <OrderTimelineCard displayOrder={displayOrder} coreOrder={coreOrder} />
              </AccordionContent>
            </AccordionItem>

            {/* Payment */}
            {(displayOrder.paymentTx || displayOrder.paymentLocked) && (
              <AccordionItem value="payment">
                <AccordionTrigger className="text-sm font-semibold">
                  {t('order.payment.title')}
                </AccordionTrigger>
                <AccordionContent>
                  <OrderPaymentCard displayOrder={displayOrder} coreOrder={coreOrder} />
                </AccordionContent>
              </AccordionItem>
            )}

            {/* Shipping */}
            {displayOrder.contractType === 'PHYSICAL_GOOD' && (
              <AccordionItem value="shipping">
                <AccordionTrigger className="text-sm font-semibold">
                  {t('order.shippingDetails')}
                </AccordionTrigger>
                <AccordionContent>
                  <OrderShippingCard displayOrder={displayOrder} />
                </AccordionContent>
              </AccordionItem>
            )}

            {/* Memo & Moderator */}
            {(displayOrder.notes ||
              displayOrder.alternateContactInfo ||
              displayOrder.moderator) && (
              <AccordionItem value="memo">
                <AccordionTrigger className="text-sm font-semibold">
                  {t('order.additionalInfo')}
                </AccordionTrigger>
                <AccordionContent>
                  <OrderMemoCard displayOrder={displayOrder} />
                </AccordionContent>
              </AccordionItem>
            )}
          </Accordion>
        </div>
      ) : (
        <div className="px-4 pt-3">
          <Card className="border border-border/60 shadow-sm overflow-hidden">
            <OrderChat
              orderId={orderId}
              participants={chatParticipants}
              messages={chatMessages}
              currentUserId={currentUserPeerID || ''}
              onSendMessage={sendMessage}
              className="h-[calc(100vh-200px)] min-h-[400px]"
            />
          </Card>
        </div>
      )}

      {/* Fixed bottom action bar (hidden when TG MainButton handles primary action) */}
      {activeTab === 'details' && coreOrder && !tgMainButtonActive && (
        <OrderActionSheet
          orderState={coreOrder.state || 'PENDING'}
          userRole={displayOrder.userRole as CoreUserRole}
          timestamp={displayOrder.createdAt}
          isModerated={!!displayOrder.moderator}
          isFulfilled={isOrderFulfilled(coreOrder)}
          paymentMethod={coreOrder.contract?.paymentSent?.method?.toString()}
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

      <OrderContractView
        open={showContractModal}
        onOpenChange={setShowContractModal}
        coreOrder={coreOrder}
        onCopy={copyContract}
      />

      <WriteReviewDialog
        open={showReviewDialog}
        productTitle={reviewProductTitle}
        onSubmit={async data => {
          await submitReviewAndComplete(data);
          haptic?.notificationOccurred('success');
        }}
        onSkip={async () => {
          await skipReviewAndComplete();
          haptic?.notificationOccurred('success');
        }}
        onClose={closeReviewDialog}
        isSubmitting={isActionLoading}
        isMobile
      />
    </div>
  );
}
