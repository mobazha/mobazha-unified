import { describe, expect, it } from 'vitest';
import { parsePriceFields } from '../../utils/transforms/priceTransform';
import { listingDisplayPriceFromListItem } from '../../utils/listingDisplayPrice';
import type { ProductListItem } from '../../types';

describe('parsePriceFields', () => {
  it('preserves large minimal-unit string amounts', () => {
    const large = '9007199254740993';
    const parsed = parsePriceFields({
      amount: large,
      currency: { code: 'BTC', divisibility: 8 },
    });
    expect(parsed.amountString).toBe(large);
  });

  it('returns undefined currency without USD fallback', () => {
    const parsed = parsePriceFields({ amount: '1000', currency: { code: '', divisibility: 2 } });
    expect(parsed.currencyCode).toBeUndefined();
    expect(parsed.amountString).toBe('1000');
  });

  it('rejects invalid amount strings', () => {
    const parsed = parsePriceFields({
      amount: 'not-a-number',
      currency: { code: 'USD', divisibility: 2 },
    });
    expect(parsed.amountString).toBe('0');
  });
});

describe('listingDisplayPriceFromListItem with string amounts', () => {
  it('keeps large minimal-unit precision from ProductListItem.price', () => {
    const large = '9007199254740993';
    const item = {
      slug: 'btc-item',
      title: 'BTC Item',
      thumbnail: {},
      price: { amount: large, currency: { code: 'BTC', divisibility: 8 } },
      vendorPeerID: 'QmTest',
    } as ProductListItem;
    expect(listingDisplayPriceFromListItem(item).minAmountString).toBe(large);
  });
});
