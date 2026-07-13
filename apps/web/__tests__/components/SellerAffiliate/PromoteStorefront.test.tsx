// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

const useStoreListingsMock = vi.fn();

vi.mock('@mobazha/core', async importOriginal => {
  const actual = await importOriginal<typeof import('@mobazha/core')>();
  return {
    ...actual,
    useI18n: () => ({
      // Keys carry no {{placeholder}} text under mocking, so append param
      // values to keep them assertable (e.g. the per-item earn amount).
      t: (key: string, params?: Record<string, unknown>) =>
        params ? `${key} ${Object.values(params).join(' ')}` : key,
    }),
    useStoreListings: (...args: unknown[]) => useStoreListingsMock(...args),
    useCurrencyFormat: () => ({
      formatLocalPrice: (amount: string | number) => `$${amount}`,
      formatPrice: (amount: string | number) => `$${amount}`,
      localCurrency: 'USD',
    }),
    // Deterministic projection so the test asserts the component's own logic,
    // not price-field extraction (covered by its own unit tests).
    productCardPriceFieldsFromListItem: () => ({
      price: '10000',
      currencyCode: 'crypto:eip155:1:native',
      divisibility: 18,
      priceFrom: false,
    }),
    getImageUrl: () => 'https://img.example/x.png',
    buildProductHref: (slug: string) => `/product/${slug}`,
  };
});

vi.mock('next/link', () => ({
  __esModule: true,
  default: ({
    children,
    href,
    ...rest
  }: {
    children: React.ReactNode;
    href: string;
  } & Record<string, unknown>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock('@/components/ui/product-image', () => ({
  ProductImage: ({ alt }: { alt: string }) => <img alt={alt} />,
}));

import { PromoteStorefront } from '@/components/SellerAffiliate/PromoteStorefront';

function listing(slug: string, title: string) {
  return {
    slug,
    title,
    thumbnail: { tiny: '', small: '', medium: '', large: '', original: '' },
    price: { amount: '10000', currency: { code: 'crypto:eip155:1:native', divisibility: 18 } },
    vendorPeerID: 'seller-1',
  };
}

describe('PromoteStorefront', () => {
  beforeEach(() => {
    useStoreListingsMock.mockReset();
  });

  it('previews items with a concrete per-item earnings estimate', () => {
    useStoreListingsMock.mockReturnValue({
      listings: [listing('widget', 'Cool Widget'), listing('gadget', 'Neat Gadget')],
      isLoading: false,
      isOffline: false,
      error: null,
      refetch: vi.fn(),
    });

    // 5% of 10000 minimal units = 500, formatted by the mock as "$500".
    render(<PromoteStorefront sellerPeerID="seller-1" commissionRateBPS={500} />);

    expect(screen.getByTestId('promote-storefront')).toBeInTheDocument();
    expect(screen.getAllByTestId('promote-storefront-item')).toHaveLength(2);
    expect(screen.getByText('Cool Widget')).toBeInTheDocument();
    const earnLines = screen.getAllByTestId('promote-storefront-earn');
    expect(earnLines).toHaveLength(2);
    // "promote.storefrontEarn" with {{amount}} = "$500" (the key has no
    // placeholder under the key-returning t mock, so assert the amount chip).
    expect(earnLines[0]).toHaveTextContent('$500');
  });

  it('renders nothing when the store has no fetchable items', () => {
    useStoreListingsMock.mockReturnValue({
      listings: [],
      isLoading: false,
      isOffline: false,
      error: null,
      refetch: vi.fn(),
    });

    const { container } = render(
      <PromoteStorefront sellerPeerID="seller-1" commissionRateBPS={500} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing without a seller peer ID', () => {
    useStoreListingsMock.mockReturnValue({
      listings: [],
      isLoading: true,
      isOffline: false,
      error: null,
      refetch: vi.fn(),
    });
    const { container } = render(<PromoteStorefront sellerPeerID="" commissionRateBPS={500} />);
    expect(container).toBeEmptyDOMElement();
  });
});
