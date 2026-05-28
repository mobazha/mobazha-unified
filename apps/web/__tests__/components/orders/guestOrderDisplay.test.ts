import { describe, expect, it } from 'vitest';
import {
  inferGuestOrderKindFromItems,
  isGuestOrderPhysical,
  resolveGuestOrderKind,
} from '@/components/orders/guestOrderDisplay';

describe('guestOrderDisplay', () => {
  it('infers digital orders from item contract types', () => {
    expect(inferGuestOrderKindFromItems([{ contractType: 'DIGITAL_GOOD' }])).toBe('digital');
  });

  it('infers physical orders from item contract types even without shipping signals', () => {
    expect(inferGuestOrderKindFromItems([{ contractType: 'PHYSICAL_GOOD' }])).toBe('physical');
  });

  it('prefers physical when cart mixes physical and digital items', () => {
    expect(
      inferGuestOrderKindFromItems([
        { contractType: 'DIGITAL_GOOD' },
        { contractType: 'PHYSICAL_GOOD' },
      ])
    ).toBe('physical');
  });

  it('returns null when contract types are unavailable', () => {
    expect(inferGuestOrderKindFromItems([{ contractType: undefined }])).toBe(null);
    expect(inferGuestOrderKindFromItems([])).toBe(null);
    expect(
      inferGuestOrderKindFromItems([{ contractType: 'DIGITAL_GOOD' }, { contractType: undefined }])
    ).toBe(null);
  });

  it('does not infer physical when delivery API reports missing contract type', () => {
    expect(
      resolveGuestOrderKind({
        deliveryKnown: true,
        isDigitalFromApi: false,
        deliveryReason: 'missing_contract_type',
        kindFromItems: null,
      })
    ).toBe('unknown');
  });

  it('prefers API digital signal over missing line-item metadata', () => {
    expect(
      resolveGuestOrderKind({
        deliveryKnown: true,
        isDigitalFromApi: true,
        deliveryReason: null,
        kindFromItems: null,
      })
    ).toBe('digital');
  });

  it('falls back to unknown instead of physical when metadata is missing', () => {
    expect(
      resolveGuestOrderKind({
        deliveryKnown: false,
        isDigitalFromApi: null,
        deliveryReason: null,
        kindFromItems: null,
      })
    ).toBe('unknown');
  });

  it('maps physical only when line items explicitly say PHYSICAL_GOOD', () => {
    expect(
      resolveGuestOrderKind({
        deliveryKnown: true,
        isDigitalFromApi: false,
        deliveryReason: null,
        kindFromItems: 'physical',
      })
    ).toBe('physical');
  });

  it('does not map delivery API not-digital to physical for other contract types', () => {
    expect(inferGuestOrderKindFromItems([{ contractType: 'SERVICE' }])).toBe(null);
    expect(
      resolveGuestOrderKind({
        deliveryKnown: true,
        isDigitalFromApi: false,
        deliveryReason: null,
        kindFromItems: null,
      })
    ).toBe('unknown');
  });

  it('detects admin physical orders from shipping address', () => {
    expect(
      isGuestOrderPhysical({
        addressEncrypted: false,
        shippingAddress: { line1: '123 Main St' },
      })
    ).toBe(true);
  });
});
