import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  applyRestockToSkus,
  bumpSkuQuantityString,
  hasRestockableSku,
  importLicenseKeysForProducts,
  parseLicenseKeyLines,
} from '../../utils/bulkProductSupplyActions';
import { digitalAssetsApi } from '../../services/api';

vi.mock('../../services/api', () => ({
  digitalAssetsApi: {
    importLicenseKeys: vi.fn(async ({ keys }: { keys: string[] }) => ({
      imported: keys.length,
    })),
  },
  productsApi: {},
}));

describe('bulkProductSupplyActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('parseLicenseKeyLines splits newline and comma separated keys', () => {
    expect(parseLicenseKeyLines('A\nB, C\r\nD')).toEqual(['A', 'B', 'C', 'D']);
  });

  it('bumpSkuQuantityString adds to numeric quantity', () => {
    expect(bumpSkuQuantityString('5', 3)).toBe('8');
    expect(bumpSkuQuantityString(undefined, 2)).toBe('2');
  });

  it('bumpSkuQuantityString preserves unlimited', () => {
    expect(bumpSkuQuantityString('-1', 5)).toBe('-1');
  });

  it('applyRestockToSkus bumps all variants', () => {
    expect(
      applyRestockToSkus(
        [
          { productID: 'a', quantity: '2' },
          { productID: 'b', quantity: '0' },
        ],
        4
      )
    ).toEqual([
      { productID: 'a', quantity: '6' },
      { productID: 'b', quantity: '4' },
    ]);
  });

  it('applyRestockToSkus creates default sku when missing', () => {
    expect(applyRestockToSkus(undefined, 10)).toEqual([{ quantity: '10' }]);
  });

  it('treats all unlimited skus as not restockable', () => {
    expect(hasRestockableSku([{ quantity: '-1' }, { quantity: '-1' }])).toBe(false);
    expect(hasRestockableSku([{ quantity: '-1' }, { quantity: '0' }])).toBe(true);
  });

  it('normalizes invalid bulk concurrency', async () => {
    const results = await importLicenseKeysForProducts(
      [
        { slug: 'a', keys: ['A'] },
        { slug: 'b', keys: ['B'] },
      ],
      0
    );

    expect(results).toEqual([
      { slug: 'a', ok: true, imported: 1 },
      { slug: 'b', ok: true, imported: 1 },
    ]);
    expect(digitalAssetsApi.importLicenseKeys).toHaveBeenCalledTimes(2);
  });
});
