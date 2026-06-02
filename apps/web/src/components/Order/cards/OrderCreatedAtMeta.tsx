'use client';

import React, { memo } from 'react';
import { useI18n } from '@mobazha/core';
import { formatOrderDate } from '@/components/Order/utils';
import { cn } from '@/lib/utils';

export interface OrderCreatedAtMetaProps {
  createdAt?: string;
  className?: string;
}

/** Persistent order placement time — visible on detail pages in all states. */
export const OrderCreatedAtMeta = memo(function OrderCreatedAtMeta({
  createdAt,
  className,
}: OrderCreatedAtMetaProps) {
  const { t, locale } = useI18n();
  if (!createdAt) return null;

  return (
    <p
      className={cn('text-xs text-muted-foreground', className)}
      data-testid="order-created-at-meta"
    >
      {t('order.statusCard.orderedAt')}:{' '}
      {formatOrderDate(createdAt, { locale, includeSeconds: true })}
    </p>
  );
});
