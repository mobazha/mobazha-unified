'use client';

import React from 'react';
import { useI18n } from '@mobazha/core';
import { ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BuyerProtectionBadgeProps {
  variant?: 'inline' | 'card';
  className?: string;
}

export function BuyerProtectionBadge({ variant = 'inline', className }: BuyerProtectionBadgeProps) {
  const { t } = useI18n();

  if (variant === 'card') {
    return (
      <div
        className={cn(
          'flex items-start gap-3 rounded-lg border border-success/20 bg-success/5 p-3',
          className
        )}
      >
        <ShieldCheck className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-foreground">{t('trust.badge.title')}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{t('trust.badge.description')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-1.5 text-success', className)}>
      <ShieldCheck className="w-3.5 h-3.5" />
      <span className="text-xs font-medium">{t('trust.badge.title')}</span>
    </div>
  );
}
