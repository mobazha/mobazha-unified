// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';

const paramsMock = vi.fn<() => { programId?: string } | null>();
const routerPushMock = vi.fn();
const setLoginRedirectPathMock = vi.fn();
const createSellerAffiliateLinkMock = vi.fn();
const mockToast = vi.fn();
const copyToClipboardMock = vi.fn<(text: string) => Promise<boolean>>(async () => true);

let isAuthenticated = true;

vi.mock('next/navigation', () => ({
  useParams: () => paramsMock(),
  useRouter: () => ({ push: routerPushMock }),
}));

vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock('@/lib/clipboard', () => ({
  copyToClipboard: (text: string) => copyToClipboardMock(text),
}));

vi.mock('@mobazha/core', async importOriginal => {
  const actual = await importOriginal<typeof import('@mobazha/core')>();
  return {
    ...actual,
    useI18n: () => ({
      t: (key: string, params?: Record<string, unknown>) => {
        if (!params) return key;
        return Object.entries(params).reduce(
          (result, [paramKey, value]) => result.replace(`{{${paramKey}}}`, String(value)),
          key
        );
      },
    }),
    useUserStore: (selector: (state: { isAuthenticated: boolean }) => unknown) =>
      selector({ isAuthenticated }),
    setLoginRedirectPath: (...args: unknown[]) => setLoginRedirectPathMock(...args),
  };
});

vi.mock('@mobazha/core/services/api/sellerAffiliate', async importOriginal => {
  const actual =
    await importOriginal<typeof import('@mobazha/core/services/api/sellerAffiliate')>();
  return {
    ...actual,
    createSellerAffiliateLink: (...args: unknown[]) => createSellerAffiliateLinkMock(...args),
  };
});

import PromoteProgramPage from '@/app/promote/[programId]/page';

describe('PromoteProgramPage (/promote/:programId)', () => {
  beforeEach(() => {
    isAuthenticated = true;
    paramsMock.mockReturnValue({ programId: 'program-1' });
    routerPushMock.mockClear();
    setLoginRedirectPathMock.mockClear();
    createSellerAffiliateLinkMock.mockReset();
    mockToast.mockClear();
    copyToClipboardMock.mockClear();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { origin: 'https://example.test' },
    });
  });

  it('redirects to login when not authenticated', () => {
    isAuthenticated = false;
    render(<PromoteProgramPage />);

    expect(screen.getByTestId('promote-auth-required')).toBeInTheDocument();
    fireEvent.click(screen.getByText('promote.signInCta'));

    expect(setLoginRedirectPathMock).toHaveBeenCalledWith('/promote/program-1');
    expect(routerPushMock).toHaveBeenCalledWith(
      `/login?redirect=${encodeURIComponent('/promote/program-1')}`
    );
  });

  it('creates (or reuses) the promoter link idempotently across repeated clicks', async () => {
    createSellerAffiliateLinkMock.mockResolvedValue({
      id: 'link-1',
      programID: 'program-1',
      promoterPeerID: 'promoter-1',
      publicToken: 'token-1',
      publicPath: '/promo/token-1',
      status: 'active',
      createdAt: '2026-07-11T00:00:00Z',
      updatedAt: '2026-07-11T00:00:00Z',
    });

    render(<PromoteProgramPage />);

    fireEvent.click(screen.getByText('sellerAffiliate.createLink'));
    await waitFor(() =>
      expect(screen.getByText('https://example.test/promo/token-1')).toBeInTheDocument()
    );

    fireEvent.click(screen.getByTestId('promote-copy-link'));
    await waitFor(() => expect(copyToClipboardMock).toHaveBeenCalled());

    expect(createSellerAffiliateLinkMock).toHaveBeenCalledTimes(1);
    expect(screen.getByText('https://example.test/promo/token-1')).toBeInTheDocument();
  });

  it('copies the link and shows success feedback', async () => {
    createSellerAffiliateLinkMock.mockResolvedValue({
      id: 'link-1',
      programID: 'program-1',
      promoterPeerID: 'promoter-1',
      publicToken: 'token-1',
      publicPath: '/promo/token-1',
      status: 'active',
      createdAt: '2026-07-11T00:00:00Z',
      updatedAt: '2026-07-11T00:00:00Z',
    });

    render(<PromoteProgramPage />);
    fireEvent.click(screen.getByText('sellerAffiliate.createLink'));
    await waitFor(() => expect(screen.getByTestId('promote-copy-link')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('promote-copy-link'));
    await waitFor(() =>
      expect(copyToClipboardMock).toHaveBeenCalledWith('https://example.test/promo/token-1')
    );
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'promote.copySuccess' })
    );
  });

  it('falls back to copy when navigator.share is unavailable', async () => {
    createSellerAffiliateLinkMock.mockResolvedValue({
      id: 'link-1',
      programID: 'program-1',
      promoterPeerID: 'promoter-1',
      publicToken: 'token-1',
      publicPath: '/promo/token-1',
      status: 'active',
      createdAt: '2026-07-11T00:00:00Z',
      updatedAt: '2026-07-11T00:00:00Z',
    });
    Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });

    render(<PromoteProgramPage />);
    fireEvent.click(screen.getByText('sellerAffiliate.createLink'));
    await waitFor(() => expect(screen.getByTestId('promote-share-link')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('promote-share-link'));
    await waitFor(() =>
      expect(copyToClipboardMock).toHaveBeenCalledWith('https://example.test/promo/token-1')
    );
  });

  it('uses the native share sheet when available and does not fall back to copy', async () => {
    createSellerAffiliateLinkMock.mockResolvedValue({
      id: 'link-1',
      programID: 'program-1',
      promoterPeerID: 'promoter-1',
      publicToken: 'token-1',
      publicPath: '/promo/token-1',
      status: 'active',
      createdAt: '2026-07-11T00:00:00Z',
      updatedAt: '2026-07-11T00:00:00Z',
    });
    const shareMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', { configurable: true, value: shareMock });

    render(<PromoteProgramPage />);
    fireEvent.click(screen.getByText('sellerAffiliate.createLink'));
    await waitFor(() => expect(screen.getByTestId('promote-share-link')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('promote-share-link'));
    await waitFor(() => expect(shareMock).toHaveBeenCalled());
    expect(copyToClipboardMock).not.toHaveBeenCalled();
  });
});
