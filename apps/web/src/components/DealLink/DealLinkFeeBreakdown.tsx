'use client';

import React from 'react';
import { useCurrency, useI18n } from '@mobazha/core';
import type { DealLinkFeeQuote } from '@mobazha/core/types/dealLink';
import { getDealLinkFeeLineItems } from '@mobazha/core/utils/dealLink';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';

export interface DealLinkFeeBreakdownProps {
  quote: DealLinkFeeQuote | null;
  loading?: boolean;
}

export function DealLinkFeeBreakdown({ quote, loading = false }: DealLinkFeeBreakdownProps) {
  const { t } = useI18n();
  const { formatPrice } = useCurrency();

  if (loading) {
    return (
      <Card data-testid="deal-link-fee-breakdown-loading">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t('dealLink.feeBreakdownTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-2/3" />
        </CardContent>
      </Card>
    );
  }

  if (!quote) return null;

  const lines = getDealLinkFeeLineItems(quote);
  const currency = quote.priceCurrency;

  return (
    <Card data-testid="deal-link-fee-breakdown">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{t('dealLink.feeBreakdownTitle')}</CardTitle>
        <p className="text-sm text-muted-foreground">{t('dealLink.feeBreakdownHint')}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <dl className="space-y-2">
          {lines.map(line => (
            <div key={line.key} className="flex items-center justify-between gap-3 text-sm">
              <dt className="text-muted-foreground">{t(`dealLink.feeLine.${line.key}`)}</dt>
              <dd className="font-medium tabular-nums">{formatPrice(line.amount, currency)}</dd>
            </div>
          ))}
        </dl>
        <Separator />
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium">{t('dealLink.buyerTotal')}</span>
          <span className="text-lg font-semibold text-primary tabular-nums">
            {formatPrice(quote.buyerTotal, currency)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
