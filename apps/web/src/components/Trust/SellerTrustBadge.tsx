'use client';

import React from 'react';
import { Star, ShoppingBag, Calendar } from 'lucide-react';
import { useI18n } from '@mobazha/core';
import { cn } from '@/lib/utils';

export interface SellerTrustBadgeProps {
  /** Average rating 0-5 */
  rating: number;
  /** Number of reviews */
  reviewCount: number;
  /** Number of sales (optional) */
  salesCount?: number;
  /** Member since date (ISO string) */
  memberSince?: string;
  /** Completion rate 0-100 (optional) */
  completionRate?: number;
  /** Show "New store" label when no/few reviews */
  isNewStore?: boolean;
  /** Compact inline layout for cards */
  compact?: boolean;
  /** Additional class name */
  className?: string;
}

/**
 * Compact badge showing seller reputation.
 * Compact mode: single line with star + rating + review count.
 * Full mode: card with star rating, review count, sales count, member since.
 */
export function SellerTrustBadge({
  rating,
  reviewCount,
  salesCount,
  memberSince,
  completionRate,
  isNewStore = false,
  compact = false,
  className,
}: SellerTrustBadgeProps) {
  const { t, formatDate } = useI18n();

  const displayRating = Math.min(5, Math.max(0, rating));
  const fullStars = Math.floor(displayRating);

  if (compact) {
    return (
      <div
        className={cn('inline-flex flex-wrap items-center gap-2 min-h-[44px]', 'text-foreground', className)}
        data-testid="seller-trust-badge"
      >
        <div className="flex items-center gap-0.5" aria-label={t('trust.sellerRating')}>
          {[1, 2, 3, 4, 5].map(i => (
            <Star
              key={i}
              className={cn(
                'w-4 h-4',
                i <= fullStars ? 'text-warning fill-warning' : 'text-muted-foreground/30'
              )}
              aria-hidden
            />
          ))}
        </div>
        <span className="text-sm font-medium text-foreground">{displayRating.toFixed(1)}</span>
        <span className="text-sm text-muted-foreground">
          ({t('trust.reviews', { count: reviewCount })})
        </span>
        {isNewStore && (
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
            {t('trust.newStore')}
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-card p-3 sm:p-4',
        'text-foreground',
        className
      )}
      data-testid="seller-trust-badge"
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2" aria-label={t('trust.sellerRating')}>
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map(i => (
              <Star
                key={i}
                className={cn(
                  'w-4 h-4 sm:w-5 sm:h-5',
                  i <= fullStars ? 'text-warning fill-warning' : 'text-muted-foreground/30'
                )}
                aria-hidden
              />
            ))}
          </div>
          <span className="text-sm sm:text-base font-medium text-foreground">
            {displayRating.toFixed(1)}
          </span>
          <span className="text-sm text-muted-foreground">
            {t('trust.reviews', { count: reviewCount })}
          </span>
          {isNewStore && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
              {t('trust.newStore')}
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          {completionRate != null && (
            <span className="inline-flex items-center gap-1.5 min-h-[44px]">
              {t('trust.completionRate', { percent: Math.round(completionRate) })}
            </span>
          )}
          {salesCount != null && (
            <span className="inline-flex items-center gap-1.5 min-h-[44px]">
              <ShoppingBag className="w-4 h-4 shrink-0" aria-hidden />
              {t('trust.sales', { count: salesCount })}
            </span>
          )}
          {memberSince && (
            <span className="inline-flex items-center gap-1.5 min-h-[44px]">
              <Calendar className="w-4 h-4 shrink-0" aria-hidden />
              {t('trust.memberSince')}:{' '}
              {formatDate(memberSince, { year: 'numeric', month: 'short' })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
