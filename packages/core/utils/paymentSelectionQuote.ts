// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import type { Order } from '../types/order';
import type { PaymentSelectionQuote } from '../types/paymentSelectionQuote';
import type { PaymentSession } from '../types/paymentSession';
import { getPaymentCoinDisplayLabel } from '../data/tokens';
import { formatMinimalUnitAmountString } from './transforms/minimalUnit';

function readNonEmptyString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/** Detect Deal-backed orders from contract.orderOpen linkage fields. */
export function isDealBackedOrder(order: Order | null | undefined): boolean {
  const open = order?.contract?.orderOpen;
  if (!open) return false;

  const feeQuoteID = readNonEmptyString(open.feeQuoteID);
  const dealLinkID = readNonEmptyString(open.dealLinkID);
  const termsHash = readNonEmptyString(open.termsHash);
  const dealRevision = open.dealRevision;

  return Boolean(
    feeQuoteID &&
    dealLinkID &&
    termsHash &&
    typeof dealRevision === 'number' &&
    Number.isInteger(dealRevision) &&
    dealRevision > 0
  );
}

/**
 * True when payment-session provisioning needs an immutable selection quote.
 * Mirrors Core MatchesPricingCurrency: same pricing currency skips the quote;
 * cross-currency (including Deal and standard catalog checkout) requires one.
 */
export function isPaymentSelectionQuoteRequired(options: {
  pricingCurrency?: string | null;
  paymentCoin?: string | null;
}): boolean {
  const pricingCurrency = (options.pricingCurrency || '').trim();
  const paymentCoin = (options.paymentCoin || '').trim();
  if (!pricingCurrency || !paymentCoin) return false;
  if (paymentCoin.toLowerCase() === pricingCurrency.toLowerCase()) return false;

  if (paymentCoin.toLowerCase().startsWith('fiat:')) {
    const fiatCurrency = paymentCoin.split(':')[2]?.trim() || '';
    return Boolean(fiatCurrency) && fiatCurrency.toUpperCase() !== pricingCurrency.toUpperCase();
  }

  const paymentLabel = getPaymentCoinDisplayLabel(paymentCoin).trim();
  if (!paymentLabel) return true;
  return paymentLabel.toUpperCase() !== pricingCurrency.toUpperCase();
}

export function isPaymentSelectionQuoteExpired(
  quote: PaymentSelectionQuote | null | undefined,
  now = Date.now()
): boolean {
  if (!quote?.expiresAt) return true;
  const parsed = Date.parse(quote.expiresAt);
  return !Number.isFinite(parsed) || parsed <= now;
}

/** A quote remains authoritative after expiry only when Core already bound it to an actionable target. */
export function isPaymentSelectionQuoteProvisioned(
  quote: PaymentSelectionQuote | null | undefined,
  session: PaymentSession | null | undefined
): boolean {
  if (
    !quote ||
    !session ||
    session.paymentSelectionQuoteID !== quote.id ||
    session.paymentCoin !== quote.paymentCoin
  ) {
    return false;
  }

  const address = session.fundingTarget?.address?.trim();
  const providerSessionID = session.fundingTarget?.providerData?.sessionID;
  return Boolean(
    address || (typeof providerSessionID === 'string' && providerSessionID.trim().length > 0)
  );
}

export function buildCanonicalFiatPaymentCoin(providerID: string, currency: string): string {
  const provider = (providerID || '').trim().toLowerCase();
  const resolvedCurrency = (currency || '').trim().toUpperCase();
  if (!provider || !resolvedCurrency) {
    throw new Error('fiat provider and currency are required');
  }
  return `fiat:${provider}:${resolvedCurrency}`;
}

/** Resolve checkout selection to canonical paymentCoin for quote/session APIs. */
export function resolveCheckoutCanonicalPaymentCoin(params: {
  tokenAssetId?: string;
  fiatProviderID?: string;
  fiatCurrency?: string;
}): string | undefined {
  const providerID = (params.fiatProviderID || '').trim();
  const fiatCurrency = (params.fiatCurrency || '').trim();
  if (providerID) {
    if (!fiatCurrency) return undefined;
    return buildCanonicalFiatPaymentCoin(providerID, fiatCurrency);
  }

  const tokenAssetId = (params.tokenAssetId || '').trim();
  return tokenAssetId || undefined;
}

export function formatPaymentSelectionQuoteAmount(
  rawAmount: string,
  divisibility: number,
  coinOrCurrency: string
): string {
  return (
    formatMinimalUnitAmountString(rawAmount, divisibility, coinOrCurrency) ??
    formatMinimalUnitAmountString(rawAmount, divisibility) ??
    rawAmount
  );
}

/** Display server-provided conversion rate without client-side recomputation. */
export function formatPaymentSelectionConversionRate(quote: PaymentSelectionQuote): string {
  const quoteAmount = formatPaymentSelectionQuoteAmount(
    quote.exchangeRate,
    quote.exchangeRateQuoteDivisibility,
    quote.exchangeRateQuote
  );

  return `1 ${quote.exchangeRateBase} = ${quoteAmount} ${quote.exchangeRateQuote}`;
}
