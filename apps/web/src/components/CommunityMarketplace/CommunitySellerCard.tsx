'use client';

import React from 'react';
import Link from 'next/link';
import {
  formatUserName,
  useI18n,
  type CommunitySellerProfile,
  type PublicMarketplaceSeller,
} from '@mobazha/core';
import { Card } from '@/components/ui/card';
import { HStack, VStack } from '@/components/layouts';
import { MarketplaceLogo } from './MarketplaceLogo';

interface CommunitySellerCardProps {
  seller: PublicMarketplaceSeller;
  profile?: CommunitySellerProfile;
}

export function CommunitySellerCard({ seller, profile }: CommunitySellerCardProps) {
  const { t } = useI18n();
  const productGroups = seller.productGroups ?? [];
  const productCount = productGroups.reduce((sum, g) => sum + g.itemCount, 0);
  const groupNames = productGroups.map(g => g.name).filter(Boolean);
  const groupDisplayName = groupNames[0]?.trim();
  const displayName = formatUserName(
    { name: profile?.displayName || groupDisplayName, peerID: seller.peerID },
    { fallback: t('common.seller'), prefix: 'Store' }
  );
  const subtitle =
    groupNames.length > 0
      ? groupNames.slice(0, 2).join(' · ')
      : profile?.shortDescription?.trim() || t('marketplace.sellerNoGroups');

  return (
    <Link href={`/store/${seller.peerID}`} className="block h-full">
      <Card className="h-full p-4 transition-all hover:shadow-lg active:scale-[0.99]">
        <HStack gap="md" align="start">
          {profile?.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt=""
              className="h-14 w-14 flex-shrink-0 rounded-full bg-muted object-cover"
            />
          ) : (
            <MarketplaceLogo
              name={displayName}
              identifier={seller.peerID}
              size="sm"
              className="rounded-full"
            />
          )}
          <VStack gap="xs" className="min-w-0 flex-1">
            <h3 className="truncate font-semibold text-foreground">{displayName}</h3>
            <p className="text-sm text-muted-foreground">
              {productCount} {t('marketplace.products')}
            </p>
            <p className="line-clamp-2 text-xs text-muted-foreground">{subtitle}</p>
          </VStack>
        </HStack>
      </Card>
    </Link>
  );
}
