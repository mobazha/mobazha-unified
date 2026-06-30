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
    onClick,
  }: {
    preview: { slug: string };
    onClick?: React.MouseEventHandler<HTMLAnchorElement>;
  }) => (
    <a href={`/product/${preview.slug}`} data-testid={`listing-${preview.slug}`} onClick={onClick}>
      {preview.slug}
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
    marketplaceJoinModeKey: () => 'marketplace.joinModeApproval',
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
  joinMode: 'approval',
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

  it('shows admission policy without CTA for invite-only markets', () => {
    mockUsePublicMarketplaceDetail.mockReturnValue({
      detail: {
        marketplace: { ...baseMarketplace, joinMode: 'invite' },
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
    expect(screen.getByText('marketplace.detail.sellerAdmissionInviteOnly')).toBeInTheDocument();
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

  it('keeps only matched curated sellers when at least one curated peer exists in detail.sellers', () => {
    mockUsePublicMarketplaceDetail.mockReturnValue({
      detail: {
        marketplace: baseMarketplace,
        sellers: [
          { peerID: 'QmSellerA', productGroups: [] },
          { peerID: 'QmSellerB', productGroups: [] },
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

    expect(screen.queryByTestId('seller-QmMissingSeller')).toBeNull();
    expect(screen.queryByTestId('seller-QmSellerA')).toBeNull();
    expect(screen.getByTestId('seller-QmSellerB')).toBeInTheDocument();
  });
});
