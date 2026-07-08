// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import type { DealCommissionStatement } from '@mobazha/core';

const reloadMock = vi.fn();

const defaultStatement: DealCommissionStatement = {
  id: 'stmt-1',
  attributionClaimID: 'claim-1',
  acceptanceID: 'acc-1',
  orderID: 'order-long-id-1234567890',
  programID: 'prog-1',
  dealLinkID: 'deal-1',
  status: 'observed' as const,
  calculationBase: 'gross_order_amount',
  commissionRateBPS: 500,
  commissionBaseAmountAtomic: '10000',
  proposedCommissionAmountAtomic: '500',
  currency: 'USD',
  currencyDivisibility: 2,
  declaredFundingSource: 'seller_manual_budget',
  settlementMode: 'manual_review_only' as const,
  payable: false,
  reviewNotBefore: '2026-07-10T00:00:00Z',
  observedAt: '2026-07-05T12:00:00Z',
};

let mockStatements: DealCommissionStatement[] = [defaultStatement];

const buildTMock = () => (key: string, params?: Record<string, unknown>) => {
  if (key === 'dealCommissionStatements.entryTitle') {
    return `Order ${params?.orderRef}`;
  }
  if (key === 'dealCommissionStatements.commissionRateValue') {
    return `${params?.percent}%`;
  }
  if (key === 'dealCommissionStatements.eligibilityReviewedAt') {
    return `Reviewed ${params?.date}`;
  }
  if (key === 'dealCommissionStatements.eligibilityReasonUnknown') {
    return `Other reason (${params?.reason})`;
  }
  if (key.startsWith('dealCommissionStatements.eligibilityReason.')) {
    const code = key.split('.').pop() ?? '';
    return `Reason: ${code}`;
  }
  const labels: Record<string, string> = {
    'dealCommissionStatements.promoterTitle': 'Provisional attributed commissions',
    'dealCommissionStatements.promoterSubtitle': 'Observations only',
    'dealCommissionStatements.disclosureTitle': 'Provisional attribution only',
    'dealCommissionStatements.disclosureBody': 'Mobazha records attribution and estimated amounts.',
    'dealCommissionStatements.manualReviewOnlyNotice':
      'Only exception cases enter platform review.',
    'dealCommissionStatements.disclosurePaymentPromoter':
      'Payouts are arranged by the seller outside Mobazha.',
    'dealCommissionStatements.sellerControlsTitle': 'Seller controls',
    'dealCommissionStatements.sellerControlsBody':
      'Approval, disputes, and payment records are not yet active controls.',
    'dealCommissionStatements.sellerControlAcknowledge': 'Acknowledge attribution',
    'dealCommissionStatements.sellerControlDispute': 'Dispute attribution',
    'dealCommissionStatements.sellerControlRecordPayment': 'Record external payment',
    'dealCommissionStatements.sellerControlsUnavailable':
      'Coming after Gate 2/3: seller acknowledgement, attribution disputes, and reconciled payment evidence.',
    'dealCommissionStatements.refresh': 'Refresh',
    'dealCommissionStatements.observedAt': `Observed ${params?.date}`,
    'dealCommissionStatements.proposedCommission': 'Proposed commission',
    'dealCommissionStatements.commissionBase': 'Commission base',
    'dealCommissionStatements.commissionRate': 'Rate',
    'dealCommissionStatements.settlementMode': 'Settlement',
    'dealCommissionStatements.settlementManualReview': 'Manual review only',
    'dealCommissionStatements.fundingSource': 'Funding source',
    'dealCommissionStatements.fundingSellerManualBudget': 'Seller-funded',
    'dealCommissionStatements.reviewNotBefore': 'Protection ends',
    'dealCommissionStatements.reviewNotBeforeHint': 'Not a payout date',
    'dealCommissionStatements.programRef': 'Program',
    'dealCommissionStatements.dealLinkRef': 'Deal Link',
    'dealCommissionStatements.statusObserved': 'In protection period',
    'dealCommissionStatements.statusPendingReview': 'Platform review',
    'dealCommissionStatements.statusDisputed': 'Disputed',
    'dealCommissionStatements.statusReversed': 'Reversed',
    'dealCommissionStatements.statusSettled': 'Settled',
    'dealCommissionStatements.statusObservedDescription':
      'This purchase was attributed and is in the automatic protection period.',
    'dealCommissionStatements.statusPendingReviewDescription':
      'Protection has ended and this record is in platform exception review.',
    'dealCommissionStatements.statusDisputedDescription': 'Review paused',
    'dealCommissionStatements.statusReversedDescription': 'Did not pass eligibility checks',
    'dealCommissionStatements.statusSettledDescription': 'Review approved',
    'dealCommissionStatements.detailsCta': 'View calculation and references',
    'dealCommissionStatements.eligibilityAuditTitle': 'Eligibility review record',
    'dealCommissionStatements.eligibilityAuditHint': 'Audit does not change not-payable status',
    'dealCommissionStatements.eligibilityDecisionLabel': 'Last decision',
    'dealCommissionStatements.eligibilityDecisionReversed': 'Reversed',
    'dealCommissionStatements.eligibilityDecisionDisputed': 'Disputed',
    'dealCommissionStatements.eligibilityReasonsLabel': 'Reasons',
    'dealCommissionStatements.missingCurrency': 'Currency unavailable',
    'dealCommissionStatements.invalidAmount': 'Amount unavailable',
  };
  return labels[key] ?? key;
};

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
  isKnownDealCommissionEligibilityReasonCode: (reason: string) =>
    [
      'review_hold_active',
      'order_not_terminal',
      'refund_observed',
      'dispute_history',
      'provider_dispute_open',
      'provider_dispute_outcome_unconfirmed',
      'provider_chargeback_observed',
      'test_order',
      'related_account',
      'automatic_identity_match',
      'already_disputed',
      'already_reversed',
    ].includes(reason),
  truncateStatementReference: (value: string) => value.slice(0, 6),
  useDealCommissionStatements: () => ({
    statements: mockStatements,
    loading: false,
    error: null,
    reload: reloadMock,
  }),
  useCurrency: () => ({
    formatPrice: (amount: number | string) => `$${amount}`,
  }),
  useI18n: () => ({
    t: buildTMock(),
    formatDate: () => 'Jul 8, 2026',
  }),
}));

import { ProvisionalCommissionStatementsPanel } from '@/components/DealCommission/ProvisionalCommissionStatementsPanel';

describe('ProvisionalCommissionStatementsPanel', () => {
  beforeEach(() => {
    reloadMock.mockClear();
    mockStatements = [defaultStatement];
  });

  it('renders attribution status, protection timing, and the estimated amount', async () => {
    render(<ProvisionalCommissionStatementsPanel audience="promoter" />);

    expect(screen.getByTestId('deal-commission-statements-promoter')).toBeInTheDocument();
    expect(screen.getByTestId('deal-commission-global-disclosure')).toHaveTextContent(
      'Mobazha records attribution and estimated amounts.'
    );
    expect(screen.getByTestId('deal-commission-status-summary')).toHaveTextContent(
      'This purchase was attributed and is in the automatic protection period.'
    );
    expect(screen.getByTestId('deal-commission-statement-stmt-1')).toBeInTheDocument();
    expect(screen.getByText('$5')).toBeInTheDocument();
    expect(screen.getByText('View calculation and references')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByTestId('deal-commission-statements-loading')).not.toBeInTheDocument();
    });
  });

  it('renders eligibility audit evidence for reviewed reversed statements', () => {
    mockStatements = [
      {
        ...defaultStatement,
        id: 'stmt-reversed',
        status: 'reversed',
        lastEligibilityDecision: 'reversed',
        lastEligibilityReasons: [
          'provider_dispute_outcome_unconfirmed',
          'provider_chargeback_observed',
          'future_reason_code',
        ],
        eligibilityReviewedAt: '2026-07-08T15:30:00Z',
      },
    ];

    render(<ProvisionalCommissionStatementsPanel audience="promoter" />);

    const entry = screen.getByTestId('deal-commission-statement-stmt-reversed');
    expect(entry).toHaveTextContent('Reversed');
    expect(screen.getByTestId('deal-commission-eligibility-audit')).toBeInTheDocument();
    expect(screen.getByText('Eligibility review record')).toBeInTheDocument();
    expect(screen.getByText(/Last decision/)).toHaveTextContent('Reversed');
    expect(screen.getByText('Reviewed Jul 8, 2026')).toBeInTheDocument();
    expect(screen.getByText('Reason: provider_dispute_outcome_unconfirmed')).toBeInTheDocument();
    expect(screen.getByText('Reason: provider_chargeback_observed')).toBeInTheDocument();
    expect(screen.getByText('Other reason (future_reason_code)')).toBeInTheDocument();
    expect(screen.getByTestId('deal-commission-status-summary')).toHaveTextContent(
      'Did not pass eligibility checks'
    );
  });

  it('compact variant hides review timing until expanded and keeps rows short', async () => {
    render(
      <ProvisionalCommissionStatementsPanel
        audience="seller"
        variant="compact"
        embedded
        statusFilter="all"
      />
    );

    expect(screen.getByTestId('deal-commission-statement-stmt-1')).toBeInTheDocument();
    expect(screen.getByTestId('deal-commission-seller-controls')).toHaveTextContent(
      'Seller controls'
    );
    expect(screen.getByTestId('deal-commission-seller-control-acknowledge')).toBeDisabled();
    expect(screen.getByTestId('deal-commission-seller-control-dispute')).toBeDisabled();
    expect(screen.getByTestId('deal-commission-seller-control-record-payment')).toBeDisabled();
    expect(screen.queryByText('Protection ends')).not.toBeInTheDocument();

    screen.getByTestId('deal-commission-statement-stmt-1').click();

    await waitFor(() => {
      expect(
        screen.getByText('This purchase was attributed and is in the automatic protection period.')
      ).toBeInTheDocument();
    });
    expect(screen.queryByText('Protection ends')).not.toBeInTheDocument();

    await screen.findByText('View calculation and references');
    screen.getByText('View calculation and references').click();
    expect(screen.getByText('Commission base')).toBeInTheDocument();
    expect(screen.getByText('Rate')).toBeInTheDocument();
  });
});
