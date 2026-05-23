import { describe, expect, it } from 'vitest';
import { getNotificationRoute } from '../../../services/api/notifications';
import type { Notification } from '../../../services/api/notifications';

function makeNotification(type: string, data?: Notification['data']): Notification {
  return {
    id: 'notif-1',
    type,
    title: 'Test',
    message: 'Test message',
    read: false,
    timestamp: new Date().toISOString(),
    data,
  };
}

describe('getNotificationRoute', () => {
  it('routes order notifications to order detail', () => {
    const route = getNotificationRoute(
      makeNotification('order.created', { orderID: 'QmOrder123' })
    );
    expect(route).toBe('/orders/QmOrder123');
  });

  it('routes buyer/seller dispute notifications to order dispute tab', () => {
    const route = getNotificationRoute(
      makeNotification('dispute.opened', { orderID: 'QmOrder123' })
    );
    expect(route).toBe('/orders/QmOrder123?tab=dispute');
  });

  it('routes moderator case notifications to order dispute tab', () => {
    expect(
      getNotificationRoute(makeNotification('dispute.case_open', { caseID: 'QmCase123' }))
    ).toBe('/orders/QmCase123?tab=dispute');

    expect(
      getNotificationRoute(makeNotification('dispute.case_update', { caseID: 'QmCase123' }))
    ).toBe('/orders/QmCase123?tab=dispute');
  });

  it('routes case types when both orderID and caseID are present', () => {
    const route = getNotificationRoute(
      makeNotification('dispute.case_update', {
        orderID: 'QmOrder123',
        caseID: 'QmOrder123',
      })
    );
    expect(route).toBe('/orders/QmOrder123?tab=dispute');
  });

  it('returns null when dispute notification has no order or case id', () => {
    const route = getNotificationRoute(makeNotification('dispute.case_update'));
    expect(route).toBeNull();
  });

  it('routes social notifications to store profile', () => {
    const route = getNotificationRoute(makeNotification('social.follow', { peerID: 'QmStore123' }));
    expect(route).toBe('/store/QmStore123');
  });
});
