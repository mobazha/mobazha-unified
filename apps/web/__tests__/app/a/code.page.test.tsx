// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';

const paramsMock = vi.fn<() => { code?: string } | null>();
const routerReplaceMock = vi.fn();

vi.mock('next/navigation', () => ({
  useParams: () => paramsMock(),
  useRouter: () => ({ replace: routerReplaceMock }),
}));

vi.mock('@/components', () => ({
  Header: () => <div data-testid="mock-header" />,
}));

const resolveAffiliateShortLinkMock = vi.fn();

vi.mock('@mobazha/core', async importOriginal => {
  const actual = await importOriginal<typeof import('@mobazha/core')>();
  return {
    ...actual,
    useI18n: () => ({
      t: (key: string) => key,
    }),
    resolveAffiliateShortLink: (...args: unknown[]) => resolveAffiliateShortLinkMock(...args),
  };
});

import AffiliateShortLinkPage from '@/app/a/[code]/page';

describe('AffiliateShortLinkPage (/a/:code)', () => {
  beforeEach(() => {
    paramsMock.mockReturnValue({ code: 'Ab3xKz9m' });
    routerReplaceMock.mockClear();
    resolveAffiliateShortLinkMock.mockReset();
  });

  it('shows a loading state while resolving the code', () => {
    resolveAffiliateShortLinkMock.mockReturnValue(new Promise(() => {}));
    render(<AffiliateShortLinkPage />);
    expect(screen.getByTestId('affiliate-short-link-loading')).toBeInTheDocument();
  });

  it('replaces to the canonical /promo entry once the code resolves', async () => {
    resolveAffiliateShortLinkMock.mockResolvedValue({
      sellerPeerID: 'QmSeller1',
      token: 'promo-token-1',
    });

    render(<AffiliateShortLinkPage />);

    await waitFor(() =>
      expect(routerReplaceMock).toHaveBeenCalledWith('/promo/QmSeller1/promo-token-1')
    );
    expect(resolveAffiliateShortLinkMock).toHaveBeenCalledWith('Ab3xKz9m');
  });

  it('shows not-found when the platform answers 404', async () => {
    resolveAffiliateShortLinkMock.mockRejectedValue(new Error('short link not found'));

    render(<AffiliateShortLinkPage />);

    await waitFor(() =>
      expect(screen.getByTestId('affiliate-short-link-not-found')).toBeInTheDocument()
    );
    expect(routerReplaceMock).not.toHaveBeenCalled();
  });

  it('shows not-found when the code param is missing', async () => {
    paramsMock.mockReturnValue({});

    render(<AffiliateShortLinkPage />);

    await waitFor(() =>
      expect(screen.getByTestId('affiliate-short-link-not-found')).toBeInTheDocument()
    );
    expect(resolveAffiliateShortLinkMock).not.toHaveBeenCalled();
  });

  it('offers a retry on transient failures', async () => {
    resolveAffiliateShortLinkMock.mockRejectedValueOnce(new Error('network down'));
    resolveAffiliateShortLinkMock.mockResolvedValueOnce({
      sellerPeerID: 'QmSeller1',
      token: 'promo-token-1',
    });

    render(<AffiliateShortLinkPage />);

    await waitFor(() =>
      expect(screen.getByTestId('affiliate-short-link-error')).toBeInTheDocument()
    );

    const retry = screen.getByRole('button');
    fireEvent.click(retry);

    await waitFor(() =>
      expect(routerReplaceMock).toHaveBeenCalledWith('/promo/QmSeller1/promo-token-1')
    );
  });
});
