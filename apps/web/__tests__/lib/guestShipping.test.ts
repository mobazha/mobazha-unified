import { describe, expect, it } from 'vitest';
import type { GuestCartItem } from '@mobazha/core/stores';
import {
  availableShippingOptions,
  effectiveShippingPrice,
  normalizeShippingCountry,
  physicalShippingIsReady,
} from '@/lib/guestShipping';

function physicalItem(overrides: Partial<GuestCartItem> = {}): GuestCartItem {
  return {
    slug: 'shirt',
    listingHash: 'hash',
    quantity: 2,
    title: 'Shirt',
    thumbnail: '',
    vendorPeerID: 'peer',
    contractType: 'PHYSICAL_GOOD',
    unitWeightGrams: 500,
    price: { amount: 1_000, currency: 'USD', divisibility: 2 },
    shippingOptions: [
      {
        zoneID: 'north-america',
        zoneName: 'North America',
        regions: ['NORTH_AMERICA'],
        rateID: 'standard',
        rateName: 'Standard',
        price: '250',
        currency: 'USD',
        condition: { type: 'weight', minValue: 500, maxValue: 1_000 },
        freeShippingThreshold: { enabled: true, minAmount: '2000' },
      },
    ],
    ...overrides,
  };
}

describe('guest shipping policy preview', () => {
  it('normalizes display names and filters continent/weight rules', () => {
    const item = physicalItem();
    expect(normalizeShippingCountry('United States')).toBe('US');
    expect(availableShippingOptions(item, 'US', 1_000)).toHaveLength(1);
    expect(availableShippingOptions(item, 'FR', 1_000)).toHaveLength(0);
    expect(availableShippingOptions({ ...item, quantity: 3 }, 'US', 1_000)).toHaveLength(0);
  });

  it('applies the free-shipping threshold and requires a currently valid selection', () => {
    const item = physicalItem({
      shipping: { name: 'north-america', service: 'standard', price: '250', currency: 'USD' },
    });
    const option = item.shippingOptions![0];
    expect(effectiveShippingPrice(option, 1_999)).toBe('250');
    expect(effectiveShippingPrice(option, 2_000)).toBe('0');
    expect(physicalShippingIsReady([item], 'US', 2_000)).toBe(true);
    expect(physicalShippingIsReady([item], 'FR', 2_000)).toBe(false);
    expect(physicalShippingIsReady([{ ...item, shipping: undefined }], 'US', 2_000)).toBe(false);
  });
});
