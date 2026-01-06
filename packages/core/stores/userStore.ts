/**
 * 用户状态管理
 */

import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';
import type { UserProfile, UserSettings, AuthCredentials } from '../types';
import { profileApi, setAuthCredentials, clearAuthCredentials } from '../services/api';

interface UserState {
  // 状态
  profile: UserProfile | null;
  settings: UserSettings | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // 动作
  login: (credentials: AuthCredentials) => Promise<boolean>;
  logout: () => void;
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

        // 登录
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
              set({
                profile,
                isAuthenticated: true,
                isLoading: false,
              });
              return true;
            }

            set({
              error: '登录失败',
              isLoading: false,
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

        // 登出
        logout: () => {
          clearAuthCredentials();
          set({
            profile: null,
            settings: null,
            isAuthenticated: false,
            error: null,
          });
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
