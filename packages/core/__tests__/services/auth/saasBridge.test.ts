import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// --- Module mocks ---

vi.mock('../../../config/env', () => ({
  getEnvConfig: vi.fn(() => ({
    auth: {
      standalone: {
        saasUrl: 'https://app.mobazha.org',
      },
    },
  })),
}));

import {
  getSaaSBaseUrl,
  getCachedSaaSToken,
  clearSaaSToken,
  hasSaaSToken,
  acquireSaaSToken,
} from '../../../services/auth/saasBridge';
import { getEnvConfig } from '../../../config/env';

const SAAS_JWT_KEY = 'mbz_saas_bridge_jwt';

describe('saasBridge', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.mocked(getEnvConfig).mockReturnValue({
      auth: {
        mode: 'standalone',
        standalone: { saasUrl: 'https://app.mobazha.org' },
      },
      casdoor: { serverUrl: '', clientId: '' },
    } as ReturnType<typeof getEnvConfig>);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // getSaaSBaseUrl
  // =========================================================================
  describe('getSaaSBaseUrl', () => {
    it('returns configured SaaS URL', () => {
      expect(getSaaSBaseUrl()).toBe('https://app.mobazha.org');
    });

    it('throws when saasUrl is not configured', () => {
      vi.mocked(getEnvConfig).mockReturnValue({
        auth: { mode: 'standalone', standalone: undefined },
        casdoor: { serverUrl: '', clientId: '' },
      } as unknown as ReturnType<typeof getEnvConfig>);

      expect(() => getSaaSBaseUrl()).toThrow('NEXT_PUBLIC_SAAS_URL is required');
    });
  });

  // =========================================================================
  // Token caching (sessionStorage)
  // =========================================================================
  describe('getCachedSaaSToken', () => {
    it('returns null when no token cached', () => {
      expect(getCachedSaaSToken()).toBeNull();
    });

    it('returns cached token from sessionStorage', () => {
      sessionStorage.setItem(SAAS_JWT_KEY, 'test-jwt-token');
      expect(getCachedSaaSToken()).toBe('test-jwt-token');
    });
  });

  describe('clearSaaSToken', () => {
    it('removes token from sessionStorage', () => {
      sessionStorage.setItem(SAAS_JWT_KEY, 'test-jwt-token');
      clearSaaSToken();
      expect(sessionStorage.getItem(SAAS_JWT_KEY)).toBeNull();
    });

    it('does not throw when no token exists', () => {
      expect(() => clearSaaSToken()).not.toThrow();
    });
  });

  describe('hasSaaSToken', () => {
    it('returns false when no token cached', () => {
      expect(hasSaaSToken()).toBe(false);
    });

    it('returns true when token is cached', () => {
      sessionStorage.setItem(SAAS_JWT_KEY, 'some-token');
      expect(hasSaaSToken()).toBe(true);
    });
  });

  // =========================================================================
  // acquireSaaSToken
  // =========================================================================
  describe('acquireSaaSToken', () => {
    it('returns cached token without opening popup when available', async () => {
      sessionStorage.setItem(SAAS_JWT_KEY, 'cached-jwt');
      const openSpy = vi.spyOn(window, 'open');

      const result = await acquireSaaSToken();

      expect(result).toEqual({ success: true, token: 'cached-jwt' });
      expect(openSpy).not.toHaveBeenCalled();
    });

    it('ignores cached token and opens popup when forceRefresh=true', async () => {
      sessionStorage.setItem(SAAS_JWT_KEY, 'cached-jwt');
      const mockPopup = { closed: false, close: vi.fn() };
      vi.spyOn(window, 'open').mockReturnValue(mockPopup as unknown as Window);

      const resultPromise = acquireSaaSToken(true);

      // Simulate auth message from popup
      const event = new globalThis.MessageEvent('message', {
        origin: 'https://app.mobazha.org',
        data: { type: 'mobazha-auth', token: 'new-jwt' },
      });
      window.dispatchEvent(event);

      const result = await resultPromise;
      expect(result).toEqual({ success: true, token: 'new-jwt' });
      expect(sessionStorage.getItem(SAAS_JWT_KEY)).toBe('new-jwt');
    });

    it('returns error when popup is blocked', async () => {
      vi.spyOn(window, 'open').mockReturnValue(null);

      const result = await acquireSaaSToken(true);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Popup was blocked');
    });

    it('opens popup with correct URL', async () => {
      const openSpy = vi.spyOn(window, 'open').mockReturnValue(null);

      await acquireSaaSToken(true);

      expect(openSpy).toHaveBeenCalledWith(
        expect.stringContaining('https://app.mobazha.org/auth/standalone-login?store_origin='),
        'mobazha-saas-bridge',
        expect.any(String)
      );
    });

    it('resolves with error on auth-error message', async () => {
      const mockPopup = { closed: false, close: vi.fn() };
      vi.spyOn(window, 'open').mockReturnValue(mockPopup as unknown as Window);

      const resultPromise = acquireSaaSToken(true);

      const event = new globalThis.MessageEvent('message', {
        origin: 'https://app.mobazha.org',
        data: { type: 'mobazha-auth-error', error: 'User cancelled' },
      });
      window.dispatchEvent(event);

      const result = await resultPromise;
      expect(result).toEqual({ success: false, error: 'User cancelled' });
    });

    it('ignores messages from wrong origin', async () => {
      const mockPopup = { closed: false, close: vi.fn() };
      vi.spyOn(window, 'open').mockReturnValue(mockPopup as unknown as Window);

      const resultPromise = acquireSaaSToken(true);

      // Wrong origin — should be ignored
      const wrongEvent = new globalThis.MessageEvent('message', {
        origin: 'https://evil.com',
        data: { type: 'mobazha-auth', token: 'stolen-token' },
      });
      window.dispatchEvent(wrongEvent);

      // Correct origin — should resolve
      const correctEvent = new globalThis.MessageEvent('message', {
        origin: 'https://app.mobazha.org',
        data: { type: 'mobazha-auth', token: 'legit-token' },
      });
      window.dispatchEvent(correctEvent);

      const result = await resultPromise;
      expect(result.token).toBe('legit-token');
      expect(sessionStorage.getItem(SAAS_JWT_KEY)).toBe('legit-token');
    });

    it('resolves with error when popup is closed by user', async () => {
      const mockPopup = { closed: false, close: vi.fn() };
      vi.spyOn(window, 'open').mockReturnValue(mockPopup as unknown as Window);

      const resultPromise = acquireSaaSToken(true);

      // Simulate popup being closed
      await new Promise(r => setTimeout(r, 100));
      Object.defineProperty(mockPopup, 'closed', { value: true });

      const result = await resultPromise;
      expect(result.success).toBe(false);
      expect(result.error).toContain('Login window was closed');
    });
  });
});
