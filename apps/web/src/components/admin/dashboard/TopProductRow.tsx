import React from 'react';
import Link from 'next/link';
import { Package, Star } from 'lucide-react';
import { useCurrency, getImageUrl } from '@mobazha/core';
import type { ProductListItem } from '@mobazha/core';
import { getProductCurrencyCode } from './utils';

export function TopProductRow({ product }: { product: ProductListItem }) {
  const { formatPrice, fromMinimalUnit } = useCurrency();
  const thumbnail = product.thumbnail?.small ? getImageUrl(product.thumbnail.small) : '';
  const currencyCode = getProductCurrencyCode(product);

  return (
    <Link
      href={`/listing/edit/${product.slug}?from=admin`}
      className="flex items-center gap-3 py-3 border-b border-border last:border-0 hover:bg-muted/50 -mx-2 px-2 rounded-md transition-colors"
    >
      <div className="w-10 h-10 rounded-lg bg-muted overflow-hidden shrink-0">
        {thumbnail ? (
          <img src={thumbnail} alt="" loading="lazy" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-4 h-4 text-muted-foreground" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{product.title}</p>
        {product.price?.amount != null && (
          <p className="text-xs text-muted-foreground">
            {formatPrice(fromMinimalUnit(product.price.amount, currencyCode), currencyCode)}
          </p>
        )}
      </div>
      {product.averageRating != null && product.averageRating > 0 && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
          <span>{product.averageRating.toFixed(1)}</span>
        </div>
      )}
    </Link>
  );
}
