// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import type { SellerAffiliateStatementLine } from '@mobazha/core';

const copyToClipboardMock = vi.fn<(text: string) => Promise<boolean>>(async () => true);

vi.mock('@/lib/clipboard', () => ({
  copyToClipboard: (text: string) => copyToClipboardMock(text),
}));

const useSellerAffiliateStatementsMock = vi.fn();

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
    useSellerAffiliateStatements: (...args: unknown[]) => useSellerAffiliateStatementsMock(...args),
    getPaymentCoinDisplayLabel: (coin: string) => coin.split(':').pop() ?? coin,
    renderPairedPrice: (amount: string) => `AMT:${amount}`,
    truncateAddress: (value: string) => `${value.slice(0, 4)}...${value.slice(-4)}`,
  };
});

import { normalizeSellerAffiliateStatementLine } from '@mobazha/core';
import { SellerAffiliateStatementsPanel } from '@/components/SellerAffiliate/SellerAffiliateStatementsPanel';

interface LineOverrides {
  orderID?: string;
  orderLineID?: string;
  currency?: string;
  commissionAtomic?: string;
  status?: string;
  settlement?: {
    actionId?: string;
    state?: 'planned' | 'submitted' | 'confirmed' | 'failed' | 'abandoned';
    txHash?: string;
    confirmations?: number;
    confirmedAt?: string;
    updatedAt?: string;
    lastError?: string;
  } | null;
}

function buildLine(overrides: LineOverrides = {}): SellerAffiliateStatementLine {
  const orderID = overrides.orderID ?? 'order-1';
  const currency = overrides.currency ?? 'crypto:eip155:1:native';
  const settlement = overrides.settlement;
  return normalizeSellerAffiliateStatementLine({
    attribution: {
      id: `attribution-${overrides.orderLineID ?? 'line-1'}`,
      orderID,
      referralSessionID: 'referral-1',
      programID: 'program-1',
      sellerPeerID: 'seller-1',
      buyerKind: 'peer',
      buyerPeerID: 'buyer-1',
      promoterPeerID: 'promoter-1',
      commissionRateBPSSnapshot: 1000,
      attributedAt: '2026-07-11T00:00:00Z',
    },
    commissionLine: {
      attributionID: `attribution-${overrides.orderLineID ?? 'line-1'}`,
      orderID,
      orderLineID: overrides.orderLineID ?? 'line-1',
      netMerchandiseAtomic: '1000',
      commissionAtomic: overrides.commissionAtomic ?? '100',
      currency,
      status: overrides.status ?? 'pending',
    },
    ...(settlement
      ? {
          settlement: {
            actionId: settlement.actionId ?? 'action-1',
            action: 'complete',
            state: settlement.state ?? 'confirmed',
            txHash: settlement.txHash,
            coin: currency,
            amount: '100',
            address: '0x1111111111111111111111111111111111111111',
            confirmations: settlement.confirmations,
            updatedAt: settlement.updatedAt ?? '2026-07-11T01:00:00Z',
            confirmedAt: settlement.confirmedAt,
            lastError: settlement.lastError,
          },
        }
      : {}),
  });
}

function mockStatements(statements: SellerAffiliateStatementLine[], overrides = {}) {
  useSellerAffiliateStatementsMock.mockReturnValue({
    statements,
    loading: false,
    error: null,
    reload: vi.fn(),
    ...overrides,
  });
}

describe('SellerAffiliateStatementsPanel', () => {
  beforeEach(() => {
    copyToClipboardMock.mockClear();
    useSellerAffiliateStatementsMock.mockReset();
  });

  it('shows a loading state', () => {
    mockStatements([], { loading: true });
    render(<SellerAffiliateStatementsPanel audience="seller" />);
    expect(screen.getByTestId('seller-affiliate-statements-seller')).toHaveAttribute(
      'aria-busy',
      'true'
    );
  });

  it('shows an error state', () => {
    mockStatements([], { error: 'load_failed' });
    render(<SellerAffiliateStatementsPanel audience="seller" />);
    expect(screen.getByRole('alert')).toHaveTextContent('sellerAffiliate.statementLoadFailed');
  });

  it('shows an audience-specific empty state', () => {
    mockStatements([]);
    const { unmount } = render(<SellerAffiliateStatementsPanel audience="seller" />);
    expect(screen.getByText('sellerAffiliate.statementEmptySeller')).toBeInTheDocument();
    unmount();

    render(<SellerAffiliateStatementsPanel audience="promoter" />);
    expect(screen.getByText('sellerAffiliate.statementEmptyPromoter')).toBeInTheDocument();
  });

  it('passes the selected seller and program to promoter statement reads', () => {
    mockStatements([]);
    const promoterTarget = { sellerPeerID: 'seller-1', programID: 'program-1' };

    render(<SellerAffiliateStatementsPanel audience="promoter" promoterTarget={promoterTarget} />);

    expect(useSellerAffiliateStatementsMock).toHaveBeenCalledWith('promoter', true, promoterTarget);
  });

  it('renders pending when there is no settlement', () => {
    mockStatements([buildLine({ status: 'pending' })]);
    render(<SellerAffiliateStatementsPanel audience="seller" />);
    expect(screen.getByTestId('seller-affiliate-statement-order-1')).toHaveTextContent(
      'sellerAffiliate.pending'
    );
  });

  it('renders settling with the settlement sub-state and confirmations', () => {
    mockStatements([buildLine({ settlement: { state: 'submitted', confirmations: 2 } })]);
    render(<SellerAffiliateStatementsPanel audience="seller" />);
    const card = screen.getByTestId('seller-affiliate-statement-order-1');
    expect(card).toHaveTextContent('sellerAffiliate.settling');
    expect(card).toHaveTextContent('sellerAffiliate.settlementStateSubmitted');
    expect(card).toHaveTextContent('sellerAffiliate.confirmations');
  });

  it('renders a failed settlement and its actionable backend reason', () => {
    mockStatements([
      buildLine({
        settlement: { state: 'failed', lastError: 'affiliate output does not match frozen terms' },
      }),
    ]);
    render(<SellerAffiliateStatementsPanel audience="promoter" />);
    const card = screen.getByTestId('seller-affiliate-statement-order-1');
    expect(card).toHaveTextContent('sellerAffiliate.failed');
    expect(card).toHaveTextContent('sellerAffiliate.settlementStateFailed');
    expect(card).toHaveTextContent('affiliate output does not match frozen terms');
  });

  it('renders paid with a copyable tx hash and confirmed time, and copies on click', async () => {
    mockStatements([
      buildLine({
        settlement: {
          state: 'confirmed',
          txHash: '0xabcdef1234567890',
          confirmedAt: '2026-07-11T02:00:00Z',
        },
      }),
    ]);
    render(<SellerAffiliateStatementsPanel audience="seller" />);
    const card = screen.getByTestId('seller-affiliate-statement-order-1');
    expect(card).toHaveTextContent('sellerAffiliate.paid');
    expect(card).toHaveTextContent('sellerAffiliate.confirmedAt');

    const copyButton = screen.getByRole('button', { name: 'sellerAffiliate.copyTx' });
    await act(async () => {
      fireEvent.click(copyButton);
    });
    expect(copyToClipboardMock).toHaveBeenCalledWith('0xabcdef1234567890');
  });

  it('never renders the raw settlement action ID', () => {
    mockStatements([
      buildLine({ settlement: { state: 'confirmed', actionId: 'secret-action-42' } }),
    ]);
    render(<SellerAffiliateStatementsPanel audience="seller" />);
    expect(screen.queryByText('secret-action-42')).not.toBeInTheDocument();
  });

  it('renders a confirmed-but-reversed commission as clawback due, not paid', () => {
    // A confirmed on-chain payment whose commission line was later reversed is
    // money owed back — deriveSellerAffiliateDisplayStatus surfaces that as
    // clawback_due instead of continuing to show a reassuring "paid".
    mockStatements([buildLine({ status: 'reversed', settlement: { state: 'confirmed' } })]);
    render(<SellerAffiliateStatementsPanel audience="seller" />);
    expect(screen.getByTestId('seller-affiliate-statement-order-1')).toHaveTextContent(
      'sellerAffiliate.clawbackDue'
    );
  });

  it('renders an earnings summary strip that sums paid commission per currency', () => {
    // Two paid ETH orders (100 + 250) plus one pending order: the summary must
    // surface the paid total and the paid/in-progress split so a promoter sees
    // "what have I earned" without reading every row.
    mockStatements([
      buildLine({ orderID: 'o1', commissionAtomic: '100', settlement: { state: 'confirmed' } }),
      buildLine({ orderID: 'o2', commissionAtomic: '250', settlement: { state: 'confirmed' } }),
      buildLine({ orderID: 'o3' }),
    ]);
    render(<SellerAffiliateStatementsPanel audience="promoter" />);

    const summary = screen.getByTestId('seller-affiliate-earnings-summary-promoter');
    expect(summary).toHaveTextContent('sellerAffiliate.earningsPaidLabel');
    expect(summary).toHaveTextContent('sellerAffiliate.earningsInProgressLabel');
    // renderPairedPrice is mocked to AMT:<amount>; 100 + 250 summed with BigInt.
    expect(summary).toHaveTextContent('AMT:350');
  });

  it('omits the earnings summary when there are no statements', () => {
    mockStatements([]);
    render(<SellerAffiliateStatementsPanel audience="promoter" />);
    expect(
      screen.queryByTestId('seller-affiliate-earnings-summary-promoter')
    ).not.toBeInTheDocument();
  });

  it('groups multiple lines of the same order into a single card with one settlement block', () => {
    mockStatements([
      buildLine({ orderLineID: 'line-1', settlement: { state: 'confirmed', txHash: '0xtx' } }),
      buildLine({ orderLineID: 'line-2', settlement: { state: 'confirmed', txHash: '0xtx' } }),
    ]);
    render(<SellerAffiliateStatementsPanel audience="seller" />);
    expect(screen.getAllByTestId('seller-affiliate-statement-order-1')).toHaveLength(1);
    expect(screen.getAllByText('sellerAffiliate.txHash')).toHaveLength(1);
  });
});
