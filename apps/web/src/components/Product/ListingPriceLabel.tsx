'use client';

import { useMemo } from 'react';
import {
  useCurrencyFormat,
  useI18n,
  listingDisplayPriceFromListItem,
  resolveListingDisplayPrice,
  formatListingDisplayPriceLabel,
  type ListingDisplayPriceInput,
  type ProductListItem,
} from '@mobazha/core';

interface ListingPriceLabelProps {
  className?: string;
  currencyCode?: string;
  divisibility?: number;
  listItem?: ProductListItem;
  priceInput?: ListingDisplayPriceInput;
}

export function ListingPriceLabel({
  className,
  currencyCode,
  divisibility = 2,
  listItem,
  priceInput,
}: ListingPriceLabelProps) {
  const { t } = useI18n();
  const { formatLocalPrice } = useCurrencyFormat();

  const resolvedCurrency =
    currencyCode?.trim() || listItem?.price?.currency?.code?.trim() || undefined;

  const label = useMemo(() => {
    const result = listItem
      ? listingDisplayPriceFromListItem(listItem)
      : resolveListingDisplayPrice(priceInput ?? { basePrice: 0 });
    return formatListingDisplayPriceLabel(
      result,
      formatLocalPrice,
      resolvedCurrency,
      divisibility,
      t
    );
  }, [divisibility, formatLocalPrice, listItem, priceInput, resolvedCurrency, t]);

  return <span className={className}>{label}</span>;
}
