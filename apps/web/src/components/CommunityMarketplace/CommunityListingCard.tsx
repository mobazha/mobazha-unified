'use client';

import React from 'react';
import Link from 'next/link';
import {
  communityProductHref,
  formatUserName,
  useCurrency,
  useI18n,
  type CommunityListingPreview,
} from '@mobazha/core';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ProductImage } from '@/components/ui/product-image';
import { VStack } from '@/components/layouts';

interface CommunityListingCardProps {
  preview: CommunityListingPreview;
}

export function CommunityListingCard({ preview }: CommunityListingCardProps) {
  const { t } = useI18n();
  const { renderPairedPrice } = useCurrency();
  const href = communityProductHref(preview.slug, preview.peerID);
  const sellerLabel = formatUserName(
    { name: preview.vendorName, peerID: preview.peerID },
    { fallback: t('common.seller'), prefix: 'Store' }
  );
  const priceLabel =
    preview.price != null && preview.currency
      ? renderPairedPrice(preview.price, preview.currency, {
          divisibility: preview.divisibility,
          isMinimalUnit: true,
        })
      : null;

  if (preview.loading) {
    return (
      <Card className="overflow-hidden p-0">
        <Skeleton className="aspect-[4/3] w-full rounded-none" />
        <div className="space-y-2 p-4">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      </Card>
    );
  }

  return (
    <Link href={href} className="block h-full">
      <Card className="h-full overflow-hidden transition-all hover:shadow-lg active:scale-[0.99]">
        <div className="relative aspect-[4/3] bg-muted">
          {preview.imageUrl ? (
            <ProductImage
              src={preview.imageUrl}
              alt={preview.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/10 to-muted text-sm text-muted-foreground">
              {preview.title.slice(0, 1).toUpperCase()}
            </div>
          )}
        </div>
        <VStack gap="xs" className="p-4">
          <h3 className="line-clamp-2 text-sm font-semibold text-foreground">{preview.title}</h3>
          <p className="truncate text-xs text-muted-foreground">{sellerLabel}</p>
          {priceLabel ? (
            <p className="text-sm font-semibold text-primary">{priceLabel}</p>
          ) : (
            <p className="text-xs text-muted-foreground">—</p>
          )}
        </VStack>
      </Card>
    </Link>
  );
}
