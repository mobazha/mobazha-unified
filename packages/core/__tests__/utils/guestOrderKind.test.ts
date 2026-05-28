import { describe, expect, it } from 'vitest';
import { inferGuestOrderKindFromItems, resolveGuestOrderKind } from '../../utils/guestOrderKind';

describe('guestOrderKind', () => {
  it('infers digital orders from item contract types', () => {
    expect(inferGuestOrderKindFromItems([{ contractType: 'DIGITAL_GOOD' }])).toBe('digital');
  });

  it('infers physical orders from item contract types even without shipping signals', () => {
    expect(inferGuestOrderKindFromItems([{ contractType: 'PHYSICAL_GOOD' }])).toBe('physical');
  });

  it('returns null when line items mix contract types (abnormal persisted data)', () => {
    expect(
      inferGuestOrderKindFromItems([
        { contractType: 'DIGITAL_GOOD' },
        { contractType: 'PHYSICAL_GOOD' },
      ])
    ).toBe(null);
  });

  it('returns null when contract types are unavailable', () => {
    expect(inferGuestOrderKindFromItems([{ contractType: undefined }])).toBe(null);
    expect(inferGuestOrderKindFromItems([])).toBe(null);
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
});
