import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useNativeMarketplaceSell } from '@mobazha/core';

vi.mock('@mobazha/core/services/api/marketplace', () => ({
  getPublicMarketplaceDetail: vi.fn(),
  getNativeMarketplaceSellerApplication: vi.fn(),
  getMarketplaceMembershipReviewEvents: vi.fn(),
  markMarketplaceReviewEventRead: vi.fn(),
  applyToNativeMarketplace: vi.fn(),
  withdrawNativeMarketplaceSellerApplication: vi.fn(),
}));

import {
  applyToNativeMarketplace,
  getMarketplaceMembershipReviewEvents,
  markMarketplaceReviewEventRead,
  getNativeMarketplaceSellerApplication,
  getPublicMarketplaceDetail,
  withdrawNativeMarketplaceSellerApplication,
} from '@mobazha/core/services/api/marketplace';

const mockGetDetail = getPublicMarketplaceDetail as ReturnType<typeof vi.fn>;
const mockGetApplication = getNativeMarketplaceSellerApplication as ReturnType<typeof vi.fn>;
const mockGetReviewEvents = getMarketplaceMembershipReviewEvents as ReturnType<typeof vi.fn>;
const mockMarkReviewRead = markMarketplaceReviewEventRead as ReturnType<typeof vi.fn>;
const mockApply = applyToNativeMarketplace as ReturnType<typeof vi.fn>;
const mockWithdraw = withdrawNativeMarketplaceSellerApplication as ReturnType<typeof vi.fn>;

const marketplace = {
  id: 'mp-1',
  name: 'Test Market',
  slug: 'test-market',
  publicURL: 'https://test.example',
  buyerAccessMode: 'open',
  sellerReviewMode: 'auto',
  catalogMode: 'open',
  discoverability: 'public',
  sellerEntryMode: 'seller_self_serve',
  vertical: 'general',
  sellerCount: 0,
  productCount: 0,
};

describe('useNativeMarketplaceSell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDetail.mockResolvedValue({
      marketplace,
      sellers: [],
      featured: [],
      banners: [],
      listings: { listings: [], total: 0, page: 1, pageSize: 1, totalPage: 1 },
    });
    mockGetApplication.mockResolvedValue({
      hasApplication: false,
      productGroupIDs: [],
      autoApproved: false,
    });
    mockGetReviewEvents.mockResolvedValue([]);
  });

  it('loads marketplace detail and application state', async () => {
    const { result } = renderHook(() => useNativeMarketplaceSell('test-market'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockGetDetail).toHaveBeenCalledWith('test-market', { pageSize: 1 });
    expect(mockGetApplication).toHaveBeenCalledWith('test-market');
    expect(result.current.marketplace?.slug).toBe('test-market');
    expect(result.current.application?.hasApplication).toBe(false);
  });

  it('surfaces seller-application load failures without masking them as no application', async () => {
    mockGetApplication.mockRejectedValueOnce(new Error('Seller application unavailable'));

    const { result } = renderHook(() => useNativeMarketplaceSell('test-market'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.marketplace?.slug).toBe('test-market');
    expect(result.current.application).toBeNull();
    expect(result.current.error).toBe('Seller application unavailable');
  });

  it('clears stale marketplace/application state when identifier changes', async () => {
    mockGetDetail.mockImplementation(async (identifier: string) => ({
      marketplace: { ...marketplace, slug: identifier, id: identifier },
      sellers: [],
      featured: [],
      banners: [],
      listings: { listings: [], total: 0, page: 1, pageSize: 1, totalPage: 1 },
    }));
    mockGetApplication.mockImplementation(async (identifier: string) => ({
      hasApplication: identifier === 'market-a',
      productGroupIDs: identifier === 'market-a' ? [9] : [],
      autoApproved: false,
      membership:
        identifier === 'market-a'
          ? {
              id: 1,
              tenantID: 'tenant-1',
              marketplaceID: 'market-a',
              peerID: 'QmSeller',
              status: 'applied',
              unreadReviewCount: 0,
              isVisible: false,
              productGroupIDs: [9],
            }
          : undefined,
    }));

    const { result, rerender } = renderHook(
      ({ slug }: { slug: string }) => useNativeMarketplaceSell(slug),
      { initialProps: { slug: 'market-a' } }
    );

    await waitFor(() => expect(result.current.application?.productGroupIDs).toEqual([9]));

    rerender({ slug: 'market-b' });
    expect(result.current.application).toBeNull();

    await waitFor(() => expect(result.current.application?.hasApplication).toBe(false));
    expect(result.current.application?.productGroupIDs).toEqual([]);
  });

  it('submits and updates application in place', async () => {
    const submitted = {
      hasApplication: true,
      productGroupIDs: [2],
      autoApproved: true,
      membership: {
        id: 1,
        tenantID: 'tenant-1',
        marketplaceID: 'mp-1',
        peerID: 'QmSeller',
        status: 'approved',
        unreadReviewCount: 0,
        isVisible: true,
        productGroupIDs: [2],
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
    };
    mockApply.mockResolvedValueOnce(submitted);

    const { result } = renderHook(() => useNativeMarketplaceSell('test-market'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.submitApplication([2]);
    });

    expect(mockApply).toHaveBeenCalledWith('test-market', [2]);
    expect(result.current.application).toEqual(submitted);
  });

  it('withdraws pending applications', async () => {
    const withdrawn = {
      hasApplication: true,
      productGroupIDs: [],
      autoApproved: false,
      membership: {
        id: 1,
        tenantID: 'tenant-1',
        marketplaceID: 'mp-1',
        peerID: 'QmSeller',
        status: 'left',
        unreadReviewCount: 0,
        isVisible: false,
        productGroupIDs: [],
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
    };
    mockWithdraw.mockResolvedValueOnce(withdrawn);

    const { result } = renderHook(() => useNativeMarketplaceSell('test-market'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.withdrawApplication();
    });

    expect(mockWithdraw).toHaveBeenCalledWith('test-market');
    expect(result.current.application?.membership?.status).toBe('left');
  });

  it('ignores stale in-flight results after identifier changes', async () => {
    type Deferred<T> = {
      promise: Promise<T>;
      resolve: (value: T) => void;
    };

    const createDeferred = <T,>(): Deferred<T> => {
      let resolve!: (value: T) => void;
      const promise = new Promise<T>(res => {
        resolve = res;
      });
      return { promise, resolve };
    };

    const marketADetailDeferred = createDeferred<{
      marketplace: typeof marketplace;
      sellers: [];
      featured: [];
      banners: [];
      listings: { listings: []; total: number; page: number; pageSize: number; totalPage: number };
    }>();
    const marketAAppDeferred = createDeferred<{
      hasApplication: boolean;
      productGroupIDs: number[];
      autoApproved: boolean;
      membership?: { status: string };
    }>();

    mockGetDetail.mockImplementation(async (identifier: string) => {
      if (identifier === 'market-a') {
        return marketADetailDeferred.promise;
      }
      return {
        marketplace: { ...marketplace, slug: identifier, id: identifier },
        sellers: [],
        featured: [],
        banners: [],
        listings: { listings: [], total: 0, page: 1, pageSize: 1, totalPage: 1 },
      };
    });

    mockGetApplication.mockImplementation(async (identifier: string) => {
      if (identifier === 'market-a') {
        return marketAAppDeferred.promise;
      }
      return {
        hasApplication: false,
        productGroupIDs: [],
        autoApproved: false,
      };
    });

    const { result, rerender } = renderHook(
      ({ slug }: { slug: string }) => useNativeMarketplaceSell(slug),
      { initialProps: { slug: 'market-a' } }
    );

    rerender({ slug: 'market-b' });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.marketplace?.id).toBe('market-b');
    expect(result.current.application?.hasApplication).toBe(false);
    expect(result.current.error).toBeNull();

    marketADetailDeferred.resolve({
      marketplace: { ...marketplace, slug: 'market-a', id: 'market-a' },
      sellers: [],
      featured: [],
      banners: [],
      listings: { listings: [], total: 0, page: 1, pageSize: 1, totalPage: 1 },
    });
    marketAAppDeferred.resolve({
      hasApplication: true,
      productGroupIDs: [99],
      autoApproved: false,
      membership: { status: 'applied' },
    });

    await new Promise(resolve => setTimeout(resolve, 0));

    expect(result.current.marketplace?.id).toBe('market-b');
    expect(result.current.application?.hasApplication).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('keeps marketplace/application when review-events request fails', async () => {
    mockGetApplication.mockResolvedValueOnce({
      hasApplication: true,
      productGroupIDs: [1],
      autoApproved: false,
      membership: {
        id: 1,
        tenantID: 'tenant-1',
        marketplaceID: 'mp-1',
        peerID: 'QmSeller',
        status: 'applied',
        unreadReviewCount: 1,
        isVisible: false,
        productGroupIDs: [1],
        productGroups: [],
      },
    });
    mockGetReviewEvents.mockRejectedValueOnce(new Error('Review events unavailable'));

    const { result } = renderHook(() => useNativeMarketplaceSell('test-market'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.marketplace?.slug).toBe('test-market');
    expect(result.current.application?.membership?.marketplaceID).toBe('mp-1');
    expect(result.current.reviewEvents).toEqual([]);
    expect(result.current.reviewEventsError).toBe('Review events unavailable');
  });

  it('does not apply stale review-events results after identifier changes', async () => {
    const deferred = (() => {
      let resolve!: (value: unknown[]) => void;
      const promise = new Promise<unknown[]>(res => {
        resolve = res;
      });
      return { promise, resolve };
    })();

    mockGetApplication.mockImplementation(async (identifier: string) => ({
      hasApplication: true,
      productGroupIDs: [],
      autoApproved: false,
      membership: {
        id: 1,
        tenantID: 'tenant-1',
        marketplaceID: identifier === 'market-a' ? 'mp-a' : 'mp-b',
        peerID: 'QmSeller',
        status: 'applied',
        unreadReviewCount: 0,
        isVisible: false,
        productGroupIDs: [],
        productGroups: [],
      },
    }));
    mockGetDetail.mockImplementation(async (identifier: string) => ({
      marketplace: { ...marketplace, slug: identifier, id: identifier },
      sellers: [],
      featured: [],
      banners: [],
      listings: { listings: [], total: 0, page: 1, pageSize: 1, totalPage: 1 },
    }));
    mockGetReviewEvents.mockImplementation((marketplaceID: string) => {
      if (marketplaceID === 'mp-a') return deferred.promise;
      return Promise.resolve([]);
    });

    const { result, rerender } = renderHook(
      ({ slug }: { slug: string }) => useNativeMarketplaceSell(slug),
      { initialProps: { slug: 'market-a' } }
    );

    rerender({ slug: 'market-b' });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.marketplace?.id).toBe('market-b');

    deferred.resolve([
      {
        id: 9,
        marketplaceID: 'mp-a',
        marketplaceStoreID: 1,
        peerID: 'QmSeller',
        actorID: 'QmOperator',
        previousStatus: 'applied',
        status: 'rejected',
        createdAt: '2026-01-01T00:00:00Z',
      },
    ]);
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(result.current.marketplace?.id).toBe('market-b');
    expect(result.current.reviewEvents).toEqual([]);
  });

  it('marks review event read idempotently and decrements unread count once', async () => {
    mockGetApplication.mockResolvedValueOnce({
      hasApplication: true,
      productGroupIDs: [],
      autoApproved: false,
      membership: {
        id: 1,
        tenantID: 'tenant-1',
        marketplaceID: 'mp-1',
        peerID: 'QmSeller',
        status: 'rejected',
        unreadReviewCount: 1,
        isVisible: false,
        productGroupIDs: [],
        productGroups: [],
      },
    });
    mockGetReviewEvents.mockResolvedValueOnce([
      {
        id: 3,
        marketplaceID: 'mp-1',
        marketplaceStoreID: 1,
        peerID: 'QmSeller',
        actorID: 'QmOperator',
        previousStatus: 'applied',
        status: 'rejected',
        reason: 'Missing documents',
        createdAt: '2026-01-01T00:00:00Z',
      },
    ]);
    mockMarkReviewRead.mockResolvedValueOnce({
      id: 3,
      marketplaceID: 'mp-1',
      marketplaceStoreID: 1,
      peerID: 'QmSeller',
      actorID: 'QmOperator',
      previousStatus: 'applied',
      status: 'rejected',
      reason: 'Missing documents',
      readAt: '2026-01-02T00:00:00Z',
      createdAt: '2026-01-01T00:00:00Z',
    });

    const { result } = renderHook(() => useNativeMarketplaceSell('test-market'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await waitFor(() => expect(result.current.reviewEvents.length).toBe(1));

    await act(async () => {
      await result.current.markReviewEventRead(3);
    });

    expect(mockMarkReviewRead).toHaveBeenCalledTimes(1);
    expect(result.current.reviewEvents[0]?.readAt).toBe('2026-01-02T00:00:00Z');
    expect(result.current.application?.membership?.unreadReviewCount).toBe(0);

    await act(async () => {
      await result.current.markReviewEventRead(3);
    });

    expect(mockMarkReviewRead).toHaveBeenCalledTimes(1);
    expect(result.current.application?.membership?.unreadReviewCount).toBe(0);
  });

  it('deduplicates concurrent and immediate follow-up mark-read calls for the same event', async () => {
    mockGetApplication.mockResolvedValueOnce({
      hasApplication: true,
      productGroupIDs: [],
      autoApproved: false,
      membership: {
        id: 1,
        tenantID: 'tenant-1',
        marketplaceID: 'mp-1',
        peerID: 'QmSeller',
        status: 'rejected',
        unreadReviewCount: 1,
        isVisible: false,
        productGroupIDs: [],
        productGroups: [],
      },
    });
    mockGetReviewEvents.mockResolvedValueOnce([
      {
        id: 7,
        marketplaceID: 'mp-1',
        marketplaceStoreID: 1,
        peerID: 'QmSeller',
        actorID: 'QmOperator',
        previousStatus: 'applied',
        status: 'rejected',
        createdAt: '2026-01-01T00:00:00Z',
      },
    ]);
    const deferred = (() => {
      let resolve!: (value: {
        id: number;
        marketplaceID: string;
        marketplaceStoreID: number;
        peerID: string;
        actorID: string;
        previousStatus: 'applied';
        status: 'rejected';
        readAt: string;
        createdAt: string;
      }) => void;
      const promise = new Promise<{
        id: number;
        marketplaceID: string;
        marketplaceStoreID: number;
        peerID: string;
        actorID: string;
        previousStatus: 'applied';
        status: 'rejected';
        readAt: string;
        createdAt: string;
      }>(res => {
        resolve = res;
      });
      return { promise, resolve };
    })();
    mockMarkReviewRead.mockReturnValueOnce(deferred.promise);

    const { result } = renderHook(() => useNativeMarketplaceSell('test-market'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await waitFor(() => expect(result.current.reviewEvents.length).toBe(1));

    let first!: Promise<unknown>;
    let second!: Promise<unknown>;
    let third!: Promise<unknown>;
    await act(async () => {
      first = result.current.markReviewEventRead(7);
      second = result.current.markReviewEventRead(7);
    });

    expect(mockMarkReviewRead).toHaveBeenCalledTimes(1);

    await act(async () => {
      deferred.resolve({
        id: 7,
        marketplaceID: 'mp-1',
        marketplaceStoreID: 1,
        peerID: 'QmSeller',
        actorID: 'QmOperator',
        previousStatus: 'applied',
        status: 'rejected',
        readAt: '2026-01-02T00:00:00Z',
        createdAt: '2026-01-01T00:00:00Z',
      });
      await Promise.all([first, second]);
      third = result.current.markReviewEventRead(7);
      await third;
    });

    expect(mockMarkReviewRead).toHaveBeenCalledTimes(1);
    expect(result.current.reviewEvents[0]?.readAt).toBe('2026-01-02T00:00:00Z');
    expect(result.current.application?.membership?.unreadReviewCount).toBe(0);
  });
});
