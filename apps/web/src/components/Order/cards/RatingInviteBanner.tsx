'use client';

import React, { memo } from 'react';
import { useI18n } from '@mobazha/core';
import { cn } from '@/lib/utils';
import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface RatingInviteBannerProps {
  onWriteReview: () => void;
  onReportIssue?: () => void;
  disputeFiled?: boolean;
  className?: string;
}

export const RatingInviteBanner = memo(function RatingInviteBanner({
  onWriteReview,
  onReportIssue,
  disputeFiled,
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
          <div className="flex items-center gap-4 mt-2.5">
            <Button
              size="sm"
              variant="outline"
              className="text-xs h-7 px-3"
              onClick={onWriteReview}
            >
              {t('order.review.writeReview')}
            </Button>
            {onReportIssue && !disputeFiled && (
              <button
                type="button"
                onClick={onReportIssue}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors underline-offset-2 hover:underline"
              >
                {t('order.actions.reportIssue')}
              </button>
            )}
            {disputeFiled && (
              <span className="text-xs text-muted-foreground/60">
                {t('order.afterSaleDispute.issueReported')}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});
