// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

'use client';

import React, { memo } from 'react';
import { RefreshCw } from 'lucide-react';
import { renderPairedPrice, useSellerAffiliateStatements } from '@mobazha/core';
import type { SellerAffiliateStatementAudience } from '@mobazha/core';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface SellerAffiliateStatementsPanelProps {
  audience: SellerAffiliateStatementAudience;
}

function statusClass(status: string): string {
  if (status === 'earned') return 'bg-primary/10 text-primary';
  if (status === 'reversed') return 'bg-destructive/10 text-destructive';
  return 'bg-muted text-muted-foreground';
}

export const SellerAffiliateStatementsPanel = memo(function SellerAffiliateStatementsPanel({
  audience,
}: SellerAffiliateStatementsPanelProps) {
  const { statements, loading, error, reload } = useSellerAffiliateStatements(audience);
  const title = audience === 'seller' ? 'Affiliate commissions' : 'Affiliate earnings';

  return (
    <Card data-testid={`seller-affiliate-statements-${audience}`} aria-busy={loading}>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="text-base">{title}</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Status is updated automatically from the order lifecycle. This is not a payout record.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-h-11"
          onClick={() => void reload()}
          disabled={loading}
          aria-label="Refresh affiliate statement"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {error ? (
          <p className="text-sm text-destructive">Unable to load the affiliate statement.</p>
        ) : null}
        {!loading && !error && !statements.length ? (
          <p className="text-sm text-muted-foreground">No affiliate commissions yet.</p>
        ) : null}
        {statements.map(({ attribution, commissionLine }) => (
          <article
            key={`${commissionLine.orderLineID}-${commissionLine.attributionID}`}
            className="rounded-lg border border-border p-3"
            data-testid={`seller-affiliate-statement-${commissionLine.orderID}`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-mono text-xs text-muted-foreground">{commissionLine.orderID}</p>
              <span
                className={`rounded-full px-2 py-1 text-xs font-medium ${statusClass(commissionLine.status)}`}
              >
                {commissionLine.status}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm text-muted-foreground">Commission</p>
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
              Referral {attribution.referralSessionID}
            </p>
          </article>
        ))}
      </CardContent>
    </Card>
  );
});
