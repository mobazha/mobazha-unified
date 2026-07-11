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
    state?: 'planned' | 'submitted' | 'confirmed';
    txHash?: string;
    confirmations?: number;
    confirmedAt?: string;
    updatedAt?: string;
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

  it('shows an empty state', () => {
    mockStatements([]);
    render(<SellerAffiliateStatementsPanel audience="seller" />);
    expect(screen.getByText('sellerAffiliate.statementEmpty')).toBeInTheDocument();
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

  it('renders confirmed settlement as paid even when the commission line is reversed', () => {
    mockStatements([buildLine({ status: 'reversed', settlement: { state: 'confirmed' } })]);
    render(<SellerAffiliateStatementsPanel audience="seller" />);
    expect(screen.getByTestId('seller-affiliate-statement-order-1')).toHaveTextContent(
      'sellerAffiliate.paid'
    );
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
