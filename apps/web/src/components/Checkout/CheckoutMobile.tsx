'use client';

import React from 'react';
import Link from 'next/link';
import { MobilePageHeader } from '@/components/MobilePageHeader';
import { AddressSummary } from '@/components/Address';
import { HStack, VStack } from '@/components/layouts';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton-compat';
import { ProductImageNative } from '@/components/ui/product-image';
import { useCurrency, useI18n } from '@mobazha/core';
import { isZoneAvailable } from './checkout-utils';
import { CheckoutProgressBar } from './CheckoutProgressBar';
import { CheckoutAddressModals } from './CheckoutAddressModals';
import { DiscountInput } from './DiscountInput';
import { BuyerProtectionBadge } from '@/components/Trust/BuyerProtectionBadge';
import type { UseCheckoutReturn } from './types';

interface Props {
  checkout: UseCheckoutReturn;
}

export function CheckoutMobile({ checkout }: Props) {
  const { t } = useI18n();
  const { renderPairedPrice } = useCurrency();

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
    total,
    currency,
    updateQuantity,
    orderNote,
    setOrderNote,
    handleCreateOrder,
    isSubmitting,
    canSubmit,
    isRwaToken,
    rwaTradeMode,
    needsShippingAddress,
    hasAllShippingSelected,
    appliedDiscounts,
    applicableDiscounts,
    discountTotal,
    isValidatingDiscount,
    handleApplyDiscountCode,
    handleRemoveDiscount,
  } = checkout;

  return (
    <div className="min-h-screen bg-background pb-24" data-testid="checkout-page-mobile">
      <MobilePageHeader title={t('checkout.title')} />

      <div className="px-4 py-3">
        <CheckoutProgressBar currentStep="checkout" className="mb-4" />

        {isLoading ? (
          <div className="space-y-4">
            <Card>
              <CardContent className="p-4">
                <Skeleton variant="text" height={20} width="40%" className="mb-3" />
                <Skeleton variant="rounded" height={80} />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <Skeleton variant="text" height={20} width="60%" className="mb-3" />
                <Skeleton variant="rounded" height={60} className="mb-3" />
                <Skeleton variant="rounded" height={36} />
              </CardContent>
            </Card>
          </div>
        ) : checkoutItems.length === 0 ? (
          <div className="text-center py-12">
            <svg
              className="w-14 h-14 text-muted-foreground mx-auto mb-3"
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
            <h2 className="text-base font-semibold text-foreground mb-2">
              {t('checkout.noItems')}
            </h2>
            <p className="text-sm text-muted-foreground mb-4">{t('checkout.addItemsFirst')}</p>
            <Link href="/marketplace">
              <Button size="sm">{t('checkout.browseMarketplace')}</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {/* RWA hint */}
            {isRwaToken && (
              <Card className="border-primary/20 bg-primary/8">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                      <svg
                        className="w-4 h-4 text-primary"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 10V3L4 14h7v7l9-11h-7z"
                        />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-primary">
                        {t('checkout.rwaTransaction')}
                      </h3>
                      <p className="text-xs text-primary mt-0.5">
                        {rwaTradeMode === 1
                          ? t('checkout.rwaConfirmRequiredHint')
                          : t('checkout.rwaInstantHint')}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Items */}
            <Card>
              <CardContent className="p-4">
                <h2 className="text-base font-semibold text-foreground mb-3">
                  {t('checkout.orderSummary')}
                </h2>
                <VStack gap="sm">
                  {checkoutItems.map(item => (
                    <div key={item.id} className="border border-border rounded-lg p-3">
                      <HStack gap="sm" align="start">
                        <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                          <ProductImageNative src={item.image} alt={item.title} iconSize="sm" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground line-clamp-2">
                            {item.title}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">{item.vendor.name}</p>
                          <p className="text-sm font-semibold text-primary mt-1">
                            {renderPairedPrice(item.price, item.currency)}
                          </p>
                        </div>
                      </HStack>
                      <HStack
                        justify="between"
                        align="center"
                        className="mt-2 pt-2 border-t border-border"
                      >
                        <HStack gap="xs" align="center">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            disabled={item.quantity <= 1}
                            className="w-11 h-11 flex items-center justify-center rounded-md border border-border hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                            aria-label={t('cart.decreaseQuantity')}
                          >
                            <svg
                              className="w-3.5 h-3.5"
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
                          <span className="w-10 text-center text-sm font-medium">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="w-11 h-11 flex items-center justify-center rounded-md border border-border hover:bg-muted"
                            aria-label={t('cart.increaseQuantity')}
                          >
                            <svg
                              className="w-3.5 h-3.5"
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
                          {renderPairedPrice(item.price * item.quantity, item.currency)}
                        </p>
                      </HStack>
                    </div>
                  ))}
                </VStack>
              </CardContent>
            </Card>

            {/* Shipping Address */}
            {needsShippingAddress && (
              <Card>
                <CardContent className="p-4">
                  <h2 className="text-base font-semibold text-foreground mb-3">
                    {t('checkout.shippingAddress')}
                  </h2>
                  <AddressSummary
                    address={addresses.find(a => a.id === selectedAddress)}
                    onEdit={() => addressActions.setShowDrawer(true)}
                  />
                </CardContent>
              </Card>
            )}

            {/* Shipping Method */}
            {checkoutItems.some(
              item =>
                item.contractType === 'PHYSICAL_GOOD' &&
                item.shippingZones?.some(z => isZoneAvailable(z, selectedCountryCode))
            ) && (
              <Card>
                <CardContent className="p-4">
                  <h2 className="text-base font-semibold text-foreground mb-3">
                    {t('checkout.shippingMethod')}
                  </h2>
                  <VStack gap="sm">
                    {checkoutItems
                      .filter(
                        item =>
                          item.contractType === 'PHYSICAL_GOOD' &&
                          item.shippingZones?.some(z => isZoneAvailable(z, selectedCountryCode))
                      )
                      .map(item => (
                        <div key={item.id} className="space-y-1.5">
                          {item
                            .shippingZones!.filter(zone =>
                              isZoneAvailable(zone, selectedCountryCode)
                            )
                            .map(zone =>
                              zone.rates.map(rate => {
                                const isSelected =
                                  selectedShipping[item.id]?.zoneName === zone.name &&
                                  selectedShipping[item.id]?.rateName === rate.name;
                                const rateCurrency =
                                  rate.currency || zone.currency || item.currency;
                                return (
                                  <label
                                    key={`${zone.name}-${rate.name}`}
                                    className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                                      isSelected ? 'border-primary bg-primary/5' : 'border-border'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2.5">
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
                                      {rate.price === 0
                                        ? t('checkout.free')
                                        : renderPairedPrice(rate.price, rateCurrency)}
                                    </span>
                                  </label>
                                );
                              })
                            )}
                        </div>
                      ))}
                  </VStack>
                </CardContent>
              </Card>
            )}

            {/* Discount Code */}
            <Card>
              <CardContent className="p-4">
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

            {/* Order Note */}
            <Card>
              <CardContent className="p-4">
                <h2 className="text-base font-semibold text-foreground mb-2">
                  {t('checkout.orderNote')}
                </h2>
                <textarea
                  value={orderNote}
                  onChange={e => setOrderNote(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none text-sm"
                  placeholder={t('checkout.orderNotePlaceholder')}
                  data-testid="checkout-order-notes"
                />
              </CardContent>
            </Card>

            {/* Totals Card */}
            <Card>
              <CardContent className="p-4">
                <div className="space-y-2">
                  <HStack justify="between">
                    <span className="text-sm text-muted-foreground">{t('checkout.subtotal')}</span>
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
                          : shippingTotal === 0
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
                </div>

                <BuyerProtectionBadge
                  variant="inline"
                  className="mt-3 pt-3 border-t border-border"
                />
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Mobile Bottom Bar */}
      {checkoutItems.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-surface/95 backdrop-blur-sm border-t border-border p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] z-50">
          <HStack justify="between" align="center">
            <div>
              <p className="text-xs text-muted-foreground">{t('checkout.total')}</p>
              <p className="text-lg font-bold text-primary">{renderPairedPrice(total, currency)}</p>
            </div>
            <Button
              size="lg"
              onClick={handleCreateOrder}
              disabled={!canSubmit}
              className="min-w-[140px]"
              data-testid="checkout-submit-btn-mobile"
            >
              {isSubmitting ? (
                <HStack gap="xs" align="center">
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
                  <span>{t('checkout.creating')}</span>
                </HStack>
              ) : (
                t('checkout.placeOrder')
              )}
            </Button>
          </HStack>
        </div>
      )}

      <CheckoutAddressModals
        addressActions={addressActions}
        addresses={addresses}
        selectedAddress={selectedAddress}
        onSelectAddress={setSelectedAddress}
      />
    </div>
  );
}
