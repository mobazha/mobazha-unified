import { describe, expect, it } from 'vitest';
import {
  applyBasePriceToAllSkus,
  compareMinimalAmountStrings,
  countExplicitSkuPrices,
  formatListingDisplayPriceLabel,
  formatListingPriceForSchema,
  listingDisplayPriceFromListItem,
  productCardPriceFieldsFromListItem,
  resolveListingDisplayPrice,
} from '../../utils/listingDisplayPrice';
import type { ProductListItem } from '../../types';

describe('resolveListingDisplayPrice', () => {
  it('uses base price when no explicit sku prices', () => {
    const result = resolveListingDisplayPrice({ basePrice: '5', skus: [{ price: '' }] });
    expect(result).toMatchObject({
      amount: 5,
      minAmountString: '5',
      baseAmount: 5,
      hasExplicitSkuPrices: false,
      hasPriceRange: false,
    });
  });

  it('uses min sku price when explicit sku prices exist', () => {
    const result = resolveListingDisplayPrice({
      basePrice: '5',
      skus: [{ price: '7275' }, { price: '7725' }],
    });
    expect(result).toMatchObject({
      amount: 7275,
      minAmountString: '7275',
      maxAmountString: '7725',
      baseAmount: 5,
      hasExplicitSkuPrices: true,
      hasPriceRange: true,
    });
  });

  it('compares large minimal-unit strings without Number precision loss', () => {
    const large = '9007199254740992'; // MAX_SAFE_INTEGER + 1
    const result = resolveListingDisplayPrice({
      basePrice: '1',
      skus: [{ price: large }, { price: '9007199254740993' }],
    });
    expect(result.minAmountString).toBe(large);
    expect(result.maxAmountString).toBe('9007199254740993');
  });
});

describe('countExplicitSkuPrices', () => {
  it('counts only non-empty sku prices', () => {
    expect(countExplicitSkuPrices([{ price: '10' }, { price: '' }, { price: '20' }])).toBe(2);
  });
});

describe('formatListingPriceForSchema', () => {
  it('converts minimal units to standard units for schema.org', () => {
    expect(formatListingPriceForSchema(7275, 2)).toBe('72.75');
    expect(formatListingPriceForSchema('7275', 2)).toBe('72.75');
  });
});

describe('formatListingDisplayPriceLabel', () => {
  it('returns dash when currency is missing', () => {
    const result = resolveListingDisplayPrice({ basePrice: '1000', skus: [] });
    const label = formatListingDisplayPriceLabel(
      result,
      () => '$10.00',
      undefined,
      2,
      () => 'unused'
    );
    expect(label).toBe('—');
  });
});

describe('resolveListingDisplayPrice embed scenario', () => {
  it('prefers min sku price over low base price (Printful case)', () => {
    const result = resolveListingDisplayPrice({
      basePrice: 5,
      skus: [{ price: '7275' }, { price: '7725' }],
    });
    expect(result.minAmount).toBe(7275);
    expect(result.hasPriceRange).toBe(true);
    expect(formatListingPriceForSchema(result.minAmountString, 2)).toBe('72.75');
  });
});

describe('productCardPriceFieldsFromListItem', () => {
  it('uses list item price as storefront amount', () => {
    const item = {
      slug: 'test',
      title: 'Test',
      thumbnail: {},
      price: { amount: 7275, currency: { code: 'USD', divisibility: 2 } },
      basePrice: { amount: 5, currency: { code: 'USD', divisibility: 2 } },
      priceHasRange: false,
      vendorPeerID: 'QmTest',
    } as ProductListItem;
    expect(productCardPriceFieldsFromListItem(item)).toMatchObject({
      price: '7275',
      priceFrom: false,
      currencyCode: 'USD',
      divisibility: 2,
    });
  });

  it('omits currencyCode when listing currency is missing', () => {
    const item = {
      slug: 'test',
      title: 'Test',
      thumbnail: {},
      price: { amount: 100, currency: { code: '', divisibility: 2 } },
      vendorPeerID: 'QmTest',
    } as ProductListItem;
    expect(productCardPriceFieldsFromListItem(item).currencyCode).toBeUndefined();
  });
});

describe('compareMinimalAmountStrings', () => {
  it('orders large minimal-unit strings correctly', () => {
    const large = '9007199254740993';
    const small = '9007199254740992';
    expect(compareMinimalAmountStrings(small, large)).toBe(-1);
    expect(compareMinimalAmountStrings(large, small)).toBe(1);
    expect(compareMinimalAmountStrings('100', '100')).toBe(0);
  });
});

describe('listingDisplayPriceFromListItem search list path', () => {
  it('preserves string amount from search-mapped ProductListItem', () => {
    const item = {
      slug: 'printful-hoodie',
      title: 'Hoodie',
      thumbnail: {},
      price: { amount: '7275', currency: { code: 'USD', divisibility: 2 } },
      basePrice: { amount: '5', currency: { code: 'USD', divisibility: 2 } },
      priceHasRange: true,
      vendorPeerID: 'QmVendor',
    } as ProductListItem;
    const display = listingDisplayPriceFromListItem(item);
    expect(display.minAmountString).toBe('7275');
    expect(productCardPriceFieldsFromListItem(item)).toMatchObject({
      price: '7275',
      priceFrom: true,
      currencyCode: 'USD',
    });
  });
});

describe('applyBasePriceToAllSkus', () => {
  it('copies base price to every sku', () => {
    const updated = applyBasePriceToAllSkus([{ price: '72.75' }, { price: '77.25' }], '0.05');
    expect(updated).toEqual([{ price: '0.05' }, { price: '0.05' }]);
  });
});
