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
  type LoginCredentials,
} from '../services/auth';
import { connectWebSocket, disconnectWebSocket } from '../services/websocket';
import { disableMockData, enableMockData } from '../config';

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
  restoreSession: () => Promise<boolean>;
  fetchProfile: () => Promise<void>;
  fetchSettings: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<boolean>;
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

            // 获取用户资料
            const profile = await profileApi.getMyProfile();

            if (profile) {
              saveUser({ id: profile.peerID, name: profile.name || profile.peerID });
              set({
                profile,
                token: result.token,
                isAuthenticated: true,
                isLoading: false,
                authMode: getCurrentAuthMode(),
                isSessionRestored: true,
              });

              // 连接 WebSocket
              connectWebSocket();

              return true;
            }

            // 即使获取资料失败，登录仍然成功
            set({
              token: result.token,
              isAuthenticated: true,
              isLoading: false,
              authMode: getCurrentAuthMode(),
              isSessionRestored: true,
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

            // 获取用户资料
            const profile = await profileApi.getMyProfile();

            if (profile) {
              saveUser({ id: profile.peerID, name: profile.name || profile.peerID });
              set({
                profile,
                token: result.token,
                isAuthenticated: true,
                isLoading: false,
                authMode: 'hosted',
                isSessionRestored: true,
              });

              // 连接 WebSocket
              connectWebSocket().then(connected => {
                if (connected) {
                  console.log('✅ WebSocket connected after OAuth login');
                }
              });

              return true;
            }

            // 即使获取资料失败，登录仍然成功
            set({
              token: result.token,
              isAuthenticated: true,
              isLoading: false,
              authMode: 'hosted',
              isSessionRestored: true,
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
              });

              // 连接 WebSocket
              connectWebSocket();

              return true;
            }

            // Token 无效
            clearAuth();
            set({
              error: 'Token 验证失败',
              isLoading: false,
              isSessionRestored: true,
            });
            return false;
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

          clearAuthCredentials();
          clearAuth();
          set({
            profile: null,
            settings: null,
            isAuthenticated: false,
            error: null,
            token: null,
            isSessionRestored: true, // 保持为 true，因为用户主动登出是有意的
          });
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

          set({ isLoading: true, token });

          try {
            // 尝试获取用户资料验证 Token 有效性
            const profile = await profileApi.getMyProfile();

            if (profile) {
              set({
                profile,
                isAuthenticated: true,
                isLoading: false,
                isSessionRestored: true,
              });

              // 连接 WebSocket
              connectWebSocket();

              return true;
            }

            // Token 无效
            clearAuth();
            enableMockData(); // 恢复 mock 模式
            set({
              isAuthenticated: false,
              token: null,
              isLoading: false,
              isSessionRestored: true,
            });
            return false;
          } catch {
            clearAuth();
            enableMockData(); // 恢复 mock 模式
            set({
              isAuthenticated: false,
              token: null,
              isLoading: false,
              isSessionRestored: true,
            });
            return false;
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
        }),
      }
    ),
    { name: 'UserStore' }
  )
);

// 选择器
export const selectUser = (state: UserState) => state.profile;
export const selectIsAuthenticated = (state: UserState) => state.isAuthenticated;
export const selectUserLoading = (state: UserState) => state.isLoading;
export const selectUserError = (state: UserState) => state.error;
export const selectIsSessionRestored = (state: UserState) => state.isSessionRestored;
