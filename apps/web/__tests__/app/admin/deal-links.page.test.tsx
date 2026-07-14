// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import type { SellerDealLink } from '@mobazha/core';

const routerPushMock = vi.fn();
const listSellerDealLinksMock = vi.fn();
const closeSellerDealLinkMock = vi.fn();
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

// Mock the service, not the hook, so the real useSellerDealLinks runs and its
// loading/error/reload wiring is exercised through the page.
vi.mock('@mobazha/core/services/api/sellerDealLink', async importOriginal => {
  const actual = await importOriginal<typeof import('@mobazha/core/services/api/sellerDealLink')>();
  return {
    ...actual,
    listSellerDealLinks: (...args: unknown[]) => listSellerDealLinksMock(...args),
    closeSellerDealLink: (...args: unknown[]) => closeSellerDealLinkMock(...args),
  };
});

vi.mock('@mobazha/core', async importOriginal => {
  const actual = await importOriginal<typeof import('@mobazha/core')>();
  return {
    ...actual,
    useI18n: () => ({ t: (key: string) => key }),
    useCurrency: () => ({
      formatPrice: (amount: string, currency: string) => `${amount} ${currency}`,
    }),
  };
});

import AdminDealLinksPage from '@/app/admin/deal-links/page';

const DEAL_LINK: SellerDealLink = {
  id: 'deal-1',
  publicToken: 'tok_abc',
  publicPath: '/deal/tok_abc',
  sellerPeerID: 'seller-1',
  status: 'active',
  currentRevision: 1,
  title: 'Premium onboarding call',
  deliveryType: 'fixed_service',
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
    closeSellerDealLinkMock.mockReset();
    copyToClipboardMock.mockReset();
    toastMock.mockClear();
  });

  it('lists the seller deal links from the hook', async () => {
    listSellerDealLinksMock.mockResolvedValue([DEAL_LINK]);
    render(<AdminDealLinksPage />);

    expect(await screen.findByText('Premium onboarding call')).toBeInTheDocument();
    expect(screen.queryByText('admin.dealLinks.linksEmptyTitle')).not.toBeInTheDocument();
    // A live link is badged active and can be opened.
    expect(screen.getByTestId('deal-link-status-deal-1')).toHaveAttribute('data-status', 'active');
    expect(screen.getByRole('link', { name: /admin\.dealLinks\.openDealCta/ })).toBeInTheDocument();
  });

  it('badges a paused link and disables opening it', async () => {
    listSellerDealLinksMock.mockResolvedValue([{ ...DEAL_LINK, status: 'paused' }]);
    render(<AdminDealLinksPage />);

    await screen.findByText('Premium onboarding call');
    expect(screen.getByTestId('deal-link-status-deal-1')).toHaveAttribute('data-status', 'paused');
    // No live public page, so "Open" is a disabled button rather than a link.
    expect(screen.queryByRole('link', { name: /admin\.dealLinks\.openDealCta/ })).toBeNull();
    expect(screen.getByRole('button', { name: /admin\.dealLinks\.openDealCta/ })).toBeDisabled();
  });

  it('treats a past-expiry link as expired even if hosting still reports it active', async () => {
    listSellerDealLinksMock.mockResolvedValue([
      { ...DEAL_LINK, status: 'active', expiresAt: '2020-01-01T00:00:00Z' },
    ]);
    render(<AdminDealLinksPage />);

    await screen.findByText('Premium onboarding call');
    expect(screen.getByTestId('deal-link-status-deal-1')).toHaveAttribute('data-status', 'expired');
    expect(screen.getByRole('button', { name: /admin\.dealLinks\.openDealCta/ })).toBeDisabled();
  });

  it('shows an empty state that routes to create when there are no links', async () => {
    listSellerDealLinksMock.mockResolvedValue([]);
    render(<AdminDealLinksPage />);

    expect(await screen.findByText('admin.dealLinks.linksEmptyTitle')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('deal-links-create'));
    expect(routerPushMock).toHaveBeenCalledWith('/admin/deal-links/new');
  });

  it('surfaces a load failure without crashing', async () => {
    listSellerDealLinksMock.mockRejectedValue(new Error('boom'));
    render(<AdminDealLinksPage />);

    expect(await screen.findByRole('alert')).toHaveTextContent('admin.dealLinks.loadFailed');
  });

  it('shows an activate CTA for a draft link so a failed activation can be retried', async () => {
    listSellerDealLinksMock.mockResolvedValue([{ ...DEAL_LINK, status: 'draft' }]);
    render(<AdminDealLinksPage />);

    await screen.findByText('Premium onboarding call');
    expect(screen.getByTestId('deal-link-activate-deal-1')).toBeInTheDocument();
    // A draft is still editable (it never produced an order) and closable.
    expect(screen.getByTestId('deal-link-edit-deal-1')).toBeInTheDocument();
    expect(screen.getByTestId('deal-link-close-deal-1')).toBeInTheDocument();
  });

  it('closes a link after confirming, and reloads the list', async () => {
    listSellerDealLinksMock
      .mockResolvedValueOnce([DEAL_LINK])
      .mockResolvedValueOnce([{ ...DEAL_LINK, status: 'closed' }]);
    closeSellerDealLinkMock.mockResolvedValue(undefined);
    render(<AdminDealLinksPage />);

    await screen.findByText('Premium onboarding call');
    fireEvent.click(screen.getByTestId('deal-link-close-deal-1'));

    // The destructive action is gated behind a confirm dialog, not a native
    // window.confirm.
    const confirmButton = await screen.findByText('admin.dealLinks.closeConfirmCta');
    fireEvent.click(confirmButton);

    await waitFor(() => expect(closeSellerDealLinkMock).toHaveBeenCalledWith('deal-1'));
    await waitFor(() =>
      expect(screen.getByTestId('deal-link-status-deal-1')).toHaveAttribute('data-status', 'closed')
    );
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'admin.dealLinks.dealCloseSuccess' })
    );
  });

  it('surfaces a failure toast without closing the dialog’s target state when close fails', async () => {
    listSellerDealLinksMock.mockResolvedValue([DEAL_LINK]);
    closeSellerDealLinkMock.mockRejectedValue(new Error('boom'));
    render(<AdminDealLinksPage />);

    await screen.findByText('Premium onboarding call');
    fireEvent.click(screen.getByTestId('deal-link-close-deal-1'));
    fireEvent.click(await screen.findByText('admin.dealLinks.closeConfirmCta'));

    await waitFor(() =>
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: 'destructive',
          title: 'admin.dealLinks.dealCloseFailed',
        })
      )
    );
    // The link is still shown as active — the failed close did not corrupt state.
    expect(screen.getByTestId('deal-link-status-deal-1')).toHaveAttribute('data-status', 'active');
  });

  it('shows a closed link as closed even when its expiresAt has already passed', async () => {
    // closed is terminal and must win over the past-expiry computation, so the
    // badge reads "closed", not "expired".
    listSellerDealLinksMock.mockResolvedValue([
      { ...DEAL_LINK, status: 'closed', expiresAt: '2020-01-01T00:00:00Z' },
    ]);
    render(<AdminDealLinksPage />);

    await screen.findByText('Premium onboarding call');
    expect(screen.getByTestId('deal-link-status-deal-1')).toHaveAttribute('data-status', 'closed');
  });

  it('a closed link only offers to view orders — no edit, activate, close, or copy', async () => {
    listSellerDealLinksMock.mockResolvedValue([{ ...DEAL_LINK, status: 'closed' }]);
    render(<AdminDealLinksPage />);

    await screen.findByText('Premium onboarding call');
    expect(screen.getByTestId('deal-link-orders-deal-1')).toBeInTheDocument();
    expect(screen.queryByTestId('deal-link-edit-deal-1')).not.toBeInTheDocument();
    expect(screen.queryByTestId('deal-link-activate-deal-1')).not.toBeInTheDocument();
    expect(screen.queryByTestId('deal-link-reactivate-deal-1')).not.toBeInTheDocument();
    expect(screen.queryByTestId('deal-link-close-deal-1')).not.toBeInTheDocument();
    expect(screen.queryByText('admin.dealLinks.copyDealCta')).not.toBeInTheDocument();
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
