'use client';

import React from 'react';
import { Gift, CheckCircle } from 'lucide-react';
import { useI18n } from '@mobazha/core';
import { cn } from '@/lib/utils';

export interface RightsListCardProps {
  rights: string[];
  className?: string;
  compact?: boolean;
}

/**
 * 权益列表卡片
 * 展示持有者可获得的权益清单
 */
export function RightsListCard({
  rights,
  className = '',
  compact = false,
}: RightsListCardProps) {
  const { t } = useI18n();

  if (!rights || rights.length === 0) {
    return null;
  }

  if (compact) {
    return (
      <div className={cn('flex flex-wrap gap-2', className)}>
        {rights.map((right, index) => (
          <span
            key={index}
            className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 text-xs rounded-full border border-green-200 dark:border-green-800"
          >
            <CheckCircle className="w-3 h-3" />
            {right}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className={cn('p-4 bg-muted/50 rounded-lg', className)}>
      <h5 className="font-medium text-foreground mb-3 flex items-center gap-2">
        <Gift className="w-4 h-4 text-primary" />
        {t('listing.rwa.holderRights') || '持有者权益'}
      </h5>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {rights.map((right, index) => (
          <div key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
            <span>{right}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default RightsListCard;
