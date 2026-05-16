'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n, getImageUrl, mustAssetIdFromTokenId } from '@mobazha/core';
import { useGuestCartStore, type GuestCartItem } from '@mobazha/core/stores';
import { renderPairedPrice } from '@mobazha/core/services/currencyService';
import {
  buyerPortalTokenStorageKey,
  getGuestCheckoutSettings,
  createGuestOrder,
  type CreateGuestOrderRequest,
  type GuestOrderResponse,
} from '@mobazha/core/services/api/guestCheckout';
import { GUEST_CHECKOUT_DEFAULT_COINS } from '@mobazha/core/config/guestCheckoutCoins';
import { isOutpostMode } from '@mobazha/core/config/env';
import { getPaymentMethods } from '@mobazha/core/services/api/fiat';
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
import { SaveOrderLinkCard } from '@/components/GuestCheckout/SaveOrderLinkCard';
import { HelpPopover } from '@/components/GuestCheckout/HelpPopover';

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

type PaymentState =
  | { status: 'idle' }
  | { status: 'submitting' }
  | { status: 'awaiting'; data: GuestOrderResponse }
  | { status: 'error'; message: string };

function buildOrderRequest(
  items: GuestCartItem[],
  addr: Address | null,
  email: string,
  coin: string
): CreateGuestOrderRequest {
  return {
    items: items.map(i => ({
      slug: i.slug,
      listingHash: i.listingHash,
      quantity: i.quantity,
      options: i.options,
      shipping: i.shipping,
    })),
    paymentCoin: coin,
    contactEmail: email || undefined,
    shippingAddress: addr
      ? {
          name: addr.name,
          address: addr.addressLineOne,
          city: addr.city,
          state: addr.state,
          postalCode: addr.postalCode,
          country: addr.country,
          addressNotes: addr.addressNotes || undefined,
        }
      : undefined,
  };
}

function toPaymentInfo(data: GuestOrderResponse, coin: string): ExternalWalletPaymentInfo {
  return {
    paymentAddress: data.paymentAddress,
    amount: data.paymentAmount,
    coin,
    expiresAt: data.expiresAt,
    orderID: data.orderToken,
  };
}

function buildGuestOrderUrl(
  orderToken: string,
  buyerPortalToken?: string,
  absolute = false
): string {
  const path = `/guest-order/${encodeURIComponent(orderToken)}`;
  const fragment = buyerPortalToken
    ? `#buyerPortalToken=${encodeURIComponent(buyerPortalToken)}`
    : '';
  if (!absolute || typeof window === 'undefined') return `${path}${fragment}`;
  return `${window.location.origin}${path}${fragment}`;
}

export default function GuestCheckoutPage() {
  const { t } = useI18n();
  const router = useRouter();
  const { items, removeItem, updateQuantity, getTotal, getItemCount, clearCart } =
    useGuestCartStore();
  const [step, setStep] = useState<Step>('cart');
  const [addressData, setAddressData] = useState<Address>(EMPTY_ADDRESS);
  const [contactEmail, setContactEmail] = useState('');
  const [selectedCoin, setSelectedCoin] = useState<string>('');
  const [acceptedCoins, setAcceptedCoins] = useState<string[]>(
    __OUTPOST__ ? [] : GUEST_CHECKOUT_DEFAULT_COINS
  );
  const [coinsLoading, setCoinsLoading] = useState(false);
  const [paymentState, setPaymentState] = useState<PaymentState>({ status: 'idle' });

  useEffect(() => {
    if (isOutpostMode()) {
      const vendorPeerID = items[0]?.vendorPeerID;
      if (!vendorPeerID) return;
      const fetchCoins = async () => {
        setCoinsLoading(true);
        try {
          const data = await getPaymentMethods(vendorPeerID);
          if (Array.isArray(data.crypto) && data.crypto.length > 0) {
            setAcceptedCoins(data.crypto);
          }
        } catch {
          // leave acceptedCoins empty → UI shows "no payment methods"
        } finally {
          setCoinsLoading(false);
        }
      };
      fetchCoins();
      return;
    }
    getGuestCheckoutSettings()
      .then(res => {
        const coins = res.acceptedCoins;
        if (Array.isArray(coins) && coins.length > 0) setAcceptedCoins(coins);
      })
      .catch(() => {});
  }, [items]);

  const stepLabels: Record<string, string> = {
    cart: t('guestCheckout.stepCart'),
    shipping: t('guestCheckout.stepShipping'),
    coin: t('guestCheckout.stepCoin'),
    payment: t('guestCheckout.stepPay'),
  };

  const total = getTotal();
  const itemCount = getItemCount();
  // All items are digital — no physical delivery address needed.
  const isAllDigital = items.length > 0 && items.every(i => i.contractType === 'DIGITAL_GOOD');
  // True if any cart item is a digital product. The guest order page is the
  // only access surface for download links / license keys, so we surface an
  // emphasized "save this link" notice on top of the generic SaveOrderLinkCard.
  const hasDigitalItems = items.some(i => i.contractType === 'DIGITAL_GOOD');
  const STEPS = isAllDigital ? STEPS_DIGITAL : STEPS_WITH_SHIPPING;

  const handleAddressChange = (field: keyof Address, value: string) => {
    setAddressData(prev => ({ ...prev, [field]: value }));
  };

  const canSubmitShipping =
    addressData.name.trim() &&
    addressData.addressLineOne.trim() &&
    addressData.city.trim() &&
    addressData.country.trim();

  const submitOrderAbortRef = useRef(false);

  useEffect(
    () => () => {
      submitOrderAbortRef.current = true;
    },
    []
  );

  const submitGuestOrder = useCallback(
    async (coin: string) => {
      setPaymentState({ status: 'submitting' });
      try {
        // Pass null for address when all items are digital (no delivery needed)
        const req = buildOrderRequest(items, isAllDigital ? null : addressData, contactEmail, coin);
        const res = await createGuestOrder(req);
        if (submitOrderAbortRef.current) return;
        if (res.buyerPortalToken && typeof window !== 'undefined') {
          window.sessionStorage.setItem(
            buyerPortalTokenStorageKey(res.orderToken),
            res.buyerPortalToken
          );
        }
        setPaymentState({ status: 'awaiting', data: res });
        clearCart();
      } catch (err) {
        if (submitOrderAbortRef.current) return;
        const msg = err instanceof Error ? err.message : 'Order creation failed';
        setPaymentState({ status: 'error', message: msg });
      }
    },
    [items, isAllDigital, addressData, contactEmail, clearCart]
  );

  const handleCoinSelect = (tokenId: string) => {
    const paymentCoin =
      tokenId.startsWith('crypto:') || tokenId.startsWith('fiat:')
        ? tokenId
        : mustAssetIdFromTokenId(tokenId);
    setSelectedCoin(paymentCoin);
    setStep('payment');
    void submitGuestOrder(paymentCoin);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="py-8">
        <Container size="md">
          <CheckoutProgressBar
            steps={STEPS}
            labels={stepLabels}
            currentStep={step}
            onStepClick={s => {
              const idx = STEPS.indexOf(s as Step);
              if (idx < STEPS.indexOf(step)) setStep(s as Step);
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
                          href={`/product/${item.slug}?peerID=${item.vendorPeerID}`}
                          options={item.options}
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

                  {/* For digital-only orders, show a compact email field before
                      proceeding to coin selection (no shipping address needed). */}
                  {isAllDigital && (
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
                        {t('guestCheckout.emailDigitalHint', {
                          defaultValue: 'Optional. We use this to send order updates.',
                        })}
                      </p>
                    </div>
                  )}

                  <Button
                    className="w-full"
                    size="lg"
                    onClick={() => setStep(isAllDigital ? 'coin' : 'shipping')}
                  >
                    {isAllDigital
                      ? t('guestCheckout.continueToPayment')
                      : t('guestCheckout.continueToShipping')}
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
                if (canSubmitShipping) setStep('coin');
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
                      </div>
                    }
                  />
                </CardContent>
              </Card>

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
                onClick={() => setStep('shipping')}
              >
                {t('guestCheckout.back')}
              </Button>
            </div>
          )}

          {/* Step 4: Payment */}
          {step === 'payment' && (
            <div className="space-y-6">
              {paymentState.status === 'submitting' && (
                <div className="flex flex-col items-center justify-center py-16 gap-4">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <p className="text-muted-foreground">{t('guestCheckout.creatingOrder')}</p>
                </div>
              )}

              {paymentState.status === 'error' && (
                <div className="space-y-6 text-center py-8">
                  <div className="text-destructive text-4xl">!</div>
                  <h2 className="text-lg font-semibold">{t('guestCheckout.orderFailed')}</h2>
                  <p className="text-muted-foreground">{paymentState.message}</p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setPaymentState({ status: 'idle' });
                      setStep('coin');
                    }}
                  >
                    {t('guestCheckout.goBack')}
                  </Button>
                </div>
              )}

              {paymentState.status === 'awaiting' && (
                <>
                  <ExternalWalletPayment
                    paymentInfo={toPaymentInfo(paymentState.data, selectedCoin)}
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
                    orderUrl={buildGuestOrderUrl(
                      paymentState.data.orderToken,
                      paymentState.data.buyerPortalToken,
                      true
                    )}
                    title={t('guestCheckout.saveLinkTitle')}
                    description={t('guestCheckout.saveLinkDescription')}
                    copyLabel={t('guestCheckout.saveLinkCopy')}
                    copiedLabel={t('guestCheckout.saveLinkCopied')}
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
                        buildGuestOrderUrl(
                          paymentState.data.orderToken,
                          paymentState.data.buyerPortalToken
                        )
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
