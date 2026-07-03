// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockTrackMarketplaceListingClick = vi.fn();
const mockHandleToggleWishlist = vi.fn();
const mockOpenProduct = vi.fn();

const product = {
  id: 'p1',
  slug: 'psa-charizard',
  title: 'PSA Charizard',
  price: '100',
  currency: 'USD',
  divisibility: 2,
  image: '',
  vendor: {
    peerID: 'QmSeller',
    name: 'Seller',
    avatar: '',
  },
  rating: 4.9,
  reviewCount: 12,
  contractType: 'PHYSICAL_GOOD' as const,
};

let mockSearchState: ReturnType<typeof buildSearchState>;

function buildSearchState(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    queryParam: 'charizard',
    searchQuery: 'charizard',
    setSearchQuery: vi.fn(),
    handleSearch: vi.fn((e?: { preventDefault?: () => void }) => e?.preventDefault?.()),
    activeTab: 'listings',
    setActiveTab: vi.fn(),
    productsTabLabel: 'Products (1)',
    usersTotal: 0,
    showFilters: false,
    setShowFilters: vi.fn(),
    sortBy: 'relevance',
    setSortBy: vi.fn(),
    sortOptions: [{ value: 'relevance', label: 'Relevance' }],
    typeOptions: [
      { value: 'all', label: 'All Types' },
      { value: 'PHYSICAL_GOOD', label: 'Physical Goods' },
    ],
    listingType: 'all',
    setListingType: vi.fn(),
    minRating: undefined,
    setMinRating: vi.fn(),
    priceMin: '',
    priceMax: '',
    priceCurrency: 'USD',
    priceCurrencySymbol: '$',
    hasPriceFilter: false,
    hasActiveFilters: false,
    setPriceRange: vi.fn(),
    clearAllFilters: vi.fn(),
    isBrowseAllCatalog: false,
    browseMode: 'discover',
    setBrowseMode: vi.fn(),
    productsCatalogTotal: 1,
    productsTotal: 1,
    productsVendorCount: 1,
    isLoadingProducts: false,
    isLoadingUsers: false,
    isLoading: false,
    productsHasMore: false,
    usersHasMore: false,
    products: [product],
    users: [],
    loadMoreProducts: vi.fn(),
    loadMoreUsers: vi.fn(),
    recentSearches: [],
    clearRecentSearches: vi.fn(),
    removeRecentSearch: vi.fn(),
    handleRecentSearch: vi.fn(),
    hasVerifiedMod: vi.fn(() => false),
    isInWishlist: vi.fn(() => false),
    handleToggleWishlist: vi.fn(
      (_product: unknown, e: { preventDefault: () => void; stopPropagation: () => void }) => {
        e.preventDefault();
        e.stopPropagation();
        mockHandleToggleWishlist();
      }
    ),
    trackMarketplaceListingClick: mockTrackMarketplaceListingClick,
    t: (key: string) => key,
    ...overrides,
  };
}

vi.mock('next/link', () => ({
  default: ({
    href,
    onClick,
    children,
  }: {
    href: string;
    onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
    children: React.ReactNode;
  }) => (
    <a
      href={href}
      onClick={e => {
        onClick?.(e);
        e.preventDefault();
      }}
    >
      {children}
    </a>
  ),
}));

vi.mock('@/hooks/useSearch', () => ({
  useSearch: () => mockSearchState,
}));

vi.mock('@/hooks', () => ({
  useProductModal: () => ({ openProduct: mockOpenProduct, isMobile: false }),
}));

vi.mock('@mobazha/core', async importOriginal => {
  const actual = await importOriginal<typeof import('@mobazha/core')>();
  return {
    ...actual,
    buildProductHref: (slug: string, peerID: string) => `/product/${slug}?peerID=${peerID}`,
  };
});

vi.mock('@/components', () => ({
  Header: () => <div />,
  Footer: () => <div />,
}));

vi.mock('@/components/MobilePageHeader/MobilePageHeader', () => ({
  MobilePageHeader: () => <div />,
}));

vi.mock('@/components/layouts', () => ({
  Container: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  HStack: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  VStack: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Grid: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/avatar-compat', () => ({
  AvatarCompat: () => <div />,
}));

vi.mock('@/components/ui', () => ({
  Select: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectValue: () => <div />,
}));

vi.mock('@/components/ui/bottom-sheet', () => ({
  BottomSheet: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  BottomSheetItem: ({ title, onClick }: { title: string; onClick: () => void }) => (
    <button onClick={onClick}>{title}</button>
  ),
}));

vi.mock('@/components/ProductCard', () => ({
  ProductCard: ({
    title,
    onToggleWishlist,
  }: {
    title: string;
    onToggleWishlist?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  }) => (
    <div>
      <span>{title}</span>
      <button data-testid="wishlist-toggle" onClick={e => onToggleWishlist?.(e)}>
        wishlist
      </button>
    </div>
  ),
  ProductCardSkeleton: () => <div />,
}));

import { SearchDesktop } from '@/components/Search/SearchDesktop';
import { SearchMobile } from '@/components/Search/SearchMobile';

describe('Search marketplace attribution click wiring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchState = buildSearchState();
  });

  it('desktop actual listing click triggers marketplace listing attribution', () => {
    render(<SearchDesktop />);

    fireEvent.click(screen.getByText('PSA Charizard'));

    expect(mockTrackMarketplaceListingClick).toHaveBeenCalledWith(
      expect.objectContaining({
        slug: 'psa-charizard',
        vendor: expect.objectContaining({ peerID: 'QmSeller' }),
      })
    );
  });

  it('desktop wishlist click does not trigger listing attribution due stopPropagation', () => {
    render(<SearchDesktop />);

    fireEvent.click(screen.getAllByTestId('wishlist-toggle')[0]);

    expect(mockHandleToggleWishlist).toHaveBeenCalledTimes(1);
    expect(mockTrackMarketplaceListingClick).not.toHaveBeenCalled();
  });

  it('mobile actual listing click triggers marketplace listing attribution', () => {
    render(<SearchMobile />);

    fireEvent.click(screen.getByText('PSA Charizard'));

    expect(mockTrackMarketplaceListingClick).toHaveBeenCalledWith(
      expect.objectContaining({
        slug: 'psa-charizard',
        vendor: expect.objectContaining({ peerID: 'QmSeller' }),
      })
    );
  });
});
