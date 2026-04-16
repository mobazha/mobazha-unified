'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n, getImageUrl } from '@mobazha/core';
import { useGuestCartStore, type GuestCartItem } from '@mobazha/core/stores';
import { formatPrice } from '@mobazha/core/services/currencyService';
import {
  getGuestCheckoutSettings,
  createGuestOrder,
  type CreateGuestOrderRequest,
  type GuestOrderResponse,
} from '@mobazha/core/services/api/guestCheckout';
import { GUEST_CHECKOUT_DEFAULT_COINS } from '@mobazha/core/config/guestCheckoutCoins';
import { Header } from '@/components';
import { Container } from '@/components/layouts';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckoutProgressBar } from '@/components/Checkout/CheckoutProgressBar';
import { CartItemRow } from '@/components/Cart/CartItemRow';
import { PaymentCryptoSelector } from '@/components/Payment/PaymentCryptoSelector';
import { ExternalWalletPayment, type ExternalWalletPaymentInfo } from '@/components/Payment/ExternalWalletPayment';
import { cn } from '@/lib/utils';

type Step = 'cart' | 'shipping' | 'coin' | 'payment';

const STEPS: Step[] = ['cart', 'shipping', 'coin', 'payment'];

interface ShippingInfo {
  name: string;
  email: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  addressNotes: string;
}

type PaymentState =
  | { status: 'idle' }
  | { status: 'submitting' }
  | { status: 'awaiting'; data: GuestOrderResponse }
  | { status: 'error'; message: string };

function buildOrderRequest(
  items: GuestCartItem[],
  shipping: ShippingInfo,
  coin: string,
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
    contactEmail: shipping.email || undefined,
    shippingAddress: {
      name: shipping.name,
      address: shipping.address,
      city: shipping.city,
      state: shipping.state,
      postalCode: shipping.postalCode,
      country: shipping.country,
      addressNotes: shipping.addressNotes || undefined,
    },
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

export default function GuestCheckoutPage() {
  const { t } = useI18n();
  const router = useRouter();
  const { items, removeItem, updateQuantity, getTotal, getItemCount, clearCart } = useGuestCartStore();
  const [step, setStep] = useState<Step>('cart');
  const [shippingInfo, setShippingInfo] = useState<ShippingInfo>({
    name: '', email: '', address: '', city: '', state: '', postalCode: '', country: '', addressNotes: '',
  });
  const [selectedCoin, setSelectedCoin] = useState<string>('');
  const [acceptedCoins, setAcceptedCoins] = useState<string[]>(GUEST_CHECKOUT_DEFAULT_COINS);
  const [paymentState, setPaymentState] = useState<PaymentState>({ status: 'idle' });

  useEffect(() => {
    getGuestCheckoutSettings()
      .then(res => {
        const coins = res.data.acceptedCoins;
        if (Array.isArray(coins) && coins.length > 0) setAcceptedCoins(coins);
      })
      .catch(() => {});
  }, []);

  const stepLabels: Record<string, string> = {
    cart: t('guestCheckout.stepCart'),
    shipping: t('guestCheckout.stepShipping'),
    coin: t('guestCheckout.stepCoin'),
    payment: t('guestCheckout.stepPay'),
  };

  const total = getTotal();
  const itemCount = getItemCount();

  const handleShippingChange = (field: keyof ShippingInfo) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setShippingInfo(prev => ({ ...prev, [field]: e.target.value }));
  };

  const canSubmitShipping = shippingInfo.name.trim() && shippingInfo.address.trim() &&
    shippingInfo.city.trim() && shippingInfo.country.trim();

  const handleCoinSelect = (tokenId: string) => {
    setSelectedCoin(tokenId);
    setStep('payment');
  };

  useEffect(() => {
    if (step !== 'payment' || paymentState.status !== 'idle') return;
    let cancelled = false;
    setPaymentState({ status: 'submitting' });
    (async () => {
      try {
        const req = buildOrderRequest(items, shippingInfo, selectedCoin);
        const res = await createGuestOrder(req);
        if (!cancelled) {
          setPaymentState({ status: 'awaiting', data: res.data });
          clearCart();
        }
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : 'Order creation failed';
          setPaymentState({ status: 'error', message: msg });
        }
      }
    })();
    return () => { cancelled = true; };
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  const inputClass = cn(
    'w-full px-3 py-2 rounded-md border bg-background text-sm',
    'focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary',
    'placeholder:text-muted-foreground/60',
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="py-8">
        <Container size="md">
          <CheckoutProgressBar
            steps={STEPS}
            labels={stepLabels}
            currentStep={step}
            onStepClick={(s) => {
              const idx = STEPS.indexOf(s as Step);
              if (idx < STEPS.indexOf(step)) setStep(s as Step);
            }}
            className="mb-8"
          />

          {/* Step 1: Cart Review */}
          {step === 'cart' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold">
                {t('guestCheckout.reviewCart', {
                  count: itemCount,
                  itemWord: itemCount === 1 ? t('guestCheckout.itemSingular') : t('guestCheckout.itemPlural'),
                })}
              </h2>

              {items.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-muted-foreground text-lg">{t('guestCheckout.cartEmpty')}</p>
                  <p className="text-sm text-muted-foreground mt-2">{t('guestCheckout.cartEmptyHint')}</p>
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
                          onUpdateQuantity={(qty) => updateQuantity(item.slug, qty)}
                          onRemove={() => removeItem(item.slug)}
                        />
                      );
                    })}
                  </div>

                  {total && (
                    <div className="flex justify-between items-center pt-4 border-t">
                      <span className="font-medium">{t('guestCheckout.total')}</span>
                      <span className="text-lg font-semibold">
                        {formatPrice(total.amount, total.currency)}
                      </span>
                    </div>
                  )}

                  <Button className="w-full" size="lg" onClick={() => setStep('shipping')}>
                    {t('guestCheckout.continueToShipping')}
                  </Button>
                </>
              )}
            </div>
          )}

          {/* Step 2: Shipping Info */}
          {step === 'shipping' && (
            <form
              onSubmit={(e) => { e.preventDefault(); if (canSubmitShipping) setStep('coin'); }}
              className="space-y-6"
            >
              <h2 className="text-lg font-semibold">{t('guestCheckout.shippingInfo')}</h2>

              <Card>
                <CardContent className="p-4 space-y-4">
                  <div>
                    <label htmlFor="guest-name" className="block text-sm font-medium mb-1.5">
                      {t('guestCheckout.fullName')} <span className="text-destructive">*</span>
                    </label>
                    <input id="guest-name" type="text" value={shippingInfo.name} onChange={handleShippingChange('name')} placeholder="John Doe" className={inputClass} required />
                  </div>
                  <div>
                    <label htmlFor="guest-email" className="block text-sm font-medium mb-1.5">{t('guestCheckout.emailLabel')}</label>
                    <input id="guest-email" type="email" value={shippingInfo.email} onChange={handleShippingChange('email')} placeholder="your@email.com" className={inputClass} />
                  </div>
                  <div>
                    <label htmlFor="guest-address" className="block text-sm font-medium mb-1.5">
                      {t('guestCheckout.address')} <span className="text-destructive">*</span>
                    </label>
                    <input id="guest-address" type="text" value={shippingInfo.address} onChange={handleShippingChange('address')} placeholder="123 Main Street" className={inputClass} required />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="guest-city" className="block text-sm font-medium mb-1.5">
                        {t('guestCheckout.city')} <span className="text-destructive">*</span>
                      </label>
                      <input id="guest-city" type="text" value={shippingInfo.city} onChange={handleShippingChange('city')} placeholder="San Francisco" className={inputClass} required />
                    </div>
                    <div>
                      <label htmlFor="guest-state" className="block text-sm font-medium mb-1.5">{t('guestCheckout.stateProvince')}</label>
                      <input id="guest-state" type="text" value={shippingInfo.state} onChange={handleShippingChange('state')} placeholder="CA" className={inputClass} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="guest-postal" className="block text-sm font-medium mb-1.5">{t('guestCheckout.postalCode')}</label>
                      <input id="guest-postal" type="text" value={shippingInfo.postalCode} onChange={handleShippingChange('postalCode')} placeholder="94102" className={inputClass} />
                    </div>
                    <div>
                      <label htmlFor="guest-country" className="block text-sm font-medium mb-1.5">
                        {t('guestCheckout.country')} <span className="text-destructive">*</span>
                      </label>
                      <input id="guest-country" type="text" value={shippingInfo.country} onChange={handleShippingChange('country')} placeholder="US" className={inputClass} required />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="guest-notes" className="block text-sm font-medium mb-1.5">{t('guestCheckout.deliveryNotes')}</label>
                    <textarea id="guest-notes" value={shippingInfo.addressNotes} onChange={handleShippingChange('addressNotes')} placeholder={t('guestCheckout.deliveryNotesPlaceholder')} rows={2} className={cn(inputClass, 'resize-none')} />
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" size="lg" type="button" onClick={() => setStep('cart')}>
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
              <p className="text-sm text-muted-foreground">{t('guestCheckout.choosePaymentHint')}</p>
              <PaymentCryptoSelector
                acceptedCurrencies={acceptedCoins}
                selectedTokenId={selectedCoin}
                onSelect={handleCoinSelect}
                showFiatMethods={false}
              />
              <Button variant="outline" className="w-full" size="lg" onClick={() => setStep('shipping')}>
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
                  <Button variant="outline" onClick={() => { setPaymentState({ status: 'idle' }); setStep('coin'); }}>
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
                  <p className="text-xs text-muted-foreground text-center">
                    {t('guestCheckout.directPaymentDisclaimer')}
                  </p>
                  <Button className="w-full" size="lg" onClick={() => router.push(`/guest-order/${paymentState.data.orderToken}`)}>
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
