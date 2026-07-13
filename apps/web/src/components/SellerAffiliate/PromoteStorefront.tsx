// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

'use client';

import React, { memo } from 'react';
import Link from 'next/link';
import { ChevronRight, Store } from 'lucide-react';
import {
  buildProductHref,
  estimateSellerAffiliateCommissionAtomic,
  getImageUrl,
  productCardPriceFieldsFromListItem,
  useCurrencyFormat,
  useI18n,
  useStoreListings,
} from '@mobazha/core';
import { Card, CardContent } from '@/components/ui/card';
import { ProductImage } from '@/components/ui/product-image';

interface PromoteStorefrontProps {
  /** The seller whose catalog this promoter link points at. */
  sellerPeerID: string;
  /** Program commission rate in basis points, used to preview per-item earnings. */
  commissionRateBPS: number;
  /** Maximum items to preview. */
  maxItems?: number;
}

/**
 * A promoter deciding whether to share a link needs to see the shelf and the
 * upside, not just an abstract "5%". This previews a few of the seller's live
 * items with a concrete "you earn ≈X" per sale, so the promote page answers
 * "what am I selling, and what's in it for me?" before the promoter commits.
 *
 * Hidden entirely when the store has no fetchable items — an empty shelf reads
 * worse than no shelf.
 */
export const PromoteStorefront = memo(function PromoteStorefront({
  sellerPeerID,
  commissionRateBPS,
  maxItems = 4,
}: PromoteStorefrontProps) {
  const { t } = useI18n();
  const { formatLocalPrice } = useCurrencyFormat();
  const { listings, isLoading } = useStoreListings(sellerPeerID || null, maxItems);

  // Hide the section rather than show an empty shelf; keep skeletons only while
  // the first load is in flight.
  if (!sellerPeerID) return null;
  if (!isLoading && listings.length === 0) return null;

  const items = listings.slice(0, maxItems);

  return (
    <Card data-testid="promote-storefront">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-base font-semibold">
              <Store className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              {t('promote.storefrontTitle')}
            </p>
            <p className="text-sm text-muted-foreground">{t('promote.storefrontSubtitle')}</p>
          </div>
          <Link
            href={`/store/${encodeURIComponent(sellerPeerID)}`}
            className="flex flex-shrink-0 items-center text-sm text-primary hover:underline"
          >
            {t('promote.storefrontViewAll')}
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {isLoading && items.length === 0
            ? Array.from({ length: maxItems }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="aspect-square animate-pulse rounded-lg bg-muted" />
                  <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
                </div>
              ))
            : items.map(product => {
                const priceFields = productCardPriceFieldsFromListItem(product);
                const formatOptions = {
                  isMinimalUnit: true,
                  divisibility: priceFields.divisibility,
                };
                const priceDisplay = priceFields.currencyCode
                  ? formatLocalPrice(priceFields.price, priceFields.currencyCode, formatOptions)
                  : '—';
                const earnAtomic = priceFields.currencyCode
                  ? estimateSellerAffiliateCommissionAtomic(priceFields.price, commissionRateBPS)
                  : '0';
                const earnDisplay =
                  priceFields.currencyCode && earnAtomic !== '0'
                    ? formatLocalPrice(earnAtomic, priceFields.currencyCode, formatOptions)
                    : null;
                const image =
                  getImageUrl(product.thumbnail?.medium, sellerPeerID) ||
                  getImageUrl(product.thumbnail?.small, sellerPeerID);

                return (
                  <Link
                    key={product.slug}
                    href={buildProductHref(product.slug, sellerPeerID)}
                    className="group block space-y-1.5"
                    data-testid="promote-storefront-item"
                  >
                    <div className="relative aspect-square overflow-hidden rounded-lg bg-muted">
                      <ProductImage
                        src={image}
                        alt={product.title}
                        fill
                        fit="contain"
                        sizes="(max-width: 640px) 50vw, 25vw"
                        iconSize="lg"
                      />
                    </div>
                    <p className="line-clamp-2 text-xs font-medium leading-tight group-hover:text-primary">
                      {product.title}
                    </p>
                    <p className="text-sm font-semibold text-foreground">
                      {priceFields.priceFrom && priceDisplay !== '—'
                        ? t('product.priceFrom', { price: priceDisplay })
                        : priceDisplay}
                    </p>
                    {earnDisplay ? (
                      <p
                        className="text-xs font-medium text-primary"
                        data-testid="promote-storefront-earn"
                      >
                        {t('promote.storefrontEarn', { amount: earnDisplay })}
                      </p>
                    ) : null}
                  </Link>
                );
              })}
        </div>
      </CardContent>
    </Card>
  );
});
