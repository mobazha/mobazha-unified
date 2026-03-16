import type { OrderListItem, ProfileDisplayInfo } from '@mobazha/core';
import { getImageUrl, fromMinimalUnit } from '@mobazha/core';
import type { Order } from '@/components/Order/OrderCard';

type OrderType = 'purchases' | 'sales';

export function mapOrderState(state: string): Order['status'] {
  const stateMap: Record<string, Order['status']> = {
    PENDING: 'pending',
    AWAITING_PAYMENT: 'awaiting_payment',
    AWAITING_PICKUP: 'processing',
    AWAITING_FULFILLMENT: 'processing',
    PARTIALLY_FULFILLED: 'processing',
    FULFILLED: 'shipped',
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

function getThumbnailUrl(thumbnail: OrderListItem['thumbnail']): string {
  if (!thumbnail) return '';
  if (typeof thumbnail === 'string') return getImageUrl(thumbnail) || '';
  const hash =
    thumbnail.medium ||
    thumbnail.small ||
    thumbnail.tiny ||
    thumbnail.large ||
    thumbnail.original ||
    '';
  return getImageUrl(hash) || '';
}

export function transformOrderListItem(
  item: OrderListItem,
  orderType: OrderType,
  profileMap: Map<string, ProfileDisplayInfo>,
  labels: { seller: string; buyer: string }
): Order {
  const imageUrl = getThumbnailUrl(item.thumbnail);
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
  const counterpartyHandle = orderType === 'purchases' ? item.vendorHandle : item.buyerHandle;
  const profileInfo = counterpartyId ? profileMap.get(counterpartyId) : undefined;
  const counterpartyName =
    apiName ||
    profileInfo?.name ||
    counterpartyHandle ||
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
  pending: ['PENDING', 'AWAITING_PAYMENT'],
  processing: ['AWAITING_FULFILLMENT', 'AWAITING_PICKUP', 'PARTIALLY_FULFILLED'],
  shipped: ['FULFILLED'],
  completed: ['COMPLETED', 'PAYMENT_FINALIZED', 'RESOLVED'],
  disputed: ['DISPUTED', 'DECIDED', 'DISPUTE_EXPIRED'],
  cancelled: ['CANCELED', 'DECLINED', 'REFUNDED'],
};
