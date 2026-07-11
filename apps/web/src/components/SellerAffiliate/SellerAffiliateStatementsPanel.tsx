// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

'use client';

import React, { memo } from 'react';
import { RefreshCw } from 'lucide-react';
import {
  deriveSellerAffiliateDisplayStatus,
  renderPairedPrice,
  useI18n,
  useSellerAffiliateStatements,
} from '@mobazha/core';
import type { SellerAffiliateDisplayStatus, SellerAffiliateStatementAudience } from '@mobazha/core';
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
  return 'bg-muted text-muted-foreground';
}

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
  };

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
          <p className="text-sm text-destructive">{t('sellerAffiliate.statementLoadFailed')}</p>
        ) : null}
        {!loading && !error && !statements.length ? (
          <p className="text-sm text-muted-foreground">{t('sellerAffiliate.statementEmpty')}</p>
        ) : null}
        {statements.map(line => {
          const { attribution, commissionLine } = line;
          const displayStatus = deriveSellerAffiliateDisplayStatus(line);
          return (
            <article
              key={`${commissionLine.orderLineID}-${commissionLine.attributionID}`}
              className="rounded-lg border border-border p-3"
              data-testid={`seller-affiliate-statement-${commissionLine.orderID}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-mono text-xs text-muted-foreground">{commissionLine.orderID}</p>
                <span
                  className={`rounded-full px-2 py-1 text-xs font-medium ${statusClass(displayStatus)}`}
                >
                  {statusLabels[displayStatus]}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm text-muted-foreground">{t('sellerAffiliate.commission')}</p>
                <p className="font-medium">
                  {renderPairedPrice(
                    commissionLine.commissionAtomic,
                    commissionLine.currency,
                    commissionLine.currency,
                    { isMinimalUnit: true }
                  )}
                </p>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {t('sellerAffiliate.referral', { id: attribution.referralSessionID })}
              </p>
            </article>
          );
        })}
      </CardContent>
    </Card>
  );
});
