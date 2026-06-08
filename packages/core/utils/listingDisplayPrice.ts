/**
 * Storefront listing price resolution.
 * Display price prefers explicit SKU prices; base price is fallback only.
 */

import type { Price, ProductListItem, ProductSku } from '../types';
import { formatMinimalUnitAmountString } from './transforms/minimalUnit';
import { parsePriceFields } from './transforms/priceTransform';

export interface ListingDisplayPriceInput {
  basePrice: string | number;
  skus?: Array<Pick<ProductSku, 'price'>>;
}

export interface ListingDisplayPriceResult {
  /** Buyer-facing amount in minimal units */
  amount: number;
  /** Minimal-unit amount as integer string (safe for large crypto values) */
  amountString: string;
  baseAmount: number;
  baseAmountString: string;
  minAmount: number;
  minAmountString: string;
  maxAmount: number;
  maxAmountString: string;
  hasExplicitSkuPrices: boolean;
  hasPriceRange: boolean;
}

export interface ListingPriceMeta {
  price: Price;
  basePrice?: Price;
  priceMax?: Price;
  priceHasRange?: boolean;
}

const MAX_SAFE = BigInt(Number.MAX_SAFE_INTEGER);

function parseMinimalAmountBigInt(value: string | number | undefined): bigint | null {
  if (value == null || value === '') return null;
  const raw = String(value).trim();
  if (!/^\d+$/.test(raw)) return null;
  try {
    return BigInt(raw);
  } catch {
    return null;
  }
}

function bigintToSafeNumber(value: bigint): number {
  if (value > MAX_SAFE) {
    return Number(MAX_SAFE);
  }
  return Number(value);
}

function collectExplicitSkuAmountsBigInt(skus?: Array<Pick<ProductSku, 'price'>>): bigint[] {
  if (!skus?.length) return [];
  const amounts: bigint[] = [];
  for (const sku of skus) {
    const amount = parseMinimalAmountBigInt(sku.price);
    if (amount != null) amounts.push(amount);
  }
  return amounts;
}

function minBigInt(values: bigint[]): bigint {
  let min = values[0];
  for (let i = 1; i < values.length; i++) {
    if (values[i] < min) min = values[i];
  }
  return min;
}

function maxBigInt(values: bigint[]): bigint {
  let max = values[0];
  for (let i = 1; i < values.length; i++) {
    if (values[i] > max) max = values[i];
  }
  return max;
}

function buildDisplayResult(
  display: bigint,
  base: bigint,
  max: bigint,
  hasExplicitSkuPrices: boolean
): ListingDisplayPriceResult {
  const hasPriceRange = display !== max;
  return {
    amount: bigintToSafeNumber(display),
    amountString: display.toString(),
    baseAmount: bigintToSafeNumber(base),
    baseAmountString: base.toString(),
    minAmount: bigintToSafeNumber(display),
    minAmountString: display.toString(),
    maxAmount: bigintToSafeNumber(max),
    maxAmountString: max.toString(),
    hasExplicitSkuPrices,
    hasPriceRange,
  };
}

export function resolveListingDisplayPrice(
  input: ListingDisplayPriceInput
): ListingDisplayPriceResult {
  const base = parseMinimalAmountBigInt(input.basePrice) ?? BigInt(0);
  const explicit = collectExplicitSkuAmountsBigInt(input.skus);

  if (explicit.length === 0) {
    return buildDisplayResult(base, base, base, false);
  }

  const minAmount = minBigInt(explicit);
  const maxAmount = maxBigInt(explicit);
  return buildDisplayResult(minAmount, base, maxAmount, true);
}

function resolveCurrencyFromListItem(
  item: ProductListItem
): { code: string; divisibility: number } | null {
  const { currencyCode, divisibility } = parsePriceFields(item.price);
  const code = currencyCode || item.price?.currency?.code;
  if (!code?.trim()) return null;
  return {
    code,
    divisibility: divisibility ?? item.price?.currency?.divisibility ?? 2,
  };
}

export function listingPriceMetaFromListItem(item: ProductListItem): ListingPriceMeta | null {
  const currency = resolveCurrencyFromListItem(item);
  if (!currency) return null;

  const { amountString } = parsePriceFields(item.price);
  const meta: ListingPriceMeta = {
    price: { amount: amountString, currency },
    priceHasRange: item.priceHasRange,
  };

  if (item.basePrice) {
    const base = parsePriceFields(item.basePrice);
    meta.basePrice = {
      amount: base.amountString,
      currency: {
        code: base.currencyCode ?? currency.code,
        divisibility: base.divisibility ?? currency.divisibility,
      },
    };
  }
  if (item.priceMax) {
    const max = parsePriceFields(item.priceMax);
    meta.priceMax = {
      amount: max.amountString,
      currency: {
        code: max.currencyCode ?? currency.code,
        divisibility: max.divisibility ?? currency.divisibility,
      },
    };
  }

  return meta;
}

/** ProductCard-friendly price fields derived from a list item. */
export function productCardPriceFieldsFromListItem(item: ProductListItem): {
  /** Minimal-unit amount; string preserves large crypto values. */
  price: number | string;
  priceFrom: boolean;
  currencyCode?: string;
  divisibility?: number;
} {
  const display = listingDisplayPriceFromListItem(item);
  const { currencyCode, divisibility } = parsePriceFields(item.price);
  const resolvedCode = currencyCode || item.price?.currency?.code;
  const resolvedDivisibility = divisibility ?? item.price?.currency?.divisibility;
  return {
    price: display.minAmountString,
    priceFrom: display.hasPriceRange,
    ...(resolvedCode ? { currencyCode: resolvedCode } : {}),
    ...(resolvedDivisibility != null ? { divisibility: resolvedDivisibility } : {}),
  };
}

/** Compare minimal-unit amount strings for stable list sorting. */
export function compareMinimalAmountStrings(
  a: string | number | undefined,
  b: string | number | undefined
): number {
  const left = parseMinimalAmountBigInt(a) ?? BigInt(0);
  const right = parseMinimalAmountBigInt(b) ?? BigInt(0);
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

export function listingDisplayPriceFromListItem(item: ProductListItem): ListingDisplayPriceResult {
  const { amountString } = parsePriceFields(item.price);
  const baseParsed = item.basePrice ? parsePriceFields(item.basePrice) : null;
  const maxParsed = item.priceMax ? parsePriceFields(item.priceMax) : null;

  const min = parseMinimalAmountBigInt(amountString) ?? BigInt(0);
  const base = parseMinimalAmountBigInt(baseParsed?.amountString ?? amountString) ?? min;
  const max = parseMinimalAmountBigInt(maxParsed?.amountString ?? amountString) ?? min;
  const hasExplicitSkuPrices = baseParsed != null && base !== min;
  const hasPriceRange = item.priceHasRange ?? max !== min;

  return {
    amount: bigintToSafeNumber(min),
    amountString: min.toString(),
    baseAmount: bigintToSafeNumber(base),
    baseAmountString: base.toString(),
    minAmount: bigintToSafeNumber(min),
    minAmountString: min.toString(),
    maxAmount: bigintToSafeNumber(max),
    maxAmountString: max.toString(),
    hasExplicitSkuPrices: hasExplicitSkuPrices || !!item.basePrice,
    hasPriceRange,
  };
}

export function countExplicitSkuPrices(skus?: Array<Pick<ProductSku, 'price'>>): number {
  return collectExplicitSkuAmountsBigInt(skus).length;
}

export function applyBasePriceToAllSkus<T extends Pick<ProductSku, 'price'>>(
  skus: T[],
  basePriceStandardUnit: string
): T[] {
  return skus.map(sku => ({ ...sku, price: basePriceStandardUnit }));
}

export type FormatListingPriceFn = (
  amount: number | string,
  currencyCode: string,
  options?: { divisibility?: number; isMinimalUnit?: boolean }
) => string;

/** Convert minimal-unit listing price to schema.org / OG standard-unit string. */
export function formatListingPriceForSchema(
  minimalAmount: string | number,
  divisibility = 2
): string {
  const raw = String(minimalAmount).trim();
  return formatMinimalUnitAmountString(raw, divisibility) ?? '0';
}

export function formatListingDisplayPriceLabel(
  result: ListingDisplayPriceResult,
  formatPrice: FormatListingPriceFn,
  currencyCode: string | undefined,
  divisibility: number,
  t: (key: string, params?: Record<string, string | number>) => string
): string {
  if (!currencyCode?.trim()) {
    return '—';
  }
  const formatted = formatPrice(result.minAmountString, currencyCode, {
    divisibility,
    isMinimalUnit: true,
  });
  if (result.hasPriceRange) {
    return t('product.priceFrom', { price: formatted });
  }
  return formatted;
}
