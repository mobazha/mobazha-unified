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
 * 使用主题感知颜色（primary），适配所有主题和 dark mode
 */
export function RightsListCard({ rights, className = '', compact = false }: RightsListCardProps) {
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
            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary/8 text-primary text-xs font-medium rounded-full border border-primary/20"
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
        {t('listing.rwa.holderRights')}
      </h5>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {rights.map((right, index) => (
          <div key={index} className="flex items-center gap-2 text-sm text-foreground/70">
            <CheckCircle className="w-4 h-4 text-success flex-shrink-0" />
            <span>{right}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default RightsListCard;
