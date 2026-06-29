'use client';

import React from 'react';
import Link from 'next/link';
import {
  useI18n,
  type PublicNativeMarketplace,
  marketplaceHref,
  marketplaceVerticalKey,
  MARKETPLACE_CATALOG_MODE_KEYS,
} from '@mobazha/core';
import { Card } from '@/components/ui/card';
import { HStack } from '@/components/layouts';
import { MarketplaceLogo } from './MarketplaceLogo';

interface MarketplaceCardProps {
  marketplace: PublicNativeMarketplace;
}

export function MarketplaceCard({ marketplace }: MarketplaceCardProps) {
  const { t, formatRelativeTime } = useI18n();
  const href = marketplaceHref(marketplace.slug, marketplace.id);
  const description = marketplace.description?.trim() || t('marketplace.defaultDescription');
  const verticalLabel = t(marketplaceVerticalKey(marketplace.vertical));
  const catalogLabel = t(MARKETPLACE_CATALOG_MODE_KEYS[marketplace.catalogMode]);
  const updatedLabel = marketplace.updatedAt
    ? t('marketplace.updatedAgo', { time: formatRelativeTime(marketplace.updatedAt) })
    : null;

  return (
    <Link href={href} className="block h-full">
      <Card className="h-full p-4 transition-all hover:shadow-lg active:scale-[0.99]">
        <HStack gap="md" align="start">
          <MarketplaceLogo
            name={marketplace.name}
            identifier={marketplace.id}
            logoURL={marketplace.logoURL}
            size="sm"
          />
          <div className="min-w-0 flex-1">
            <HStack gap="xs" align="center" className="mb-1 flex-wrap">
              <h3 className="truncate text-base font-bold text-foreground">{marketplace.name}</h3>
            </HStack>
            <p className="mb-2 line-clamp-2 text-sm text-muted-foreground">{description}</p>
            <HStack gap="xs" className="mb-2 flex-wrap">
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {verticalLabel}
              </span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {catalogLabel}
              </span>
            </HStack>
            <HStack gap="md" className="flex-wrap text-xs text-muted-foreground">
              <span>
                {marketplace.sellerCount} {t('marketplace.sellers')}
              </span>
              <span>
                {marketplace.productCount} {t('marketplace.products')}
              </span>
              {updatedLabel && <span>{updatedLabel}</span>}
            </HStack>
          </div>
        </HStack>
      </Card>
    </Link>
  );
}
