/**
 * 用户状态管理
 *
 * 支持三种认证模式：
 * - hosted: 托管模式（Casdoor OAuth2）
 * - basic: VPS 模式（Basic Auth）
 * - standalone: 独立站模式（Popup OAuth）
 */

import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';
import type { UserProfile, UserSettings, AuthCredentials } from '../types';
import { profileApi, authGet, ApiError } from '../services/api';
import { NODE_API } from '../config/apiPaths';
import { getTranslation } from '../i18n/i18n';
import {
  handleOAuthCallback,
  saveToken,
  saveUser,
  clearAuth,
  getStoredToken,
  isTokenExpired,
  getAuthService,
  getCurrentAuthMode,
  parseJwtToken,
  type LoginCredentials,
} from '../services/auth';
import { connectWebSocket, disconnectWebSocket, setWebSocketBaseUrl } from '../services/websocket';
import {
  getBuyerWebSocketUrl,
  getSellerWebSocketUrl,
  setStandaloneBuyerAuth,
} from '../services/api';
import { clearProfileCache } from '../services/profileCache';
import { isStandaloneMode } from '../config/env';
import { disableMockData } from '../config';
import { onUnauthorized } from '../services/api/client';
import { onOpenApiUnauthorized } from '../services/api/openapi-client';

/** Auth source tracks how the user authenticated */
export type AuthSource = 'casdoor' | 'telegram' | 'discord' | null;

/**
 * Derive authMode from token — single source of truth.
 *
 * Standalone deployments serve two user types on the same frontend:
 *   - Seller/Admin: authenticates with Basic Auth  → token starts with "basic:"
 *   - Buyer:        authenticates via OAuth popup   → JWT token (no "basic:" prefix)
 *
 * The Vite build mode (`--mode standalone`) sets the *environment* authMode to
 * "standalone", but that only describes the deployment, not the current user's
 * identity.  This helper resolves the actual identity from the token.
 */
function resolveAuthMode(token: string | null | undefined): 'hosted' | 'basic' | 'standalone' {
  if (!isStandaloneMode()) return getCurrentAuthMode();
  if (token?.startsWith('basic:')) return 'basic';
  return 'standalone';
}

interface UserState {
  // 状态
  profile: UserProfile | null;
  settings: UserSettings | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  token: string | null;
  /** 当前认证模式 */
  authMode: 'hosted' | 'basic' | 'standalone';
  /** 会话是否已恢复（用于防止在 token 验证前发起需要认证的请求） */
  isSessionRestored: boolean;
  /** 是否需要 onboarding（已登录但无 profile） */
  needsOnboarding: boolean;
  /** 会话是否因 token 无效而过期（用于显示重新登录 Dialog） */
  sessionExpired: boolean;
  /** How the current session was authenticated */
  authSource: AuthSource;
  /** True when browsing anonymously inside a Mini App (no account yet) */
  isAnonymousMiniAppUser: boolean;

  // 动作
  /** Basic Auth 登录（VPS 模式） */
  login: (credentials: AuthCredentials) => Promise<boolean>;
  /** OAuth2 回调登录（托管模式） */
  loginWithOAuth: (code: string, state: string) => Promise<boolean>;
  /** 使用已有 token 登录 */
  loginWithToken: (token: string) => Promise<boolean>;
  /** 统一登录方法（自动选择认证方式） */
  loginWithCredentials: (credentials: LoginCredentials) => Promise<boolean>;
  /** 独立站 Popup OAuth 登录 */
  loginStandalone: () => Promise<boolean>;
  /** Mini App 登录（使用已从 Mini App auth service 获取的 JWT） */
  loginMiniApp: (token: string, source: 'telegram' | 'discord') => Promise<boolean>;
  /** Enter anonymous browsing mode inside a Mini App */
  enterAnonymousMode: (source: 'telegram' | 'discord') => void;
  logout: () => void;
  /** 因 401 错误强制登出（token 无效/过期） */
  forceLogout: () => void;
  restoreSession: () => Promise<boolean>;
  fetchProfile: () => Promise<void>;
  fetchSettings: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<boolean>;
  createProfile: (profile: Partial<UserProfile>) => Promise<boolean>;
  updateSettings: (updates: Partial<UserSettings>) => Promise<boolean>;
  setAcceptedCoins: (coins: string[]) => Promise<boolean>;
  clearError: () => void;
}

export const useUserStore = create<UserState>()(
  devtools(
    persist(
      (set, get) => ({
        // 初始状态
        profile: null,
        settings: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        token: null,
        authMode: getCurrentAuthMode(),
        isSessionRestored: false,
        needsOnboarding: false,
        sessionExpired: false,
        authSource: null,
        isAnonymousMiniAppUser: false,

        // Basic Auth 登录（VPS / standalone 卖家模式）
        login: async (credentials: AuthCredentials) => {
          set({ isLoading: true, error: null });

          try {
            const basicToken = `basic:${btoa(`${credentials.username}:${credentials.password}`)}`;
            saveToken(basicToken);

            // 先用 /v1/preferences 验证凭据（该端点不依赖 profile 是否存在）
            await authGet<UserSettings>(NODE_API.PREFERENCES);

            // 凭据有效 → 切换到真实 API 模式
            disableMockData();
            console.warn('🔄 Basic Auth login successful, switched to real API mode');
            setStandaloneBuyerAuth(false);

            // 尝试获取 profile（新节点可能尚未创建，返回 null）
            const profile = await profileApi.getMyProfile();

            if (profile) {
              saveUser({ id: profile.peerID, name: profile.name || profile.peerID });
            }

            set({
              profile,
              token: basicToken,
              isAuthenticated: true,
              isLoading: false,
              authMode: 'basic',
              isSessionRestored: true,
              needsOnboarding: !profile,
            });

            if (isStandaloneMode()) {
              setWebSocketBaseUrl(getSellerWebSocketUrl());
            }
            connectWebSocket();

            return true;
          } catch (err) {
            const msg =
              err instanceof ApiError && err.status === 401
                ? getTranslation('login.invalidCredentials')
                : err instanceof Error
                  ? err.message
                  : getTranslation('login.loginFailed');
            set({
              error: msg,
              isLoading: false,
            });
            clearAuth();
            return false;
          }
        },

        // 统一登录方法（使用新的认证服务）
        loginWithCredentials: async (credentials: LoginCredentials) => {
          set({ isLoading: true, error: null });

          try {
            const authService = await getAuthService();
            const result = await authService.login(credentials);

            if (!result.success || !result.token) {
              set({
                error: result.error || getTranslation('login.loginFailed'),
                isLoading: false,
              });
              return false;
            }

            // 保存 Token
            saveToken(result.token);

            // 切换到真实 API 模式
            disableMockData();
            console.log('🔄 Switched to real API mode');

            // 从 JWT token 中解析 Casdoor User ID（如 telegram_123456）
            const claims = parseJwtToken(result.token);
            const casdoorId = claims?.sub || claims?.name;
            console.log('📝 Parsed casdoorId from JWT:', casdoorId);

            // 获取用户资料
            const profile = await profileApi.getMyProfile();

            if (profile) {
              saveUser({
                id: profile.peerID,
                name: profile.name || profile.peerID,
                casdoorId, // 保存 Casdoor User ID
              });
              set({
                profile,
                token: result.token,
                isAuthenticated: true,
                isLoading: false,
                authMode: resolveAuthMode(result.token),
                isSessionRestored: true,
                needsOnboarding: false,
              });

              // 连接 WebSocket
              connectWebSocket();

              return true;
            }

            // 即使获取资料失败，登录仍然成功，也要保存 casdoorId
            // 标记需要 onboarding（无 profile）
            if (casdoorId) {
              saveUser({ id: casdoorId, name: casdoorId, casdoorId });
            }
            set({
              token: result.token,
              isAuthenticated: true,
              isLoading: false,
              authMode: resolveAuthMode(result.token),
              isSessionRestored: true,
              needsOnboarding: true,
            });

            connectWebSocket();
            return true;
          } catch (err) {
            set({
              error: err instanceof Error ? err.message : getTranslation('login.loginFailed'),
              isLoading: false,
              isSessionRestored: true,
            });
            clearAuth();
            return false;
          }
        },

        // 独立站 Popup OAuth 登录（买家通过 Casdoor 认证）
        loginStandalone: async () => {
          set({ isLoading: true, error: null });

          try {
            const authService = await getAuthService();
            const result = await authService.login();

            if (!result.success || !result.token) {
              set({
                error: result.error || 'Authentication failed',
                isLoading: false,
              });
              return false;
            }

            saveToken(result.token);
            disableMockData();

            const claims = parseJwtToken(result.token);
            const casdoorId = claims?.sub || claims?.name;

            // 从 SaaS 获取买家 profile（含 peerID），用于 isOwnStore 判断
            const buyerProfile = await profileApi.getBuyerProfile();

            setStandaloneBuyerAuth(true);

            if (buyerProfile) {
              saveUser({
                id: buyerProfile.peerID,
                name: buyerProfile.name || buyerProfile.peerID,
                casdoorId,
              });
              set({
                profile: buyerProfile,
                token: result.token,
                isAuthenticated: true,
                isLoading: false,
                authMode: 'standalone',
                isSessionRestored: true,
                needsOnboarding: false,
              });
            } else {
              // Profile 不可用（首次用户或 SaaS 不可达），用 casdoorId 作为降级
              if (casdoorId) {
                saveUser({ id: casdoorId, name: casdoorId, casdoorId });
              }
              set({
                token: result.token,
                isAuthenticated: true,
                isLoading: false,
                authMode: 'standalone',
                isSessionRestored: true,
                needsOnboarding: !buyerProfile,
              });
            }

            setWebSocketBaseUrl(getBuyerWebSocketUrl());
            connectWebSocket();
            return true;
          } catch (err) {
            set({
              error: err instanceof Error ? err.message : 'Authentication failed',
              isLoading: false,
              isSessionRestored: true,
            });
            clearAuth();
            return false;
          }
        },

        // Mini App 登录 — uses a JWT obtained from the miniAppAuth service
        loginMiniApp: async (token: string, source: 'telegram' | 'discord') => {
          set({ isLoading: true, error: null });

          try {
            saveToken(token);
            disableMockData();

            const claims = parseJwtToken(token);
            const casdoorId = claims?.sub || claims?.name;

            const profile = await profileApi.getMyProfile();

            if (profile) {
              saveUser({
                id: profile.peerID,
                name: profile.name || profile.peerID,
                casdoorId,
              });
              set({
                profile,
                token,
                isAuthenticated: true,
                isLoading: false,
                authMode: 'hosted',
                isSessionRestored: true,
                needsOnboarding: false,
                authSource: source,
                isAnonymousMiniAppUser: false,
              });
              connectWebSocket();
              return true;
            }

            if (casdoorId) {
              saveUser({ id: casdoorId, name: casdoorId, casdoorId });
            }
            set({
              token,
              isAuthenticated: true,
              isLoading: false,
              authMode: 'hosted',
              isSessionRestored: true,
              needsOnboarding: true,
              authSource: source,
              isAnonymousMiniAppUser: false,
            });
            connectWebSocket();
            return true;
          } catch (err) {
            set({
              error: err instanceof Error ? err.message : 'Login failed',
              isLoading: false,
              isSessionRestored: true,
            });
            clearAuth();
            return false;
          }
        },

        // Enter anonymous browsing mode inside a Mini App (no account)
        enterAnonymousMode: (source: 'telegram' | 'discord') => {
          set({
            isAuthenticated: false,
            isLoading: false,
            isSessionRestored: true,
            authSource: source,
            isAnonymousMiniAppUser: true,
          });
        },

        // OAuth2 回调登录（托管模式 - 处理 Casdoor 重定向回来的 code）
        loginWithOAuth: async (code: string, state: string) => {
          set({ isLoading: true, error: null });

          try {
            // 使用 OAuth2 授权码换取 token
            const result = await handleOAuthCallback(code, state);

            if (!result.success || !result.token) {
              set({
                error: result.error || getTranslation('login.loginFailed'),
                isLoading: false,
              });
              return false;
            }

            // 保存 Token
            saveToken(result.token);

            // 切换到真实 API 模式
            disableMockData();
            console.log('🔄 Switched to real API mode (hosted)');

            // 从 JWT token 中解析 Casdoor User ID（如 telegram_123456）
            const claims = parseJwtToken(result.token);
            const casdoorId = claims?.sub || claims?.name;
            console.log('📝 Parsed casdoorId from JWT:', casdoorId);

            // 获取用户资料
            const profile = await profileApi.getMyProfile();

            if (profile) {
              saveUser({
                id: profile.peerID,
                name: profile.name || profile.peerID,
                casdoorId, // 保存 Casdoor User ID
              });
              set({
                profile,
                token: result.token,
                isAuthenticated: true,
                isLoading: false,
                authMode: 'hosted',
                isSessionRestored: true,
                needsOnboarding: false,
              });

              // 连接 WebSocket
              connectWebSocket().then(connected => {
                if (connected) {
                  console.log('✅ WebSocket connected after OAuth login');
                }
              });

              return true;
            }

            // 即使获取资料失败，登录仍然成功，也要保存 casdoorId
            // 标记需要 onboarding（无 profile）
            if (casdoorId) {
              saveUser({ id: casdoorId, name: casdoorId, casdoorId });
            }
            set({
              token: result.token,
              isAuthenticated: true,
              isLoading: false,
              authMode: 'hosted',
              isSessionRestored: true,
              needsOnboarding: true,
            });

            // 连接 WebSocket
            connectWebSocket();

            return true;
          } catch (err) {
            set({
              error: err instanceof Error ? err.message : getTranslation('login.loginFailed'),
              isLoading: false,
              isSessionRestored: true,
            });
            clearAuth();
            return false;
          }
        },

        // 使用已有 token 登录（用于恢复会话或外部获取的 token）
        loginWithToken: async (token: string) => {
          set({ isLoading: true, error: null });

          try {
            // 保存 Token
            saveToken(token);

            // 切换到真实 API 模式
            disableMockData();

            // 获取用户资料验证 token 有效性
            const profile = await profileApi.getMyProfile();

            if (profile) {
              saveUser({ id: profile.peerID, name: profile.name || profile.peerID });
              set({
                profile,
                token,
                isAuthenticated: true,
                isLoading: false,
                isSessionRestored: true,
                needsOnboarding: false,
              });

              // 连接 WebSocket
              connectWebSocket();

              return true;
            }

            // Token 有效但无 profile — 需要 onboarding
            set({
              token,
              isAuthenticated: true,
              isLoading: false,
              isSessionRestored: true,
              needsOnboarding: true,
            });

            connectWebSocket();
            return true;
          } catch (err) {
            set({
              error: err instanceof Error ? err.message : getTranslation('login.loginFailed'),
              isLoading: false,
              isSessionRestored: true,
            });
            clearAuth();
            return false;
          }
        },

        // 登出
        logout: () => {
          disconnectWebSocket();
          setWebSocketBaseUrl(null);
          setStandaloneBuyerAuth(false);

          clearProfileCache();

          clearAuth();
          set({
            profile: null,
            settings: null,
            isAuthenticated: false,
            error: null,
            token: null,
            isSessionRestored: true,
            needsOnboarding: false,
            sessionExpired: false,
            authSource: null,
            isAnonymousMiniAppUser: false,
          });
        },

        // 因 401 错误强制登出（token 无效/过期/证书不匹配等）
        // 不立即清除状态，而是标记 sessionExpired 让 UI 显示 Dialog
        forceLogout: () => {
          const { sessionExpired, isAuthenticated } = get();
          // 防止重复触发
          if (sessionExpired || !isAuthenticated) return;

          console.warn('⚠️ Session expired due to 401 error, prompting re-login');
          set({ sessionExpired: true });
        },

        // 恢复会话（从存储中恢复登录状态）
        restoreSession: async () => {
          const token = getStoredToken();

          if (!token) {
            // 如果没有 token，清除认证状态（可能是 persist 恢复了旧的 isAuthenticated）
            set({
              isAuthenticated: false,
              profile: null,
              token: null,
              isSessionRestored: true,
            });
            return false;
          }

          // 检查 Token 是否过期
          if (isTokenExpired(token)) {
            clearAuth();
            set({ isAuthenticated: false, token: null, isSessionRestored: true });
            return false;
          }

          // 有 token，切换到真实 API 模式
          disableMockData();
          console.log('🔄 Restored session, switched to real API mode');

          // 先设置为认证状态（token 有效且未过期）
          // 这样即使后续 API 请求失败（如网络问题），用户仍保持登录
          set({ isLoading: true, token, isAuthenticated: true });

          const effectiveMode = resolveAuthMode(token);
          const isStandaloneBuyer = effectiveMode === 'standalone';
          const isBasicSeller = effectiveMode === 'basic';

          if (get().authMode !== effectiveMode) {
            set({ authMode: effectiveMode });
          }
          setStandaloneBuyerAuth(isStandaloneBuyer);

          try {
            const profile = isStandaloneBuyer
              ? await profileApi.getBuyerProfile()
              : await profileApi.getMyProfile();

            if (profile) {
              set({
                profile,
                isAuthenticated: true,
                isLoading: false,
                isSessionRestored: true,
                needsOnboarding: false,
              });

              if (isStandaloneBuyer) {
                setWebSocketBaseUrl(getBuyerWebSocketUrl());
              } else if (isBasicSeller && isStandaloneMode()) {
                setWebSocketBaseUrl(getSellerWebSocketUrl());
              }
              connectWebSocket();

              return true;
            }

            // API 返回空但没有抛出错误 — 用户已认证但无 profile
            // 标记需要 onboarding
            console.warn('⚠️ No profile found, needs onboarding');
            set({
              isLoading: false,
              isSessionRestored: true,
              needsOnboarding: true,
            });
            return true;
          } catch (error) {
            // 区分 401 认证错误和网络错误
            const is401 =
              error instanceof Error &&
              'status' in error &&
              (error as { status?: number }).status === 401;

            if (is401) {
              // 401: token 无效（RSA 验证错误、证书不匹配等）
              // forceLogout 已由 API client 的 onUnauthorized 回调触发
              // 这里只需设置 session 已恢复，Dialog 会处理后续流程
              console.warn('⚠️ Session restore failed: token invalid (401)');
              set({
                isLoading: false,
                isSessionRestored: true,
              });
              return false;
            }

            // 网络错误时不清除认证，保持当前登录状态
            // 这样 HMR 或临时网络问题不会导致用户被登出
            console.warn('⚠️ Network error during session restore, keeping session:', error);
            set({
              isLoading: false,
              isSessionRestored: true,
            });
            if (isStandaloneBuyer) {
              setWebSocketBaseUrl(getBuyerWebSocketUrl());
            } else if (isBasicSeller && isStandaloneMode()) {
              setWebSocketBaseUrl(getSellerWebSocketUrl());
            }
            connectWebSocket();
            return true;
          }
        },

        // 获取用户资料
        fetchProfile: async () => {
          set({ isLoading: true });

          try {
            const isBuyer = get().authMode === 'standalone';
            const profile = isBuyer
              ? await profileApi.getBuyerProfile()
              : await profileApi.getMyProfile();
            set({ profile, isLoading: false });
          } catch (err) {
            set({
              error: err instanceof Error ? err.message : '获取资料失败',
              isLoading: false,
            });
          }
        },

        // 获取用户设置
        fetchSettings: async () => {
          set({ isLoading: true });

          try {
            const settings = await profileApi.getSettings();
            set({ settings, isLoading: false });
          } catch (err) {
            set({
              error: err instanceof Error ? err.message : '获取设置失败',
              isLoading: false,
            });
          }
        },

        // 更新用户资料
        // 注意：不设置 isLoading，因为 AuthGuard 监听 isLoading 会导致子组件卸载重挂载
        updateProfile: async (updates: Partial<UserProfile>) => {
          set({ error: null });

          try {
            const result = await profileApi.setProfile(updates);

            if (result.success) {
              const { profile } = get();
              set({
                profile: profile ? { ...profile, ...updates } : null,
              });
              return true;
            }

            set({ error: result.error || '更新资料失败' });
            return false;
          } catch (err) {
            set({ error: err instanceof Error ? err.message : '更新资料失败' });
            return false;
          }
        },

        // 创建用户资料（onboarding 时使用 POST）
        createProfile: async (profileData: Partial<UserProfile>) => {
          set({ error: null });

          const isStandaloneBuyer = get().authMode === 'standalone';

          try {
            const result = isStandaloneBuyer
              ? await profileApi.createBuyerProfile(profileData)
              : await profileApi.createProfile(profileData);

            if (result.success) {
              const profile = isStandaloneBuyer
                ? await profileApi.getBuyerProfile()
                : await profileApi.getMyProfile();
              if (profile) {
                saveUser({ id: profile.peerID, name: profile.name || profile.peerID });
                set({
                  profile,
                  needsOnboarding: false,
                });
              } else {
                set({ needsOnboarding: false });
              }
              return true;
            }

            set({ error: result.error || 'Failed to create profile' });
            return false;
          } catch (err) {
            set({ error: err instanceof Error ? err.message : 'Failed to create profile' });
            return false;
          }
        },

        // 更新用户设置
        updateSettings: async (updates: Partial<UserSettings>) => {
          set({ error: null });

          try {
            const result = await profileApi.setSettings(updates);

            if (result.success) {
              const { settings } = get();
              set({
                settings: settings ? { ...settings, ...updates } : null,
              });
              return true;
            }

            set({ error: result.error || '更新设置失败' });
            return false;
          } catch (err) {
            set({ error: err instanceof Error ? err.message : '更新设置失败' });
            return false;
          }
        },

        // 设置接受的币种
        setAcceptedCoins: async (coins: string[]) => {
          set({ error: null });

          try {
            const result = await profileApi.setAcceptedCoins(coins);

            if (result.success) {
              const { profile } = get();
              if (profile) {
                set({
                  profile: { ...profile, currencies: coins as UserProfile['currencies'] },
                });
              }
              return true;
            }

            set({ error: result.error || '设置失败' });
            return false;
          } catch (err) {
            set({ error: err instanceof Error ? err.message : '设置失败' });
            return false;
          }
        },

        // 清除错误
        clearError: () => set({ error: null }),
      }),
      {
        name: 'mobazha-user-storage',
        partialize: state => ({
          profile: state.profile,
          isAuthenticated: state.isAuthenticated,
          authMode: state.authMode,
          token: state.token,
          authSource: state.authSource,
        }),
        merge: (persisted, current) => {
          const merged = { ...current, ...(persisted as Partial<UserState>) };
          merged.authMode = resolveAuthMode(merged.token);
          return merged;
        },
      }
    ),
    { name: 'UserStore' }
  )
);

// 401 interceptor: attempt Mini App re-auth before falling back to forceLogout.
// Returns true if the token was refreshed (request will be retried automatically).
const handleUnauthorized = async (): Promise<boolean> => {
  const state = useUserStore.getState();

  if (state.authSource === 'telegram') {
    try {
      const tgWebApp = (window as unknown as Record<string, unknown>).Telegram as
        | { WebApp?: { initData?: string } }
        | undefined;
      const initData = tgWebApp?.WebApp?.initData;
      if (initData) {
        const { signinTelegram } = await import('../services/auth/miniAppAuth');
        const token = await signinTelegram(initData, false);
        if (token) {
          await state.loginMiniApp(token, 'telegram');
          return true;
        }
      }
    } catch {
      // Re-auth failed — fall through to forceLogout
    }
  }

  if (state.authSource === 'discord') {
    try {
      // Discord access_token is saved to sessionStorage by AuthProvider (URL is lost after navigation)
      const accessToken =
        typeof sessionStorage !== 'undefined'
          ? sessionStorage.getItem('discord_access_token')
          : null;
      if (accessToken) {
        const { signinDiscord } = await import('../services/auth/miniAppAuth');
        const token = await signinDiscord(accessToken, false);
        if (token) {
          await state.loginMiniApp(token, 'discord');
          return true;
        }
      }
    } catch {
      // Re-auth failed — fall through to forceLogout
    }
  }

  state.forceLogout();
  return false;
};
onUnauthorized(handleUnauthorized);
onOpenApiUnauthorized(handleUnauthorized as () => void);

// profile → roleStore 同步：profile.vendor/moderator 变化时自动同步到 roleStore
import { useRoleStore } from './roleStore';
let _prevVendor: boolean | undefined;
let _prevModerator: boolean | undefined;
useUserStore.subscribe(state => {
  const vendor = state.profile?.vendor;
  const moderator = state.profile?.moderator;
  if (vendor === _prevVendor && moderator === _prevModerator) return;
  _prevVendor = vendor;
  _prevModerator = moderator;

  const roleStore = useRoleStore.getState();
  if (vendor && !roleStore.roleState.isSeller) {
    roleStore.enableSeller();
  } else if (!vendor && roleStore.roleState.isSeller) {
    roleStore.disableSeller();
  }
  if (moderator && !roleStore.roleState.isModerator) {
    roleStore.enableModerator();
  } else if (!moderator && roleStore.roleState.isModerator) {
    roleStore.disableModerator();
  }
});

// 选择器
export const selectUser = (state: UserState) => state.profile;
export const selectIsAuthenticated = (state: UserState) => state.isAuthenticated;
export const selectUserLoading = (state: UserState) => state.isLoading;
export const selectUserError = (state: UserState) => state.error;
export const selectIsSessionRestored = (state: UserState) => state.isSessionRestored;
export const selectNeedsOnboarding = (state: UserState) => state.needsOnboarding;
export const selectSessionExpired = (state: UserState) => state.sessionExpired;
export const selectAuthSource = (state: UserState) => state.authSource;
export const selectIsAnonymousMiniAppUser = (state: UserState) => state.isAnonymousMiniAppUser;
