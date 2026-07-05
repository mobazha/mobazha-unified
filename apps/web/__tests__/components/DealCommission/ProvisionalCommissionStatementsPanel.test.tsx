// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';

const reloadMock = vi.fn();

vi.mock('@mobazha/core', () => ({
  formatAtomicCommissionAmount: ({
    amountAtomic,
    currency,
    currencyDivisibility,
    formatPrice,
  }: {
    amountAtomic: string;
    currency?: string | null;
    currencyDivisibility: number;
    formatPrice: (amount: number | string, currency: string) => string;
    missingCurrencyLabel: string;
    invalidAmountLabel: string;
  }) => {
    if (!currency?.trim()) {
      return { ok: false, display: 'missing', reason: 'missing_currency' as const };
    }
    const major = Number(amountAtomic) / 10 ** currencyDivisibility;
    return { ok: true, display: formatPrice(major, currency), currency };
  },
  formatCommissionRateFromBPS: (bps: number) => String(bps / 100),
  truncateStatementReference: (value: string) => value.slice(0, 6),
  useDealCommissionStatements: () => ({
    statements: [
      {
        id: 'stmt-1',
        attributionClaimID: 'claim-1',
        acceptanceID: 'acc-1',
        orderID: 'order-long-id-1234567890',
        programID: 'prog-1',
        dealLinkID: 'deal-1',
        status: 'observed',
        calculationBase: 'gross_order_amount',
        commissionRateBPS: 500,
        commissionBaseAmountAtomic: '10000',
        proposedCommissionAmountAtomic: '500',
        currency: 'USD',
        currencyDivisibility: 2,
        declaredFundingSource: 'seller_manual_budget',
        settlementMode: 'manual_review_only',
        payable: false,
        reviewNotBefore: '2026-07-10T00:00:00Z',
        observedAt: '2026-07-05T12:00:00Z',
      },
    ],
    loading: false,
    error: null,
    reload: reloadMock,
  }),
  useCurrency: () => ({
    formatPrice: (amount: number | string) => `$${amount}`,
  }),
  useI18n: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      if (key === 'dealCommissionStatements.entryTitle') {
        return `Order ${params?.orderRef}`;
      }
      if (key === 'dealCommissionStatements.commissionRateValue') {
        return `${params?.percent}%`;
      }
      const labels: Record<string, string> = {
        'dealCommissionStatements.promoterTitle': 'Provisional attributed commissions',
        'dealCommissionStatements.promoterSubtitle': 'Observations only',
        'dealCommissionStatements.disclosureTitle': 'Evidence only',
        'dealCommissionStatements.disclosureBody': 'Not a balance',
        'dealCommissionStatements.notPayableNotice': 'Not payable',
        'dealCommissionStatements.manualReviewOnlyNotice': 'Manual review only',
        'dealCommissionStatements.refresh': 'Refresh',
        'dealCommissionStatements.manualReviewOnlyTitle': 'Manual review only',
        'dealCommissionStatements.promoterEvidenceBody': 'No payout guarantee',
        'dealCommissionStatements.notPayableBadge': 'Not payable',
        'dealCommissionStatements.observedAt': `Observed ${params?.date}`,
        'dealCommissionStatements.proposedCommission': 'Proposed commission',
        'dealCommissionStatements.commissionBase': 'Commission base',
        'dealCommissionStatements.commissionRate': 'Rate',
        'dealCommissionStatements.settlementMode': 'Settlement',
        'dealCommissionStatements.settlementManualReview': 'Manual review only',
        'dealCommissionStatements.fundingSource': 'Funding source',
        'dealCommissionStatements.fundingSellerManualBudget': 'Seller-funded',
        'dealCommissionStatements.reviewNotBefore': 'Earliest review eligibility',
        'dealCommissionStatements.reviewNotBeforeHint': 'Not a payout date',
        'dealCommissionStatements.programRef': 'Program',
        'dealCommissionStatements.dealLinkRef': 'Deal Link',
        'dealCommissionStatements.statusObserved': 'Observed',
        'dealCommissionStatements.missingCurrency': 'Currency unavailable',
        'dealCommissionStatements.invalidAmount': 'Amount unavailable',
      };
      return labels[key] ?? key;
    },
    formatDate: () => 'Jul 5, 2026',
  }),
}));

import { ProvisionalCommissionStatementsPanel } from '@/components/DealCommission/ProvisionalCommissionStatementsPanel';

describe('ProvisionalCommissionStatementsPanel', () => {
  beforeEach(() => {
    reloadMock.mockClear();
  });

  it('renders manual-review and not-payable disclosures with statement entries', async () => {
    render(<ProvisionalCommissionStatementsPanel audience="promoter" />);

    expect(screen.getByTestId('deal-commission-statements-promoter')).toBeInTheDocument();
    expect(screen.getByTestId('deal-commission-global-disclosure')).toHaveTextContent(
      'Not payable'
    );
    expect(screen.getByTestId('deal-commission-manual-review-notice')).toBeInTheDocument();
    expect(screen.getByTestId('deal-commission-not-payable-badge')).toHaveTextContent(
      'Not payable'
    );
    expect(screen.getByTestId('deal-commission-statement-stmt-1')).toBeInTheDocument();
    expect(screen.getByText('$5')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByTestId('deal-commission-statements-loading')).not.toBeInTheDocument();
    });
  });
});
