'use client';

import React, { memo, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  getOrderActions,
  getPrimaryAction,
  getSecondaryActions,
  getActionButtonConfig,
  type OrderAction,
  type UserRole,
  type OrderState,
} from '@mobazha/core';

export interface OrderActionSheetProps {
  orderState: OrderState;
  userRole: UserRole;
  timestamp: string;
  isModerated?: boolean;
  isFulfilled?: boolean;
  paymentMethod?: string;
  hasRated?: boolean;
  inAfterSaleWindow?: boolean;
  onAction: (action: OrderAction) => void;
  className?: string;
}

/**
 * Mobile-optimized bottom action bar for order operations.
 * Renders the primary action as a full-width prominent button,
 * with secondary actions as smaller outline buttons below.
 */
export const OrderActionSheet = memo(function OrderActionSheet({
  orderState,
  userRole,
  timestamp: _timestamp,
  isModerated,
  isFulfilled,
  paymentMethod,
  hasRated,
  inAfterSaleWindow = false,
  onAction,
  className,
}: OrderActionSheetProps) {
  const actions = useMemo(
    () =>
      getOrderActions(orderState, userRole, {
        isModerated,
        isFulfilled,
        paymentMethod,
        hasRated,
        inAfterSaleWindow,
      }),
    [orderState, userRole, isModerated, isFulfilled, paymentMethod, hasRated, inAfterSaleWindow]
  );

  const primaryAction = useMemo(() => getPrimaryAction(actions), [actions]);
  const secondaryActions = useMemo(
    () => getSecondaryActions(actions).filter(a => a !== 'Dispute'),
    [actions]
  );
  const primaryConfig = useMemo(
    () => (primaryAction ? getActionButtonConfig(primaryAction, userRole) : null),
    [primaryAction, userRole]
  );

  if (actions.length === 0) return null;

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] ${className ?? ''}`}
    >
      {primaryAction && primaryConfig && (
        <Button
          onClick={() => onAction(primaryAction)}
          variant={primaryConfig.variant as 'default' | 'destructive' | 'outline'}
          className="w-full h-12 text-[15px] font-semibold mb-2"
        >
          {primaryConfig.label}
        </Button>
      )}

      {secondaryActions.length > 0 && (
        <div className="flex gap-2">
          {secondaryActions.map(action => {
            const config = getActionButtonConfig(action, userRole);
            return (
              <Button
                key={action}
                onClick={() => onAction(action)}
                variant="outline"
                size="sm"
                className="flex-1 h-10 text-sm"
              >
                {config.label}
              </Button>
            );
          })}
        </div>
      )}
    </div>
  );
});
