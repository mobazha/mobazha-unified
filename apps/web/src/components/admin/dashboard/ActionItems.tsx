import React from 'react';
import Link from 'next/link';
import { useI18n } from '@mobazha/core';
import type { OrderListItem } from '@mobazha/core';
import { ClipboardCheck, Truck, AlertTriangle, ChevronRight } from 'lucide-react';

interface ActionItemsProps {
  orders: OrderListItem[];
  loading: boolean;
}

interface ActionBucket {
  key: string;
  icon: React.ElementType;
  labelKey: string;
  count: number;
  href: string;
  color: string;
  bgColor: string;
}

function countByStates(orders: OrderListItem[], states: string[]): number {
  const set = new Set(states);
  return orders.filter(o => set.has(o.state)).length;
}

export function ActionItems({ orders, loading }: ActionItemsProps) {
  const { t } = useI18n();

  if (loading) return null;

  const buckets: ActionBucket[] = [
    {
      key: 'pending',
      icon: ClipboardCheck,
      labelKey: 'admin.dashboard.actionPendingReview',
      count: countByStates(orders, ['PENDING']),
      href: '/admin/orders?status=pending',
      color: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-500/10',
    },
    {
      key: 'fulfill',
      icon: Truck,
      labelKey: 'admin.dashboard.actionToFulfill',
      count: countByStates(orders, ['AWAITING_SHIPMENT']),
      href: '/admin/orders?status=processing',
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-500/10',
    },
    {
      key: 'disputed',
      icon: AlertTriangle,
      labelKey: 'admin.dashboard.actionDisputed',
      count: countByStates(orders, ['DISPUTED']),
      href: '/admin/orders?status=disputed',
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-500/10',
    },
  ];

  const activeBuckets = buckets.filter(b => b.count > 0);
  if (activeBuckets.length === 0) return null;

  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 mb-5 sm:mb-6"
      data-testid="dashboard-action-items"
    >
      {activeBuckets.map(bucket => {
        const Icon = bucket.icon;
        return (
          <Link
            key={bucket.key}
            href={bucket.href}
            className={`flex items-center gap-3 rounded-xl border border-border p-3 sm:p-4 hover:border-primary/30 hover:shadow-sm transition-all ${bucket.bgColor}`}
          >
            <div className={`p-2 rounded-lg ${bucket.bgColor} ${bucket.color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-xl sm:text-2xl font-bold text-foreground">{bucket.count}</span>
              <p className={`text-xs sm:text-sm font-medium ${bucket.color} truncate`}>
                {t(bucket.labelKey)}
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
          </Link>
        );
      })}
    </div>
  );
}
