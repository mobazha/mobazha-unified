import { describe, expect, it } from 'vitest';
import { getNotificationRoute } from '../../../services/api/notifications';
import type { Notification } from '../../../services/api/notifications';

function makeNotification(type: string, data?: Notification['data']): Notification {
  return {
    id: 'notif-1',
    source: 'node',
    type,
    title: 'Test',
    message: 'Test message',
    read: false,
    timestamp: new Date().toISOString(),
    data,
  };
}

function makeMarketplaceReviewNotification(data?: Notification['data']): Notification {
  return {
    ...makeNotification('marketplace.seller_review', data),
    source: 'marketplace-review',
  };
}

describe('getNotificationRoute', () => {
  it('routes order notifications to order detail', () => {
    const route = getNotificationRoute(
      makeNotification('order.created', { orderID: 'QmOrder123' })
    );
    expect(route).toBe('/orders/QmOrder123');
  });

  it('routes guest order notifications to seller guest order detail', () => {
    const route = getNotificationRoute(
      makeNotification('order.confirmed', {
        orderID: 'gst_077de4dd335a5faafdcd5d92ddda122e8c93896d816084c792cec4bf2cf2',
      })
    );
    expect(route).toBe(
      '/admin/orders?source=guest&guestOrder=gst_077de4dd335a5faafdcd5d92ddda122e8c93896d816084c792cec4bf2cf2'
    );
  });

  it('routes guest payment notifications to seller guest order detail', () => {
    const route = getNotificationRoute(
      makeNotification('payment.received', { orderID: 'gst_token_with spaces' })
    );
    expect(route).toBe('/admin/orders?source=guest&guestOrder=gst_token_with+spaces');
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

  it('routes marketplace review notifications to marketplace seller page', () => {
    const routeWithSlug = getNotificationRoute(
      makeMarketplaceReviewNotification({
        marketplaceReview: {
          eventID: 10,
          marketplaceID: 'mkt-1',
          marketplaceSlug: 'collectibles-hub',
          marketplaceStoreID: 99,
          peerID: 'QmPeer',
          actorID: 'QmActor',
          previousStatus: 'pending',
          status: 'approved',
        },
      })
    );
    const routeWithoutSlug = getNotificationRoute(
      makeMarketplaceReviewNotification({
        marketplaceReview: {
          eventID: 11,
          marketplaceID: 'mkt-1',
          marketplaceStoreID: 99,
          peerID: 'QmPeer',
          actorID: 'QmActor',
          previousStatus: 'pending',
          status: 'suspended',
        },
      })
    );
    expect(routeWithSlug).toBe('/marketplace/collectibles-hub/sell');
    expect(routeWithoutSlug).toBe('/marketplaces');
  });

  it('keeps node routes unchanged for unknown notification types', () => {
    const route = getNotificationRoute(
      makeNotification('marketplace.seller_review', {
        marketplaceReview: {
          eventID: 20,
          marketplaceID: 'mkt-1',
          marketplaceStoreID: 99,
          peerID: 'QmPeer',
          actorID: 'QmActor',
          previousStatus: 'pending',
          status: 'approved',
        },
      })
    );
    expect(route).toBeNull();
  });
});
