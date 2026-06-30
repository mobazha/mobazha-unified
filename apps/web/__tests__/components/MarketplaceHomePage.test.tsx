import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';

const mockTrackImpression = vi.fn();
const mockTrackListingClick = vi.fn();
const mockSearchListings = vi.fn();
const mockSearchProfiles = vi.fn();

vi.mock('@/components', () => ({
  Header: () => <div data-testid="header" />,
  Footer: () => <div data-testid="footer" />,
  ProductSection: ({
    title,
    products,
    onProductClick,
  }: {
    title: string;
    products: Array<{ slug: string; vendorPeerID?: string }>;
    onProductClick?: (product: { slug: string; vendorPeerID?: string }) => void;
  }) => (
    <button
      data-testid={`product-click-${title}`}
      onClick={() => {
        const first = products[0];
        if (first) onProductClick?.(first);
      }}
    >
      {title}
    </button>
  ),
}));

vi.mock('@/components/layouts', () => ({
  Container: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
}));

vi.mock('@/components/ui/input-compat', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));

vi.mock('@/components/CommunityMarketplace', () => ({
  MarketplaceTrustFooter: () => <div data-testid="trust-footer" />,
}));

vi.mock('@mobazha/core/services/api/products', async importOriginal => {
  const actual = await importOriginal<typeof import('@mobazha/core/services/api/products')>();
  return {
    ...actual,
    searchListings: (...args: unknown[]) => mockSearchListings(...args),
    searchProfiles: (...args: unknown[]) => mockSearchProfiles(...args),
    fetchLatestListings: vi.fn(),
    fetchFeaturedListings: vi.fn(),
  };
});
vi.mock('@mobazha/core', async importOriginal => {
  const actual = await importOriginal<typeof import('@mobazha/core')>();
  return {
    ...actual,
    useI18n: () => ({ t: (key: string) => key }),
    useCuration: () => ({
      loading: false,
      error: null,
      retry: vi.fn(),
      config: {
        id: 'mp-1',
        vertical: 'collectibles',
        catalogMode: 'curated',
        catalogQuery: '*',
        allowedPeers: ['QmSeller'],
        sellers: [],
        featured: [],
        brand: { name: 'Curated Market' },
        taxonomy: [],
        policy: {},
        joinMode: 'approval',
        discoverability: 'public',
        sellerEntryMode: 'operator_invited',
        attribution: { utmSource: 'collectibles', marketplaceId: 'mp-1' },
      },
    }),
    taxonomyForVertical: () => [],
    formatUserName: () => 'Seller',
    getImageUrl: () => undefined,
    productCardPriceFieldsFromListItem: () => ({
      price: 12,
      currencyCode: 'USD',
      divisibility: 2,
    }),
    productDataService: {
      getFeaturedStores: vi.fn().mockResolvedValue([]),
    },
    useNativeMarketplaceAttribution: () => ({
      trackImpression: mockTrackImpression,
      trackListingClick: mockTrackListingClick,
      trackCheckoutHandoff: vi.fn(),
    }),
  };
});

import { MarketplaceHomePage } from '@/components/MarketplaceDiscovery/MarketplaceHomePage';

describe('MarketplaceHomePage attribution', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchListings.mockResolvedValue({
      products: [
        {
          slug: 'psa-charizard',
          title: 'PSA Charizard',
          vendorPeerID: 'QmSeller',
          averageRating: 4.8,
          ratingCount: 12,
        },
      ],
    });
    mockSearchProfiles.mockResolvedValue({ users: [] });
  });

  it('tracks impression after marketplace config is ready', async () => {
    render(<MarketplaceHomePage />);

    await waitFor(() => {
      expect(mockTrackImpression).toHaveBeenCalledTimes(1);
    });
  });

  it('tracks listing_click only on actual product-card click callback', async () => {
    render(<MarketplaceHomePage />);

    const popularButton = await screen.findByTestId(
      'product-click-marketplaceStarter.popularTitle'
    );
    fireEvent.click(popularButton);

    expect(mockTrackListingClick).toHaveBeenCalledWith({
      listingSlug: 'psa-charizard',
      peerID: 'QmSeller',
    });
  });
});
