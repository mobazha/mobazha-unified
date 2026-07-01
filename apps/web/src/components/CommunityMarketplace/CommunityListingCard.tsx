'use client';

import React from 'react';
import Link from 'next/link';
import {
  communityProductHref,
  identityNameProps,
  resolveProductCardSellerDisplay,
  useCurrency,
  type CommunityListingPreview,
  type CommunitySellerProfile,
} from '@mobazha/core';
import { resolveCollectibleListingImageUrl } from '@mobazha/core/curation/collectibleMarketplace';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ProductImage } from '@/components/ui/product-image';
import { VStack } from '@/components/layouts';

interface CommunityListingCardProps {
  preview: CommunityListingPreview;
  sellerProfile?: CommunitySellerProfile;
  productHref?: string;
  onClick?: React.MouseEventHandler<HTMLAnchorElement>;
}

export function CommunityListingCard({
  preview,
  sellerProfile,
  productHref,
  onClick,
}: CommunityListingCardProps) {
  const { renderPairedPrice } = useCurrency();
  const href = productHref ?? communityProductHref(preview.slug, preview.peerID);
  const imageUrl = resolveCollectibleListingImageUrl(preview.slug, preview.imageUrl);
  const seller = resolveProductCardSellerDisplay({
    peerID: preview.peerID,
    name: preview.vendorName,
    profileName: sellerProfile?.displayName,
    profileAvatarUrl: sellerProfile?.avatarUrl,
  });
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
    <Link href={href} className="block h-full" onClick={onClick}>
      <Card className="h-full overflow-hidden transition-all hover:shadow-lg active:scale-[0.99]">
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          {imageUrl ? (
            <ProductImage src={imageUrl} alt={preview.title} fill fit="contain" iconSize="lg" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/10 to-muted text-sm text-muted-foreground">
              {preview.title.slice(0, 1).toUpperCase()}
            </div>
          )}
        </div>
        <VStack gap="xs" className="p-4">
          <h3 className="line-clamp-2 text-sm font-semibold text-foreground">{preview.title}</h3>
          {seller.name ? (
            <p {...identityNameProps('truncate text-xs text-muted-foreground')}>{seller.name}</p>
          ) : null}
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
