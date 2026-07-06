import { describe, expect, it } from 'vitest';
import { getCountryContinent, toISOCountryCode } from '../../utils/countryUtils';

describe('countryUtils shipping normalization', () => {
  it('normalizes ISO codes, underscored aliases, and display names', () => {
    expect(toISOCountryCode(' us ')).toBe('US');
    expect(toISOCountryCode('UNITED_STATES')).toBe('US');
    expect(toISOCountryCode('United States')).toBe('US');
  });

  it('resolves the continent used by shipping zones', () => {
    expect(getCountryContinent('US')).toBe('NORTH_AMERICA');
    expect(getCountryContinent('JP')).toBe('ASIA');
  });
});
