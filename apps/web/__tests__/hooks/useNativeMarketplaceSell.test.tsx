import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useNativeMarketplaceSell } from '@mobazha/core';

vi.mock('@mobazha/core/services/api/marketplace', () => ({
  getPublicMarketplaceDetail: vi.fn(),
  getNativeMarketplaceSellerApplication: vi.fn(),
  applyToNativeMarketplace: vi.fn(),
  withdrawNativeMarketplaceSellerApplication: vi.fn(),
}));

import {
  applyToNativeMarketplace,
  getNativeMarketplaceSellerApplication,
  getPublicMarketplaceDetail,
  withdrawNativeMarketplaceSellerApplication,
} from '@mobazha/core/services/api/marketplace';

const mockGetDetail = getPublicMarketplaceDetail as ReturnType<typeof vi.fn>;
const mockGetApplication = getNativeMarketplaceSellerApplication as ReturnType<typeof vi.fn>;
const mockApply = applyToNativeMarketplace as ReturnType<typeof vi.fn>;
const mockWithdraw = withdrawNativeMarketplaceSellerApplication as ReturnType<typeof vi.fn>;

const marketplace = {
  id: 'mp-1',
  name: 'Test Market',
  slug: 'test-market',
  publicURL: 'https://test.example',
  joinMode: 'open',
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
});
