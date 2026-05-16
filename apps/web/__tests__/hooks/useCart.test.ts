import { describe, expect, it } from 'vitest';
import type { CartItem } from '@mobazha/core';
import { buildCheckoutUrl } from '@/hooks/useCart';

function makeCartItem(slug: string, vendorPeerID: string): CartItem {
  return {
    listing: {
      slug,
      title: slug,
      thumbnail: {
        tiny: '',
        small: '',
        medium: '',
        large: '',
        original: '',
      },
      price: {
        amount: 100,
        currency: {
          code: 'USD',
          divisibility: 2,
        },
      },
      vendorPeerID,
    },
    quantity: 1,
  };
}

describe('buildCheckoutUrl', () => {
  it('keeps selected multi-item subset in slugs query', () => {
    const url = buildCheckoutUrl(
      [makeCartItem('hoodie', 'vendor-1'), makeCartItem('mug', 'vendor-1')],
      'vendor-1'
    );

    const params = new URLSearchParams(url.split('?')[1]);
    expect(params.get('vendorPeerID')).toBe('vendor-1');
    expect(params.get('slugs')).toBe('hoodie,mug');
  });

  it('keeps single-item options in query', () => {
    const item = makeCartItem('hoodie', 'vendor-1');
    item.options = [
      { name: 'Size', value: 'L' },
      { name: 'Color', value: 'Black' },
    ];

    const url = buildCheckoutUrl([item], 'vendor-1');
    const params = new URLSearchParams(url.split('?')[1]);

    expect(params.get('slug')).toBe('hoodie');
    expect(params.get('options')).toBe('Size:L,Color:Black');
  });
});
