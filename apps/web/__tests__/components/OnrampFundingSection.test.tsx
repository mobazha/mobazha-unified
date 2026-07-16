// SPDX-License-Identifier: MIT
// Copyright (c) 2026 fengzie and the respective contributors.

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { OnrampFundingSection } from '@/components/Payment/OnrampFundingSection';
import type { OnrampFundingSourceView } from '@mobazha/core';

vi.mock('@mobazha/core', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

const source: OnrampFundingSourceView = {
  providerID: 'mock-onramp',
  onrampOrderID: 'mock-onramp-1',
  status: 'awaiting_payment',
  deliverToBuyerWallet: false,
  buyerActionURL: 'https://mock-onramp.example/checkout/mock-onramp-1',
  disclosure: 'disclosure',
  updatedAt: '2026-07-15T00:00:00Z',
};

describe('OnrampFundingSection', () => {
  it('renders the controller source and delegates refresh', () => {
    const onRefresh = vi.fn();
    render(<OnrampFundingSection source={source} onRefresh={onRefresh} />);

    expect(screen.getByRole('link')).toHaveAttribute('href', source.buyerActionURL);
    fireEvent.click(screen.getByRole('button', { name: 'onramp.refresh' }));
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('renders the chain-waiting state when polling resolves without a view', () => {
    render(<OnrampFundingSection source={source} resolvedWithoutView />);
    expect(screen.getByText('onramp.statusAwaitingChain')).toBeInTheDocument();
  });

  it('shows refresh failures without changing the durable source', () => {
    render(<OnrampFundingSection source={source} refreshError />);
    expect(screen.getByText('onramp.refreshFailed')).toBeInTheDocument();
    expect(screen.getByText('onramp.statusAwaitingPayment')).toBeInTheDocument();
  });
});
