import { describe, expect, it } from 'vitest';
import { getStatusLabel } from '../../../src/components/Order/cards/orderProgressUtils';

describe('getStatusLabel', () => {
  const t = (key: string) => key;

  it('uses service-specific shipped label for service orders', () => {
    expect(getStatusLabel('SHIPPED', t, 'SERVICE')).toBe('order.serviceDelivered');
    expect(getStatusLabel('shipped', t, 'SERVICE')).toBe('order.serviceDelivered');
  });

  it('uses physical shipped label by default', () => {
    expect(getStatusLabel('SHIPPED', t)).toBe('order.shipped');
    expect(getStatusLabel('SHIPPED', t, 'PHYSICAL_GOOD')).toBe('order.shipped');
  });

  it('uses digital shipped label for digital goods', () => {
    expect(getStatusLabel('SHIPPED', t, 'DIGITAL_GOOD')).toBe('order.digitalDelivered');
  });
});
