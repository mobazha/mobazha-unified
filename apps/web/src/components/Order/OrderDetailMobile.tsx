'use client';

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { MobilePageHeader } from '@/components/MobilePageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton-compat';
import { MessageCircle, Package, MapPin, ExternalLink, Printer } from 'lucide-react';
import { AvatarCompat as Avatar } from '@/components/ui/avatar-compat';
import { DisputeModal } from '@/components/Order/modals/DisputeModal';
import { cn } from '@/lib/utils';
import {
  useI18n,
  isOrderFulfilled,
  getOrderActions,
  getPrimaryAction,
  getActionButtonConfig,
  ordersApi,
  disputesApi,
  type OrderAction,
  type UserRole as CoreUserRole,
} from '@mobazha/core';
import { useOrderDetailPage } from '@/hooks/useOrderDetailPage';
import { useToast } from '@/components/ui/use-toast';
import { useTGMiniApp } from '@/components/TGMiniAppProvider/TGMiniAppProvider';
import {
  OrderChat,
  AcceptOrderDialog,
  FulfillOrderDialog,
  OrderConfirmDialog,
  WriteReviewDialog,
  type OrderConfirmType,
} from '@/components/Order';
import { FiatRefundDialog } from './FiatRefundDialog';
import { PackingSlipDialog } from './PackingSlipDialog';
import { OrderActionSheet } from './OrderActionSheet';
import {
  OrderProductCard,
  OrderSummaryCard,
  OrderPaymentCard,
  OrderShippingCard,
  OrderTimelineCard,
  OrderCounterpartyCard,
  OrderContractView,
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

function SectionTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <h3
      className={cn(
        'text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2',
        className
      )}
    >
      {children}
    </h3>
  );
}

function ModeratorBadge({
  moderator,
  className,
}: {
  moderator: { id?: string; name?: string; avatar?: string; fee?: number | string };
  className?: string;
}) {
  const { t } = useI18n();
  return (
    <div
      className={cn(
        'flex items-center gap-2.5 p-2.5 bg-muted/20 rounded-lg border border-border/40',
        className
      )}
    >
      <Avatar
        src={moderator.avatar}
        name={moderator.name || t('order.moderator')}
        size="md"
        className="w-9 h-9 ring-1 ring-border/50"
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">
          {moderator.name || t('order.moderator')}
        </p>
        <p className="text-xs text-muted-foreground">{t('order.moderator')}</p>
      </div>
      {moderator.fee && (
        <span className="text-xs text-primary font-medium shrink-0">{moderator.fee}%</span>
      )}
    </div>
  );
}

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
  const { toast } = useToast();

  // --- UI-only state ---
  const [confirmDialog, setConfirmDialog] = useState<OrderConfirmType | null>(null);
  const [showFiatRefundDialog, setShowFiatRefundDialog] = useState(false);
  const [showAcceptDialog, setShowAcceptDialog] = useState(false);
  const [showFulfillDialog, setShowFulfillDialog] = useState(false);
  const [showContractModal, setShowContractModal] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [isAfterSaleDispute, setIsAfterSaleDispute] = useState(false);
  const [isDisputeLoading, setIsDisputeLoading] = useState(false);
  const [showPackingSlip, setShowPackingSlip] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'discussion'>('details');

  // --- Computed ---
  const statusLabel = useMemo(() => {
    if (!displayOrder) return '';
    return getStatusLabel(displayOrder.status, t);
  }, [displayOrder, t]);

  const hasTracking = useMemo(() => {
    if (!displayOrder) return false;
    return (
      !!displayOrder.trackingNumber ||
      ['shipped', 'delivered', 'completed'].includes(displayOrder.status)
    );
  }, [displayOrder]);

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

  const handleConfirmAction = useCallback(async () => {
    if (!confirmDialog) return;
    const actionType = confirmDialog;
    setConfirmDialog(null);
    const ok = await executeConfirmAction(actionType);
    haptic?.notificationOccurred(ok ? 'success' : 'error');
  }, [confirmDialog, executeConfirmAction, haptic]);

  const handleFiatRefund = useCallback(
    async (params: { amount?: number; currency?: string; reason?: string }) => {
      setShowFiatRefundDialog(false);
      const ok = await executeConfirmAction('refund', params);
      haptic?.notificationOccurred(ok ? 'success' : 'error');
    },
    [executeConfirmAction, haptic]
  );

  const handleDisputeSubmit = useCallback(
    async (claim: string, evidenceHashes?: string[]) => {
      setIsDisputeLoading(true);
      try {
        await ordersApi.openDispute(orderId, claim, evidenceHashes);
        setShowDisputeModal(false);
        haptic?.notificationOccurred('success');
        toast({
          title: t('order.disputeOpened'),
          description: t('order.disputeOpenedSuccess'),
        });
        setTimeout(() => refetch(), 500);
      } catch (error) {
        haptic?.notificationOccurred('error');
        toast({
          title: t('order.actions.error'),
          description: (error as Error).message,
          variant: 'destructive',
        });
      } finally {
        setIsDisputeLoading(false);
      }
    },
    [orderId, refetch, t, toast, haptic]
  );

  const handleAfterSaleDisputeSubmit = useCallback(
    async (reason: string, description: string) => {
      setIsDisputeLoading(true);
      try {
        await disputesApi.openAfterSaleDispute(orderId, reason, description);
        setShowDisputeModal(false);
        haptic?.notificationOccurred('success');
        toast({
          title: t('order.disputeOpened'),
          description: t('order.afterSaleDisputeSuccess'),
        });
        setTimeout(() => refetch(), 500);
      } catch (error) {
        haptic?.notificationOccurred('error');
        toast({
          title: t('order.actions.error'),
          description: (error as Error).message,
          variant: 'destructive',
        });
      } finally {
        setIsDisputeLoading(false);
      }
    },
    [orderId, refetch, t, toast, haptic]
  );

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
      {
        isModerated: !!displayOrder.moderator,
        isFulfilled: isOrderFulfilled(coreOrder),
        paymentMethod: coreOrder.contract?.paymentSent?.method?.toString(),
        hasRated: displayOrder.hasRated,
      }
    );
    return !!getPrimaryAction(actions);
  }, [isTG, mainButton, coreOrder, displayOrder]);

  useEffect(() => {
    if (!isTG || !mainButton || !coreOrder || !displayOrder) return;

    const actions = getOrderActions(
      coreOrder.state || 'PENDING',
      displayOrder.userRole as CoreUserRole,
      {
        isModerated: !!displayOrder.moderator,
        isFulfilled: isOrderFulfilled(coreOrder),
        paymentMethod: coreOrder.contract?.paymentSent?.method?.toString(),
        hasRated: displayOrder.hasRated,
      }
    );
    const primary = getPrimaryAction(actions);
    if (!primary) {
      mainButton.hide();
      return;
    }

    const cfg = getActionButtonConfig(primary, displayOrder.userRole as CoreUserRole);
    mainButton.setText(cfg.label);
    const onMain = () => handleOrderActionRef.current(primary);
    mainButton.onClick(onMain);
    mainButton.show();
    return () => {
      mainButton.offClick(onMain);
      mainButton.hide();
    };
  }, [isTG, mainButton, coreOrder, displayOrder]);

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
      {/* Header — clean title, no hash */}
      <MobilePageHeader
        title={t('order.details')}
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
              {displayOrder.userRole === 'seller' && displayOrder.status !== 'awaiting_payment' && (
                <button
                  onClick={() => {
                    setShowMoreMenu(false);
                    setShowPackingSlip(true);
                  }}
                  className="w-full py-4 text-center text-[15px] font-medium hover:bg-muted/20 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  {t('order.packingSlip.title')}
                </button>
              )}
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
        <div className="flex" role="tablist" aria-label={t('order.tabs.label')}>
          <button
            role="tab"
            aria-selected={activeTab === 'details'}
            aria-controls="tabpanel-details"
            id="tab-details"
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
            role="tab"
            aria-selected={activeTab === 'discussion'}
            aria-controls="tabpanel-discussion"
            id="tab-discussion"
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
        <div
          role="tabpanel"
          id="tabpanel-details"
          aria-labelledby="tab-details"
          className="px-4 pt-3 space-y-4"
        >
          {/* 1. Status + progress bar */}
          <OrderStatusCard displayOrder={displayOrder} />

          {/* 2. Product card (vendor merged inline) */}
          <OrderProductCard displayOrder={displayOrder} />

          {/* 3. Order summary — total, shipping, status badge */}
          <OrderSummaryCard displayOrder={displayOrder} statusLabel={statusLabel} />

          {/* 4a. Fiat dispute banner (independent of order state) */}
          {displayOrder.fiatDispute && (
            <FiatDisputeBanner
              fiatDispute={displayOrder.fiatDispute}
              userRole={displayOrder.userRole}
            />
          )}

          {/* 4b. Crypto dispute banner (only when active) */}
          {displayOrder.dispute && (
            <OrderDisputeBanner
              displayOrder={displayOrder}
              onOpenDispute={() => handleOrderAction('Dispute')}
            />
          )}

          {/* 5. Tracking card — shown for shipped/delivered/completed */}
          {hasTracking && (
            <div>
              <SectionTitle>{t('order.trackingSection.title')}</SectionTitle>
              <div className="p-3 bg-muted/30 rounded-lg border border-border/50">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Package className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    {displayOrder.shipper && (
                      <p className="text-sm font-medium text-foreground">{displayOrder.shipper}</p>
                    )}
                    {displayOrder.trackingNumber ? (
                      <p className="text-xs text-muted-foreground font-mono truncate">
                        {displayOrder.trackingNumber}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        {t('order.trackingSection.noTrackingNumber')}
                      </p>
                    )}
                  </div>
                  {displayOrder.trackingNumber && (
                    <button
                      onClick={() => {
                        const query = encodeURIComponent(displayOrder.trackingNumber || '');
                        window.open(`https://track24.net/?code=${query}`, '_blank');
                      }}
                      className="text-xs text-primary hover:underline flex items-center gap-1 shrink-0"
                    >
                      <ExternalLink className="w-3 h-3" />
                      {t('order.trackingSection.track')}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 5b. Buyer protection — after tracking context */}
          {protectionStage && displayOrder.protection && (
            <OrderProtectionStatus
              stage={protectionStage}
              daysRemaining={displayOrder.protection.daysRemaining}
              autoCompleteAt={displayOrder.protection.autoCompleteAt}
              extendable={displayOrder.protection.extendable}
              extended={displayOrder.protection.extended}
              afterSaleWindowDays={displayOrder.protection.afterSaleWindowDays}
              userRole={displayOrder.userRole === 'moderator' ? 'buyer' : displayOrder.userRole}
              protectionLevel={displayOrder.protection.protectionLevel}
              onExtendProtection={handleExtendProtection}
            />
          )}

          {showRatingInvite && (
            <RatingInviteBanner
              onWriteReview={() => executeConfirmAction('complete')}
              onReportIssue={() => {
                setIsAfterSaleDispute(true);
                setShowDisputeModal(true);
              }}
              disputeFiled={hasAfterSaleDispute}
            />
          )}

          {displayOrder.afterSaleDispute && (
            <AfterSaleDisputeCard
              dispute={displayOrder.afterSaleDispute}
              userRole={displayOrder.userRole}
              onMessageCounterparty={() => setActiveTab('discussion')}
              className="mt-3"
            />
          )}

          {/* 6. Payment info */}
          {(displayOrder.paymentTx || displayOrder.paymentLocked || displayOrder.fiatPayment) && (
            <div>
              <SectionTitle>{t('order.payment.title')}</SectionTitle>
              <OrderPaymentCard displayOrder={displayOrder} coreOrder={coreOrder} />
            </div>
          )}

          {/* 7. Shipping address — physical goods only */}
          {displayOrder.contractType === 'PHYSICAL_GOOD' &&
            (displayOrder.shippingRecipient || displayOrder.shippingAddressLine1) && (
              <div>
                <SectionTitle>{t('order.shippingDetails')}</SectionTitle>
                <OrderShippingCard displayOrder={displayOrder} />
              </div>
            )}

          {/* 8. Parties — buyer (seller view) + moderator */}
          {((displayOrder.userRole === 'seller' && displayOrder.buyer?.peerID) ||
            displayOrder.moderator ||
            displayOrder.notes ||
            displayOrder.alternateContactInfo) && (
            <div>
              <SectionTitle>{t('order.additionalInfo')}</SectionTitle>
              <div className="space-y-2">
                {displayOrder.userRole === 'seller' && displayOrder.buyer?.peerID && (
                  <OrderCounterpartyCard displayOrder={displayOrder} variant="compact" />
                )}
                {displayOrder.moderator && <ModeratorBadge moderator={displayOrder.moderator} />}
                {(displayOrder.notes || displayOrder.alternateContactInfo) && (
                  <OrderMemoCard displayOrder={displayOrder} />
                )}
              </div>
            </div>
          )}

          {/* 9. Order history timeline */}
          <div>
            <SectionTitle>{t('order.orderHistory')}</SectionTitle>
            <OrderTimelineCard displayOrder={displayOrder} coreOrder={coreOrder} />
          </div>

          {/* 10. Subtle dispute entry — moderated orders only */}
          {!displayOrder.dispute &&
            !!displayOrder.moderator &&
            ((displayOrder.userRole === 'buyer' &&
              ['paid', 'processing', 'shipped', 'delivered'].includes(displayOrder.status)) ||
              (displayOrder.userRole === 'seller' &&
                ['shipped', 'delivered'].includes(displayOrder.status))) && (
              <div className="text-center pb-2">
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
      ) : (
        <div
          role="tabpanel"
          id="tabpanel-discussion"
          aria-labelledby="tab-discussion"
          className="px-4 pt-3"
        >
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

      {/* Fixed bottom action bar — hidden when RatingInviteBanner takes over or TG MainButton active */}
      {activeTab === 'details' && coreOrder && !tgMainButtonActive && !showRatingInvite && (
        <OrderActionSheet
          orderState={coreOrder.state || 'PENDING'}
          userRole={displayOrder.userRole as CoreUserRole}
          timestamp={displayOrder.createdAt}
          isModerated={!!displayOrder.moderator}
          isFulfilled={isOrderFulfilled(coreOrder)}
          paymentMethod={coreOrder.contract?.paymentSent?.method?.toString()}
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
    </div>
  );
}
