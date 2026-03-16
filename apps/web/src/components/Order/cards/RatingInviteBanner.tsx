'use client';

import React, { memo } from 'react';
import { useI18n } from '@mobazha/core';
import { cn } from '@/lib/utils';
import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface RatingInviteBannerProps {
  onWriteReview: () => void;
  className?: string;
}

export const RatingInviteBanner = memo(function RatingInviteBanner({
  onWriteReview,
  className,
}: RatingInviteBannerProps) {
  const { t } = useI18n();

  return (
    <div
      className={cn(
        'rounded-xl border p-4 bg-amber-50/50 border-amber-200/40 dark:bg-amber-950/20 dark:border-amber-800/30',
        className
      )}
      data-testid="rating-invite-banner"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0 text-amber-500 dark:text-amber-400">
          <Star className="w-5 h-5 fill-current" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">{t('order.review.inviteTitle')}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{t('order.review.inviteDesc')}</p>
          <Button
            size="sm"
            variant="outline"
            className="mt-2.5 text-xs h-7 px-3"
            onClick={onWriteReview}
          >
            {t('order.review.writeReview')}
          </Button>
        </div>
      </div>
    </div>
  );
});
