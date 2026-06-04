import { describe, expect, it } from 'vitest';
import { ApiError } from '../../services/api/client';
import type { GuestCartItem } from '../../stores/guestCartStore';
import {
  buildQuoteRequestFromLines,
  buildQuoteRequestFromCartItems,
  canProceedGuestCheckout,
  hasSupplyAvailabilityWarning,
  isSupplyQuoteAdvisoryDisabled,
  isSupplyQuoteAuthoritative,
  resolveGuestOrderCreationError,
} from '../../utils/guestSupplyQuote';

const sampleItem: GuestCartItem = {
  slug: 'digital-course',
  listingHash: 'QmHash',
  quantity: 2,
  options: [{ name: 'Size', value: 'M' }],
  shipping: { name: 'standard', service: 'usps' },
  title: 'Course',
  price: { amount: 1000, currency: 'USD', divisibility: 2 },
  thumbnail: '',
  vendorPeerID: 'QmVendor',
  contractType: 'DIGITAL_GOOD',
};

describe('buildQuoteRequestFromCartItems', () => {
  it('maps cart lines to guest quote request items', () => {
    const req = buildQuoteRequestFromCartItems([sampleItem]);
    expect(req.items).toHaveLength(1);
    expect(req.items[0]).toMatchObject({
      listingSlug: 'digital-course',
      listingHash: 'QmHash',
      quantity: 2,
      shippingOption: 'standard',
      shippingService: 'usps',
    });
    expect(req.items[0].options).toEqual([{ Size: 'M' }]);
  });

  it('keeps seller routing metadata out of the quote request body', () => {
    const req = buildQuoteRequestFromLines([
      {
        vendorPeerID: 'QmVendor',
        listingSlug: 'digital-course',
        listingHash: 'QmHash',
        quantity: 1,
      },
    ]);

    expect(req.items[0]).toEqual({
      listingSlug: 'digital-course',
      listingHash: 'QmHash',
      quantity: 1,
      options: undefined,
      shippingOption: undefined,
      shippingService: undefined,
    });
  });
});

describe('supply quote advisory semantics', () => {
  it('treats feature-off reason as advisory disabled', () => {
    const quote = {
      items: [],
      canSell: false,
      reason: 'supply_availability_disabled',
    };
    expect(isSupplyQuoteAdvisoryDisabled(quote)).toBe(true);
    expect(isSupplyQuoteAuthoritative(quote)).toBe(false);
    expect(canProceedGuestCheckout(quote)).toBe(true);
    expect(hasSupplyAvailabilityWarning(quote)).toBe(false);
  });

  it('blocks checkout when authoritative quote cannot sell', () => {
    const quote = {
      items: [{ listingSlug: 'x', quantity: 1, status: 'out_of_stock' as const, available: false }],
      canSell: false,
    };
    expect(isSupplyQuoteAuthoritative(quote)).toBe(true);
    expect(canProceedGuestCheckout(quote)).toBe(false);
    expect(hasSupplyAvailabilityWarning(quote)).toBe(true);
  });

  it('allows checkout with manual action warning', () => {
    const quote = {
      items: [],
      canSell: true,
      manualActionRequired: true,
    };
    expect(canProceedGuestCheckout(quote)).toBe(true);
    expect(hasSupplyAvailabilityWarning(quote)).toBe(true);
  });
});

describe('resolveGuestOrderCreationError', () => {
  const t = (key: string, opts?: Record<string, unknown>) =>
    (opts?.defaultValue as string | undefined) ?? key;

  it('maps stock conflict to buyer-friendly message', () => {
    const msg = resolveGuestOrderCreationError(
      new ApiError('insufficient stock for sku', 409, 'CONFLICT'),
      t
    );
    expect(msg).toContain('Could not reserve inventory');
  });

  it('maps manual action conflict to seller review message', () => {
    const msg = resolveGuestOrderCreationError(
      new ApiError('supply manual action required: digital asset missing', 409, 'CONFLICT'),
      t
    );
    expect(msg).toContain('seller review');
  });
});
