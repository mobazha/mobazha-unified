// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

/**
 * Immutable server-authored payment selection quote for Deal-backed orders.
 * Monetary fields are decimal strings in smallest units — never use Number/float.
 */
export interface PaymentSelectionQuote {
  id: string;
  orderID: string;
  feeQuoteID: string;
  dealLinkID: string;
  dealRevision: number;
  termsHash: string;
  schemaVersion: number;
  policyVersion: string;
  pricingCurrency: string;
  pricingAmount: string;
  pricingDivisibility: number;
  paymentCoin: string;
  paymentCurrency: string;
  paymentDivisibility: number;
  conversionRequired: boolean;
  exchangeRate: string;
  exchangeRateBase: string;
  exchangeRateQuote: string;
  exchangeRateQuoteDivisibility: number;
  rateSourceUpdatedAt?: string;
  paymentSubtotal: string;
  providerOrNetworkCost: string;
  platformPaymentCost: string;
  buyerPaymentTotal: string;
  expiresAt: string;
  createdAt: string;
}
