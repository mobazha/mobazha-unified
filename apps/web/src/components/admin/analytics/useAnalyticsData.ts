'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSales, useCurrency, productDataService } from '@mobazha/core';
import type { ProductListItem } from '@mobazha/core';
import { getOrderCurrencyCode } from '../dashboard/utils';

export type Period = '7d' | '30d' | '90d' | 'all';

const REVENUE_STATES = new Set(['COMPLETED', 'FULFILLED', 'PAYMENT_FINALIZED']);

function daysAgo(days: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - days);
  return d;
}

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export interface TrendPoint {
  date: string;
  revenue: number;
  orders: number;
}

export interface ProductStat {
  slug: string;
  title: string;
  thumbnail?: string;
  revenue: number;
  orders: number;
  quantity: number;
}

export interface StatusCount {
  state: string;
  count: number;
}

export function useAnalyticsData() {
  const { formatPrice, fromMinimalUnit, localCurrency, convertToLocal } = useCurrency();

  const [period, setPeriod] = useState<Period>('30d');
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);

  const {
    orders: salesOrders,
    isLoading: ordersLoading,
    error: ordersError,
    hasMore,
    loadMore,
    isLoadingMore,
  } = useSales({ limit: 100 });

  useEffect(() => {
    if (hasMore && !isLoadingMore) {
      loadMore();
    }
  }, [hasMore, isLoadingMore, loadMore, salesOrders.length]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await productDataService.getMyListings();
        if (!cancelled) setProducts(data);
      } catch {
        // non-critical
      } finally {
        if (!cancelled) setProductsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const cutoff = useMemo(() => {
    if (period === 'all') return null;
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    return daysAgo(days);
  }, [period]);

  const filteredOrders = useMemo(() => {
    if (!cutoff) return salesOrders;
    return salesOrders.filter(o => new Date(o.timestamp) >= cutoff);
  }, [salesOrders, cutoff]);

  const revenueOrders = useMemo(
    () => filteredOrders.filter(o => REVENUE_STATES.has(o.state)),
    [filteredOrders]
  );

  const totalRevenue = useMemo(() => {
    let sum = 0;
    for (const order of revenueOrders) {
      if (!order.total?.amount) continue;
      const cc = getOrderCurrencyCode(order);
      try {
        sum += convertToLocal(fromMinimalUnit(order.total.amount, cc), cc);
      } catch {
        /* skip */
      }
    }
    return sum;
  }, [revenueOrders, convertToLocal, fromMinimalUnit]);

  const totalOrders = filteredOrders.length;

  const avgOrderValue = useMemo(() => {
    if (revenueOrders.length === 0) return 0;
    return totalRevenue / revenueOrders.length;
  }, [totalRevenue, revenueOrders.length]);

  const trend = useMemo((): TrendPoint[] => {
    const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 60;
    const start = daysAgo(days);
    const map = new Map<string, { revenue: number; orders: number }>();

    for (let i = 0; i <= days; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      map.set(toDateKey(d), { revenue: 0, orders: 0 });
    }

    for (const order of period === 'all' ? salesOrders : filteredOrders) {
      const key = toDateKey(new Date(order.timestamp));
      const bucket = map.get(key);
      if (!bucket) continue;
      bucket.orders++;
      if (REVENUE_STATES.has(order.state) && order.total?.amount) {
        const cc = getOrderCurrencyCode(order);
        try {
          bucket.revenue += convertToLocal(fromMinimalUnit(order.total.amount, cc), cc);
        } catch {
          /* skip */
        }
      }
    }

    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({
        date,
        revenue: Math.round(data.revenue * 100) / 100,
        orders: data.orders,
      }));
  }, [period, salesOrders, filteredOrders, convertToLocal, fromMinimalUnit]);

  const topProducts = useMemo((): ProductStat[] => {
    const map = new Map<string, ProductStat>();

    for (const order of revenueOrders) {
      const key = order.slug || order.title;
      const existing = map.get(key);
      let rev = 0;
      if (order.total?.amount) {
        const cc = getOrderCurrencyCode(order);
        try {
          rev = convertToLocal(fromMinimalUnit(order.total.amount, cc), cc);
        } catch {
          /* skip */
        }
      }

      if (existing) {
        existing.revenue += rev;
        existing.orders++;
        existing.quantity += order.quantity || 1;
      } else {
        const thumb = order.thumbnail;
        map.set(key, {
          slug: order.slug,
          title: order.title || key,
          thumbnail:
            (thumb as unknown as Record<string, string>)?.small ||
            (thumb as unknown as Record<string, string>)?.medium ||
            undefined,
          revenue: rev,
          orders: 1,
          quantity: order.quantity || 1,
        });
      }
    }

    return Array.from(map.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }, [revenueOrders, convertToLocal, fromMinimalUnit]);

  const statusBreakdown = useMemo((): StatusCount[] => {
    const map = new Map<string, number>();
    for (const order of filteredOrders) {
      map.set(order.state, (map.get(order.state) || 0) + 1);
    }
    return Array.from(map.entries())
      .map(([state, count]) => ({ state, count }))
      .sort((a, b) => b.count - a.count);
  }, [filteredOrders]);

  const isLoading = ordersLoading || (hasMore && isLoadingMore);

  const formatRevenue = useCallback(
    (val: number) => formatPrice(val, localCurrency),
    [formatPrice, localCurrency]
  );

  return {
    period,
    setPeriod,
    isLoading,
    productsLoading,
    ordersError,
    totalRevenue,
    totalOrders,
    avgOrderValue,
    revenueOrderCount: revenueOrders.length,
    trend,
    topProducts,
    statusBreakdown,
    formatRevenue,
    localCurrency,
    products,
  };
}
