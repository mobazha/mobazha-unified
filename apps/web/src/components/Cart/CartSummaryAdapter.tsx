'use client';

import React from 'react';
import {
  COMMERCE_LABEL_KEYS,
  CommerceCartSummaryContent,
  type CommerceCartSummaryRenderProps,
  type CommerceLabelResolver,
} from '@mobazha/commerce-kit/cart';
import { useI18n } from '@mobazha/core';

export interface CartSummaryAdapterProps {
  itemCount: number;
  total: React.ReactNode;
  checkoutLabel?: React.ReactNode;
  disabled?: boolean;
  renderSummary(props: CommerceCartSummaryRenderProps): React.ReactNode;
  onCheckout?: () => void;
}

/** Keep Unified layout and policy while consuming Commerce Kit summary semantics. */
export function CartSummaryAdapter({
  itemCount,
  total,
  checkoutLabel,
  disabled,
  renderSummary,
  onCheckout,
}: CartSummaryAdapterProps) {
  const { t } = useI18n();
  const labels = React.useCallback<CommerceLabelResolver>(
    key => {
      if (key === COMMERCE_LABEL_KEYS.cart.summary) return t('cart.orderSummary');
      if (key === COMMERCE_LABEL_KEYS.cart.items) return t('cart.items');
      if (key === COMMERCE_LABEL_KEYS.cart.total) return t('cart.total');
      if (key === COMMERCE_LABEL_KEYS.cart.checkout) return t('cart.checkout');
      return key;
    },
    [t]
  );

  return (
    <CommerceCartSummaryContent
      itemCount={itemCount}
      total={total}
      labels={labels}
      checkoutLabel={checkoutLabel}
      disabled={disabled}
      renderSummary={renderSummary}
      onCheckout={onCheckout}
    />
  );
}
