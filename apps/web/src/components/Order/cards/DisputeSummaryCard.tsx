'use client';

import React, { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  useI18n,
  getGatewayUrl,
  NODE_API,
  isDisputeRulingAvailable,
  type DisplayOrder,
} from '@mobazha/core';
import { formatUserName } from '@mobazha/core/utils/identity';
import { MessageSquare, ShieldAlert, Scale } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DisputeRulingSection } from './DisputeRulingSection';

export interface DisputeSummaryCardProps {
  displayOrder: DisplayOrder;
  onOpenDiscussion: () => void;
  className?: string;
}

export const DisputeSummaryCard = memo(function DisputeSummaryCard({
  displayOrder,
  onOpenDiscussion,
  className,
}: DisputeSummaryCardProps) {
  const { t } = useI18n();
  const dispute = displayOrder.dispute;
  if (!dispute) return null;

  const isRulingIssued = isDisputeRulingAvailable(dispute);

  const isBuyer = displayOrder.userRole === 'buyer';
  const isSeller = displayOrder.userRole === 'seller';
  const hintKey = isBuyer
    ? 'order.statusCard.disputedHintBuyer'
    : isSeller
      ? 'order.statusCard.disputedHintSeller'
      : 'order.statusCard.disputedHint';

  const initiatorLabel =
    dispute.initiator === 'buyer'
      ? formatUserName(displayOrder.buyer, { fallback: t('order.buyer') })
      : formatUserName(displayOrder.vendor, { fallback: t('order.seller') });

  const evidenceHashes = dispute.evidenceHashes ?? [];

  return (
    <Card
      className={cn(
        'overflow-hidden',
        isRulingIssued ? 'border-primary/25' : 'border-error/25',
        className
      )}
      data-testid="order-dispute-summary"
    >
      <div
        className={cn(
          'border-b px-4 py-3 flex items-start gap-2.5',
          isRulingIssued ? 'bg-primary/8 border-primary/15' : 'bg-error/8 border-error/15'
        )}
      >
        {isRulingIssued ? (
          <Scale className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        ) : (
          <ShieldAlert className="w-5 h-5 text-error shrink-0 mt-0.5" />
        )}
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-foreground">
            {isRulingIssued
              ? t('order.disputeSummary.titleDecided')
              : t('order.disputeSummary.title')}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isRulingIssued ? t('order.disputeSummary.awaitingAcceptance') : t(hintKey)}
          </p>
          {!isRulingIssued ? (
            <p className="text-xs text-muted-foreground mt-1">
              {t('order.disputeSummary.fundsHeld')}
            </p>
          ) : null}
        </div>
      </div>

      <div className="p-4 space-y-3">
        <p className="text-xs text-muted-foreground">
          {t('order.initiatedBy', { party: initiatorLabel })} •{' '}
          {t('order.disputeStatus', { status: dispute.status })}
        </p>

        {dispute.claim ? (
          <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
            <p className="text-xs font-medium text-muted-foreground mb-1">
              {t('order.disputeOverview.claim')}
            </p>
            <p className="text-sm text-foreground leading-relaxed">{dispute.claim}</p>
          </div>
        ) : null}

        {evidenceHashes.length > 0 ? (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">
              {t('order.disputeSummary.evidence', { count: evidenceHashes.length })}
            </p>
            <div className="flex flex-wrap gap-2">
              {evidenceHashes.map((hash, idx) => (
                <a
                  key={hash}
                  href={`${getGatewayUrl()}${NODE_API.MEDIA_IMAGE(hash)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-16 h-16 rounded-lg overflow-hidden border border-border/60 hover:border-primary/50 transition-colors"
                >
                  <img
                    src={`${getGatewayUrl()}${NODE_API.MEDIA_IMAGE(hash)}`}
                    alt={`${t('order.disputeOverview.evidence')} ${idx + 1}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </a>
              ))}
            </div>
          </div>
        ) : isBuyer ? (
          <p className="text-xs text-muted-foreground">
            {t('order.disputeSummary.noEvidenceBuyer')}
          </p>
        ) : null}

        {isRulingIssued ? (
          <DisputeRulingSection
            dispute={dispute}
            settlementBreakdown={displayOrder.settlementBreakdown}
            className="mt-1"
          />
        ) : null}

        <Button
          type="button"
          className="w-full sm:w-auto"
          onClick={onOpenDiscussion}
          data-testid="order-dispute-open-discussion"
        >
          <MessageSquare className="w-4 h-4 mr-2" />
          {t('order.actions.openDiscussion')}
        </Button>
      </div>
    </Card>
  );
});
