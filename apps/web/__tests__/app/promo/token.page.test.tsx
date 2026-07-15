// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';

const paramsMock = vi.fn<() => { sellerPeerID?: string; token?: string } | null>();

vi.mock('next/navigation', () => ({
  useParams: () => paramsMock(),
}));

vi.mock('@/components', () => ({
  Header: () => <div data-testid="mock-header" />,
}));

const getPublicSellerAffiliateLinkMock = vi.fn();
const createSellerAffiliateReferralSessionMock = vi.fn();
const writeSellerAffiliateReferralSessionMock = vi.fn();

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
    getPublicSellerAffiliateLink: (...args: unknown[]) => getPublicSellerAffiliateLinkMock(...args),
    createSellerAffiliateReferralSession: (...args: unknown[]) =>
      createSellerAffiliateReferralSessionMock(...args),
    writeSellerAffiliateReferralSession: (...args: unknown[]) =>
      writeSellerAffiliateReferralSessionMock(...args),
  };
});

import SellerAffiliateEntryPage from '@/app/promo/[sellerPeerID]/[token]/page';

describe('SellerAffiliateEntryPage (/promo/:sellerPeerID/:token)', () => {
  beforeEach(() => {
    paramsMock.mockReturnValue({ sellerPeerID: 'QmSeller1', token: 'promo-token-1' });
    getPublicSellerAffiliateLinkMock.mockReset();
    createSellerAffiliateReferralSessionMock.mockReset();
    writeSellerAffiliateReferralSessionMock.mockReset();
  });

  it('shows a loading state while resolving the link', () => {
    getPublicSellerAffiliateLinkMock.mockReturnValue(new Promise(() => {}));
    render(<SellerAffiliateEntryPage />);
    expect(screen.getByTestId('seller-affiliate-entry-loading')).toBeInTheDocument();
  });

  it('saves the referral session and shows ready state for an active link', async () => {
    getPublicSellerAffiliateLinkMock.mockResolvedValue({
      programID: 'program-1',
      sellerPeerID: 'QmSeller1',
      status: 'active',
      commissionRateBPS: 500,
      attributionWindowSeconds: 86_400,
    });
    createSellerAffiliateReferralSessionMock.mockResolvedValue({
      referralSessionID: 'referral-1',
      sellerPeerID: 'QmSeller1',
      expiresAt: '2099-01-01T00:00:00Z',
    });

    render(<SellerAffiliateEntryPage />);

    await waitFor(() =>
      expect(screen.getByTestId('seller-affiliate-entry-ready')).toBeInTheDocument()
    );
    expect(writeSellerAffiliateReferralSessionMock).toHaveBeenCalledWith({
      referralSessionID: 'referral-1',
      sellerPeerID: 'QmSeller1',
      expiresAt: '2099-01-01T00:00:00Z',
    });
    expect(getPublicSellerAffiliateLinkMock).toHaveBeenCalledWith('QmSeller1', 'promo-token-1');
    expect(createSellerAffiliateReferralSessionMock).toHaveBeenCalledWith(
      'QmSeller1',
      'promo-token-1'
    );
  });

  it('shows inactive state for a paused program and does not save a referral session', async () => {
    getPublicSellerAffiliateLinkMock.mockResolvedValue({
      programID: 'program-1',
      sellerPeerID: 'QmSeller1',
      status: 'paused',
      commissionRateBPS: 500,
      attributionWindowSeconds: 86_400,
    });

    render(<SellerAffiliateEntryPage />);

    await waitFor(() =>
      expect(screen.getByTestId('deal-link-status-inactive')).toBeInTheDocument()
    );
    expect(createSellerAffiliateReferralSessionMock).not.toHaveBeenCalled();
    expect(writeSellerAffiliateReferralSessionMock).not.toHaveBeenCalled();
  });

  it('shows a not-found state when the link cannot be resolved', async () => {
    getPublicSellerAffiliateLinkMock.mockRejectedValue(new Error('link not found'));

    render(<SellerAffiliateEntryPage />);

    await waitFor(() =>
      expect(screen.getByTestId('deal-link-status-not_found')).toBeInTheDocument()
    );
    expect(writeSellerAffiliateReferralSessionMock).not.toHaveBeenCalled();
  });

  it('shows a generic error state for unexpected failures', async () => {
    getPublicSellerAffiliateLinkMock.mockRejectedValue(new Error('network down'));

    render(<SellerAffiliateEntryPage />);

    await waitFor(() => expect(screen.getByTestId('deal-link-status-unknown')).toBeInTheDocument());
  });

  it('rejects a response whose seller Peer does not match the route', async () => {
    getPublicSellerAffiliateLinkMock.mockResolvedValue({
      programID: 'program-1',
      sellerPeerID: 'QmOtherSeller',
      status: 'active',
      commissionRateBPS: 500,
      attributionWindowSeconds: 86_400,
    });

    render(<SellerAffiliateEntryPage />);

    await waitFor(() =>
      expect(screen.getByTestId('deal-link-status-inactive')).toBeInTheDocument()
    );
    expect(createSellerAffiliateReferralSessionMock).not.toHaveBeenCalled();
    expect(writeSellerAffiliateReferralSessionMock).not.toHaveBeenCalled();
  });

  it('shows the not-found panel when there is no token param', () => {
    paramsMock.mockReturnValue(null);
    render(<SellerAffiliateEntryPage />);
    expect(getPublicSellerAffiliateLinkMock).not.toHaveBeenCalled();
  });
});
