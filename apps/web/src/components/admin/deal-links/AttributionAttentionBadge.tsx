'use client';

import React from 'react';
import { useI18n } from '@mobazha/core';
import { cn } from '@/lib/utils';

export function AttributionAttentionBadge({
  count,
  testId,
  className,
}: {
  count: number;
  testId?: string;
  className?: string;
}) {
  const { t } = useI18n();

  if (count <= 0) {
    return null;
  }

  return (
    <span
      className={cn(
        'inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-amber-500 px-1.5 text-[11px] font-bold leading-none text-white',
        className
      )}
      data-testid={testId}
      aria-label={t('admin.dealLinks.attentionBadge', { count })}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}
