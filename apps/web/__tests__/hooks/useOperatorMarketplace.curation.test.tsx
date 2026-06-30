import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  MarketplaceCurationCandidates,
  MarketplaceCurationItem,
  MarketplaceStoreMembership,
  NativeMarketplace,
} from '@mobazha/core';
import { useOperatorMarketplace } from '@mobazha/core';

vi.mock('@mobazha/core/services/api/marketplace', () => ({
  getMarketplace: vi.fn(),
  getMarketplaceSellers: vi.fn(),
  getMarketplaceSellerReviewEvents: vi.fn(),
  getMarketplaceAttributionSummary: vi.fn(),
  getMarketplaceCuration: vi.fn(),
  getMarketplaceCurationCandidates: vi.fn(),
  createMarketplaceCurationItem: vi.fn(),
  reorderMarketplaceCuration: vi.fn(),
  updateMarketplaceCurationItem: vi.fn(),
  deleteMarketplaceCurationItem: vi.fn(),
  createMarketplace: vi.fn(),
  getMyMarketplaces: vi.fn(),
  getMyMarketplaceMemberships: vi.fn(),
  inviteMarketplaceSeller: vi.fn(),
  verifyMarketplaceCustomDomain: vi.fn(),
  updateMarketplace: vi.fn(),
  deleteMarketplace: vi.fn(),
  updateMarketplaceSeller: vi.fn(),
  acceptMarketplaceSellerInvitation: vi.fn(),
}));

import {
  createMarketplaceCurationItem,
  deleteMarketplaceCurationItem,
  getMarketplace,
  getMarketplaceAttributionSummary,
  getMarketplaceCuration,
  getMarketplaceCurationCandidates,
  getMarketplaceSellerReviewEvents,
  getMarketplaceSellers,
  reorderMarketplaceCuration,
  updateMarketplaceCurationItem,
} from '@mobazha/core/services/api/marketplace';

const mockGetMarketplace = getMarketplace as ReturnType<typeof vi.fn>;
const mockGetMarketplaceSellers = getMarketplaceSellers as ReturnType<typeof vi.fn>;
const mockGetMarketplaceSellerReviewEvents = getMarketplaceSellerReviewEvents as ReturnType<
  typeof vi.fn
>;
const mockGetMarketplaceAttributionSummary = getMarketplaceAttributionSummary as ReturnType<
  typeof vi.fn
>;
const mockGetMarketplaceCuration = getMarketplaceCuration as ReturnType<typeof vi.fn>;
const mockGetMarketplaceCurationCandidates = getMarketplaceCurationCandidates as ReturnType<
  typeof vi.fn
>;
const mockCreateMarketplaceCurationItem = createMarketplaceCurationItem as ReturnType<typeof vi.fn>;
const mockReorderMarketplaceCuration = reorderMarketplaceCuration as ReturnType<typeof vi.fn>;
const mockUpdateMarketplaceCurationItem = updateMarketplaceCurationItem as ReturnType<typeof vi.fn>;
const mockDeleteMarketplaceCurationItem = deleteMarketplaceCurationItem as ReturnType<typeof vi.fn>;

function buildMarketplace(id = 'mp-1'): NativeMarketplace {
  return {
    id,
    name: 'Marketplace',
    slug: 'marketplace',
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

function buildStore(): MarketplaceStoreMembership {
  return {
    id: 1,
    tenantID: 'tenant-1',
    marketplaceID: 'mp-1',
    peerID: 'QmStoreA',
    status: 'approved',
    unreadReviewCount: 0,
    isVisible: true,
    productGroupIDs: [],
    productGroups: [],
  };
}

const sampleItems: MarketplaceCurationItem[] = [
  {
    id: 11,
    kind: 'listing',
    peerID: 'QmStoreA',
    listingSlug: 'alpha',
    sortOrder: 0,
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
];

const sampleCandidates: MarketplaceCurationCandidates = {
  sellers: [{ peerID: 'QmStoreA' }, { peerID: 'QmStoreB' }],
  listings: [{ peerID: 'QmStoreA', slug: 'alpha', title: 'Alpha' }],
  page: 1,
  pageSize: 20,
  total: 1,
  totalPage: 1,
};

describe('useOperatorMarketplace curation actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetMarketplace.mockResolvedValue(buildMarketplace());
    mockGetMarketplaceSellers.mockResolvedValue([buildStore()]);
    mockGetMarketplaceSellerReviewEvents.mockResolvedValue([]);
    mockGetMarketplaceAttributionSummary.mockResolvedValue({
      from: '2026-01-01T00:00:00Z',
      to: '2026-01-31T00:00:00Z',
      impressions: 0,
      listingClicks: 0,
      checkoutHandoffs: 0,
      listingClickRate: null,
      checkoutHandoffRate: null,
      hasData: false,
    });
    mockGetMarketplaceCuration.mockResolvedValue(sampleItems);
    mockGetMarketplaceCurationCandidates.mockResolvedValue(sampleCandidates);
    mockCreateMarketplaceCurationItem.mockResolvedValue(sampleItems[0]);
    mockReorderMarketplaceCuration.mockResolvedValue(sampleItems);
    mockUpdateMarketplaceCurationItem.mockResolvedValue({ ...sampleItems[0], isActive: false });
    mockDeleteMarketplaceCurationItem.mockResolvedValue({ deleted: true, id: 11 });
  });

  it('loads curation items and candidates on refresh', async () => {
    const { result } = renderHook(() => useOperatorMarketplace('mp-1'));
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.curationLoading).toBe(false);
    });

    expect(mockGetMarketplaceCuration).toHaveBeenCalledWith('mp-1');
    expect(mockGetMarketplaceCurationCandidates).toHaveBeenCalledWith('mp-1');
    expect(result.current.curationItems).toEqual(sampleItems);
    expect(result.current.curationCandidates).toEqual(sampleCandidates);
  });

  it('supports add, reorder, toggle and remove curation mutations', async () => {
    const { result } = renderHook(() => useOperatorMarketplace('mp-1'));
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.addCurationItem('listing', { peerID: 'QmStoreB', listingSlug: 'beta' });
    });
    expect(mockCreateMarketplaceCurationItem).toHaveBeenCalledWith('mp-1', {
      kind: 'listing',
      peerID: 'QmStoreB',
      listingSlug: 'beta',
    });

    await act(async () => {
      await result.current.reorderCurationByKind('listing', [22, 11]);
    });
    expect(mockReorderMarketplaceCuration).toHaveBeenCalledWith('mp-1', {
      kind: 'listing',
      itemIDs: [22, 11],
    });

    await act(async () => {
      await result.current.toggleCurationItem(11, false);
    });
    expect(mockUpdateMarketplaceCurationItem).toHaveBeenCalledWith('mp-1', 11, { isActive: false });

    await act(async () => {
      await result.current.removeCurationItem(11);
    });
    expect(mockDeleteMarketplaceCurationItem).toHaveBeenCalledWith('mp-1', 11);
  });

  it('loads paged candidates without clearing curation and preserves results on failure', async () => {
    const { result } = renderHook(() => useOperatorMarketplace('mp-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    const pageTwo: MarketplaceCurationCandidates = {
      ...sampleCandidates,
      query: 'beta',
      page: 2,
      total: 21,
      totalPage: 2,
      listings: [{ peerID: 'QmStoreB', slug: 'beta', title: 'Beta' }],
    };
    mockGetMarketplaceCurationCandidates.mockResolvedValueOnce(pageTwo);
    await act(async () => {
      await result.current.loadCurationCandidates({ q: 'beta', page: 2, pageSize: 20 });
    });
    expect(mockGetMarketplaceCurationCandidates).toHaveBeenLastCalledWith('mp-1', {
      q: 'beta',
      page: 2,
      pageSize: 20,
    });
    expect(result.current.curationCandidates).toEqual(pageTwo);
    expect(result.current.curationItems).toEqual(sampleItems);

    mockGetMarketplaceCurationCandidates.mockRejectedValueOnce(new Error('candidate outage'));
    await act(async () => {
      await expect(
        result.current.loadCurationCandidates({ q: 'gamma', page: 1, pageSize: 20 })
      ).rejects.toThrow('candidate outage');
    });
    expect(result.current.curationCandidates).toEqual(pageTwo);
    expect(result.current.curationItems).toEqual(sampleItems);
    expect(result.current.curationCandidatesLoading).toBe(false);
  });
});
