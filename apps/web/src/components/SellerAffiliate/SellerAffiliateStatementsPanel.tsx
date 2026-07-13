// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

'use client';

import React, { memo, useCallback, useState } from 'react';
import { Check, Copy, RefreshCw } from 'lucide-react';
import {
  getPaymentCoinDisplayLabel,
  groupSellerAffiliateStatementLines,
  renderPairedPrice,
  truncateAddress,
  useI18n,
  useSellerAffiliateStatements,
} from '@mobazha/core';
import type {
  SellerAffiliateDisplayStatus,
  SellerAffiliateGroupedStatement,
  SellerAffiliateStatementAudience,
} from '@mobazha/core';
import { copyToClipboard } from '@/lib/clipboard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface SellerAffiliateStatementsPanelProps {
  /** Selects the seller or promoter statement endpoint and title. */
  audience: SellerAffiliateStatementAudience;
}

function statusClass(status: SellerAffiliateDisplayStatus): string {
  if (status === 'paid') return 'bg-primary/10 text-primary';
  if (status === 'settling') return 'bg-accent text-accent-foreground';
  if (status === 'reversed') return 'bg-destructive/10 text-destructive';
  if (status === 'clawback_due') return 'bg-destructive/10 text-destructive';
  return 'bg-muted text-muted-foreground';
}

interface CopyableCodeProps {
  value: string;
  label: string;
}

/** Truncated tx/address value with a tap-to-copy affordance; never the sole status signal. */
const CopyableCode = memo(function CopyableCode({ value, label }: CopyableCodeProps) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    const ok = await copyToClipboard(value);
    if (!ok) return;
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }, [value]);

  return (
    <button
      type="button"
      onClick={() => void handleCopy()}
      className="inline-flex min-h-11 items-center gap-1 rounded px-1 font-mono text-xs text-muted-foreground hover:text-foreground"
      aria-label={label}
    >
      <span>{truncateAddress(value)}</span>
      {copied ? (
        <Check className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
      ) : (
        <Copy className="h-3.5 w-3.5" aria-hidden="true" />
      )}
      <span className="sr-only" role="status">
        {copied ? t('sellerAffiliate.copied') : ''}
      </span>
    </button>
  );
});

interface SettlementDetailProps {
  settlement: NonNullable<SellerAffiliateGroupedStatement['settlement']>;
}

const SettlementDetail = memo(function SettlementDetail({ settlement }: SettlementDetailProps) {
  const { t } = useI18n();

  return (
    <div className="mt-2 space-y-1 border-t border-border pt-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-xs text-muted-foreground">{t('sellerAffiliate.settlementAmount')}</p>
        <p className="text-xs font-medium">
          {getPaymentCoinDisplayLabel(settlement.coin)}{' '}
          {renderPairedPrice(settlement.amount, settlement.coin, settlement.coin, {
            isMinimalUnit: true,
          })}
        </p>
      </div>
      {settlement.state === 'confirmed' ? (
        <>
          {settlement.txHash ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">{t('sellerAffiliate.txHash')}</p>
              <CopyableCode value={settlement.txHash} label={t('sellerAffiliate.copyTx')} />
            </div>
          ) : null}
          {settlement.confirmedAt ? (
            <p className="text-xs text-muted-foreground">
              {t('sellerAffiliate.confirmedAt', {
                time: new Date(settlement.confirmedAt).toLocaleString(),
              })}
            </p>
          ) : null}
        </>
      ) : (
        <p className="text-xs text-muted-foreground">
          {t(
            settlement.state === 'submitted'
              ? 'sellerAffiliate.settlementStateSubmitted'
              : 'sellerAffiliate.settlementStatePlanned'
          )}
          {typeof settlement.confirmations === 'number'
            ? ` · ${t('sellerAffiliate.confirmations', { count: settlement.confirmations })}`
            : ''}
        </p>
      )}
    </div>
  );
});

export const SellerAffiliateStatementsPanel = memo(function SellerAffiliateStatementsPanel({
  audience,
}: SellerAffiliateStatementsPanelProps) {
  const { t } = useI18n();
  const { statements, loading, error, reload } = useSellerAffiliateStatements(audience);
  const title = t(
    audience === 'seller'
      ? 'sellerAffiliate.sellerStatementTitle'
      : 'sellerAffiliate.promoterStatementTitle'
  );
  const statusLabels: Record<SellerAffiliateDisplayStatus, string> = {
    pending: t('sellerAffiliate.pending'),
    settling: t('sellerAffiliate.settling'),
    paid: t('sellerAffiliate.paid'),
    reversed: t('sellerAffiliate.reversed'),
    clawback_due: t('sellerAffiliate.clawbackDue'),
  };
  const groups = groupSellerAffiliateStatementLines(statements);

  return (
    <Card data-testid={`seller-affiliate-statements-${audience}`} aria-busy={loading}>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="text-base">{title}</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('sellerAffiliate.statementDescription')}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-h-11"
          onClick={() => void reload()}
          disabled={loading}
          aria-label={t('sellerAffiliate.refresh')}
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {t('sellerAffiliate.statementLoadFailed')}
          </p>
        ) : null}
        {!loading && !error && !groups.length ? (
          <p className="text-sm text-muted-foreground">{t('sellerAffiliate.statementEmpty')}</p>
        ) : null}
        {groups.map(group => (
          <article
            key={`${group.orderID}::${group.currency}`}
            className="rounded-lg border border-border p-3"
            data-testid={`seller-affiliate-statement-${group.orderID}`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="min-w-0 break-all font-mono text-xs text-muted-foreground">
                {group.orderID}
              </p>
              <span
                className={`rounded-full px-2 py-1 text-xs font-medium ${statusClass(group.displayStatus)}`}
              >
                {statusLabels[group.displayStatus]}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm text-muted-foreground">{t('sellerAffiliate.commission')}</p>
              <p className="font-medium">
                {renderPairedPrice(group.commissionAtomic, group.currency, group.currency, {
                  isMinimalUnit: true,
                })}
              </p>
            </div>
            {group.settlement ? <SettlementDetail settlement={group.settlement} /> : null}
            <p className="mt-2 text-xs text-muted-foreground">
              {t('sellerAffiliate.referral', {
                id: group.lines[0].attribution.referralSessionID,
              })}
            </p>
          </article>
        ))}
      </CardContent>
    </Card>
  );
});
