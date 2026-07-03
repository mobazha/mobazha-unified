// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSearch } from '@/hooks/useSearch';

const mockPush = vi.fn();
const mockTrackListingClick = vi.fn();

const mockSearchParams = new URLSearchParams();

const mockSearchProducts = vi.fn().mockResolvedValue({
  products: [],
  total: 0,
  catalogTotal: 0,
  vendorCount: 0,
  hasMore: false,
});

const mockSearchUsers = vi.fn().mockResolvedValue({
  users: [],
  total: 0,
  hasMore: false,
});

let mockMarketplaceContext = {
  isSubMarket: true,
  config: { id: 'mp-collectibles', catalogMode: 'curated' as const, allowedPeers: ['QmSeller'] },
  loading: false,
};

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => mockSearchParams,
}));

vi.mock('@/components/ui/use-toast', () => ({
  toast: vi.fn(),
}));

vi.mock('@mobazha/core', async importOriginal => {
  const actual = await importOriginal<typeof import('@mobazha/core')>();
  return {
    ...actual,
    useI18n: () => ({ t: (key: string) => key }),
    useCurrency: () => ({
      localCurrency: 'USD',
      toMinimalUnit: (amount: number | string) => Number(amount),
      getCurrencySymbol: () => '$',
    }),
    useVerifiedModerators: () => ({ hasVerifiedMod: () => false }),
    useWishlist: () => ({ isInWishlist: () => false, toggleItem: vi.fn().mockResolvedValue(true) }),
    useMarketplaceContext: () => mockMarketplaceContext,
    useNativeMarketplaceAttribution: () => ({
      trackImpression: vi.fn(),
      trackListingClick: mockTrackListingClick,
      trackCheckoutHandoff: vi.fn(),
    }),
    searchDataService: {
      searchProducts: (...args: unknown[]) => mockSearchProducts(...args),
      searchUsers: (...args: unknown[]) => mockSearchUsers(...args),
    },
  };
});

describe('useSearch marketplace listing click attribution', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMarketplaceContext = {
      isSubMarket: true,
      config: { id: 'mp-collectibles', catalogMode: 'curated', allowedPeers: ['QmSeller'] },
      loading: false,
    };
  });

  it('tracks listing_click in sub-market when marketplace id exists', () => {
    const { result } = renderHook(() => useSearch());

    act(() => {
      result.current.trackMarketplaceListingClick({
        slug: 'psa-charizard',
        vendor: { peerID: 'QmSeller', name: 'Seller' },
      });
    });

    expect(mockTrackListingClick).toHaveBeenCalledWith({
      listingSlug: 'psa-charizard',
      peerID: 'QmSeller',
    });
  });

  it('does not track listing_click outside sub-market', () => {
    mockMarketplaceContext = {
      isSubMarket: false,
      config: { id: 'mp-main', catalogMode: 'curated', allowedPeers: ['QmSeller'] },
      loading: false,
    };
    const { result } = renderHook(() => useSearch());

    act(() => {
      result.current.trackMarketplaceListingClick({
        slug: 'normal-listing',
        vendor: { peerID: 'QmSeller', name: 'Seller' },
      });
    });

    expect(mockTrackListingClick).not.toHaveBeenCalled();
  });
});
