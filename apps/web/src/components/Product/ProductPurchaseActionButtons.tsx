'use client';

import React from 'react';
import {
  COMMERCE_LABEL_KEYS,
  CommerceProductActionButtons,
  type CommerceLabelResolver,
} from '@mobazha/commerce-kit/product';
import { useI18n } from '@mobazha/core';
import { Button, type ButtonProps } from '@/components/ui/button';

type HostButtonProps = Omit<ButtonProps, 'children' | 'disabled' | 'onClick'> & {
  'data-testid'?: string;
};

export interface ProductPurchaseActionButtonsProps {
  addToCartLabel?: React.ReactNode;
  buyNowLabel?: React.ReactNode;
  disabled?: boolean;
  className?: string;
  addToCartButtonProps?: HostButtonProps;
  buyNowButtonProps?: HostButtonProps;
  onAddToCart(): void;
  onBuyNow?(): void;
}

/**
 * Unified's visual adapter for Commerce Kit product actions. Commerce Kit owns
 * the action contract; this component deliberately keeps Unified's Button,
 * localization and responsive classes in the application.
 */
export function ProductPurchaseActionButtons({
  addToCartLabel,
  buyNowLabel,
  disabled,
  className,
  addToCartButtonProps,
  buyNowButtonProps,
  onAddToCart,
  onBuyNow,
}: ProductPurchaseActionButtonsProps) {
  const { t } = useI18n();
  const labels = React.useCallback<CommerceLabelResolver>(
    key => {
      if (key === COMMERCE_LABEL_KEYS.product.addToCart) return t('product.addToCart');
      if (key === COMMERCE_LABEL_KEYS.product.buyNow) return t('product.buyNow');
      return key;
    },
    [t]
  );

  return (
    <CommerceProductActionButtons
      labels={labels}
      addToCartLabel={addToCartLabel}
      buyNowLabel={buyNowLabel}
      disabled={disabled}
      className={className}
      onAddToCart={onAddToCart}
      onBuyNow={onBuyNow}
      renderAction={({ action, label, disabled: actionDisabled, onAction }) => {
        const buttonProps = action === 'add-to-cart' ? addToCartButtonProps : buyNowButtonProps;
        return (
          <Button
            {...buttonProps}
            type={buttonProps?.type ?? 'button'}
            disabled={actionDisabled}
            onClick={onAction}
          >
            {label}
          </Button>
        );
      }}
    />
  );
}
