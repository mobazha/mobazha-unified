import type { OrderListItem, ProfileDisplayInfo } from '@mobazha/core';
import {
  fromMinimalUnit,
  formatPrice,
  getImageUrl,
  orderListItemThumbnailDisplayUrl,
} from '@mobazha/core';
import { resolveTokenIdForDisplay } from '@mobazha/core/data/tokens';
import type { GuestOrderSummary } from '@mobazha/core/services/api/guestCheckout';
import type { Order } from '@/components/Order/OrderCard';

type OrderType = 'purchases' | 'sales';

export function mapOrderState(state: string): Order['status'] {
  const stateMap: Record<string, Order['status']> = {
    PENDING: 'pending',
    AWAITING_PAYMENT_VERIFICATION: 'pending',
    AWAITING_PAYMENT: 'awaiting_payment',
    AWAITING_PICKUP: 'processing',
    AWAITING_SHIPMENT: 'processing',
    PARTIALLY_SHIPPED: 'processing',
    SHIPPED: 'shipped',
    COMPLETED: 'completed',
    CANCELED: 'cancelled',
    DECLINED: 'cancelled',
    REFUNDED: 'cancelled',
    DISPUTED: 'disputed',
    DECIDED: 'disputed',
    DISPUTE_EXPIRED: 'disputed',
    RESOLVED: 'completed',
    PAYMENT_FINALIZED: 'completed',
    PROCESSING_ERROR: 'pending',
  };
  return stateMap[state] || 'pending';
}

function getPriceCurrency(total: OrderListItem['total']): string {
  if (!total) return 'USD';
  return (
    (total as { currency?: { code?: string } }).currency?.code ||
    (total as { currencyCode?: string }).currencyCode ||
    'USD'
  );
}

export function transformOrderListItem(
  item: OrderListItem,
  orderType: OrderType,
  profileMap: Map<string, ProfileDisplayInfo>,
  labels: { seller: string; buyer: string }
): Order {
  const imageUrl = orderListItemThumbnailDisplayUrl(item);
  const itemAny = item as unknown as Record<string, unknown>;
  const orderId = item.orderID || (itemAny.orderId as string) || '';
  const vendorId = item.vendorID || (itemAny.vendorId as string) || '';
  const buyerId = item.buyerID || (itemAny.buyerId as string) || '';

  const currency = getPriceCurrency(item.total) || item.paymentCoin || 'USD';
  const formattedPrice = item.total
    ? String(fromMinimalUnit(item.total.amount || 0, currency))
    : '0';

  const counterpartyId = orderType === 'purchases' ? vendorId : buyerId;
  const apiName = orderType === 'purchases' ? item.vendorName : item.buyerName;
  const apiAvatar = orderType === 'purchases' ? item.vendorAvatar : item.buyerAvatar;
  const counterpartyNameFromApi = orderType === 'purchases' ? item.vendorName : item.buyerName;
  const profileInfo = counterpartyId ? profileMap.get(counterpartyId) : undefined;
  const counterpartyName =
    apiName ||
    profileInfo?.name ||
    counterpartyNameFromApi ||
    (counterpartyId
      ? `${counterpartyId.slice(0, 6)}…${counterpartyId.slice(-4)}`
      : orderType === 'purchases'
        ? labels.seller
        : labels.buyer);
  const counterpartyAvatar = apiAvatar
    ? getImageUrl(apiAvatar) || undefined
    : profileInfo?.avatar || undefined;

  return {
    id: orderId,
    orderId,
    status: mapOrderState(item.state || 'PENDING'),
    rawState: item.state || 'PENDING',
    paymentCoin: item.paymentCoin,
    items: [
      {
        id: orderId,
        title: item.title || '',
        image: imageUrl,
        quantity: item.quantity || 1,
        price: formattedPrice,
        currency,
      },
    ],
    total: formattedPrice,
    currency,
    createdAt: item.timestamp || new Date().toISOString(),
    vendor: {
      id: counterpartyId,
      name: counterpartyName,
      avatar: counterpartyAvatar,
    },
  };
}

export interface ExportableOrder {
  orderId: string;
  date: string;
  title: string;
  buyer: string;
  total: string;
  currency: string;
  status: string;
  paymentCoin: string;
}

export function ordersToExportRows(orders: Order[]): ExportableOrder[] {
  return orders.map(o => ({
    orderId: o.orderId,
    date: o.createdAt,
    title: o.items[0]?.title || '',
    buyer: o.vendor.name,
    total: o.total,
    currency: o.currency || 'USD',
    status: o.rawState || o.status,
    paymentCoin: o.paymentCoin || '',
  }));
}

export function getGuestPaymentCoin(order: { paymentCoin: string }): string {
  return resolveTokenIdForDisplay(order.paymentCoin);
}

export function getGuestPaymentAmountValue(order: {
  paymentAmount: string;
  paymentCoin: string;
}): string {
  return String(fromMinimalUnit(order.paymentAmount, getGuestPaymentCoin(order)));
}

export function formatGuestPaymentAmount(order: {
  paymentAmount: string;
  paymentCoin: string;
}): string {
  const paymentCoin = getGuestPaymentCoin(order);
  return formatPrice(fromMinimalUnit(order.paymentAmount, paymentCoin), paymentCoin, {
    showSymbol: true,
    showCode: true,
  });
}

export function guestOrderToExportRow(order: GuestOrderSummary): ExportableOrder {
  return {
    orderId: order.orderToken,
    date: order.createdAt,
    title: order.items[0]?.listingTitle || '',
    buyer: order.contactEmail || 'Guest checkout',
    total: getGuestPaymentAmountValue(order),
    currency: getGuestPaymentCoin(order),
    status: order.state,
    paymentCoin: getGuestPaymentCoin(order),
  };
}

export function exportToCSV(rows: ExportableOrder[], filename: string): void {
  // Headers intentionally in English for data portability across locales.
  const headers = [
    'Order ID',
    'Date',
    'Product',
    'Buyer',
    'Total',
    'Currency',
    'Status',
    'Payment Coin',
  ];
  const csvRows = [
    headers.join(','),
    ...rows.map(r =>
      [
        r.orderId,
        r.date,
        `"${r.title.replace(/"/g, '""')}"`,
        `"${r.buyer.replace(/"/g, '""')}"`,
        r.total,
        r.currency,
        r.status,
        r.paymentCoin,
      ].join(',')
    ),
  ];
  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function exportToJSON(rows: ExportableOrder[], filename: string): void {
  const blob = new Blob([JSON.stringify(rows, null, 2)], {
    type: 'application/json;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export type StatusFilter =
  | 'all'
  | 'pending'
  | 'processing'
  | 'shipped'
  | 'completed'
  | 'disputed'
  | 'cancelled';

export const STATUS_FILTER_TO_STATES: Record<StatusFilter, string[] | null> = {
  all: null,
  pending: ['PENDING', 'AWAITING_PAYMENT', 'AWAITING_PAYMENT_VERIFICATION'],
  processing: ['AWAITING_SHIPMENT', 'AWAITING_PICKUP', 'PARTIALLY_SHIPPED'],
  shipped: ['SHIPPED'],
  completed: ['COMPLETED', 'PAYMENT_FINALIZED', 'RESOLVED'],
  disputed: ['DISPUTED', 'DECIDED', 'DISPUTE_EXPIRED'],
  cancelled: ['CANCELED', 'DECLINED', 'REFUNDED'],
};
