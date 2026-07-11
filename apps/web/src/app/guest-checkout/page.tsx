'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  analyzeContractTypes,
  useI18n,
  getImageUrl,
  mustAssetIdFromTokenId,
  buildProductHref,
  sanitizeAcceptedPaymentCoins,
  routedStoreContextService,
  buildGuestOrderRequest,
  buildGuestShippingAddressPayload,
} from '@mobazha/core';
import { useGuestCartStore } from '@mobazha/core/stores';
import { renderPairedPrice } from '@mobazha/core/services/currencyService';
import { buyerPortalTokenStorageKey } from '@mobazha/core/services/api/guestCheckout';
import { resolveGuestOrderCreationError } from '@mobazha/core/utils/guestSupplyQuote';
import { useGuestSupplyQuote } from '@mobazha/core/hooks/useGuestSupplyQuote';
import { isSovereignMode } from '@mobazha/core/config/env';
import { getGatewayUrl } from '@mobazha/core/services/api/config';
import { useAddressEncryption } from '@mobazha/core/hooks/useAddressEncryption';
import type { Address } from '@mobazha/core';
import { Header } from '@/components';
import { Container } from '@/components/layouts';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckoutProgressBar } from '@/components/Checkout/CheckoutProgressBar';
import { CartItemRow } from '@/components/Cart/CartItemRow';
import { AddressFormFields } from '@/components/Address/AddressFormFields';
import { PaymentCryptoSelector } from '@/components/Payment/PaymentCryptoSelector';
import {
  ExternalWalletPayment,
  type ExternalWalletPaymentInfo,
} from '@/components/Payment/ExternalWalletPayment';
import { AnonymousModeBanner } from '@/components/GuestCheckout/AnonymousModeBanner';
import { GuestSupplyAvailabilityPanel } from '@/components/GuestCheckout/GuestSupplyAvailabilityPanel';
import { SaveOrderLinkCard } from '@/components/GuestCheckout/SaveOrderLinkCard';
import { HelpPopover } from '@/components/GuestCheckout/HelpPopover';
import type { CommerceGuestOrderResponse } from '@mobazha/commerce-kit/checkout';
import { commerceGuestOrderFromLifecycle } from '@mobazha/commerce-kit/checkout';
import {
  useGuestCheckoutWorkflow,
  useGuestOrderStatus,
} from '@mobazha/commerce-kit/checkout/client';
import { commerceGuestCheckoutPort, commerceGuestOrderStatusPort } from '@/lib/commerce/guestPorts';
import { buildGuestOrderRecoveryHref, rememberGuestOrder } from '@/lib/guestOrderRecovery';
import { referralSessionForSeller } from '@mobazha/core/utils/sellerAffiliateReferral';
import {
  availableShippingOptions,
  effectiveShippingPrice,
  normalizeShippingCountry,
  physicalShippingIsReady,
  shippingSelectionMatchesOption,
} from '@/lib/guestShipping';

type Step = 'cart' | 'shipping' | 'coin' | 'payment';

const STEPS_WITH_SHIPPING: Step[] = ['cart', 'shipping', 'coin', 'payment'];
const STEPS_DIGITAL: Step[] = ['cart', 'coin', 'payment'];

const EMPTY_ADDRESS: Address = {
  name: '',
  addressLineOne: '',
  city: '',
  state: '',
  postalCode: '',
  country: '',
  addressNotes: '',
};

function normalizeGuestPaymentCoin(tokenOrAssetID: string): string {
  const normalized = tokenOrAssetID.trim();
  const lower = normalized.toLowerCase();
  if (lower.startsWith('crypto:') || lower.startsWith('fiat:')) return normalized;
  return mustAssetIdFromTokenId(normalized);
}

function toPaymentInfo(data: CommerceGuestOrderResponse, coin: string): ExternalWalletPaymentInfo {
  return {
    paymentAddress: data.paymentAddress,
    amount: data.paymentAmount,
    coin,
    expiresAt: data.expiresAt,
    orderID: data.orderToken,
  };
}

export default function GuestCheckoutPage() {
  const { t } = useI18n();
  const router = useRouter();
  const { items, removeItem, updateQuantity, updateShipping, getTotal, getItemCount, clearCart } =
    useGuestCartStore();
  const [step, setStep] = useState<Step>('cart');
  const [addressData, setAddressData] = useState<Address>(EMPTY_ADDRESS);
  // PM-3a: holds the PGP-encrypted address ciphertext once encryption succeeds.
  const [encryptedAddress, setEncryptedAddress] = useState<string | null>(null);
  const [contactEmail, setContactEmail] = useState('');
  const [selectedCoin, setSelectedCoin] = useState<string>('');
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const checkoutWorkflow = useGuestCheckoutWorkflow(commerceGuestCheckoutPort);
  const pendingOrder =
    checkoutWorkflow.state.status === 'awaiting-payment' ? checkoutWorkflow.state.order : undefined;
  const guestOrderLifecycle = useGuestOrderStatus(
    commerceGuestOrderStatusPort,
    pendingOrder?.orderToken,
    { pollIntervalMs: 10_000 }
  );
  const trackedGuestOrder = commerceGuestOrderFromLifecycle(
    guestOrderLifecycle.state,
    pendingOrder?.orderToken
  );
  const supplyQuote = useGuestSupplyQuote(items, items.length > 0);

  // PM-3a: fetch vendor PGP public key for client-side address encryption.
  // Only needed for physical goods that require a shipping address.
  const hasPhysicalItems = items.some(i => i.contractType === 'PHYSICAL_GOOD');
  const {
    status: addressEncryptionStatus,
    encryptionAvailable,
    isLoading: addressEncryptionLoading,
    fingerprint: addressEncryptionFingerprint,
    encryptAddress,
  } = useAddressEncryption(isSovereignMode() && hasPhysicalItems ? getGatewayUrl() : '');

  const acceptedCoins = useMemo(
    () => sanitizeAcceptedPaymentCoins(checkoutWorkflow.state.settings?.availableCoins ?? []),
    [checkoutWorkflow.state.settings?.availableCoins]
  );
  const coinsLoading =
    checkoutWorkflow.state.status === 'idle' ||
    checkoutWorkflow.state.status === 'loading-settings';

  const stepLabels: Record<string, string> = {
    cart: t('guestCheckout.stepCart'),
    shipping: t('guestCheckout.stepShipping'),
    coin: t('guestCheckout.stepCoin'),
    payment: t('guestCheckout.stepPay'),
  };

  const total = getTotal();
  const itemCount = getItemCount();
  const contractTypeCheckout = useMemo(() => analyzeContractTypes(items), [items]);
  const {
    hasMissing: hasMissingContractType,
    hasMixed: hasMixedContractTypes,
    canCheckout: canContinueCart,
    needsShippingAddress,
    hasDigitalItems,
  } = contractTypeCheckout;
  const hasSingleAcceptedCoin = !coinsLoading && acceptedCoins.length === 1;
  const checkoutSteps = useMemo<Step[]>(() => {
    if (!hasSingleAcceptedCoin) {
      return needsShippingAddress ? STEPS_WITH_SHIPPING : STEPS_DIGITAL;
    }
    return needsShippingAddress ? ['cart', 'shipping', 'payment'] : ['cart', 'payment'];
  }, [hasSingleAcceptedCoin, needsShippingAddress]);
  const supplyBlocksCheckout =
    items.length > 0 &&
    (supplyQuote.loading || (supplyQuote.authoritative && !supplyQuote.canProceed));

  const handleAddressChange = (field: keyof Address, value: string) => {
    setAddressData(prev => ({ ...prev, [field]: value }));
    // Reset cached ciphertext whenever the user edits the address.
    setEncryptedAddress(null);
  };

  const addressProtectionRequired = isSovereignMode() && needsShippingAddress;
  const countryCode = normalizeShippingCountry(addressData.country);
  const physicalShippingReady = physicalShippingIsReady(items, countryCode, total?.amount ?? 0);
  const canSubmitShipping =
    addressData.name.trim() &&
    addressData.addressLineOne.trim() &&
    addressData.city.trim() &&
    countryCode &&
    physicalShippingReady &&
    (!addressProtectionRequired || encryptionAvailable);

  useEffect(() => {
    if (!countryCode) return;
    for (const item of items) {
      if (item.contractType !== 'PHYSICAL_GOOD' || !item.shippingOptions?.length) continue;
      const available = availableShippingOptions(item, countryCode, total?.amount ?? 0);
      const selectedOption = available.find(option => shippingSelectionMatchesOption(item, option));
      const selectedStillAvailable = Boolean(selectedOption);
      const selectedPrice = selectedOption
        ? effectiveShippingPrice(selectedOption, total?.amount ?? 0)
        : undefined;
      if (!selectedStillAvailable || selectedPrice !== item.shipping?.price) {
        const option = selectedOption ?? available[0];
        updateShipping(
          item.slug,
          option
            ? {
                name: option.zoneID || option.zoneName,
                service: option.rateID || option.rateName,
                price: effectiveShippingPrice(option, total?.amount ?? 0),
                currency: option.currency,
                estimatedDelivery: option.estimatedDelivery,
              }
            : undefined
        );
      }
    }
  }, [countryCode, items, total?.amount, updateShipping]);

  const selectedShippingTotal = useMemo(() => {
    if (!total || !needsShippingAddress) return null;
    const selected = items.filter(item => item.contractType === 'PHYSICAL_GOOD');
    if (selected.some(item => item.shippingOptions?.length && !item.shipping)) return null;
    if (
      selected.some(item => item.shipping?.currency && item.shipping.currency !== total.currency)
    ) {
      return null;
    }
    return selected.reduce((sum, item) => {
      const option = (item.shippingOptions ?? []).find(candidate =>
        shippingSelectionMatchesOption(item, candidate)
      );
      return sum + Number(option ? effectiveShippingPrice(option, total.amount) : 0);
    }, 0);
  }, [items, needsShippingAddress, total]);

  const submitOrderAbortRef = useRef(false);

  useEffect(() => {
    submitOrderAbortRef.current = false;
    return () => {
      submitOrderAbortRef.current = true;
    };
  }, []);

  // Auto-navigate once the shared status lifecycle observes payment.
  useEffect(() => {
    if (!pendingOrder || !trackedGuestOrder || trackedGuestOrder.state === 'AWAITING_PAYMENT')
      return;
    router.push(
      buildGuestOrderRecoveryHref(pendingOrder.orderToken, {
        storeRouteToken: routedStoreContextService.getStoreRouteToken(),
        buyerPortalToken: pendingOrder.buyerPortalToken,
      })
    );
  }, [pendingOrder, router, trackedGuestOrder]);

  const submitGuestOrder = useCallback(
    async (coin: string) => {
      if (hasMissingContractType || hasMixedContractTypes) {
        setStep('cart');
        return;
      }
      setSubmissionError(null);
      try {
        // Sovereign physical checkout is fail-closed: plaintext delivery
        // addresses must never leave the buyer's browser.
        let finalEncrypted: string | null = encryptedAddress;
        if (addressProtectionRequired && !encryptionAvailable) {
          throw new Error('Seller address protection is not ready. Please try again later.');
        }
        if (addressProtectionRequired && !finalEncrypted) {
          finalEncrypted = await encryptAddress(buildGuestShippingAddressPayload(addressData));
          if (!finalEncrypted.startsWith('-----BEGIN PGP MESSAGE-----')) {
            throw new Error('Shipping address encryption failed. No order was created.');
          }
          if (!submitOrderAbortRef.current) {
            setEncryptedAddress(finalEncrypted);
          }
        }

        const req = buildGuestOrderRequest(
          items,
          needsShippingAddress ? addressData : null,
          addressProtectionRequired ? finalEncrypted : null,
          contactEmail,
          coin,
          referralSessionForSeller(items[0]?.vendorPeerID)?.referralSessionID
        );
        const result = await checkoutWorkflow.submit(req);
        if (submitOrderAbortRef.current) return;
        if (!result.ok) {
          if (!result.aborted) {
            setSubmissionError(resolveGuestOrderCreationError(result.error, t));
          }
          return;
        }
        const res = result.order;
        if (res.buyerPortalToken && typeof window !== 'undefined') {
          window.sessionStorage.setItem(
            buyerPortalTokenStorageKey(res.orderToken),
            res.buyerPortalToken
          );
        }
        rememberGuestOrder({
          orderToken: res.orderToken,
          state: 'AWAITING_PAYMENT',
          itemTitles: res.items.map(item => item.listingTitle),
          paymentAmount: res.paymentAmount,
          paymentCoin: res.paymentCoin,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          storeRouteToken: routedStoreContextService.getStoreRouteToken() ?? undefined,
        });
        clearCart();
      } catch (err) {
        if (submitOrderAbortRef.current) return;
        setSubmissionError(resolveGuestOrderCreationError(err, t));
      }
    },
    [
      items,
      needsShippingAddress,
      addressProtectionRequired,
      addressData,
      encryptedAddress,
      encryptionAvailable,
      encryptAddress,
      contactEmail,
      clearCart,
      hasMissingContractType,
      hasMixedContractTypes,
      checkoutWorkflow,
      t,
    ]
  );

  const handleCoinSelect = (tokenId: string) => {
    const paymentCoin = normalizeGuestPaymentCoin(tokenId);
    setSelectedCoin(paymentCoin);
    setStep('payment');
    void submitGuestOrder(paymentCoin);
  };

  const continueToPayment = () => {
    if (hasSingleAcceptedCoin) {
      handleCoinSelect(acceptedCoins[0]);
      return;
    }
    setStep('coin');
  };

  const awaitingOrder =
    checkoutWorkflow.state.status === 'awaiting-payment' ? checkoutWorkflow.state.order : null;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="py-8">
        <Container size="md">
          <CheckoutProgressBar
            steps={checkoutSteps}
            labels={stepLabels}
            currentStep={step}
            onStepClick={s => {
              const idx = checkoutSteps.indexOf(s as Step);
              if (idx < checkoutSteps.indexOf(step)) setStep(s as Step);
            }}
            className="mb-8"
          />

          {/* Step 1: Cart Review */}
          {step === 'cart' && (
            <div className="space-y-6">
              <AnonymousModeBanner />

              <h2 className="text-lg font-semibold">
                {t('guestCheckout.reviewCart', {
                  count: itemCount,
                  itemWord:
                    itemCount === 1
                      ? t('guestCheckout.itemSingular')
                      : t('guestCheckout.itemPlural'),
                })}
              </h2>

              {items.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-muted-foreground text-lg">{t('guestCheckout.cartEmpty')}</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    {t('guestCheckout.cartEmptyHint')}
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    {items.map(item => {
                      const thumbUrl = getImageUrl(item.thumbnail);
                      return (
                        <CartItemRow
                          key={`${item.slug}-${(item.options ?? []).map(o => o.value).join(',')}`}
                          thumbnailUrl={thumbUrl}
                          title={item.title}
                          href={buildProductHref(item.slug, item.vendorPeerID)}
                          options={item.options}
                          contractType={item.contractType}
                          unitPrice={item.price.amount}
                          currency={item.price.currency}
                          quantity={item.quantity}
                          onUpdateQuantity={qty => updateQuantity(item.slug, qty)}
                          onRemove={() => removeItem(item.slug)}
                        />
                      );
                    })}
                  </div>

                  {total && (
                    <div className="flex justify-between items-center pt-4 border-t">
                      <span className="font-medium">{t('guestCheckout.total')}</span>
                      <span className="text-lg font-semibold">
                        {renderPairedPrice(total.amount, total.currency, total.currency, {
                          isMinimalUnit: true,
                          divisibility: total.divisibility,
                        })}
                      </span>
                    </div>
                  )}

                  {(hasMixedContractTypes || hasMissingContractType) && (
                    <div
                      role="alert"
                      className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm"
                    >
                      <p className="font-medium">
                        {hasMixedContractTypes
                          ? t('order.mixedContractTypesTitle')
                          : t('order.missingContractTypeTitle')}
                      </p>
                      <p className="mt-1 text-muted-foreground">
                        {hasMixedContractTypes
                          ? t('order.mixedContractTypesBody')
                          : t('order.missingContractTypeBody')}
                      </p>
                    </div>
                  )}

                  {supplyQuote.showPanel && (
                    <GuestSupplyAvailabilityPanel
                      cartItems={items}
                      quote={supplyQuote.quote}
                      loading={supplyQuote.loading}
                      error={supplyQuote.error}
                      blocking={supplyBlocksCheckout}
                    />
                  )}

                  {/* For orders without shipping, show a compact optional email field before
                      proceeding to coin selection (no shipping address needed). */}
                  {!needsShippingAddress && (
                    <div className="space-y-1.5">
                      <Label htmlFor="cart-email">{t('guestCheckout.emailLabel')}</Label>
                      <Input
                        id="cart-email"
                        type="email"
                        value={contactEmail}
                        onChange={e => setContactEmail(e.target.value)}
                        placeholder="your@email.com"
                      />
                      <p className="text-xs text-muted-foreground">
                        {t('guestCheckout.emailContactHint')}
                      </p>
                    </div>
                  )}

                  <Button
                    className="w-full"
                    size="lg"
                    onClick={() =>
                      needsShippingAddress ? setStep('shipping') : continueToPayment()
                    }
                    disabled={!canContinueCart || supplyBlocksCheckout}
                  >
                    {needsShippingAddress
                      ? t('guestCheckout.continueToShipping')
                      : t('guestCheckout.continueToPayment')}
                  </Button>
                </>
              )}
            </div>
          )}

          {/* Step 2: Shipping Info — reuses AddressFormFields */}
          {step === 'shipping' && (
            <form
              onSubmit={e => {
                e.preventDefault();
                if (canSubmitShipping) continueToPayment();
              }}
              className="space-y-6"
            >
              <h2 className="text-lg font-semibold">{t('guestCheckout.shippingInfo')}</h2>

              <Card>
                <CardContent className="p-4">
                  <AddressFormFields
                    values={addressData}
                    onChange={handleAddressChange}
                    idPrefix="guest-"
                    showCompany={false}
                    showAddressLineTwo={false}
                    extraFieldsAfterName={
                      <div className="space-y-1.5">
                        <Label htmlFor="guest-email">{t('guestCheckout.emailLabel')}</Label>
                        <Input
                          id="guest-email"
                          type="email"
                          value={contactEmail}
                          onChange={e => setContactEmail(e.target.value)}
                          placeholder="your@email.com"
                        />
                        <p className="text-xs text-muted-foreground">
                          {t('guestCheckout.emailContactHint')}
                        </p>
                      </div>
                    }
                  />
                </CardContent>
              </Card>

              {items
                .filter(item => item.contractType === 'PHYSICAL_GOOD')
                .map(item => {
                  const available = availableShippingOptions(item, countryCode, total?.amount ?? 0);
                  return (
                    <Card key={`shipping-${item.slug}`}>
                      <CardContent className="space-y-3 p-4">
                        <div>
                          <p className="text-sm font-medium">Shipping method</p>
                          <p className="text-xs text-muted-foreground">{item.title}</p>
                        </div>
                        {available.length ? (
                          <div className="space-y-2">
                            {available.map(option => {
                              const selected = shippingSelectionMatchesOption(item, option);
                              return (
                                <label
                                  key={`${option.zoneID}-${option.rateID}`}
                                  className="flex cursor-pointer items-center justify-between gap-4 rounded-md border p-3"
                                >
                                  <span>
                                    <span className="block text-sm font-medium">
                                      {option.rateName}
                                    </span>
                                    {option.estimatedDelivery && (
                                      <span className="block text-xs text-muted-foreground">
                                        {option.estimatedDelivery}
                                      </span>
                                    )}
                                  </span>
                                  <span className="flex items-center gap-3">
                                    <span className="text-sm font-medium">
                                      {Number(
                                        effectiveShippingPrice(option, total?.amount ?? 0)
                                      ) === 0
                                        ? t('shipping.free')
                                        : renderPairedPrice(
                                            Number(
                                              effectiveShippingPrice(option, total?.amount ?? 0)
                                            ),
                                            option.currency,
                                            option.currency,
                                            { isMinimalUnit: true }
                                          )}
                                    </span>
                                    <input
                                      type="radio"
                                      name={`shipping-${item.slug}`}
                                      checked={selected}
                                      onChange={() =>
                                        updateShipping(item.slug, {
                                          name: option.zoneID || option.zoneName,
                                          service: option.rateID || option.rateName,
                                          price: effectiveShippingPrice(option, total?.amount ?? 0),
                                          currency: option.currency,
                                          estimatedDelivery: option.estimatedDelivery,
                                        })
                                      }
                                    />
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        ) : !item.shippingOptions?.length ? (
                          <p className="text-sm text-destructive">
                            {t('shipping.noShippingOptionsConfigured')}
                          </p>
                        ) : countryCode ? (
                          <p className="text-sm text-destructive">
                            {t('product.noShippingOptions')}
                          </p>
                        ) : null}
                      </CardContent>
                    </Card>
                  );
                })}

              {total && selectedShippingTotal !== null && (
                <Card>
                  <CardContent className="space-y-2 p-4 text-sm">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Subtotal</span>
                      <span>
                        {renderPairedPrice(total.amount, total.currency, total.currency, {
                          isMinimalUnit: true,
                          divisibility: total.divisibility,
                        })}
                      </span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Shipping</span>
                      <span>
                        {selectedShippingTotal === 0
                          ? t('shipping.free')
                          : renderPairedPrice(
                              selectedShippingTotal,
                              total.currency,
                              total.currency,
                              { isMinimalUnit: true, divisibility: total.divisibility }
                            )}
                      </span>
                    </div>
                    <div className="flex justify-between border-t pt-2 font-semibold">
                      <span>Total</span>
                      <span>
                        {renderPairedPrice(
                          total.amount + selectedShippingTotal,
                          total.currency,
                          total.currency,
                          { isMinimalUnit: true, divisibility: total.divisibility }
                        )}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* PM-3a: encryption status indicator */}
              {addressProtectionRequired && (
                <div
                  className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm ${
                    addressEncryptionStatus === 'ready'
                      ? 'bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400'
                      : addressEncryptionStatus === 'loading'
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400'
                        : 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400'
                  }`}
                  role={addressEncryptionStatus === 'ready' ? 'status' : 'alert'}
                >
                  <span>
                    {addressEncryptionStatus === 'ready'
                      ? '🔒'
                      : addressEncryptionLoading
                        ? '…'
                        : '⚠️'}
                  </span>
                  <span>
                    {addressEncryptionStatus === 'ready'
                      ? t('guestCheckout.addressWillBeEncrypted', {
                          defaultValue: 'Your delivery address is encrypted for this seller.',
                        })
                      : addressEncryptionStatus === 'loading'
                        ? t('guestCheckout.addressProtectionPreparing', {
                            defaultValue: 'Preparing secure address protection…',
                          })
                        : t('guestCheckout.addressProtectionUnavailable', {
                            defaultValue:
                              'This seller cannot securely receive a delivery address yet. Checkout is paused.',
                          })}
                    {addressEncryptionStatus === 'ready' && addressEncryptionFingerprint && (
                      <span className="ml-1 font-mono text-xs opacity-75">
                        {addressEncryptionFingerprint.slice(-12)}
                      </span>
                    )}
                  </span>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  size="lg"
                  type="button"
                  onClick={() => setStep('cart')}
                >
                  {t('guestCheckout.back')}
                </Button>
                <Button className="flex-1" size="lg" type="submit" disabled={!canSubmitShipping}>
                  {t('guestCheckout.continueToPayment')}
                </Button>
              </div>
            </form>
          )}

          {/* Step 3: Coin Selection — reuses PaymentCryptoSelector */}
          {step === 'coin' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold">{t('guestCheckout.choosePayment')}</h2>
              <p className="text-sm text-muted-foreground">
                {t('guestCheckout.choosePaymentHint')}
              </p>
              {coinsLoading ? (
                <div className="h-24 flex items-center justify-center">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : acceptedCoins.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  {t('guestCheckout.noPaymentMethodsAvailable', {
                    defaultValue:
                      'No payment methods available. The seller has not configured accepted cryptocurrencies yet.',
                  })}
                </p>
              ) : (
                <PaymentCryptoSelector
                  acceptedCurrencies={acceptedCoins}
                  selectedTokenId={selectedCoin}
                  onSelect={handleCoinSelect}
                  showFiatMethods={false}
                />
              )}
              <Button
                variant="outline"
                className="w-full"
                size="lg"
                onClick={() => setStep(needsShippingAddress ? 'shipping' : 'cart')}
              >
                {t('guestCheckout.back')}
              </Button>
            </div>
          )}

          {/* Step 4: Payment */}
          {step === 'payment' && (
            <div className="space-y-6">
              {checkoutWorkflow.state.status === 'submitting' && (
                <div className="flex flex-col items-center justify-center py-16 gap-4">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <p className="text-muted-foreground">{t('guestCheckout.creatingOrder')}</p>
                </div>
              )}

              {checkoutWorkflow.state.status === 'error' &&
                checkoutWorkflow.state.operation === 'create-order' &&
                submissionError && (
                  <div className="space-y-6 text-center py-8">
                    <div className="text-destructive text-4xl">!</div>
                    <h2 className="text-lg font-semibold">{t('guestCheckout.orderFailed')}</h2>
                    <p className="text-muted-foreground">{submissionError}</p>
                    <Button
                      variant="outline"
                      onClick={() => {
                        checkoutWorkflow.resetError();
                        setSubmissionError(null);
                        setStep(
                          hasSingleAcceptedCoin
                            ? needsShippingAddress
                              ? 'shipping'
                              : 'cart'
                            : 'coin'
                        );
                      }}
                    >
                      {t('guestCheckout.goBack')}
                    </Button>
                  </div>
                )}

              {awaitingOrder && (
                <>
                  <ExternalWalletPayment
                    paymentInfo={toPaymentInfo(awaitingOrder, selectedCoin)}
                    tokenId={selectedCoin}
                  />

                  <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      {t('guestCheckout.paymentAmountHelpTitle')}
                      <HelpPopover
                        title={t('guestCheckout.paymentAmountHelpTitle')}
                        body={t('guestCheckout.paymentAmountHelpBody')}
                        ariaLabel={t('guestCheckout.paymentAmountHelpTitle')}
                      />
                    </span>
                    <span className="inline-flex items-center gap-1">
                      {t('guestCheckout.expireTimeHelpTitle')}
                      <HelpPopover
                        title={t('guestCheckout.expireTimeHelpTitle')}
                        body={t('guestCheckout.expireTimeHelpBody')}
                        ariaLabel={t('guestCheckout.expireTimeHelpTitle')}
                      />
                    </span>
                  </div>

                  {hasDigitalItems && (
                    <div
                      role="note"
                      className="rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm"
                      data-testid="guest-checkout-digital-save-link-hint"
                    >
                      <p className="font-semibold mb-1">
                        {t('guestCheckout.digitalSaveLinkTitle')}
                      </p>
                      <p className="text-muted-foreground">
                        {t('guestCheckout.digitalSaveLinkBody')}
                      </p>
                    </div>
                  )}

                  <SaveOrderLinkCard
                    orderUrl={buildGuestOrderRecoveryHref(awaitingOrder.orderToken, {
                      storeRouteToken: routedStoreContextService.getStoreRouteToken(),
                      buyerPortalToken: awaitingOrder.buyerPortalToken,
                      origin: typeof window === 'undefined' ? undefined : window.location.origin,
                    })}
                    title={t('guestCheckout.saveLinkTitle')}
                    description={t('guestCheckout.saveLinkDescription')}
                    copyLabel={t('guestCheckout.saveLinkCopy')}
                    copiedLabel={t('guestCheckout.saveLinkCopied')}
                    shareLabel={t('common.share')}
                    telegramSendLabel={t('guestOrder.telegramSend')}
                    telegramSendingLabel={t('guestOrder.telegramSending')}
                    telegramSentLabel={t('guestOrder.telegramSent')}
                    telegramSendError={t('guestOrder.telegramSendError')}
                    telegramPrivacyNote={t('guestOrder.telegramPrivacyNote')}
                    testId="guest-checkout-save-link"
                  />

                  <p className="text-xs text-muted-foreground text-center">
                    {t('guestCheckout.directPaymentDisclaimer')}
                  </p>
                  <Button
                    className="w-full"
                    size="lg"
                    onClick={() =>
                      router.push(
                        buildGuestOrderRecoveryHref(awaitingOrder.orderToken, {
                          storeRouteToken: routedStoreContextService.getStoreRouteToken(),
                          buyerPortalToken: awaitingOrder.buyerPortalToken,
                        })
                      )
                    }
                  >
                    {t('guestCheckout.trackOrderStatus')}
                  </Button>
                </>
              )}
            </div>
          )}
        </Container>
      </main>
    </div>
  );
}
