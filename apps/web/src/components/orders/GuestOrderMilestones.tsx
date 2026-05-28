'use client';

import { useI18n } from '@mobazha/core';
import type { GuestOrderStatus } from '@mobazha/core/services/api/guestCheckout';
import { formatGuestMilestoneDisplay, guestOrderMilestonesFromStatus } from './guestOrderStages';

interface GuestOrderMilestonesProps {
  order: GuestOrderStatus;
  className?: string;
}

export function GuestOrderMilestones({ order, className }: GuestOrderMilestonesProps) {
  const { t } = useI18n();
  const milestones = guestOrderMilestonesFromStatus(order);

  if (milestones.length === 0) {
    return null;
  }

  return (
    <div
      className={className ?? 'rounded-lg border border-border bg-card p-4 space-y-2'}
      data-testid="guest-order-milestones"
    >
      <p className="text-sm font-medium">{t('guestOrder.milestonesTitle')}</p>
      <ul className="space-y-1.5 text-xs text-muted-foreground">
        {milestones.map(milestone => (
          <li key={milestone.id} className="flex items-center justify-between gap-2">
            <span>{t(milestone.labelKey)}</span>
            <span className="text-foreground">
              {formatGuestMilestoneDisplay(milestone.at, t('guestOrder.milestones.timePending'))}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
