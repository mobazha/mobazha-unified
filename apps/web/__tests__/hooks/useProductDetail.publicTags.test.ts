// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Product } from '@mobazha/core';
import { buildCollectibleListingTagEntries } from '@mobazha/core/collectibles/listingTags';
import { useProductDetail } from '@/hooks/useProductDetail';

const mockGetPublicProduct = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
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
    isSovereignMode: () => false,
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
    useUserStore: () => ({ isAuthenticated: false, profile: null }),
    useCartStore: (selector: (state: { addItem: () => void }) => unknown) =>
      selector({ addItem: vi.fn() }),
    useCartDrawerStore: (selector: (state: { open: () => void }) => unknown) =>
      selector({ open: vi.fn() }),
    useChatStore: (selector: (state: { openDrawerWithPeer: () => void }) => unknown) =>
      selector({ openDrawerWithPeer: vi.fn() }),
    usePaymentMethods: () => ({
      crypto: ['ETH'],
      activeFiat: [],
      isLoading: false,
    }),
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

describe('useProductDetail public tag filtering', () => {
  beforeEach(() => {
    mockGetPublicProduct.mockReset();
  });

  it('exposes discovery tags only and preserves scope tag from raw listing tags', async () => {
    const hubTags = buildCollectibleListingTagEntries(
      'hub_slot_id',
      'source_550e8400-e29b-41d4-a716-446655440000'
    );
    const certTags = buildCollectibleListingTagEntries('cert_number', 'PSA-1234567890');

    const product = {
      slug: 'psa-charizard',
      vendorID: { peerID: 'QmSeller' },
      metadata: {
        contractType: 'RWA_TOKEN',
        pricingCurrency: { code: 'ETH', divisibility: 18 },
        acceptedCurrencies: ['ETH'],
      },
      item: {
        title: 'PSA Charizard',
        price: 100,
        blockchain: 'solana',
        tags: [
          'm2-wilson',
          'graded-card',
          'testnet',
          'mtg',
          'collectibles.fulfillment=nft',
          ...hubTags,
          ...certTags,
          'collectibles.hub_location=source-custody',
          'collectibles.grade=PSA 10',
        ],
      },
    } as unknown as Product;

    mockGetPublicProduct.mockResolvedValue({
      product,
      isOffline: false,
    });

    const { result } = renderHook(() => useProductDetail({ slug: 'psa-charizard' }));

    await waitFor(() => {
      expect(result.current.product).not.toBeNull();
    });

    expect(result.current.tags).toEqual(['m2-wilson', 'graded-card', 'testnet', 'mtg']);
    expect(result.current.relatedListingsScopeTag).toBe('m2-wilson');
    expect(result.current.collectibleTitleNetworkLabel).toBe('Solana');
  });
});
