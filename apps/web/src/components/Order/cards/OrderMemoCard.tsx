'use client';

import React, { memo } from 'react';
import Link from 'next/link';
import { AvatarCompat as Avatar } from '@/components/ui/avatar-compat';
import { useI18n, type DisplayOrder } from '@mobazha/core';

export interface OrderMemoCardProps {
  displayOrder: DisplayOrder;
  className?: string;
}

export const OrderMemoCard = memo(function OrderMemoCard({
  displayOrder: order,
  className,
}: OrderMemoCardProps) {
  const { t } = useI18n();

  const hasMemo = !!order.notes;
  const hasContact = !!order.alternateContactInfo;
  const hasModerator = !!order.moderator;

  if (!hasMemo && !hasContact && !hasModerator) return null;

  return (
    <div className={`space-y-2 ${className ?? ''}`}>
      {hasMemo && (
        <div className="p-2.5 bg-muted/20 rounded-lg">
          <span className="text-xs text-muted-foreground block mb-0.5">{t('order.memo')}</span>
          <p className="text-sm text-foreground">{order.notes}</p>
        </div>
      )}
      {hasContact && (
        <div className="p-2.5 bg-muted/20 rounded-lg">
          <span className="text-xs text-muted-foreground block mb-0.5">
            {t('order.additionalContact')}
          </span>
          <p className="text-sm text-foreground">{order.alternateContactInfo}</p>
        </div>
      )}
      {hasModerator && (
        <div className="p-2.5 bg-muted/20 rounded-lg border border-border/30">
          <span className="text-xs text-muted-foreground block mb-1">{t('order.moderator')}</span>
          <Link href={`/moderators/${order.moderator!.id}`} className="flex items-center gap-2">
            <Avatar
              src={order.moderator!.avatar}
              name={order.moderator!.name}
              size="sm"
              className="w-8 h-8 ring-1 ring-border/50"
            />
            <span className="text-sm font-medium text-primary hover:underline">
              {order.moderator!.name}
            </span>
          </Link>
        </div>
      )}
    </div>
  );
});
