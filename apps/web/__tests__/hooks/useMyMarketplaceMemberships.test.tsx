// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MyMarketplaceMembershipEntry } from '@mobazha/core';
import { useMyMarketplaceMemberships } from '@mobazha/core';

vi.mock('@mobazha/core/services/api/marketplace', () => ({
  acceptMarketplaceSellerInvitation: vi.fn(),
  createMarketplace: vi.fn(),
  createMarketplaceCurationItem: vi.fn(),
  deleteMarketplaceCurationItem: vi.fn(),
  deleteMarketplace: vi.fn(),
  declineMarketplaceSellerInvitation: vi.fn(),
  getMarketplace: vi.fn(),
  getMarketplaceAttributionSummary: vi.fn(),
  getMarketplaceCuration: vi.fn(),
  getMarketplaceCurationCandidates: vi.fn(),
  getMarketplaceSellerReviewEvents: vi.fn(),
  getMarketplaceSellers: vi.fn(),
  getMyMarketplaceMemberships: vi.fn(),
  getMyMarketplaces: vi.fn(),
  inviteMarketplaceSeller: vi.fn(),
  leaveMarketplaceMembership: vi.fn(),
  reorderMarketplaceCuration: vi.fn(),
  updateMarketplace: vi.fn(),
  updateMarketplaceCurationItem: vi.fn(),
  updateMarketplaceSeller: vi.fn(),
  verifyMarketplaceCustomDomain: vi.fn(),
}));

import {
  acceptMarketplaceSellerInvitation,
  getMyMarketplaceMemberships,
  leaveMarketplaceMembership,
} from '@mobazha/core/services/api/marketplace';

const mockAcceptInvitation = acceptMarketplaceSellerInvitation as ReturnType<typeof vi.fn>;
const mockGetMemberships = getMyMarketplaceMemberships as ReturnType<typeof vi.fn>;
const mockLeaveMembership = leaveMarketplaceMembership as ReturnType<typeof vi.fn>;

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>(res => {
    resolve = res;
  });
  return { promise, resolve };
}

function membership(
  marketplaceId: string,
  status: MyMarketplaceMembershipEntry['membership']['status']
): MyMarketplaceMembershipEntry {
  return {
    marketplace: {
      id: marketplaceId,
      name: marketplaceId,
      slug: marketplaceId,
      status: 'published',
    },
    membership: {
      id: marketplaceId === 'market-a' ? 1 : 2,
      marketplaceID: marketplaceId,
      tenantID: 'tenant-1',
      userID: 'user-1',
      peerID: 'peer-1',
      status,
      unreadReviewCount: 0,
      isVisible: status === 'approved',
      productGroupIDs: [],
      productGroups: [],
    },
  };
}

describe('useMyMarketplaceMemberships', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetMemberships.mockResolvedValue([]);
  });

  it('rejects a second action while a membership mutation is pending', async () => {
    const pendingAccept = deferred<unknown>();
    mockAcceptInvitation.mockReturnValue(pendingAccept.promise);
    mockLeaveMembership.mockResolvedValue(undefined);
    const { result } = renderHook(() => useMyMarketplaceMemberships({ autoLoad: false }));

    let acceptPromise!: Promise<void>;
    act(() => {
      acceptPromise = result.current.acceptInvitation(membership('market-a', 'invited'));
    });

    expect(result.current.acceptingId).toBe('market-a');
    await expect(
      result.current.leaveMembership(membership('market-b', 'approved'))
    ).rejects.toThrow('A marketplace membership action is already in progress');
    expect(mockLeaveMembership).not.toHaveBeenCalled();

    pendingAccept.resolve(undefined);
    await act(async () => {
      await acceptPromise;
    });

    expect(result.current.acceptingId).toBeNull();
  });
});
