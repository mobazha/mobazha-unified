'use client';

import React from 'react';
import { TrendingUp, Coins, Calendar } from 'lucide-react';
import type { PerformanceInfo } from '@mobazha/core';
import { useI18n } from '@mobazha/core';
import { cn } from '@/lib/utils';

export interface RevenueInfoCardProps {
  performance: PerformanceInfo;
  className?: string;
  compact?: boolean;
}

/**
 * 收益信息卡片 (ERC3525)
 * 展示总份额、年化收益、结算周期等信息
 */
export function RevenueInfoCard({
  performance,
  className = '',
  compact = false,
}: RevenueInfoCardProps) {
  const { t } = useI18n();

  if (compact) {
    return (
      <div className={cn('p-3 bg-primary/8 rounded-lg border border-primary/20', className)}>
        <div className="flex items-center justify-between gap-4 text-sm">
          <div className="flex items-center gap-2 text-primary">
            <TrendingUp className="w-4 h-4" />
            <span className="font-medium">{performance.dividendRate} 年化</span>
          </div>
          <div className="flex items-center gap-3 text-muted-foreground">
            <span>总 {performance.totalShares.toLocaleString()} 份</span>
            <span>{performance.settlementPeriod}结算</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('p-4 bg-primary/8 rounded-lg border border-primary/20', className)}>
      <h5 className="font-medium text-primary mb-3 flex items-center gap-2">
        <TrendingUp className="w-4 h-4" />
        {t('listing.rwa.revenueInfo') || '收益信息'}
      </h5>
      <div className="grid grid-cols-3 gap-3">
        <div className="text-center p-2 bg-card rounded-lg">
          <div className="text-xs text-muted-foreground mb-1 flex items-center justify-center gap-1">
            <Coins className="w-3 h-3" />
            {t('listing.rwa.totalShares') || '总份额'}
          </div>
          <div className="font-semibold text-primary">
            {performance.totalShares.toLocaleString()}
          </div>
        </div>
        <div className="text-center p-2 bg-card rounded-lg">
          <div className="text-xs text-muted-foreground mb-1 flex items-center justify-center gap-1">
            <TrendingUp className="w-3 h-3" />
            {t('listing.rwa.annualRate') || '年化收益'}
          </div>
          <div className="font-semibold text-primary">{performance.dividendRate}</div>
        </div>
        <div className="text-center p-2 bg-card rounded-lg">
          <div className="text-xs text-muted-foreground mb-1 flex items-center justify-center gap-1">
            <Calendar className="w-3 h-3" />
            {t('listing.rwa.settlementPeriod') || '结算周期'}
          </div>
          <div className="font-semibold text-primary">{performance.settlementPeriod}</div>
        </div>
      </div>
    </div>
  );
}

export default RevenueInfoCard;
