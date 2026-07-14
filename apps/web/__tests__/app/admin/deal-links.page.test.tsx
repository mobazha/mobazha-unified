// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';

const routerPushMock = vi.fn();
const listSellerDealLinksMock = vi.fn();
const copyToClipboardMock = vi.fn();
const toastMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: routerPushMock }),
}));

vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({ toast: toastMock }),
}));

vi.mock('@/lib/clipboard', () => ({
  copyToClipboard: (...args: unknown[]) => copyToClipboardMock(...args),
}));

vi.mock('@mobazha/core', async importOriginal => {
  const actual = await importOriginal<typeof import('@mobazha/core')>();
  return {
    ...actual,
    useI18n: () => ({ t: (key: string) => key }),
    useCurrency: () => ({
      formatPrice: (amount: string, currency: string) => `${amount} ${currency}`,
    }),
    listSellerDealLinks: (...args: unknown[]) => listSellerDealLinksMock(...args),
  };
});

import AdminDealLinksPage from '@/app/admin/deal-links/page';

const DEAL_LINK = {
  id: 'deal-1',
  publicToken: 'tok_abc',
  publicPath: '/deal/tok_abc',
  sellerPeerID: 'seller-1',
  status: 'active' as const,
  currentRevision: 1,
  title: 'Premium onboarding call',
  deliveryType: 'fixed_service' as const,
  priceAmount: '120',
  priceCurrency: 'USD',
  terms: { acceptanceHours: 168, deliverables: ['Premium onboarding call'] },
  termsHash: 'hash',
  createdAt: '2026-07-01T00:00:00Z',
  updatedAt: '2026-07-01T00:00:00Z',
};

describe('AdminDealLinksPage (/admin/deal-links)', () => {
  beforeEach(() => {
    routerPushMock.mockClear();
    listSellerDealLinksMock.mockReset();
    copyToClipboardMock.mockReset();
    toastMock.mockClear();
  });

  it('lists the seller deal links returned by hosting', async () => {
    listSellerDealLinksMock.mockResolvedValue([DEAL_LINK]);
    render(<AdminDealLinksPage />);

    expect(await screen.findByText('Premium onboarding call')).toBeInTheDocument();
    expect(screen.queryByText('admin.dealLinks.linksEmptyTitle')).not.toBeInTheDocument();
  });

  it('shows an empty state that routes to create when there are no links', async () => {
    listSellerDealLinksMock.mockResolvedValue([]);
    render(<AdminDealLinksPage />);

    expect(await screen.findByText('admin.dealLinks.linksEmptyTitle')).toBeInTheDocument();
    // The empty-state action and the header button both start the create flow.
    fireEvent.click(screen.getByTestId('deal-links-create'));
    expect(routerPushMock).toHaveBeenCalledWith('/admin/deal-links/new');
  });

  it('surfaces a load failure without crashing', async () => {
    listSellerDealLinksMock.mockRejectedValue(new Error('boom'));
    render(<AdminDealLinksPage />);

    expect(await screen.findByRole('alert')).toHaveTextContent('admin.dealLinks.loadFailed');
  });

  it('reveals the manual-copy input when clipboard access is blocked', async () => {
    listSellerDealLinksMock.mockResolvedValue([DEAL_LINK]);
    copyToClipboardMock.mockResolvedValue(false);
    render(<AdminDealLinksPage />);
    await screen.findByText('Premium onboarding call');

    fireEvent.click(screen.getByText('admin.dealLinks.copyDealCta'));

    await waitFor(() =>
      expect(screen.getByLabelText('admin.dealLinks.manualCopyLabel')).toBeInTheDocument()
    );
    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' }));
  });
});
