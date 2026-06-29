import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MarketplaceStoreMembership, NativeMarketplace } from '@mobazha/core';
import { useOperatorMarketplace } from '@mobazha/core';

vi.mock('@mobazha/core/services/api/marketplace', () => ({
  getMarketplace: vi.fn(),
  getMarketplaceSellers: vi.fn(),
  createMarketplace: vi.fn(),
  getMyMarketplaces: vi.fn(),
  getMyMarketplaceMemberships: vi.fn(),
  inviteMarketplaceSeller: vi.fn(),
  updateMarketplace: vi.fn(),
  deleteMarketplace: vi.fn(),
  updateMarketplaceSeller: vi.fn(),
  acceptMarketplaceSellerInvitation: vi.fn(),
}));

import {
  deleteMarketplace,
  getMarketplace,
  getMarketplaceSellers,
  inviteMarketplaceSeller,
  updateMarketplace,
  updateMarketplaceSeller,
} from '@mobazha/core/services/api/marketplace';

const mockGetMarketplace = getMarketplace as ReturnType<typeof vi.fn>;
const mockGetMarketplaceSellers = getMarketplaceSellers as ReturnType<typeof vi.fn>;
const mockInviteMarketplaceSeller = inviteMarketplaceSeller as ReturnType<typeof vi.fn>;
const mockUpdateMarketplace = updateMarketplace as ReturnType<typeof vi.fn>;
const mockDeleteMarketplace = deleteMarketplace as ReturnType<typeof vi.fn>;
const mockUpdateMarketplaceSeller = updateMarketplaceSeller as ReturnType<typeof vi.fn>;

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function buildMarketplace(id: string, name: string): NativeMarketplace {
  return {
    id,
    name,
    slug: id,
    status: 'published',
    ownerUserID: 'owner-1',
    joinMode: 'approval',
    catalogMode: 'curated',
    discoverability: 'public',
    sellerEntryMode: 'operator_invited',
    vertical: 'collectibles',
    plan: 'free',
    domains: [],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };
}

function buildStore(peerID: string, marketplaceID = 'latest-id'): MarketplaceStoreMembership {
  return {
    id: 1,
    tenantID: 'tenant-1',
    marketplaceID,
    userID: 'user-1',
    peerID,
    status: 'approved',
    isVisible: true,
    productGroupIDs: [],
  };
}

describe('useOperatorMarketplace', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('ignores stale async responses when marketplaceId changes before earlier requests finish', async () => {
    const staleMarketplace = buildMarketplace('stale-id', 'Stale Marketplace');
    const latestMarketplace = buildMarketplace('latest-id', 'Latest Marketplace');
    const staleMarketplaceDeferred = deferred<NativeMarketplace>();
    const staleStoresDeferred = deferred<MarketplaceStoreMembership[]>();
    const latestMarketplaceDeferred = deferred<NativeMarketplace>();
    const latestStoresDeferred = deferred<MarketplaceStoreMembership[]>();

    mockGetMarketplace.mockImplementation((id: string) => {
      if (id === 'stale-id') return staleMarketplaceDeferred.promise;
      if (id === 'latest-id') return latestMarketplaceDeferred.promise;
      return Promise.reject(new Error(`unexpected marketplace id: ${id}`));
    });
    mockGetMarketplaceSellers.mockImplementation((id: string) => {
      if (id === 'stale-id') return staleStoresDeferred.promise;
      if (id === 'latest-id') return latestStoresDeferred.promise;
      return Promise.reject(new Error(`unexpected marketplace id: ${id}`));
    });

    const { result, rerender } = renderHook(
      ({ marketplaceId }: { marketplaceId?: string }) => useOperatorMarketplace(marketplaceId),
      { initialProps: { marketplaceId: 'stale-id' } }
    );

    expect(result.current.loading).toBe(true);

    rerender({ marketplaceId: 'latest-id' });

    await act(async () => {
      latestMarketplaceDeferred.resolve(latestMarketplace);
      latestStoresDeferred.resolve([buildStore('peer-latest')]);
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.marketplace).toEqual(latestMarketplace);
    expect(result.current.stores).toEqual([buildStore('peer-latest')]);
    expect(result.current.loadFailed).toBe(false);
    expect(result.current.error).toBeNull();

    await act(async () => {
      staleMarketplaceDeferred.resolve(staleMarketplace);
      staleStoresDeferred.resolve([buildStore('peer-stale', 'stale-id')]);
    });

    expect(result.current.marketplace).toEqual(latestMarketplace);
    expect(result.current.stores).toEqual([buildStore('peer-latest')]);
    expect(result.current.loadFailed).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('ignores stale error responses after marketplaceId changes', async () => {
    const latestMarketplace = buildMarketplace('latest-id', 'Latest Marketplace');
    const staleMarketplaceDeferred = deferred<NativeMarketplace>();
    const staleStoresDeferred = deferred<MarketplaceStoreMembership[]>();
    const latestMarketplaceDeferred = deferred<NativeMarketplace>();
    const latestStoresDeferred = deferred<MarketplaceStoreMembership[]>();

    mockGetMarketplace.mockImplementation((id: string) => {
      if (id === 'stale-id') return staleMarketplaceDeferred.promise;
      if (id === 'latest-id') return latestMarketplaceDeferred.promise;
      return Promise.reject(new Error(`unexpected marketplace id: ${id}`));
    });
    mockGetMarketplaceSellers.mockImplementation((id: string) => {
      if (id === 'stale-id') return staleStoresDeferred.promise;
      if (id === 'latest-id') return latestStoresDeferred.promise;
      return Promise.reject(new Error(`unexpected marketplace id: ${id}`));
    });

    const { result, rerender } = renderHook(
      ({ marketplaceId }: { marketplaceId?: string }) => useOperatorMarketplace(marketplaceId),
      { initialProps: { marketplaceId: 'stale-id' } }
    );

    rerender({ marketplaceId: 'latest-id' });

    await act(async () => {
      latestMarketplaceDeferred.resolve(latestMarketplace);
      latestStoresDeferred.resolve([buildStore('peer-latest')]);
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      staleMarketplaceDeferred.reject(new Error('stale failure'));
      staleStoresDeferred.reject(new Error('stale failure'));
    });

    expect(result.current.marketplace).toEqual(latestMarketplace);
    expect(result.current.loadFailed).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('ignores stale publish responses after marketplaceId changes', async () => {
    const marketplaceA = buildMarketplace('id-a', 'Marketplace A');
    const marketplaceB = buildMarketplace('id-b', 'Marketplace B');
    const publishedMarketplaceA = { ...marketplaceA, status: 'published' as const };
    const loadADeferred = deferred<NativeMarketplace>();
    const loadBMarketplaceDeferred = deferred<NativeMarketplace>();
    const loadBStoresDeferred = deferred<MarketplaceStoreMembership[]>();
    const publishADeferred = deferred<NativeMarketplace>();
    const publishBDeferred = deferred<NativeMarketplace>();

    mockGetMarketplace.mockImplementation((id: string) => {
      if (id === 'id-a') return loadADeferred.promise;
      if (id === 'id-b') return loadBMarketplaceDeferred.promise;
      return Promise.reject(new Error(`unexpected marketplace id: ${id}`));
    });
    mockGetMarketplaceSellers.mockImplementation((id: string) => {
      if (id === 'id-a') return Promise.resolve([buildStore('peer-a', 'id-a')]);
      if (id === 'id-b') return loadBStoresDeferred.promise;
      return Promise.reject(new Error(`unexpected marketplace id: ${id}`));
    });
    mockUpdateMarketplace.mockImplementation((id: string) => {
      if (id === 'id-a') return publishADeferred.promise;
      if (id === 'id-b') return publishBDeferred.promise;
      return Promise.reject(new Error(`unexpected marketplace id: ${id}`));
    });

    const { result, rerender } = renderHook(
      ({ marketplaceId }: { marketplaceId?: string }) => useOperatorMarketplace(marketplaceId),
      { initialProps: { marketplaceId: 'id-a' } }
    );

    let publishAPromise!: Promise<NativeMarketplace | null>;
    act(() => {
      publishAPromise = result.current.publish();
    });
    expect(result.current.working).toBe('publish');

    rerender({ marketplaceId: 'id-b' });

    await act(async () => {
      loadBMarketplaceDeferred.resolve(marketplaceB);
      loadBStoresDeferred.resolve([buildStore('peer-b', 'id-b')]);
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.marketplace).toEqual(marketplaceB);
    expect(result.current.working).toBeNull();

    let publishBPromise!: Promise<NativeMarketplace | null>;
    act(() => {
      publishBPromise = result.current.publish();
    });
    expect(result.current.working).toBe('publish');

    await act(async () => {
      publishADeferred.resolve(publishedMarketplaceA);
      await publishAPromise;
    });

    expect(result.current.marketplace).toEqual(marketplaceB);
    expect(result.current.working).toBe('publish');

    await act(async () => {
      publishBDeferred.resolve({ ...marketplaceB, status: 'published' });
      await publishBPromise;
    });

    expect(result.current.marketplace).toEqual({ ...marketplaceB, status: 'published' });
    expect(result.current.working).toBeNull();
  });

  it('does not let a stale invite refresh or clear working after marketplaceId changes', async () => {
    const marketplaceA = buildMarketplace('id-a', 'Marketplace A');
    const marketplaceB = buildMarketplace('id-b', 'Marketplace B');
    const loadADeferred = deferred<NativeMarketplace>();
    const loadBMarketplaceDeferred = deferred<NativeMarketplace>();
    const loadBStoresDeferred = deferred<MarketplaceStoreMembership[]>();
    const inviteADeferred = deferred<void>();
    const reviewBDeferred = deferred<void>();

    mockGetMarketplace.mockImplementation((id: string) => {
      if (id === 'id-a') return loadADeferred.promise;
      if (id === 'id-b') return loadBMarketplaceDeferred.promise;
      return Promise.reject(new Error(`unexpected marketplace id: ${id}`));
    });
    mockGetMarketplaceSellers.mockImplementation((id: string) => {
      if (id === 'id-a') return Promise.resolve([buildStore('peer-a', 'id-a')]);
      if (id === 'id-b') return loadBStoresDeferred.promise;
      return Promise.reject(new Error(`unexpected marketplace id: ${id}`));
    });
    mockInviteMarketplaceSeller.mockImplementation(() => inviteADeferred.promise);
    mockUpdateMarketplaceSeller.mockImplementation(() => reviewBDeferred.promise);

    const { result, rerender } = renderHook(
      ({ marketplaceId }: { marketplaceId?: string }) => useOperatorMarketplace(marketplaceId),
      { initialProps: { marketplaceId: 'id-a' } }
    );

    await act(async () => {
      loadADeferred.resolve(marketplaceA);
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let inviteAPromise!: Promise<void>;
    act(() => {
      inviteAPromise = result.current.invite('peer-new');
    });
    expect(result.current.working).toBe('invite');

    rerender({ marketplaceId: 'id-b' });

    await act(async () => {
      loadBMarketplaceDeferred.resolve(marketplaceB);
      loadBStoresDeferred.resolve([buildStore('peer-b', 'id-b')]);
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.marketplace).toEqual(marketplaceB);
    expect(result.current.stores).toEqual([buildStore('peer-b', 'id-b')]);
    expect(result.current.working).toBeNull();

    const marketplaceCallsAfterSwitch = mockGetMarketplace.mock.calls.length;

    let reviewBPromise!: Promise<void>;
    act(() => {
      reviewBPromise = result.current.reviewSeller(buildStore('peer-b', 'id-b'), 'approved');
    });
    expect(result.current.working).toBe('approved:peer-b');

    await act(async () => {
      inviteADeferred.resolve();
      await inviteAPromise;
    });

    expect(result.current.marketplace).toEqual(marketplaceB);
    expect(result.current.stores).toEqual([buildStore('peer-b', 'id-b')]);
    expect(result.current.working).toBe('approved:peer-b');
    expect(
      mockGetMarketplace.mock.calls.slice(marketplaceCallsAfterSwitch).some(([id]) => id === 'id-a')
    ).toBe(false);

    mockGetMarketplace.mockImplementation((id: string) => {
      if (id === 'id-b') return Promise.resolve(marketplaceB);
      return Promise.reject(new Error(`unexpected marketplace id: ${id}`));
    });
    mockGetMarketplaceSellers.mockImplementation((id: string) => {
      if (id === 'id-b') return Promise.resolve([buildStore('peer-b', 'id-b')]);
      return Promise.reject(new Error(`unexpected marketplace id: ${id}`));
    });

    await act(async () => {
      reviewBDeferred.resolve();
      await reviewBPromise;
    });

    expect(result.current.working).toBeNull();
  });

  it('does not let a stale review refresh or clear working after marketplaceId changes', async () => {
    const marketplaceA = buildMarketplace('id-a', 'Marketplace A');
    const marketplaceB = buildMarketplace('id-b', 'Marketplace B');
    const loadADeferred = deferred<NativeMarketplace>();
    const loadBMarketplaceDeferred = deferred<NativeMarketplace>();
    const loadBStoresDeferred = deferred<MarketplaceStoreMembership[]>();
    const reviewADeferred = deferred<void>();
    const inviteBDeferred = deferred<void>();

    mockGetMarketplace.mockImplementation((id: string) => {
      if (id === 'id-a') return loadADeferred.promise;
      if (id === 'id-b') return loadBMarketplaceDeferred.promise;
      return Promise.reject(new Error(`unexpected marketplace id: ${id}`));
    });
    mockGetMarketplaceSellers.mockImplementation((id: string) => {
      if (id === 'id-a') return Promise.resolve([buildStore('peer-a', 'id-a')]);
      if (id === 'id-b') return loadBStoresDeferred.promise;
      return Promise.reject(new Error(`unexpected marketplace id: ${id}`));
    });
    mockUpdateMarketplaceSeller.mockImplementation(() => reviewADeferred.promise);
    mockInviteMarketplaceSeller.mockImplementation(() => inviteBDeferred.promise);

    const { result, rerender } = renderHook(
      ({ marketplaceId }: { marketplaceId?: string }) => useOperatorMarketplace(marketplaceId),
      { initialProps: { marketplaceId: 'id-a' } }
    );

    await act(async () => {
      loadADeferred.resolve(marketplaceA);
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let reviewAPromise!: Promise<void>;
    act(() => {
      reviewAPromise = result.current.reviewSeller(buildStore('peer-a', 'id-a'), 'approved');
    });
    expect(result.current.working).toBe('approved:peer-a');

    rerender({ marketplaceId: 'id-b' });

    await act(async () => {
      loadBMarketplaceDeferred.resolve(marketplaceB);
      loadBStoresDeferred.resolve([buildStore('peer-b', 'id-b')]);
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let inviteBPromise!: Promise<void>;
    act(() => {
      inviteBPromise = result.current.invite('peer-new-b');
    });
    expect(result.current.working).toBe('invite');

    const marketplaceCallsAfterSwitch = mockGetMarketplace.mock.calls.length;

    await act(async () => {
      reviewADeferred.resolve();
      await reviewAPromise;
    });

    expect(result.current.marketplace).toEqual(marketplaceB);
    expect(result.current.stores).toEqual([buildStore('peer-b', 'id-b')]);
    expect(result.current.working).toBe('invite');
    expect(
      mockGetMarketplace.mock.calls.slice(marketplaceCallsAfterSwitch).some(([id]) => id === 'id-a')
    ).toBe(false);

    mockGetMarketplace.mockImplementation((id: string) => {
      if (id === 'id-b') return Promise.resolve(marketplaceB);
      return Promise.reject(new Error(`unexpected marketplace id: ${id}`));
    });
    mockGetMarketplaceSellers.mockImplementation((id: string) => {
      if (id === 'id-b') return Promise.resolve([buildStore('peer-b', 'id-b')]);
      return Promise.reject(new Error(`unexpected marketplace id: ${id}`));
    });

    await act(async () => {
      inviteBDeferred.resolve();
      await inviteBPromise;
    });

    expect(result.current.working).toBeNull();
  });

  it('rejects stale refresh invocations before requesting when marketplaceId has changed', async () => {
    const marketplaceA = buildMarketplace('id-a', 'Marketplace A');
    const marketplaceB = buildMarketplace('id-b', 'Marketplace B');
    const loadADeferred = deferred<NativeMarketplace>();
    const loadBMarketplaceDeferred = deferred<NativeMarketplace>();
    const loadBStoresDeferred = deferred<MarketplaceStoreMembership[]>();

    mockGetMarketplace.mockImplementation((id: string) => {
      if (id === 'id-a') return loadADeferred.promise;
      if (id === 'id-b') return loadBMarketplaceDeferred.promise;
      return Promise.reject(new Error(`unexpected marketplace id: ${id}`));
    });
    mockGetMarketplaceSellers.mockImplementation((id: string) => {
      if (id === 'id-a') return Promise.resolve([buildStore('peer-a', 'id-a')]);
      if (id === 'id-b') return loadBStoresDeferred.promise;
      return Promise.reject(new Error(`unexpected marketplace id: ${id}`));
    });

    const { result, rerender } = renderHook(
      ({ marketplaceId }: { marketplaceId?: string }) => useOperatorMarketplace(marketplaceId),
      { initialProps: { marketplaceId: 'id-a' } }
    );

    const staleRefresh = result.current.refresh;

    await act(async () => {
      loadADeferred.resolve(marketplaceA);
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    rerender({ marketplaceId: 'id-b' });

    const marketplaceCallsAfterSwitch = mockGetMarketplace.mock.calls.length;

    let staleRefreshPromise!: Promise<void>;
    act(() => {
      staleRefreshPromise = staleRefresh();
    });

    expect(
      mockGetMarketplace.mock.calls.slice(marketplaceCallsAfterSwitch).some(([id]) => id === 'id-a')
    ).toBe(false);

    await act(async () => {
      loadBMarketplaceDeferred.resolve(marketplaceB);
      loadBStoresDeferred.resolve([buildStore('peer-b', 'id-b')]);
      await staleRefreshPromise;
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.marketplace).toEqual(marketplaceB);
    expect(result.current.stores).toEqual([buildStore('peer-b', 'id-b')]);
    expect(result.current.loading).toBe(false);
  });

  it('updates marketplace settings and tracks working state', async () => {
    const marketplace = buildMarketplace('mp1', 'Original');
    const updated = { ...marketplace, name: 'Updated' };
    const updateDeferred = deferred<NativeMarketplace>();
    mockGetMarketplace.mockResolvedValue(marketplace);
    mockGetMarketplaceSellers.mockResolvedValue([]);
    mockUpdateMarketplace.mockImplementation(() => updateDeferred.promise);

    const { result } = renderHook(() => useOperatorMarketplace('mp1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let updatePromise!: Promise<NativeMarketplace | null>;
    act(() => {
      updatePromise = result.current.update({ name: 'Updated' });
    });
    expect(result.current.working).toBe('update');

    await act(async () => {
      updateDeferred.resolve(updated);
      await updatePromise;
    });

    expect(mockUpdateMarketplace).toHaveBeenCalledWith('mp1', { name: 'Updated' });
    expect(result.current.marketplace).toEqual(updated);
    expect(result.current.working).toBeNull();
  });

  it('archives marketplace and marks it read-only locally', async () => {
    const marketplace = buildMarketplace('mp1', 'To Archive');
    mockGetMarketplace.mockResolvedValue(marketplace);
    mockGetMarketplaceSellers.mockResolvedValue([]);
    mockDeleteMarketplace.mockResolvedValue({ archived: true, id: 'mp1' });

    const { result } = renderHook(() => useOperatorMarketplace('mp1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.archive();
    });

    expect(mockDeleteMarketplace).toHaveBeenCalledWith('mp1');
    expect(result.current.marketplace?.status).toBe('archived');
    expect(result.current.working).toBeNull();
  });

  it('ignores stale update results after marketplaceId changes', async () => {
    const marketplaceA = buildMarketplace('id-a', 'Marketplace A');
    const marketplaceB = buildMarketplace('id-b', 'Marketplace B');
    const updatedA = { ...marketplaceA, name: 'Updated A' };
    const updateDeferred = deferred<NativeMarketplace>();

    mockGetMarketplace.mockImplementation((id: string) => {
      if (id === 'id-a') return Promise.resolve(marketplaceA);
      if (id === 'id-b') return Promise.resolve(marketplaceB);
      return Promise.reject(new Error(`unexpected marketplace id: ${id}`));
    });
    mockGetMarketplaceSellers.mockResolvedValue([]);
    mockUpdateMarketplace.mockImplementation(() => updateDeferred.promise);

    const { result, rerender } = renderHook(
      ({ marketplaceId }: { marketplaceId?: string }) => useOperatorMarketplace(marketplaceId),
      { initialProps: { marketplaceId: 'id-a' } }
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let updatePromise!: Promise<NativeMarketplace | null>;
    act(() => {
      updatePromise = result.current.update({ name: 'Updated A' });
    });
    expect(result.current.working).toBe('update');

    rerender({ marketplaceId: 'id-b' });

    await waitFor(() => {
      expect(result.current.marketplace).toEqual(marketplaceB);
      expect(result.current.working).toBeNull();
    });

    await act(async () => {
      updateDeferred.resolve(updatedA);
      await updatePromise;
    });

    expect(result.current.marketplace).toEqual(marketplaceB);
    expect(result.current.working).toBeNull();
  });
});
