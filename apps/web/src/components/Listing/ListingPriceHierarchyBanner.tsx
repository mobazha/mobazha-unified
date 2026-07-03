'use client';

import { useMemo } from 'react';
import {
  useCurrency,
  useI18n,
  resolveListingDisplayPrice,
  toMinimalUnit,
  fromMinimalUnit,
} from '@mobazha/core';
import type { SkuItem } from '@mobazha/core/hooks/useListingForm';

interface ListingPriceHierarchyBannerProps {
  basePrice: string;
  pricingCurrency: string;
  skus: SkuItem[];
}

export function ListingPriceHierarchyBanner({
  basePrice,
  pricingCurrency,
  skus,
}: ListingPriceHierarchyBannerProps) {
  const { t } = useI18n();
  const { formatPrice } = useCurrency();

  const snapshot = useMemo(
    () =>
      resolveListingDisplayPrice({
        basePrice: toMinimalUnit(parseFloat(basePrice) || 0, pricingCurrency),
        skus: skus.map(sku => ({
          price: sku.price
            ? String(toMinimalUnit(parseFloat(sku.price) || 0, pricingCurrency))
            : '',
        })),
      }),
    [basePrice, pricingCurrency, skus]
  );

  if (!snapshot.hasExplicitSkuPrices) return null;

  const storefront = formatPrice(
    fromMinimalUnit(snapshot.minAmount, pricingCurrency),
    pricingCurrency
  );
  const base = formatPrice(parseFloat(basePrice) || 0, pricingCurrency);

  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-700 dark:bg-amber-900/30">
      <p className="font-medium text-amber-900 dark:text-amber-100">
        {t('listing.priceHierarchy.title')}
      </p>
      <p className="mt-1 text-amber-800 dark:text-amber-200">
        {t('listing.priceHierarchy.description')}
      </p>
      <div className="mt-2 space-y-1 text-amber-900 dark:text-amber-100">
        <p>{t('listing.priceHierarchy.storefront', { price: storefront })}</p>
        <p>{t('listing.priceHierarchy.base', { price: base })}</p>
      </div>
    </div>
  );
}
