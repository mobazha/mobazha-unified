'use client';

import type { ReactNode } from 'react';
import type { CommerceSlotContribution } from '../contracts';
import { CommerceButton, CommerceSlotOutlet } from '../ui';

export const PRODUCT_FEATURE_ID = 'commerce.product';

export interface CommerceProductActionsProps {
  price: ReactNode;
  availability?: ReactNode;
  addToCartLabel?: ReactNode;
  buyNowLabel?: ReactNode;
  disabled?: boolean;
  actionsAfter?: readonly CommerceSlotContribution[];
  onAddToCart(): void;
  onBuyNow?(): void;
}

export function CommerceProductActions({
  price,
  availability,
  addToCartLabel = 'Add to cart',
  buyNowLabel = 'Buy now',
  disabled,
  actionsAfter,
  onAddToCart,
  onBuyNow,
}: CommerceProductActionsProps) {
  return (
    <section className="commerce-product-actions" aria-label="Product purchase actions">
      <div className="commerce-product-actions__price">{price}</div>
      {availability ? (
        <div className="commerce-product-actions__availability">{availability}</div>
      ) : null}
      <div className="commerce-product-actions__buttons">
        <CommerceButton type="button" disabled={disabled} onClick={onAddToCart}>
          {addToCartLabel}
        </CommerceButton>
        {onBuyNow ? (
          <CommerceButton type="button" variant="secondary" disabled={disabled} onClick={onBuyNow}>
            {buyNowLabel}
          </CommerceButton>
        ) : null}
      </div>
      <CommerceSlotOutlet contributions={actionsAfter} />
    </section>
  );
}

export { COMMERCE_SLOTS } from '../slots';
export type { CommerceFeaturePackage, CommerceSlotContribution } from '../contracts';
