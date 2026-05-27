import { describe, expect, it, vi } from 'vitest';
import {
  isActiveGuestDetailRequest,
  isGuestOrderPhysical,
} from '@/components/orders/guestOrderDisplay';
import { formatGuestStateLabel } from '@/components/Order/orderStatusConfig';

describe('isGuestOrderPhysical', () => {
  it('returns true when encrypted shipping ciphertext is present', () => {
    expect(
      isGuestOrderPhysical({
        addressEncrypted: true,
        shippingAddressCiphertext: '-----BEGIN PGP MESSAGE-----',
        shippingAddress: undefined,
      })
    ).toBe(true);
  });

  it('returns true when parsed shipping address has values', () => {
    expect(
      isGuestOrderPhysical({
        addressEncrypted: false,
        shippingAddressCiphertext: undefined,
        shippingAddress: { city: 'Shanghai', country: 'CN' },
      })
    ).toBe(true);
  });

  it('returns false for digital orders without shipping data', () => {
    expect(
      isGuestOrderPhysical({
        addressEncrypted: false,
        shippingAddressCiphertext: undefined,
        shippingAddress: undefined,
      })
    ).toBe(false);
  });
});

describe('formatGuestStateLabel', () => {
  const t = vi.fn((key: string) => {
    const labels: Record<string, string> = {
      'guestOrder.stateFunded': 'Payment Confirmed',
      'guestOrder.stateShipped': 'Shipped',
    };
    return labels[key] ?? key;
  });

  it('reuses guestOrder i18n keys from orderStatusConfig', () => {
    expect(formatGuestStateLabel('FUNDED', t)).toBe('Payment Confirmed');
    expect(formatGuestStateLabel('SHIPPED', t)).toBe('Shipped');
  });
});

describe('isActiveGuestDetailRequest', () => {
  it('accepts only the currently active request token', () => {
    expect(isActiveGuestDetailRequest('token-b', 'token-b')).toBe(true);
    expect(isActiveGuestDetailRequest('token-a', 'token-b')).toBe(false);
    expect(isActiveGuestDetailRequest('token-a', null)).toBe(false);
  });
});
