'use client';

import React, { memo } from 'react';
import {
  useI18n,
  getDisputeResolutionHeadline,
  getDisputeSettlementPayoutLines,
  getDisputeEscrowTotalLabel,
  type DisplayDispute,
  type DisplayOrderSettlementBreakdown,
} from '@mobazha/core';
import { cn } from '@/lib/utils';

export interface DisputeRulingSummaryProps {
  dispute: DisplayDispute;
  settlementBreakdown?: DisplayOrderSettlementBreakdown;
  paymentCoin?: string;
  className?: string;
}

/** Compact ruling headline + escrow total + payout lines (shared by page card and accept dialog). */
export const DisputeRulingSummary = memo(function DisputeRulingSummary({
  dispute,
  settlementBreakdown,
  paymentCoin,
  className,
}: DisputeRulingSummaryProps) {
  const { t } = useI18n();

  const displayOptions = { paymentCoin };
  const headline = getDisputeResolutionHeadline(dispute, t);
  const showResolutionTextBelow = Boolean(headline && dispute.resolutionText);
  const payoutLines = getDisputeSettlementPayoutLines(
    dispute,
    settlementBreakdown,
    t,
    displayOptions
  );
  const escrowTotal = getDisputeEscrowTotalLabel(settlementBreakdown, displayOptions);
  const platformFeeLabel = t('order.platformFee');
  const hasPlatformFeeLine = payoutLines.some(line => line.label === platformFeeLabel);

  return (
    <div
      className={cn('rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-1.5', className)}
      data-testid="dispute-ruling-summary"
    >
      <p className="text-xs text-muted-foreground">{t('order.disputeDisplay.resolution')}</p>
      {headline ? (
        <p className="text-sm font-semibold text-primary">{headline}</p>
      ) : dispute.resolutionText ? (
        <p className="text-sm font-semibold text-foreground leading-relaxed">
          {dispute.resolutionText}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          {t('order.disputeOverview.resolutionUnknown')}
        </p>
      )}
      {showResolutionTextBelow ? (
        <p className="text-sm text-foreground leading-relaxed">{dispute.resolutionText}</p>
      ) : null}
      {escrowTotal ? (
        <div className="flex items-center justify-between gap-3 text-sm pt-1">
          <span className="text-muted-foreground">{t('order.disputeDisplay.escrowTotal')}</span>
          <span className="font-medium text-foreground text-right tabular-nums">{escrowTotal}</span>
        </div>
      ) : null}
      {payoutLines.length > 0 ? (
        <div className="pt-2 space-y-1 border-t border-primary/10">
          {payoutLines.map(line => (
            <div key={line.label} className="flex items-center justify-between gap-3 text-sm">
              <span className="text-muted-foreground">{line.label}</span>
              <span className="font-medium text-foreground text-right tabular-nums">
                {line.amount}
              </span>
            </div>
          ))}
          {hasPlatformFeeLine ? (
            <p className="text-xs text-muted-foreground pt-1 leading-relaxed">
              {t('order.disputeDisplay.platformFeeHint')}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
});
