import { getPaymentCoinDisplayLabel } from '../data/tokens';
import type { DisplayOrderPricingBreakdown } from '../types/orderDisplay';

export interface OrderPricingDisplay {
  amount: string;
  currency: string;
}

export interface ResolveOrderPricingDisplayInput {
  pricingBreakdown?: Pick<DisplayOrderPricingBreakdown, 'total' | 'currency'>;
  pricingAmount?: string;
  pricingCurrency?: string;
}

/**
 * Resolve listing/pricing currency amounts for order payment UI.
 * Prefers backend pricingBreakdown when available (matches Summary card).
 */
export function resolveOrderPricingDisplay(
  input: ResolveOrderPricingDisplayInput
): OrderPricingDisplay | undefined {
  const currency = input.pricingBreakdown?.currency || input.pricingCurrency;
  const amount = input.pricingBreakdown?.total || input.pricingAmount;
  if (!currency || amount == null || amount === '') {
    return undefined;
  }
  return { amount, currency };
}

/**
 * True when listing is priced in one currency and payment settles in another
 * (e.g. USD listing paid with ETH). Uses order snapshot fields — no live FX.
 */
export function isCrossCurrencyOrderPayment(
  pricing: OrderPricingDisplay | undefined,
  _paymentCoin: string | undefined,
  paymentDisplayLabel: string
): boolean {
  if (!pricing || !paymentDisplayLabel.trim()) {
    return false;
  }
  return pricing.currency.toUpperCase() !== paymentDisplayLabel.toUpperCase();
}

export function resolvePaymentDisplayLabel(
  paymentCoin: string | undefined,
  currency: string
): string {
  return paymentCoin ? getPaymentCoinDisplayLabel(paymentCoin) : currency;
}

export function isCrossCurrencyOrderPaymentFromFields(input: {
  pricingBreakdown?: Pick<DisplayOrderPricingBreakdown, 'total' | 'currency'>;
  pricingAmount?: string;
  pricingCurrency?: string;
  paymentCoin?: string;
  currency: string;
}): boolean {
  const pricing = resolveOrderPricingDisplay(input);
  const paymentLabel = resolvePaymentDisplayLabel(input.paymentCoin, input.currency);
  return isCrossCurrencyOrderPayment(pricing, input.paymentCoin, paymentLabel);
}
