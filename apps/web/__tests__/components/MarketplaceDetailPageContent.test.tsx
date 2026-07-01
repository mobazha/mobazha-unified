import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('@/components', () => ({
  Header: () => <div data-testid="header" />,
  Footer: () => <div data-testid="footer" />,
}));

vi.mock('@/components/MobilePageHeader/MobilePageHeader', () => ({
  MobilePageHeader: ({ title }: { title: string }) => <div>{title}</div>,
}));

const mockTrackImpression = vi.fn();
const mockTrackListingClick = vi.fn();
const mockUseCommunityMarketplaceEnrichment = vi.fn();

vi.mock('@/components/CommunityMarketplace', () => ({
  CommunityListingCard: ({
    preview,
    sellerProfile,
    onClick,
  }: {
    preview: { slug: string; vendorName?: string };
    sellerProfile?: { displayName?: string };
    onClick?: React.MouseEventHandler<HTMLAnchorElement>;
  }) => (
    <a href={`/product/${preview.slug}`} data-testid={`listing-${preview.slug}`} onClick={onClick}>
      {sellerProfile?.displayName ?? preview.slug}
    </a>
  ),
  CommunitySellerCard: ({ seller }: { seller: { peerID: string } }) => (
    <div data-testid={`seller-${seller.peerID}`}>{seller.peerID}</div>
  ),
  CollectibleMarketplaceSignal: () => null,
  MarketplaceLogo: () => <div data-testid="marketplace-logo" />,
  MarketplaceTrustStrip: () => null,
}));

const mockUsePublicMarketplaceDetail = vi.fn();

vi.mock('@mobazha/core', async importOriginal => {
  const actual = await importOriginal<typeof import('@mobazha/core')>();
  return {
    ...actual,
    usePublicMarketplaceDetail: (...args: unknown[]) => mockUsePublicMarketplaceDetail(...args),
    useCommunityMarketplaceEnrichment: (...args: unknown[]) =>
      mockUseCommunityMarketplaceEnrichment(...args),
    useCollectibleMarketplaceAttribution: () => null,
    useNativeMarketplaceAttribution: () => ({
      trackImpression: mockTrackImpression,
      trackListingClick: mockTrackListingClick,
      trackCheckoutHandoff: vi.fn(),
    }),
    useI18n: () => ({
      t: (key: string) => key,
      formatRelativeTime: () => '1d',
      locale: 'en',
    }),
    isCollectibleMarketplaceVertical: () => false,
    marketplaceBuyerAccessModeKey: () => 'marketplace.enums.buyerAccessMode.open',
    marketplaceSellerReviewModeKey: () => 'marketplace.enums.sellerReviewMode.manual',
    marketplaceVerticalKey: () => 'marketplace.vertical.general',
    MARKETPLACE_CATALOG_MODE_KEYS: {
      open: 'marketplace.enums.catalogMode.open',
      curated: 'marketplace.enums.catalogMode.curated',
    },
    MARKETPLACE_DISCOVERABILITY_KEYS: {
      public: 'marketplace.enums.discoverability.public',
      unlisted: 'marketplace.enums.discoverability.unlisted',
    },
    MARKETPLACE_SELLER_ENTRY_MODE_KEYS: {
      operator_invited: 'marketplace.enums.sellerEntryMode.operator_invited',
      seller_self_serve: 'marketplace.enums.sellerEntryMode.seller_self_serve',
    },
    MARKETPLACE_BUYER_ACCESS_MODE_KEYS: {
      open: 'marketplace.enums.buyerAccessMode.open',
    },
    MARKETPLACE_SELLER_REVIEW_MODE_KEYS: {
      auto: 'marketplace.enums.sellerReviewMode.auto',
      manual: 'marketplace.enums.sellerReviewMode.manual',
    },
    filterCollectibleListingPreviews: (items: unknown[]) => items,
    resolveCollectibleMarketplaceDisplayCopy: () => null,
    communityProductHref: () => '/product/test',
    appendCollectibleAttributionToHref: (href: string) => href,
    COLLECTIBLE_MARKETPLACE_LISTINGS_SECTION_ID: 'listings',
    COLLECTIBLE_MARKETPLACE_CATEGORY_FILTERS: ['all'],
  };
});

import { MarketplaceDetailPageContent } from '@/components/CommunityMarketplace/MarketplaceDetailPageContent';

const baseMarketplace = {
  id: 'mp-1',
  name: 'Test Market',
  slug: 'test-market',
  description: 'A native marketplace',
  publicURL: 'https://test.example',
  buyerAccessMode: 'open',
  sellerReviewMode: 'manual',
  catalogMode: 'curated',
  discoverability: 'public',
  sellerEntryMode: 'seller_self_serve',
  vertical: 'general',
  sellerCount: 1,
  productCount: 2,
};

describe('MarketplaceDetailPageContent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseCommunityMarketplaceEnrichment.mockReturnValue({
      listingPreviews: [
        {
          key: 'listing-1',
          slug: 'psa-charizard',
          peerID: 'QmSeller',
          title: 'PSA Charizard',
          vendorName: 'Seller',
          loading: false,
        },
      ],
      sellerProfiles: {},
    });
    mockUsePublicMarketplaceDetail.mockReturnValue({
      detail: {
        marketplace: baseMarketplace,
        sellers: [],
        featured: [],
        banners: [],
        listings: {
          listings: [{ peerID: 'QmSeller', slug: 'psa-charizard' }],
          total: 1,
          page: 1,
          pageSize: 24,
          totalPage: 1,
        },
      },
      loading: false,
      error: null,
      refresh: vi.fn(),
    });
  });

  it('shows apply-to-sell CTA for self-serve markets', () => {
    render(<MarketplaceDetailPageContent identifier="test-market" />);

    const cta = screen.getByTestId('marketplace-apply-to-sell');
    expect(cta).toHaveAttribute('href', '/marketplace/test-market/sell');
    expect(cta).toHaveTextContent('marketplace.detail.applyToSell');
  });

  it('shows admission policy without CTA for operator-invited markets', () => {
    mockUsePublicMarketplaceDetail.mockReturnValue({
      detail: {
        marketplace: { ...baseMarketplace, sellerEntryMode: 'operator_invited' },
        sellers: [],
        featured: [],
        banners: [],
        listings: {
          listings: [{ peerID: 'QmSeller', slug: 'psa-charizard' }],
          total: 1,
          page: 1,
          pageSize: 24,
          totalPage: 1,
        },
      },
      loading: false,
      error: null,
      refresh: vi.fn(),
    });

    render(<MarketplaceDetailPageContent identifier="test-market" />);

    expect(screen.queryByTestId('marketplace-apply-to-sell')).toBeNull();
    expect(
      screen.getByText('marketplace.detail.sellerAdmissionOperatorInvited')
    ).toBeInTheDocument();
  });

  it('tracks impression only after a marketplace detail successfully resolves', async () => {
    mockUsePublicMarketplaceDetail
      .mockReturnValueOnce({
        detail: null,
        loading: true,
        error: null,
        refresh: vi.fn(),
      })
      .mockReturnValue({
        detail: {
          marketplace: baseMarketplace,
          sellers: [],
          featured: [],
          banners: [],
          listings: {
            listings: [{ peerID: 'QmSeller', slug: 'psa-charizard' }],
            total: 1,
            page: 1,
            pageSize: 24,
            totalPage: 1,
          },
        },
        loading: false,
        error: null,
        refresh: vi.fn(),
      });

    const view = render(<MarketplaceDetailPageContent identifier="test-market" />);
    expect(mockTrackImpression).not.toHaveBeenCalled();

    view.rerender(<MarketplaceDetailPageContent identifier="test-market" />);

    await waitFor(() => {
      expect(mockTrackImpression).toHaveBeenCalledTimes(1);
    });
  });

  it('tracks listing click with exact slug and peerID payload', () => {
    render(<MarketplaceDetailPageContent identifier="test-market" />);

    fireEvent.click(screen.getByTestId('listing-psa-charizard'));

    expect(mockTrackListingClick).toHaveBeenCalledWith({
      listingSlug: 'psa-charizard',
      peerID: 'QmSeller',
    });
  });

  it('renders curated listings without hiding fallback catalog listings', () => {
    mockUseCommunityMarketplaceEnrichment.mockReturnValue({
      listingPreviews: [
        {
          key: 'curated-1',
          slug: 'featured-card',
          peerID: 'QmSellerA',
          title: 'Featured Card',
          vendorName: 'Seller A',
          loading: false,
        },
        {
          key: 'fallback-1',
          slug: 'catalog-one',
          peerID: 'QmSellerB',
          title: 'Catalog One',
          vendorName: 'Seller B',
          loading: false,
        },
        {
          key: 'fallback-2',
          slug: 'catalog-two',
          peerID: 'QmSellerC',
          title: 'Catalog Two',
          vendorName: 'Seller C',
          loading: false,
        },
      ],
      sellerProfiles: {},
    });
    mockUsePublicMarketplaceDetail.mockReturnValue({
      detail: {
        marketplace: baseMarketplace,
        sellers: [],
        featured: [{ type: 'listing', peerID: 'QmSellerA', slug: 'featured-card', sortOrder: 1 }],
        banners: [],
        listings: {
          listings: [
            { peerID: 'QmSellerB', slug: 'catalog-one' },
            { peerID: 'QmSellerC', slug: 'catalog-two' },
          ],
          total: 2,
          page: 1,
          pageSize: 24,
          totalPage: 1,
        },
      },
      loading: false,
      error: null,
      refresh: vi.fn(),
    });

    render(<MarketplaceDetailPageContent identifier="test-market" />);

    expect(screen.getByText('marketplace.detail.featuredListingsTitle')).toBeInTheDocument();
    expect(screen.getByText('marketplace.detail.allListingsTitle')).toBeInTheDocument();
    expect(screen.getByTestId('listing-featured-card')).toBeInTheDocument();
    expect(screen.getByTestId('listing-catalog-one')).toBeInTheDocument();
    expect(screen.getByTestId('listing-catalog-two')).toBeInTheDocument();
  });

  it('falls back to original seller list when curated sellers are all absent from detail.sellers', () => {
    mockUsePublicMarketplaceDetail.mockReturnValue({
      detail: {
        marketplace: baseMarketplace,
        sellers: [
          { peerID: 'QmSellerA', productGroups: [] },
          { peerID: 'QmSellerB', productGroups: [] },
        ],
        featured: [{ type: 'seller', peerID: 'QmMissingSeller', sortOrder: 1 }],
        banners: [],
        listings: {
          listings: [{ peerID: 'QmSellerA', slug: 'psa-charizard' }],
          total: 1,
          page: 1,
          pageSize: 24,
          totalPage: 1,
        },
      },
      loading: false,
      error: null,
      refresh: vi.fn(),
    });

    render(<MarketplaceDetailPageContent identifier="test-market" />);

    fireEvent.click(screen.getByText('marketplace.detail.sellersTab'));

    expect(screen.queryByTestId('seller-QmMissingSeller')).toBeNull();
    expect(screen.getByTestId('seller-QmSellerA')).toBeInTheDocument();
    expect(screen.getByTestId('seller-QmSellerB')).toBeInTheDocument();
  });

  it('requests seller profiles for listing-only sellers and passes profile name to listing cards', () => {
    mockUseCommunityMarketplaceEnrichment.mockReturnValue({
      listingPreviews: [
        {
          key: 'listing-1',
          slug: 'psa-charizard',
          peerID: 'QmSeller',
          title: 'PSA Charizard',
          vendorName: 'QmSe…ller',
          loading: false,
        },
      ],
      sellerProfiles: {
        QmSeller: {
          peerID: 'QmSeller',
          displayName: 'Charizard Vault',
        },
      },
    });
    mockUsePublicMarketplaceDetail.mockReturnValue({
      detail: {
        marketplace: baseMarketplace,
        sellers: [],
        featured: [],
        banners: [],
        listings: {
          listings: [{ peerID: 'QmSeller', slug: 'psa-charizard' }],
          total: 1,
          page: 1,
          pageSize: 24,
          totalPage: 1,
        },
      },
      loading: false,
      error: null,
      refresh: vi.fn(),
    });

    render(<MarketplaceDetailPageContent identifier="test-market" />);

    expect(mockUseCommunityMarketplaceEnrichment).toHaveBeenCalledWith(
      expect.any(Array),
      expect.arrayContaining(['QmSeller'])
    );
    expect(screen.getByTestId('listing-psa-charizard')).toHaveTextContent('Charizard Vault');
  });

  it('renders featured sellers and keeps other approved sellers in all sellers section', () => {
    mockUsePublicMarketplaceDetail.mockReturnValue({
      detail: {
        marketplace: baseMarketplace,
        sellers: [
          { peerID: 'QmSellerA', productGroups: [] },
          { peerID: 'QmSellerB', productGroups: [] },
          { peerID: 'QmSellerC', productGroups: [] },
        ],
        featured: [
          { type: 'seller', peerID: 'QmMissingSeller', sortOrder: 1 },
          { type: 'seller', peerID: 'QmSellerB', sortOrder: 2 },
        ],
        banners: [],
        listings: {
          listings: [{ peerID: 'QmSellerA', slug: 'psa-charizard' }],
          total: 1,
          page: 1,
          pageSize: 24,
          totalPage: 1,
        },
      },
      loading: false,
      error: null,
      refresh: vi.fn(),
    });

    render(<MarketplaceDetailPageContent identifier="test-market" />);

    fireEvent.click(screen.getByText('marketplace.detail.sellersTab'));

    expect(screen.getByText('marketplace.detail.featuredSellersTitle')).toBeInTheDocument();
    expect(screen.getByText('marketplace.detail.allSellersTitle')).toBeInTheDocument();
    expect(screen.queryByTestId('seller-QmMissingSeller')).toBeNull();
    expect(screen.getByTestId('seller-QmSellerA')).toBeInTheDocument();
    expect(screen.getByTestId('seller-QmSellerB')).toBeInTheDocument();
    expect(screen.getByTestId('seller-QmSellerC')).toBeInTheDocument();
    expect(screen.getAllByTestId('seller-QmSellerB')).toHaveLength(1);
  });
});
