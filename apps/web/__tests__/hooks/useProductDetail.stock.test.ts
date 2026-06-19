import { describe, expect, it } from 'vitest';
import { getStockQuantity } from '@/hooks/useProductDetail';
import type { Product } from '@mobazha/core';

function productWithSkus(quantities: Array<string | number>): Product {
  return {
    item: {
      skus: quantities.map((quantity, i) => ({
        productID: `sku-${i}`,
        quantity: String(quantity),
        selections: [],
      })),
    },
  } as Product;
}

describe('getStockQuantity', () => {
  it('returns 999 when listing has no skus', () => {
    expect(getStockQuantity({ item: {} } as Product)).toBe(999);
  });

  it('treats legacy -1 quantity as unlimited stock', () => {
    expect(getStockQuantity(productWithSkus([-1]))).toBe(999);
  });

  it('sums positive sku quantities', () => {
    expect(getStockQuantity(productWithSkus([1, 2]))).toBe(3);
  });
});
