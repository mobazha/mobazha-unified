'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import {
  useFeature,
  useI18n,
  productNeedsSupplyAttention,
  type ProductListItem,
} from '@mobazha/core';
import { Package, ChevronRight } from 'lucide-react';
import { ProductAvailabilityCell } from '@/components/admin/ProductSupplyDisplay';
import { useProductLicensePoolHints } from '@/hooks/useProductLicensePoolHints';
import { useSellerSupplySummaries } from '@/hooks/useSellerSupplySummaries';
import { useSyncedListingProviders } from '@/hooks/useSyncedListingProviders';

interface SupplyNeedsAttentionCardProps {
  products: ProductListItem[];
  loading?: boolean;
}

export function SupplyNeedsAttentionCard({ products, loading }: SupplyNeedsAttentionCardProps) {
  const { t } = useI18n();
  const supplyAvailabilityEnabled = useFeature('supplyAvailabilityEnabled');
  const { getProvider } = useSyncedListingProviders();
  const { getHint } = useProductLicensePoolHints(products, 0, supplyAvailabilityEnabled);
  const { getSummary, loading: summaryLoading } = useSellerSupplySummaries(
    products,
    0,
    supplyAvailabilityEnabled
  );

  const supplyContextFor = useMemo(
    () => (product: ProductListItem) => {
      const summary = getSummary(product.slug);
      return {
        product,
        syncedProvider: getProvider(product.slug),
        licenseHint: getHint(product.slug),
        summary,
        summaryLoading: supplyAvailabilityEnabled && summaryLoading && !summary,
      };
    },
    [getProvider, getHint, getSummary, supplyAvailabilityEnabled, summaryLoading]
  );

  const attentionProducts = useMemo(() => {
    return products.filter(p => productNeedsSupplyAttention(supplyContextFor(p))).slice(0, 3);
  }, [products, supplyContextFor]);

  const totalCount = useMemo(
    () => products.filter(p => productNeedsSupplyAttention(supplyContextFor(p))).length,
    [products, supplyContextFor]
  );

  if (!supplyAvailabilityEnabled || loading || totalCount === 0) return null;

  return (
    <div
      className="mb-4 sm:mb-6 rounded-lg border border-warning/30 bg-warning/5 p-4"
      data-testid="dashboard-supply-attention-card"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="rounded-md bg-warning/15 p-2 shrink-0">
            <Package className="w-4 h-4 text-warning" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-foreground">
              {t('admin.dashboard.supplyNeedsAttentionTitle')}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t('admin.dashboard.supplyNeedsAttentionCount', { count: totalCount })}
            </p>
          </div>
        </div>
        <Link
          href="/admin/products?supply=needs_attention"
          className="inline-flex items-center gap-0.5 text-sm font-medium text-primary hover:underline shrink-0"
        >
          {t('admin.dashboard.supplyNeedsAttentionViewAll')}
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      <ul className="space-y-2">
        {attentionProducts.map(product => (
          <li key={product.slug}>
            <Link
              href={`/listing/edit/${product.slug}?from=admin`}
              className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 hover:bg-muted/60 transition-colors"
            >
              <span className="text-sm text-foreground truncate">{product.title}</span>
              <ProductAvailabilityCell {...supplyContextFor(product)} />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
