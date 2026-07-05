import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import type { PaymentSelectionQuote } from '@mobazha/core';

vi.mock('@mobazha/core', async importOriginal => {
  const actual = await importOriginal<typeof import('@mobazha/core')>();
  return {
    ...actual,
    useI18n: () => ({
      t: (key: string, params?: Record<string, string | number>) => {
        const translations: Record<string, string> = {
          'payment.selectionQuote.title': 'Payment quote',
          'payment.selectionQuote.hint': 'Locked quote',
          'payment.selectionQuote.paymentSubtotal': 'Payment subtotal',
          'payment.selectionQuote.providerOrNetworkCost': 'Provider or network cost',
          'payment.selectionQuote.platformPaymentCost': 'Platform payment cost',
          'payment.selectionQuote.buyerPaymentTotal': 'Total to pay',
          'payment.selectionQuote.conversionRate': 'Conversion rate',
          'payment.selectionQuote.policyVersion': `Pricing policy: ${params?.version ?? ''}`,
          'payment.selectionQuote.expiresIn': `Expires in ${params?.minutes}m ${params?.seconds}s`,
          'payment.selectionQuote.expired': 'Quote expired',
          'payment.selectionQuote.provisioned': 'Quote locked to this payment session',
          'payment.selectionQuote.requote': 'Refresh quote',
          'payment.selectionQuote.errorTitle': 'Quote unavailable',
        };
        return translations[key] ?? key;
      },
    }),
    useCurrency: () => ({
      renderPairedPrice: (amount: number | string, currency: string) => `${currency} ${amount}`,
    }),
    formatPaymentSelectionQuoteAmount: (amount: string) => amount,
    formatPaymentSelectionConversionRate: () => '1 BTC = 2500.00 USD',
  };
});

import { PaymentSelectionQuoteReview } from '@/components/Payment/PaymentSelectionQuoteReview';

const baseQuote: PaymentSelectionQuote = {
  id: 'psq-1',
  orderID: 'order-1',
  feeQuoteID: 'fee-1',
  dealLinkID: 'deal-1',
  dealRevision: 1,
  termsHash: 'hash',
  schemaVersion: 1,
  policyVersion: '2',
  pricingCurrency: 'USD',
  pricingAmount: '4999',
  pricingDivisibility: 2,
  paymentCoin: 'crypto:bitcoin:btc',
  paymentCurrency: 'BTC',
  paymentDivisibility: 8,
  conversionRequired: true,
  exchangeRate: '250000',
  exchangeRateBase: 'BTC',
  exchangeRateQuote: 'USD',
  exchangeRateQuoteDivisibility: 2,
  paymentSubtotal: '250000',
  providerOrNetworkCost: '0',
  platformPaymentCost: '0',
  buyerPaymentTotal: '250000',
  expiresAt: '2099-01-01T00:00:00Z',
  createdAt: '2026-07-05T00:00:00Z',
};

describe('PaymentSelectionQuoteReview', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-05T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders explicit zero costs and conversion rate', () => {
    render(<PaymentSelectionQuoteReview quote={baseQuote} />);

    expect(screen.getByTestId('payment-selection-quote-review')).toBeInTheDocument();
    expect(screen.getByText('Provider or network cost')).toBeInTheDocument();
    expect(screen.getAllByText('BTC 0').length).toBeGreaterThan(0);
    expect(screen.getByTestId('payment-selection-quote-conversion-rate')).toHaveTextContent(
      '1 BTC = 2500.00 USD'
    );
    expect(screen.getByText('Pricing policy: 2')).toBeInTheDocument();
  });

  it('shows expired state and requote action', () => {
    const onRequote = vi.fn();
    render(<PaymentSelectionQuoteReview quote={baseQuote} expired onRequote={onRequote} />);

    expect(screen.getByText('Quote expired')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('payment-selection-quote-requote'));
    expect(onRequote).toHaveBeenCalledOnce();
  });

  it('keeps a provisioned quote locked after its selection expiry', () => {
    const onRequote = vi.fn();
    render(
      <PaymentSelectionQuoteReview quote={baseQuote} expired provisioned onRequote={onRequote} />
    );

    expect(screen.getByText('Quote locked to this payment session')).toBeInTheDocument();
    expect(screen.queryByText('Quote expired')).not.toBeInTheDocument();
    expect(screen.queryByTestId('payment-selection-quote-requote')).not.toBeInTheDocument();
  });

  it('shows loading skeleton', () => {
    render(<PaymentSelectionQuoteReview quote={null} loading />);
    expect(screen.getByTestId('payment-selection-quote-loading')).toBeInTheDocument();
  });

  it('shows error with requote', () => {
    const onRequote = vi.fn();
    render(
      <PaymentSelectionQuoteReview quote={null} error="network failed" onRequote={onRequote} />
    );

    expect(screen.getByTestId('payment-selection-quote-error')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('payment-selection-quote-requote'));
    expect(onRequote).toHaveBeenCalledOnce();
  });
});
