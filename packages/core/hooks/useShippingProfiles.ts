/**
 * useShippingProfiles hook
 * 管理配送档案（Shopify 模式）
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { profileApi } from '../services/api';
import type { ShippingProfile, ShippingOptionConfig, ShippingProfileSetting } from '../types';
import { createEmptyShippingOption } from '../types';

// 生成 UUID（优先使用原生 API，回退到自定义实现）
function generateUUID(): string {
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  // Fallback for older environments
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * 创建空的配送档案
 */
export function createEmptyProfile(isDefault = false): ShippingProfile {
  return {
    profileId: generateUUID(),
    name: '',
    isDefault,
    options: [createEmptyShippingOption()],
  };
}

/**
 * 转换 ShippingProfileSetting 到 ShippingProfile
 */
function toShippingProfile(setting: ShippingProfileSetting): ShippingProfile {
  return {
    profileId: setting.profileId,
    name: setting.name,
    isDefault: setting.isDefault,
    options: setting.options,
    listingCount: setting.listingCount,
    createdAt: setting.createdAt,
    updatedAt: setting.updatedAt,
  };
}

/**
 * 转换 ShippingProfile 到 ShippingProfileSetting
 */
function toShippingProfileSetting(profile: ShippingProfile): ShippingProfileSetting {
  return {
    profileId: profile.profileId,
    name: profile.name,
    isDefault: profile.isDefault,
    options: profile.options,
    listingCount: profile.listingCount,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  };
}

/**
 * useShippingProfiles hook
 *
 * @example
 * const {
 *   profiles,
 *   isLoading,
 *   isUsingProfiles,
 *   addProfile,
 *   updateProfile,
 *   deleteProfile,
 *   migrateToProfiles,
 *   refetch
 * } = useShippingProfiles();
 */
export function useShippingProfiles() {
  const [profiles, setProfiles] = useState<ShippingProfile[]>([]);
  const [legacyOptions, setLegacyOptions] = useState<ShippingOptionConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 是否使用配送档案模式
  const isUsingProfiles = useMemo(() => profiles.length > 0, [profiles]);

  // 获取数据
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const settings = await profileApi.getSettings();
      if (settings?.shippingProfiles && settings.shippingProfiles.length > 0) {
        setProfiles(settings.shippingProfiles.map(toShippingProfile));
        setLegacyOptions([]);
      } else if (settings?.shippingOptions) {
        setProfiles([]);
        setLegacyOptions(settings.shippingOptions);
      } else {
        setProfiles([]);
        setLegacyOptions([]);
      }
    } catch (err) {
      console.error('Failed to fetch shipping data:', err);
      setError((err as Error).message);
      setProfiles([]);
      setLegacyOptions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 初始加载
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 保存配送档案
  const saveProfiles = useCallback(
    async (newProfiles: ShippingProfile[]) => {
      setIsSaving(true);
      setError(null);

      try {
        const result = await profileApi.setSettings({
          shippingProfiles: newProfiles.map(toShippingProfileSetting),
        });

        if (result.error) {
          throw new Error(result.error);
        }

        // 重新获取最新数据
        await fetchData();
        return true;
      } catch (err) {
        console.error('Failed to save shipping profiles:', err);
        setError((err as Error).message);
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [fetchData]
  );

  // 添加配送档案
  const addProfile = useCallback(
    async (profile: ShippingProfile) => {
      // 如果是第一个档案，自动设为默认
      const newProfile = {
        ...profile,
        profileId: profile.profileId || generateUUID(),
        isDefault: profiles.length === 0 ? true : profile.isDefault,
      };

      // 如果新档案是默认的，取消其他档案的默认状态
      const updatedProfiles = newProfile.isDefault
        ? profiles.map(p => ({ ...p, isDefault: false }))
        : [...profiles];

      return saveProfiles([...updatedProfiles, newProfile]);
    },
    [profiles, saveProfiles]
  );

  // 更新配送档案
  const updateProfile = useCallback(
    async (profileId: string, updates: Partial<ShippingProfile>) => {
      const index = profiles.findIndex(p => p.profileId === profileId);
      if (index === -1) return false;

      const updatedProfiles = [...profiles];
      updatedProfiles[index] = { ...updatedProfiles[index], ...updates };

      // 如果更新为默认档案，取消其他档案的默认状态
      if (updates.isDefault) {
        for (let i = 0; i < updatedProfiles.length; i++) {
          if (i !== index) {
            updatedProfiles[i] = { ...updatedProfiles[i], isDefault: false };
          }
        }
      }

      return saveProfiles(updatedProfiles);
    },
    [profiles, saveProfiles]
  );

  // 删除配送档案
  const deleteProfile = useCallback(
    async (profileId: string) => {
      const profileToDelete = profiles.find(p => p.profileId === profileId);
      const newProfiles = profiles.filter(p => p.profileId !== profileId);

      // 如果删除的是默认档案，将第一个设为默认
      if (profileToDelete?.isDefault && newProfiles.length > 0) {
        newProfiles[0] = { ...newProfiles[0], isDefault: true };
      }

      return saveProfiles(newProfiles);
    },
    [profiles, saveProfiles]
  );

  // 从传统模式迁移到档案模式
  const migrateToProfiles = useCallback(
    async (profileName = '默认配送') => {
      if (isUsingProfiles || legacyOptions.length === 0) {
        return false;
      }

      const defaultProfile: ShippingProfile = {
        profileId: generateUUID(),
        name: profileName,
        isDefault: true,
        options: legacyOptions,
      };

      return saveProfiles([defaultProfile]);
    },
    [isUsingProfiles, legacyOptions, saveProfiles]
  );

  // 设置默认档案
  const setDefaultProfile = useCallback(
    async (profileId: string) => {
      return updateProfile(profileId, { isDefault: true });
    },
    [updateProfile]
  );

  // 获取默认档案
  const defaultProfile = useMemo(() => {
    return profiles.find(p => p.isDefault) || profiles[0] || null;
  }, [profiles]);

  // 根据 ID 获取档案
  const getProfileById = useCallback(
    (profileId: string) => {
      return profiles.find(p => p.profileId === profileId) || null;
    },
    [profiles]
  );

  return {
    // 状态
    profiles,
    legacyOptions,
    isLoading,
    isSaving,
    error,
    isUsingProfiles,
    defaultProfile,

    // 操作
    addProfile,
    updateProfile,
    deleteProfile,
    setDefaultProfile,
    migrateToProfiles,
    refetch: fetchData,

    // 辅助函数
    getProfileById,
    createEmptyProfile,
  };
}

export default useShippingProfiles;
