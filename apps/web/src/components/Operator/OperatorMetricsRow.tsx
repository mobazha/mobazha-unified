'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useI18n } from '@mobazha/core';
import { getMarketplaceEarnings } from '@mobazha/core/services/api/marketplace';
import type {
  MarketplaceAttributionSummary,
  MarketplaceEarnings,
} from '@mobazha/core/types/marketplace';
import { formatMinorUnits } from './OperatorEarningsCard';
import { Coins, Eye, ShoppingBag, Store } from 'lucide-react';

/**
 * The operator's business-at-a-glance strip: the first thing a published
 * marketplace shows. Four numbers answer "how is my market doing" before any
 * configuration UI appears — visits, attributed orders, commission earned,
 * and sellers (with pending-review pressure surfaced as a badge).
 */
export function OperatorMetricsRow({
  marketplaceId,
  summary,
  summaryLoading,
  approvedSellers,
  pendingSellers,
}: {
  marketplaceId: string;
  summary: MarketplaceAttributionSummary | null;
  summaryLoading: boolean;
  approvedSellers: number;
  pendingSellers: number;
}) {
  const { t } = useI18n();
  const [earnings, setEarnings] = useState<MarketplaceEarnings | null>(null);
  const [earningsLoading, setEarningsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setEarningsLoading(true);
    void (async () => {
      try {
        const result = await getMarketplaceEarnings(marketplaceId);
        if (!cancelled) setEarnings(result);
      } catch {
        // The dedicated earnings card below surfaces load errors; the strip
        // degrades to a dash.
      } finally {
        if (!cancelled) setEarningsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [marketplaceId]);

  const commissionTotals = (earnings?.totals ?? []).filter(total => total.status === 'recorded');
  const commissionLabel =
    commissionTotals.length === 0
      ? '—'
      : `${formatMinorUnits(commissionTotals[0].commissionAmount, commissionTotals[0].currencyDivisibility)} ${commissionTotals[0].pricingCoin}${
          commissionTotals.length > 1 ? ` +${commissionTotals.length - 1}` : ''
        }`;

  const metrics = [
    {
      key: 'visits',
      icon: Eye,
      label: t('marketplace.operator.metricVisits', { defaultValue: 'Visits · 30d' }),
      value: summaryLoading ? '…' : String(summary?.impressions ?? 0),
    },
    {
      key: 'orders',
      icon: ShoppingBag,
      label: t('marketplace.operator.metricOrders', { defaultValue: 'Attributed orders · 30d' }),
      value: summaryLoading ? '…' : String(summary?.orders ?? 0),
    },
    {
      key: 'commission',
      icon: Coins,
      label: t('marketplace.operator.metricCommission', { defaultValue: 'Commission · 30d' }),
      value: earningsLoading ? '…' : commissionLabel,
      highlight: true,
    },
    {
      key: 'sellers',
      icon: Store,
      label: t('marketplace.operator.metricSellers', { defaultValue: 'Sellers' }),
      value: String(approvedSellers),
      badge:
        pendingSellers > 0
          ? t('marketplace.operator.metricSellersPending', {
              defaultValue: `${pendingSellers} pending`,
              count: pendingSellers,
            })
          : undefined,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" data-testid="operator-metrics-row">
      {metrics.map(metric => (
        <Card key={metric.key} data-testid={`operator-metric-${metric.key}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <metric.icon className="h-3.5 w-3.5" />
              {metric.label}
            </div>
            <div
              className={`mt-2 truncate text-2xl font-semibold ${metric.highlight ? 'text-primary' : ''}`}
            >
              {metric.value}
            </div>
            {metric.badge ? (
              <div className="mt-1 text-xs font-medium text-amber-500">{metric.badge}</div>
            ) : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
