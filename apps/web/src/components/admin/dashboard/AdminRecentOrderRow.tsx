'use client';

import React from 'react';
import Link from 'next/link';
import { Package, ShoppingCart } from 'lucide-react';
import { useI18n, useCurrency, orderListItemThumbnailDisplayUrl } from '@mobazha/core';
import type { OrderListItem } from '@mobazha/core';
import {
  guestOrderListThumbnailUrl,
  type GuestOrderSummary,
} from '@mobazha/core/services/api/guestCheckout';
import { formatGuestPaymentAmount } from '@/components/admin/orders/utils';
import { formatGuestStateLabel, guestStateBadgeClass } from '@/components/orders/guestOrderDisplay';
import { getOrderCurrencyCode } from './utils';

export type RecentAdminOrder =
  | { source: 'standard'; order: OrderListItem }
  | { source: 'guest'; order: GuestOrderSummary };

const STATE_COLORS: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  AWAITING_PAYMENT: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  AWAITING_PAYMENT_VERIFICATION:
    'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  PAYMENT_DETECTED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  FUNDED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  AWAITING_SHIPMENT: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  PARTIALLY_SHIPPED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  SHIPPED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  COMPLETED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  PAYMENT_FINALIZED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  DISPUTED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  DECIDED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  RESOLVED: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
  REFUNDED: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
  CANCELED: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
  DECLINED: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
  EXPIRED: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
  PROCESSING_ERROR: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

const STATE_TO_I18N_KEY: Record<string, string> = {
  PENDING: 'pending',
  AWAITING_PAYMENT: 'awaitingPayment',
  AWAITING_PAYMENT_VERIFICATION: 'awaitingPaymentVerification',
  PAYMENT_DETECTED: 'processing',
  FUNDED: 'processing',
  AWAITING_PICKUP: 'awaitingPickup',
  AWAITING_SHIPMENT: 'processing',
  PARTIALLY_SHIPPED: 'partialShipped',
  SHIPPED: 'shipped',
  COMPLETED: 'completed',
  CANCELED: 'cancelled',
  DECLINED: 'declined',
  REFUNDED: 'refunded',
  DISPUTED: 'disputed',
  DECIDED: 'decided',
  RESOLVED: 'completed',
  PAYMENT_FINALIZED: 'finalized',
  EXPIRED: 'cancelled',
  PROCESSING_ERROR: 'error',
  DISPUTE_EXPIRED: 'unknown',
};

export function AdminRecentOrderRow({ entry }: { entry: RecentAdminOrder }) {
  const { t } = useI18n();
  const { formatPrice, fromMinimalUnit } = useCurrency();

  if (entry.source === 'guest') {
    const order = entry.order;
    const dateStr = order.createdAt ? new Date(order.createdAt).toLocaleDateString() : '';
    const title = order.items[0]?.listingTitle || t('admin.orders.guestOrderTitle');
    const amount = formatGuestPaymentAmount(order);
    const thumbSrc = guestOrderListThumbnailUrl(order);

    return (
      <Link
        href="/admin/orders"
        className="flex items-center gap-3 py-3 border-b border-border last:border-0 hover:bg-muted/50 -mx-2 px-2 rounded-md transition-colors"
      >
        <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-600 overflow-hidden shrink-0 flex items-center justify-center">
          {thumbSrc ? (
            <img src={thumbSrc} alt="" className="w-full h-full object-cover" />
          ) : (
            <ShoppingCart className="w-4 h-4" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{title}</p>
          <p className="text-xs text-muted-foreground">
            {dateStr}
            <span className="ml-2 font-medium">{amount}</span>
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 font-medium">
            {t('admin.orders.sourceGuest')}
          </span>
          <span
            className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${guestStateBadgeClass(order.state, t)}`}
          >
            {formatGuestStateLabel(order.state, t)}
          </span>
        </div>
      </Link>
    );
  }

  const order = entry.order;
  const stateColor = STATE_COLORS[order.state] || STATE_COLORS.PENDING;
  const stateLabel = t(`order.statusLabels.${STATE_TO_I18N_KEY[order.state] || 'unknown'}`);
  const dateStr = order.timestamp ? new Date(order.timestamp).toLocaleDateString() : '';
  const currencyCode = getOrderCurrencyCode(order);
  const formattedTotal = order.total?.amount
    ? formatPrice(fromMinimalUnit(order.total.amount, currencyCode), currencyCode)
    : '';
  const thumbSrc = orderListItemThumbnailDisplayUrl(order);

  return (
    <Link
      href={`/orders/${order.orderID}`}
      className="flex items-center gap-3 py-3 border-b border-border last:border-0 hover:bg-muted/50 -mx-2 px-2 rounded-md transition-colors"
    >
      <div className="w-10 h-10 rounded-lg bg-muted overflow-hidden shrink-0">
        {thumbSrc ? (
          <img src={thumbSrc} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-4 h-4 text-muted-foreground" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{order.title}</p>
        <p className="text-xs text-muted-foreground">
          {dateStr}
          {formattedTotal && <span className="ml-2 font-medium">{formattedTotal}</span>}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
          {t('admin.orders.sourceStandard')}
        </span>
        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${stateColor}`}>
          {stateLabel}
        </span>
      </div>
    </Link>
  );
}
