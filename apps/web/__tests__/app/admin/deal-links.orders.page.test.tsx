// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import type { SellerDealLinkOrder } from '@mobazha/core';

const routerPushMock = vi.fn();
const useSellerDealLinkOrdersMock = vi.fn();
const renderPairedPriceMock = vi.fn(
  (amount: string, _coin: string, _local: string, _opts?: unknown) => amount
);

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: routerPushMock }),
  useParams: () => ({ id: 'deal-1' }),
}));

vi.mock('@mobazha/core', async importOriginal => {
  const actual = await importOriginal<typeof import('@mobazha/core')>();
  return {
    ...actual,
    useI18n: () => ({
      t: (key: string, params?: Record<string, unknown>) =>
        params ? `${key} ${Object.values(params).join('-')}` : key,
    }),
    useCurrencyFormat: () => ({ localCurrency: 'USD' }),
    useSellerDealLink: () => ({ link: { title: 'Premium onboarding call' } }),
    useSellerDealLinkOrders: (...args: unknown[]) => useSellerDealLinkOrdersMock(...args),
    getPaymentCoinDisplayLabel: (coin: string) => coin,
    renderPairedPrice: (...args: [string, string, string, unknown?]) =>
      renderPairedPriceMock(...args),
  };
});

import AdminDealLinkOrdersPage from '@/app/admin/deal-links/[id]/orders/page';

function order(
  orderID: string,
  acceptanceStatus: string,
  extra?: Partial<SellerDealLinkOrder>
): SellerDealLinkOrder {
  return {
    orderID,
    acceptanceStatus,
    buyerPeerID: 'buyer-1',
    pricingCoin: 'USD',
    amount: '1000',
    createdAt: '2026-07-10T00:00:00Z',
    ...extra,
  };
}

describe('AdminDealLinkOrdersPage (/admin/deal-links/[id]/orders)', () => {
  beforeEach(() => {
    routerPushMock.mockClear();
    useSellerDealLinkOrdersMock.mockReset();
    renderPairedPriceMock.mockClear();
  });

  it('renders the amount with the backend-provided divisibility, including 0', () => {
    useSellerDealLinkOrdersMock.mockReturnValue({
      orders: [order('order-0', 'completed', { currencyDivisibility: 0 })],
      total: 1,
      loading: false,
      error: null,
      reload: vi.fn(),
    });
    render(<AdminDealLinkOrdersPage />);

    // The authoritative divisibility must be forwarded so renderPairedPrice does
    // not fall back to a currency-registry guess.
    expect(renderPairedPriceMock).toHaveBeenCalledWith(
      '1000',
      'USD',
      'USD',
      expect.objectContaining({ isMinimalUnit: true, divisibility: 0 })
    );
  });

  it('shows the acceptance-status note and labels "completed" as order-created, not paid/fulfilled', async () => {
    useSellerDealLinkOrdersMock.mockReturnValue({
      orders: [order('order-1', 'completed')],
      total: 1,
      loading: false,
      error: null,
      reload: vi.fn(),
    });
    render(<AdminDealLinkOrdersPage />);

    expect(screen.getByText('admin.dealLinks.ordersStatusNote')).toBeInTheDocument();
    expect(screen.getByTestId('deal-link-order-order-1')).toHaveTextContent(
      'admin.dealLinks.orderStatusCompleted'
    );
  });

  it('does not show pagination controls when everything fits on one page', () => {
    useSellerDealLinkOrdersMock.mockReturnValue({
      orders: [order('order-1', 'completed')],
      total: 1,
      loading: false,
      error: null,
      reload: vi.fn(),
    });
    render(<AdminDealLinkOrdersPage />);

    expect(screen.queryByTestId('deal-link-orders-prev')).not.toBeInTheDocument();
    expect(screen.queryByTestId('deal-link-orders-next')).not.toBeInTheDocument();
  });

  it('pages forward and back, requesting the matching offset, and disables at the edges', async () => {
    const pages: Record<number, SellerDealLinkOrder[]> = {
      0: [order('order-1', 'completed')],
      20: [order('order-21', 'processing')],
    };
    useSellerDealLinkOrdersMock.mockImplementation(
      (_dealLinkId: string, options: { offset: number }) => ({
        orders: pages[options.offset] ?? [],
        total: 45,
        loading: false,
        error: null,
        reload: vi.fn(),
      })
    );
    render(<AdminDealLinkOrdersPage />);

    expect(screen.getByTestId('deal-link-orders-prev')).toBeDisabled();
    expect(screen.getByTestId('deal-link-orders-next')).not.toBeDisabled();
    expect(screen.getByTestId('deal-link-order-order-1')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('deal-link-orders-next'));

    await waitFor(() =>
      expect(useSellerDealLinkOrdersMock).toHaveBeenLastCalledWith('deal-1', {
        limit: 20,
        offset: 20,
      })
    );
    expect(screen.getByTestId('deal-link-order-order-21')).toBeInTheDocument();
    expect(screen.getByTestId('deal-link-orders-prev')).not.toBeDisabled();

    fireEvent.click(screen.getByTestId('deal-link-orders-prev'));
    await waitFor(() =>
      expect(useSellerDealLinkOrdersMock).toHaveBeenLastCalledWith('deal-1', {
        limit: 20,
        offset: 0,
      })
    );
  });

  it('shows an empty state when the link has no orders yet', () => {
    useSellerDealLinkOrdersMock.mockReturnValue({
      orders: [],
      total: 0,
      loading: false,
      error: null,
      reload: vi.fn(),
    });
    render(<AdminDealLinkOrdersPage />);

    expect(screen.getByText('admin.dealLinks.ordersEmpty')).toBeInTheDocument();
  });

  it('surfaces a load failure', () => {
    useSellerDealLinkOrdersMock.mockReturnValue({
      orders: [],
      total: 0,
      loading: false,
      error: 'boom',
      reload: vi.fn(),
    });
    render(<AdminDealLinkOrdersPage />);

    expect(screen.getByRole('alert')).toHaveTextContent('admin.dealLinks.ordersLoadFailed');
  });
});
