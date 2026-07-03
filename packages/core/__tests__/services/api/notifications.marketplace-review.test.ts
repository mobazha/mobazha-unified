// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import { describe, expect, it } from 'vitest';
import {
  getNotificationRoute,
  mapMarketplaceReviewEventToNotification,
} from '../../../services/api/notifications';

describe('marketplace review notification mapping', () => {
  it('maps backend event into source-aware notification', () => {
    const notification = mapMarketplaceReviewEventToNotification({
      id: 101,
      marketplaceID: 'mkt-1',
      marketplaceName: 'Collectibles Hub',
      marketplaceSlug: 'collectibles-hub',
      marketplaceStoreID: 88,
      peerID: 'QmSeller',
      actorID: 'QmModerator',
      previousStatus: 'pending',
      status: 'approved',
      createdAt: '2026-01-01T10:00:00.000Z',
      readAt: undefined,
    });

    expect(notification.source).toBe('marketplace-review');
    expect(notification.type).toBe('marketplace.seller_review');
    expect(notification.read).toBe(false);
    expect(notification.timestamp).toBe('2026-01-01T10:00:00.000Z');
    expect(notification.data?.marketplaceReview?.eventID).toBe(101);
    expect(getNotificationRoute(notification)).toBe('/marketplace/collectibles-hub/sell');
  });

  it('keeps reason in message payload for rejected/suspended states', () => {
    const rejected = mapMarketplaceReviewEventToNotification({
      id: 102,
      marketplaceID: 'mkt-1',
      marketplaceName: 'Collectibles Hub',
      marketplaceSlug: undefined,
      marketplaceStoreID: 88,
      peerID: 'QmSeller',
      actorID: 'QmModerator',
      previousStatus: 'approved',
      status: 'rejected',
      reason: 'Missing KYC',
      createdAt: '2026-01-01T11:00:00.000Z',
      readAt: '2026-01-01T12:00:00.000Z',
    });

    expect(rejected.read).toBe(true);
    expect(rejected.data?.marketplaceReview?.reason).toBe('Missing KYC');
    expect(getNotificationRoute(rejected)).toBe('/marketplaces');
  });
});
