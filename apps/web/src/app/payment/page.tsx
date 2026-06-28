'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Header, Footer, MobilePageHeader } from '@/components';
import {
  PaymentMethodSummary,
  PaymentProtectionCard,
  CheckoutBottomBar,
  ExternalWalletPayment,
} from '@/components/Payment';
import type { ExternalWalletPaymentInfo } from '@/components/Payment';
import { getTokenById } from '@/components/Payment/config';
import { OrderSummaryCard } from '@/components/Order';
import { Container, HStack, VStack } from '@/components/layouts';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton-compat';
import { CheckoutProgressBar } from '@/components/Checkout/CheckoutProgressBar';
import { usePaymentSelector } from '@/hooks';
import {
  allowsTokenId,
  useCurrency,
  useRateFreshness,
  useI18n,
  ordersApi,
  profileApi,
  getImageUrl,
  convertCurrency,
} from '@mobazha/core';
import type { Order } from '@mobazha/core';
import { useToast } from '@/components/ui/use-toast';

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
  isRwaToken?: boolean;
  contractType?: string;
}

function formatCryptoAmountForSummary(rawAmount: string, decimals: number): string {
  const num = Number(rawAmount);
  if (!num || !Number.isFinite(num)) return '0';
  const result = num / Math.pow(10, decimals);
  return result.toFixed(decimals).replace(/\.?0+$/, '') || '0';
}

/**
 * Community Edition payment page — UTXO transparent rails only (BTC/BCH/LTC/ZEC).
 */
export default function PaymentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { renderPairedPrice } = useCurrency();
  const { secondsAgo } = useRateFreshness('payment');
  const { t } = useI18n();
  const { toast } = useToast();

  const orderID = searchParams.get('orderID');
  const urlAmount = searchParams.get('amount');
  const urlCurrency = searchParams.get('currency');
  const urlTitle = searchParams.get('title');
  const urlVendorName = searchParams.get('vendorName');
  const urlVendorPeerID = searchParams.get('vendorPeerID');
  const urlQuantity = searchParams.get('quantity');
  const urlContractType = searchParams.get('contractType');
  const urlImage = searchParams.get('image');

  const [isLoadingOrder, setIsLoadingOrder] = useState(true);
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [rawOrder, setRawOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRequestingPayment, setIsRequestingPayment] = useState(false);
  const [paymentProtectionEnabled, setPaymentProtectionEnabled] = useState(true);
  const [externalWalletInfo, setExternalWalletInfo] = useState<ExternalWalletPaymentInfo | null>(
    null
  );

  const {
    selectedTokenId,
    selectedModerator: paymentModerator,
    openPaymentSelector,
    openModeratorSelector,
    restoreFromSession,
    setVendorPeerID,
  } = usePaymentSelector();

  const selectedPaymentCoin = useMemo(() => {
    const tokenId = (selectedTokenId || '').trim();
    if (!tokenId) return '';
    return getTokenById(tokenId)?.assetId?.trim() || tokenId;
  }, [selectedTokenId]);

  const isUnsupportedRwaOrder = Boolean(orderDetails?.isRwaToken);

  useEffect(() => {
    setExternalWalletInfo(null);
  }, [selectedTokenId]);

  useEffect(() => {
    restoreFromSession();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        restoreFromSession();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [restoreFromSession]);

  useEffect(() => {
    if (orderDetails?.vendor?.peerID) {
      setVendorPeerID(orderDetails.vendor.peerID);
    }
  }, [orderDetails?.vendor?.peerID, setVendorPeerID]);

  useEffect(() => {
    const fetchOrderDetails = async () => {
      if (!orderID) {
        setError(t('payment.noOrderID'));
        setIsLoadingOrder(false);
        return;
      }

      setIsLoadingOrder(true);
      setError(null);

      try {
        const order = await ordersApi.getOrderDetails(orderID);
        setRawOrder(order);

        const contract = order?.contract as Record<string, unknown> | undefined;
        const orderOpen = contract?.orderOpen as Record<string, unknown> | undefined;

        if (!orderOpen) {
          throw new Error('Invalid order data: orderOpen not found');
        }

        const rawListings = (orderOpen.listings as unknown[]) || [];
        const orderItems = (orderOpen.items as unknown[]) || [];
        const orderAmount = Number(orderOpen.amount) || 0;
        const shippingInfo = orderOpen.shipping as Record<string, string> | undefined;
        const memo = (orderOpen.alternateContactInfo as string) || '';

        const firstListingData = (rawListings[0] as { listing?: Record<string, unknown> })?.listing;
        let pricingCurrency = 'USD';
        let pricingDivisibility = 2;
        const pricingMeta = firstListingData?.metadata as
          | { pricingCurrency?: { code?: string; divisibility?: number } }
          | undefined;
        if (pricingMeta?.pricingCurrency) {
          pricingCurrency = pricingMeta.pricingCurrency.code || 'USD';
          pricingDivisibility = pricingMeta.pricingCurrency.divisibility || 2;
        }
        const vendorInfo = firstListingData?.vendorID as { peerID?: string; handle?: string };

        const normalizedListings = rawListings.map(
          (item: unknown) => (item as { listing?: unknown }).listing || item
        ) as Record<string, unknown>[];

        const metadata = normalizedListings[0]?.metadata as { contractType?: string } | undefined;
        const contractType = urlContractType || metadata?.contractType;
        const isRwa = contractType === 'RWA_TOKEN';

        let items = normalizedListings.map((listing, index) => {
          const orderItem = (orderItems[index] || {}) as Record<string, unknown>;
          const itemData = listing.item as Record<string, unknown> | undefined;
          const rawPrice = Number(itemData?.price) || 0;
          const listingMeta = listing.metadata as
            | { pricingCurrency?: { divisibility?: number; code?: string } }
            | undefined;
          const divisibility = listingMeta?.pricingCurrency?.divisibility || pricingDivisibility;
          const price = rawPrice / Math.pow(10, divisibility);
          const currency = listingMeta?.pricingCurrency?.code || pricingCurrency;
          const images = itemData?.images as Array<{ medium?: string; small?: string }> | undefined;
          const imageUrl = images?.[0]?.medium || images?.[0]?.small;

          return {
            id: (listing.slug as string) || `item-${index}`,
            title: (itemData?.title as string) || 'Unknown Product',
            price,
            currency,
            quantity: Number(orderItem.quantity) || Number(orderItem.quantity64) || 1,
            image: getImageUrl(imageUrl) || '',
          };
        });

        if (items.length === 0 && urlTitle && urlAmount) {
          const priceNum = parseFloat(urlAmount);
          const quantityNum = parseInt(urlQuantity || '1', 10);
          items = [
            {
              id: 'item-from-url',
              title: urlTitle,
              price: priceNum / quantityNum,
              currency: urlCurrency || 'USD',
              quantity: quantityNum,
              image: urlImage || '',
            },
          ];
        }

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
        const shippingAmount = Math.max(0, finalTotal - calculatedSubtotal);

        const vendorPeerID = vendorInfo?.peerID || urlVendorPeerID || '';
        let vendorName = vendorInfo?.handle || urlVendorName || t('order.seller');
        let vendorAvatar: string | undefined;

        if (vendorPeerID) {
          try {
            const vendorProfile = await profileApi.getProfile(vendorPeerID);
            if (vendorProfile) {
              vendorName = vendorProfile.name || vendorProfile.handle || vendorName;
              const avatarHash =
                vendorProfile.avatarHashes?.medium ||
                vendorProfile.avatarHashes?.small ||
                vendorProfile.avatarHashes?.tiny;
              if (avatarHash) {
                vendorAvatar = getImageUrl(avatarHash);
              }
            }
          } catch {
            console.warn('Failed to fetch vendor profile for:', vendorPeerID);
          }
        }

        setOrderDetails({
          orderID: (contract?.OrderID as string) || (contract?.orderID as string) || orderID,
          status: order?.state || 'AWAITING_PAYMENT',
          items,
          vendor: { name: vendorName, peerID: vendorPeerID, avatar: vendorAvatar },
          shippingAddress: {
            name: shippingInfo?.shipTo || shippingInfo?.name || '',
            street: shippingInfo?.address || shippingInfo?.street || '',
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
          isRwaToken: isRwa,
          contractType,
        });
      } catch (err) {
        console.error('Failed to fetch order details:', err);

        if (urlTitle && urlAmount) {
          const priceNum = parseFloat(urlAmount);
          const quantityNum = parseInt(urlQuantity || '1', 10);
          setOrderDetails({
            orderID,
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
            vendor: { name: urlVendorName || t('order.seller'), peerID: urlVendorPeerID || '' },
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
          });
        } else {
          setError(t('payment.loadOrderFailed'));
        }
      } finally {
        setIsLoadingOrder(false);
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
    urlQuantity,
    urlContractType,
    urlImage,
  ]);

  const [paymentTimeRemaining, setPaymentTimeRemaining] = useState<string | null>(null);
  const [paymentExpired, setPaymentExpired] = useState(false);

  useEffect(() => {
    if (!rawOrder) return;

    const rawContract = rawOrder.contract as Record<string, unknown> | undefined;
    const backendExpiresAt = rawContract?.ExpiresAt || rawContract?.expiresAt;
    let expiresAt: number;

    if (backendExpiresAt) {
      expiresAt = new Date(String(backendExpiresAt)).getTime();
      if (isNaN(expiresAt)) return;
    } else {
      const orderOpen = rawContract?.orderOpen as { timestamp?: string } | undefined;
      const orderTimestamp = orderOpen?.timestamp;
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

  const totalWithFee = orderDetails?.total || 0;
  const nativeSymbol = selectedTokenId || '';
  const cryptoAmount = selectedTokenId
    ? convertCurrency(totalWithFee, orderDetails?.currency || 'USD', selectedTokenId)
    : 0;

  const handlePayment = useCallback(async () => {
    if (!orderDetails || isUnsupportedRwaOrder) return;

    if (!selectedTokenId || !allowsTokenId(selectedTokenId)) {
      toast({
        title: t('payment.selectPaymentMethod'),
        description: t('payment.noPaymentMethodsDesc'),
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

    setIsRequestingPayment(true);

    try {
      const moderatorPeerID =
        paymentProtectionEnabled && paymentModerator?.peerID ? paymentModerator.peerID : undefined;

      const response = await ordersApi.getPaymentInstructions({
        orderId: orderID!,
        coin: selectedPaymentCoin,
        moderator: moderatorPeerID,
      });

      if (response.paymentType !== 'external_wallet' && !response.paymentAddress) {
        throw new Error(t('payment.noPaymentInstructions'));
      }

      const addr = response.paymentAddress || response.paymentData?.payerAddress || '';
      if (!addr) {
        throw new Error(t('payment.noPaymentAddress'));
      }

      const tokenInfo = getTokenById(selectedTokenId);
      setExternalWalletInfo({
        paymentAddress: addr,
        paymentURI: response.paymentURI,
        amount: response.amount || response.paymentData?.amount || '0',
        coin: selectedTokenId || response.coin || selectedPaymentCoin,
        decimals: tokenInfo?.decimals ?? 8,
        qrCodeData: response.qrCodeData,
        expiresAt: response.expiresAt,
        orderID: orderID!,
      });
    } catch (err) {
      console.error('[Payment] UTXO payment request failed:', err);
      toast({
        title: t('payment.errorTitle'),
        description: err instanceof Error ? err.message : t('payment.loadOrderFailed'),
        variant: 'destructive',
      });
    } finally {
      setIsRequestingPayment(false);
    }
  }, [
    orderDetails,
    isUnsupportedRwaOrder,
    selectedTokenId,
    selectedPaymentCoin,
    paymentProtectionEnabled,
    paymentModerator,
    orderID,
    t,
    toast,
  ]);

  if (error && !isLoadingOrder) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <MobilePageHeader title={t('payment.title')} />
        <main className="py-8">
          <Container size="md">
            <div className="text-center py-12">
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

      <main className="py-4 sm:py-8 pb-24 sm:pb-8">
        <Container size="xl">
          <h1 className="hidden lg:block text-2xl font-bold text-foreground mb-8">
            {t('payment.title')}
          </h1>

          <CheckoutProgressBar currentStep="payment" className="mb-6 sm:mb-8" />

          {(paymentTimeRemaining || paymentExpired) && !externalWalletInfo && (
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

          {isLoadingOrder ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              <div className="lg:col-span-2 space-y-4">
                <Card>
                  <CardContent className="p-6">
                    <Skeleton variant="rounded" height={100} />
                  </CardContent>
                </Card>
              </div>
              <Card>
                <CardContent className="p-6">
                  <Skeleton variant="rounded" height={120} />
                </CardContent>
              </Card>
            </div>
          ) : orderDetails ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              <div className="lg:col-span-2 space-y-4 sm:space-y-6">
                <OrderSummaryCard
                  orderID={orderDetails.orderID}
                  items={orderDetails.items}
                  vendor={orderDetails.vendor}
                  shippingAddress={
                    orderDetails.contractType === 'PHYSICAL_GOOD' &&
                    orderDetails.shippingAddress?.street
                      ? orderDetails.shippingAddress
                      : undefined
                  }
                  memo={orderDetails.memo}
                />

                {isUnsupportedRwaOrder ? (
                  <Card>
                    <CardContent className="p-4 sm:p-6">
                      <p className="text-sm text-muted-foreground">
                        {t('payment.noPaymentMethodsDesc')}
                      </p>
                    </CardContent>
                  </Card>
                ) : externalWalletInfo ? (
                  <ExternalWalletPayment
                    paymentInfo={externalWalletInfo}
                    tokenId={selectedTokenId || undefined}
                    onRefresh={() => {
                      setExternalWalletInfo(null);
                      void handlePayment();
                    }}
                    onClose={() => {
                      setExternalWalletInfo(null);
                      router.push(`/orders/${orderDetails.orderID}`);
                    }}
                  />
                ) : (
                  <>
                    <Card>
                      <CardContent className="p-4 sm:p-6">
                        <h2 className="text-base sm:text-lg font-semibold text-foreground mb-3 sm:mb-4">
                          {t('payment.paymentMethod')}
                        </h2>
                        <PaymentMethodSummary
                          selectedTokenId={selectedTokenId}
                          onEdit={() => openPaymentSelector('/payment?orderID=' + orderID)}
                        />
                      </CardContent>
                    </Card>

                    <PaymentProtectionCard
                      enabled={paymentProtectionEnabled}
                      onEnabledChange={setPaymentProtectionEnabled}
                      selectedModerator={paymentModerator}
                      onChangeModerator={() => openModeratorSelector('/payment?orderID=' + orderID)}
                      protectionDays={45}
                    />
                  </>
                )}
              </div>

              {!isUnsupportedRwaOrder && (
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
                              ={' '}
                              {formatCryptoAmountForSummary(
                                externalWalletInfo.amount,
                                externalWalletInfo.decimals ?? 8
                              )}{' '}
                              {nativeSymbol.toUpperCase()}
                            </p>
                          ) : selectedTokenId && cryptoAmount > 0 ? (
                            <p className="text-xs text-muted-foreground">
                              ≈ {cryptoAmount.toFixed(6)} {nativeSymbol}
                              {secondsAgo !== null && (
                                <span className="ml-1.5 opacity-60">
                                  ({t('payment.rateUpdated', { seconds: secondsAgo })})
                                </span>
                              )}
                            </p>
                          ) : null}
                        </div>
                      </HStack>

                      {externalWalletInfo ? (
                        <div className="p-3 bg-muted/50 rounded-lg text-center">
                          <p className="text-sm text-muted-foreground">
                            {t('payment.waitingForPayment')}
                          </p>
                        </div>
                      ) : (
                        <Button
                          className="w-full touch-feedback hidden sm:flex"
                          size="default"
                          onClick={handlePayment}
                          disabled={
                            isRequestingPayment ||
                            paymentExpired ||
                            !selectedTokenId ||
                            !allowsTokenId(selectedTokenId || '') ||
                            (paymentProtectionEnabled && !paymentModerator)
                          }
                        >
                          {isRequestingPayment
                            ? t('payment.processing')
                            : t('payment.getPaymentInfo')}
                        </Button>
                      )}

                      {!selectedTokenId && (
                        <div className="mt-3 p-2.5 bg-warning/8 border border-warning/20 rounded-md">
                          <p className="text-xs sm:text-sm text-warning">
                            {t('payment.selectPaymentMethodWarning')}
                          </p>
                        </div>
                      )}
                      {paymentProtectionEnabled && !paymentModerator && (
                        <div className="mt-3 p-2.5 bg-warning/8 border border-warning/20 rounded-md">
                          <p className="text-xs sm:text-sm text-warning">
                            {t('payment.selectModeratorWarning')}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          ) : null}
        </Container>
      </main>

      <Footer />

      {orderDetails && !isUnsupportedRwaOrder && !externalWalletInfo && (
        <CheckoutBottomBar
          totalAmount={totalWithFee}
          currency={orderDetails.currency}
          cryptoAmount={cryptoAmount.toFixed(6)}
          cryptoCurrency={nativeSymbol}
          paymentMethod={selectedTokenId || undefined}
          onPay={handlePayment}
          onConnect={handlePayment}
          isLoading={isRequestingPayment}
          isConnected
          isConnecting={false}
          disabled={
            paymentExpired ||
            !selectedTokenId ||
            !allowsTokenId(selectedTokenId || '') ||
            (paymentProtectionEnabled && !paymentModerator)
          }
        />
      )}
    </div>
  );
}
