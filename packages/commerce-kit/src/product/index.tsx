'use client';

import type { ReactNode } from 'react';
import type { CommerceSlotContribution } from '../contracts';
import { COMMERCE_LABEL_KEYS, type CommerceLabelResolver } from '../labels';
import { CommerceButton, CommerceSlotOutlet } from '../ui';

export const PRODUCT_FEATURE_ID = 'commerce.product';

export type CommerceProductActionId = 'add-to-cart' | 'buy-now';

export interface CommerceProductActionRenderProps {
  action: CommerceProductActionId;
  label: ReactNode;
  disabled: boolean;
  onAction(): void;
}

export interface CommerceProductActionButtonsProps {
  labels: CommerceLabelResolver;
  addToCartLabel?: ReactNode;
  buyNowLabel?: ReactNode;
  disabled?: boolean;
  className?: string;
  renderAction?(props: CommerceProductActionRenderProps): ReactNode;
  onAddToCart(): void;
  onBuyNow?(): void;
}

/**
 * Stable action semantics with a host-rendering escape hatch. Rich products can
 * preserve their design system and responsive layout without reimplementing
 * which commerce action is present or how its disabled/click state is wired.
 */
export function CommerceProductActionButtons({
  labels,
  addToCartLabel = labels(COMMERCE_LABEL_KEYS.product.addToCart),
  buyNowLabel = labels(COMMERCE_LABEL_KEYS.product.buyNow),
  disabled = false,
  className,
  renderAction,
  onAddToCart,
  onBuyNow,
}: CommerceProductActionButtonsProps) {
  const renderControl = (props: CommerceProductActionRenderProps): ReactNode => {
    if (renderAction) return renderAction(props);
    return (
      <CommerceButton
        type="button"
        variant={props.action === 'buy-now' ? 'secondary' : 'primary'}
        disabled={props.disabled}
        onClick={props.onAction}
      >
        {props.label}
      </CommerceButton>
    );
  };

  return (
    <div className={['commerce-product-actions__buttons', className].filter(Boolean).join(' ')}>
      {renderControl({
        action: 'add-to-cart',
        label: addToCartLabel,
        disabled,
        onAction: onAddToCart,
      })}
      {onBuyNow
        ? renderControl({
            action: 'buy-now',
            label: buyNowLabel,
            disabled,
            onAction: onBuyNow,
          })
        : null}
    </div>
  );
}

export interface CommerceProductActionsProps {
  price: ReactNode;
  labels: CommerceLabelResolver;
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
  labels,
  availability,
  addToCartLabel = labels(COMMERCE_LABEL_KEYS.product.addToCart),
  buyNowLabel = labels(COMMERCE_LABEL_KEYS.product.buyNow),
  disabled,
  actionsAfter,
  onAddToCart,
  onBuyNow,
}: CommerceProductActionsProps) {
  return (
    <section
      className="commerce-product-actions"
      aria-label={labels(COMMERCE_LABEL_KEYS.product.actions)}
    >
      <div className="commerce-product-actions__price">{price}</div>
      {availability ? (
        <div className="commerce-product-actions__availability">{availability}</div>
      ) : null}
      <CommerceProductActionButtons
        labels={labels}
        addToCartLabel={addToCartLabel}
        buyNowLabel={buyNowLabel}
        disabled={disabled}
        onAddToCart={onAddToCart}
        onBuyNow={onBuyNow}
      />
      <CommerceSlotOutlet contributions={actionsAfter} />
    </section>
  );
}

export { COMMERCE_SLOTS } from '../slots';
export { COMMERCE_LABEL_KEYS } from '../labels';
export type { CommerceLabelKey, CommerceLabelResolver } from '../labels';
export type { CommerceFeaturePackage, CommerceSlotContribution } from '../contracts';
