import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../../config/env', () => ({
  getEnvConfig: vi.fn(() => ({
    api: { baseUrl: 'https://test-new.mobazha.org' },
    casdoor: {
      serverUrl: 'https://casdoor.test',
      clientId: 'test-client-id',
      appName: 'mobazha',
      redirectPath: '/',
    },
  })),
  getStoreSubdomainBase: vi.fn(() => 'mobazha.org'),
}));

vi.mock('../../../services/api/config', () => ({
  getHostingUrl: vi.fn(() => 'https://hosting.test'),
}));

import { getStoreSubdomainBase } from '../../../config/env';
import {
  SF_RETURN_SEPARATOR,
  appendStorefrontReturnToState,
  buildStorefrontAuthRedirect,
  extractStorefrontReturn,
  getStorefrontReturnUrl,
  isAllowedStorefrontReturn,
} from '../../../services/auth/casdoor';

describe('casdoor storefront return URL', () => {
  beforeEach(() => {
    vi.mocked(getStoreSubdomainBase).mockReturnValue('mobazha.org');
  });

  describe('isAllowedStorefrontReturn', () => {
    it('allows HTTPS storefront subdomain URLs with path and query', () => {
      expect(
        isAllowedStorefrontReturn(
          'https://collectibles.mobazha.org/collectibles/mint-1?tab=details'
        )
      ).toBe(true);
    });

    it('allows legacy origin-only URLs', () => {
      expect(isAllowedStorefrontReturn('https://collectibles.mobazha.org')).toBe(true);
    });

    it('rejects HTTP', () => {
      expect(isAllowedStorefrontReturn('http://collectibles.mobazha.org/path')).toBe(false);
    });

    it('rejects URLs outside configured subdomain base', () => {
      expect(isAllowedStorefrontReturn('https://collectibles.evil.com/path')).toBe(false);
      expect(isAllowedStorefrontReturn('https://collectibles.mymbz.org/path')).toBe(false);
    });

    it('rejects apex domain without subdomain label', () => {
      expect(isAllowedStorefrontReturn('https://mobazha.org/collectibles/mint-1')).toBe(false);
    });

    it('rejects open-redirect style external hosts', () => {
      expect(isAllowedStorefrontReturn('https://evil.com')).toBe(false);
      expect(isAllowedStorefrontReturn('https://evil.com/collectibles.mobazha.org')).toBe(false);
    });

    it('rejects URLs with embedded credentials', () => {
      expect(
        isAllowedStorefrontReturn('https://user:pass@collectibles.mobazha.org/collectibles/mint-1')
      ).toBe(false);
    });

    it('rejects URLs that already contain a hash fragment', () => {
      expect(
        isAllowedStorefrontReturn('https://collectibles.mobazha.org/collectibles/mint-1#token=abc')
      ).toBe(false);
    });
  });

  describe('appendStorefrontReturnToState / extractStorefrontReturn', () => {
    it('round-trips full return URL in ::sf state suffix', () => {
      const baseState = 'mobazha_abc123';
      const returnUrl = 'https://collectibles.mobazha.org/collectibles/mint-1?ref=card';
      const state = appendStorefrontReturnToState(baseState, returnUrl);

      expect(state).toContain(SF_RETURN_SEPARATOR);
      expect(state.startsWith(baseState)).toBe(true);

      const [cleanState, extracted] = extractStorefrontReturn(state);
      expect(cleanState).toBe(baseState);
      expect(extracted).toBe(returnUrl);
    });

    it('supports legacy origin-only ::sf values', () => {
      const legacyState = `mobazha_legacy${SF_RETURN_SEPARATOR}${encodeURIComponent(
        'https://collectibles.mobazha.org'
      )}`;

      const [cleanState, extracted] = extractStorefrontReturn(legacyState);
      expect(cleanState).toBe('mobazha_legacy');
      expect(extracted).toBe('https://collectibles.mobazha.org');
    });

    it('strips invalid ::sf suffix instead of trusting it', () => {
      const state = `mobazha_bad${SF_RETURN_SEPARATOR}${encodeURIComponent(
        'https://evil.com/steal-token'
      )}`;

      const [cleanState, extracted] = extractStorefrontReturn(state);
      expect(cleanState).toBe('mobazha_bad');
      expect(extracted).toBeNull();
    });

    it('does not append invalid return URLs to state', () => {
      const baseState = 'mobazha_safe';
      expect(appendStorefrontReturnToState(baseState, 'http://collectibles.mobazha.org/path')).toBe(
        baseState
      );
    });
  });

  describe('buildStorefrontAuthRedirect', () => {
    it('preserves pathname and search, then appends auth token hash', () => {
      const redirect = buildStorefrontAuthRedirect(
        'https://collectibles.mobazha.org/collectibles/mint-1?tab=details',
        'jwt.token/value'
      );

      expect(redirect).toBe(
        'https://collectibles.mobazha.org/collectibles/mint-1?tab=details#_auth_token=jwt.token%2Fvalue'
      );
    });

    it('works for legacy origin-only return URLs', () => {
      const redirect = buildStorefrontAuthRedirect('https://collectibles.mobazha.org', 'token123');

      expect(redirect).toBe('https://collectibles.mobazha.org/#_auth_token=token123');
    });
  });

  describe('getStorefrontReturnUrl', () => {
    const originalWindow = globalThis.window;

    afterEach(() => {
      if (originalWindow) {
        globalThis.window = originalWindow;
      } else {
        // @ts-expect-error test cleanup
        delete globalThis.window;
      }
    });

    it('captures current pathname and search on allowed storefront hosts', () => {
      Object.defineProperty(globalThis, 'window', {
        configurable: true,
        value: {
          location: {
            hostname: 'collectibles.mobazha.org',
            origin: 'https://collectibles.mobazha.org',
            pathname: '/collectibles/mint-1',
            search: '?tab=details',
          },
        },
      });

      expect(getStorefrontReturnUrl()).toBe(
        'https://collectibles.mobazha.org/collectibles/mint-1?tab=details'
      );
    });

    it('returns null when host is outside configured storefront subdomain base', () => {
      Object.defineProperty(globalThis, 'window', {
        configurable: true,
        value: {
          location: {
            hostname: 'collectibles.mymbz.org',
            origin: 'https://collectibles.mymbz.org',
            pathname: '/collectibles/mint-1',
            search: '',
          },
        },
      });

      expect(getStorefrontReturnUrl()).toBeNull();
    });
  });
});
