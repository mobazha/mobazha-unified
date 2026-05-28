import { describe, expect, it } from 'vitest';
import { isGuestOrderPhysical } from '@/components/orders/guestOrderDisplay';

describe('guestOrderDisplay', () => {
  it('detects admin physical orders from shipping address', () => {
    expect(
      isGuestOrderPhysical({
        addressEncrypted: false,
        shippingAddress: { line1: '123 Main St' },
      })
    ).toBe(true);
  });
});
