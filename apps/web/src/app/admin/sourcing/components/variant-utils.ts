import type { CatalogVariant, StoreSyncVariant } from '@mobazha/core';

export type Variant = CatalogVariant | StoreSyncVariant;

export function getVariantPrice(v: Variant): number {
  if ('price' in v) return parseFloat(v.price) || 0;
  if ('retailPrice' in v) return parseFloat(v.retailPrice) || 0;
  return 0;
}

export function getVariantTitle(v: Variant): string {
  if ('title' in v) return v.title;
  if ('name' in v) return v.name;
  return v.id;
}

export function getVariantInStock(v: Variant): boolean {
  return 'inStock' in v ? v.inStock : true;
}
