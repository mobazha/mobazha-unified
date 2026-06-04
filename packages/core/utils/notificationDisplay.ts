/**
 * Notification display helpers — aggregation, data quality, CTA selection.
 */

import type { Notification } from '../services/api/notifications';
import { formatUserName, type IdentityData } from './identity';
import { resolveOrderOrCaseID } from './normalizeIds';

const LOW_QUALITY_TITLES = new Set(['test', 'product', 'item', 'listing', '']);

const ORDER_AGGREGATABLE_PREFIXES = ['order.', 'payment.'];

const DEFAULT_AGGREGATE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

function looksLikePeerId(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.startsWith('Qm') || trimmed.startsWith('12D3Koo');
}

export function isLowQualityProductTitle(title?: string | null): boolean {
  if (!title?.trim()) return true;
  const normalized = title.trim().toLowerCase();
  if (LOW_QUALITY_TITLES.has(normalized)) return true;
  if (looksLikePeerId(title)) return true;
  return false;
}

export function sanitizeProductTitle(title?: string | null): string | undefined {
  if (isLowQualityProductTitle(title)) return undefined;
  return title!.trim();
}

export function formatNotificationCounterparty(
  data?: Notification['data'],
  t?: (key: string) => string
): string {
  const buyerFallback = t?.('notifications.roles.buyer') ?? '';
  const sellerFallback = t?.('notifications.roles.seller') ?? '';
  const userFallback = t?.('notifications.roles.user') ?? '';

  if (!data) return '';

  if (data.buyerName || data.buyerID) {
    return formatUserName({ name: data.buyerName, peerID: data.buyerID } satisfies IdentityData, {
      fallback: buyerFallback,
    });
  }

  if (data.vendorName || data.vendorID) {
    return formatUserName({ name: data.vendorName, peerID: data.vendorID } satisfies IdentityData, {
      fallback: sellerFallback,
    });
  }

  if (data.disputerName || data.disputerID) {
    return formatUserName(
      { name: data.disputerName, peerID: data.disputerID } satisfies IdentityData,
      { fallback: userFallback }
    );
  }

  if (data.peerID) {
    return formatUserName({ peerID: data.peerID }, { fallback: '' });
  }

  return '';
}

export function isAggregatableOrderNotification(type: string): boolean {
  return ORDER_AGGREGATABLE_PREFIXES.some(prefix => type.startsWith(prefix));
}

export type NotificationDisplayItem =
  | { kind: 'single'; notification: Notification }
  | {
      kind: 'order-group';
      id: string;
      orderID: string;
      items: Notification[];
      latest: Notification;
      hasUnread: boolean;
    };

export function groupNotificationsForDisplay(
  notifications: Notification[],
  options?: { aggregateWindowMs?: number }
): NotificationDisplayItem[] {
  const windowMs = options?.aggregateWindowMs ?? DEFAULT_AGGREGATE_WINDOW_MS;
  const consumed = new Set<number>();
  const result: NotificationDisplayItem[] = [];

  for (let i = 0; i < notifications.length; i++) {
    if (consumed.has(i)) continue;

    const notification = notifications[i];
    const orderID = resolveOrderOrCaseID(notification.data);

    if (!orderID || !isAggregatableOrderNotification(notification.type)) {
      result.push({ kind: 'single', notification });
      continue;
    }

    const group: Notification[] = [notification];
    consumed.add(i);
    const anchorTime = new Date(notification.timestamp).getTime();

    for (let j = i + 1; j < notifications.length; j++) {
      if (consumed.has(j)) continue;
      const candidate = notifications[j];
      const candidateOrderID = resolveOrderOrCaseID(candidate.data);
      if (candidateOrderID !== orderID) continue;
      if (!isAggregatableOrderNotification(candidate.type)) continue;

      const candidateTime = new Date(candidate.timestamp).getTime();
      if (Math.abs(anchorTime - candidateTime) > windowMs) continue;

      group.push(candidate);
      consumed.add(j);
    }

    group.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    if (group.length > 1) {
      result.push({
        kind: 'order-group',
        id: `group:${orderID}:${group[0].id}`,
        orderID,
        items: group,
        latest: group[0],
        hasUnread: group.some(item => !item.read),
      });
    } else {
      result.push({ kind: 'single', notification });
    }
  }

  return result;
}

/** i18n key for the primary action button on a notification card. */
export function getNotificationCtaKey(type: string): string | null {
  switch (type) {
    case 'order.created':
    case 'order.funded':
    case 'order.payment_received':
    case 'order.confirmed':
    case 'order.completed':
    case 'order.rated':
    case 'order.refunded':
    case 'order.vendor_finalized':
    case 'payment.locked':
    case 'payment.expired':
    case 'payment.cancelled':
      return 'notifications.cta.viewOrder';
    case 'order.shipped':
      return 'notifications.cta.trackOrder';
    case 'dispute.opened':
    case 'dispute.case_open':
    case 'dispute.case_update':
    case 'dispute.closed':
    case 'dispute.accepted':
      return 'notifications.cta.viewDispute';
    case 'social.follow':
    case 'social.unfollow':
      return 'notifications.cta.viewStore';
    default:
      return null;
  }
}

export function getDisplayItemsNotificationIds(item: NotificationDisplayItem): string[] {
  if (item.kind === 'single') {
    return [item.notification.id];
  }
  return item.items.map(n => n.id);
}
