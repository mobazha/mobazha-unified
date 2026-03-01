'use client';

import React, { memo, useCallback } from 'react';
import { useI18n, type DisplayOrder } from '@mobazha/core';

export interface OrderShippingCardProps {
  displayOrder: DisplayOrder;
  className?: string;
}

export const OrderShippingCard = memo(function OrderShippingCard({
  displayOrder: order,
  className,
}: OrderShippingCardProps) {
  const { t } = useI18n();

  const formatCountryCode = useCallback(
    (code?: string) => {
      if (!code) return '';
      const upper = code.toUpperCase();
      const key = `order.countries.${upper}`;
      const translated = t(key);
      if (translated && translated !== key) return translated;
      return upper
        .toLowerCase()
        .split('_')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
    },
    [t]
  );

  const isPhysicalGood = order.contractType === 'PHYSICAL_GOOD';
  const hasShippingInfo = isPhysicalGood && (order.shippingRecipient || order.shippingAddressLine1);
  const hasShippingMeta = isPhysicalGood && (order.shippingOption || order.shippingService);

  if (!hasShippingInfo && !hasShippingMeta) return null;

  return (
    <div className={className}>
      {hasShippingInfo && (
        <div className="p-3 bg-muted/20 rounded-lg">
          <span className="text-muted-foreground block mb-1 text-xs font-medium">
            {t('order.shipTo')}
          </span>
          <div className="text-foreground whitespace-pre-line text-sm">
            {order.shippingRecipient && <p className="font-medium">{order.shippingRecipient}</p>}
            {order.shippingAddressLine1 && <p>{order.shippingAddressLine1}</p>}
            {order.shippingAddressLine2 && <p>{order.shippingAddressLine2}</p>}
            {(order.shippingCity || order.shippingState || order.shippingPostalCode) && (
              <p>
                {[order.shippingCity, order.shippingState, order.shippingPostalCode]
                  .filter(Boolean)
                  .join(', ')}
              </p>
            )}
            {order.shippingCountryCode && <p>{formatCountryCode(order.shippingCountryCode)}</p>}
          </div>
          {order.shippingAddress && order.shippingAddress !== 'No shipping address' && (
            <div className="flex items-center gap-3 mt-2">
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(order.shippingAddress)}
                className="text-xs text-primary hover:underline"
              >
                {t('order.actions.copyToClipboard')}
              </button>
              <a
                href={`https://maps.google.com/?q=${encodeURIComponent(order.shippingAddress.replace(/\n/g, ', '))}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline"
              >
                {t('order.viewOnMap')}
              </a>
            </div>
          )}
        </div>
      )}

      {hasShippingMeta && (
        <div className="flex gap-4 p-3 bg-muted/20 rounded-lg mt-2">
          {order.shippingOption && (
            <div>
              <span className="text-muted-foreground block mb-0.5 text-xs">
                {t('order.shippingOption')}
              </span>
              <p className="text-foreground text-sm">{order.shippingOption}</p>
            </div>
          )}
          {order.shippingService && (
            <div>
              <span className="text-muted-foreground block mb-0.5 text-xs">
                {t('order.shippingService')}
              </span>
              <p className="text-foreground text-sm">{order.shippingService}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
});
