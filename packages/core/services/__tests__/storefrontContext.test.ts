import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  clearStorefrontSlug,
  getStorefrontHeaders,
  getStorefrontSlug,
  isStorefrontActive,
  setStorefrontSlug,
} from '../storefrontContext';
import { setCachedFeatureFlags } from '../../hooks/featureFlagsCache';

describe('storefrontContext', () => {
  beforeEach(() => {
    clearStorefrontSlug();
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
    setCachedFeatureFlags(null);
  });

  afterEach(() => {
    setCachedFeatureFlags(null);
  });

  describe('setStorefrontSlug + getStorefrontSlug', () => {
    it('stores and retrieves a valid slug', () => {
      setStorefrontSlug('summer-sale');
      expect(getStorefrontSlug()).toBe('summer-sale');
    });

    it('rejects empty string', () => {
      setStorefrontSlug('');
      expect(getStorefrontSlug()).toBeNull();
    });

    it('rejects uppercase slug', () => {
      setStorefrontSlug('SummerSale');
      expect(getStorefrontSlug()).toBeNull();
    });

    it('rejects slug with underscore', () => {
      setStorefrontSlug('summer_sale');
      expect(getStorefrontSlug()).toBeNull();
    });

    it('rejects slug exceeding 64 chars', () => {
      setStorefrontSlug('a'.repeat(65));
      expect(getStorefrontSlug()).toBeNull();
    });

    it('persists across in-memory reset via localStorage', () => {
      setStorefrontSlug('black-friday');
      clearStorefrontSlug();
      // Simulate a fresh page load: prime localStorage, then retrieve.
      localStorage.setItem('mbz_storefront_slug', 'black-friday');
      expect(getStorefrontSlug()).toBe('black-friday');
    });

    it('evicts corrupt localStorage values on read', () => {
      localStorage.setItem('mbz_storefront_slug', 'NOT_VALID');
      expect(getStorefrontSlug()).toBeNull();
      expect(localStorage.getItem('mbz_storefront_slug')).toBeNull();
    });
  });

  describe('clearStorefrontSlug', () => {
    it('removes in-memory and persisted slug', () => {
      setStorefrontSlug('deal');
      clearStorefrontSlug();
      expect(getStorefrontSlug()).toBeNull();
      expect(localStorage.getItem('mbz_storefront_slug')).toBeNull();
    });
  });

  describe('isStorefrontActive', () => {
    it('reflects presence of a slug', () => {
      expect(isStorefrontActive()).toBe(false);
      setStorefrontSlug('active-one');
      expect(isStorefrontActive()).toBe(true);
      clearStorefrontSlug();
      expect(isStorefrontActive()).toBe(false);
    });
  });

  describe('getStorefrontHeaders feature-flag gate', () => {
    it('returns empty when no slug is set', () => {
      expect(getStorefrontHeaders()).toEqual({});
    });

    it('returns empty when flags snapshot is null (pre-auth)', () => {
      setStorefrontSlug('deal');
      setCachedFeatureFlags(null);
      expect(getStorefrontHeaders()).toEqual({});
    });

    it('returns empty when tgBridgeBotV2 is off', () => {
      setStorefrontSlug('deal');
      setCachedFeatureFlags({ tgBridgeBotV2: false });
      expect(getStorefrontHeaders()).toEqual({});
    });

    it('returns header when tgBridgeBotV2 is on', () => {
      setStorefrontSlug('deal');
      setCachedFeatureFlags({ tgBridgeBotV2: true });
      expect(getStorefrontHeaders()).toEqual({ 'X-Storefront-Slug': 'deal' });
    });

    it('honours kill switch even when flag is on', () => {
      setStorefrontSlug('deal');
      setCachedFeatureFlags({
        tgBridgeBotV2: true,
        killStorefrontRoutingDisabled: true,
      });
      expect(getStorefrontHeaders()).toEqual({});
    });
  });
});
