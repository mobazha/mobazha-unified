'use client';

import React from 'react';
import Link from 'next/link';
import {
  useI18n,
  type PublicGroupMarketplace,
  marketplaceHref,
  marketplaceJoinModeKey,
  marketplacePlatformKey,
} from '@mobazha/core';
import { Card } from '@/components/ui/card';
import { HStack, VStack } from '@/components/layouts';
import { MarketplaceLogo } from './MarketplaceLogo';

interface MarketplaceCardProps {
  marketplace: PublicGroupMarketplace;
  variant?: 'featured' | 'compact';
}

export function MarketplaceCard({ marketplace, variant = 'compact' }: MarketplaceCardProps) {
  const { t, formatRelativeTime } = useI18n();
  const href = marketplaceHref(marketplace.slug, marketplace.publicID);
  const description = marketplace.publicDescription?.trim() || t('marketplace.defaultDescription');
  const platformLabel = t(marketplacePlatformKey(marketplace.platform));
  const joinLabel = t(marketplaceJoinModeKey(marketplace.joinMode));
  const updatedLabel = marketplace.updatedAt
    ? t('marketplace.updatedAgo', { time: formatRelativeTime(marketplace.updatedAt) })
    : null;

  if (variant === 'featured') {
    return (
      <Link href={href} className="block h-full">
        <Card className="h-full overflow-hidden transition-all hover:shadow-xl active:scale-[0.99]">
          <div className="relative h-32 overflow-hidden bg-muted">
            {marketplace.bannerURL ? (
              <img src={marketplace.bannerURL} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-primary/20 via-muted to-background" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            {marketplace.isFeatured && (
              <span className="absolute right-3 top-3 rounded bg-primary px-2 py-1 text-xs font-medium text-primary-foreground">
                {t('marketplace.featured')}
              </span>
            )}
          </div>

          <div className="relative p-4">
            <MarketplaceLogo
              name={marketplace.name}
              publicID={marketplace.publicID}
              logoURL={marketplace.logoURL}
              size="md"
              className="-mt-10 mb-3 border-4 border-background shadow-lg"
            />
            <h3 className="mb-2 text-lg font-bold text-foreground">{marketplace.name}</h3>
            <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">{description}</p>
            <HStack gap="xs" className="mb-4 flex-wrap">
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {platformLabel}
              </span>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                {joinLabel}
              </span>
              {updatedLabel && (
                <span className="text-xs text-muted-foreground">{updatedLabel}</span>
              )}
            </HStack>
            <HStack gap="lg" className="flex-wrap">
              <VStack gap="none" align="center">
                <span className="text-base font-bold text-foreground">
                  {marketplace.sellerCount}
                </span>
                <span className="text-xs text-muted-foreground">{t('marketplace.sellers')}</span>
              </VStack>
              <VStack gap="none" align="center">
                <span className="text-base font-bold text-foreground">
                  {marketplace.productCount}
                </span>
                <span className="text-xs text-muted-foreground">{t('marketplace.products')}</span>
              </VStack>
            </HStack>
          </div>
        </Card>
      </Link>
    );
  }

  return (
    <Link href={href} className="block h-full">
      <Card className="h-full p-4 transition-all hover:shadow-lg active:scale-[0.99]">
        <HStack gap="md" align="start">
          <MarketplaceLogo
            name={marketplace.name}
            publicID={marketplace.publicID}
            logoURL={marketplace.logoURL}
            size="sm"
          />
          <div className="min-w-0 flex-1">
            <HStack gap="xs" align="center" className="mb-1 flex-wrap">
              <h3 className="truncate text-base font-bold text-foreground">{marketplace.name}</h3>
              {marketplace.isFeatured && (
                <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  {t('marketplace.featured')}
                </span>
              )}
            </HStack>
            <p className="mb-2 line-clamp-2 text-sm text-muted-foreground">{description}</p>
            <HStack gap="xs" className="mb-2 flex-wrap">
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {platformLabel}
              </span>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                {joinLabel}
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
