'use client';

import React, { memo, useMemo } from 'react';
import Link from 'next/link';
import { ProductImageNative } from '@/components/ui/product-image';
import { AvatarCompat as Avatar } from '@/components/ui/avatar-compat';
import { useI18n, useCurrency, buildProductHref, type DisplayOrder } from '@mobazha/core';

export interface OrderProductCardProps {
  displayOrder: DisplayOrder;
  className?: string;
}

export const OrderProductCard = memo(function OrderProductCard({
  displayOrder: order,
  className,
}: OrderProductCardProps) {
  const { t } = useI18n();
  const { formatPrice: formatCurrencyPrice } = useCurrency();

  const typeLabel = useMemo(() => {
    if (!order.contractType || order.contractType === 'PHYSICAL_GOOD') return null;
    if (order.contractType === 'SERVICE') return t('order.product.service');
    if (order.contractType === 'DIGITAL_GOOD') return t('order.product.digital');
    return null;
  }, [order.contractType, t]);

  const formattedPrice = useMemo(() => {
    const price = order.items[0]?.price;
    const currency = order.items[0]?.currency;
    if (!price || !currency) return '--';
    return formatCurrencyPrice(price, currency);
  }, [order.items, formatCurrencyPrice]);

  const item = order.items[0];
  const productHref = order.slug ? buildProductHref(order.slug, order.vendor?.peerID) : null;

  const cardContent = (
    <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl border border-border/50 hover:bg-muted/50 hover:border-primary/30 hover:shadow-sm transition-all group">
      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg overflow-hidden flex-shrink-0 ring-1 ring-border/50 group-hover:ring-primary/30 transition-all">
        <ProductImageNative
          src={item?.image}
          alt={item?.title ?? ''}
          className="group-hover:scale-105 transition-transform duration-300"
          iconSize="sm"
        />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-foreground text-sm truncate group-hover:text-primary transition-colors">
          {item?.title || t('order.unknownItem')}
        </h4>
        <div className="flex flex-col gap-1 mt-1">
          {typeLabel && (
            <span className="text-xs text-info bg-info/8 px-1.5 py-0.5 rounded w-fit">
              {typeLabel}
            </span>
          )}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">{t('order.product.unitPrice')}</span>
            <span className="text-sm text-primary font-medium">{formattedPrice}</span>
          </div>
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <span className="text-xs text-muted-foreground">{t('order.product.quantity')}: </span>
        <span className="text-sm font-medium text-foreground">{item?.quantity || 1}</span>
      </div>
    </div>
  );

  return (
    <div className={className}>
      {productHref ? (
        <Link href={productHref} className="block">
          {cardContent}
        </Link>
      ) : (
        cardContent
      )}

      {order.vendor?.peerID && (
        <Link
          href={`/store/${order.vendor.peerID}`}
          className="flex items-center gap-2 mt-2 px-1 group/vendor"
        >
          <Avatar
            src={order.vendor.avatar}
            name={order.vendor.name}
            size="sm"
            className="w-5 h-5 ring-1 ring-border/40"
          />
          <span className="text-xs text-muted-foreground group-hover/vendor:text-primary transition-colors">
            {t('order.product.soldBy')}{' '}
            <span className="font-medium text-foreground group-hover/vendor:text-primary">
              {order.vendor.name}
            </span>
          </span>
        </Link>
      )}
    </div>
  );
});
