'use client';

import React, { useMemo } from 'react';
import type { ProductRating, RatingIndex } from '@mobazha/core';
import { useI18n } from '@mobazha/core';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { HStack, VStack } from '@/components/layouts';

export interface ReviewListProps {
  ratings: ProductRating[];
  ratingIndex?: RatingIndex;
  className?: string;
}

function StarDisplay({ value }: { value: number }) {
  const displayValue = Math.min(5, Math.max(0, value));
  const fullStars = Math.floor(displayValue);

  return (
    <HStack gap="xs" align="center" className="min-h-[44px] min-w-[44px]">
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          className={cn(
            'w-5 h-5 shrink-0',
            i <= fullStars ? 'text-warning fill-warning' : 'text-muted-foreground/30'
          )}
          aria-hidden
        />
      ))}
    </HStack>
  );
}

export function ReviewList({ ratings, ratingIndex, className }: ReviewListProps) {
  const { t, formatDate } = useI18n();

  const safeRatings = useMemo(() => (Array.isArray(ratings) ? ratings : []), [ratings]);
  const count = ratingIndex?.count ?? safeRatings.length;
  const average =
    ratingIndex?.average ??
    (safeRatings.length > 0
      ? safeRatings.reduce((acc, r) => acc + (r.overall || 0), 0) / safeRatings.length
      : 0);

  const distribution = useMemo(() => {
    const counts = [0, 0, 0, 0, 0]; // 1, 2, 3, 4, 5 stars
    for (const r of safeRatings) {
      const star = Math.min(5, Math.max(1, Math.round(r.overall || 0)));
      counts[star - 1]++;
    }
    return counts;
  }, [safeRatings]);

  const maxCount = Math.max(1, ...distribution);
  const hasIndividualRatings = safeRatings.length > 0;
  const sortedRatings = useMemo(
    () =>
      [...safeRatings].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      ),
    [safeRatings]
  );

  const displayName = (r: ProductRating) => {
    if (r.anonymous) return t('review.anonymous');
    const handle = r.buyerID?.handle;
    if (handle) return handle;
    return r.buyerID?.peerID
      ? `${r.buyerID.peerID.slice(0, 6)}…${r.buyerID.peerID.slice(-4)}`
      : t('review.anonymous');
  };

  const getInitial = (r: ProductRating) => {
    if (r.anonymous) return '?';
    const handle = r.buyerID?.handle;
    if (handle) return handle.charAt(0).toUpperCase();
    return '?';
  };

  return (
    <VStack gap="lg" className={cn('text-foreground', className)} data-testid="review-list">
      {/* Rating Summary */}
      <section aria-label={t('review.summary')}>
        <HStack gap="lg" align="start" justify="between" wrap className="flex-col sm:flex-row">
          {/* Left: average + stars + count */}
          <HStack gap="md" align="center">
            <span className="text-3xl font-semibold text-foreground tabular-nums">
              {count === 0 ? '—' : average.toFixed(1)}
            </span>
            <VStack gap="xs" align="start">
              <StarDisplay value={average} />
              <span className="text-sm text-muted-foreground">
                {count === 0
                  ? t('review.noReviews')
                  : t('review.basedOn', { count: String(count) })}
              </span>
            </VStack>
          </HStack>

          {/* Right: distribution bars or no-reviews */}
          <div
            className="w-full sm:w-48 shrink-0"
            data-testid="rating-distribution"
            aria-label={t('review.averageRating')}
          >
            {count === 0 ? (
              <p className="text-sm text-muted-foreground">{t('review.noReviews')}</p>
            ) : !hasIndividualRatings && ratingIndex ? (
              <p className="text-sm text-muted-foreground">
                {t('review.summary')} — {t('review.averageRating')} {average.toFixed(1)}{' '}
                {t('review.outOf5')}
              </p>
            ) : (
              <VStack gap="xs">
                {([5, 4, 3, 2, 1] as const).map(star => {
                  const idx = star - 1;
                  const c = distribution[idx];
                  const pct = maxCount > 0 ? (c / maxCount) * 100 : 0;
                  return (
                    <HStack key={star} gap="sm" align="center" className="min-h-[44px]">
                      <span className="w-4 text-sm text-muted-foreground">{star}</span>
                      <div className="flex-1 h-3 rounded-full bg-muted overflow-hidden min-w-0">
                        <div
                          className="h-full bg-warning rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground w-6 tabular-nums">{c}</span>
                    </HStack>
                  );
                })}
              </VStack>
            )}
          </div>
        </HStack>
      </section>

      {/* Review list */}
      {hasIndividualRatings && (
        <VStack gap="md">
          {sortedRatings.map(r => (
            <article
              key={r.ratingID}
              className="rounded-lg border border-border bg-card p-4"
              data-testid="review-card"
            >
              <HStack gap="md" align="start">
                <div
                  className="w-11 h-11 rounded-full bg-muted flex items-center justify-center text-sm font-medium text-foreground shrink-0 min-w-[44px] min-h-[44px]"
                  aria-hidden
                >
                  {getInitial(r)}
                </div>
                <VStack gap="xs" className="min-w-0 flex-1">
                  <HStack gap="sm" align="center" wrap>
                    <span className="font-medium text-foreground">{displayName(r)}</span>
                    <span className="text-sm text-muted-foreground">{formatDate(r.timestamp)}</span>
                  </HStack>
                  <div aria-label={`${r.overall} ${t('review.outOf5')}`}>
                    <StarDisplay value={r.overall} />
                  </div>
                  {r.review && <p className="text-sm text-foreground mt-1">{r.review}</p>}
                </VStack>
              </HStack>
            </article>
          ))}
        </VStack>
      )}
    </VStack>
  );
}
