'use client';

import React from 'react';
import { useI18n } from '@mobazha/core';
import { Gem } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UniquePieceBadgeProps {
  compact?: boolean;
  className?: string;
}

export function UniquePieceBadge({ compact = false, className }: UniquePieceBadgeProps) {
  const { t } = useI18n();

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200',
        compact ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs sm:text-sm',
        className
      )}
      data-testid="product-unique-piece-badge"
    >
      <Gem className={cn('shrink-0', compact ? 'w-3 h-3' : 'w-3.5 h-3.5')} aria-hidden />
      <span className="font-semibold">{t('product.uniquePiece.badge')}</span>
      {!compact && (
        <span className="text-amber-700/80 dark:text-amber-100/80 font-normal hidden sm:inline">
          · {t('product.uniquePiece.hint')}
        </span>
      )}
    </div>
  );
}
