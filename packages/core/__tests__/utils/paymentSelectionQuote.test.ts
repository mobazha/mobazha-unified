import { describe, expect, it } from 'vitest';
import type { Order } from '../../types/order';
import type { PaymentSelectionQuote } from '../../types/paymentSelectionQuote';
import {
  buildCanonicalFiatPaymentCoin,
  formatPaymentSelectionConversionRate,
  formatPaymentSelectionQuoteAmount,
  isDealBackedOrder,
  isPaymentSelectionQuoteExpired,
  isPaymentSelectionQuoteProvisioned,
  resolveCheckoutCanonicalPaymentCoin,
} from '../../utils/paymentSelectionQuote';

const dealOrder: Order = {
  contract: {
    orderOpen: {
      feeQuoteID: 'fee-quote-1',
      dealLinkID: 'deal-1',
      dealRevision: 2,
      termsHash: 'hash-abc',
    },
  },
  state: 'AWAITING_PAYMENT',
};

describe('paymentSelectionQuote utils', () => {
  it('detects Deal-backed orders from orderOpen linkage fields', () => {
    expect(isDealBackedOrder(dealOrder)).toBe(true);
    expect(
      isDealBackedOrder({ contract: { orderOpen: { feeQuoteID: 'x' } }, state: 'AWAITING_PAYMENT' })
    ).toBe(false);
    expect(isDealBackedOrder(null)).toBe(false);
  });

  it('builds canonical fiat payment coin', () => {
    expect(buildCanonicalFiatPaymentCoin('Stripe', 'usd')).toBe('fiat:stripe:USD');
  });

  it('resolves checkout canonical payment coin from token or fiat selection', () => {
    expect(
      resolveCheckoutCanonicalPaymentCoin({
        tokenAssetId: 'crypto:bitcoin:btc',
      })
    ).toBe('crypto:bitcoin:btc');
    expect(
      resolveCheckoutCanonicalPaymentCoin({
        tokenAssetId: 'crypto:bitcoin:btc',
        fiatProviderID: 'paypal',
        fiatCurrency: 'EUR',
      })
    ).toBe('fiat:paypal:EUR');
  });

  it('fails closed when a fiat provider has no currency', () => {
    expect(
      resolveCheckoutCanonicalPaymentCoin({
        tokenAssetId: 'crypto:bitcoin:btc',
        fiatProviderID: 'paypal',
      })
    ).toBeUndefined();
    expect(() => buildCanonicalFiatPaymentCoin('paypal', '')).toThrow();
  });

  it('formats quote amounts from minimal-unit strings without float conversion', () => {
    expect(formatPaymentSelectionQuoteAmount('4999', 2, 'USD')).toBe('49.99');
    expect(formatPaymentSelectionQuoteAmount('0', 2, 'USD')).toBe('0.00');
  });

  it('formats server conversion rate text without recomputing totals', () => {
    const quote: PaymentSelectionQuote = {
      id: 'q1',
      orderID: 'o1',
      feeQuoteID: 'f1',
      dealLinkID: 'd1',
      dealRevision: 1,
      termsHash: 'h',
      schemaVersion: 1,
      policyVersion: '1',
      pricingCurrency: 'USD',
      pricingAmount: '100',
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

    expect(formatPaymentSelectionConversionRate(quote)).toBe('1 BTC = 2500.00 USD');
  });

  it('treats quote expiry reactively by ISO timestamp', () => {
    expect(
      isPaymentSelectionQuoteExpired(
        {
          id: 'q1',
          orderID: 'o1',
          feeQuoteID: 'f1',
          dealLinkID: 'd1',
          dealRevision: 1,
          termsHash: 'h',
          schemaVersion: 1,
          policyVersion: '1',
          pricingCurrency: 'USD',
          pricingAmount: '100',
          pricingDivisibility: 2,
          paymentCoin: 'fiat:stripe:USD',
          paymentCurrency: 'USD',
          paymentDivisibility: 2,
          conversionRequired: false,
          exchangeRate: '1',
          exchangeRateBase: 'USD',
          exchangeRateQuote: 'USD',
          exchangeRateQuoteDivisibility: 2,
          paymentSubtotal: '100',
          providerOrNetworkCost: '0',
          platformPaymentCost: '0',
          buyerPaymentTotal: '100',
          expiresAt: '2020-01-01T00:00:00Z',
          createdAt: '2020-01-01T00:00:00Z',
        },
        Date.parse('2021-01-01T00:00:00Z')
      )
    ).toBe(true);
  });

  it('fails closed for an invalid quote expiry', () => {
    expect(
      isPaymentSelectionQuoteExpired({
        id: 'q1',
        orderID: 'o1',
        feeQuoteID: 'f1',
        dealLinkID: 'd1',
        dealRevision: 1,
        termsHash: 'h',
        schemaVersion: 1,
        policyVersion: '1',
        pricingCurrency: 'USD',
        pricingAmount: '100',
        pricingDivisibility: 2,
        paymentCoin: 'fiat:stripe:USD',
        paymentCurrency: 'USD',
        paymentDivisibility: 2,
        conversionRequired: false,
        exchangeRate: '1',
        exchangeRateBase: 'USD',
        exchangeRateQuote: 'USD',
        exchangeRateQuoteDivisibility: 2,
        paymentSubtotal: '100',
        providerOrNetworkCost: '0',
        platformPaymentCost: '0',
        buyerPaymentTotal: '100',
        expiresAt: 'invalid',
        createdAt: '2020-01-01T00:00:00Z',
      })
    ).toBe(true);
  });

  it('keeps an expired quote authoritative only when bound to an actionable session', () => {
    const quote: PaymentSelectionQuote = {
      id: 'q-bound',
      orderID: 'o1',
      feeQuoteID: 'f1',
      dealLinkID: 'd1',
      dealRevision: 1,
      termsHash: 'h',
      schemaVersion: 1,
      policyVersion: '1',
      pricingCurrency: 'USD',
      pricingAmount: '100',
      pricingDivisibility: 2,
      paymentCoin: 'fiat:stripe:USD',
      paymentCurrency: 'USD',
      paymentDivisibility: 2,
      conversionRequired: false,
      exchangeRate: '100',
      exchangeRateBase: 'USD',
      exchangeRateQuote: 'USD',
      exchangeRateQuoteDivisibility: 2,
      paymentSubtotal: '100',
      providerOrNetworkCost: '0',
      platformPaymentCost: '0',
      buyerPaymentTotal: '100',
      expiresAt: '2020-01-01T00:00:00Z',
      createdAt: '2020-01-01T00:00:00Z',
    };
    const session = {
      sessionID: 'ps-o1',
      orderID: 'o1',
      paymentSelectionQuoteID: 'q-bound',
      paymentCoin: 'fiat:stripe:USD',
      settlementMode: 'provider_checkout' as const,
      productMode: 'cancelable' as const,
      status: 'awaiting_funds',
      expectedAmount: '1.00',
      expiresAt: '2020-01-01T01:00:00Z',
      fundingTarget: {
        type: 'provider_session' as const,
        assetID: 'fiat:stripe:USD',
        amount: '1.00',
        providerData: { sessionID: 'pi_123' },
      },
      paymentProgress: {
        observedAmount: '0',
        requiredAmount: '1.00',
        remainingAmount: '1.00',
        observationCount: 0,
        fundingState: 'provider_processing',
      },
    };

    expect(isPaymentSelectionQuoteProvisioned(quote, session)).toBe(true);
    expect(
      isPaymentSelectionQuoteProvisioned(quote, {
        ...session,
        fundingTarget: { ...session.fundingTarget, providerData: {} },
      })
    ).toBe(false);
  });
});
