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
import { ArrowDownRight, ArrowUpRight, Coins, Eye, ShoppingBag, Store } from 'lucide-react';

export type OperatorMetricTarget = 'funnel' | 'earnings' | 'sellers';

/**
 * The operator's business-at-a-glance strip: the first thing a published
 * marketplace shows. Four numbers answer "how is my market doing" before any
 * configuration UI appears — visits, attributed orders, commission earned,
 * and sellers (with pending-review pressure surfaced as a badge). Every card
 * is a door: clicking it lands on the detail that explains the number.
 */
export function OperatorMetricsRow({
  marketplaceId,
  summary,
  summaryLoading,
  approvedSellers,
  pendingSellers,
  onNavigate,
}: {
  marketplaceId: string;
  summary: MarketplaceAttributionSummary | null;
  summaryLoading: boolean;
  approvedSellers: number;
  pendingSellers: number;
  onNavigate?: (target: OperatorMetricTarget) => void;
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

  const visits = summary?.visits ?? 0;
  const orders = summary?.orders ?? 0;
  const visitsDelta = summaryLoading || !summary ? null : visits - summary.previousVisits;
  const ordersDelta = summaryLoading || !summary ? null : orders - summary.previousOrders;
  // A delta only earns pixels once there is movement in either window; a
  // brand-new market showing "±0 vs previous" would be noise, not signal.
  const showVisitsDelta = visitsDelta != null && (visits > 0 || (summary?.previousVisits ?? 0) > 0);
  const showOrdersDelta = ordersDelta != null && (orders > 0 || (summary?.previousOrders ?? 0) > 0);

  const metrics: Array<{
    key: string;
    icon: typeof Eye;
    label: string;
    value: string;
    target: OperatorMetricTarget;
    delta?: number | null;
    showDelta?: boolean;
    hint?: string;
    badge?: string;
    highlight?: boolean;
  }> = [
    {
      key: 'visits',
      icon: Eye,
      label: t('marketplace.operator.metricVisits', { defaultValue: 'Visits · 30d' }),
      value: summaryLoading ? '…' : String(visits),
      target: 'funnel',
      delta: visitsDelta,
      showDelta: showVisitsDelta,
      hint:
        !summaryLoading && visits === 0
          ? t('marketplace.operator.metricVisitsEmpty', {
              defaultValue: 'Share your link to start',
            })
          : undefined,
    },
    {
      key: 'orders',
      icon: ShoppingBag,
      label: t('marketplace.operator.metricOrders', { defaultValue: 'Attributed orders · 30d' }),
      value: summaryLoading ? '…' : String(orders),
      target: 'funnel',
      delta: ordersDelta,
      showDelta: showOrdersDelta,
      hint:
        !summaryLoading && orders === 0
          ? t('marketplace.operator.metricOrdersEmpty', { defaultValue: 'None yet' })
          : undefined,
    },
    {
      key: 'commission',
      icon: Coins,
      label: t('marketplace.operator.metricCommission', { defaultValue: 'Commission · 30d' }),
      value: earningsLoading ? '…' : commissionLabel,
      target: 'earnings',
      highlight: true,
      hint:
        !earningsLoading && commissionTotals.length === 0
          ? t('marketplace.operator.metricCommissionEmpty', {
              defaultValue: 'Accrues as orders land',
            })
          : undefined,
    },
    {
      key: 'sellers',
      icon: Store,
      label: t('marketplace.operator.metricSellers', { defaultValue: 'Sellers' }),
      value: String(approvedSellers),
      target: 'sellers',
      badge:
        pendingSellers > 0
          ? t('marketplace.operator.metricSellersPending', {
              defaultValue: `${pendingSellers} pending`,
              count: pendingSellers,
            })
          : undefined,
      hint:
        approvedSellers === 0 && pendingSellers === 0
          ? t('marketplace.operator.metricSellersEmpty', {
              defaultValue: 'Invite your first seller',
            })
          : undefined,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" data-testid="operator-metrics-row">
      {metrics.map(metric => (
        <Card
          key={metric.key}
          data-testid={`operator-metric-${metric.key}`}
          className="transition-colors hover:border-foreground/20"
        >
          <button
            type="button"
            className="block w-full text-left"
            onClick={() => onNavigate?.(metric.target)}
            aria-label={metric.label}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <metric.icon className="h-3.5 w-3.5" />
                {metric.label}
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span
                  className={`truncate text-2xl font-semibold tabular-nums ${metric.highlight ? 'text-primary' : ''}`}
                >
                  {metric.value}
                </span>
                {metric.showDelta && metric.delta != null ? (
                  <span
                    className={`flex items-center gap-0.5 text-xs font-medium tabular-nums ${
                      metric.delta > 0
                        ? 'text-emerald-500'
                        : metric.delta < 0
                          ? 'text-muted-foreground'
                          : 'text-muted-foreground'
                    }`}
                    title={t('marketplace.operator.metricDeltaTitle', {
                      defaultValue: 'vs previous 30 days',
                    })}
                    data-testid={`operator-metric-${metric.key}-delta`}
                  >
                    {metric.delta > 0 ? (
                      <ArrowUpRight className="h-3 w-3" />
                    ) : metric.delta < 0 ? (
                      <ArrowDownRight className="h-3 w-3" />
                    ) : null}
                    {metric.delta > 0 ? `+${metric.delta}` : String(metric.delta)}
                  </span>
                ) : null}
              </div>
              {metric.badge ? (
                <div className="mt-1 text-xs font-medium text-amber-500">{metric.badge}</div>
              ) : metric.hint ? (
                <div className="mt-1 truncate text-xs text-muted-foreground">{metric.hint}</div>
              ) : null}
            </CardContent>
          </button>
        </Card>
      ))}
    </div>
  );
}
