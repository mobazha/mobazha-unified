import { describe, expect, it } from 'vitest';
import type { Notification } from '../../services/api/notifications';
import {
  getNotificationCtaKey,
  groupNotificationsForDisplay,
  isLowQualityProductTitle,
  sanitizeProductTitle,
} from '../../utils/notificationDisplay';

function makeNotification(
  id: string,
  type: string,
  orderID: string,
  timestamp: string,
  read = false
): Notification {
  return {
    id,
    type,
    title: 'Payment Received',
    message: `Update for ${orderID}`,
    read,
    timestamp,
    data: { orderID, productTitle: 'Vintage Tee' },
  };
}

describe('notificationDisplay', () => {
  it('filters low-quality product titles', () => {
    expect(isLowQualityProductTitle('test')).toBe(true);
    expect(isLowQualityProductTitle('Product')).toBe(true);
    expect(isLowQualityProductTitle('QmAbcd1234567890')).toBe(true);
    expect(sanitizeProductTitle('Handmade Bracelet')).toBe('Handmade Bracelet');
    expect(sanitizeProductTitle('test')).toBeUndefined();
  });

  it('groups same-order notifications within the window', () => {
    const base = Date.now();
    const notifications = [
      makeNotification('n3', 'order.shipped', 'ord-1', new Date(base).toISOString()),
      makeNotification('n2', 'order.confirmed', 'ord-1', new Date(base - 3600000).toISOString()),
      makeNotification('n1', 'order.funded', 'ord-1', new Date(base - 7200000).toISOString(), true),
      makeNotification('n4', 'social.follow', 'ord-2', new Date(base).toISOString()),
    ];
    notifications[3].data = { peerID: 'QmPeer123' };

    const grouped = groupNotificationsForDisplay(notifications);
    expect(grouped).toHaveLength(2);
    expect(grouped[0].kind).toBe('order-group');
    if (grouped[0].kind === 'order-group') {
      expect(grouped[0].items).toHaveLength(3);
      expect(grouped[0].hasUnread).toBe(true);
    }
  });

  it('returns CTA keys for actionable order notifications', () => {
    expect(getNotificationCtaKey('order.shipped')).toBe('notifications.cta.trackOrder');
    expect(getNotificationCtaKey('order.funded')).toBe('notifications.cta.viewOrder');
    expect(getNotificationCtaKey('dispute.opened')).toBe('notifications.cta.viewDispute');
  });
});
