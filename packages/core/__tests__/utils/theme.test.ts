import { describe, it, expect } from 'vitest';
import {
  getContrastText,
  isValidHexColor,
  normalizeHex,
  getFallbackPalette,
  getPaletteColors,
  ALL_PALETTES,
  PALETTE_MAP,
  FONT_FAMILY_MAP,
  RADIUS_MAP,
  SPACING_MAP,
} from '../../utils/theme';

// ---------------------------------------------------------------------------
// getContrastText
// ---------------------------------------------------------------------------
describe('getContrastText', () => {
  it('returns white for dark backgrounds', () => {
    expect(getContrastText('#000000')).toBe('#ffffff');
    expect(getContrastText('#1a3a5c')).toBe('#ffffff');
    expect(getContrastText('#2b1e5e')).toBe('#ffffff');
    expect(getContrastText('#2d4a22')).toBe('#ffffff');
  });

  it('returns black for light backgrounds', () => {
    expect(getContrastText('#ffffff')).toBe('#000000');
    expect(getContrastText('#f5b07c')).toBe('#000000');
    expect(getContrastText('#c3b7e0')).toBe('#000000');
    expect(getContrastText('#deb887')).toBe('#000000');
  });

  it('handles colors near the threshold', () => {
    const result = getContrastText('#808080');
    expect(['#000000', '#ffffff']).toContain(result);
  });

  it('handles hex without hash prefix', () => {
    expect(getContrastText('000000')).toBe('#ffffff');
    expect(getContrastText('ffffff')).toBe('#000000');
  });
});

// ---------------------------------------------------------------------------
// isValidHexColor
// ---------------------------------------------------------------------------
describe('isValidHexColor', () => {
  it('accepts valid 6-digit hex', () => {
    expect(isValidHexColor('#000000')).toBe(true);
    expect(isValidHexColor('#ffffff')).toBe(true);
    expect(isValidHexColor('#1a3B5c')).toBe(true);
  });

  it('accepts valid 3-digit hex', () => {
    expect(isValidHexColor('#fff')).toBe(true);
    expect(isValidHexColor('#000')).toBe(true);
    expect(isValidHexColor('#abc')).toBe(true);
  });

  it('rejects invalid formats', () => {
    expect(isValidHexColor('')).toBe(false);
    expect(isValidHexColor('000000')).toBe(false);
    expect(isValidHexColor('#gggggg')).toBe(false);
    expect(isValidHexColor('#12345')).toBe(false);
    expect(isValidHexColor('#1234567')).toBe(false);
    expect(isValidHexColor('rgb(0,0,0)')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// normalizeHex
// ---------------------------------------------------------------------------
describe('normalizeHex', () => {
  it('expands 3-digit hex to 6-digit', () => {
    expect(normalizeHex('#fff')).toBe('#ffffff');
    expect(normalizeHex('#abc')).toBe('#aabbcc');
    expect(normalizeHex('#000')).toBe('#000000');
  });

  it('passes through 6-digit hex unchanged', () => {
    expect(normalizeHex('#1a3a5c')).toBe('#1a3a5c');
    expect(normalizeHex('#000000')).toBe('#000000');
  });

  it('handles input without hash', () => {
    expect(normalizeHex('fff')).toBe('#ffffff');
    expect(normalizeHex('1a3a5c')).toBe('#1a3a5c');
  });
});

// ---------------------------------------------------------------------------
// getPaletteColors
// ---------------------------------------------------------------------------
describe('getPaletteColors', () => {
  it('returns colors for known palettes', () => {
    const ocean = getPaletteColors('ocean');
    expect(ocean).not.toBeNull();
    expect(ocean!.primary).toBe('#1a3a5c');
    expect(ocean!.secondary).toBe('#4a9eda');
    expect(ocean!.accent).toBe('#72c4ff');
  });

  it('returns null for custom palette', () => {
    expect(getPaletteColors('custom')).toBeNull();
  });

  it('returns null for unknown palette', () => {
    expect(getPaletteColors('nonexistent')).toBeNull();
  });

  it('covers all palettes in PALETTE_MAP', () => {
    for (const key of ALL_PALETTES) {
      const colors = getPaletteColors(key);
      expect(colors).not.toBeNull();
      expect(colors!.primary).toMatch(/^#[0-9a-f]{6}$/);
      expect(colors!.secondary).toMatch(/^#[0-9a-f]{6}$/);
      expect(colors!.accent).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});

// ---------------------------------------------------------------------------
// ALL_PALETTES
// ---------------------------------------------------------------------------
describe('ALL_PALETTES', () => {
  it('matches PALETTE_MAP keys', () => {
    expect(ALL_PALETTES.sort()).toEqual(Object.keys(PALETTE_MAP).sort());
  });

  it('does not include custom', () => {
    expect(ALL_PALETTES).not.toContain('custom');
  });
});

// ---------------------------------------------------------------------------
// FONT_FAMILY_MAP
// ---------------------------------------------------------------------------
describe('FONT_FAMILY_MAP', () => {
  it('has all expected font families', () => {
    const expected = [
      'inter',
      'dm-sans',
      'space-grotesk',
      'playfair',
      'lora',
      'merriweather',
      'josefin-sans',
      'poppins',
    ];
    for (const key of expected) {
      expect(FONT_FAMILY_MAP).toHaveProperty(key);
      expect(typeof FONT_FAMILY_MAP[key as keyof typeof FONT_FAMILY_MAP]).toBe('string');
    }
  });

  it('each value contains a quoted font name', () => {
    for (const value of Object.values(FONT_FAMILY_MAP)) {
      expect(value).toMatch(/'[^']+'/);
    }
  });

  it('each value ends with serif or sans-serif fallback', () => {
    for (const value of Object.values(FONT_FAMILY_MAP)) {
      expect(value).toMatch(/(sans-)?serif$/);
    }
  });
});

// ---------------------------------------------------------------------------
// RADIUS_MAP
// ---------------------------------------------------------------------------
describe('RADIUS_MAP', () => {
  it('has all expected radius keys', () => {
    const expected = ['none', 'sm', 'md', 'lg', 'full'];
    for (const key of expected) {
      expect(RADIUS_MAP).toHaveProperty(key);
    }
  });

  it('none maps to 0px', () => {
    expect(RADIUS_MAP.none).toBe('0px');
  });

  it('full maps to 9999px', () => {
    expect(RADIUS_MAP.full).toBe('9999px');
  });

  it('values increase from sm to lg', () => {
    const sm = parseInt(RADIUS_MAP.sm);
    const md = parseInt(RADIUS_MAP.md);
    const lg = parseInt(RADIUS_MAP.lg);
    expect(sm).toBeLessThan(md);
    expect(md).toBeLessThan(lg);
  });
});

// ---------------------------------------------------------------------------
// SPACING_MAP
// ---------------------------------------------------------------------------
describe('SPACING_MAP', () => {
  it('has all expected spacing keys', () => {
    const expected = ['none', 'sm', 'md', 'lg', 'xl'];
    for (const key of expected) {
      expect(SPACING_MAP).toHaveProperty(key);
    }
  });

  it('none maps to 0', () => {
    expect(SPACING_MAP.none).toBe('0');
  });

  it('values increase from sm to xl', () => {
    const sm = parseFloat(SPACING_MAP.sm);
    const md = parseFloat(SPACING_MAP.md);
    const lg = parseFloat(SPACING_MAP.lg);
    const xl = parseFloat(SPACING_MAP.xl);
    expect(sm).toBeLessThan(md);
    expect(md).toBeLessThan(lg);
    expect(lg).toBeLessThan(xl);
  });
});

// ---------------------------------------------------------------------------
// getFallbackPalette
// ---------------------------------------------------------------------------
describe('getFallbackPalette', () => {
  it('returns a valid palette key', () => {
    const result = getFallbackPalette('some-store-name');
    expect(ALL_PALETTES).toContain(result);
  });

  it('is deterministic for the same seed', () => {
    const a = getFallbackPalette('QmAbCdEfGhIjKlMn');
    const b = getFallbackPalette('QmAbCdEfGhIjKlMn');
    expect(a).toBe(b);
  });

  it('produces different palettes for different seeds', () => {
    const results = new Set<string>();
    const seeds = [
      'store-alpha',
      'store-beta',
      'store-gamma',
      'store-delta',
      'store-epsilon',
      'store-zeta',
      'store-eta',
      'store-theta',
    ];
    for (const seed of seeds) {
      results.add(getFallbackPalette(seed));
    }
    expect(results.size).toBeGreaterThan(1);
  });

  it('works with empty string', () => {
    const result = getFallbackPalette('');
    expect(ALL_PALETTES).toContain(result);
  });

  it('never returns custom', () => {
    const seeds = Array.from({ length: 100 }, (_, i) => `seed-${i}`);
    for (const seed of seeds) {
      expect(getFallbackPalette(seed)).not.toBe('custom');
    }
  });
});
