import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
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

vi.mock('@/components/CommunityMarketplace', () => ({
  CommunityListingCard: () => null,
  CommunitySellerCard: () => null,
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
    useCommunityMarketplaceEnrichment: () => ({ listingPreviews: [], sellerProfiles: {} }),
    useCollectibleMarketplaceAttribution: () => null,
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
    mockUsePublicMarketplaceDetail.mockReturnValue({
      detail: {
        marketplace: baseMarketplace,
        sellers: [],
        featured: [],
        banners: [],
        listings: { listings: [], total: 0, page: 1, pageSize: 24, totalPage: 0 },
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
        listings: { listings: [], total: 0, page: 1, pageSize: 24, totalPage: 0 },
      },
      loading: false,
      error: null,
      refresh: vi.fn(),
    });

    render(<MarketplaceDetailPageContent identifier="test-market" />);

    expect(screen.queryByTestId('marketplace-apply-to-sell')).toBeNull();
    expect(screen.getByText('marketplace.detail.sellerAdmissionInviteOnly')).toBeInTheDocument();
  });
});
