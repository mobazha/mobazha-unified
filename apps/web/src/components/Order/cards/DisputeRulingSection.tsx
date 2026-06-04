'use client';

import React, { memo, useCallback, useState } from 'react';
import { Copy, ExternalLink } from 'lucide-react';
import {
  useI18n,
  isDisputeRulingAvailable,
  type DisplayDispute,
  type DisplayOrderSettlementBreakdown,
} from '@mobazha/core';
import { cn } from '@/lib/utils';
import { copyToClipboard, formatOrderDate } from '@/components/Order/utils';
import { DisputeRulingSummary } from './DisputeRulingSummary';

export interface DisputeRulingSectionProps {
  dispute: DisplayDispute;
  settlementBreakdown?: DisplayOrderSettlementBreakdown;
  paymentCoin?: string;
  releaseTxHash?: string;
  releaseTxUrl?: string;
  className?: string;
  /** Show resolved timestamp when available */
  showResolvedAt?: boolean;
}

function formatTxHash(hash: string): string {
  if (hash.length <= 16) return hash;
  return `${hash.slice(0, 8)}...${hash.slice(-6)}`;
}

export const DisputeRulingSection = memo(function DisputeRulingSection({
  dispute,
  settlementBreakdown,
  paymentCoin,
  releaseTxHash,
  releaseTxUrl,
  className,
  showResolvedAt = true,
}: DisputeRulingSectionProps) {
  const { t } = useI18n();
  const [copiedTx, setCopiedTx] = useState(false);

  const handleCopyTx = useCallback(async () => {
    if (!releaseTxHash) return;
    const ok = await copyToClipboard(releaseTxHash);
    if (!ok) return;
    setCopiedTx(true);
    window.setTimeout(() => setCopiedTx(false), 1600);
  }, [releaseTxHash]);

  if (!isDisputeRulingAvailable(dispute)) return null;

  return (
    <div className={cn('space-y-1.5', className)} data-testid="order-dispute-ruling">
      <DisputeRulingSummary
        dispute={dispute}
        settlementBreakdown={settlementBreakdown}
        paymentCoin={paymentCoin}
      />
      {releaseTxHash ? (
        <div className="flex flex-wrap items-center gap-1.5 pt-1 px-1">
          <span className="text-xs text-muted-foreground">
            {t('order.disputeDisplay.releaseTx')}
          </span>
          <div className="inline-flex items-center gap-1.5 rounded-md bg-background/70 px-2 py-1 ring-1 ring-border/70">
            {releaseTxUrl ? (
              <a
                href={releaseTxUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-mono text-primary hover:underline inline-flex items-center gap-1"
                title={releaseTxHash}
              >
                {formatTxHash(releaseTxHash)}
                <ExternalLink className="w-3 h-3 shrink-0" />
              </a>
            ) : (
              <span className="text-xs font-mono text-muted-foreground" title={releaseTxHash}>
                {formatTxHash(releaseTxHash)}
              </span>
            )}
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => {
                void handleCopyTx();
              }}
              aria-label={t('common.copy')}
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
            {copiedTx ? <span className="text-xs text-success">{t('common.copied')}</span> : null}
          </div>
        </div>
      ) : null}
      {showResolvedAt && dispute.resolvedAt ? (
        <p className="text-xs text-muted-foreground px-1">
          {t('order.disputeOverview.resolvedOn')}: {formatOrderDate(dispute.resolvedAt)}
        </p>
      ) : null}
    </div>
  );
});
