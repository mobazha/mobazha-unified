'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Header, Footer } from '@/components';
import { AddressSummary } from '@/components/Address';
import { Container, HStack, VStack } from '@/components/layouts';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton-compat';
import { ProductImageNative } from '@/components/ui/product-image';
import { useCurrency, useRateFreshness, useI18n } from '@mobazha/core';
import { isZoneAvailable } from './checkout-utils';
import { CheckoutProgressBar } from './CheckoutProgressBar';
import { CheckoutAddressModals } from './CheckoutAddressModals';
import { DiscountInput } from './DiscountInput';
import { BuyerProtectionBadge } from '@/components/Trust/BuyerProtectionBadge';
import { CheckoutContractTypeAlert } from './CheckoutContractTypeAlert';
import { SupplyAvailabilityPanel } from '@/components/SupplyAvailability/SupplyAvailabilityPanel';
import type { UseCheckoutReturn } from './types';

interface Props {
  checkout: UseCheckoutReturn;
}

export function CheckoutDesktop({ checkout }: Props) {
  const router = useRouter();
  const { t } = useI18n();
  const { renderPairedPrice } = useCurrency();
  useRateFreshness('checkout');

  const {
    checkoutItems,
    isLoading,
    addresses,
    selectedAddress,
    setSelectedAddress,
    addressActions,
    selectedShipping,
    handleShippingChange,
    selectedCountryCode,
    subtotal,
    shippingTotal,
    taxTotal,
    total,
    currency,
    updateQuantity,
    orderNote,
    setOrderNote,
    handleCreateOrder,
    isSubmitting,
    canSubmit,
    hasMixedContractTypes,
    hasMissingContractType,
    isRwaToken,
    needsShippingAddress,
    hasAllShippingSelected,
    hasShippingPricingIssue,
    hasFreeShippingSelection,
    appliedDiscounts,
    applicableDiscounts,
    discountTotal,
    isValidatingDiscount,
    handleApplyDiscountCode,
    handleRemoveDiscount,
    supplyQuote,
  } = checkout;

  const formatItemPrice = (item: (typeof checkoutItems)[0]) =>
    renderPairedPrice(item.price * item.quantity, item.currency);

  return (
    <div className="min-h-screen bg-background" data-testid="checkout-page">
      <Header />

      <main className="py-8 pb-8">
        <Container size="xl">
          <CheckoutProgressBar currentStep="checkout" className="mb-8" />

          <HStack gap="sm" align="center" className="mb-8">
            <button
              onClick={() => router.back()}
              aria-label={t('common.back')}
              className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-surface-hover rounded-lg transition-colors"
              data-testid="checkout-back-btn"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <h1 className="text-2xl font-bold text-foreground">{t('checkout.title')}</h1>
          </HStack>

          {isLoading ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardContent className="p-6">
                    <Skeleton variant="text" height={24} width="40%" className="mb-4" />
                    <Skeleton variant="rounded" height={100} />
                  </CardContent>
                </Card>
              </div>
              <div>
                <Card>
                  <CardContent className="p-6">
                    <Skeleton variant="text" height={24} width="60%" className="mb-4" />
                    <Skeleton variant="rounded" height={80} className="mb-4" />
                    <Skeleton variant="rounded" height={40} />
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : checkoutItems.length === 0 ? (
            <div className="text-center py-12">
              <svg
                className="w-16 h-16 text-muted-foreground mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              <h2 className="text-lg font-semibold text-foreground mb-2">
                {t('checkout.noItems')}
              </h2>
              <p className="text-muted-foreground mb-4">{t('checkout.addItemsFirst')}</p>
              <Link href="/marketplace">
                <Button>{t('checkout.browseMarketplace')}</Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column */}
              <div className="lg:col-span-2 space-y-6">
                {isRwaToken && (
                  <Card className="border-warning/30 bg-warning/8">
                    <CardContent className="p-6">
                      <p className="text-sm text-warning">{t('checkout.rwaNotSupported')}</p>
                    </CardContent>
                  </Card>
                )}

                {needsShippingAddress && (
                  <Card>
                    <CardContent className="p-6">
                      <h2 className="text-lg font-semibold text-foreground mb-4">
                        {t('checkout.shippingAddress')}
                      </h2>
                      <AddressSummary
                        address={addresses.find(a => a.id === selectedAddress)}
                        onEdit={() => addressActions.setShowDrawer(true)}
                      />
                    </CardContent>
                  </Card>
                )}

                {checkoutItems.some(
                  item =>
                    item.contractType === 'PHYSICAL_GOOD' &&
                    item.shippingZones?.some(z => isZoneAvailable(z, selectedCountryCode))
                ) && (
                  <Card>
                    <CardContent className="p-6">
                      <h2 className="text-lg font-semibold text-foreground mb-4">
                        {t('checkout.shippingMethod')}
                      </h2>
                      <VStack gap="md">
                        {checkoutItems
                          .filter(
                            item =>
                              item.contractType === 'PHYSICAL_GOOD' &&
                              item.shippingZones?.some(z => isZoneAvailable(z, selectedCountryCode))
                          )
                          .map(item => (
                            <div key={item.id} className="space-y-2">
                              {item
                                .shippingZones!.filter(zone =>
                                  isZoneAvailable(zone, selectedCountryCode)
                                )
                                .map(zone => (
                                  <div key={zone.name} className="space-y-1.5">
                                    {zone.rates.map(rate => {
                                      const isSelected =
                                        selectedShipping[item.id]?.zoneName === zone.name &&
                                        selectedShipping[item.id]?.rateName === rate.name;
                                      const rateCurrency = rate.currency;
                                      return (
                                        <label
                                          key={`${zone.name}-${rate.name}`}
                                          className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                                            isSelected
                                              ? 'border-primary bg-primary/5'
                                              : 'border-border hover:border-primary/50'
                                          }`}
                                        >
                                          <div className="flex items-center gap-3">
                                            <input
                                              type="radio"
                                              name={`shipping-${item.id}`}
                                              checked={isSelected}
                                              onChange={() =>
                                                handleShippingChange(item.id, {
                                                  zoneName: zone.name,
                                                  rateName: rate.name,
                                                  zoneId: zone.id,
                                                  rateId: rate.id,
                                                })
                                              }
                                              className="w-4 h-4 text-primary"
                                            />
                                            <div>
                                              <p className="text-sm font-medium text-foreground">
                                                {zone.name} - {rate.name}
                                              </p>
                                              {rate.estimatedDelivery && (
                                                <p className="text-xs text-muted-foreground">
                                                  {rate.estimatedDelivery}
                                                </p>
                                              )}
                                            </div>
                                          </div>
                                          <span className="text-sm font-semibold text-foreground">
                                            {!rateCurrency
                                              ? '—'
                                              : rate.price === 0
                                                ? t('checkout.free')
                                                : renderPairedPrice(rate.price, rateCurrency)}
                                          </span>
                                        </label>
                                      );
                                    })}
                                  </div>
                                ))}
                            </div>
                          ))}
                      </VStack>
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardContent className="p-6">
                    <DiscountInput
                      appliedDiscounts={appliedDiscounts}
                      applicableDiscounts={applicableDiscounts}
                      subtotal={subtotal}
                      currency={currency}
                      isValidating={isValidatingDiscount}
                      onApplyCode={handleApplyDiscountCode}
                      onRemoveDiscount={handleRemoveDiscount}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <h2 className="text-lg font-semibold text-foreground mb-3">
                      {t('checkout.orderNote')}
                    </h2>
                    <textarea
                      value={orderNote}
                      onChange={e => setOrderNote(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none text-sm"
                      placeholder={t('checkout.orderNotePlaceholder')}
                      data-testid="checkout-order-notes"
                    />
                  </CardContent>
                </Card>
              </div>

              {/* Right Column — Order Summary */}
              <div className="space-y-6">
                <Card className="sticky top-4">
                  <CardContent className="p-6">
                    <h2 className="text-lg font-semibold text-foreground mb-4">
                      {t('checkout.orderSummary')}
                    </h2>

                    <VStack gap="md" className="mb-6">
                      {checkoutItems.map(item => (
                        <div key={item.id} className="border border-border rounded-lg p-3">
                          <HStack gap="sm" align="start">
                            <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
                              <ProductImageNative src={item.image} alt={item.title} iconSize="sm" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium text-foreground line-clamp-2 flex-1">
                                  {item.title}
                                </p>
                                {item.contractType === 'RWA_TOKEN' && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-primary/15 text-primary flex-shrink-0">
                                    RWA
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {item.vendor.name}
                              </p>
                              <p className="text-sm font-semibold text-primary mt-1">
                                {renderPairedPrice(item.price, item.currency)}
                              </p>
                            </div>
                          </HStack>
                          <HStack
                            justify="between"
                            align="center"
                            className="mt-3 pt-3 border-t border-border"
                          >
                            <span className="text-xs text-muted-foreground">
                              {t('checkout.quantity')}
                            </span>
                            <HStack gap="xs" align="center">
                              <button
                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                disabled={item.quantity <= 1}
                                aria-label={t('cart.decreaseQuantity')}
                                className="w-9 h-9 flex items-center justify-center rounded-md border border-border hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                data-testid="checkout-qty-decrease"
                              >
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M20 12H4"
                                  />
                                </svg>
                              </button>
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={e => {
                                  const val = parseInt(e.target.value, 10);
                                  if (!isNaN(val) && val >= 1) updateQuantity(item.id, val);
                                }}
                                className="w-14 h-8 text-center font-medium text-foreground border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                data-testid="checkout-qty-input"
                              />
                              <button
                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                aria-label={t('cart.increaseQuantity')}
                                className="w-9 h-9 flex items-center justify-center rounded-md border border-border hover:bg-muted transition-colors"
                                data-testid="checkout-qty-increase"
                              >
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 4v16m8-8H4"
                                  />
                                </svg>
                              </button>
                            </HStack>
                            <p className="font-semibold text-foreground text-sm">
                              {formatItemPrice(item)}
                            </p>
                          </HStack>
                        </div>
                      ))}
                    </VStack>

                    <div className="border-t border-border pt-4 space-y-3">
                      <HStack justify="between">
                        <span className="text-sm text-muted-foreground">
                          {t('checkout.subtotal')}
                        </span>
                        <span className="font-medium text-foreground text-sm">
                          {renderPairedPrice(subtotal, currency)}
                        </span>
                      </HStack>

                      {needsShippingAddress && (
                        <HStack justify="between">
                          <span className="text-sm text-muted-foreground">
                            {t('checkout.shipping')}
                          </span>
                          <span className="font-medium text-primary text-sm">
                            {!hasAllShippingSelected
                              ? t('checkout.selectShippingFirst')
                              : hasShippingPricingIssue
                                ? '—'
                                : hasFreeShippingSelection
                                  ? t('checkout.free')
                                  : renderPairedPrice(shippingTotal, currency)}
                          </span>
                        </HStack>
                      )}

                      {discountTotal > 0 && (
                        <HStack justify="between">
                          <span className="text-sm text-muted-foreground">
                            {t('checkout.discount.label')}
                          </span>
                          <span className="font-medium text-success text-sm">
                            -{renderPairedPrice(discountTotal, currency)}
                          </span>
                        </HStack>
                      )}

                      {taxTotal > 0 && (
                        <HStack justify="between">
                          <span className="text-sm text-muted-foreground">{t('checkout.tax')}</span>
                          <span className="font-medium text-foreground text-sm">
                            {renderPairedPrice(taxTotal, currency)}
                          </span>
                        </HStack>
                      )}

                      <div className="border-t border-border pt-3">
                        <HStack justify="between">
                          <span className="text-lg font-semibold text-foreground">
                            {t('checkout.total')}
                          </span>
                          <p className="text-xl font-bold text-primary">
                            {renderPairedPrice(total, currency)}
                          </p>
                        </HStack>
                      </div>
                    </div>

                    <BuyerProtectionBadge variant="card" className="mt-4" />

                    <CheckoutContractTypeAlert
                      hasMixedContractTypes={hasMixedContractTypes}
                      hasMissingContractType={hasMissingContractType}
                    />

                    {supplyQuote.showPanel && (
                      <SupplyAvailabilityPanel
                        displayItems={checkoutItems.map(item => ({
                          listingSlug: item.listingSlug,
                          title: item.title,
                        }))}
                        quote={supplyQuote.quote}
                        loading={supplyQuote.loading}
                        error={supplyQuote.error}
                        className="mt-4"
                        testIdPrefix="checkout-supply-quote"
                      />
                    )}

                    <Button
                      className="w-full mt-4"
                      size="default"
                      onClick={handleCreateOrder}
                      disabled={!canSubmit}
                      data-testid="checkout-submit-btn"
                    >
                      {isSubmitting ? (
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
                          <span>{t('checkout.creatingOrder')}</span>
                        </HStack>
                      ) : (
                        t('checkout.placeOrder')
                      )}
                    </Button>

                    {needsShippingAddress && !selectedAddress && (
                      <div className="mt-4 p-3 bg-warning/8 border border-warning/20 rounded-lg">
                        <p className="text-sm text-warning">{t('checkout.selectAddressWarning')}</p>
                      </div>
                    )}

                    <div className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <span>{t('checkout.paymentNextStep')}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </Container>
      </main>

      <Footer />

      <CheckoutAddressModals
        addressActions={addressActions}
        addresses={addresses}
        selectedAddress={selectedAddress}
        onSelectAddress={setSelectedAddress}
      />
    </div>
  );
}
