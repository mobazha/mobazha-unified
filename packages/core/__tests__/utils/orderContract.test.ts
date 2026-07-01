import { describe, expect, it } from 'vitest';
import { normalizeOrderOpenListings } from '../../utils/orderContract';

const listing = {
  slug: 'collectible-card',
  vendorID: { peerID: 'seller-peer' },
  metadata: {
    contractType: 'RWA_TOKEN',
    format: 'FIXED_PRICE',
    acceptedCurrencies: ['SOL'],
    pricingCurrency: { code: 'USD', divisibility: 2 },
  },
  item: { title: 'Collectible card' },
};

describe('normalizeOrderOpenListings', () => {
  it('accepts canonical signed-listing wrappers and legacy direct listings', () => {
    expect(normalizeOrderOpenListings([{ listing }, listing])).toEqual([listing, listing]);
  });

  it('drops malformed values instead of leaking unknown shapes', () => {
    expect(normalizeOrderOpenListings([null, {}, { listing: null }, 'listing'])).toEqual([]);
  });
});
