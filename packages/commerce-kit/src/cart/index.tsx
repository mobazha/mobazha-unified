'use client';

import type { ReactNode } from 'react';
import type { CommerceSlotContribution } from '../contracts';
import { CommerceButton, CommerceCard, CommerceSlotOutlet } from '../ui';

export const CART_FEATURE_ID = 'commerce.cart';

export interface CommerceCartSummaryProps {
  itemCount: number;
  total: ReactNode;
  checkoutLabel?: ReactNode;
  disabled?: boolean;
  summaryAfter?: readonly CommerceSlotContribution[];
  onCheckout(): void;
}

export function CommerceCartSummary({
  itemCount,
  total,
  checkoutLabel = 'Checkout',
  disabled,
  summaryAfter,
  onCheckout,
}: CommerceCartSummaryProps) {
  return (
    <CommerceCard className="commerce-cart-summary" aria-label="Cart summary">
      <dl>
        <div>
          <dt>Items</dt>
          <dd>{itemCount}</dd>
        </div>
        <div>
          <dt>Total</dt>
          <dd>{total}</dd>
        </div>
      </dl>
      <CommerceButton type="button" disabled={disabled || itemCount === 0} onClick={onCheckout}>
        {checkoutLabel}
      </CommerceButton>
      <CommerceSlotOutlet contributions={summaryAfter} />
    </CommerceCard>
  );
}

export { COMMERCE_SLOTS } from '../slots';
export type { CommerceFeaturePackage, CommerceSlotContribution } from '../contracts';
