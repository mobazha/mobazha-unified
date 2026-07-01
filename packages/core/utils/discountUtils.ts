/**
 * Discount display utilities for checkout and product pages.
 *
 * Backend enum values are lowercase (percentage, fixed_amount, free_shipping).
 * Matching is case-insensitive for robustness.
 */

import type { ApplicableDiscount } from '../services/api/discounts';

export interface AppliedDiscount {
  id: string;
  title: string;
  code?: string;
  valueType: string;
  value: number;
  savedAmount: number;
  currency: string;
  auto?: boolean;
}

function normalizeValueType(vt: string): string {
  return vt.toLowerCase();
}

/**
 * Format discount value for display.
 * Accepts optional i18n function; falls back to English defaults.
 */
export function formatDiscountValue(
  valueType: string,
  value: number,
  currency?: string,
  t?: (key: string, params?: Record<string, unknown>) => string
): string {
  switch (normalizeValueType(valueType)) {
    case 'percentage':
      return t ? t('product.discount.off', { value: `${value}%` }) : `${value}% off`;
    case 'fixed_amount':
      return t
        ? t('product.discount.off', { value: `${currency || ''} ${value}`.trim() })
        : `${currency || ''} ${value} off`.trim();
    case 'free_shipping':
      return t ? t('product.discount.freeShipping') : 'Free shipping';
    default:
      return '';
  }
}

/**
 * Calculate how much more the buyer needs to spend to qualify for a discount.
 * Returns 0 if already qualified.
 */
export function proximityToDiscount(discount: ApplicableDiscount, currentSubtotal: number): number {
  if (discount.minPurchaseType !== 'min_amount' || !discount.minAmount) return 0;
  const remaining = Number(discount.minAmount) - currentSubtotal;
  return Math.max(0, remaining);
}

/**
 * Calculate the discount amount for a given subtotal.
 */
export function calculateDiscountAmount(
  valueType: string,
  value: number,
  subtotal: number,
  maxDiscountAmount?: number
): number {
  let amount = 0;
  switch (normalizeValueType(valueType)) {
    case 'percentage':
      amount = subtotal * (value / 100);
      break;
    case 'fixed_amount':
      amount = value;
      break;
    case 'free_shipping':
      return 0;
    default:
      return 0;
  }

  if (maxDiscountAmount && maxDiscountAmount > 0) {
    amount = Math.min(amount, maxDiscountAmount);
  }

  return Math.min(amount, subtotal);
}

/**
 * Format a proximity message like "Add $X more to get free shipping!"
 */
export function formatProximityMessage(
  discount: ApplicableDiscount,
  currentSubtotal: number,
  formatCurrency: (amount: number, currency: string) => string,
  t?: (key: string, params?: Record<string, unknown>) => string
): string | null {
  const remaining = proximityToDiscount(discount, currentSubtotal);
  if (remaining <= 0) return null;

  const formattedAmount = formatCurrency(remaining, discount.currency);
  const discountDesc = formatDiscountValue(
    discount.valueType,
    Number(discount.value) || 0,
    discount.currency,
    t
  );
  return `Add ${formattedAmount} more to get ${discountDesc}!`;
}
