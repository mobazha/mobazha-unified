'use client';

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Header, Footer, MobilePageHeader } from '@/components';
import {
  PaymentMethodSummary,
  PaymentProtectionCard,
  CheckoutBottomBar,
  TransactionOverlay,
  FiatPaymentSection,
  OnrampFundingSection,
  ExternalWalletPayment,
  PaymentRefundSection,
  PaymentSelectionQuoteReview,
} from '@/components/Payment';
import type {
  PaymentStep,
  FiatPaymentSuccessResult,
  ExternalWalletPaymentInfo,
} from '@/components/Payment';
import { getTokenById } from '@/components/Payment/config';
import { OrderSummaryCard } from '@/components/Order';
import { Container, HStack, VStack } from '@/components/layouts';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton-compat';
import { CheckoutProgressBar } from '@/components/Checkout/CheckoutProgressBar';
import { usePaymentSelector } from '@/hooks/usePaymentSelector';
import {
  useCurrency,
  useRateFreshness,
  useI18n,
  ordersApi,
  onWebSocketMessage,
  onWebSocketStatusChange,
  usePaymentReadinessPoll,
  profileApi,
  getImageUrl,
  resolveChainCategory,
  convertCurrency,
  toMinimalUnit,
  getBaseRateSymbol,
  getPaymentReadinessBlockedCopyKeys,
  shouldShowPaymentReadinessPlaceholder,
  resolveBuyerRefundAddress,
  resolveAccountDefaultRefundAddress,
  loadRefundReceivingPreferencesSafe,
  persistRefundReceivingAddressBestEffort,
  isRetiredPaymentChain,
  useFiatPaymentVisible,
  sanitizeCheckoutTokenId,
  resolveCheckoutPaymentPolicyFromCheckoutItems,
  hasAuthoritativeCollectibleTitleMetadata,
  parseCollectibleListingMetadata,
  normalizeOrderOpenListings,
  isDealBackedOrder,
  usePaymentSelectionQuote,
  buildCanonicalFiatPaymentCoin,
  resolveCheckoutCanonicalPaymentCoin,
  isPaymentSelectionQuoteProvisioned,
  type WebSocketMessage,
} from '@mobazha/core';
import type { Order, PaymentSession, OnrampFundingSourceView } from '@mobazha/core';
import {
  buildFiatPaymentCancelUrl,
  buildFiatPaymentVerificationUrl,
  isActivePaymentOrderFetch,
  resolvePaymentPageOrderDestination,
  resolvePaymentRuntimeVendorPeerID,
  resolvePaymentPageRestoreOptions,
} from './paymentPolicyRestore';
import {
  resolveDealDefaultProtectionProvider,
  resolveDealDefaultTokenID,
} from './dealPaymentDefaults';
import { useToast } from '@/components/ui/use-toast';
import { useHaptic } from '@/lib/platform';
import { orderDetailPath } from '@/lib/ordersNavigation';

// Types
interface OrderDetails {
  orderID: string;
  status: string;
  items: {
    id: string;
    title: string;
    price: number;
    currency: string;
    quantity: number;
    image: string;
  }[];
  vendor: {
    name: string;
    peerID: string;
    avatar?: string;
  };
  shippingAddress: {
    name: string;
    street: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
  };
  memo?: string;
  subtotal: number;
  shipping: number;
  total: number;
  currency: string;
  paymentAddress?: string;
  paymentAmount?: {
    amount: string;
    currency: string;
  };
  contractType?: string;
  rawOrderAmount?: number;
}

interface FiatConfirmationContext {
  providerID: string;
  amount?: number;
}

function buildConfirmationUrl(details: OrderDetails, fiat?: FiatConfirmationContext): string {
  const url = new URL('/checkout/confirmation', window.location.origin);
  url.searchParams.set('orderID', details.orderID);
  url.searchParams.set('total', String(details.total));
  url.searchParams.set('currency', details.currency);
  if (details.items[0]?.title) url.searchParams.set('title', details.items[0].title);
  if (details.items[0]?.id) url.searchParams.set('slug', details.items[0].id);
  if (details.vendor?.name) url.searchParams.set('vendorName', details.vendor.name);
  if (details.vendor?.peerID) url.searchParams.set('vendorPeerID', details.vendor.peerID);
  if (fiat?.providerID) {
    url.searchParams.set('fiatProvider', fiat.providerID);
    if (typeof fiat.amount === 'number' && Number.isFinite(fiat.amount) && fiat.amount > 0) {
      url.searchParams.set('fiatAmount', String(Math.floor(fiat.amount)));
    }
  }
  return url.toString();
}

function buildConfirmationUrlFromOrderID(orderID: string): string {
  const url = new URL('/checkout/confirmation', window.location.origin);
  url.searchParams.set('orderID', orderID);
  return url.toString();
}

function formatCryptoAmountForSummary(rawAmount: string, decimals: number): string {
  const num = Number(rawAmount);
  if (!num || !Number.isFinite(num)) return '0';
  const result = num / Math.pow(10, decimals);
  return result.toFixed(decimals).replace(/\.?0+$/, '') || '0';
}

function formatExternalPaymentAmountForSummary(info: ExternalWalletPaymentInfo): string {
  if (info.amountIsDecimal) {
    return info.amount.replace(/\.?0+$/, '') || '0';
  }
  return formatCryptoAmountForSummary(info.amount, info.decimals ?? 8);
}

function externalWalletInfoFromSession(
  session: PaymentSession,
  tokenId: string | null,
  fallbackCoin: string
): ExternalWalletPaymentInfo {
  const target = session.fundingTarget;
  if (session.settlementMode !== 'address_monitored' || target.type !== 'address') {
    throw new Error('payment session is not address-monitored');
  }
  if (!target.address) {
    throw new Error('payment session has no funding address');
  }

  const tokenInfo = tokenId ? getTokenById(tokenId) : null;
  return {
    paymentAddress: target.address,
    paymentURI: target.qrPayload,
    amount:
      target.amount || session.expectedAmount || session.paymentProgress.requiredAmount || '0',
    amountIsDecimal: true,
    coin: tokenId || session.paymentCoin || fallbackCoin,
    decimals: tokenInfo?.decimals ?? 8,
    qrCodeData: target.qrPayload,
    expiresAt: session.expiresAt,
    orderID: session.orderID,
    observedAmount: session.paymentProgress?.observedAmount,
    requiredAmount: session.paymentProgress?.requiredAmount,
    remainingAmount: session.paymentProgress?.remainingAmount,
    observedPayments: session.paymentProgress?.observations?.map(observation => ({
      id: observation.id,
      txHash: observation.txHash,
      hasChainTxHash: observation.hasChainTxHash,
      eventIndex: observation.eventIndex,
      amount: observation.amount,
      status: observation.status,
      confirmations: observation.confirmations,
      observedAt: observation.observedAt,
    })),
  };
}

function hasExchangeRateForConversion(
  rates: Record<string, number>,
  fromCurrency?: string,
  toCurrency?: string
): boolean {
  if (!fromCurrency || !toCurrency) return false;

  const fromCode = getBaseRateSymbol(fromCurrency.toUpperCase());
  const toCode = getBaseRateSymbol(toCurrency.toUpperCase());
  if (fromCode === toCode) return true;

  return rates[fromCode] > 0 && rates[toCode] > 0;
}

const PAYMENT_OPEN_STATES = new Set(['AWAITING_PAYMENT', 'AWAITING_PAYMENT_VERIFICATION']);

function isPaymentOpenState(state?: string | null): boolean {
  return !!state && PAYMENT_OPEN_STATES.has(state);
}

function isPaymentSessionVerified(session?: PaymentSession | null): boolean {
  return session?.status?.toLowerCase() === 'verified';
}

/**
 * Payment Page - 支付阶段
 *
 * 用户在此页面：
 * 1. 查看订单摘要（只读）
 * 2. 选择支付方式
 * 3. 选择是否启用支付保护
 * 4. 选择仲裁人
 * 5. 点击"支付"执行支付
 *
 * 入口：
 * - 创建订单后跳转 /payment?orderID=xxx
 * - 从订单详情页点击"支付" /payment?orderID=xxx
 */
export default function PaymentPage() {
  const fiatVisible = useFiatPaymentVisible();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { renderPairedPrice, rates } = useCurrency();
  const { secondsAgo } = useRateFreshness('payment');
  const { t } = useI18n();
  const { toast } = useToast();
  const haptic = useHaptic();

  // 从 URL 获取参数
  const orderID = searchParams.get('orderID');
  const urlAmount = searchParams.get('amount');
  const urlCurrency = searchParams.get('currency');
  const urlTitle = searchParams.get('title');
  const urlVendorName = searchParams.get('vendorName');
  const urlVendorPeerID = searchParams.get('vendorPeerID');
  const urlQuantity = searchParams.get('quantity');
  const urlContractType = searchParams.get('contractType');
  const urlImage = searchParams.get('image');
  const urlPaymentPolicy = searchParams.get('paymentPolicy');
  const isDealPaymentEntry = searchParams.get('source') === 'deal_link';
  const isFiatProviderReturn = searchParams.get('fiatReturn') === '1';

  // 订单数据状态
  const [isLoadingOrder, setIsLoadingOrder] = useState(true);
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [rawOrder, setRawOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isDealBacked = useMemo(
    () => isDealPaymentEntry || isDealBackedOrder(rawOrder),
    [isDealPaymentEntry, rawOrder]
  );

  // 支付状态
  const [paymentStep, setPaymentStep] = useState<PaymentStep>(() =>
    isFiatProviderReturn ? 'submitted' : 'idle'
  );
  const [submittedTxHash, setSubmittedTxHash] = useState<string>();
  const [paymentError, setPaymentError] = useState<string>();
  const isProcessing = paymentStep !== 'idle' && paymentStep !== 'failed';
  const shouldBlockNavigation =
    paymentStep === 'confirming' || paymentStep === 'submitted' || paymentStep === 'completing';
  const navigationGuardRef = useRef<((e: Event) => void) | null>(null);
  /** Order ID whose listing metadata resolved checkout payment policy (authoritative lock). */
  const orderPaymentPolicyLockedOrderRef = useRef<string | null>(null);
  const activeOrderIDRef = useRef(orderID);

  useEffect(() => {
    activeOrderIDRef.current = orderID;
    orderPaymentPolicyLockedOrderRef.current = null;
  }, [orderID]);

  const clearNavigationGuard = useCallback(() => {
    const handler = navigationGuardRef.current;
    if (!handler) return;
    window.removeEventListener('beforeunload', handler);
    navigationGuardRef.current = null;
  }, []);
  const [paymentProtectionEnabled, setPaymentProtectionEnabled] = useState(true);
  const [isCheckingSellerReceipt, setIsCheckingSellerReceipt] = useState(false);
  const [isCancelingOrder, setIsCancelingOrder] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [refundWalletAddress, setRefundWalletAddress] = useState('');
  const [refundAddressPrefilled, setRefundAddressPrefilled] = useState(false);
  const [saveRefundAsDefault, setSaveRefundAsDefault] = useState(false);
  const [payFromCustodial, setPayFromCustodial] = useState(false);
  const [paymentSession, setPaymentSession] = useState<PaymentSession | null>(null);

  // The onramp funding leg is buyer-side. The payment session may be re-fetched
  // through vendor routing (whose view omits onrampFunding), so hold the source
  // in resilient local state seeded from any session that carries it and kept
  // fresh by the section's own refresh — a vendor-routed re-fetch must not
  // unmount the card. (ADR-019)
  const [onrampSource, setOnrampSource] = useState<OnrampFundingSourceView | null>(null);
  useEffect(() => {
    if (paymentSession?.onrampFunding) setOnrampSource(paymentSession.onrampFunding);
  }, [paymentSession?.onrampFunding]);
  // Buyer-side entry point to start onramp funding (ADR-019). Fail-closed:
  // if the backend advertises no onramp provider for this rail the initiate
  // call errors and the affordance hides itself, so a fail-closed node shows
  // nothing. The provider id targets the dev mock onramp module.
  const [onrampInitBusy, setOnrampInitBusy] = useState(false);
  const [onrampInitHidden, setOnrampInitHidden] = useState(false);

  const paymentReadinessPollEnabled =
    Boolean(orderID) && Boolean(orderDetails) && isPaymentOpenState(orderDetails?.status);

  const paymentVendorPeerID = resolvePaymentRuntimeVendorPeerID({
    isDealBacked,
    vendorPeerID: orderDetails?.vendor?.peerID || urlVendorPeerID,
  });

  const {
    isCheckingReadiness,
    isAwaitingSellerReceipt,
    isReadyToPay,
    readinessFetchError,
    isFetchingSession,
    readinessUxTier,
    showReadinessRecovery,
    refresh: refreshPaymentReadiness,
  } = usePaymentReadinessPoll(orderID ?? undefined, {
    enabled: paymentReadinessPollEnabled,
    vendorPeerID: paymentVendorPeerID,
  });

  const isPaymentBlocked =
    Boolean(readinessFetchError) || isCheckingReadiness || isAwaitingSellerReceipt;

  const readinessBlockedCopy = useMemo(
    () =>
      getPaymentReadinessBlockedCopyKeys({
        tier: readinessUxTier,
        showRecovery: showReadinessRecovery,
      }),
    [readinessUxTier, showReadinessRecovery]
  );

  const handleCheckSellerReceiptAgain = useCallback(async () => {
    if (!orderID) return;
    setIsCheckingSellerReceipt(true);
    try {
      const session = await refreshPaymentReadiness();
      const ready = session?.paymentReadiness?.status === 'ready_to_pay';
      if (!ready) {
        toast({
          title: t('payment.checkSellerReceiptAgain'),
          description: t('payment.checkSellerReceiptAgainHint'),
        });
      }
    } finally {
      setIsCheckingSellerReceipt(false);
    }
  }, [orderID, refreshPaymentReadiness, t, toast]);

  const handleCancelUnpaidOrder = useCallback(async () => {
    if (!orderID) return;
    setIsCancelingOrder(true);
    try {
      const result = await ordersApi.cancelOrder({ orderID });
      if (result?.success === false) {
        throw new Error(result.error || t('common.error'));
      }
      setShowCancelConfirm(false);
      router.push(orderDetailPath(orderID, 'purchase'));
    } catch (err) {
      toast({
        title: t('common.error'),
        description: err instanceof Error ? err.message : undefined,
        variant: 'destructive',
      });
    } finally {
      setIsCancelingOrder(false);
    }
  }, [orderID, router, t, toast]);

  // 使用支付选择器 Hook
  const {
    selectedTokenId,
    selectedFiatProvider,
    selectedModerator: paymentModerator,
    availableFiatProviders,
    availableCryptoTokenIds,
    moderators,
    isLoadingModerators,
    openPaymentSelector,
    openModeratorSelector,
    restoreFromSession,
    setSelectedTokenId,
    setSelectedModerator,
    setCheckoutPaymentPolicy,
    setCheckoutAcceptedCurrencies,
    setVendorPeerID,
    showFiatCheckoutMethods,
  } = usePaymentSelector();

  const visibleTokenId = useMemo(() => sanitizeCheckoutTokenId(selectedTokenId), [selectedTokenId]);
  const visibleFiatProvider =
    fiatVisible &&
    showFiatCheckoutMethods &&
    selectedFiatProvider &&
    availableFiatProviders.includes(selectedFiatProvider)
      ? selectedFiatProvider
      : undefined;

  const fiatVerificationReturnUrl = useMemo(() => {
    if (!orderDetails || !visibleFiatProvider || typeof window === 'undefined') return undefined;
    return buildFiatPaymentVerificationUrl({
      origin: window.location.origin,
      orderID: orderDetails.orderID,
      vendorPeerID: orderDetails.vendor.peerID,
      providerID: visibleFiatProvider,
      isDealBacked,
    });
  }, [isDealBacked, orderDetails, visibleFiatProvider]);

  const fiatCancelReturnUrl = useMemo(() => {
    if (!orderDetails || !visibleFiatProvider || typeof window === 'undefined') return undefined;
    return buildFiatPaymentCancelUrl({
      origin: window.location.origin,
      orderID: orderDetails.orderID,
      vendorPeerID: orderDetails.vendor.peerID,
      providerID: visibleFiatProvider,
      isDealBacked,
    });
  }, [isDealBacked, orderDetails, visibleFiatProvider]);

  const orderAcceptedCurrencies = useMemo(() => {
    if (!isDealBacked) return undefined;
    const listings = normalizeOrderOpenListings(rawOrder?.contract?.orderOpen?.listings);
    return listings[0]?.metadata?.acceptedCurrencies ?? [];
  }, [isDealBacked, rawOrder]);

  useEffect(() => {
    setCheckoutAcceptedCurrencies(orderAcceptedCurrencies);
    return () => setCheckoutAcceptedCurrencies(undefined);
  }, [orderAcceptedCurrencies, setCheckoutAcceptedCurrencies]);

  useEffect(() => {
    const defaultTokenID = resolveDealDefaultTokenID({
      isDealBacked,
      currentTokenID: visibleTokenId,
      availableCryptoTokenIds,
      hasVisibleFiatMethod: showFiatCheckoutMethods && availableFiatProviders.length > 0,
    });
    if (defaultTokenID) setSelectedTokenId(defaultTokenID);
  }, [
    availableCryptoTokenIds,
    availableFiatProviders.length,
    isDealBacked,
    setSelectedTokenId,
    showFiatCheckoutMethods,
    visibleTokenId,
  ]);

  useEffect(() => {
    const defaultProvider = resolveDealDefaultProtectionProvider({
      isDealBacked,
      protectionEnabled: paymentProtectionEnabled,
      isLoading: isLoadingModerators,
      currentProviderPeerID: paymentModerator?.peerID,
      candidates: moderators,
    });
    if (defaultProvider) setSelectedModerator(defaultProvider);
  }, [
    isDealBacked,
    isLoadingModerators,
    moderators,
    paymentModerator?.peerID,
    paymentProtectionEnabled,
    setSelectedModerator,
  ]);

  const selectedPaymentCoin = useMemo(() => {
    const tokenId = (visibleTokenId || '').trim();
    if (!tokenId) return '';
    return getTokenById(tokenId)?.assetId?.trim() || tokenId;
  }, [visibleTokenId]);

  const checkoutCanonicalPaymentCoin = useMemo(
    () =>
      resolveCheckoutCanonicalPaymentCoin({
        tokenAssetId: selectedPaymentCoin || undefined,
        fiatProviderID: visibleFiatProvider,
        fiatCurrency: orderDetails?.currency,
      }),
    [selectedPaymentCoin, visibleFiatProvider, orderDetails?.currency]
  );

  const dealQuoteRequired =
    isDealBacked && Boolean(orderID) && isPaymentOpenState(orderDetails?.status);
  const paymentSelectionQuoteEnabled = dealQuoteRequired && Boolean(checkoutCanonicalPaymentCoin);

  const {
    quote: paymentSelectionQuote,
    loading: paymentSelectionQuoteLoading,
    error: paymentSelectionQuoteError,
    expired: paymentSelectionQuoteExpired,
    retry: retryPaymentSelectionQuote,
    canUseQuote: canUsePaymentSelectionQuote,
    paymentSelectionQuoteID: usablePaymentSelectionQuoteID,
  } = usePaymentSelectionQuote({
    enabled: paymentSelectionQuoteEnabled,
    orderID: orderID ?? undefined,
    paymentCoin: checkoutCanonicalPaymentCoin,
    vendorPeerID: paymentVendorPeerID,
    isDealBacked,
  });

  const paymentSelectionQuoteProvisioned = isPaymentSelectionQuoteProvisioned(
    paymentSelectionQuote,
    paymentSession
  );
  const paymentSelectionQuoteAuthorizesPayment =
    canUsePaymentSelectionQuote || paymentSelectionQuoteProvisioned;
  const paymentSelectionQuoteID = canUsePaymentSelectionQuote
    ? usablePaymentSelectionQuoteID
    : paymentSelectionQuoteProvisioned
      ? paymentSelectionQuote?.id
      : undefined;

  const dealQuoteBlocksPayment =
    dealQuoteRequired && (!checkoutCanonicalPaymentCoin || !paymentSelectionQuoteAuthorizesPayment);
  const showFiatPaymentForm =
    Boolean(visibleFiatProvider) &&
    isReadyToPay &&
    !dealQuoteBlocksPayment &&
    paymentStep !== 'submitted';

  // 链类别检测与统一钱包状态
  const chainCategory = selectedPaymentCoin ? resolveChainCategory(selectedPaymentCoin) : null;
  const isRetiredPayment = isRetiredPaymentChain(selectedPaymentCoin);
  const usesPaymentSessionFlow = Boolean(chainCategory);
  const isCryptoPaymentFlow =
    Boolean(visibleTokenId) && !visibleFiatProvider && usesPaymentSessionFlow;
  const resolvedRefundAddress = resolveBuyerRefundAddress(rawOrder, paymentSession);
  const requiresCustodialRefundInput = isCryptoPaymentFlow && payFromCustodial;
  const canProceedToPay = !requiresCustodialRefundInput || refundWalletAddress.trim().length > 0;

  const handleRefundWalletAddressChange = useCallback((value: string) => {
    setRefundWalletAddress(value);
    setRefundAddressPrefilled(false);
  }, []);

  useEffect(() => {
    if (!selectedPaymentCoin || refundWalletAddress.trim() || resolvedRefundAddress) return;

    let cancelled = false;
    void loadRefundReceivingPreferencesSafe().then(prefs => {
      if (cancelled) return;
      const defaultAddr = resolveAccountDefaultRefundAddress(prefs, selectedPaymentCoin);
      if (defaultAddr) {
        setRefundWalletAddress(defaultAddr);
        setRefundAddressPrefilled(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [selectedPaymentCoin, refundWalletAddress, resolvedRefundAddress]);

  // 地址监听支付信息（UTXO / backend-managed settlement）
  const [externalWalletInfo, setExternalWalletInfo] = useState<ExternalWalletPaymentInfo | null>(
    null
  );
  const externalWalletActiveRef = useRef(false);

  useEffect(() => {
    externalWalletActiveRef.current = externalWalletInfo !== null;
  }, [externalWalletInfo]);

  const cryptoRefundSection = isCryptoPaymentFlow ? (
    <PaymentRefundSection
      resolvedAddress={resolvedRefundAddress}
      refundAddress={refundWalletAddress}
      onRefundAddressChange={handleRefundWalletAddressChange}
      payFromCustodial={payFromCustodial}
      onPayFromCustodialChange={setPayFromCustodial}
      refundAddressPrefilled={refundAddressPrefilled}
      saveAsDefault={saveRefundAsDefault}
      onSaveAsDefaultChange={setSaveRefundAsDefault}
      compact
    />
  ) : null;

  // Persist refund address while the QR / copy UI is visible (exchange path).
  useEffect(() => {
    if (!externalWalletInfo || !orderID || !selectedPaymentCoin || !orderDetails) return;
    const trimmed = refundWalletAddress.trim();
    if (!trimmed) return;

    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          await ordersApi.setOrderRefundAddress({
            orderId: orderID,
            refundAddress: trimmed,
            paymentCoin: selectedPaymentCoin,
            vendorPeerID: paymentVendorPeerID,
          });
          const session = await ordersApi.getOrderPaymentSession(orderID, {
            vendorPeerID: paymentVendorPeerID,
          });
          setPaymentSession(session);
        } catch {
          // Silent while typing; explicit save remains on order detail.
        }
      })();
    }, 600);

    return () => window.clearTimeout(timer);
  }, [
    externalWalletInfo,
    orderID,
    selectedPaymentCoin,
    orderDetails,
    refundWalletAddress,
    paymentVendorPeerID,
  ]);

  const showMobileBottomBar =
    Boolean(orderDetails) && !visibleFiatProvider && !externalWalletInfo && !isPaymentBlocked;

  // 切换支付方式时清除外部钱包信息
  useEffect(() => {
    setExternalWalletInfo(null);
  }, [visibleTokenId, visibleFiatProvider]);

  // beforeunload: warn user when payment is in progress
  useEffect(() => {
    if (!shouldBlockNavigation) {
      navigationGuardRef.current = null;
      return;
    }
    const handler = (e: Event) => {
      e.preventDefault();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (e as any).returnValue = '';
    };
    navigationGuardRef.current = handler;
    window.addEventListener('beforeunload', handler);
    return () => {
      navigationGuardRef.current = null;
      window.removeEventListener('beforeunload', handler);
    };
  }, [shouldBlockNavigation]);

  // Payment window countdown (45 min from order creation)
  const [paymentTimeRemaining, setPaymentTimeRemaining] = useState<string | null>(null);
  const [paymentExpired, setPaymentExpired] = useState(false);

  const syncOrderStatus = useCallback(
    async ({ markSuccess = false }: { markSuccess?: boolean } = {}) => {
      if (!orderID) return null;

      const storeOptions = paymentVendorPeerID ? { vendorPeerID: paymentVendorPeerID } : undefined;

      const order = await ordersApi.getOrderDetails(orderID, storeOptions);
      const session = await ordersApi
        .getOrderPaymentSession(orderID, storeOptions)
        .catch(() => null);
      setPaymentSession(session);
      const nextState = typeof order?.state === 'string' ? order.state : null;
      const sessionVerified = isPaymentSessionVerified(session);

      setRawOrder(order);
      if (session && externalWalletActiveRef.current && !sessionVerified) {
        setExternalWalletInfo(
          externalWalletInfoFromSession(session, visibleTokenId ?? null, selectedPaymentCoin)
        );
      }
      if (nextState) {
        const destination = resolvePaymentPageOrderDestination(nextState);
        setOrderDetails(prev => (prev ? { ...prev, status: nextState } : prev));
        if (!isPaymentOpenState(nextState) || sessionVerified) {
          setExternalWalletInfo(null);
          if (markSuccess && destination === 'confirmation') {
            setPaymentStep('success');
            haptic.success();
          }
        }

        if (destination === 'order-detail') {
          clearNavigationGuard();
          router.replace(orderDetailPath(orderID, 'purchase'));
        } else if (sessionVerified) {
          clearNavigationGuard();
          router.replace(
            orderDetails
              ? buildConfirmationUrl(orderDetails)
              : buildConfirmationUrlFromOrderID(orderID)
          );
        }
      }

      void refreshPaymentReadiness();

      return order;
    },
    [
      clearNavigationGuard,
      haptic,
      orderDetails,
      orderID,
      paymentVendorPeerID,
      refreshPaymentReadiness,
      router,
      selectedPaymentCoin,
      visibleTokenId,
    ]
  );

  useEffect(() => {
    if (!rawOrder) return;

    const rawContract = rawOrder.contract as any;
    const backendExpiresAt = rawContract?.ExpiresAt || rawContract?.expiresAt;
    let expiresAt: number;

    if (backendExpiresAt) {
      expiresAt = new Date(backendExpiresAt).getTime();
      if (isNaN(expiresAt)) return;
    } else {
      const orderTimestamp = rawOrder.contract?.orderOpen?.timestamp;
      if (!orderTimestamp) return;
      const FALLBACK_PAYMENT_WINDOW_MS = 60 * 60 * 1000;
      const orderCreatedAt = new Date(orderTimestamp).getTime();
      if (isNaN(orderCreatedAt)) return;
      expiresAt = orderCreatedAt + FALLBACK_PAYMENT_WINDOW_MS;
    }

    const updateTimer = () => {
      const diff = expiresAt - Date.now();
      if (diff <= 0) {
        setPaymentTimeRemaining(null);
        setPaymentExpired(true);
        return;
      }
      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setPaymentTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`);
      setPaymentExpired(false);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [rawOrder]);

  // Restore checkout payment selection from session; URL policy is only a pre-order hint.
  useEffect(() => {
    const restorePaymentSelection = () => {
      restoreFromSession(
        resolvePaymentPageRestoreOptions({
          orderPaymentPolicyLockedForOrderID: orderPaymentPolicyLockedOrderRef.current,
          orderID: orderID ?? undefined,
          urlPaymentPolicy,
        })
      );
    };

    restorePaymentSelection();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        restorePaymentSelection();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [orderID, restoreFromSession, urlPaymentPolicy]);

  // 设置卖家 PeerID 以获取可用法币支付方式
  useEffect(() => {
    if (orderDetails?.vendor?.peerID) {
      setVendorPeerID(orderDetails.vendor.peerID);
    }
  }, [orderDetails?.vendor?.peerID, setVendorPeerID]);

  // 加载订单详情
  useEffect(() => {
    const fetchOrderDetails = async () => {
      const requestedOrderID = orderID;

      if (!requestedOrderID) {
        setError(t('payment.noOrderID'));
        setIsLoadingOrder(false);
        return;
      }

      setIsLoadingOrder(true);
      setError(null);

      const isCurrentOrder = () =>
        isActivePaymentOrderFetch(requestedOrderID, activeOrderIDRef.current);

      try {
        const storeOptions = urlVendorPeerID ? { vendorPeerID: urlVendorPeerID } : undefined;
        // 调用真实的订单详情 API
        const order = await ordersApi.getOrderDetails(requestedOrderID, storeOptions);
        if (!order) {
          throw new Error(t('payment.loadOrderFailed'));
        }
        const session = await ordersApi
          .getOrderPaymentSession(requestedOrderID, storeOptions)
          .catch(() => null);

        if (!isCurrentOrder()) {
          return;
        }

        setPaymentSession(session);
        setRawOrder(order);

        const savedRefundAddress = resolveBuyerRefundAddress(order, session);
        if (savedRefundAddress) {
          setRefundWalletAddress(savedRefundAddress);
          setRefundAddressPrefilled(true);
        } else {
          const settings = await profileApi.getSettings().catch(() => null);
          if (!isCurrentOrder()) {
            return;
          }
          const paymentCoin =
            session?.paymentCoin || order.contract?.paymentSent?.coin || undefined;
          const defaultAddr = resolveAccountDefaultRefundAddress(
            settings?.refundReceivingAddresses,
            paymentCoin
          );
          if (defaultAddr) {
            setRefundWalletAddress(defaultAddr);
            setRefundAddressPrefilled(true);
          } else {
            setRefundAddressPrefilled(false);
          }
        }

        const contract = order.contract;
        // 使用 orderOpen 结构（与桌面端一致）
        const orderOpen = contract?.orderOpen;

        if (!orderOpen) {
          throw new Error('Invalid order data: orderOpen not found');
        }

        // orderOpen 包含 listings（每个元素是 {cid, listing, signature}）和 items
        const rawListings = orderOpen.listings ?? [];
        const orderItems = orderOpen.items ?? [];
        const orderAmount = Number(orderOpen.amount) || 0;
        const shippingInfo = orderOpen.shipping;
        const memo = orderOpen.alternateContactInfo || '';

        // 从第一个 listing 提取定价信息
        const firstListingData = rawListings[0]?.listing;
        let pricingCurrency = 'USD';
        let pricingDivisibility = 2;
        if (firstListingData?.metadata?.pricingCurrency) {
          pricingCurrency = firstListingData.metadata.pricingCurrency.code || 'USD';
          pricingDivisibility = firstListingData.metadata.pricingCurrency.divisibility || 2;
        }
        const vendorInfo = firstListingData?.vendorID;

        // 处理 listings（每个元素是 {cid, listing, signature}）
        const normalizedListings = normalizeOrderOpenListings(rawListings);

        const collectiblePolicyInputs = normalizedListings.map(listing => {
          const isAuthoritativeCollectibleTitle = hasAuthoritativeCollectibleTitleMetadata(listing);
          const collectibleMeta = isAuthoritativeCollectibleTitle
            ? parseCollectibleListingMetadata(listing)
            : undefined;
          return {
            isAuthoritativeCollectibleTitle,
            hubLocation: collectibleMeta?.hubLocation,
          };
        });
        const hasAuthoritativeCollectibleTitle = collectiblePolicyInputs.some(
          item => item.isAuthoritativeCollectibleTitle
        );
        const authoritativePaymentPolicy =
          resolveCheckoutPaymentPolicyFromCheckoutItems(collectiblePolicyInputs);
        if (isCurrentOrder()) {
          orderPaymentPolicyLockedOrderRef.current = requestedOrderID;
          setCheckoutPaymentPolicy(authoritativePaymentPolicy, requestedOrderID);
        }

        const metadata = normalizedListings[0]?.metadata;
        const contractType = urlContractType || metadata?.contractType;
        if (contractType === 'RWA_TOKEN' && !hasAuthoritativeCollectibleTitle) {
          setError(t('payment.rwaNotSupported'));
          return;
        }

        // 转换为 OrderDetails 格式
        let items = normalizedListings.map((listing, index) => {
          const orderItem = orderItems[index] || {};
          // 价格在最小单位中，需要根据 divisibility 转换
          const rawPrice = Number(listing.item?.price) || 0;
          const divisibility =
            listing.metadata?.pricingCurrency?.divisibility || pricingDivisibility;
          const price = rawPrice / Math.pow(10, divisibility);
          const currency = listing.metadata?.pricingCurrency?.code || pricingCurrency;
          const imageUrl = listing.item?.images?.[0]?.medium || listing.item?.images?.[0]?.small;

          return {
            id: listing.slug || `item-${index}`,
            title: listing.item?.title || 'Unknown Product',
            price,
            currency,
            quantity: Number(orderItem.quantity) || Number(orderItem.quantity64) || 1,
            image: getImageUrl(imageUrl) || '',
          };
        });

        // 如果 API 返回的数据为空，使用 URL 参数中的信息
        if (items.length === 0 && urlTitle && urlAmount) {
          const priceNum = parseFloat(urlAmount);
          const quantityNum = parseInt(urlQuantity || '1', 10);
          items = [
            {
              id: 'item-from-url',
              title: urlTitle,
              price: priceNum / quantityNum, // 单价
              currency: urlCurrency || 'USD',
              quantity: quantityNum,
              image: urlImage || '',
            },
          ];
        }

        // 计算总价
        // 优先级：1. URL 参数  2. orderOpen.amount（转换后）  3. 计算值
        const totalFromUrl = urlAmount ? parseFloat(urlAmount) : 0;
        const totalFromOrderOpen =
          orderAmount > 0 ? orderAmount / Math.pow(10, pricingDivisibility) : 0;
        const calculatedSubtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const finalTotal =
          totalFromUrl > 0
            ? totalFromUrl
            : totalFromOrderOpen > 0
              ? totalFromOrderOpen
              : calculatedSubtotal;
        // 运费 = 总价 - 商品小计（如果总价大于小计则差额为运费）
        const shippingAmount = Math.max(0, finalTotal - calculatedSubtotal);

        // 获取卖家 profile（包括名称和头像）
        const vendorPeerID = vendorInfo?.peerID || urlVendorPeerID || '';
        let vendorName = vendorInfo?.handle || urlVendorName || t('order.seller');
        let vendorAvatar: string | undefined;

        if (vendorPeerID) {
          try {
            const vendorProfile = await profileApi.getProfile(vendorPeerID);
            if (!isCurrentOrder()) {
              return;
            }
            if (vendorProfile) {
              vendorName = vendorProfile.name || vendorProfile.handle || vendorName;
              // 获取头像 URL
              const avatarHash =
                vendorProfile.avatarHashes?.medium ||
                vendorProfile.avatarHashes?.small ||
                vendorProfile.avatarHashes?.tiny;
              if (avatarHash) {
                vendorAvatar = getImageUrl(avatarHash);
              }
            }
          } catch {
            // 获取 profile 失败时使用默认值
            console.warn('Failed to fetch vendor profile for:', vendorPeerID);
          }
        }

        const orderDetailsData: OrderDetails = {
          orderID: requestedOrderID,
          status: order?.state || 'AWAITING_PAYMENT',
          items,
          vendor: {
            name: vendorName,
            peerID: vendorPeerID,
            avatar: vendorAvatar,
          },
          shippingAddress: {
            name: shippingInfo?.name || '',
            street: [shippingInfo?.addressLineOne, shippingInfo?.addressLineTwo]
              .filter(Boolean)
              .join(', '),
            city: shippingInfo?.city || '',
            state: shippingInfo?.state || '',
            country: shippingInfo?.country || '',
            postalCode: shippingInfo?.postalCode || '',
          },
          memo,
          subtotal: calculatedSubtotal,
          shipping: shippingAmount,
          total: finalTotal,
          currency: items[0]?.currency || urlCurrency || pricingCurrency,
          contractType,
          rawOrderAmount: orderAmount,
        };

        setOrderDetails(orderDetailsData);
      } catch (err) {
        if (!isCurrentOrder()) {
          return;
        }
        console.error('Failed to fetch order details:', err);

        // API 调用失败时，尝试使用 URL 参数构建订单详情
        if (urlTitle && urlAmount) {
          if (urlContractType === 'RWA_TOKEN') {
            setError(t('payment.rwaNotSupported'));
            return;
          }

          const priceNum = parseFloat(urlAmount);
          const quantityNum = parseInt(urlQuantity || '1', 10);

          const fallbackOrderDetails: OrderDetails = {
            orderID: requestedOrderID,
            status: 'AWAITING_PAYMENT',
            items: [
              {
                id: 'item-from-url',
                title: urlTitle,
                price: priceNum / quantityNum,
                currency: urlCurrency || 'USD',
                quantity: quantityNum,
                image: urlImage || '',
              },
            ],
            vendor: {
              name: urlVendorName || t('order.seller'),
              peerID: urlVendorPeerID || '',
            },
            shippingAddress: {
              name: '',
              street: '',
              city: '',
              state: '',
              country: '',
              postalCode: '',
            },
            subtotal: priceNum,
            shipping: 0,
            total: priceNum,
            currency: urlCurrency || 'USD',
            contractType: urlContractType || undefined,
          };

          setOrderDetails(fallbackOrderDetails);
        } else {
          setError(t('payment.loadOrderFailed'));
        }
      } finally {
        if (isCurrentOrder()) {
          setIsLoadingOrder(false);
        }
      }
    };

    fetchOrderDetails();
  }, [
    orderID,
    t,
    urlAmount,
    urlCurrency,
    urlTitle,
    urlVendorName,
    urlVendorPeerID,
    setCheckoutPaymentPolicy,
    urlQuantity,
    urlContractType,
    urlImage,
  ]);

  useEffect(() => {
    if (!orderID || isLoadingOrder || !orderDetails) return;

    const destination = resolvePaymentPageOrderDestination(orderDetails.status);
    if (destination === 'checkout') return;

    clearNavigationGuard();
    router.replace(
      destination === 'confirmation'
        ? buildConfirmationUrl(orderDetails)
        : orderDetailPath(orderID, 'purchase')
    );
  }, [clearNavigationGuard, isLoadingOrder, orderDetails, orderID, router]);

  useEffect(() => {
    if (!orderID || !orderDetails || !isPaymentOpenState(orderDetails.status)) {
      return;
    }

    const refreshFromNotification = () => {
      void syncOrderStatus({ markSuccess: !!externalWalletInfo }).catch(() => {
        // Real-time refresh is best-effort; visibility/reconnect recovery will retry.
      });
    };

    const cleanupMessageSubscription = onWebSocketMessage((message: WebSocketMessage) => {
      if (message.type !== 'notification') return;
      const data = message.data as { notification?: { orderID?: string } } | undefined;
      if (data?.notification?.orderID === orderID) {
        refreshFromNotification();
      }
    });

    const cleanupStatusSubscription = onWebSocketStatusChange(status => {
      if (status === 'connected') {
        refreshFromNotification();
      }
    });

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshFromNotification();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cleanupMessageSubscription();
      cleanupStatusSubscription();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [externalWalletInfo, orderDetails, orderID, syncOrderStatus]);

  // A provider success means funds were submitted, not that the platform order
  // has advanced. Keep verifying until the backend confirms payment or reports
  // an unsuccessful terminal state.
  useEffect(() => {
    if (paymentStep !== 'submitted') return;

    const refresh = () => {
      void syncOrderStatus({ markSuccess: true }).catch(() => {
        // Keep the verification UI active; the next poll or websocket event retries.
      });
    };

    refresh();
    const interval = window.setInterval(refresh, 3000);
    return () => window.clearInterval(interval);
  }, [paymentStep, syncOrderStatus]);

  useEffect(() => {
    // The onramp funding leg has no externalWalletInfo — the buyer never opens
    // the external-wallet pane. Success detection must poll whenever ANY
    // funding leg is live, or an onramp-funded order pays on chain while this
    // page keeps showing the countdown forever.
    if (
      !orderID ||
      !orderDetails ||
      !(externalWalletInfo || onrampSource) ||
      !isPaymentOpenState(orderDetails.status)
    ) {
      return;
    }

    void syncOrderStatus({ markSuccess: true }).catch(() => {
      // Polling is best-effort; the next tick or websocket event will retry.
    });

    const intervalID = window.setInterval(() => {
      void syncOrderStatus({ markSuccess: true }).catch(() => {
        // Keep the payment screen responsive even if one status poll fails.
      });
    }, 10_000);

    return () => window.clearInterval(intervalID);
  }, [externalWalletInfo, onrampSource, orderDetails, orderID, syncOrderStatus]);

  // 调解员费用仅在发生纠纷时从卖家收益中扣除，支付时无需计入
  const totalWithFee = orderDetails?.total || 0;

  const nativeSymbol = visibleTokenId || '';
  const canPreviewCryptoAmount = hasExchangeRateForConversion(
    rates,
    orderDetails?.currency,
    visibleTokenId || undefined
  );
  const cryptoAmount = canPreviewCryptoAmount
    ? convertCurrency(totalWithFee, orderDetails?.currency || 'USD', visibleTokenId!)
    : null;
  const cryptoAmountDisplay =
    cryptoAmount !== null && cryptoAmount > 0 ? cryptoAmount.toFixed(6) : undefined;

  // 执行支付（仅加密货币，法币由 FiatPaymentSection 独立处理）
  const handlePayment = useCallback(async () => {
    if (visibleFiatProvider) return;

    if (!orderDetails) {
      toast({
        title: t('payment.noOrderData'),
        variant: 'destructive',
      });
      return;
    }

    if (readinessFetchError) {
      toast({
        title: t('payment.sessionFetchError'),
        description: t('payment.sessionFetchErrorHint'),
      });
      return;
    }

    if (!isReadyToPay) {
      toast({
        title: t(readinessBlockedCopy.titleKey),
        description: t(readinessBlockedCopy.hintKey),
      });
      return;
    }

    if (!visibleTokenId) {
      toast({
        title: t('payment.selectPaymentMethod'),
        variant: 'destructive',
      });
      return;
    }

    if (isRetiredPayment) {
      toast({
        title: t('payment.tronNotSupported'),
        variant: 'destructive',
      });
      return;
    }

    if (requiresCustodialRefundInput && !refundWalletAddress.trim()) {
      toast({
        title: t('payment.custodialPayment.requiredTitle'),
        description: t('payment.custodialPayment.requiredDesc'),
        variant: 'destructive',
      });
      return;
    }

    if (paymentProtectionEnabled && !paymentModerator) {
      toast({
        title: t('payment.selectModerator'),
        variant: 'destructive',
      });
      return;
    }

    if (dealQuoteBlocksPayment) {
      toast({
        title: t('payment.selectionQuote.errorTitle'),
        description: t('payment.selectionQuote.blockedHint'),
        variant: 'destructive',
      });
      return;
    }

    setPaymentStep('confirming');
    setPaymentError(undefined);
    setSubmittedTxHash(undefined);

    try {
      // 3. 创建统一 PaymentSession。旧支付指令路径已退役。
      const moderatorPeerID =
        paymentProtectionEnabled && paymentModerator?.peerID ? paymentModerator.peerID : undefined;

      if (usesPaymentSessionFlow) {
        const session = await ordersApi.createOrderPaymentSession({
          orderId: orderID!,
          paymentCoin: selectedPaymentCoin,
          vendorPeerID: paymentVendorPeerID,
          moderator: moderatorPeerID,
          refundAddress: refundWalletAddress.trim() || undefined,
          payFromCustodial: payFromCustodial || undefined,
          ...(paymentSelectionQuoteID ? { paymentSelectionQuoteID } : {}),
        });
        setPaymentSession(session);

        let defaultSaveFailed = false;
        if (saveRefundAsDefault && refundWalletAddress.trim() && selectedPaymentCoin) {
          const savedDefault = await persistRefundReceivingAddressBestEffort(
            selectedPaymentCoin,
            refundWalletAddress
          );
          defaultSaveFailed = !savedDefault;
        }
        if (defaultSaveFailed) {
          toast({
            title: t('settings.refunds.saveFailed'),
            description: t('order.refundAddress.defaultSaveFailedDesc'),
          });
        }

        if (session.paymentReadiness?.status === 'awaiting_seller_receipt') {
          const copy = getPaymentReadinessBlockedCopyKeys({ tier: readinessUxTier });
          toast({
            title: t(copy.titleKey),
            description: t(copy.hintKey),
          });
          setPaymentStep('idle');
          void refreshPaymentReadiness();
          return;
        }

        setExternalWalletInfo(
          externalWalletInfoFromSession(session, visibleTokenId, selectedPaymentCoin)
        );
        setPaymentStep('idle');
        return;
      }

      throw new Error(t('payment.noPaymentInstructions'));
    } catch (error) {
      console.error('[Payment] Payment failed:', error);

      const msg = (error as Error).message || '';
      const isCancelled =
        msg.includes('rejected') || msg.includes('denied') || msg.includes('cancelled');

      if (!isCancelled) haptic.error();
      setPaymentError(isCancelled ? t('payment.userCancelledTransaction') : msg);
      setPaymentStep('failed');
    }
  }, [
    orderDetails,
    orderID,
    visibleTokenId,
    selectedPaymentCoin,
    visibleFiatProvider,
    paymentProtectionEnabled,
    paymentModerator,
    isReadyToPay,
    readinessFetchError,
    readinessUxTier,
    readinessBlockedCopy,
    refreshPaymentReadiness,
    requiresCustodialRefundInput,
    payFromCustodial,
    refundWalletAddress,
    saveRefundAsDefault,
    usesPaymentSessionFlow,
    paymentSelectionQuoteID,
    paymentVendorPeerID,
    dealQuoteBlocksPayment,
    router,
    t,
    toast,
    haptic,
  ]);

  // Error state
  if (error && !isLoadingOrder) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <MobilePageHeader title={t('payment.title')} />
        <main className="py-8">
          <Container size="md">
            <div className="text-center py-12">
              <svg
                className="w-16 h-16 text-destructive mx-auto mb-4"
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
              <h2 className="text-lg font-semibold text-foreground mb-2">
                {t('payment.errorTitle')}
              </h2>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button onClick={() => router.back()}>{t('common.back')}</Button>
            </div>
          </Container>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <MobilePageHeader title={t('payment.title')} />

      <main className={`py-4 sm:py-8 ${showMobileBottomBar ? 'pb-24' : 'pb-8'} sm:pb-8`}>
        <Container size="xl">
          {/* Desktop Page Header */}
          <h1 className="hidden lg:block text-2xl font-bold text-foreground mb-8">
            {t('payment.title')}
          </h1>

          <CheckoutProgressBar currentStep="payment" className="mb-6 sm:mb-8" />

          {readinessFetchError && !externalWalletInfo && (
            <div
              className="mb-4 sm:mb-6 p-4 rounded-lg border border-destructive/30 bg-destructive/10 text-center"
              role="alert"
            >
              <p className="font-medium text-foreground">{t('payment.sessionFetchError')}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {t('payment.sessionFetchErrorHint')}
              </p>
              <Button
                size="sm"
                className="min-h-11 touch-feedback mt-4"
                onClick={() => void refreshPaymentReadiness()}
                disabled={isFetchingSession}
              >
                {isFetchingSession ? t('common.loading') : t('payment.retrySessionFetch')}
              </Button>
            </div>
          )}

          {isPaymentBlocked &&
            !externalWalletInfo &&
            !readinessFetchError &&
            readinessUxTier !== 'preparing' && (
              <div
                className="mb-4 sm:mb-6 p-4 rounded-lg border border-border bg-muted/30 text-center"
                role="status"
                aria-live="polite"
              >
                {showReadinessRecovery ? (
                  <svg
                    className="w-8 h-8 text-warning mx-auto mb-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                ) : (
                  <svg
                    className="animate-spin w-8 h-8 text-primary mx-auto mb-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                )}
                <p className="font-medium text-foreground">{t(readinessBlockedCopy.titleKey)}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {t(readinessBlockedCopy.hintKey)}
                </p>
                {showReadinessRecovery && (
                  <HStack gap="sm" justify="center" className="mt-4 flex-wrap">
                    <Button
                      size="sm"
                      className="min-h-11 touch-feedback"
                      onClick={() => void handleCheckSellerReceiptAgain()}
                      disabled={isCheckingSellerReceipt || isCancelingOrder}
                    >
                      {isCheckingSellerReceipt
                        ? t('common.loading')
                        : t('payment.checkSellerReceiptAgain')}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="min-h-11 touch-feedback"
                      onClick={() => setShowCancelConfirm(true)}
                      disabled={isCheckingSellerReceipt || isCancelingOrder}
                    >
                      {isCancelingOrder
                        ? t('common.loading')
                        : t('order.paymentInstructions.cancelOrder')}
                    </Button>
                  </HStack>
                )}
              </div>
            )}

          {/* Payment window countdown — hidden while waiting for seller receipt */}
          {(paymentTimeRemaining || paymentExpired) && !externalWalletInfo && !isPaymentBlocked && (
            <div
              className={`mb-4 sm:mb-6 p-3 rounded-lg border text-center ${
                paymentExpired
                  ? 'bg-destructive/10 border-destructive/30'
                  : 'bg-warning/8 border-warning/20'
              }`}
            >
              <p
                className={`text-xs ${paymentExpired ? 'text-destructive' : 'text-muted-foreground'} mb-0.5`}
              >
                {paymentExpired
                  ? t('payment.paymentWindowExpired')
                  : t('payment.paymentWindowRemaining')}
              </p>
              {paymentTimeRemaining && (
                <p className="text-xl font-mono font-bold text-warning">{paymentTimeRemaining}</p>
              )}
            </div>
          )}

          {/* Loading State */}
          {isLoadingOrder ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              <div className="lg:col-span-2 space-y-4 sm:space-y-6">
                <Card>
                  <CardContent className="p-4 sm:p-6">
                    <Skeleton variant="text" height={24} width="40%" className="mb-4" />
                    <Skeleton variant="rounded" height={100} />
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 sm:p-6">
                    <Skeleton variant="text" height={24} width="50%" className="mb-4" />
                    <Skeleton variant="rounded" height={60} />
                  </CardContent>
                </Card>
              </div>
              <div>
                <Card>
                  <CardContent className="p-4 sm:p-6">
                    <Skeleton variant="text" height={24} width="60%" className="mb-4" />
                    <Skeleton variant="rounded" height={120} className="mb-4" />
                    <Skeleton variant="rounded" height={40} />
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : orderDetails ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-4 sm:space-y-6">
                {/* Order Summary (Read-only) */}
                <OrderSummaryCard
                  orderID={orderDetails.orderID}
                  items={orderDetails.items}
                  vendor={orderDetails.vendor}
                  shippingAddress={
                    // 只有物理商品才显示收货地址
                    orderDetails.contractType === 'PHYSICAL_GOOD' &&
                    orderDetails.shippingAddress?.street
                      ? orderDetails.shippingAddress
                      : undefined
                  }
                  memo={orderDetails.memo}
                  compact={isDealBacked}
                />

                {externalWalletInfo ? (
                  <>
                    <ExternalWalletPayment
                      paymentInfo={externalWalletInfo}
                      tokenId={visibleTokenId || undefined}
                      onRefresh={() => {
                        setExternalWalletInfo(null);
                        handlePayment();
                      }}
                      onClose={() => {
                        setExternalWalletInfo(null);
                        router.push(orderDetailPath(orderDetails.orderID, 'purchase'));
                      }}
                    />
                    {cryptoRefundSection}
                  </>
                ) : isPaymentBlocked && shouldShowPaymentReadinessPlaceholder(readinessUxTier) ? (
                  <Card>
                    <CardContent className="p-4 sm:p-6" role="status" aria-live="polite">
                      <h2 className="text-base sm:text-lg font-semibold text-foreground mb-2">
                        {t(readinessBlockedCopy.titleKey)}
                      </h2>
                      <p className="text-sm text-muted-foreground mb-4">
                        {t(readinessBlockedCopy.hintKey)}
                      </p>
                      <Skeleton variant="text" height={24} width="45%" className="mb-4" />
                      <Skeleton variant="rounded" height={72} className="mb-4" />
                      <Skeleton variant="rounded" height={48} />
                    </CardContent>
                  </Card>
                ) : (
                  !isPaymentBlocked && (
                    <>
                      {/* Payment Method Selection */}
                      <Card>
                        <CardContent className="p-4 sm:p-6">
                          <h2 className="text-base sm:text-lg font-semibold text-foreground mb-3 sm:mb-4">
                            {t('payment.paymentMethod')}
                          </h2>
                          <PaymentMethodSummary
                            selectedTokenId={visibleTokenId}
                            selectedFiatProvider={visibleFiatProvider}
                            onEdit={() =>
                              openPaymentSelector(
                                typeof window !== 'undefined'
                                  ? `${window.location.pathname}${window.location.search}`
                                  : `/payment?orderID=${encodeURIComponent(orderID ?? '')}`
                              )
                            }
                          />
                        </CardContent>
                      </Card>

                      {isDealBacked && paymentSelectionQuoteEnabled && (
                        <PaymentSelectionQuoteReview
                          quote={paymentSelectionQuote}
                          loading={paymentSelectionQuoteLoading}
                          error={paymentSelectionQuoteError}
                          expired={paymentSelectionQuoteExpired}
                          provisioned={paymentSelectionQuoteProvisioned}
                          onRequote={() => void retryPaymentSelectionQuote()}
                          requoteLoading={paymentSelectionQuoteLoading}
                        />
                      )}

                      {/* Fiat Payment Form (Stripe / PayPal) */}
                      {showFiatPaymentForm && (
                        <Card>
                          <CardContent className="p-4 sm:p-6">
                            <FiatPaymentSection
                              key={`${visibleFiatProvider}:${paymentSelectionQuoteID ?? 'legacy'}`}
                              providerID={visibleFiatProvider!}
                              vendorPeerID={paymentVendorPeerID}
                              orderID={orderDetails.orderID}
                              amount={
                                isDealBacked
                                  ? 0
                                  : toMinimalUnit(orderDetails.total, orderDetails.currency)
                              }
                              currency={
                                isDealBacked && paymentSelectionQuote
                                  ? paymentSelectionQuote.paymentCurrency
                                  : orderDetails.currency
                              }
                              description={orderDetails.items[0]?.title}
                              returnUrl={fiatVerificationReturnUrl!}
                              cancelUrl={fiatCancelReturnUrl!}
                              canCreateSession={
                                isDealBacked
                                  ? isReadyToPay && paymentSelectionQuoteAuthorizesPayment
                                  : isReadyToPay
                              }
                              dealPaymentSessionRequest={
                                isDealBacked &&
                                paymentSelectionQuoteID &&
                                checkoutCanonicalPaymentCoin
                                  ? {
                                      paymentCoin: checkoutCanonicalPaymentCoin,
                                      paymentSelectionQuoteID,
                                      fiatDescription: orderDetails.items[0]?.title,
                                      fiatReturnURL: fiatVerificationReturnUrl,
                                      fiatCancelURL: fiatCancelReturnUrl,
                                    }
                                  : undefined
                              }
                              disabled={dealQuoteBlocksPayment}
                              onPaymentSuccess={async (result: FiatPaymentSuccessResult) => {
                                setPaymentStep('submitted');

                                if (!isDealBacked) {
                                  try {
                                    const submitResult = await ordersApi.submitPayment({
                                      orderID: orderDetails.orderID,
                                      transactionID: result.transactionID,
                                      coin: buildCanonicalFiatPaymentCoin(
                                        result.providerID,
                                        result.currency
                                      ),
                                      amount: String(result.amount),
                                      timestamp: new Date().toISOString(),
                                      method: 5, // FIAT
                                    });
                                    if (submitResult?.success === false) {
                                      throw new Error(
                                        submitResult.error || 'submit payment failed'
                                      );
                                    }
                                  } catch (err) {
                                    const message =
                                      err instanceof Error ? err.message : t('fiat.genericError');
                                    toast({
                                      title: t('fiat.paymentBeingConfirmed'),
                                      description: message,
                                      variant: 'destructive',
                                    });
                                  }
                                }

                                await syncOrderStatus({ markSuccess: true }).catch(() => null);
                              }}
                              onPaymentError={msg => {
                                toast({
                                  title: t('fiat.genericError'),
                                  description: msg,
                                  variant: 'destructive',
                                });
                              }}
                            />
                          </CardContent>
                        </Card>
                      )}

                      {/* Onramp funding entry point (ADR-019): lets a buyer with
                          no crypto fund the frozen target by buying it. Shown only
                          for a frozen, still-payable crypto attempt; hides itself
                          if the backend has no onramp provider for this rail. */}
                      {!onrampSource &&
                        !onrampInitHidden &&
                        !visibleFiatProvider &&
                        paymentSession?.status === 'awaiting_funds' &&
                        paymentSession.fundingTarget?.type === 'address' &&
                        Boolean(paymentSession.fundingTarget?.address) && (
                          <Card className="border-dashed">
                            <CardContent className="flex flex-col gap-3 p-4">
                              <p className="text-sm text-muted-foreground">
                                {t('onramp.fundWithCardHint')}
                              </p>
                              <Button
                                type="button"
                                variant="outline"
                                className="self-start"
                                disabled={onrampInitBusy}
                                onClick={async () => {
                                  setOnrampInitBusy(true);
                                  try {
                                    // Deliver straight to the frozen escrow target. Routing
                                    // through a buyer wallet requires an embedded-wallet
                                    // address to bind the purchase to, and nothing here
                                    // provisions one — asking for it makes the backend
                                    // reject every purchase ("a purchase must bind a
                                    // delivery target or the buyer wallet"), which this
                                    // button then swallows as "unavailable".
                                    const src = await ordersApi.initiateOrderOnrampFunding({
                                      orderId: orderDetails.orderID,
                                      providerID: 'mock-onramp',
                                      fiatCurrency: 'USD',
                                      deliverToBuyerWallet: false,
                                      vendorPeerID: paymentVendorPeerID,
                                    });
                                    if (src) {
                                      setOnrampSource(src);
                                    } else {
                                      setOnrampInitHidden(true);
                                    }
                                  } catch {
                                    setOnrampInitHidden(true);
                                    toast({
                                      title: t('onramp.fundWithCardError'),
                                      variant: 'destructive',
                                    });
                                  } finally {
                                    setOnrampInitBusy(false);
                                  }
                                }}
                              >
                                {onrampInitBusy
                                  ? t('onramp.fundWithCardBusy')
                                  : t('onramp.fundWithCard')}
                              </Button>
                            </CardContent>
                          </Card>
                        )}

                      {/* Onramp funding leg (ADR-019): descriptive pre-observation
                          progress; funded/verified still come only from the
                          on-chain observation the page already gates on. */}
                      {onrampSource && (
                        <OnrampFundingSection
                          orderID={orderDetails.orderID}
                          source={onrampSource}
                          vendorPeerID={paymentVendorPeerID}
                          onUpdated={next => {
                            // The section's own refresh is the source of truth for
                            // the onramp leg; keep it even if the session re-fetch
                            // (vendor-routed) omits onrampFunding.
                            if (next) setOnrampSource(next);
                            void ordersApi
                              .getOrderPaymentSession(orderDetails.orderID, {
                                vendorPeerID: paymentVendorPeerID,
                              })
                              .then(session => session && setPaymentSession(session))
                              .catch(() => null);
                          }}
                        />
                      )}

                      {cryptoRefundSection}

                      {/* Payment Protection (crypto only) */}
                      {!visibleFiatProvider && (
                        <PaymentProtectionCard
                          enabled={paymentProtectionEnabled}
                          onEnabledChange={setPaymentProtectionEnabled}
                          selectedModerator={paymentModerator}
                          onChangeModerator={() =>
                            openModeratorSelector(
                              typeof window !== 'undefined'
                                ? `${window.location.pathname}${window.location.search}`
                                : `/payment?orderID=${encodeURIComponent(orderID ?? '')}`
                            )
                          }
                          protectionDays={45}
                        />
                      )}
                    </>
                  )
                )}
              </div>

              {/* Payment Summary */}
              <div className="space-y-4 sm:space-y-6">
                <Card className="sticky top-4">
                  <CardContent className="p-4 sm:p-6">
                    <h2 className="text-base sm:text-lg font-semibold text-foreground mb-3 sm:mb-4">
                      {t('payment.paymentSummary')}
                    </h2>

                    <VStack gap="sm" className="border-b border-border pb-3 mb-3">
                      <HStack justify="between">
                        <span className="text-xs sm:text-sm text-muted-foreground">
                          {t('payment.subtotal')}
                        </span>
                        <span className="font-medium text-foreground text-xs sm:text-sm">
                          {renderPairedPrice(orderDetails.subtotal, orderDetails.currency, {
                            isMinimalUnit: false,
                          })}
                        </span>
                      </HStack>

                      {orderDetails.shipping > 0 && (
                        <HStack justify="between">
                          <span className="text-xs sm:text-sm text-muted-foreground">
                            {t('payment.shipping')}
                          </span>
                          <span className="font-medium text-foreground text-xs sm:text-sm">
                            {renderPairedPrice(orderDetails.shipping, orderDetails.currency, {
                              isMinimalUnit: false,
                            })}
                          </span>
                        </HStack>
                      )}

                      <HStack justify="between">
                        <span className="text-xs sm:text-sm text-muted-foreground">
                          {t('payment.orderTotal')}
                        </span>
                        <span className="font-medium text-foreground text-xs sm:text-sm">
                          {renderPairedPrice(orderDetails.total, orderDetails.currency, {
                            isMinimalUnit: false,
                          })}
                        </span>
                      </HStack>
                    </VStack>

                    <HStack justify="between" className="mb-4">
                      <span className="text-base sm:text-lg font-semibold text-foreground">
                        {t('payment.totalToPay')}
                      </span>
                      <div className="text-right">
                        <p className="text-lg sm:text-xl font-bold text-primary">
                          {renderPairedPrice(totalWithFee, orderDetails.currency, {
                            isMinimalUnit: false,
                          })}
                        </p>
                        {externalWalletInfo ? (
                          <p className="text-xs text-muted-foreground">
                            = {formatExternalPaymentAmountForSummary(externalWalletInfo)}{' '}
                            {nativeSymbol.toUpperCase()}
                          </p>
                        ) : visibleTokenId && cryptoAmountDisplay ? (
                          <p className="text-xs text-muted-foreground">
                            ≈ {cryptoAmountDisplay} {nativeSymbol}
                            {secondsAgo !== null && (
                              <span className="ml-1.5 opacity-60">
                                ({t('payment.rateUpdated', { seconds: secondsAgo })})
                              </span>
                            )}
                          </p>
                        ) : null}
                      </div>
                    </HStack>

                    {/* Pay Button - Desktop (crypto only) */}
                    {visibleFiatProvider ? (
                      <div className="p-3 bg-muted/50 rounded-lg text-center">
                        <p className="text-sm text-muted-foreground">{t('fiat.sectionTitle')}</p>
                      </div>
                    ) : externalWalletInfo ? (
                      <div className="p-3 bg-muted/50 rounded-lg text-center">
                        <p className="text-sm text-muted-foreground">
                          {t('payment.waitingForPayment')}
                        </p>
                      </div>
                    ) : isPaymentBlocked ? (
                      <div className="p-3 bg-muted/50 rounded-lg text-center hidden sm:block">
                        <p className="text-sm text-muted-foreground">
                          {t(readinessBlockedCopy.hintKey)}
                        </p>
                      </div>
                    ) : (
                      <Button
                        className="w-full touch-feedback hidden sm:flex"
                        size="default"
                        onClick={handlePayment}
                        disabled={
                          isProcessing ||
                          paymentExpired ||
                          isPaymentBlocked ||
                          dealQuoteBlocksPayment ||
                          isRetiredPayment ||
                          !visibleTokenId ||
                          !canProceedToPay ||
                          (paymentProtectionEnabled && !paymentModerator)
                        }
                      >
                        {isProcessing ? (
                          <HStack gap="sm" align="center" justify="center">
                            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              />
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              />
                            </svg>
                            <span>{t('payment.processing')}</span>
                          </HStack>
                        ) : usesPaymentSessionFlow ? (
                          t('payment.getPaymentInfo')
                        ) : cryptoAmountDisplay ? (
                          `${t('payment.pay')} ${cryptoAmountDisplay} ${nativeSymbol}`
                        ) : (
                          t('payment.pay')
                        )}
                      </Button>
                    )}

                    {/* Warnings */}
                    {!isPaymentBlocked && isRetiredPayment && !visibleFiatProvider && (
                      <div className="mt-3 sm:mt-4 p-2.5 sm:p-3 bg-warning/8 border border-warning/20 rounded-md sm:rounded-lg">
                        <p className="text-xs sm:text-sm text-warning">
                          {t('payment.tronNotSupported')}
                        </p>
                      </div>
                    )}
                    {!isPaymentBlocked && !visibleTokenId && !visibleFiatProvider && (
                      <div className="mt-3 sm:mt-4 p-2.5 sm:p-3 bg-warning/8 border border-warning/20 rounded-md sm:rounded-lg">
                        <p className="text-xs sm:text-sm text-warning">
                          {t('payment.selectPaymentMethodWarning')}
                        </p>
                      </div>
                    )}
                    {!isPaymentBlocked &&
                      !visibleFiatProvider &&
                      requiresCustodialRefundInput &&
                      !refundWalletAddress.trim() && (
                        <div className="mt-3 sm:mt-4 p-2.5 sm:p-3 bg-warning/8 border border-warning/20 rounded-md sm:rounded-lg">
                          <p className="text-xs sm:text-sm text-warning">
                            {t('payment.custodialPayment.requiredDesc')}
                          </p>
                        </div>
                      )}
                    {!isPaymentBlocked &&
                      !visibleFiatProvider &&
                      paymentProtectionEnabled &&
                      !paymentModerator && (
                        <div className="mt-3 sm:mt-4 p-2.5 sm:p-3 bg-warning/8 border border-warning/20 rounded-md sm:rounded-lg">
                          <p className="text-xs sm:text-sm text-warning">
                            {t('payment.selectModeratorWarning')}
                          </p>
                        </div>
                      )}

                    {/* Security Note */}
                    <div className="mt-3 sm:mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <svg
                        className="w-3.5 h-3.5 sm:w-4 sm:h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                        />
                      </svg>
                      <span>{t('payment.securityNote')}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : null}
        </Container>
      </main>

      <Footer />

      {/* Mobile Bottom Bar (crypto only, fiat uses FiatPaymentSection) */}
      {showMobileBottomBar && orderDetails && (
        <CheckoutBottomBar
          totalAmount={totalWithFee}
          currency={orderDetails.currency}
          cryptoAmount={cryptoAmountDisplay}
          cryptoCurrency={nativeSymbol}
          onPay={handlePayment}
          isLoading={isProcessing}
          payLabel={usesPaymentSessionFlow ? t('payment.getPaymentInfo') : t('payment.pay')}
          disabled={
            paymentExpired ||
            isPaymentBlocked ||
            dealQuoteBlocksPayment ||
            isRetiredPayment ||
            !visibleTokenId ||
            !canProceedToPay ||
            (paymentProtectionEnabled && !paymentModerator)
          }
        />
      )}

      <AlertDialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('payment.cancelUnpaidOrderConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('payment.cancelUnpaidOrderConfirmDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCancelingOrder}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              disabled={isCancelingOrder}
              onClick={event => {
                event.preventDefault();
                void handleCancelUnpaidOrder();
              }}
            >
              {isCancelingOrder ? t('common.loading') : t('order.paymentInstructions.cancelOrder')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <TransactionOverlay
        step={paymentStep}
        txHash={submittedTxHash}
        tokenId={visibleTokenId || undefined}
        errorMessage={paymentError}
        onRetry={() => {
          setPaymentStep('idle');
          setPaymentError(undefined);
        }}
        onClose={() => {
          setPaymentStep('idle');
          setPaymentError(undefined);
        }}
      />
    </div>
  );
}
