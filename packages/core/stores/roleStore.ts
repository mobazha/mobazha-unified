/**
 * 角色管理 Store
 * 管理用户在系统中的角色（商家/买家/仲裁人）
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserRole } from '../types';

// 角色状态
export interface RoleState {
  isSeller: boolean;
  isModerator: boolean;
  activeRole: UserRole;
}

// 仲裁人设置
export interface ModeratorSettings {
  fee: number; // 费率百分比
  description: string;
  termsAndConditions: string;
  languages: string[];
  acceptedCurrencies: string[];
  isAvailable: boolean;
}

// Store 接口
interface RoleStore {
  // 状态
  roleState: RoleState;
  moderatorSettings: ModeratorSettings | null;
  isLoading: boolean;
  error: string | null;

  // 角色切换
  setActiveRole: (role: UserRole) => void;
  enableSeller: () => void;
  disableSeller: () => void;
  enableModerator: () => void;
  disableModerator: () => void;

  // 仲裁人设置
  setModeratorSettings: (settings: Partial<ModeratorSettings>) => void;
  clearModeratorSettings: () => void;

  // 工具
  clearError: () => void;
  reset: () => void;
}

// 默认角色状态
const defaultRoleState: RoleState = {
  isSeller: false,
  isModerator: false,
  activeRole: 'buyer',
};

// 默认仲裁人设置
const defaultModeratorSettings: ModeratorSettings = {
  fee: 1,
  description: '',
  termsAndConditions: '',
  languages: ['en'],
  acceptedCurrencies: ['BTC', 'ETH'],
  isAvailable: false,
};

/**
 * 角色管理 Store
 */
export const useRoleStore = create<RoleStore>()(
  persist(
    (set, _get) => ({
      // 初始状态
      roleState: defaultRoleState,
      moderatorSettings: null,
      isLoading: false,
      error: null,

      // 设置活跃角色
      setActiveRole: (role: UserRole) => {
        set(state => {
          // 验证角色是否可用
          if (role === 'seller' && !state.roleState.isSeller) {
            return { error: '您还未启用商家功能' };
          }
          if (role === 'moderator' && !state.roleState.isModerator) {
            return { error: '您还未启用仲裁人功能' };
          }
          return {
            roleState: { ...state.roleState, activeRole: role },
            error: null,
          };
        });
      },

      // 启用商家
      enableSeller: () => {
        set(state => ({
          roleState: { ...state.roleState, isSeller: true },
        }));
      },

      // 禁用商家
      disableSeller: () => {
        set(state => ({
          roleState: {
            ...state.roleState,
            isSeller: false,
            // 如果当前是商家角色，切换回买家
            activeRole:
              state.roleState.activeRole === 'seller' ? 'buyer' : state.roleState.activeRole,
          },
        }));
      },

      // 启用仲裁人
      enableModerator: () => {
        set(state => ({
          roleState: { ...state.roleState, isModerator: true },
          moderatorSettings: state.moderatorSettings || defaultModeratorSettings,
        }));
      },

      // 禁用仲裁人
      disableModerator: () => {
        set(state => ({
          roleState: {
            ...state.roleState,
            isModerator: false,
            activeRole:
              state.roleState.activeRole === 'moderator' ? 'buyer' : state.roleState.activeRole,
          },
        }));
      },

      // 设置仲裁人参数
      setModeratorSettings: (settings: Partial<ModeratorSettings>) => {
        set(state => ({
          moderatorSettings: state.moderatorSettings
            ? { ...state.moderatorSettings, ...settings }
            : { ...defaultModeratorSettings, ...settings },
        }));
      },

      // 清除仲裁人设置
      clearModeratorSettings: () => {
        set({ moderatorSettings: null });
      },

      // 清除错误
      clearError: () => set({ error: null }),

      // 重置
      reset: () =>
        set({
          roleState: defaultRoleState,
          moderatorSettings: null,
          isLoading: false,
          error: null,
        }),
    }),
    {
      name: 'mobazha-role-store',
      partialize: state => ({
        roleState: state.roleState,
        moderatorSettings: state.moderatorSettings,
      }),
    }
  )
);

export default useRoleStore;
