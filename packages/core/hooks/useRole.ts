/**
 * useRole Hook
 * 角色管理 React Hook
 */

import { useCallback, useMemo } from 'react';
import { useRoleStore, type UserRole, type ModeratorSettings } from '../stores/roleStore';
import { modeApi } from '../services/api/mode';

export interface UseRoleReturn {
  // 状态
  activeRole: UserRole;
  isSeller: boolean;
  isModerator: boolean;
  isBuyer: boolean; // 买家总是可用
  moderatorSettings: ModeratorSettings | null;
  error: string | null;

  // 角色检查
  canSell: boolean;
  canModerate: boolean;
  isActiveAsSeller: boolean;
  isActiveAsModerator: boolean;
  isActiveAsBuyer: boolean;

  // 角色切换
  switchToBuyer: () => void;
  switchToSeller: () => void;
  switchToModerator: () => void;

  // 角色管理
  enableSelling: () => Promise<boolean>;
  disableSelling: () => Promise<boolean>;
  enableModeration: () => Promise<boolean>;
  disableModeration: () => Promise<boolean>;

  // 仲裁人设置
  updateModeratorSettings: (settings: Partial<ModeratorSettings>) => Promise<boolean>;

  // 工具
  clearError: () => void;
}

/**
 * 角色管理 Hook
 */
export function useRole(): UseRoleReturn {
  const {
    roleState,
    moderatorSettings,
    error,
    setActiveRole,
    enableSeller,
    disableSeller,
    enableModerator,
    disableModerator,
    setModeratorSettings,
    clearError,
  } = useRoleStore();

  // 派生状态
  const { activeRole, isSeller, isModerator } = roleState;

  // 活跃角色检查
  const isActiveAsSeller = activeRole === 'seller';
  const isActiveAsModerator = activeRole === 'moderator';
  const isActiveAsBuyer = activeRole === 'buyer';

  // 能力检查
  const canSell = isSeller;
  const canModerate = isModerator;

  // 角色切换
  const switchToBuyer = useCallback(() => {
    setActiveRole('buyer');
  }, [setActiveRole]);

  const switchToSeller = useCallback(() => {
    setActiveRole('seller');
  }, [setActiveRole]);

  const switchToModerator = useCallback(() => {
    setActiveRole('moderator');
  }, [setActiveRole]);

  // 启用销售功能
  const enableSelling = useCallback(async (): Promise<boolean> => {
    try {
      // TODO: 调用 API 设置商家状态
      await modeApi.setModeratorStatus(false); // 这里是示例，实际应该调用设置商家的 API
      enableSeller();
      return true;
    } catch {
      return false;
    }
  }, [enableSeller]);

  // 禁用销售功能
  const disableSelling = useCallback(async (): Promise<boolean> => {
    try {
      // TODO: 调用 API 取消商家状态
      disableSeller();
      return true;
    } catch {
      return false;
    }
  }, [disableSeller]);

  // 启用仲裁功能
  const enableModeration = useCallback(async (): Promise<boolean> => {
    try {
      await modeApi.setModeratorStatus(true);
      enableModerator();
      return true;
    } catch {
      return false;
    }
  }, [enableModerator]);

  // 禁用仲裁功能
  const disableModeration = useCallback(async (): Promise<boolean> => {
    try {
      await modeApi.setModeratorStatus(false);
      disableModerator();
      return true;
    } catch {
      return false;
    }
  }, [disableModerator]);

  // 更新仲裁人设置
  const updateModeratorSettings = useCallback(
    async (settings: Partial<ModeratorSettings>): Promise<boolean> => {
      try {
        // TODO: 调用 API 更新仲裁人设置
        // await modeApi.updateModeratorSettings(settings);
        setModeratorSettings(settings);
        return true;
      } catch {
        return false;
      }
    },
    [setModeratorSettings]
  );

  // 返回值
  return useMemo(
    () => ({
      // 状态
      activeRole,
      isSeller,
      isModerator,
      isBuyer: true, // 买家总是可用
      moderatorSettings,
      error,

      // 角色检查
      canSell,
      canModerate,
      isActiveAsSeller,
      isActiveAsModerator,
      isActiveAsBuyer,

      // 角色切换
      switchToBuyer,
      switchToSeller,
      switchToModerator,

      // 角色管理
      enableSelling,
      disableSelling,
      enableModeration,
      disableModeration,

      // 仲裁人设置
      updateModeratorSettings,

      // 工具
      clearError,
    }),
    [
      activeRole,
      isSeller,
      isModerator,
      moderatorSettings,
      error,
      canSell,
      canModerate,
      isActiveAsSeller,
      isActiveAsModerator,
      isActiveAsBuyer,
      switchToBuyer,
      switchToSeller,
      switchToModerator,
      enableSelling,
      disableSelling,
      enableModeration,
      disableModeration,
      updateModeratorSettings,
      clearError,
    ]
  );
}

export default useRole;

