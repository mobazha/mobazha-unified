import { describe, expect, it } from 'vitest';
import {
  formatGuestOrderStateDescription,
  formatGuestOrderStateLabel,
  isGuestOrderPhysical,
} from '@/components/orders/guestOrderDisplay';

describe('guestOrderDisplay', () => {
  it('detects admin physical orders from shipping address', () => {
    expect(
      isGuestOrderPhysical({
        addressEncrypted: false,
        shippingAddress: { line1: '123 Main St' },
      })
    ).toBe(true);
  });

  it('uses delivery language for fulfilled service and digital guest orders', () => {
    const t = (key: string) => key;

    expect(formatGuestOrderStateLabel('SHIPPED', 'service', t)).toBe(
      'order.serviceDelivered'
    );
    expect(formatGuestOrderStateLabel('FULFILLED', 'digital', t)).toBe(
      'order.digitalDelivered'
    );
    expect(formatGuestOrderStateLabel('SHIPPED', 'physical', t)).toBe(
      'guestOrder.stateShipped'
    );
    expect(
      formatGuestOrderStateDescription('SHIPPED', 'service', 'fallback', t)
    ).toBe('guestOrder.stateServiceDeliveredDesc');
    expect(
      formatGuestOrderStateDescription('SHIPPED', 'physical', 'fallback', t)
    ).toBe('fallback');
  });
});
