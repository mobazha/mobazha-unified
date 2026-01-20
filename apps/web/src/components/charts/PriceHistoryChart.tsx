'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useI18n } from '@mobazha/core';
import type { PriceHistory, PricePoint, TimeRange } from '@mobazha/core/types/rwa';
import {
  getPriceHistory,
  formatRwaPrice,
  formatPriceChange,
} from '@mobazha/core/services/rwa/rwaPriceService';
import { TrendingUp, TrendingDown, Minus, Loader2 } from 'lucide-react';

interface PriceHistoryChartProps {
  contractAddress: string;
  tokenId?: string;
  slotId?: string;
  className?: string;
}

// 时间范围选项
const TIME_RANGES: { value: TimeRange; labelKey: string }[] = [
  { value: '1W', labelKey: 'rwaDashboard.timeRange.1W' },
  { value: '1M', labelKey: 'rwaDashboard.timeRange.1M' },
  { value: 'ALL', labelKey: 'rwaDashboard.timeRange.ALL' },
];

// 获取浏览器语言的 locale 字符串
const getBrowserLocale = (): string => {
  if (typeof navigator !== 'undefined') {
    return navigator.language || 'en-US';
  }
  return 'en-US';
};

// 格式化日期显示
const formatDate = (timestamp: number, timeRange: TimeRange, locale?: string): string => {
  const date = new Date(timestamp);
  const dateLocale = locale || getBrowserLocale();
  if (timeRange === '1W') {
    return date.toLocaleDateString(dateLocale, { month: 'short', day: 'numeric' });
  }
  return date.toLocaleDateString(dateLocale, { year: '2-digit', month: 'short', day: 'numeric' });
};

// 自定义 Tooltip
const CustomTooltip: React.FC<{
  active?: boolean;
  payload?: Array<{ value: number; payload: PricePoint }>;
  label?: string;
  currency: string;
}> = ({ active, payload, currency }) => {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const data = payload[0].payload;
  const date = new Date(data.timestamp);

  return (
    <div className="bg-popover border border-border rounded-lg shadow-lg p-3 min-w-[140px]">
      <p className="text-xs text-muted-foreground mb-1">
        {date.toLocaleDateString(getBrowserLocale(), {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })}
      </p>
      <p className="text-sm font-semibold text-foreground">
        {formatRwaPrice(data.price, currency)}
      </p>
      {data.volume && <p className="text-xs text-muted-foreground mt-1">Volume: {data.volume}</p>}
    </div>
  );
};

export const PriceHistoryChart: React.FC<PriceHistoryChartProps> = ({
  contractAddress,
  tokenId,
  slotId,
  className = '',
}) => {
  const { t } = useI18n();
  const [timeRange, setTimeRange] = useState<TimeRange>('1M');
  const [priceHistory, setPriceHistory] = useState<PriceHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 加载价格数据
  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await getPriceHistory(contractAddress, tokenId, slotId, timeRange);
        if (!cancelled) {
          setPriceHistory(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load price history');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      cancelled = true;
    };
  }, [contractAddress, tokenId, slotId, timeRange]);

  // 格式化图表数据
  const chartData = useMemo(() => {
    if (!priceHistory?.points) return [];
    return priceHistory.points.map(point => ({
      ...point,
      priceNum: parseFloat(point.price),
    }));
  }, [priceHistory]);

  // 计算价格变化趋势
  const priceChange = useMemo(() => {
    if (!priceHistory?.stats?.priceChange) return 0;
    return parseFloat(priceHistory.stats.priceChange);
  }, [priceHistory]);

  // 趋势图标和颜色
  const trendInfo = useMemo(() => {
    if (priceChange > 0) {
      return {
        icon: TrendingUp,
        color: 'text-green-500',
        bgColor: 'bg-green-500/10',
        areaColor: '#22c55e',
      };
    } else if (priceChange < 0) {
      return {
        icon: TrendingDown,
        color: 'text-red-500',
        bgColor: 'bg-red-500/10',
        areaColor: '#ef4444',
      };
    }
    return {
      icon: Minus,
      color: 'text-muted-foreground',
      bgColor: 'bg-muted',
      areaColor: '#6b7280',
    };
  }, [priceChange]);

  const TrendIcon = trendInfo.icon;

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center h-64 text-muted-foreground ${className}`}>
        {error}
      </div>
    );
  }

  if (!priceHistory || chartData.length === 0) {
    return (
      <div className={`flex items-center justify-center h-64 text-muted-foreground ${className}`}>
        {t('rwaDashboard.noData')}
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 头部：标题和时间范围选择器 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-medium text-foreground">{t('rwaDashboard.priceHistory')}</h3>
          {priceHistory.stats && (
            <div
              className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${trendInfo.bgColor}`}
            >
              <TrendIcon className={`w-3 h-3 ${trendInfo.color}`} />
              <span className={`text-xs font-medium ${trendInfo.color}`}>
                {formatPriceChange(priceHistory.stats.priceChange)}
              </span>
            </div>
          )}
        </div>

        {/* 时间范围选择器 */}
        <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
          {TIME_RANGES.map(({ value, labelKey }) => (
            <button
              key={value}
              onClick={() => setTimeRange(value)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                timeRange === value
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t(labelKey)}
            </button>
          ))}
        </div>
      </div>

      {/* 价格统计 */}
      {priceHistory.stats && (
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">{t('rwaDashboard.lastPrice')}</p>
            <p className="text-sm font-semibold text-foreground">
              {formatRwaPrice(priceHistory.stats.lastPrice, priceHistory.currency)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t('rwaDashboard.highPrice')}</p>
            <p className="text-sm font-semibold text-green-500">
              {formatRwaPrice(priceHistory.stats.highPrice, priceHistory.currency)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t('rwaDashboard.lowPrice')}</p>
            <p className="text-sm font-semibold text-red-500">
              {formatRwaPrice(priceHistory.stats.lowPrice, priceHistory.currency)}
            </p>
          </div>
        </div>
      )}

      {/* 图表 */}
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={trendInfo.areaColor} stopOpacity={0.3} />
                <stop offset="100%" stopColor={trendInfo.areaColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
            <XAxis
              dataKey="timestamp"
              tickFormatter={value => formatDate(value, timeRange)}
              tick={{ fontSize: 10 }}
              className="text-muted-foreground"
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={['auto', 'auto']}
              tick={{ fontSize: 10 }}
              className="text-muted-foreground"
              axisLine={false}
              tickLine={false}
              width={50}
              tickFormatter={value => `$${value}`}
            />
            <Tooltip content={<CustomTooltip currency={priceHistory.currency} />} />
            <Area
              type="monotone"
              dataKey="priceNum"
              stroke={trendInfo.areaColor}
              strokeWidth={2}
              fill="url(#priceGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default PriceHistoryChart;
