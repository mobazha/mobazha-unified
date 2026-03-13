'use client';

import React from 'react';
import Link from 'next/link';
import { HStack } from '@/components/layouts';
import { Card } from '@/components/ui/card';
import { AvatarCompat as Avatar } from '@/components/ui/avatar-compat';
import { getImageUrl } from '@mobazha/core';
import { SellerTrustBadge } from './SellerTrustBadge';
import { cn } from '@/lib/utils';

export interface SellerInfoCardProps {
  /** Store peer ID (for link and avatar fallback) */
  peerID: string;
  /** Seller display name */
  name: string;
  /** Avatar image hashes (e.g. vendor.avatarHashes) */
  avatarHashes?: { small?: string; medium?: string; large?: string } | null;
  /** Average rating 0-5 */
  rating: number;
  /** Number of reviews */
  reviewCount: number;
  /** Number of sales (optional) */
  salesCount?: number;
  /** Member since date ISO string (optional) */
  memberSince?: string;
  /** Completion rate 0-100 (optional) */
  completionRate?: number;
  /** Show "New store" label when no reviews */
  isNewStore?: boolean;
  /** Location (optional) */
  location?: string;
  /** i18n key for "View store" button */
  viewStoreLabel: string;
  className?: string;
}

/**
 * Seller info card for product detail: avatar, name, trust badge (rating + completion + new store), link to store.
 */
export function SellerInfoCard({
  peerID,
  name,
  avatarHashes,
  rating,
  reviewCount,
  salesCount,
  memberSince,
  completionRate,
  isNewStore = false,
  location,
  viewStoreLabel,
  className,
}: SellerInfoCardProps) {
  if (!peerID) return null;

  const displayName = name || peerID.slice(0, 8) || '';

  return (
    <Card className={cn('p-4 sm:p-6', className)} data-testid="seller-info-card">
      <Link href={`/store/${peerID}`} className="touch-feedback block group">
        <HStack gap="sm" align="center">
          <Avatar
            src={getImageUrl(avatarHashes?.medium ?? avatarHashes?.small, peerID)}
            name={displayName}
            size="md"
            className="w-10 h-10 sm:w-12 sm:h-12 shrink-0"
          />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground text-sm sm:text-base group-hover:text-primary transition-colors">
              {displayName}
            </h3>
            {location && (
              <p className="text-xs sm:text-sm text-muted-foreground truncate">{location}</p>
            )}
            <div className="mt-1">
              <SellerTrustBadge
                rating={rating}
                reviewCount={reviewCount}
                salesCount={salesCount}
                memberSince={memberSince}
                completionRate={completionRate}
                isNewStore={isNewStore}
                compact
              />
            </div>
          </div>
          <span className="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium flex-shrink-0">
            {viewStoreLabel}
          </span>
        </HStack>
      </Link>
    </Card>
  );
}
