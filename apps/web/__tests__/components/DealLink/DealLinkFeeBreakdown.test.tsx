import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

vi.mock('@mobazha/core', () => ({
  useI18n: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'dealLink.feeBreakdownTitle': 'Price breakdown',
        'dealLink.feeBreakdownHint': 'Locked quote',
        'dealLink.feeLine.itemOrServiceAmount': 'Item or service',
        'dealLink.feeLine.buyerServiceCharge': 'Buyer service charge',
        'dealLink.feeLine.paymentOrNetworkCost': 'Network fee',
        'dealLink.feeLine.taxOrExternalCost': 'Tax or external cost',
        'dealLink.feeLine.discount': 'Discount',
        'dealLink.buyerTotal': 'Total due',
      };
      return translations[key] ?? key;
    },
  }),
  useCurrency: () => ({
    formatPrice: (amount: number | string, currency: string) => `${currency} ${amount}`,
  }),
}));

import { DealLinkFeeBreakdown } from '@/components/DealLink/DealLinkFeeBreakdown';

const quote = {
  id: 'quote-1',
  dealLinkID: 'deal-1',
  dealRevision: 1,
  termsHash: 'hash',
  schemaVersion: 1,
  policyVersion: '1',
  priceCurrency: 'USD',
  itemOrServiceAmount: '49.00',
  buyerServiceCharge: '0',
  paymentOrNetworkCost: '0',
  taxOrExternalCost: '0',
  buyerTotal: '49.00',
  grossOrderAmount: '49.00',
  discount: '0',
  sellerServiceCharge: '0',
  sellerPaymentCost: '0',
  sellerDistributionBudget: '49.00',
  estimatedSellerNet: '49.00',
  expiresAt: '2026-12-31T00:00:00Z',
  createdAt: '2026-07-05T00:00:00Z',
};

describe('DealLinkFeeBreakdown', () => {
  it('renders hosting buyer fee lines including explicit zero costs', () => {
    render(<DealLinkFeeBreakdown quote={quote} />);

    expect(screen.getByTestId('deal-link-fee-breakdown')).toBeInTheDocument();
    expect(screen.getByText('Item or service')).toBeInTheDocument();
    expect(screen.getByText('Network fee')).toBeInTheDocument();
    expect(screen.getAllByText('USD 0').length).toBeGreaterThan(0);
    expect(screen.getAllByText('USD 49.00')).toHaveLength(2);
    expect(screen.getByText('Total due')).toBeInTheDocument();
  });

  it('shows loading skeleton', () => {
    render(<DealLinkFeeBreakdown quote={null} loading />);
    expect(screen.getByTestId('deal-link-fee-breakdown-loading')).toBeInTheDocument();
  });
});
