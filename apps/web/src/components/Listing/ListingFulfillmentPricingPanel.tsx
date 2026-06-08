'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  FULFILLMENT_PROVIDERS,
  fulfillmentApi,
  fromMinimalUnit,
  useCurrency,
  useFeature,
  useI18n,
  type SyncedProduct,
} from '@mobazha/core';
import type { SkuItem } from '@mobazha/core/hooks/useListingForm';

interface ListingFulfillmentPricingPanelProps {
  listingSlug?: string;
  basePrice: string;
  pricingCurrency: string;
  skus: SkuItem[];
}

function resolveSupplierBillingCurrency(providerId: string): string {
  const provider = FULFILLMENT_PROVIDERS.find(p => p.id === providerId);
  return provider?.billingCurrency ?? 'USD';
}

export function ListingFulfillmentPricingPanel({
  listingSlug,
  basePrice,
  pricingCurrency,
  skus,
}: ListingFulfillmentPricingPanelProps) {
  const { t } = useI18n();
  const { formatPrice } = useCurrency();
  const supplyChainEnabled = useFeature('supplyChainEnabled');
  const [syncedProduct, setSyncedProduct] = useState<SyncedProduct | null>(null);

  useEffect(() => {
    if (!supplyChainEnabled || !listingSlug) return;
    let cancelled = false;
    void (async () => {
      for (const provider of FULFILLMENT_PROVIDERS) {
        try {
          const products = await fulfillmentApi.getSyncedProducts(provider.id);
          const match = products.find(p => p.listingSlug === listingSlug);
          if (match) {
            if (!cancelled) setSyncedProduct(match);
            return;
          }
        } catch {
          // provider may be disconnected
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [listingSlug, supplyChainEnabled]);

  const supplierCurrency = useMemo(
    () => (syncedProduct ? resolveSupplierBillingCurrency(syncedProduct.providerId) : 'USD'),
    [syncedProduct]
  );

  const supplierCostStandard = useMemo(() => {
    const raw = syncedProduct?.supplierCost?.trim();
    if (!raw || !/^\d+$/.test(raw)) return null;
    return fromMinimalUnit(raw, supplierCurrency);
  }, [syncedProduct, supplierCurrency]);

  const yourPrice = useMemo(() => {
    const explicit = skus
      .map(sku => parseFloat(sku.price?.trim() || ''))
      .filter(value => Number.isFinite(value) && value > 0);
    if (explicit.length > 0) {
      return Math.min(...explicit);
    }
    return parseFloat(basePrice) || 0;
  }, [basePrice, skus]);

  const currenciesComparable =
    supplierCurrency.trim().toUpperCase() === pricingCurrency.trim().toUpperCase();

  const margin = useMemo(() => {
    if (supplierCostStandard == null || !currenciesComparable) return null;
    return yourPrice - supplierCostStandard;
  }, [currenciesComparable, supplierCostStandard, yourPrice]);

  const showLowPriceWarning = useMemo(() => {
    if (supplierCostStandard == null || !currenciesComparable) return false;
    return yourPrice > 0 && yourPrice < supplierCostStandard;
  }, [currenciesComparable, supplierCostStandard, yourPrice]);

  const explicitSkuPrices = useMemo(
    () => skus.filter(sku => sku.price?.trim()).map(sku => sku.price),
    [skus]
  );

  if (!supplyChainEnabled || !syncedProduct) return null;

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
      <p className="text-sm font-medium text-foreground">{t('listing.fulfillment.title')}</p>
      <div className="grid gap-3 sm:grid-cols-3 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">
            {t('listing.fulfillment.supplierCostInCurrency', { currency: supplierCurrency })}
          </p>
          <p className="font-medium text-foreground">
            {supplierCostStandard != null
              ? formatPrice(supplierCostStandard, supplierCurrency)
              : '—'}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{t('listing.fulfillment.yourPrice')}</p>
          <p className="font-medium text-foreground">
            {pricingCurrency.trim() ? formatPrice(yourPrice, pricingCurrency) : '—'}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{t('listing.fulfillment.margin')}</p>
          <p
            className={
              margin != null && margin < 0
                ? 'font-medium text-destructive'
                : 'font-medium text-foreground'
            }
          >
            {!currenciesComparable
              ? t('listing.fulfillment.marginUnavailable')
              : margin != null
                ? formatPrice(margin, pricingCurrency)
                : '—'}
          </p>
        </div>
      </div>
      {explicitSkuPrices.length > 0 && pricingCurrency.trim() && (
        <div>
          <p className="text-xs text-muted-foreground mb-1">
            {t('listing.fulfillment.variantPrices')}
          </p>
          <p className="text-sm text-foreground">
            {explicitSkuPrices
              .slice(0, 5)
              .map(price => formatPrice(parseFloat(price) || 0, pricingCurrency))
              .join(' · ')}
            {explicitSkuPrices.length > 5 ? ` +${explicitSkuPrices.length - 5}` : ''}
          </p>
        </div>
      )}
      {showLowPriceWarning && (
        <p className="text-sm text-amber-800 dark:text-amber-200">{t('listing.priceLowWarning')}</p>
      )}
    </div>
  );
}
