// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { DisplayOrder } from '@mobazha/core';

vi.mock('@mobazha/core', async importOriginal => {
  const actual = await importOriginal<typeof import('@mobazha/core')>();
  return {
    ...actual,
    useI18n: () => ({
      t: (key: string) =>
        ({
          'order.dealLink.title': 'Protected link order',
          'order.dealLink.buyerBody': 'Buyer locked terms',
          'order.dealLink.sellerBody': 'Seller locked terms',
          'order.dealLink.detailsCta': 'View protected-link reference',
          'order.dealLink.linkReference': 'Link reference',
          'order.dealLink.revision': 'Terms revision',
        })[key] ?? key,
    }),
  };
});

import { OrderDealLinkNotice } from '@/components/Order/cards/OrderDealLinkNotice';

function buildOrder(overrides: Partial<DisplayOrder> = {}): DisplayOrder {
  return {
    id: 'order-1',
    orderId: 'order-1',
    status: 'pending',
    items: [],
    total: '49.00',
    currency: 'USD',
    createdAt: '2026-07-06T00:00:00Z',
    vendor: { id: 'seller', name: 'Seller', avatar: '', peerID: 'seller' },
    shippingAddress: '',
    timeline: [],
    userRole: 'buyer',
    ...overrides,
  };
}

describe('OrderDealLinkNotice', () => {
  it('stays hidden for standard marketplace orders', () => {
    const { container } = render(<OrderDealLinkNotice displayOrder={buildOrder()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows buyer-facing locked terms and a compact technical reference', () => {
    render(
      <OrderDealLinkNotice
        displayOrder={buildOrder({
          dealLinkID: 'deal-link-123456789',
          dealRevision: 3,
        })}
      />
    );

    expect(screen.getByTestId('order-deal-link-notice')).toHaveTextContent('Buyer locked terms');
    expect(screen.getByText('deal-li…56789')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });
});
