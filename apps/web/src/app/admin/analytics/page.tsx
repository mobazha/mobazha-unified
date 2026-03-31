'use client';

import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { TrendingUp, ShoppingCart, DollarSign, Package } from 'lucide-react';
import { useI18n, getImageUrl } from '@mobazha/core';
import { StatCard } from '@/components/admin/dashboard';
import { Skeleton } from '@/components/ui';
import { cn } from '@/lib/utils';
import {
  useAnalyticsData,
  VisitorAnalytics,
  type Period,
  type TrendPoint,
  type ProductStat,
  type StatusCount,
} from '@/components/admin/analytics';

const PERIOD_OPTIONS: { value: Period; labelKey: string }[] = [
  { value: '7d', labelKey: 'admin.analytics.period7d' },
  { value: '30d', labelKey: 'admin.analytics.period30d' },
  { value: '90d', labelKey: 'admin.analytics.period90d' },
  { value: 'all', labelKey: 'admin.analytics.periodAll' },
];

const STATUS_COLORS: Record<string, string> = {
  COMPLETED: 'hsl(var(--chart-1))',
  FULFILLED: 'hsl(var(--chart-2))',
  PAYMENT_FINALIZED: 'hsl(var(--chart-3))',
  AWAITING_PAYMENT: 'hsl(var(--chart-4))',
  AWAITING_PAYMENT_VERIFICATION: 'hsl(var(--chart-4))',
  AWAITING_FULFILLMENT: 'hsl(var(--chart-5))',
  PENDING: 'hsl(var(--muted-foreground))',
  CANCELED: 'hsl(var(--destructive))',
  DECLINED: 'hsl(var(--destructive))',
  REFUNDED: 'hsl(var(--warning))',
  DISPUTED: 'hsl(var(--warning))',
};

function formatDateTick(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function PeriodSelector({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  const { t } = useI18n();
  return (
    <div className="flex gap-1 bg-muted rounded-lg p-0.5">
      {PERIOD_OPTIONS.map(opt => (
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
          {t(opt.labelKey)}
        </button>
      ))}
    </div>
  );
}

function SalesTrendChart({
  data,
  formatRevenue,
  loading,
}: {
  data: TrendPoint[];
  formatRevenue: (v: number) => string;
  loading: boolean;
}) {
  const { t } = useI18n();

  if (loading) {
    return <Skeleton className="h-[300px] w-full rounded-xl" />;
  }

  if (!data.length) {
    return (
      <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
        {t('admin.analytics.noData')}
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
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
          width={50}
          tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v))}
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
          formatter={(value: number | undefined, name: string | undefined) => {
            const v = value ?? 0;
            if (name === 'revenue') return [formatRevenue(v), t('admin.analytics.revenue')];
            return [v, t('admin.analytics.orders')];
          }}
        />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke="hsl(var(--primary))"
          fillOpacity={1}
          fill="url(#revenueGrad)"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function OrdersTrendChart({ data, loading }: { data: TrendPoint[]; loading: boolean }) {
  const { t } = useI18n();

  if (loading) {
    return <Skeleton className="h-[200px] w-full rounded-xl" />;
  }

  if (!data.length) {
    return (
      <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
        {t('admin.analytics.noData')}
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
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
          width={30}
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
            });
          }}
          formatter={(value: number | undefined) => [value ?? 0, t('admin.analytics.orders')]}
        />
        <Bar dataKey="orders" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} maxBarSize={24} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function StatusBreakdownChart({ data, loading }: { data: StatusCount[]; loading: boolean }) {
  const { t } = useI18n();

  if (loading) {
    return <Skeleton className="h-[200px] w-full rounded-xl" />;
  }

  if (!data.length) {
    return (
      <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
        {t('admin.analytics.noData')}
      </div>
    );
  }

  const total = data.reduce((s, d) => s + d.count, 0);

  return (
    <div className="space-y-3">
      {data.map(item => {
        const pct = total > 0 ? (item.count / total) * 100 : 0;
        const color = STATUS_COLORS[item.state] || 'hsl(var(--muted-foreground))';
        return (
          <div key={item.state}>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-foreground font-medium capitalize">
                {item.state.replace(/_/g, ' ').toLowerCase()}
              </span>
              <span className="text-muted-foreground">
                {item.count} ({pct.toFixed(0)}%)
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${pct}%`, backgroundColor: color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TopProductsTable({
  data,
  formatRevenue,
  loading,
}: {
  data: ProductStat[];
  formatRevenue: (v: number) => string;
  loading: boolean;
}) {
  const { t } = useI18n();

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="py-8 text-center text-muted-foreground text-sm">
        {t('admin.analytics.noData')}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto -mx-4 sm:mx-0">
      <table className="w-full text-sm min-w-[500px]">
        <thead>
          <tr className="text-left text-muted-foreground border-b border-border">
            <th className="pb-2 pl-4 sm:pl-0 font-medium">{t('admin.analytics.product')}</th>
            <th className="pb-2 font-medium text-right">{t('admin.analytics.orders')}</th>
            <th className="pb-2 font-medium text-right">{t('admin.analytics.unitsSold')}</th>
            <th className="pb-2 pr-4 sm:pr-0 font-medium text-right">
              {t('admin.analytics.revenue')}
            </th>
          </tr>
        </thead>
        <tbody>
          {data.map((item, i) => {
            const imgUrl = item.thumbnail ? getImageUrl(item.thumbnail) : null;
            return (
              <tr key={item.slug || i} className="border-b border-border/50 last:border-0">
                <td className="py-2.5 pl-4 sm:pl-0">
                  <div className="flex items-center gap-2.5">
                    {imgUrl ? (
                      <img
                        src={imgUrl}
                        alt=""
                        className="w-8 h-8 rounded object-cover bg-muted shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded bg-muted shrink-0 flex items-center justify-center">
                        <Package className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                    )}
                    <span className="text-foreground font-medium truncate max-w-[200px]">
                      {item.title}
                    </span>
                  </div>
                </td>
                <td className="py-2.5 text-right text-muted-foreground">{item.orders}</td>
                <td className="py-2.5 text-right text-muted-foreground">{item.quantity}</td>
                <td className="py-2.5 pr-4 sm:pr-0 text-right font-medium text-foreground">
                  {formatRevenue(item.revenue)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const { t } = useI18n();
  const data = useAnalyticsData();

  return (
    <div data-testid="admin-analytics">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">
            {t('admin.analytics.title')}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{t('admin.analytics.subtitle')}</p>
        </div>
        <PeriodSelector value={data.period} onChange={data.setPeriod} />
      </div>

      {/* Summary stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <StatCard
          icon={DollarSign}
          label={t('admin.analytics.totalRevenue')}
          value={data.isLoading ? '—' : data.formatRevenue(data.totalRevenue)}
          sublabel={t('admin.analytics.revenueOrders', { count: data.revenueOrderCount })}
          color="success"
          loading={data.isLoading}
        />
        <StatCard
          icon={ShoppingCart}
          label={t('admin.analytics.totalOrders')}
          value={data.isLoading ? '—' : String(data.totalOrders)}
          sublabel={t('admin.analytics.periodLabel')}
          color="info"
          loading={data.isLoading}
        />
        <StatCard
          icon={TrendingUp}
          label={t('admin.analytics.avgOrderValue')}
          value={data.isLoading ? '—' : data.formatRevenue(data.avgOrderValue)}
          color="warning"
          loading={data.isLoading}
        />
        <StatCard
          icon={Package}
          label={t('admin.analytics.activeProducts')}
          value={data.productsLoading ? '—' : String(data.products.length)}
          sublabel={t('admin.analytics.published')}
          color="primary"
          loading={data.productsLoading}
        />
      </div>

      {/* Revenue trend */}
      <div className="bg-card border border-border rounded-xl p-4 sm:p-6 mb-6">
        <h2 className="text-sm sm:text-base font-semibold text-foreground mb-4">
          {t('admin.analytics.revenueTrend')}
        </h2>
        <SalesTrendChart
          data={data.trend}
          formatRevenue={data.formatRevenue}
          loading={data.isLoading}
        />
      </div>

      {/* Two-column: Orders trend + Status breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-card border border-border rounded-xl p-4 sm:p-6">
          <h2 className="text-sm sm:text-base font-semibold text-foreground mb-4">
            {t('admin.analytics.ordersTrend')}
          </h2>
          <OrdersTrendChart data={data.trend} loading={data.isLoading} />
        </div>

        <div className="bg-card border border-border rounded-xl p-4 sm:p-6">
          <h2 className="text-sm sm:text-base font-semibold text-foreground mb-4">
            {t('admin.analytics.orderStatus')}
          </h2>
          <StatusBreakdownChart data={data.statusBreakdown} loading={data.isLoading} />
        </div>
      </div>

      {/* Top products */}
      <div className="bg-card border border-border rounded-xl p-4 sm:p-6">
        <h2 className="text-sm sm:text-base font-semibold text-foreground mb-4">
          {t('admin.analytics.topProducts')}
        </h2>
        <TopProductsTable
          data={data.topProducts}
          formatRevenue={data.formatRevenue}
          loading={data.isLoading}
        />
      </div>

      {/* Divider */}
      <div className="border-t border-border my-8" />

      {/* Visitor Analytics Section */}
      <VisitorAnalytics />
    </div>
  );
}
