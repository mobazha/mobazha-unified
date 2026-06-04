'use client';

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { MobilePageHeader } from '@/components/MobilePageHeader';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton-compat';
import { MessageCircle, Package, ExternalLink, Printer } from 'lucide-react';
import { AvatarCompat as Avatar } from '@/components/ui/avatar-compat';
import { DisputeModal } from '@/components/Order/modals/DisputeModal';
import { cn } from '@/lib/utils';
import { orderDetailPath } from '@/lib/ordersNavigation';
import {
  useI18n,
  isOrderShipped,
  getOrderActions,
  getPrimaryAction,
  getActionButtonConfig,
  ordersApi,
  disputesApi,
  useFeature,
  useChatStore,
  formatUserName,
  isDisputeRulingAvailable,
  isActiveCryptoDisputeStatus,
  shouldShowDisputeArchiveCard,
  resolveDigitalEntitlementDisputePhase,
  type OrderAction,
  type UserRole as CoreUserRole,
} from '@mobazha/core';
import { useOrderDetailPage } from '@/hooks/useOrderDetailPage';
import { useOrderChat } from '@/hooks/useOrderChat';
import { useModeratorDisputeResolution } from '@/hooks/useModeratorDisputeResolution';
import { ModeratorDisputeRulingDialog } from '@/components/Order/ModeratorDisputeRulingDialog';
import { useToast } from '@/components/ui/use-toast';
import { useTGMiniApp } from '@/components/TGMiniAppProvider/TGMiniAppProvider';
import { useHaptic } from '@/lib/platform';
import {
  OrderChat,
  OrderChatContextStrip,
  AcceptOrderDialog,
  ShipOrderDialog,
  OrderConfirmDialog,
  OrderRating,
  WriteReviewDialog,
  ConfirmReceiptDialog,
  AcceptPayoutDialog,
  SellerDigitalDeliveryStatus,
  OrderShipment,
  getDigitalDeliveryTimestamp,
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
  DisputeSummaryCard,
  DisputeHistoryCard,
  FiatDisputeBanner,
  OrderMemoCard,
  OrderStatusCard,
  OrderSettlementCard,
  OrderCreatedAtMeta,
  DisputeOverviewCard,
  DisputeEvidencePanel,
  DisputeResolutionBar,
  getStatusLabel,
} from '@/components/Order/cards';
import {
  OrderProtectionStatus,
  type OrderProtectionStatusProps,
} from '@/components/Order/cards/OrderProtectionStatus';
import { RatingInviteBanner } from '@/components/Order/cards/RatingInviteBanner';
import { AfterSaleDisputeCard } from '@/components/Order/cards/AfterSaleDisputeCard';
import { FulfillmentStatusCard } from '@/components/Order/cards/FulfillmentStatusCard';
import { BuyerDigitalAssetsSection } from '@/components/Order/BuyerDigitalAssetsSection';

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
        <p className="text-xs text-muted-foreground">{t('order.moderatorStandby')}</p>
      </div>
      {moderator.fee && (
        <span className="text-xs text-primary font-medium shrink-0">
          {t('order.moderatorFeeOnDispute', { fee: moderator.fee })}
        </span>
      )}
    </div>
  );
}

export interface OrderDetailMobileProps {
  orderId: string;
  viewingContext?: 'sale' | 'purchase';
  listBackPath?: string;
  focusDispute?: boolean;
  initialTab?: 'details' | 'discussion' | 'evidence';
}

type OrderDetailMobileTab = 'details' | 'discussion' | 'evidence';

export function OrderDetailMobile({
  orderId,
  viewingContext,
  listBackPath = '/orders',
  focusDispute = false,
  initialTab = 'details',
}: OrderDetailMobileProps) {
  const router = useRouter();
  const { t } = useI18n();
  const supplyChainEnabled = useFeature('supplyChainEnabled');
  const chatDrawerOpen = useChatStore(state => state.drawerOpen);
  const closeChatDrawer = useChatStore(state => state.closeDrawer);

  const {
    displayOrder,
    coreOrder,
    latestSettlementAction,
    isLoading,
    error,
    refetch,
    currentUserPeerID,
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
  } = useOrderDetailPage(orderId, viewingContext);

  // NOTE (MVP-1 partial migration): `haptic` has moved to the platform-abstract
  // `useHaptic()` below. `isTG` / `backButton` / `mainButton` are still pulled
  // directly from `useTGMiniApp()` because this component drives the native
  // BackButton / MainButton imperatively (not through useTGMainButton). Those
  // direct SDK calls will be migrated to `usePrimaryCTA` + `useBackAction`
  // in a follow-up pass; until then keep the dual-import shim.
  const { isAvailable: isTG, backButton, mainButton } = useTGMiniApp();
  const haptic = useHaptic();
  const { toast } = useToast();

  // --- UI-only state ---
  const [confirmDialog, setConfirmDialog] = useState<OrderConfirmType | null>(null);
  const [showFiatRefundDialog, setShowFiatRefundDialog] = useState(false);
  const [showAcceptDialog, setShowAcceptDialog] = useState(false);
  const [showShipDialog, setShowShipDialog] = useState(false);
  const [showContractModal, setShowContractModal] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [isAfterSaleDispute, setIsAfterSaleDispute] = useState(false);
  const [isDisputeLoading, setIsDisputeLoading] = useState(false);
  const [showPackingSlip, setShowPackingSlip] = useState(false);
  const [activeTab, setActiveTab] = useState<OrderDetailMobileTab>(initialTab);

  const orderChat = useOrderChat({
    orderId,
    displayOrder,
    currentUserPeerID,
    isActive: activeTab === 'discussion',
  });
  const disputeSectionRef = useRef<HTMLDivElement>(null);

  const {
    isSheetOpen,
    isResolving,
    isOpeningSheet,
    draft: rulingDraft,
    activePreset,
    validationErrors: rulingValidationErrors,
    vendorNotConfirmed,
    constraints: rulingConstraints,
    openRulingSheet,
    applyPreset,
    closeSheet,
    setBuyerPercentage,
    setVendorPercentage,
    setResolution,
    submitRuling,
  } = useModeratorDisputeResolution(orderId, refetch);

  const moderatorRulingBuyerLabel = useMemo(
    () =>
      formatUserName(
        { name: displayOrder?.buyer?.name, peerID: displayOrder?.buyer?.peerID },
        { fallback: t('order.buyer') }
      ),
    [displayOrder?.buyer, t]
  );
  const moderatorRulingSellerLabel = useMemo(
    () =>
      formatUserName(
        { name: displayOrder?.vendor?.name, peerID: displayOrder?.vendor?.peerID },
        { fallback: t('order.seller') }
      ),
    [displayOrder?.vendor, t]
  );

  // Moderator viewing a disputed order → use dedicated dispute view mode
  const isModeratorDisputeView =
    !!displayOrder && displayOrder.userRole === 'moderator' && !!displayOrder.dispute;

  const orderViewType = useMemo((): 'sale' | 'purchase' => {
    if (viewingContext === 'sale') return 'sale';
    if (viewingContext === 'purchase') return 'purchase';
    if (displayOrder?.userRole === 'seller') return 'sale';
    return 'purchase';
  }, [viewingContext, displayOrder?.userRole]);

  const syncTabToUrl = useCallback(
    (tab: OrderDetailMobileTab) => {
      const detailRole = orderViewType === 'sale' ? 'sale' : 'purchase';
      const fromShell =
        listBackPath.startsWith('/admin/orders') && detailRole === 'purchase' ? 'admin' : undefined;
      let tabParam: string | undefined;
      if (tab === 'discussion') tabParam = 'discussion';
      else if (tab === 'evidence') tabParam = 'evidence';
      else if (isModeratorDisputeView) tabParam = 'dispute';
      router.replace(orderDetailPath(orderId, detailRole, { fromShell, tab: tabParam }), {
        scroll: false,
      });
    },
    [orderId, orderViewType, listBackPath, router, isModeratorDisputeView]
  );

  const handleTabChange = useCallback(
    (tab: OrderDetailMobileTab) => {
      setActiveTab(tab);
      syncTabToUrl(tab);
    },
    [syncTabToUrl]
  );

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab, orderId]);

  useEffect(() => {
    if (activeTab !== 'evidence') return;
    if (!displayOrder) return;
    if (
      displayOrder.userRole === 'moderator' &&
      displayOrder.dispute &&
      (displayOrder.dispute.evidenceHashes?.length ?? 0) > 0
    ) {
      return;
    }
    handleTabChange('details');
  }, [activeTab, displayOrder, handleTabChange]);

  useEffect(() => {
    if (activeTab !== 'discussion') return;
    const store = useChatStore.getState();
    if (chatDrawerOpen) {
      closeChatDrawer();
    } else if (store.currentRoomId) {
      store.setCurrentRoom(null);
    }
  }, [activeTab, chatDrawerOpen, closeChatDrawer]);

  useEffect(() => {
    if (!focusDispute || !displayOrder) return;
    handleTabChange('details');
    if (!isModeratorDisputeView) {
      const timer = window.setTimeout(() => {
        disputeSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 350);
      return () => window.clearTimeout(timer);
    }
  }, [focusDispute, displayOrder, isModeratorDisputeView, handleTabChange]);

  // --- Computed ---
  const statusLabel = useMemo(() => {
    if (!displayOrder) return '';
    return getStatusLabel(displayOrder.status, t, displayOrder.contractType);
  }, [displayOrder, t]);

  const hasTracking = useMemo(() => {
    if (!displayOrder) return false;
    return (
      !!displayOrder.trackingNumber ||
      ['shipped', 'delivered', 'completed'].includes(displayOrder.status)
    );
  }, [displayOrder]);

  const canOpenModeratedDispute = useMemo(
    () =>
      !!displayOrder &&
      isModeratedOrder &&
      !displayOrder.dispute &&
      ((displayOrder.userRole === 'buyer' &&
        ['paid', 'processing', 'shipped', 'delivered'].includes(displayOrder.status)) ||
        (displayOrder.userRole === 'seller' &&
          ['shipped', 'delivered'].includes(displayOrder.status))),
    [displayOrder, isModeratedOrder]
  );

  const protectionStage = useMemo<OrderProtectionStatusProps['stage'] | null>(() => {
    if (!displayOrder?.protection) return null;
    return displayOrder.protection.stage as OrderProtectionStatusProps['stage'];
  }, [displayOrder]);

  const hasActiveCryptoDispute = useMemo(
    () => !!displayOrder?.dispute && isActiveCryptoDisputeStatus(displayOrder.status),
    [displayOrder]
  );

  const showDisputeArchive = useMemo(
    () =>
      displayOrder
        ? shouldShowDisputeArchiveCard(displayOrder.dispute, displayOrder.status)
        : false,
    [displayOrder]
  );

  const disputeRulingPendingAcceptance = useMemo(
    () => (displayOrder?.dispute ? isDisputeRulingAvailable(displayOrder.dispute) : false),
    [displayOrder?.dispute]
  );

  const digitalEntitlementDisputePhase = useMemo(
    () =>
      displayOrder
        ? resolveDigitalEntitlementDisputePhase(displayOrder.status, displayOrder.dispute)
        : 'none',
    [displayOrder]
  );

  const showModeratorEvidenceTab = useMemo(
    () => (displayOrder?.dispute?.evidenceHashes?.length ?? 0) > 0,
    [displayOrder?.dispute?.evidenceHashes]
  );

  const showDisputeDiscussionBar = useMemo(
    () =>
      !!coreOrder &&
      coreOrder.state === 'DISPUTED' &&
      !disputeRulingPendingAcceptance &&
      !isModeratorDisputeView &&
      activeTab === 'details',
    [coreOrder, disputeRulingPendingAcceptance, isModeratorDisputeView, activeTab]
  );

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
  const shouldBlockAutoRefund = useMemo(() => {
    if (displayOrder?.fundsReleasedAtConfirmation) return true;
    const settlementState = (latestSettlementAction?.state || '').trim().toLowerCase();
    const settlementAction = (
      latestSettlementAction?.settlementAction ||
      latestSettlementAction?.action ||
      ''
    )
      .trim()
      .toLowerCase();
    return (
      settlementState === 'confirmed' &&
      (settlementAction === 'cancel' ||
        settlementAction === 'confirm' ||
        settlementAction === 'release')
    );
  }, [displayOrder?.fundsReleasedAtConfirmation, latestSettlementAction]);

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
          openConfirmReceiptDialog();
          break;
        case 'Accept':
          setShowAcceptDialog(true);
          break;
        case 'Decline':
          setConfirmDialog('decline');
          break;
        case 'Ship':
          if (sellerDigitalDelivery.isDigitalOrder && sellerDigitalDelivery.isLoading) {
            toast({
              title: t('order.digitalDelivery.checking'),
            });
            break;
          }
          if (
            sellerDigitalDelivery.isDigitalOrder &&
            !sellerDigitalDelivery.status &&
            sellerDigitalDelivery.error
          ) {
            toast({
              title: t('order.digitalDelivery.syncFailed'),
              description: sellerDigitalDelivery.error,
              variant: 'destructive',
            });
            haptic.error();
            break;
          }
          if (sellerDigitalDelivery.canSyncDelivery) {
            void sellerDigitalDelivery.syncDelivery();
            break;
          }
          if (sellerDigitalDelivery.canRetryDelivery) {
            void sellerDigitalDelivery.retryDelivery();
            break;
          }
          if (sellerDigitalDelivery.isDigitalOrder && sellerDigitalDelivery.manualFallbackAllowed) {
            setShowShipDialog(true);
            break;
          }
          if (sellerDigitalDelivery.isDigitalOrder) {
            sellerDigitalDelivery.refreshStatus();
            toast({
              title: t('order.digitalDelivery.pendingTitle'),
              description: t('order.digitalDelivery.pendingDesc'),
            });
            break;
          }
          setShowShipDialog(true);
          break;
        case 'Refund':
          if (shouldBlockAutoRefund) {
            toast({
              title: t('order.actions.manualRefundRequired'),
              description: t('order.actions.manualRefundRequiredDesc'),
              variant: 'destructive',
            });
            haptic.error();
            break;
          }
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
          openAcceptPayoutDialog();
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
          openReviewDialog();
          break;
      }
    },
    [
      router,
      orderId,
      openConfirmReceiptDialog,
      openReviewDialog,
      displayOrder,
      sellerDigitalDelivery,
      shouldBlockAutoRefund,
      openAcceptPayoutDialog,
      t,
      toast,
    ]
  );

  const handleConfirmAction = useCallback(async () => {
    if (!confirmDialog || isActionLoading) return;
    const actionType = confirmDialog;
    const ok = await executeConfirmAction(actionType);
    if (ok) {
      setConfirmDialog(null);
      haptic.success();
    } else {
      haptic.error();
    }
  }, [confirmDialog, executeConfirmAction, haptic, isActionLoading]);

  const handleFiatRefund = useCallback(
    async (params: { amount?: number; currency?: string; reason?: string }) => {
      setShowFiatRefundDialog(false);
      const ok = await executeConfirmAction('refund', params);
      if (ok) haptic.success();
      else haptic.error();
    },
    [executeConfirmAction, haptic]
  );

  const handleDisputeSubmit = useCallback(
    async (claim: string, evidenceHashes?: string[]) => {
      setIsDisputeLoading(true);
      try {
        await ordersApi.openDispute(orderId, claim, evidenceHashes);
        setShowDisputeModal(false);
        haptic.success();
        toast({
          title: t('order.disputeOpened'),
          description: t('order.disputeOpenedSuccess'),
        });
        setTimeout(() => refetch(), 500);
      } catch (error) {
        haptic.error();
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
        haptic.success();
        toast({
          title: t('order.disputeOpened'),
          description: t('order.afterSaleDisputeSuccess'),
        });
        setTimeout(() => refetch(), 500);
      } catch (error) {
        haptic.error();
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
    const onBack = () => router.push(listBackPath);
    backButton.onClick(onBack);
    backButton.show();
    return () => {
      backButton.offClick(onBack);
      backButton.hide();
    };
  }, [isTG, backButton, listBackPath, router]);

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
        isModerated: isModeratedOrder,
        isShipped: isOrderShipped(coreOrder),
        paymentMethod: coreOrder.contract?.paymentSent?.method?.toString(),
        hasRated: displayOrder.hasRated,
        inAfterSaleWindow: displayOrder.protection?.stage === 'AFTER_SALE_WINDOW',
        hasAfterSaleDispute,
        fundsReleasedAtConfirmation: shouldBlockAutoRefund,
      }
    ).filter(action => action !== 'Dispute');
    return !!getPrimaryAction(actions);
  }, [
    isTG,
    mainButton,
    coreOrder,
    displayOrder,
    isModeratedOrder,
    hasAfterSaleDispute,
    shouldBlockAutoRefund,
  ]);

  useEffect(() => {
    if (!isTG || !mainButton || !coreOrder || !displayOrder) return;

    const actions = getOrderActions(
      coreOrder.state || 'PENDING',
      displayOrder.userRole as CoreUserRole,
      {
        isModerated: isModeratedOrder,
        isShipped: isOrderShipped(coreOrder),
        paymentMethod: coreOrder.contract?.paymentSent?.method?.toString(),
        hasRated: displayOrder.hasRated,
        inAfterSaleWindow: displayOrder.protection?.stage === 'AFTER_SALE_WINDOW',
        hasAfterSaleDispute,
        fundsReleasedAtConfirmation: shouldBlockAutoRefund,
      }
    ).filter(action => action !== 'Dispute');
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
  }, [
    isTG,
    mainButton,
    coreOrder,
    displayOrder,
    isModeratedOrder,
    hasAfterSaleDispute,
    shouldBlockAutoRefund,
  ]);

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
          <Button onClick={() => router.push(listBackPath)} size="sm">
            {t('order.backToOrders')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header — use "Case #XYZ" for moderator dispute view */}
      <MobilePageHeader
        title={
          isModeratorDisputeView
            ? `${t('moderation.caseIdLabel')} ${displayOrder.orderId.length > 12 ? `${displayOrder.orderId.slice(0, 6)}…${displayOrder.orderId.slice(-4)}` : displayOrder.orderId}`
            : t('order.details')
        }
        onBack={
          isModeratorDisputeView ? () => router.push('/cases') : () => router.push(listBackPath)
        }
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
            onClick={() => handleTabChange('details')}
            className={cn(
              'flex-1 py-2.5 text-sm font-medium text-center transition-colors relative',
              activeTab === 'details'
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {isModeratorDisputeView ? t('order.tabs.dispute') : t('order.tabs.summary')}
            {activeTab === 'details' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
          {isModeratorDisputeView && showModeratorEvidenceTab && (
            <button
              role="tab"
              aria-selected={activeTab === 'evidence'}
              aria-controls="tabpanel-evidence"
              id="tab-evidence"
              onClick={() => handleTabChange('evidence')}
              className={cn(
                'flex-1 py-2.5 text-sm font-medium text-center transition-colors relative',
                activeTab === 'evidence'
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {t('order.tabs.evidence')}
              {activeTab === 'evidence' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
          )}
          <button
            role="tab"
            aria-selected={activeTab === 'discussion'}
            aria-controls="tabpanel-discussion"
            id="tab-discussion"
            onClick={() => handleTabChange('discussion')}
            className={cn(
              'flex-1 py-2.5 text-sm font-medium text-center transition-colors relative flex items-center justify-center gap-1.5',
              activeTab === 'discussion'
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <MessageCircle className="w-4 h-4 shrink-0" />
            <span className="truncate">{t('order.tabs.discussion')}</span>
            {orderChat.unreadCount > 0 && (
              <span className="px-1.5 py-0.5 min-w-[1.25rem] text-center bg-error text-white text-[10px] font-semibold rounded-full tabular-nums">
                {orderChat.unreadCount > 99 ? '99+' : orderChat.unreadCount}
              </span>
            )}
            {activeTab === 'discussion' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      {activeTab === 'details' && (
        <div
          role="tabpanel"
          id="tabpanel-details"
          aria-labelledby="tab-details"
          className="px-4 pt-3 space-y-4"
        >
          <OrderCreatedAtMeta createdAt={displayOrder.createdAt} />

          {/* ─── MODERATOR DISPUTE VIEW ─── */}
          {isModeratorDisputeView ? (
            <>
              <DisputeOverviewCard displayOrder={displayOrder} />

              {/* Collapsible order context */}
              <details className="group rounded-xl border border-border/60 overflow-hidden">
                <summary className="flex items-center justify-between px-4 py-3 bg-muted/30 cursor-pointer select-none text-sm font-medium text-foreground list-none">
                  {t('order.orderSummary')}
                  <svg
                    className="w-4 h-4 text-muted-foreground transition-transform group-open:rotate-180"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </summary>
                <div className="p-4 space-y-4">
                  <OrderSummaryCard displayOrder={displayOrder} statusLabel={statusLabel} />
                  <OrderPaymentCard displayOrder={displayOrder} coreOrder={coreOrder} />
                  <OrderTimelineCard
                    displayOrder={displayOrder}
                    coreOrder={coreOrder}
                    settlementAction={latestSettlementAction}
                  />
                </div>
              </details>

              {/* Spacer to prevent content being hidden behind sticky DisputeResolutionBar */}
              <div className="h-20" />
            </>
          ) : (
            <>
              {/* 1. Status — dispute summary for active crypto disputes */}
              {!isModeratorDisputeView &&
                (hasActiveCryptoDispute ? (
                  <DisputeSummaryCard
                    displayOrder={displayOrder}
                    onOpenDiscussion={() => handleTabChange('discussion')}
                  />
                ) : (
                  <OrderStatusCard displayOrder={displayOrder} />
                ))}

              {!(
                displayOrder.userRole === 'buyer' && displayOrder.status === 'awaiting_payment'
              ) && (
                <OrderSettlementCard
                  settlementAction={latestSettlementAction}
                  paymentCoin={displayOrder.paymentCoin}
                  chainId={displayOrder.chainId}
                  cancellation={displayOrder.cancellation}
                />
              )}

              {/* 2. Product card (vendor merged inline) */}
              <OrderProductCard displayOrder={displayOrder} />

              {displayOrder.userRole === 'seller' && (
                <SellerDigitalDeliveryStatus
                  {...sellerDigitalDelivery}
                  canSyncDelivery={
                    coreOrder?.state === 'AWAITING_SHIPMENT' &&
                    sellerDigitalDelivery.canSyncDelivery
                  }
                  onSyncDelivery={sellerDigitalDelivery.syncDelivery}
                  onRetryDelivery={sellerDigitalDelivery.retryDelivery}
                  onManageListing={slug =>
                    window.open(`/listing/edit/${slug}?from=orders`, '_blank')
                  }
                  orderId={orderId}
                  listingSlugs={sellerDigitalDelivery.listingSlugs}
                  orderInDispute={hasActiveCryptoDispute}
                  orderStatus={displayOrder.status}
                  disputePhase={digitalEntitlementDisputePhase}
                />
              )}

              {/* 2b. Buyer digital downloads — License keys, file links, etc. */}
              {displayOrder.userRole === 'buyer' && (
                <BuyerDigitalAssetsSection
                  orderId={orderId}
                  sellerPeerID={displayOrder.vendor.peerID}
                  deliveredAt={getDigitalDeliveryTimestamp(displayOrder.shipments, orderId)}
                  disputePhase={digitalEntitlementDisputePhase}
                  disputeResolution={displayOrder.dispute?.resolution}
                  buyerPayoutPercent={displayOrder.dispute?.buyerPayoutPercent}
                />
              )}

              {displayOrder.shipments && displayOrder.shipments.length > 0 && (
                <OrderShipment
                  shipments={displayOrder.shipments}
                  orderId={orderId}
                  userRole={displayOrder.userRole}
                />
              )}

              {/* 3. Order summary — total, shipping, status badge */}
              <OrderSummaryCard displayOrder={displayOrder} statusLabel={statusLabel} />

              {/* 4a. Fiat dispute banner (independent of order state) */}
              {displayOrder.fiatDispute && (
                <FiatDisputeBanner
                  fiatDispute={displayOrder.fiatDispute}
                  userRole={displayOrder.userRole}
                />
              )}

              {/* 4b. Dispute — archive for resolved, open banner only while active */}
              <div ref={disputeSectionRef}>
                {displayOrder.dispute &&
                  displayOrder.userRole !== 'moderator' &&
                  showDisputeArchive && (
                    <DisputeHistoryCard
                      displayOrder={displayOrder}
                      onOpenDiscussion={() => handleTabChange('discussion')}
                      className="mb-4"
                    />
                  )}
                {displayOrder.dispute &&
                  displayOrder.userRole !== 'moderator' &&
                  !hasActiveCryptoDispute &&
                  !showDisputeArchive && (
                    <OrderDisputeBanner
                      displayOrder={displayOrder}
                      onOpenDispute={() => handleOrderAction('Dispute')}
                    />
                  )}
              </div>

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
                          <p className="text-sm font-medium text-foreground">
                            {displayOrder.shipper}
                          </p>
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
                  isModerated={isModeratedOrder}
                  moderatorName={displayOrder.moderator?.name}
                  canOpenDispute={canOpenModeratedDispute}
                  onOpenDispute={() => handleOrderAction('Dispute')}
                  onExtendProtection={handleExtendProtection}
                  disputeRulingPendingAcceptance={disputeRulingPendingAcceptance}
                />
              )}

              {showRatingInvite && (
                <RatingInviteBanner
                  onWriteReview={openReviewDialog}
                  onReportIssue={
                    displayOrder.protection?.stage === 'AFTER_SALE_WINDOW'
                      ? () => {
                          setIsAfterSaleDispute(true);
                          setShowDisputeModal(true);
                        }
                      : undefined
                  }
                  disputeFiled={hasAfterSaleDispute}
                />
              )}

              {displayOrder.buyerRating && (
                <OrderRating
                  rating={displayOrder.buyerRating}
                  reviewer={
                    displayOrder.buyer?.peerID
                      ? {
                          peerID: displayOrder.buyer.peerID,
                          name: displayOrder.buyer.name,
                          avatar: displayOrder.buyer.avatar,
                        }
                      : undefined
                  }
                  timestamp={displayOrder.buyerRating.timestamp}
                />
              )}

              {displayOrder.afterSaleDispute && (
                <AfterSaleDisputeCard
                  dispute={displayOrder.afterSaleDispute}
                  userRole={displayOrder.userRole}
                  onMessageCounterparty={() => {
                    handleTabChange('discussion');
                    orderChat.focusComposer();
                  }}
                  className="mt-3"
                />
              )}

              {/* 6. Payment info */}
              {(displayOrder.paymentTx ||
                displayOrder.paymentLocked ||
                displayOrder.fiatPayment) && (
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

              {/* 7.5. Fulfillment status — seller-only, supply-chain orders */}
              {supplyChainEnabled && displayOrder.userRole === 'seller' && (
                <FulfillmentStatusCard orderId={orderId} />
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
                    {displayOrder.moderator && (
                      <ModeratorBadge moderator={displayOrder.moderator} />
                    )}
                    {(displayOrder.notes || displayOrder.alternateContactInfo) && (
                      <OrderMemoCard displayOrder={displayOrder} />
                    )}
                  </div>
                </div>
              )}

              {/* 9. Order history timeline */}
              <div>
                <SectionTitle>{t('order.orderHistory')}</SectionTitle>
                <OrderTimelineCard
                  displayOrder={displayOrder}
                  coreOrder={coreOrder}
                  settlementAction={latestSettlementAction}
                />
              </div>

              {/* 10. Subtle dispute entry — moderated orders only */}
              {!displayOrder.protection && canOpenModeratedDispute && (
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
            </>
          )}
        </div>
      )}

      {activeTab === 'evidence' && isModeratorDisputeView && displayOrder.dispute && (
        <div
          role="tabpanel"
          id="tabpanel-evidence"
          aria-labelledby="tab-evidence"
          className="px-4 pt-3 pb-6"
        >
          <DisputeEvidencePanel
            dispute={displayOrder.dispute}
            onOpenDiscussion={() => handleTabChange('discussion')}
          />
        </div>
      )}

      {activeTab === 'discussion' && (
        <div
          role="tabpanel"
          id="tabpanel-discussion"
          aria-labelledby="tab-discussion"
          className="flex flex-col h-[calc(100dvh-7.5rem)] min-h-0"
        >
          {displayOrder && (
            <OrderChatContextStrip
              displayOrder={displayOrder}
              onBackToSummary={() => handleTabChange('details')}
              compact
            />
          )}
          <OrderChat
            orderId={orderId}
            layout="embedded"
            className="flex-1 min-h-0 mx-4 mb-3 rounded-xl"
            {...orderChat}
          />
        </div>
      )}

      {/* Sticky bottom DisputeResolutionBar — moderator dispute view only */}
      {isModeratorDisputeView && activeTab === 'details' && displayOrder.dispute && (
        <DisputeResolutionBar
          dispute={displayOrder.dispute}
          onOpenRuling={openRulingSheet}
          isResolving={isResolving}
          isOpeningSheet={isOpeningSheet}
          variant="sticky"
        />
      )}

      {showDisputeDiscussionBar && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <p className="text-xs font-medium text-warning mb-2">
            {t('order.footer.disputeReviewing')}
          </p>
          <Button
            className="w-full h-12 text-[15px] font-semibold"
            onClick={() => handleTabChange('discussion')}
            data-testid="order-mobile-footer-open-discussion"
          >
            {t('order.actions.openDiscussion')}
          </Button>
        </div>
      )}

      {/* Fixed bottom action bar — hidden for moderator view, rating invite, or TG MainButton active */}
      {!showDisputeDiscussionBar &&
        !isModeratorDisputeView &&
        activeTab === 'details' &&
        coreOrder &&
        !tgMainButtonActive &&
        !showRatingInvite &&
        !showReviewDialog &&
        !showConfirmReceiptDialog &&
        !showAcceptPayoutDialog && (
          <OrderActionSheet
            orderState={coreOrder.state || 'PENDING'}
            userRole={displayOrder.userRole as CoreUserRole}
            timestamp={displayOrder.createdAt}
            isModerated={isModeratedOrder}
            isShipped={isOrderShipped(coreOrder)}
            paymentMethod={coreOrder.contract?.paymentSent?.method?.toString()}
            fundsReleasedAtConfirmation={shouldBlockAutoRefund}
            inAfterSaleWindow={displayOrder.protection?.stage === 'AFTER_SALE_WINDOW'}
            hasAfterSaleDispute={hasAfterSaleDispute}
            contractType={shipOrderProps.contractType}
            hasPreconfiguredDigitalAssets={sellerDigitalDelivery.hasPreconfiguredAssets}
            digitalDeliveryStatus={sellerDigitalDelivery.status}
            canSyncDigitalDelivery={sellerDigitalDelivery.canSyncDelivery}
            canRetryDigitalDelivery={sellerDigitalDelivery.canRetryDelivery}
            manualDigitalFallbackAllowed={sellerDigitalDelivery.manualFallbackAllowed}
            isTransitioning={isTransitioning || isActionLoading}
            onAction={handleOrderAction}
          />
        )}

      {/* Dialogs */}
      {confirmDialog && (
        <OrderConfirmDialog
          open={!!confirmDialog}
          onOpenChange={open => {
            if (!open && !isActionLoading) setConfirmDialog(null);
          }}
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
        paymentEscrowType={acceptOrderProps.paymentEscrowType}
        paymentProductMode={acceptOrderProps.paymentProductMode}
        contractType={acceptOrderProps.contractType}
        onSuccess={acceptOrderProps.onSuccess}
      />

      <ShipOrderDialog
        open={showShipDialog}
        onOpenChange={setShowShipDialog}
        orderId={shipOrderProps.orderId}
        contractType={shipOrderProps.contractType}
        blockchain={shipOrderProps.blockchain}
        itemCount={displayOrder?.items?.length || 1}
        onSuccess={shipOrderProps.onSuccess}
      />

      <OrderContractView
        open={showContractModal}
        onOpenChange={setShowContractModal}
        coreOrder={coreOrder}
        onCopy={copyContract}
      />

      <ConfirmReceiptDialog
        open={showConfirmReceiptDialog}
        onOpenChange={open => !open && closeConfirmReceiptDialog()}
        onConfirm={() => void confirmReceipt()}
        isLoading={isActionLoading}
        completePhase={completePhase}
        isModerated={isModeratedOrder}
        contractType={displayOrder?.contractType}
      />

      {displayOrder?.dispute && (
        <AcceptPayoutDialog
          open={showAcceptPayoutDialog}
          onOpenChange={open => !open && closeAcceptPayoutDialog()}
          onConfirm={async () => {
            const ok = await confirmAcceptPayout();
            if (ok) haptic.success();
            else haptic.error();
          }}
          isLoading={isActionLoading}
          acceptPayoutPhase={acceptPayoutPhase}
          isModerated={isModeratedOrder}
          dispute={displayOrder.dispute}
          settlementBreakdown={displayOrder.settlementBreakdown}
          paymentCoin={coreOrder?.contract?.paymentSent?.coin}
        />
      )}

      <WriteReviewDialog
        open={showReviewDialog}
        productTitle={reviewProductTitle}
        onSubmit={async data => {
          await submitRating(data);
          haptic.success();
        }}
        onSkip={closeReviewDialog}
        onClose={closeReviewDialog}
        isSubmitting={isActionLoading}
        completePhase={completePhase}
        isRateOnly
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

      <ModeratorDisputeRulingDialog
        open={isSheetOpen}
        onOpenChange={open => {
          if (!open) closeSheet();
        }}
        draft={rulingDraft}
        validationErrors={rulingValidationErrors}
        activePreset={activePreset}
        vendorNotConfirmed={vendorNotConfirmed}
        constraints={rulingConstraints}
        buyerLabel={moderatorRulingBuyerLabel}
        sellerLabel={moderatorRulingSellerLabel}
        isSubmitting={isResolving}
        onApplyPreset={applyPreset}
        onBuyerPercentageChange={setBuyerPercentage}
        onVendorPercentageChange={setVendorPercentage}
        onResolutionChange={setResolution}
        onSubmit={submitRuling}
      />
    </div>
  );
}
