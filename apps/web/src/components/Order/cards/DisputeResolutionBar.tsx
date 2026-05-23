'use client';

import React, { memo } from 'react';
import { Button } from '@/components/ui/button';
import { useI18n, type DisplayDispute } from '@mobazha/core';
import { CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ModeratorResolveDecision = 'buyer' | 'seller' | 'split';

export interface DisputeResolutionBarProps {
  dispute: DisplayDispute;
  onResolve: (decision: ModeratorResolveDecision) => void;
  isResolving?: boolean;
  /** Desktop variant renders inline; mobile variant renders as sticky bottom bar */
  variant?: 'inline' | 'sticky';
  className?: string;
}

export const DisputeResolutionBar = memo(function DisputeResolutionBar({
  dispute,
  onResolve,
  isResolving = false,
  variant = 'inline',
  className,
}: DisputeResolutionBarProps) {
  const { t } = useI18n();
  const isResolved = dispute.status === 'resolved' || !!dispute.resolution;

  const resolutionLabel =
    dispute.resolution === 'buyer'
      ? t('order.disputeOverview.resolvedFavor', { party: t('order.buyer') })
      : dispute.resolution === 'seller'
        ? t('order.disputeOverview.resolvedFavor', { party: t('order.seller') })
        : dispute.resolution === 'split'
          ? t('order.disputeOverview.resolvedSplit')
          : null;

  const resolvedSubtext =
    resolutionLabel ?? (isResolved ? t('order.disputeOverview.resolutionUnknown') : null);

  const wrapperClass =
    variant === 'sticky'
      ? cn(
          'fixed bottom-0 left-0 right-0 z-30 bg-background/95 backdrop-blur-sm border-t border-border pb-safe',
          className
        )
      : cn('rounded-xl border border-border/60 bg-card shadow-sm', className);

  return (
    <div className={wrapperClass}>
      <div className="px-4 py-3 sm:px-5 sm:py-4">
        {isResolved ? (
          /* Resolved state */
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-foreground">
                {t('order.disputeOverview.resolved')}
              </p>
              {resolvedSubtext && (
                <p className="text-xs text-muted-foreground">{resolvedSubtext}</p>
              )}
            </div>
          </div>
        ) : (
          /* Pending resolution */
          <>
            <p className="text-xs text-muted-foreground text-center mb-3">
              {t('order.disputeOverview.prompt')}
            </p>
            <div className="flex gap-2 justify-center">
              {/* Favor Buyer */}
              <Button
                variant="outline"
                size="sm"
                className="flex-1 sm:flex-none sm:min-w-[110px] text-xs sm:text-sm"
                onClick={() => onResolve('buyer')}
                disabled={isResolving}
                data-testid="dispute-resolve-buyer"
              >
                {t('order.disputeOverview.favorBuyer')}
              </Button>
              {/* Split */}
              <Button
                variant="outline"
                size="sm"
                className="flex-1 sm:flex-none sm:min-w-[110px] text-xs sm:text-sm"
                onClick={() => onResolve('split')}
                disabled={isResolving}
                data-testid="dispute-resolve-split"
              >
                {t('order.disputeOverview.splitFunds')}
              </Button>
              {/* Favor Seller */}
              <Button
                variant="outline"
                size="sm"
                className="flex-1 sm:flex-none sm:min-w-[110px] text-xs sm:text-sm"
                onClick={() => onResolve('seller')}
                disabled={isResolving}
                data-testid="dispute-resolve-seller"
              >
                {t('order.disputeOverview.favorSeller')}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
});
