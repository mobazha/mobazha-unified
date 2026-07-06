// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Product } from '@mobazha/core';
import { useProductDetail } from '@/hooks/useProductDetail';

const mockPush = vi.fn();
const mockGetPublicProduct = vi.fn();
const mockTrackCheckoutHandoff = vi.fn();
const mockIsSovereignMode = vi.fn(() => false);
const mockUsePaymentMethods = vi.fn(() => ({
  crypto: ['BTC'],
  activeFiat: [],
  isLoading: false,
}));
let mockMarketplaceContext = {
  isSubMarket: true,
  subdomain: 'collectibles',
  domain: null,
  marketplaceKey: 'collectibles',
  config: {
    id: 'mp-1',
    attribution: {
      marketplaceId: 'mp-1',
      utmSource: 'collectibles',
    },
  },
  loading: false,
  error: null,
  retry: vi.fn(),
};

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock('@/lib/platform', () => ({
  useHaptic: () => ({ impact: vi.fn(), selectionChange: vi.fn() }),
}));

vi.mock('@/utils/requestDedup', () => ({
  getProfileWithDedup: vi.fn(async (_id: string, fn: () => Promise<unknown>) => fn()),
  getRatingsWithDedup: vi.fn(async () => []),
}));

vi.mock('@mobazha/core/config/env', async importOriginal => {
  const actual = await importOriginal<typeof import('@mobazha/core/config/env')>();
  return {
    ...actual,
    isSovereignMode: () => mockIsSovereignMode(),
  };
});

vi.mock('@mobazha/core', async importOriginal => {
  const actual = await importOriginal<typeof import('@mobazha/core')>();
  return {
    ...actual,
    useI18n: () => ({ t: (key: string) => key, locale: 'en' as const }),
    useCurrency: () => ({
      formatPrice: () => '$1.00',
      renderPairedPrice: () => '$1.00',
    }),
    useFeature: () => true,
    useMarketplaceContext: () => mockMarketplaceContext,
    useNativeMarketplaceAttribution: () => ({
      trackImpression: vi.fn(),
      trackListingClick: vi.fn(),
      trackCheckoutHandoff: mockTrackCheckoutHandoff,
    }),
    useUserStore: () => ({ isAuthenticated: false, profile: null }),
    useCartStore: (selector: (state: { addItem: () => void }) => unknown) =>
      selector({ addItem: vi.fn() }),
    useCartDrawerStore: (selector: (state: { open: () => void }) => unknown) =>
      selector({ open: vi.fn() }),
    useChatStore: (selector: (state: { openDrawerWithPeer: () => void }) => unknown) =>
      selector({ openDrawerWithPeer: vi.fn() }),
    usePaymentMethods: () => mockUsePaymentMethods(),
    productDataService: {
      ...actual.productDataService,
      getPublicProduct: (...args: unknown[]) => mockGetPublicProduct(...args),
    },
    profileApi: {
      ...actual.profileApi,
      getProfile: vi.fn().mockResolvedValue(null),
    },
    discountsApi: {
      ...actual.discountsApi,
      getApplicableDiscounts: vi.fn().mockResolvedValue([]),
    },
    universalSwapService: {
      initializeReadOnly: vi.fn().mockResolvedValue(undefined),
      getListing: vi.fn().mockResolvedValue(null),
    },
  };
});

vi.mock('@mobazha/core/stores', () => ({
  useGuestCartStore: (selector: (state: { addItem: () => void }) => unknown) =>
    selector({ addItem: vi.fn() }),
}));

const authoritativeRwaProduct = {
  slug: 'psa-charizard',
  vendorID: { peerID: 'QmSeller' },
  metadata: { contractType: 'RWA_TOKEN', pricingCurrency: { code: 'USD', divisibility: 2 } },
  item: {
    title: 'PSA Charizard',
    price: 100,
    blockchain: 'solana',
    tags: [
      'collectibles.fulfillment=nft',
      'collectibles.cert_number=PSA-123',
      'collectibles.hub_slot_id=slot-1',
      'collectibles.hub_location=source-custody',
    ],
  },
} as unknown as Product;

const legacyRwaProduct = {
  slug: 'legacy-rwa',
  vendorID: { peerID: 'QmSeller' },
  metadata: { contractType: 'RWA_TOKEN', pricingCurrency: { code: 'USD', divisibility: 2 } },
  item: {
    title: 'Legacy RWA',
    price: 50,
    blockchain: 'solana',
    tokenAddress: 'mint-legacy',
  },
} as unknown as Product;

describe('useProductDetail handleBuyNow RWA gating', () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockGetPublicProduct.mockReset();
    mockTrackCheckoutHandoff.mockReset();
    mockIsSovereignMode.mockReset();
    mockIsSovereignMode.mockReturnValue(false);
    mockUsePaymentMethods.mockReset();
    mockUsePaymentMethods.mockReturnValue({
      crypto: ['BTC'],
      activeFiat: [],
      isLoading: false,
    });
    mockMarketplaceContext = {
      isSubMarket: true,
      subdomain: 'collectibles',
      domain: null,
      marketplaceKey: 'collectibles',
      config: {
        id: 'mp-1',
        attribution: {
          marketplaceId: 'mp-1',
          utmSource: 'collectibles',
        },
      },
      loading: false,
      error: null,
      retry: vi.fn(),
    };
  });

  it('keeps direct-payment purchase available when hosted methods are absent in sovereign mode', async () => {
    mockIsSovereignMode.mockReturnValue(true);
    mockUsePaymentMethods.mockReturnValue({
      crypto: [],
      activeFiat: [],
      isLoading: false,
    });
    mockGetPublicProduct.mockResolvedValue({
      product: authoritativeRwaProduct,
      isOffline: false,
    });

    const { result } = renderHook(() => useProductDetail({ slug: 'psa-charizard' }));

    await waitFor(() => {
      expect(result.current.product).not.toBeNull();
      expect(result.current.paymentAvailable).toBe(true);
    });
  });

  it('navigates authoritative RWA title listings to checkout with quantity=1', async () => {
    mockGetPublicProduct.mockResolvedValue({
      product: authoritativeRwaProduct,
      isOffline: false,
    });

    const { result } = renderHook(() => useProductDetail({ slug: 'psa-charizard' }));

    await waitFor(() => {
      expect(result.current.product).not.toBeNull();
      expect(result.current.isCollectibleTitleListing).toBe(true);
    });

    act(() => {
      result.current.setQuantity(3);
    });

    act(() => {
      result.current.handleBuyNow();
    });

    expect(mockPush).toHaveBeenCalledWith(
      '/checkout?slug=psa-charizard&peerID=QmSeller&quantity=1'
    );
  });

  it('blocks legacy non-authoritative RWA listings from checkout', async () => {
    mockGetPublicProduct.mockResolvedValue({
      product: legacyRwaProduct,
      isOffline: false,
    });

    const { result } = renderHook(() => useProductDetail({ slug: 'legacy-rwa' }));

    await waitFor(() => {
      expect(result.current.product).not.toBeNull();
      expect(result.current.isCollectibleTitleListing).toBe(false);
    });

    act(() => {
      result.current.handleBuyNow();
    });

    expect(mockPush).not.toHaveBeenCalled();
  });

  it('tracks checkout handoff before normal checkout navigation in sub-market mode', async () => {
    mockGetPublicProduct.mockResolvedValue({
      product: authoritativeRwaProduct,
      isOffline: false,
    });

    const { result } = renderHook(() => useProductDetail({ slug: 'psa-charizard' }));

    await waitFor(() => {
      expect(result.current.product).not.toBeNull();
    });

    act(() => {
      result.current.handleBuyNow();
    });

    expect(mockTrackCheckoutHandoff).toHaveBeenCalledWith({
      listingSlug: 'psa-charizard',
      peerID: 'QmSeller',
    });
    expect(mockPush).toHaveBeenCalledWith(
      '/checkout?slug=psa-charizard&peerID=QmSeller&quantity=1'
    );
  });

  it('tracks checkout handoff before guest checkout navigation in sovereign mode', async () => {
    mockIsSovereignMode.mockReturnValue(true);
    mockGetPublicProduct.mockResolvedValue({
      product: authoritativeRwaProduct,
      isOffline: false,
    });

    const { result } = renderHook(() => useProductDetail({ slug: 'psa-charizard' }));

    await waitFor(() => {
      expect(result.current.product).not.toBeNull();
    });

    act(() => {
      result.current.handleBuyNow();
    });

    expect(mockTrackCheckoutHandoff).toHaveBeenCalledWith({
      listingSlug: 'psa-charizard',
      peerID: 'QmSeller',
    });
    expect(mockPush).toHaveBeenCalledWith('/guest-checkout');
  });
});
