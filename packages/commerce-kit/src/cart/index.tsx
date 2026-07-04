'use client';

import type { ReactNode } from 'react';
import type { CommerceSlotContribution } from '../contracts';
import { COMMERCE_LABEL_KEYS, type CommerceLabelResolver } from '../labels';
import { CommerceButton, CommerceCard, CommerceSlotOutlet } from '../ui';

export const CART_FEATURE_ID = 'commerce.cart';

export interface CommerceCartSummaryProps {
  itemCount: number;
  total: ReactNode;
  labels: CommerceLabelResolver;
  checkoutLabel?: ReactNode;
  disabled?: boolean;
  summaryAfter?: readonly CommerceSlotContribution[];
  onCheckout(): void;
}

export function CommerceCartSummary({
  itemCount,
  total,
  labels,
  checkoutLabel = labels(COMMERCE_LABEL_KEYS.cart.checkout),
  disabled,
  summaryAfter,
  onCheckout,
}: CommerceCartSummaryProps) {
  return (
    <CommerceCard
      className="commerce-cart-summary"
      aria-label={labels(COMMERCE_LABEL_KEYS.cart.summary)}
    >
      <dl>
        <div>
          <dt>{labels(COMMERCE_LABEL_KEYS.cart.items)}</dt>
          <dd>{itemCount}</dd>
        </div>
        <div>
          <dt>{labels(COMMERCE_LABEL_KEYS.cart.total)}</dt>
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
export { COMMERCE_LABEL_KEYS } from '../labels';
export type { CommerceLabelKey, CommerceLabelResolver } from '../labels';
export type { CommerceFeaturePackage, CommerceSlotContribution } from '../contracts';
