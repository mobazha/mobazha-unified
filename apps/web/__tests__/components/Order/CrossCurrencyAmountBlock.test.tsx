import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

vi.mock('@mobazha/core', async importOriginal => {
  const actual = await importOriginal<typeof import('@mobazha/core')>();
  return {
    ...actual,
    useI18n: () => ({
      t: (key: string) => key,
    }),
    useCurrency: () => ({
      formatPrice: (amount: string, currency: string) => `${currency} ${amount}`,
    }),
  };
});

import { CrossCurrencyAmountBlock } from '@/components/Order/CrossCurrencyAmountBlock';

describe('CrossCurrencyAmountBlock', () => {
  it('shows pricing total as primary and crypto as secondary for cross-currency timeline events', () => {
    render(
      <CrossCurrencyAmountBlock
        amount="0.01471"
        currency="ETH"
        paymentCoin="crypto:eip155:11155111:native"
        pricingAmount="29.00"
        pricingCurrency="USD"
        variant="timeline"
      />
    );

    expect(screen.getByText(/29\.00/)).toBeInTheDocument();
    expect(screen.getByText('order.payment.paidAmount')).toBeInTheDocument();
    expect(screen.getByText(/0\.01471/)).toBeInTheDocument();
  });

  it('shows a single settlement line for same-currency orders', () => {
    render(
      <CrossCurrencyAmountBlock
        amount="29.00"
        currency="USD"
        paymentCoin="USD"
        pricingAmount="29.00"
        pricingCurrency="USD"
        variant="timeline"
      />
    );

    expect(screen.getByText(/29\.00/)).toBeInTheDocument();
    expect(screen.queryByText('order.payment.paidAmount')).not.toBeInTheDocument();
  });
});
