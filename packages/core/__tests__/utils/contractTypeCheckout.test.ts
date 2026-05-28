import { describe, expect, it } from 'vitest';
import { analyzeContractTypes } from '../../utils/contractTypeCheckout';

describe('analyzeContractTypes', () => {
  it('allows a single contract type', () => {
    const result = analyzeContractTypes([
      { contractType: 'DIGITAL_GOOD' },
      { contractType: 'DIGITAL_GOOD' },
    ]);
    expect(result.hasMixed).toBe(false);
    expect(result.hasMissing).toBe(false);
    expect(result.canCheckout).toBe(true);
    expect(result.isAllDigital).toBe(true);
    expect(result.needsShippingAddress).toBe(false);
  });

  it('blocks mixed contract types', () => {
    const result = analyzeContractTypes([
      { contractType: 'DIGITAL_GOOD' },
      { contractType: 'PHYSICAL_GOOD' },
    ]);
    expect(result.hasMixed).toBe(true);
    expect(result.canCheckout).toBe(false);
    expect(result.uniqueTypes).toEqual(['DIGITAL_GOOD', 'PHYSICAL_GOOD']);
  });

  it('blocks missing contract types', () => {
    const result = analyzeContractTypes([{ contractType: 'DIGITAL_GOOD' }, {}]);
    expect(result.hasMissing).toBe(true);
    expect(result.canCheckout).toBe(false);
  });

  it('detects physical shipping requirement', () => {
    const result = analyzeContractTypes([{ contractType: 'PHYSICAL_GOOD' }]);
    expect(result.needsShippingAddress).toBe(true);
    expect(result.isAllDigital).toBe(false);
  });
});
