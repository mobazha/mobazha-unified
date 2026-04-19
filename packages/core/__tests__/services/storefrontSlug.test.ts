import { describe, it, expect } from 'vitest';
import {
  isValidStorefrontSlug,
  isValidStorefrontID,
  STOREFRONT_SLUG_MIN_LEN,
  STOREFRONT_SLUG_MAX_LEN,
  STOREFRONT_ID_MAX_LEN,
} from '../../services/storefrontSlug';

describe('isValidStorefrontSlug (mirrors server ValidateStorefrontSlug)', () => {
  it('accepts canonical kebab-case slugs', () => {
    expect(isValidStorefrontSlug('my-shop')).toBe(true);
    expect(isValidStorefrontSlug('abc')).toBe(true);
    expect(isValidStorefrontSlug('shop-2026')).toBe(true);
    expect(isValidStorefrontSlug('a1b')).toBe(true);
  });

  it('rejects slugs shorter than the server minimum', () => {
    expect(isValidStorefrontSlug('a')).toBe(false);
    expect(isValidStorefrontSlug('ab')).toBe(false);
    expect(STOREFRONT_SLUG_MIN_LEN).toBe(3);
  });

  it('rejects slugs longer than the server maximum', () => {
    const tooLong = 'a'.repeat(STOREFRONT_SLUG_MAX_LEN + 1);
    expect(isValidStorefrontSlug(tooLong)).toBe(false);
    expect(STOREFRONT_SLUG_MAX_LEN).toBe(63);
  });

  it('rejects leading or trailing hyphens', () => {
    expect(isValidStorefrontSlug('-shop')).toBe(false);
    expect(isValidStorefrontSlug('shop-')).toBe(false);
    expect(isValidStorefrontSlug('---')).toBe(false);
  });

  it('rejects consecutive hyphens', () => {
    expect(isValidStorefrontSlug('my--shop')).toBe(false);
    expect(isValidStorefrontSlug('a--b')).toBe(false);
  });

  it('rejects uppercase / underscore / other disallowed chars', () => {
    expect(isValidStorefrontSlug('MyShop')).toBe(false);
    expect(isValidStorefrontSlug('my_shop')).toBe(false);
    expect(isValidStorefrontSlug('my.shop')).toBe(false);
    expect(isValidStorefrontSlug('my shop')).toBe(false);
  });

  it('rejects non-string inputs', () => {
    expect(isValidStorefrontSlug(null)).toBe(false);
    expect(isValidStorefrontSlug(undefined)).toBe(false);
    expect(isValidStorefrontSlug('')).toBe(false);
  });
});

describe('isValidStorefrontID (mirrors server ValidateStorefrontID)', () => {
  it('accepts the server-allowed character set', () => {
    expect(isValidStorefrontID('MyStore')).toBe(true);
    expect(isValidStorefrontID('my_store-2026')).toBe(true);
    expect(isValidStorefrontID('a')).toBe(true); // min 1
    expect(isValidStorefrontID('A-b_C-9')).toBe(true);
  });

  it('accepts IDs at the boundary length', () => {
    const atMax = 'a'.repeat(STOREFRONT_ID_MAX_LEN);
    expect(isValidStorefrontID(atMax)).toBe(true);
    const overMax = 'a'.repeat(STOREFRONT_ID_MAX_LEN + 1);
    expect(isValidStorefrontID(overMax)).toBe(false);
  });

  it('rejects disallowed characters', () => {
    expect(isValidStorefrontID('my.store')).toBe(false);
    expect(isValidStorefrontID('my store')).toBe(false);
    expect(isValidStorefrontID('my/store')).toBe(false);
    expect(isValidStorefrontID('')).toBe(false);
  });

  it('rejects non-string inputs', () => {
    expect(isValidStorefrontID(null)).toBe(false);
    expect(isValidStorefrontID(undefined)).toBe(false);
  });
});
