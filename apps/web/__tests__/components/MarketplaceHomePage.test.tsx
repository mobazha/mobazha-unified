// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';

const mockTrackImpression = vi.fn();
const mockTrackListingClick = vi.fn();
const mockSearchListings = vi.fn();
const mockSearchProfiles = vi.fn();
const mockUsePublicMarketplaceDetail = vi.fn();
const mockUseCommunityMarketplaceEnrichment = vi.fn();
const mockUseCuration = vi.fn();

vi.mock('@/components', () => ({
  Header: () => <div data-testid="header" />,
  Footer: () => <div data-testid="footer" />,
  ProductSection: ({
    title,
    products,
    isLoading,
    onProductClick,
  }: {
    title: string;
    products: Array<{
      slug: string;
      vendorPeerID?: string;
      title?: string;
      vendorName?: string;
      vendorAvatar?: string;
    }>;
    isLoading?: boolean;
    onProductClick?: (product: { slug: string; vendorPeerID?: string }) => void;
  }) => (
    <div data-testid={`product-section-${title}`} data-loading={isLoading ? 'true' : 'false'}>
      {isLoading ? <div data-testid={`product-section-loading-${title}`}>Loading</div> : null}
      {!isLoading
        ? products.map(product => (
            <button
              key={`${product.vendorPeerID ?? 'unknown'}:${product.slug}`}
              data-testid={`product-click-${title}-${product.slug}`}
              data-vendor-name={product.vendorName}
              data-vendor-avatar={product.vendorAvatar}
              onClick={() => onProductClick?.(product)}
            >
              {product.title ?? product.slug}
            </button>
          ))
        : null}
    </div>
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
    useCuration: () => mockUseCuration(),
    taxonomyForVertical: () => [],
    formatUserName: actual.formatUserName,
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

const curatedMarketplaceConfig = {
  id: 'mp-1',
  vertical: 'collectibles',
  catalogMode: 'curated' as const,
  catalogQuery: '*',
  allowedPeers: ['QmSeller'],
  sellers: [],
  featured: [],
  brand: { name: 'Curated Market' },
  taxonomy: [],
  policy: {},
  buyerAccessMode: 'open' as const,
  sellerReviewMode: 'manual' as const,
  discoverability: 'public',
  sellerEntryMode: 'operator_invited',
  attribution: { utmSource: 'collectibles', marketplaceId: 'mp-1' },
};

const openMarketplaceConfig = {
  ...curatedMarketplaceConfig,
  catalogMode: 'open' as const,
  catalogQuery: 'sneakers',
};

function buildPublicDetail(
  overrides: {
    featured?: Array<{ type: string; peerID?: string; slug?: string; sortOrder?: number }>;
    listings?: Array<{ peerID: string; slug: string }>;
    sellers?: Array<{ peerID: string; productGroups?: Array<{ id: number; name: string }> }>;
  } = {}
) {
  return {
    detail: {
      marketplace: {
        id: 'mp-1',
        name: 'Curated Market',
        slug: 'curated-market',
        publicURL: 'https://example.com',
        buyerAccessMode: 'open',
        sellerReviewMode: 'manual',
        catalogMode: 'curated',
        discoverability: 'public',
        sellerEntryMode: 'operator_invited',
        vertical: 'collectibles',
        sellerCount: 1,
        productCount: 3,
      },
      sellers: overrides.sellers ?? [
        { peerID: 'QmCurated', productGroups: [{ id: 1, name: 'Sports Cards', itemCount: 5 }] },
      ],
      featured: overrides.featured ?? [
        { type: 'listing', peerID: 'QmCurated', slug: 'curated-listing', sortOrder: 1 },
      ],
      banners: [],
      listings: {
        listings: overrides.listings ?? [{ peerID: 'QmCurated', slug: 'fallback-listing' }],
        total: 1,
      },
    },
    loading: false,
    error: null,
    refresh: vi.fn(),
  };
}

describe('MarketplaceHomePage attribution', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseCuration.mockReturnValue({
      loading: false,
      error: null,
      retry: vi.fn(),
      config: curatedMarketplaceConfig,
    });
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
      listingsLoading: false,
      profilesLoading: false,
    });
  });

  it('tracks impression after marketplace config is ready', async () => {
    render(<MarketplaceHomePage />);

    await waitFor(() => {
      expect(mockTrackImpression).toHaveBeenCalledTimes(1);
    });
  });

  it('does not query global search feeds in curated mode', async () => {
    mockUsePublicMarketplaceDetail.mockReturnValue(buildPublicDetail());
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
        {
          key: 'QmCurated:fallback-listing',
          slug: 'fallback-listing',
          peerID: 'QmCurated',
          title: 'Fallback Listing',
          vendorName: 'Curated Store',
          loading: false,
          failed: false,
        },
      ],
      sellerProfiles: {},
      listingsLoading: false,
      profilesLoading: false,
    });

    render(<MarketplaceHomePage />);

    await waitFor(() => {
      expect(mockSearchListings).not.toHaveBeenCalled();
      expect(mockSearchProfiles).not.toHaveBeenCalled();
    });
  });

  it('tracks listing_click only on actual product-card click callback', async () => {
    mockUsePublicMarketplaceDetail.mockReturnValue(buildPublicDetail());
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
      listingsLoading: false,
      profilesLoading: false,
    });

    render(<MarketplaceHomePage />);

    const curatedButton = await screen.findByTestId(
      'product-click-marketplaceStarter.curatedTitle-curated-listing'
    );
    fireEvent.click(curatedButton);

    expect(mockTrackListingClick).toHaveBeenCalledWith({
      listingSlug: 'curated-listing',
      peerID: 'QmCurated',
    });
  });

  it('renders only authorized curated refs and blocks unrelated seller listings', async () => {
    mockUsePublicMarketplaceDetail.mockReturnValue(buildPublicDetail());
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
        {
          key: 'QmCurated:fallback-listing',
          slug: 'fallback-listing',
          peerID: 'QmCurated',
          title: 'Fallback Listing',
          vendorName: 'Curated Store',
          loading: false,
          failed: false,
        },
      ],
      sellerProfiles: {},
      listingsLoading: false,
      profilesLoading: false,
    });
    mockSearchListings.mockImplementation(() =>
      Promise.resolve({
        products: [
          {
            slug: 'popular-only',
            title: 'Popular Only',
            vendorPeerID: 'QmSeller',
            averageRating: 4.7,
            ratingCount: 8,
          },
        ],
      })
    );

    render(<MarketplaceHomePage />);

    expect(
      await screen.findByTestId('product-click-marketplaceStarter.curatedTitle-curated-listing')
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('product-click-marketplaceStarter.latestTitle-fallback-listing')
    ).toBeInTheDocument();
    expect(screen.queryByTestId('product-section-marketplaceStarter.popularTitle')).toBeNull();
    expect(
      screen.queryByTestId('product-click-marketplaceStarter.popularTitle-popular-only')
    ).toBeNull();

    fireEvent.click(
      screen.getByTestId('product-click-marketplaceStarter.curatedTitle-curated-listing')
    );
    fireEvent.click(
      screen.getByTestId('product-click-marketplaceStarter.latestTitle-fallback-listing')
    );

    expect(mockTrackListingClick).toHaveBeenNthCalledWith(1, {
      listingSlug: 'curated-listing',
      peerID: 'QmCurated',
    });
    expect(mockTrackListingClick).toHaveBeenNthCalledWith(2, {
      listingSlug: 'fallback-listing',
      peerID: 'QmCurated',
    });
    expect(mockTrackListingClick).not.toHaveBeenCalledWith({
      listingSlug: 'popular-only',
      peerID: 'QmSeller',
    });
  });

  it('omits curated section when curated previews are not enriched', async () => {
    mockUsePublicMarketplaceDetail.mockReturnValue(buildPublicDetail());
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
      listingsLoading: false,
      profilesLoading: false,
    });

    render(<MarketplaceHomePage />);

    await waitFor(() => {
      expect(screen.queryByTestId('product-section-marketplaceStarter.curatedTitle')).toBeNull();
    });
    expect(screen.queryByTestId('product-section-marketplaceStarter.popularTitle')).toBeNull();
    expect(screen.queryByTestId('product-section-marketplaceStarter.latestTitle')).toBeNull();
    expect(mockSearchListings).not.toHaveBeenCalled();
  });

  it('keeps open/query marketplace discovery feeds via search', async () => {
    mockUseCuration.mockReturnValue({
      loading: false,
      error: null,
      retry: vi.fn(),
      config: openMarketplaceConfig,
    });

    render(<MarketplaceHomePage />);

    await waitFor(() => {
      expect(mockSearchListings).toHaveBeenCalled();
    });

    expect(
      await screen.findByTestId('product-click-marketplaceStarter.popularTitle-popular-charizard')
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('product-click-marketplaceStarter.latestTitle-latest-charizard')
    ).toBeInTheDocument();
  });

  it('prefers seller profile display name when curated preview omits vendorName', async () => {
    mockUsePublicMarketplaceDetail.mockReturnValue(buildPublicDetail());
    mockUseCommunityMarketplaceEnrichment.mockReturnValue({
      listingPreviews: [
        {
          key: 'QmCurated:curated-listing',
          slug: 'curated-listing',
          peerID: 'QmCurated',
          title: 'Curated Listing',
          loading: false,
          failed: false,
        },
      ],
      sellerProfiles: {
        QmCurated: {
          peerID: 'QmCurated',
          displayName: "Alice's Digital Shop",
          avatarUrl: 'https://example.com/alice-avatar.png',
        },
      },
      listingsLoading: false,
      profilesLoading: false,
    });

    render(<MarketplaceHomePage />);

    const curatedProduct = await screen.findByTestId(
      'product-click-marketplaceStarter.curatedTitle-curated-listing'
    );
    expect(curatedProduct).toHaveAttribute('data-vendor-name', "Alice's Digital Shop");
    expect(curatedProduct).toHaveAttribute(
      'data-vendor-avatar',
      'https://example.com/alice-avatar.png'
    );
    expect(curatedProduct.getAttribute('data-vendor-name')).not.toBe('QmCurated');
  });

  it('includes listing-only seller peer IDs in enrichment profile fetch', async () => {
    mockUsePublicMarketplaceDetail.mockReturnValue(
      buildPublicDetail({
        sellers: [],
        featured: [{ type: 'listing', peerID: 'QmCurated', slug: 'curated-listing', sortOrder: 1 }],
        listings: [],
      })
    );
    mockUseCommunityMarketplaceEnrichment.mockReturnValue({
      listingPreviews: [
        {
          key: 'QmCurated:curated-listing',
          slug: 'curated-listing',
          peerID: 'QmCurated',
          title: 'Curated Listing',
          loading: false,
          failed: false,
        },
      ],
      sellerProfiles: {},
      listingsLoading: false,
      profilesLoading: false,
    });

    render(<MarketplaceHomePage />);

    await waitFor(() => {
      expect(mockUseCommunityMarketplaceEnrichment).toHaveBeenCalled();
    });

    const sellerPeerIDs = mockUseCommunityMarketplaceEnrichment.mock.calls[0]?.[1] as string[];
    expect(sellerPeerIDs).toContain('QmCurated');
  });

  it('keeps curated loading UI stable while public detail is still loading', async () => {
    mockUsePublicMarketplaceDetail.mockReturnValue({
      detail: null,
      loading: true,
      error: null,
      refresh: vi.fn(),
    });
    mockUseCommunityMarketplaceEnrichment.mockReturnValue({
      listingPreviews: [],
      sellerProfiles: {},
      listingsLoading: false,
      profilesLoading: false,
    });

    render(<MarketplaceHomePage />);

    await waitFor(() => {
      expect(mockSearchListings).not.toHaveBeenCalled();
      expect(mockSearchProfiles).not.toHaveBeenCalled();
    });

    expect(screen.queryByTestId('product-section-marketplaceStarter.popularTitle')).toBeNull();
    expect(screen.getByTestId('product-section-marketplaceStarter.latestTitle')).toHaveAttribute(
      'data-loading',
      'true'
    );
    expect(
      screen.getByTestId('product-section-loading-marketplaceStarter.latestTitle')
    ).toBeInTheDocument();
  });

  it('shows a retryable unavailable state when curated public detail fails', async () => {
    const refreshPublicDetail = vi.fn();
    mockUsePublicMarketplaceDetail.mockReturnValue({
      detail: null,
      loading: false,
      error: 'Marketplace detail request failed',
      refresh: refreshPublicDetail,
    });

    render(<MarketplaceHomePage />);

    expect(screen.getByText('marketplaceStarter.errorTitle')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'common.retry' }));

    expect(refreshPublicDetail).toHaveBeenCalledTimes(1);
    expect(mockSearchListings).not.toHaveBeenCalled();
    expect(mockSearchProfiles).not.toHaveBeenCalled();
  });

  it('keeps curated Latest loading while seller profiles are still enriching', async () => {
    mockUsePublicMarketplaceDetail.mockReturnValue(buildPublicDetail());
    mockUseCommunityMarketplaceEnrichment.mockReturnValue({
      listingPreviews: [
        {
          key: 'QmCurated:fallback-listing',
          slug: 'fallback-listing',
          peerID: 'QmCurated',
          title: 'Fallback Listing',
          loading: false,
          failed: false,
        },
      ],
      sellerProfiles: {},
      listingsLoading: false,
      profilesLoading: true,
    });

    render(<MarketplaceHomePage />);

    await waitFor(() => {
      expect(mockSearchListings).not.toHaveBeenCalled();
    });

    expect(screen.queryByTestId('product-section-marketplaceStarter.popularTitle')).toBeNull();
    expect(screen.getByTestId('product-section-marketplaceStarter.latestTitle')).toHaveAttribute(
      'data-loading',
      'true'
    );
    expect(
      screen.getByTestId('product-section-loading-marketplaceStarter.latestTitle')
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId('product-click-marketplaceStarter.latestTitle-fallback-listing')
    ).toBeNull();
  });
});
