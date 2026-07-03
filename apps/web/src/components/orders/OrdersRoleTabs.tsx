'use client';

import React from 'react';
import { useI18n } from '@mobazha/core';
import { cn } from '@/lib/utils';
import type { OrderListRole, OrdersShell } from '@/lib/ordersNavigation';

interface OrdersRoleTabsProps {
  activeRole: OrderListRole;
  onRoleChange: (role: OrderListRole) => void;
  shell?: OrdersShell;
  className?: string;
}

export function OrdersRoleTabs({
  activeRole,
  onRoleChange,
  shell = 'consumer',
  className,
}: OrdersRoleTabsProps) {
  const { t } = useI18n();

  return (
    <div
      className={cn('inline-flex rounded-lg bg-muted p-1', className)}
      role="tablist"
      aria-label={t('nav.orders')}
    >
      {(['purchases', 'sales'] as const).map(role => (
        <button
          key={role}
          type="button"
          role="tab"
          aria-selected={activeRole === role}
          data-testid={`orders-role-tab-${role}`}
          onClick={() => onRoleChange(role)}
          className={cn(
            'px-4 sm:px-6 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-colors touch-feedback',
            activeRole === role
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {role === 'purchases'
            ? t('order.myPurchases')
            : shell === 'admin'
              ? t('admin.nav.storeSales')
              : t('order.mySales')}
        </button>
      ))}
    </div>
  );
}
