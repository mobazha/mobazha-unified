/**
 * userStore unit tests
 *
 * P1: Verify updateProfile/updateSettings/setAcceptedCoins do NOT set isLoading.
 * This was a critical bug fix — AuthGuard watches isLoading and remounts children
 * when it changes, causing UI flickering during profile updates.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockSetProfile = vi.fn();
const mockGetMyProfile = vi.fn();
const mockGetSettings = vi.fn();
const mockSetSettings = vi.fn();
const mockSetAcceptedCoins = vi.fn();
const mockCreateProfile = vi.fn();

vi.mock('../../services/api', () => ({
  profileApi: {
    getMyProfile: (...args: unknown[]) => mockGetMyProfile(...args),
    setProfile: (...args: unknown[]) => mockSetProfile(...args),
    getSettings: (...args: unknown[]) => mockGetSettings(...args),
    setSettings: (...args: unknown[]) => mockSetSettings(...args),
    setAcceptedCoins: (...args: unknown[]) => mockSetAcceptedCoins(...args),
    createProfile: (...args: unknown[]) => mockCreateProfile(...args),
    getBuyerProfile: vi.fn(),
    createBuyerProfile: vi.fn(),
  },
  authGet: vi.fn(),
  ApiError: class ApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  },
  getBuyerWebSocketUrl: vi.fn(() => ''),
  getSellerWebSocketUrl: vi.fn(() => ''),
  setStandaloneBuyerAuth: vi.fn(),
}));

vi.mock('../../services/auth', () => ({
  handleOAuthCallback: vi.fn(),
  saveToken: vi.fn(),
  saveUser: vi.fn(),
  clearAuth: vi.fn(),
  getStoredToken: vi.fn(() => null),
  isTokenExpired: vi.fn(() => false),
  getAuthService: vi.fn(),
  getCurrentAuthMode: vi.fn(() => 'hosted'),
  parseJwtToken: vi.fn(),
}));

vi.mock('../../services/websocket', () => ({
  connectWebSocket: vi.fn(),
  disconnectWebSocket: vi.fn(),
  setWebSocketBaseUrl: vi.fn(),
}));

vi.mock('../../services/profileCache', () => ({
  clearProfileCache: vi.fn(),
}));

vi.mock('../../config/env', () => ({
  isStandaloneMode: vi.fn(() => false),
}));

vi.mock('../../config', () => ({
  disableMockData: vi.fn(),
}));

vi.mock('../../config/apiPaths', () => ({
  NODE_API: { PREFERENCES: '/v1/preferences' },
}));

vi.mock('../../services/api/client', () => ({
  onUnauthorized: vi.fn(),
}));

vi.mock('../../services/api/openapi-client', () => ({
  onOpenApiUnauthorized: vi.fn(),
}));

// ── Import (after mocks) ─────────────────────────────────────────────────────

import { useUserStore } from '../../stores/userStore';

// ── Tests ────────────────────────────────────────────────────────────────────

describe('userStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store to initial state
    useUserStore.setState({
      profile: {
        peerID: 'QmTest123',
        name: 'Test Store',
        currencies: [],
      } as any,
      settings: {
        country: 'US',
        localCurrency: 'USD',
      } as any,
      isAuthenticated: true,
      isLoading: false,
      error: null,
      token: 'test-token',
      authMode: 'hosted',
      isSessionRestored: true,
      needsOnboarding: false,
      sessionExpired: false,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('updateProfile', () => {
    it('does NOT set isLoading during update (prevents AuthGuard remount)', async () => {
      mockSetProfile.mockResolvedValueOnce({ success: true });

      const loadingStates: boolean[] = [];
      const unsub = useUserStore.subscribe(state => {
        loadingStates.push(state.isLoading);
      });

      await useUserStore.getState().updateProfile({ name: 'New Name' });

      unsub();
      expect(loadingStates.every(s => s === false)).toBe(true);
    });

    it('updates profile state on success', async () => {
      mockSetProfile.mockResolvedValueOnce({ success: true });

      const result = await useUserStore.getState().updateProfile({ name: 'Updated' });

      expect(result).toBe(true);
      expect(useUserStore.getState().profile?.name).toBe('Updated');
    });

    it('sets error on failure', async () => {
      mockSetProfile.mockResolvedValueOnce({ success: false, error: 'Server error' });

      const result = await useUserStore.getState().updateProfile({ name: 'Fail' });

      expect(result).toBe(false);
      expect(useUserStore.getState().error).toBe('Server error');
    });

    it('handles thrown exceptions', async () => {
      mockSetProfile.mockRejectedValueOnce(new Error('Network error'));

      const result = await useUserStore.getState().updateProfile({ name: 'Err' });

      expect(result).toBe(false);
      expect(useUserStore.getState().error).toBe('Network error');
    });
  });

  describe('updateSettings', () => {
    it('does NOT set isLoading during update', async () => {
      mockSetSettings.mockResolvedValueOnce({ success: true });

      const loadingStates: boolean[] = [];
      const unsub = useUserStore.subscribe(state => {
        loadingStates.push(state.isLoading);
      });

      await useUserStore.getState().updateSettings({ country: 'JP' });

      unsub();
      expect(loadingStates.every(s => s === false)).toBe(true);
    });

    it('updates settings state on success', async () => {
      mockSetSettings.mockResolvedValueOnce({ success: true });

      const result = await useUserStore.getState().updateSettings({ country: 'JP' });

      expect(result).toBe(true);
      expect(useUserStore.getState().settings?.country).toBe('JP');
    });
  });

  describe('setAcceptedCoins', () => {
    it('does NOT set isLoading during update', async () => {
      mockSetAcceptedCoins.mockResolvedValueOnce({ success: true });

      const loadingStates: boolean[] = [];
      const unsub = useUserStore.subscribe(state => {
        loadingStates.push(state.isLoading);
      });

      await useUserStore.getState().setAcceptedCoins(['BTC', 'ETH']);

      unsub();
      expect(loadingStates.every(s => s === false)).toBe(true);
    });

    it('updates profile currencies on success', async () => {
      mockSetAcceptedCoins.mockResolvedValueOnce({ success: true });

      const result = await useUserStore.getState().setAcceptedCoins(['BTC', 'ETH']);

      expect(result).toBe(true);
      expect(useUserStore.getState().profile?.currencies).toEqual(['BTC', 'ETH']);
    });
  });

  describe('forceLogout', () => {
    it('sets sessionExpired to true', () => {
      useUserStore.getState().forceLogout();
      expect(useUserStore.getState().sessionExpired).toBe(true);
    });

    it('does not duplicate when already expired', () => {
      useUserStore.getState().forceLogout();
      expect(useUserStore.getState().sessionExpired).toBe(true);

      // Second call should be no-op
      useUserStore.getState().forceLogout();
      expect(useUserStore.getState().sessionExpired).toBe(true);
    });

    it('does not trigger when not authenticated', () => {
      useUserStore.setState({ isAuthenticated: false });
      useUserStore.getState().forceLogout();
      expect(useUserStore.getState().sessionExpired).toBe(false);
    });
  });

  describe('logout', () => {
    it('clears all auth state', () => {
      useUserStore.getState().logout();

      const state = useUserStore.getState();
      expect(state.profile).toBeNull();
      expect(state.settings).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.token).toBeNull();
      expect(state.needsOnboarding).toBe(false);
      expect(state.sessionExpired).toBe(false);
      expect(state.isSessionRestored).toBe(true);
    });
  });
});
