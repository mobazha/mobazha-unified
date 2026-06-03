'use client';

import React, { memo } from 'react';
import { Button } from '@/components/ui/button';
import { useI18n, type DisplayDispute, getDisputeResolutionHeadline } from '@mobazha/core';
import { CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DisputeResolutionBarProps {
  dispute: DisplayDispute;
  onOpenRuling: () => void;
  isResolving?: boolean;
  isOpeningSheet?: boolean;
  /** Desktop variant renders inline; mobile variant renders as sticky bottom bar */
  variant?: 'inline' | 'sticky';
  className?: string;
}

export const DisputeResolutionBar = memo(function DisputeResolutionBar({
  dispute,
  onOpenRuling,
  isResolving = false,
  isOpeningSheet = false,
  variant = 'inline',
  className,
}: DisputeResolutionBarProps) {
  const { t } = useI18n();
  const isResolved = dispute.status === 'resolved' || !!dispute.resolution;

  const resolutionLabel = getDisputeResolutionHeadline(dispute, t);

  const resolvedSubtext =
    resolutionLabel ??
    dispute.resolutionText ??
    (isResolved ? t('order.disputeOverview.resolutionUnknown') : null);

  const wrapperClass =
    variant === 'sticky'
      ? cn(
          'fixed bottom-0 left-0 right-0 z-30 bg-background/95 backdrop-blur-sm border-t border-border pb-safe',
          className
        )
      : cn('rounded-xl border border-border/60 bg-card shadow-sm', className);

  const busy = isResolving || isOpeningSheet;

  return (
    <div className={wrapperClass}>
      <div className="px-4 py-3 sm:px-5 sm:py-4">
        {isResolved ? (
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
          <>
            <p className="text-xs text-muted-foreground text-center mb-3">
              {t('order.disputeOverview.prompt')}
            </p>
            <Button
              className="w-full sm:w-auto sm:min-w-[200px] mx-auto block"
              size="sm"
              onClick={() => void onOpenRuling()}
              disabled={busy}
              data-testid="dispute-open-ruling"
            >
              {busy ? t('common.loading') : t('order.moderatorRuling.openSheet')}
            </Button>
          </>
        )}
      </div>
    </div>
  );
});
