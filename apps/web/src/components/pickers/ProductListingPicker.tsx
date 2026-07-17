// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.
'use client';

import React, { memo, useCallback } from 'react';
import { useCurrency, useI18n, type ProductListItem } from '@mobazha/core';
import { EntityCombobox } from '@/components/ui/entity-combobox';
import { ProductListingSummary } from './ProductListingSummary';
import { cn } from '@/lib/utils';

export interface ProductListingPickerProps {
  listings: readonly ProductListItem[];
  value?: string;
  onValueChange: (slug: string) => void;
  id?: string;
  placeholder?: string;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
}

const getListingValue = (listing: ProductListItem) => listing.slug;
const getListingText = (listing: ProductListItem) => listing.title;
const getListingSearchText = (listing: ProductListItem) =>
  [
    listing.title,
    listing.slug,
    listing.cid,
    listing.contractType,
    listing.productType,
    listing.price.currency.code,
    ...(listing.tags ?? []),
  ]
    .filter(Boolean)
    .join(' ');

export const ProductListingPicker = memo(function ProductListingPicker({
  listings,
  value,
  onValueChange,
  id,
  placeholder,
  loading = false,
  disabled = false,
  className,
}: ProductListingPickerProps) {
  const { t } = useI18n();
  const { formatPrice, fromMinimalUnit } = useCurrency();

  const formatListingPrice = useCallback(
    (listing: ProductListItem) =>
      formatPrice(
        fromMinimalUnit(listing.price.amount, listing.price.currency.code),
        listing.price.currency.code
      ),
    [formatPrice, fromMinimalUnit]
  );

  const renderListing = useCallback(
    (listing: ProductListItem) => (
      <ProductListingSummary
        listing={listing}
        formattedPrice={formatListingPrice(listing)}
        variant="option"
      />
    ),
    [formatListingPrice]
  );

  const renderSelectedListing = useCallback(
    (listing: ProductListItem) => (
      <ProductListingSummary
        listing={listing}
        formattedPrice={formatListingPrice(listing)}
        variant="selected"
      />
    ),
    [formatListingPrice]
  );

  return (
    <EntityCombobox
      id={id}
      items={listings}
      value={value}
      onValueChange={onValueChange}
      getItemValue={getListingValue}
      getItemText={getListingText}
      getItemSearchText={getListingSearchText}
      renderItem={renderListing}
      renderValue={renderSelectedListing}
      placeholder={placeholder ?? t('admin.dealLinks.productPlaceholder')}
      searchPlaceholder={t('admin.dealLinks.productSearchPlaceholder')}
      emptyText={t('admin.dealLinks.productNoResults')}
      loadingText={t('admin.dealLinks.productLoading')}
      loading={loading}
      disabled={disabled}
      className={cn('h-auto min-h-11', className)}
      contentClassName="sm:min-w-[30rem]"
      testId="deal-product-picker"
    />
  );
});
