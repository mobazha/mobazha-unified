// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.
'use client';

import React, { memo } from 'react';
import { ImageIcon } from 'lucide-react';
import { getImageUrl, useI18n, type ProductListItem } from '@mobazha/core';
import { cn } from '@/lib/utils';

export type ProductListingSummaryVariant = 'option' | 'selected' | 'locked';

export interface ProductListingSummaryProps {
  listing?: ProductListItem;
  fallbackTitle?: string;
  formattedPrice?: string;
  variant?: ProductListingSummaryVariant;
  className?: string;
}

export const ProductListingSummary = memo(function ProductListingSummary({
  listing,
  fallbackTitle,
  formattedPrice,
  variant = 'option',
  className,
}: ProductListingSummaryProps) {
  const { t } = useI18n();
  const compact = variant === 'selected';
  const title = listing?.title || fallbackTitle || '';
  const imageUrl = getImageUrl(listing?.thumbnail?.small || listing?.thumbnail?.tiny);
  const typeLabel =
    listing?.contractType === 'SERVICE'
      ? t('admin.dealLinks.productTypeService')
      : listing?.contractType === 'DIGITAL_GOOD'
        ? t('admin.dealLinks.productTypeDigital')
        : null;

  return (
    <span className={cn('flex min-w-0 items-center', compact ? 'gap-2' : 'gap-3', className)}>
      <span
        className={cn(
          'flex shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted',
          compact ? 'h-8 w-8' : 'h-10 w-10'
        )}
      >
        {imageUrl ? (
          <img src={imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <ImageIcon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        )}
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate text-sm font-medium text-foreground">{title}</span>
          {!compact && typeLabel ? (
            <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
              {typeLabel}
            </span>
          ) : null}
        </span>
        {compact && formattedPrice ? (
          <span className="block truncate text-xs text-muted-foreground">{formattedPrice}</span>
        ) : listing?.slug ? (
          <span className="mt-0.5 block truncate font-mono text-xs text-muted-foreground">
            {listing.slug}
          </span>
        ) : null}
      </span>

      {variant === 'option' && formattedPrice ? (
        <span className="shrink-0 text-sm font-medium text-foreground">{formattedPrice}</span>
      ) : null}
    </span>
  );
});
