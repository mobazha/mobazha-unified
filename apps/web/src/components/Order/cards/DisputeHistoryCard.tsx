'use client';

import React, { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  useI18n,
  isDisputeRulingAvailable,
  getDisputeReleaseTxHash,
  type DisplayOrder,
} from '@mobazha/core';
import { formatUserName } from '@mobazha/core/utils/identity';
import { CheckCircle2, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getOrderTransactionExplorerUrl } from '@/components/Order/utils';
import { DisputeRulingSection } from './DisputeRulingSection';

export interface DisputeHistoryCardProps {
  displayOrder: DisplayOrder;
  onOpenDiscussion?: () => void;
  className?: string;
}

/** Read-only dispute archive for completed / post-ruling orders (buyer & seller). */
export const DisputeHistoryCard = memo(function DisputeHistoryCard({
  displayOrder,
  onOpenDiscussion,
  className,
}: DisputeHistoryCardProps) {
  const { t } = useI18n();
  const dispute = displayOrder.dispute;
  if (!dispute || !isDisputeRulingAvailable(dispute)) return null;

  const initiatorLabel =
    dispute.initiator === 'buyer'
      ? formatUserName(displayOrder.buyer, { fallback: t('order.buyer') })
      : formatUserName(displayOrder.vendor, { fallback: t('order.seller') });

  const releaseTxHash = getDisputeReleaseTxHash(
    displayOrder.settlementBreakdown,
    displayOrder.releaseTx
  );
  const releaseTxUrl = releaseTxHash
    ? getOrderTransactionExplorerUrl(releaseTxHash, displayOrder) || undefined
    : undefined;

  return (
    <Card
      className={cn('overflow-hidden border-primary/25', className)}
      data-testid="order-dispute-history"
    >
      <div className="border-b border-primary/15 bg-primary/8 px-4 py-3 flex items-start gap-2.5">
        <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-foreground">
            {t('order.disputeSummary.titleResolved')}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t('order.disputeSummary.resolvedHint')}
          </p>
        </div>
      </div>

      <div className="p-4 space-y-3">
        <p className="text-xs text-muted-foreground">
          {t('order.initiatedBy', { party: initiatorLabel })}
        </p>

        {dispute.claim ? (
          <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
            <p className="text-xs font-medium text-muted-foreground mb-1">
              {t('order.disputeOverview.claim')}
            </p>
            <p className="text-sm text-foreground leading-relaxed">{dispute.claim}</p>
          </div>
        ) : null}

        <DisputeRulingSection
          dispute={dispute}
          settlementBreakdown={displayOrder.settlementBreakdown}
          paymentCoin={displayOrder.paymentCoin}
          releaseTxHash={releaseTxHash}
          releaseTxUrl={releaseTxUrl}
        />

        {onOpenDiscussion ? (
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
            onClick={onOpenDiscussion}
            data-testid="order-dispute-open-discussion"
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            {t('order.actions.openDiscussion')}
          </Button>
        ) : null}
      </div>
    </Card>
  );
});
