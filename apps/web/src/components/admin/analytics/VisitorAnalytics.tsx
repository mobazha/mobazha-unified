'use client';

import React, { useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Eye, Users, ShoppingCart, CreditCard, Globe, FileText } from 'lucide-react';
import { useI18n } from '@mobazha/core';
import { StatCard } from '@/components/admin/dashboard';
import { Skeleton } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useVisitorData, type VisitorPeriod } from './useVisitorData';

const VISITOR_PERIOD_OPTIONS: { value: VisitorPeriod; label: string }[] = [
  { value: 7, label: '7d' },
  { value: 30, label: '30d' },
  { value: 90, label: '90d' },
];

function formatDateTick(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function VisitorPeriodSelector({
  value,
  onChange,
}: {
  value: VisitorPeriod;
  onChange: (p: VisitorPeriod) => void;
}) {
  return (
    <div className="flex gap-1 bg-muted rounded-lg p-0.5">
      {VISITOR_PERIOD_OPTIONS.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
            value === opt.value
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function VisitorAnalytics() {
  const { t } = useI18n();
  const [days, setDays] = useState<VisitorPeriod>(30);
  const { summary, trend, topPages, referrers, funnelSteps, isLoading, error } =
    useVisitorData(days);

  if (error) {
    return (
      <div className="bg-card border border-border rounded-xl p-6 text-center text-muted-foreground text-sm">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Section header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            {t('admin.analytics.visitorTitle')}
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t('admin.analytics.visitorSubtitle')}
          </p>
        </div>
        <VisitorPeriodSelector value={days} onChange={setDays} />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          icon={Eye}
          label={t('admin.analytics.pageViews')}
          value={isLoading ? '—' : String(summary?.totalPageViews ?? 0)}
          color="info"
          loading={isLoading}
        />
        <StatCard
          icon={Users}
          label={t('admin.analytics.uniqueVisitors')}
          value={isLoading ? '—' : String(summary?.uniqueVisitors ?? 0)}
          color="primary"
          loading={isLoading}
        />
        <StatCard
          icon={ShoppingCart}
          label={t('admin.analytics.addToCartCount')}
          value={isLoading ? '—' : String(summary?.totalAddToCart ?? 0)}
          color="warning"
          loading={isLoading}
        />
        <StatCard
          icon={CreditCard}
          label={t('admin.analytics.checkoutCount')}
          value={isLoading ? '—' : String(summary?.totalCheckoutStart ?? 0)}
          color="success"
          loading={isLoading}
        />
      </div>

      {/* Visitor trend chart */}
      <div className="bg-card border border-border rounded-xl p-4 sm:p-6">
        <h3 className="text-sm sm:text-base font-semibold text-foreground mb-4">
          {t('admin.analytics.visitorTrend')}
        </h3>
        {isLoading ? (
          <Skeleton className="h-[250px] w-full rounded-xl" />
        ) : !trend.length ? (
          <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">
            {t('admin.analytics.noData')}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={trend} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="visitorsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="viewsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis
                dataKey="date"
                tickFormatter={formatDateTick}
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
                minTickGap={40}
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
                width={40}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  background: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: 8,
                  fontSize: 12,
                }}
                labelFormatter={(label: string) => {
                  const d = new Date(label + 'T00:00:00');
                  return d.toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  });
                }}
              />
              <Area
                type="monotone"
                dataKey="views"
                name={t('admin.analytics.pageViews')}
                stroke="hsl(var(--chart-1))"
                fillOpacity={1}
                fill="url(#viewsGrad)"
                strokeWidth={1.5}
              />
              <Area
                type="monotone"
                dataKey="visitors"
                name={t('admin.analytics.uniqueVisitors')}
                stroke="hsl(var(--chart-2))"
                fillOpacity={1}
                fill="url(#visitorsGrad)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Two-column: Funnel + Referrers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conversion funnel */}
        <div className="bg-card border border-border rounded-xl p-4 sm:p-6">
          <h3 className="text-sm sm:text-base font-semibold text-foreground mb-4">
            {t('admin.analytics.conversionFunnel')}
          </h3>
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {funnelSteps.map((step, i) => {
                const labels: Record<string, string> = {
                  pageView: t('admin.analytics.pageViews'),
                  productView: t('admin.analytics.productViews'),
                  addToCart: t('admin.analytics.addToCartCount'),
                  checkoutStart: t('admin.analytics.checkoutCount'),
                };
                return (
                  <div key={step.key}>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <span className="text-foreground font-medium">
                        {labels[step.key] ?? step.key}
                      </span>
                      <span className="text-muted-foreground">
                        {step.value.toLocaleString()} ({step.pct}%)
                      </span>
                    </div>
                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${step.pct}%`,
                          backgroundColor: [
                            'hsl(var(--chart-1))',
                            'hsl(var(--chart-2))',
                            'hsl(var(--chart-4))',
                            'hsl(var(--chart-3))',
                          ][i],
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Referrers */}
        <div className="bg-card border border-border rounded-xl p-4 sm:p-6">
          <h3 className="text-sm sm:text-base font-semibold text-foreground mb-4">
            {t('admin.analytics.trafficSources')}
          </h3>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full rounded-lg" />
              ))}
            </div>
          ) : !referrers.length ? (
            <div className="py-8 text-center text-muted-foreground text-sm">
              {t('admin.analytics.noData')}
            </div>
          ) : (
            <div className="space-y-2.5">
              {referrers.map(ref => {
                const maxVisits = referrers[0]?.visits ?? 1;
                const pct = Math.round((ref.visits / maxVisits) * 100);
                return (
                  <div key={ref.source} className="flex items-center gap-3">
                    <Globe className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between text-sm mb-0.5">
                        <span className="text-foreground truncate">{ref.source}</span>
                        <span className="text-muted-foreground ml-2 shrink-0">{ref.visits}</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary/60 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Top pages */}
      <div className="bg-card border border-border rounded-xl p-4 sm:p-6">
        <h3 className="text-sm sm:text-base font-semibold text-foreground mb-4">
          {t('admin.analytics.topPages')}
        </h3>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-lg" />
            ))}
          </div>
        ) : !topPages.length ? (
          <div className="py-8 text-center text-muted-foreground text-sm">
            {t('admin.analytics.noData')}
          </div>
        ) : (
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full text-sm min-w-[400px]">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border">
                  <th className="pb-2 pl-4 sm:pl-0 font-medium">{t('admin.analytics.page')}</th>
                  <th className="pb-2 font-medium text-right">{t('admin.analytics.views')}</th>
                  <th className="pb-2 pr-4 sm:pr-0 font-medium text-right">
                    {t('admin.analytics.visitors')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {topPages.map((pg, i) => (
                  <tr key={pg.path || i} className="border-b border-border/50 last:border-0">
                    <td className="py-2.5 pl-4 sm:pl-0">
                      <div className="flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span className="text-foreground truncate max-w-[280px]">{pg.path}</span>
                      </div>
                    </td>
                    <td className="py-2.5 text-right text-muted-foreground">
                      {pg.views.toLocaleString()}
                    </td>
                    <td className="py-2.5 pr-4 sm:pr-0 text-right text-muted-foreground">
                      {pg.visitors.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
