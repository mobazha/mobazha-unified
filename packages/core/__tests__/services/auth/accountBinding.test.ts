import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// --- Module mocks ---

vi.mock('../../../services/api/config', () => ({
  getHostingUrl: vi.fn(() => 'https://hosting.test'),
}));

vi.mock('../../../services/auth/token', () => ({
  getStoredToken: vi.fn(() => 'mock-jwt-token'),
}));

vi.mock('../../../config/env', () => ({
  getEnvConfig: vi.fn(() => ({
    casdoor: {
      serverUrl: 'https://casdoor.test',
      clientId: 'test-client-id',
    },
  })),
}));

vi.mock('../../../services/auth/casdoor', () => ({
  parseJwtToken: vi.fn(() => ({ sub: 'user-uuid-123' })),
  SF_RETURN_SEPARATOR: '::sf=',
  getStorefrontReturnOrigin: vi.fn(() => null),
  getSaaSMainOrigin: vi.fn(() => null),
  isAllowedStorefrontReturn: vi.fn(() => false),
}));

import { getStoredToken } from '../../../services/auth/token';
import {
  getLinkedAccounts,
  getLinkUrl,
  handleLinkCallback,
  getLinkConfig,
  directLinkTelegram,
  unlinkAccount,
  hasLinkCallback,
  getLinkCallbackParams,
  clearLinkCallbackParams,
  getLinkRedirectPath,
  getLinkCallbackStorefrontReturn,
} from '../../../services/auth/accountBinding';

function jsonResponse(data: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
    headers: new Headers(),
  } as unknown as Response;
}

describe('accountBinding', () => {
  beforeEach(() => {
    vi.mocked(getStoredToken).mockReturnValue('mock-jwt-token');
    vi.mocked(window.fetch).mockReset();
  });

  // =========================================================================
  // US-3: getLinkedAccounts
  // =========================================================================
  describe('getLinkedAccounts', () => {
    it('fetches linked accounts with auth header', async () => {
      const mockData = {
        data: {
          accounts: [{ provider: 'telegram', providerId: '12345', canUnlink: true }],
          totalCount: 1,
          minRequired: 1,
        },
      };
      vi.mocked(window.fetch).mockResolvedValue(jsonResponse(mockData));

      const result = await getLinkedAccounts();

      expect(window.fetch).toHaveBeenCalledWith(
        'https://hosting.test/platform/v1/accounts/linked',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: 'Bearer mock-jwt-token',
          }),
        })
      );
      expect(result.accounts).toHaveLength(1);
      expect(result.accounts[0].provider).toBe('telegram');
    });

    it('throws when not authenticated', async () => {
      vi.mocked(getStoredToken).mockReturnValue(null as unknown as string);

      await expect(getLinkedAccounts()).rejects.toThrow('Not authenticated');
    });

    it('throws on server error', async () => {
      vi.mocked(window.fetch).mockResolvedValue(
        jsonResponse({ error: { message: 'Server error' } }, 500)
      );

      await expect(getLinkedAccounts()).rejects.toThrow('Server error');
    });
  });

  // =========================================================================
  // US-3: getLinkUrl (pure function, no fetch)
  // =========================================================================
  describe('getLinkUrl', () => {
    it('generates Casdoor OAuth URL with correct params', () => {
      const result = getLinkUrl('discord', 'https://example.com/callback');

      expect(result.url).toContain('https://casdoor.test/login/oauth/authorize');
      expect(result.url).toContain('client_id=test-client-id');
      expect(result.url).toContain('redirect_uri=');
      expect(result.url).toContain('state=link%3Auser-uuid-123%3Adiscord');
      expect(result.url).toContain('provider_hint=provider_discord');
    });

    it('does not add provider_hint for telegram (widget-based)', () => {
      const result = getLinkUrl('telegram', 'https://example.com/callback');

      expect(result.url).not.toContain('provider_hint');
      expect(result.url).toContain('state=link%3Auser-uuid-123%3Atelegram');
    });

    it('appends state suffix when provided', () => {
      const result = getLinkUrl(
        'google',
        'https://example.com/callback',
        '::sf=https://shop.example.com'
      );

      expect(result.url).toContain(encodeURIComponent('::sf=https://shop.example.com'));
    });

    it('throws when not authenticated', () => {
      vi.mocked(getStoredToken).mockReturnValue(null as unknown as string);

      expect(() => getLinkUrl('discord', 'https://example.com/callback')).toThrow(
        'Not authenticated'
      );
    });
  });

  // =========================================================================
  // US-3: handleLinkCallback (code mode + provider_id mode)
  // =========================================================================
  describe('handleLinkCallback', () => {
    it('sends code to backend link-callback endpoint', async () => {
      vi.mocked(window.fetch).mockResolvedValue(jsonResponse({ data: { success: true } }));

      const result = await handleLinkCallback('auth-code-123', 'link:user1:discord');

      expect(window.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/platform/v1/accounts/link-callback?'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer mock-jwt-token',
          }),
        })
      );
      const calledUrl = vi.mocked(window.fetch).mock.calls[0][0] as string;
      expect(calledUrl).toContain('state=link%3Auser1%3Adiscord');
      expect(calledUrl).toContain('code=auth-code-123');
      expect(calledUrl).not.toContain('provider_id');
      expect(result.success).toBe(true);
    });

    it('sends provider_id when code is null (link_only mode)', async () => {
      vi.mocked(window.fetch).mockResolvedValue(jsonResponse({ data: { success: true } }));

      const result = await handleLinkCallback(null, 'link:user1:telegram', 'tg-12345');

      const calledUrl = vi.mocked(window.fetch).mock.calls[0][0] as string;
      expect(calledUrl).toContain('provider_id=tg-12345');
      expect(calledUrl).not.toContain('code=');
      expect(result.success).toBe(true);
    });

    it('strips storefront suffix from state', async () => {
      vi.mocked(window.fetch).mockResolvedValue(jsonResponse({ data: { success: true } }));

      await handleLinkCallback('code', 'link:user1:discord::sf=https://shop.example.com');

      const calledUrl = vi.mocked(window.fetch).mock.calls[0][0] as string;
      expect(calledUrl).toContain('state=link%3Auser1%3Adiscord');
      expect(calledUrl).not.toContain('sf=');
    });

    it('returns error on server failure', async () => {
      vi.mocked(window.fetch).mockResolvedValue(
        jsonResponse({ error: { message: 'Link failed' } }, 400)
      );

      const result = await handleLinkCallback('bad-code', 'link:user1:discord');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Link failed');
    });

    it('returns error when not authenticated', async () => {
      vi.mocked(getStoredToken).mockReturnValue(null as unknown as string);

      const result = await handleLinkCallback('code', 'link:user1:discord');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Not authenticated');
    });
  });

  // =========================================================================
  // US-4: Conflict detection via handleLinkCallback (409 PROVIDER_ALREADY_LINKED)
  // =========================================================================
  describe('handleLinkCallback - conflict detection', () => {
    it('returns error on 409 conflict (provider already linked to another user)', async () => {
      vi.mocked(window.fetch).mockResolvedValue(
        jsonResponse(
          {
            error: {
              code: 'PROVIDER_ALREADY_LINKED',
              message: 'This account is already linked to another user',
            },
          },
          409
        )
      );

      const result = await handleLinkCallback(null, 'link:user1:telegram', 'claimed-id');
      expect(result.success).toBe(false);
      expect(result.error).toBe('This account is already linked to another user');
    });
  });

  // =========================================================================
  // US-3: getLinkConfig
  // =========================================================================
  describe('getLinkConfig', () => {
    it('fetches provider config without auth', async () => {
      const mockData = {
        data: {
          providers: {
            telegram: { botUsername: 'mybot' },
            discord: { clientId: 'dc-id' },
          },
        },
      };
      vi.mocked(window.fetch).mockResolvedValue(jsonResponse(mockData));

      const result = await getLinkConfig();

      expect(window.fetch).toHaveBeenCalledWith(
        'https://hosting.test/platform/v1/accounts/link/config',
        expect.objectContaining({
          method: 'GET',
          headers: expect.not.objectContaining({
            Authorization: expect.anything(),
          }),
        })
      );
      expect(result.providers.telegram?.botUsername).toBe('mybot');
      expect(result.providers.discord?.clientId).toBe('dc-id');
    });

    it('throws on server error', async () => {
      vi.mocked(window.fetch).mockResolvedValue(jsonResponse({}, 500));

      await expect(getLinkConfig()).rejects.toThrow('Failed to get link config');
    });
  });

  // =========================================================================
  // US-3: directLinkTelegram (via Login Widget)
  // =========================================================================
  describe('directLinkTelegram', () => {
    it('sends Telegram auth data as query params', async () => {
      vi.mocked(window.fetch).mockResolvedValue(jsonResponse({ data: { success: true } }));

      const authData = {
        id: 1557260725,
        first_name: 'Test',
        username: 'testuser',
        auth_date: 1700000000,
        hash: 'abcdef123456',
      };

      const result = await directLinkTelegram(authData);

      const calledUrl = vi.mocked(window.fetch).mock.calls[0][0] as string;
      expect(calledUrl).toContain('/platform/v1/accounts/link/telegram?');
      expect(calledUrl).toContain('id=1557260725');
      expect(calledUrl).toContain('first_name=Test');
      expect(calledUrl).toContain('hash=abcdef123456');
      expect(result.success).toBe(true);
    });

    it('throws when not authenticated', async () => {
      vi.mocked(getStoredToken).mockReturnValue(null as unknown as string);

      const authData = { id: 123, first_name: 'Test', auth_date: 1700000000, hash: 'abc' };
      await expect(directLinkTelegram(authData)).rejects.toThrow('Not authenticated');
    });

    it('throws on server error (e.g. conflict)', async () => {
      vi.mocked(window.fetch).mockResolvedValue(
        jsonResponse(
          { error: { message: 'This Telegram account is already linked to another user' } },
          409
        )
      );

      const authData = { id: 123, first_name: 'Test', auth_date: 1700000000, hash: 'abc' };
      await expect(directLinkTelegram(authData)).rejects.toThrow(
        'This Telegram account is already linked to another user'
      );
    });
  });

  // =========================================================================
  // US-5: unlinkAccount
  // =========================================================================
  describe('unlinkAccount', () => {
    it('posts unlink request with provider', async () => {
      vi.mocked(window.fetch).mockResolvedValue(
        jsonResponse({ data: { success: true, message: 'Successfully unlinked telegram' } })
      );

      const result = await unlinkAccount('telegram');

      expect(window.fetch).toHaveBeenCalledWith(
        'https://hosting.test/platform/v1/accounts/unlink',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ provider: 'telegram' }),
        })
      );
      expect(result.success).toBe(true);
    });

    it('throws when not authenticated', async () => {
      vi.mocked(getStoredToken).mockReturnValue(null as unknown as string);

      await expect(unlinkAccount('discord')).rejects.toThrow('Not authenticated');
    });

    it('throws on server error (last login method)', async () => {
      vi.mocked(window.fetch).mockResolvedValue(
        jsonResponse({ error: { message: 'Must keep at least one login method' } }, 400)
      );

      await expect(unlinkAccount('telegram')).rejects.toThrow(
        'Must keep at least one login method'
      );
    });
  });

  // =========================================================================
  // URL param helpers
  // =========================================================================
  describe('hasLinkCallback', () => {
    let originalLocation: typeof window.location;

    beforeEach(() => {
      originalLocation = window.location;
    });

    afterEach(() => {
      Object.defineProperty(window, 'location', {
        value: originalLocation,
        writable: true,
      });
    });

    function setSearch(search: string) {
      Object.defineProperty(window, 'location', {
        value: { ...originalLocation, search, href: `https://test.com${search}` },
        writable: true,
      });
    }

    it('returns true when state+code present', () => {
      setSearch('?state=link:u1:discord&code=abc');
      expect(hasLinkCallback()).toBe(true);
    });

    it('returns true when state+provider_id present', () => {
      setSearch('?state=link:u1:telegram&provider_id=12345');
      expect(hasLinkCallback()).toBe(true);
    });

    it('returns false when state missing link: prefix', () => {
      setSearch('?state=random&code=abc');
      expect(hasLinkCallback()).toBe(false);
    });

    it('returns false when no code or provider_id', () => {
      setSearch('?state=link:u1:discord');
      expect(hasLinkCallback()).toBe(false);
    });

    it('returns false when no params', () => {
      setSearch('');
      expect(hasLinkCallback()).toBe(false);
    });
  });

  describe('getLinkCallbackParams', () => {
    let originalLocation: typeof window.location;

    beforeEach(() => {
      originalLocation = window.location;
    });

    afterEach(() => {
      Object.defineProperty(window, 'location', {
        value: originalLocation,
        writable: true,
      });
    });

    function setSearch(search: string) {
      Object.defineProperty(window, 'location', {
        value: { ...originalLocation, search, href: `https://test.com${search}` },
        writable: true,
      });
    }

    it('extracts code and state', () => {
      setSearch('?state=link:u1:discord&code=auth-code');
      const params = getLinkCallbackParams();
      expect(params.code).toBe('auth-code');
      expect(params.state).toBe('link:u1:discord');
      expect(params.providerId).toBeNull();
    });

    it('extracts provider_id', () => {
      setSearch('?state=link:u1:telegram&provider_id=tg-123');
      const params = getLinkCallbackParams();
      expect(params.code).toBeNull();
      expect(params.state).toBe('link:u1:telegram');
      expect(params.providerId).toBe('tg-123');
    });

    it('returns nulls when no params', () => {
      setSearch('');
      const params = getLinkCallbackParams();
      expect(params.code).toBeNull();
      expect(params.state).toBeNull();
      expect(params.providerId).toBeNull();
    });
  });

  describe('clearLinkCallbackParams', () => {
    it('removes link callback params from URL', () => {
      const replaceStateSpy = vi.fn();
      Object.defineProperty(window, 'location', {
        value: {
          href: 'https://test.com/settings/account?state=link:u1:discord&code=abc&link_callback=1&provider_id=x&provider_type=y&other=keep',
          search:
            '?state=link:u1:discord&code=abc&link_callback=1&provider_id=x&provider_type=y&other=keep',
        },
        writable: true,
      });
      Object.defineProperty(window, 'history', {
        value: { replaceState: replaceStateSpy },
        writable: true,
      });

      clearLinkCallbackParams();

      expect(replaceStateSpy).toHaveBeenCalledTimes(1);
      const newUrl = replaceStateSpy.mock.calls[0][2] as string;
      expect(newUrl).not.toContain('state=');
      expect(newUrl).not.toContain('code=');
      expect(newUrl).not.toContain('link_callback=');
      expect(newUrl).not.toContain('provider_id=');
      expect(newUrl).not.toContain('provider_type=');
      expect(newUrl).toContain('other=keep');
    });
  });

  describe('getLinkRedirectPath', () => {
    it('returns stored path and clears session storage', () => {
      window.sessionStorage.setItem('link_redirect', '/settings/account');
      window.sessionStorage.setItem('link_provider', 'telegram');

      const path = getLinkRedirectPath();
      expect(path).toBe('/settings/account');
      expect(window.sessionStorage.getItem('link_redirect')).toBeNull();
      expect(window.sessionStorage.getItem('link_provider')).toBeNull();
    });

    it('returns default path when no stored value', () => {
      vi.spyOn(window.sessionStorage, 'getItem').mockReturnValue(null);
      vi.spyOn(window.sessionStorage, 'removeItem').mockImplementation(() => {});

      const path = getLinkRedirectPath();
      expect(path).toBe('/settings/account');
    });
  });

  describe('getLinkCallbackStorefrontReturn', () => {
    let originalLocation: typeof window.location;

    beforeEach(() => {
      originalLocation = window.location;
    });

    afterEach(() => {
      Object.defineProperty(window, 'location', {
        value: originalLocation,
        writable: true,
      });
    });

    it('returns null when no state param', () => {
      Object.defineProperty(window, 'location', {
        value: { ...originalLocation, search: '' },
        writable: true,
      });
      expect(getLinkCallbackStorefrontReturn()).toBeNull();
    });

    it('returns null when state has no SF separator', () => {
      Object.defineProperty(window, 'location', {
        value: { ...originalLocation, search: '?state=link:u1:discord' },
        writable: true,
      });
      expect(getLinkCallbackStorefrontReturn()).toBeNull();
    });
  });
});
