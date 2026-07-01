'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { NODE_API } from '@mobazha/core/config/apiPaths';
import { authGet } from '@mobazha/core/services/api/helpers';
import { queryKeys } from '@mobazha/core/hooks/queryKeys';
import { formatQueryError } from '@mobazha/core/hooks/queryUtils';

export interface VisitorTrendPoint {
  date: string;
  visitors: number;
  views: number;
}

export interface PageStat {
  path: string;
  views: number;
  visitors: number;
}

export interface ReferrerStat {
  source: string;
  visits: number;
}

export interface ConversionFunnel {
  pageView: number;
  productView: number;
  addToCart: number;
  checkoutStart: number;
}

export interface VisitorSummary {
  totalPageViews: number;
  totalProductViews: number;
  totalAddToCart: number;
  totalCheckoutStart: number;
  uniqueVisitors: number;
}

interface VisitorStats {
  summary: VisitorSummary;
  trend: VisitorTrendPoint[];
  topPages: PageStat[];
  topReferrers: ReferrerStat[];
  funnel: ConversionFunnel;
}

export type VisitorPeriod = 7 | 30 | 90;

async function fetchVisitorStats(days: number): Promise<VisitorStats> {
  return authGet<VisitorStats>(`${NODE_API.ANALYTICS_STATS}?days=${days}`);
}

export function useVisitorData(days: VisitorPeriod = 30) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.analytics.visitors(days),
    queryFn: () => fetchVisitorStats(days),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const funnelSteps = useMemo(() => {
    if (!data) return [];
    const f = data.funnel;
    const maxVal = Math.max(f.pageView, 1);
    return [
      { key: 'pageView' as const, value: f.pageView, pct: f.pageView > 0 ? 100 : 0 },
      {
        key: 'productView' as const,
        value: f.productView,
        pct: Math.round((f.productView / maxVal) * 100),
      },
      {
        key: 'addToCart' as const,
        value: f.addToCart,
        pct: Math.round((f.addToCart / maxVal) * 100),
      },
      {
        key: 'checkoutStart' as const,
        value: f.checkoutStart,
        pct: Math.round((f.checkoutStart / maxVal) * 100),
      },
    ];
  }, [data]);

  return {
    summary: data?.summary ?? null,
    trend: data?.trend ?? [],
    topPages: data?.topPages ?? [],
    referrers: data?.topReferrers ?? [],
    funnelSteps,
    isLoading,
    error: formatQueryError(error),
    refetch,
  };
}
