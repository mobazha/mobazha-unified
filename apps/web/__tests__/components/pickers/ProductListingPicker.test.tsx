// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ProductListItem } from '@mobazha/core';

vi.mock('@mobazha/core', () => ({
  getImageUrl: () => undefined,
  useCurrency: () => ({
    fromMinimalUnit: (amount: string | number) => amount,
    formatPrice: (amount: string | number, currency: string) => `${amount} ${currency}`,
  }),
  useI18n: () => ({
    t: (key: string) =>
      ({
        'admin.dealLinks.productPlaceholder': 'Choose a product',
        'admin.dealLinks.productSearchPlaceholder': 'Search products',
        'admin.dealLinks.productNoResults': 'No products',
        'admin.dealLinks.productLoading': 'Loading products',
        'admin.dealLinks.productTypeService': 'Service',
        'admin.dealLinks.productTypeDigital': 'Digital product',
      })[key] ?? key,
  }),
}));

import { ProductListingPicker } from '@/components/pickers/ProductListingPicker';

const EMPTY_IMAGE = { tiny: '', small: '', medium: '', large: '', original: '' };
const LISTINGS: ProductListItem[] = [
  {
    slug: 'design-review-2026',
    cid: 'QmDesignReview',
    title: 'Design review',
    thumbnail: EMPTY_IMAGE,
    price: { amount: '120', currency: { code: 'USD', divisibility: 2 } },
    vendorPeerID: 'seller-1',
    contractType: 'SERVICE',
  },
  {
    slug: 'creator-kit',
    cid: 'QmCreatorKit',
    title: 'Creator kit',
    thumbnail: EMPTY_IMAGE,
    price: { amount: '49', currency: { code: 'USD', divisibility: 2 } },
    vendorPeerID: 'seller-1',
    contractType: 'DIGITAL_GOOD',
  },
];

describe('ProductListingPicker', () => {
  it('shows identifying product details and can search by slug', () => {
    const onValueChange = vi.fn();
    render(<ProductListingPicker listings={LISTINGS} onValueChange={onValueChange} id="product" />);

    fireEvent.click(screen.getByTestId('deal-product-picker'));
    expect(
      screen.getByRole('option', { name: /Design review Service design-review-2026 120 USD/ })
    ).toBeInTheDocument();

    fireEvent.change(screen.getByRole('combobox', { name: 'Search products' }), {
      target: { value: 'creator-kit' },
    });
    expect(screen.queryByRole('option', { name: /Design review/ })).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('option', { name: /Creator kit Digital product creator-kit 49 USD/ })
    );

    expect(onValueChange).toHaveBeenCalledWith('creator-kit');
  });
});
