import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';

const mockTrackImpression = vi.fn();
const mockTrackListingClick = vi.fn();
const mockSearchListings = vi.fn();
const mockSearchProfiles = vi.fn();
const mockUsePublicMarketplaceDetail = vi.fn();
const mockUseCommunityMarketplaceEnrichment = vi.fn();

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
    usePublicMarketplaceDetail: (...args: unknown[]) => mockUsePublicMarketplaceDetail(...args),
    useCommunityMarketplaceEnrichment: (...args: unknown[]) =>
      mockUseCommunityMarketplaceEnrichment(...args),
  };
});

import { MarketplaceHomePage } from '@/components/MarketplaceDiscovery/MarketplaceHomePage';

describe('MarketplaceHomePage attribution', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchListings.mockImplementation((params: { sortBy?: string }) => {
      const isPopular = params.sortBy === 'online-desc';
      return Promise.resolve({
        products: [
          {
            slug: isPopular ? 'popular-charizard' : 'latest-charizard',
            title: isPopular ? 'Popular Charizard' : 'Latest Charizard',
            vendorPeerID: 'QmSeller',
            averageRating: isPopular ? 4.7 : 4.8,
            ratingCount: isPopular ? 8 : 12,
          },
        ],
      });
    });
    mockSearchProfiles.mockResolvedValue({ users: [] });
    mockUsePublicMarketplaceDetail.mockReturnValue({
      detail: null,
      loading: false,
      error: null,
      refresh: vi.fn(),
    });
    mockUseCommunityMarketplaceEnrichment.mockReturnValue({
      listingPreviews: [],
      sellerProfiles: {},
    });
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
      listingSlug: 'popular-charizard',
      peerID: 'QmSeller',
    });
  });

  it('renders curated picks once and keeps popular/latest discovery feeds unchanged', async () => {
    mockUsePublicMarketplaceDetail.mockReturnValue({
      detail: {
        marketplace: {
          id: 'mp-1',
          name: 'Curated Market',
          slug: 'curated-market',
          publicURL: 'https://example.com',
          joinMode: 'approval',
          catalogMode: 'curated',
          discoverability: 'public',
          sellerEntryMode: 'operator_invited',
          vertical: 'collectibles',
          sellerCount: 1,
          productCount: 3,
        },
        sellers: [
          { peerID: 'QmCurated', productGroups: [{ id: 1, name: 'Sports Cards', itemCount: 5 }] },
        ],
        featured: [{ type: 'listing', peerID: 'QmCurated', slug: 'curated-listing', sortOrder: 1 }],
        banners: [],
        listings: { listings: [], total: 0, page: 1, pageSize: 24, totalPage: 0 },
      },
      loading: false,
      error: null,
      refresh: vi.fn(),
    });
    mockUseCommunityMarketplaceEnrichment.mockReturnValue({
      listingPreviews: [
        {
          key: 'QmCurated:curated-listing',
          slug: 'curated-listing',
          peerID: 'QmCurated',
          title: 'Curated Listing',
          vendorName: 'Curated Store',
          loading: false,
          failed: false,
        },
      ],
      sellerProfiles: {},
    });
    mockSearchListings.mockImplementation((params: { sortBy?: string }) => {
      const isPopular = params.sortBy === 'online-desc';
      return Promise.resolve({
        products: [
          {
            slug: isPopular ? 'popular-only' : 'latest-only',
            title: isPopular ? 'Popular Only' : 'Latest Only',
            vendorPeerID: 'QmSeller',
            averageRating: isPopular ? 4.7 : 4.8,
            ratingCount: isPopular ? 8 : 12,
          },
        ],
      });
    });

    render(<MarketplaceHomePage />);

    const curatedButton = await screen.findByTestId(
      'product-click-marketplaceStarter.curatedTitle'
    );
    const popularButton = await screen.findByTestId(
      'product-click-marketplaceStarter.popularTitle'
    );
    const latestButton = await screen.findByTestId('product-click-marketplaceStarter.latestTitle');

    fireEvent.click(curatedButton);
    fireEvent.click(popularButton);
    fireEvent.click(latestButton);

    expect(mockTrackListingClick).toHaveBeenNthCalledWith(1, {
      listingSlug: 'curated-listing',
      peerID: 'QmCurated',
    });
    expect(mockTrackListingClick).toHaveBeenNthCalledWith(2, {
      listingSlug: 'popular-only',
      peerID: 'QmSeller',
    });
    expect(mockTrackListingClick).toHaveBeenNthCalledWith(3, {
      listingSlug: 'latest-only',
      peerID: 'QmSeller',
    });
  });

  it('omits curated section when curated previews are not enriched', async () => {
    mockUsePublicMarketplaceDetail.mockReturnValue({
      detail: {
        marketplace: {
          id: 'mp-1',
          name: 'Curated Market',
          slug: 'curated-market',
          publicURL: 'https://example.com',
          joinMode: 'approval',
          catalogMode: 'curated',
          discoverability: 'public',
          sellerEntryMode: 'operator_invited',
          vertical: 'collectibles',
          sellerCount: 1,
          productCount: 3,
        },
        sellers: [{ peerID: 'QmCurated', productGroups: [] }],
        featured: [{ type: 'listing', peerID: 'QmCurated', slug: 'curated-listing', sortOrder: 1 }],
        banners: [],
        listings: { listings: [], total: 0, page: 1, pageSize: 24, totalPage: 0 },
      },
      loading: false,
      error: null,
      refresh: vi.fn(),
    });
    mockUseCommunityMarketplaceEnrichment.mockReturnValue({
      listingPreviews: [
        {
          key: 'QmCurated:curated-listing',
          slug: 'curated-listing',
          peerID: 'QmCurated',
          title: 'Curated Listing',
          loading: false,
          failed: true,
        },
      ],
      sellerProfiles: {},
    });

    render(<MarketplaceHomePage />);

    await waitFor(() => {
      expect(screen.queryByTestId('product-click-marketplaceStarter.curatedTitle')).toBeNull();
    });
    expect(screen.getByTestId('product-click-marketplaceStarter.popularTitle')).toBeInTheDocument();
    expect(screen.getByTestId('product-click-marketplaceStarter.latestTitle')).toBeInTheDocument();
  });
});
