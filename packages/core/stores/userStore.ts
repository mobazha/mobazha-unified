/**
 * 用户状态管理
 *
 * 支持两种认证模式：
 * - hosted: 托管模式（Casdoor OAuth2）
 * - basic: VPS 模式（Basic Auth）
 */

import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';
import type { UserProfile, UserSettings, AuthCredentials } from '../types';
import { profileApi, setAuthCredentials, clearAuthCredentials } from '../services/api';
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
import { connectWebSocket, disconnectWebSocket } from '../services/websocket';
import { clearProfileCache } from '../services/profileCache';
import { disableMockData } from '../config';
import { onUnauthorized } from '../services/api/client';

interface UserState {
  // 状态
  profile: UserProfile | null;
  settings: UserSettings | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  token: string | null;
  /** 当前认证模式 */
  authMode: 'hosted' | 'basic';
  /** 会话是否已恢复（用于防止在 token 验证前发起需要认证的请求） */
  isSessionRestored: boolean;
  /** 是否需要 onboarding（已登录但无 profile） */
  needsOnboarding: boolean;
  /** 会话是否因 token 无效而过期（用于显示重新登录 Dialog） */
  sessionExpired: boolean;

  // 动作
  /** Basic Auth 登录（VPS 模式） */
  login: (credentials: AuthCredentials) => Promise<boolean>;
  /** OAuth2 回调登录（托管模式） */
  loginWithOAuth: (code: string, state: string) => Promise<boolean>;
  /** 使用已有 token 登录 */
  loginWithToken: (token: string) => Promise<boolean>;
  /** 统一登录方法（自动选择认证方式） */
  loginWithCredentials: (credentials: LoginCredentials) => Promise<boolean>;
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

        // Basic Auth 登录（VPS 模式）
        login: async (credentials: AuthCredentials) => {
          set({ isLoading: true, error: null });

          try {
            // 设置认证凭据
            setAuthCredentials(credentials.username, credentials.password);

            // 获取用户资料验证登录
            const profile = await profileApi.getMyProfile(
              credentials.username,
              credentials.password
            );

            if (profile) {
              // 生成 Basic Auth token
              const basicToken = `basic:${btoa(`${credentials.username}:${credentials.password}`)}`;
              saveToken(basicToken);
              saveUser({ id: profile.peerID, name: profile.name || profile.peerID });

              // 切换到真实 API 模式
              disableMockData();
              console.log('🔄 Basic Auth login successful, switched to real API mode');

              set({
                profile,
                token: basicToken,
                isAuthenticated: true,
                isLoading: false,
                authMode: 'basic',
                isSessionRestored: true,
              });

              // 连接 WebSocket
              connectWebSocket();

              return true;
            }

            set({
              error: '登录失败',
              isLoading: false,
              isSessionRestored: true,
            });
            clearAuthCredentials();
            return false;
          } catch (err) {
            set({
              error: err instanceof Error ? err.message : '登录失败',
              isLoading: false,
            });
            clearAuthCredentials();
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
                error: result.error || '登录失败',
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
                authMode: getCurrentAuthMode(),
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
              authMode: getCurrentAuthMode(),
              isSessionRestored: true,
              needsOnboarding: true,
            });

            connectWebSocket();
            return true;
          } catch (err) {
            set({
              error: err instanceof Error ? err.message : '登录失败',
              isLoading: false,
              isSessionRestored: true,
            });
            clearAuth();
            return false;
          }
        },

        // OAuth2 回调登录（托管模式 - 处理 Casdoor 重定向回来的 code）
        loginWithOAuth: async (code: string, state: string) => {
          set({ isLoading: true, error: null });

          try {
            // 使用 OAuth2 授权码换取 token
            const result = await handleOAuthCallback(code, state);

            if (!result.success || !result.token) {
              set({
                error: result.error || '登录失败',
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
              error: err instanceof Error ? err.message : '登录失败',
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
              error: err instanceof Error ? err.message : '登录失败',
              isLoading: false,
              isSessionRestored: true,
            });
            clearAuth();
            return false;
          }
        },

        // 登出
        logout: () => {
          // 断开 WebSocket
          disconnectWebSocket();

          // 清除 profile 缓存
          clearProfileCache();

          clearAuthCredentials();
          clearAuth();
          set({
            profile: null,
            settings: null,
            isAuthenticated: false,
            error: null,
            token: null,
            isSessionRestored: true, // 保持为 true，因为用户主动登出是有意的
            needsOnboarding: false,
            sessionExpired: false,
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

          try {
            // 尝试获取用户资料验证 Token 有效性
            const profile = await profileApi.getMyProfile();

            if (profile) {
              set({
                profile,
                isAuthenticated: true,
                isLoading: false,
                isSessionRestored: true,
                needsOnboarding: false,
              });

              // 连接 WebSocket
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
            // 仍然尝试连接 WebSocket
            connectWebSocket();
            return true;
          }
        },

        // 获取用户资料
        fetchProfile: async () => {
          set({ isLoading: true });

          try {
            const profile = await profileApi.getMyProfile();
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
        updateProfile: async (updates: Partial<UserProfile>) => {
          set({ isLoading: true, error: null });

          try {
            const result = await profileApi.setProfile(updates);

            if (result.success) {
              const { profile } = get();
              set({
                profile: profile ? { ...profile, ...updates } : null,
                isLoading: false,
              });
              return true;
            }

            set({
              error: result.error || '更新资料失败',
              isLoading: false,
            });
            return false;
          } catch (err) {
            set({
              error: err instanceof Error ? err.message : '更新资料失败',
              isLoading: false,
            });
            return false;
          }
        },

        // 创建用户资料（onboarding 时使用 POST）
        createProfile: async (profileData: Partial<UserProfile>) => {
          set({ isLoading: true, error: null });

          try {
            const result = await profileApi.createProfile(profileData);

            if (result.success) {
              // 创建成功后重新获取完整 profile
              const profile = await profileApi.getMyProfile();
              if (profile) {
                saveUser({ id: profile.peerID, name: profile.name || profile.peerID });
                set({
                  profile,
                  isLoading: false,
                  needsOnboarding: false,
                });
              } else {
                set({ isLoading: false, needsOnboarding: false });
              }
              return true;
            }

            set({
              error: result.error || 'Failed to create profile',
              isLoading: false,
            });
            return false;
          } catch (err) {
            set({
              error: err instanceof Error ? err.message : 'Failed to create profile',
              isLoading: false,
            });
            return false;
          }
        },

        // 更新用户设置
        updateSettings: async (updates: Partial<UserSettings>) => {
          set({ isLoading: true, error: null });

          try {
            const result = await profileApi.setSettings(updates);

            if (result.success) {
              const { settings } = get();
              set({
                settings: settings ? { ...settings, ...updates } : null,
                isLoading: false,
              });
              return true;
            }

            set({
              error: result.error || '更新设置失败',
              isLoading: false,
            });
            return false;
          } catch (err) {
            set({
              error: err instanceof Error ? err.message : '更新设置失败',
              isLoading: false,
            });
            return false;
          }
        },

        // 设置接受的币种
        setAcceptedCoins: async (coins: string[]) => {
          set({ isLoading: true, error: null });

          try {
            const result = await profileApi.setAcceptedCoins(coins);

            if (result.success) {
              const { profile } = get();
              if (profile) {
                set({
                  profile: { ...profile, currencies: coins as UserProfile['currencies'] },
                  isLoading: false,
                });
              }
              return true;
            }

            set({
              error: result.error || '设置失败',
              isLoading: false,
            });
            return false;
          } catch (err) {
            set({
              error: err instanceof Error ? err.message : '设置失败',
              isLoading: false,
            });
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
          token: state.token, // 添加 token 持久化，避免 HMR 后丢失
        }),
      }
    ),
    { name: 'UserStore' }
  )
);

// 注册 API client 的 401 拦截回调
// 当任何 API 请求返回 401 时，触发 forceLogout 显示会话过期提示
onUnauthorized(() => {
  useUserStore.getState().forceLogout();
});

// 选择器
export const selectUser = (state: UserState) => state.profile;
export const selectIsAuthenticated = (state: UserState) => state.isAuthenticated;
export const selectUserLoading = (state: UserState) => state.isLoading;
export const selectUserError = (state: UserState) => state.error;
export const selectIsSessionRestored = (state: UserState) => state.isSessionRestored;
export const selectNeedsOnboarding = (state: UserState) => state.needsOnboarding;
export const selectSessionExpired = (state: UserState) => state.sessionExpired;
