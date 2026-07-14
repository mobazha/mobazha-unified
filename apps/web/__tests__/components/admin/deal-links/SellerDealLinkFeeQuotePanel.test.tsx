// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { ApiError, type SellerDealLink } from '@mobazha/core';

const createSellerDealLinkFeeQuoteMock = vi.fn();

vi.mock('@mobazha/core', async importOriginal => {
  const actual = await importOriginal<typeof import('@mobazha/core')>();
  return {
    ...actual,
    useI18n: () => ({ t: (key: string) => key }),
    useCurrency: () => ({
      formatPrice: (amount: string, currency: string) => `${amount} ${currency}`,
    }),
    useSellerDealLinkFeeQuote: (dealLinkID: string) => ({
      requestQuote: () => createSellerDealLinkFeeQuoteMock(dealLinkID),
    }),
  };
});

import { SellerDealLinkFeeQuotePanel } from '@/components/admin/deal-links/SellerDealLinkFeeQuotePanel';

const BASE: SellerDealLink = {
  id: 'deal-1',
  publicToken: 'tok_abc',
  publicPath: '/deal/tok_abc',
  sellerPeerID: 'seller-1',
  status: 'active',
  currentRevision: 2,
  title: 'Design review',
  deliveryType: 'fixed_service',
  priceAmount: '120',
  priceCurrency: 'USD',
  terms: { acceptanceHours: 168, deliverables: ['Design review'] },
  termsHash: 'hash',
  createdAt: '2026-07-01T00:00:00Z',
  updatedAt: '2026-07-01T00:00:00Z',
};

const QUOTE = {
  id: 'quote-1',
  dealLinkID: 'deal-1',
  dealRevision: 2,
  termsHash: 'hash',
  schemaVersion: 1,
  policyVersion: 'fees-2026-07',
  priceCurrency: 'USD',
  itemOrServiceAmount: '120',
  buyerServiceCharge: '5',
  paymentOrNetworkCost: '2',
  taxOrExternalCost: '0',
  buyerTotal: '127',
  grossOrderAmount: '127',
  discount: '0',
  sellerServiceCharge: '4',
  sellerPaymentCost: '1',
  sellerDistributionBudget: '3',
  estimatedSellerNet: '119',
  // Far future so the quote never reads as expired in this suite.
  expiresAt: '2099-01-01T00:00:00Z',
  createdAt: '2026-07-14T00:00:00Z',
};

describe('SellerDealLinkFeeQuotePanel', () => {
  beforeEach(() => vi.clearAllMocks());

  it('explains that an active link is required and never calls the endpoint for a draft', () => {
    render(<SellerDealLinkFeeQuotePanel link={{ ...BASE, status: 'draft' }} />);

    expect(screen.getByTestId('deal-link-fee-quote-inactive')).toHaveTextContent(
      'admin.dealLinks.feeQuoteInactiveNotice'
    );
    expect(screen.queryByTestId('deal-link-fee-quote-expired-notice')).toBeNull();
    expect(screen.queryByTestId('deal-link-fee-quote-request')).toBeNull();
    expect(createSellerDealLinkFeeQuoteMock).not.toHaveBeenCalled();
  });

  it.each(['paused', 'closed'] as const)(
    'shows the inactive notice — not the expired one — for a %s link',
    status => {
      render(<SellerDealLinkFeeQuotePanel link={{ ...BASE, status }} />);

      expect(screen.getByTestId('deal-link-fee-quote-inactive')).toHaveTextContent(
        'admin.dealLinks.feeQuoteInactiveNotice'
      );
      expect(screen.queryByTestId('deal-link-fee-quote-expired-notice')).toBeNull();
      expect(screen.queryByTestId('deal-link-fee-quote-request')).toBeNull();
      expect(createSellerDealLinkFeeQuoteMock).not.toHaveBeenCalled();
    }
  );

  it('distinguishes an expired-status link with recover-by-extending copy', () => {
    render(<SellerDealLinkFeeQuotePanel link={{ ...BASE, status: 'expired' }} />);

    expect(screen.getByTestId('deal-link-fee-quote-expired-notice')).toHaveTextContent(
      'admin.dealLinks.feeQuoteExpiredNotice'
    );
    expect(screen.queryByTestId('deal-link-fee-quote-inactive')).toBeNull();
    expect(screen.queryByTestId('deal-link-fee-quote-request')).toBeNull();
    expect(createSellerDealLinkFeeQuoteMock).not.toHaveBeenCalled();
  });

  it('treats an active link whose expiry has passed as expired, not inactive', () => {
    render(
      <SellerDealLinkFeeQuotePanel
        link={{ ...BASE, status: 'active', expiresAt: '2000-01-01T00:00:00Z' }}
      />
    );

    expect(screen.getByTestId('deal-link-fee-quote-expired-notice')).toHaveTextContent(
      'admin.dealLinks.feeQuoteExpiredNotice'
    );
    expect(screen.queryByTestId('deal-link-fee-quote-inactive')).toBeNull();
    expect(screen.queryByTestId('deal-link-fee-quote-request')).toBeNull();
    expect(createSellerDealLinkFeeQuoteMock).not.toHaveBeenCalled();
  });

  it('still quotes an active link whose expiry is in the future', () => {
    render(
      <SellerDealLinkFeeQuotePanel
        link={{ ...BASE, status: 'active', expiresAt: '2099-01-01T00:00:00Z' }}
      />
    );

    expect(screen.getByTestId('deal-link-fee-quote-request')).toBeInTheDocument();
    expect(screen.queryByTestId('deal-link-fee-quote-expired-notice')).toBeNull();
    expect(screen.queryByTestId('deal-link-fee-quote-inactive')).toBeNull();
  });

  it('does not request a quote on page load for an active link', () => {
    render(<SellerDealLinkFeeQuotePanel link={BASE} />);

    expect(screen.getByTestId('deal-link-fee-quote-request')).toBeInTheDocument();
    expect(createSellerDealLinkFeeQuoteMock).not.toHaveBeenCalled();
  });

  it('requests the quote on click and renders buyer total and estimated seller net from server fields', async () => {
    createSellerDealLinkFeeQuoteMock.mockResolvedValue(QUOTE);
    render(<SellerDealLinkFeeQuotePanel link={BASE} />);

    fireEvent.click(screen.getByTestId('deal-link-fee-quote-request'));

    await waitFor(() =>
      expect(screen.getByTestId('deal-link-fee-quote-summary')).toBeInTheDocument()
    );
    expect(createSellerDealLinkFeeQuoteMock).toHaveBeenCalledWith('deal-1');
    expect(screen.getByTestId('deal-link-fee-quote-buyer-total')).toHaveTextContent('127 USD');
    expect(screen.getByTestId('deal-link-fee-quote-seller-net')).toHaveTextContent('119 USD');
    expect(screen.getByTestId('deal-link-fee-quote-summary')).toHaveTextContent('fees-2026-07');
  });

  it('maps a 409 ApiError to conflict copy that names every current 409 cause', async () => {
    createSellerDealLinkFeeQuoteMock.mockRejectedValue(new ApiError('conflict', 409));
    render(<SellerDealLinkFeeQuotePanel link={BASE} />);

    fireEvent.click(screen.getByTestId('deal-link-fee-quote-request'));

    await waitFor(() =>
      expect(screen.getByTestId('deal-link-fee-quote-error')).toHaveTextContent(
        'admin.dealLinks.feeQuoteConflictError'
      )
    );
  });

  it('maps a 404 ApiError to the missing-link copy', async () => {
    createSellerDealLinkFeeQuoteMock.mockRejectedValue(new ApiError('gone', 404));
    render(<SellerDealLinkFeeQuotePanel link={BASE} />);

    fireEvent.click(screen.getByTestId('deal-link-fee-quote-request'));

    await waitFor(() =>
      expect(screen.getByTestId('deal-link-fee-quote-error')).toHaveTextContent(
        'admin.dealLinks.dealErrorGone'
      )
    );
  });
});
