'use client';

import type { ReactNode } from 'react';
import type { CommerceSlotContribution } from '../contracts';
import { COMMERCE_LABEL_KEYS, type CommerceLabelResolver } from '../labels';
import { CommerceButton, CommerceCard, CommerceSlotOutlet } from '../ui';

export const CART_FEATURE_ID = 'commerce.cart';

export interface CommerceCartSummaryRenderProps {
  itemCount: number;
  total: ReactNode;
  checkoutLabel: ReactNode;
  checkoutDisabled: boolean;
  onCheckout?: () => void;
}

export interface CommerceCartSummaryContentProps {
  itemCount: number;
  total: ReactNode;
  labels: CommerceLabelResolver;
  checkoutLabel?: ReactNode;
  disabled?: boolean;
  renderSummary?(props: CommerceCartSummaryRenderProps): ReactNode;
  onCheckout?: () => void;
}

/**
 * Stable cart-summary semantics without imposing a card or responsive layout.
 * Rich hosts can render the normalized state with their own design system;
 * smaller hosts can use the default definition list and checkout button.
 */
export function CommerceCartSummaryContent({
  itemCount,
  total,
  labels,
  checkoutLabel = labels(COMMERCE_LABEL_KEYS.cart.checkout),
  disabled = false,
  renderSummary,
  onCheckout,
}: CommerceCartSummaryContentProps) {
  const checkoutDisabled = disabled || itemCount === 0;
  const state: CommerceCartSummaryRenderProps = {
    itemCount,
    total,
    checkoutLabel,
    checkoutDisabled,
    onCheckout,
  };

  if (renderSummary) return renderSummary(state);

  return (
    <>
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
      {onCheckout ? (
        <CommerceButton type="button" disabled={checkoutDisabled} onClick={onCheckout}>
          {checkoutLabel}
        </CommerceButton>
      ) : null}
    </>
  );
}

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
      <CommerceCartSummaryContent
        itemCount={itemCount}
        total={total}
        labels={labels}
        checkoutLabel={checkoutLabel}
        disabled={disabled}
        onCheckout={onCheckout}
      />
      <CommerceSlotOutlet contributions={summaryAfter} />
    </CommerceCard>
  );
}

export { COMMERCE_SLOTS } from '../slots';
export { COMMERCE_LABEL_KEYS } from '../labels';
export type { CommerceLabelKey, CommerceLabelResolver } from '../labels';
export type { CommerceFeaturePackage, CommerceSlotContribution } from '../contracts';
