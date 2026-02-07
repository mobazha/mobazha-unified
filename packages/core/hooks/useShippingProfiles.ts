/**
 * useShippingProfiles hook
 * 管理配送档案（Shopify 风格）
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { profileApi } from '../services/api';
import type {
  ShippingProfile,
  ShippingZone,
  ShippingRate,
  ShippingLocation,
  ShippingOptionConfig,
} from '../types';
import { createEmptyZone, createEmptyRate, generateId } from '../types';
import { toISOCountryCode } from '../utils/countryUtils';

// 特殊地区代码（不需要转换）
const SPECIAL_REGION_CODES = ['ALL', 'WORLDWIDE'];

/**
 * 标准化地区代码为 ISO 格式
 */
function normalizeRegionCode(code: string): string {
  const upperCode = code.toUpperCase();
  if (SPECIAL_REGION_CODES.includes(upperCode)) {
    return upperCode === 'WORLDWIDE' ? 'ALL' : upperCode;
  }
  return toISOCountryCode(code);
}

/**
 * 标准化配送区域中的地区代码
 */
function normalizeZoneRegions(zone: ShippingZone): ShippingZone {
  return {
    ...zone,
    regions: zone.regions?.map(normalizeRegionCode) || [],
  };
}

/**
 * 标准化配送档案中所有区域的地区代码
 */
function normalizeProfileRegions(profile: ShippingProfile): ShippingProfile {
  return {
    ...profile,
    zones: profile.zones?.map(normalizeZoneRegions),
    locationGroups: profile.locationGroups?.map(lg => ({
      ...lg,
      zones: lg.zones?.map(normalizeZoneRegions),
    })),
  };
}

// 生成 UUID
function generateUUID(): string {
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * 将旧版 ShippingOptionConfig 迁移到新版 ShippingZone
 */
function migrateOptionToZone(option: ShippingOptionConfig): ShippingZone {
  const rates: ShippingRate[] = option.services.map((service, index) => ({
    id: generateId(),
    name: service.name || `Rate ${index + 1}`,
    price: service.firstFreight || '0',
    currency: option.currency,
    estimatedDelivery: service.estimatedDelivery || '',
    freeShippingThreshold: index === 0 ? option.freeShippingThreshold : undefined,
  }));

  // 如果没有服务，创建一个默认费率
  if (rates.length === 0) {
    rates.push({
      id: generateId(),
      name: option.name,
      price: '0',
      currency: option.currency,
      estimatedDelivery: '',
    });
  }

  return {
    id: generateId(),
    name: option.name,
    regions: option.regions?.map(normalizeRegionCode) || [],
    rates,
  };
}

/**
 * 创建空的配送档案
 */
export function createEmptyProfile(isDefault = false): ShippingProfile {
  return {
    profileId: generateUUID(),
    name: '',
    isDefault,
    zones: [],
  };
}

/**
 * useShippingProfiles hook
 */
export function useShippingProfiles() {
  const [profiles, setProfiles] = useState<ShippingProfile[]>([]);
  const [locations, setLocations] = useState<ShippingLocation[]>([]);
  const [legacyOptions, setLegacyOptions] = useState<ShippingOptionConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 是否使用配送档案模式（有 profile 存在即为 profiles 模式，即使 zone 为空）
  const isUsingProfiles = useMemo(() => profiles.length > 0, [profiles]);

  // 是否有多个发货地点（渐进式 UI）
  const hasMultipleLocations = useMemo(() => locations.length > 1, [locations]);

  // 获取数据
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const settings = await profileApi.getSettings();

      // 加载发货地点
      if (settings?.shippingLocations) {
        setLocations(settings.shippingLocations);
      } else {
        setLocations([]);
      }

      // 加载配送档案
      const profilesData = settings?.shippingProfiles ?? [];
      const legacyData = settings?.shippingOptions ?? [];

      if (profilesData.length > 0) {
        // 有 profiles → 进入 profiles 模式，忽略旧版数据
        setProfiles(profilesData.map(normalizeProfileRegions));
        setLegacyOptions([]);
      } else if (legacyData.length > 0) {
        // 无 profiles 但有旧版数据 → 需要迁移
        setProfiles([]);
        setLegacyOptions(legacyData);
      } else {
        // 全空 → 新用户
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
          shippingProfiles: newProfiles,
        });

        if (result.error) {
          throw new Error(result.error);
        }

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

  // 保存发货地点
  const saveLocations = useCallback(
    async (newLocations: ShippingLocation[]) => {
      setIsSaving(true);
      setError(null);

      try {
        const result = await profileApi.setSettings({
          shippingLocations: newLocations,
        });

        if (result.error) {
          throw new Error(result.error);
        }

        await fetchData();
        return true;
      } catch (err) {
        console.error('Failed to save shipping locations:', err);
        setError((err as Error).message);
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [fetchData]
  );

  // ============== 档案操作 ==============

  const addProfile = useCallback(
    async (profile: ShippingProfile) => {
      const newProfile = {
        ...profile,
        profileId: profile.profileId || generateUUID(),
        isDefault: profiles.length === 0 ? true : profile.isDefault,
      };

      const updatedProfiles = newProfile.isDefault
        ? profiles.map(p => ({ ...p, isDefault: false }))
        : [...profiles];

      return saveProfiles([...updatedProfiles, newProfile]);
    },
    [profiles, saveProfiles]
  );

  const updateProfile = useCallback(
    async (profileId: string, updates: Partial<ShippingProfile>) => {
      const index = profiles.findIndex(p => p.profileId === profileId);
      if (index === -1) return false;

      const updatedProfiles = [...profiles];
      updatedProfiles[index] = { ...updatedProfiles[index], ...updates };

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

  const deleteProfile = useCallback(
    async (profileId: string) => {
      const profileToDelete = profiles.find(p => p.profileId === profileId);
      const newProfiles = profiles.filter(p => p.profileId !== profileId);

      if (profileToDelete?.isDefault && newProfiles.length > 0) {
        newProfiles[0] = { ...newProfiles[0], isDefault: true };
      }

      return saveProfiles(newProfiles);
    },
    [profiles, saveProfiles]
  );

  const setDefaultProfile = useCallback(
    async (profileId: string) => {
      return updateProfile(profileId, { isDefault: true });
    },
    [updateProfile]
  );

  // ============== 区域操作 ==============

  const addZone = useCallback(
    async (profileId: string, zone: ShippingZone) => {
      const profile = profiles.find(p => p.profileId === profileId);
      if (!profile) return false;

      const newZone = {
        ...zone,
        id: zone.id || generateId(),
      };

      return updateProfile(profileId, {
        zones: [...(profile.zones || []), newZone],
      });
    },
    [profiles, updateProfile]
  );

  const updateZone = useCallback(
    async (profileId: string, zoneId: string, updates: Partial<ShippingZone>) => {
      const profile = profiles.find(p => p.profileId === profileId);
      if (!profile) return false;

      const zones = profile.zones?.map(z => (z.id === zoneId ? { ...z, ...updates } : z)) || [];

      return updateProfile(profileId, { zones });
    },
    [profiles, updateProfile]
  );

  const deleteZone = useCallback(
    async (profileId: string, zoneId: string) => {
      const profile = profiles.find(p => p.profileId === profileId);
      if (!profile) return false;

      const zones = profile.zones?.filter(z => z.id !== zoneId) || [];

      return updateProfile(profileId, { zones });
    },
    [profiles, updateProfile]
  );

  // ============== 费率操作 ==============

  const addRate = useCallback(
    async (profileId: string, zoneId: string, rate: ShippingRate) => {
      const profile = profiles.find(p => p.profileId === profileId);
      if (!profile) return false;

      const zones =
        profile.zones?.map(z => {
          if (z.id === zoneId) {
            return {
              ...z,
              rates: [...z.rates, { ...rate, id: rate.id || generateId() }],
            };
          }
          return z;
        }) || [];

      return updateProfile(profileId, { zones });
    },
    [profiles, updateProfile]
  );

  const updateRate = useCallback(
    async (profileId: string, zoneId: string, rateId: string, updates: Partial<ShippingRate>) => {
      const profile = profiles.find(p => p.profileId === profileId);
      if (!profile) return false;

      const zones =
        profile.zones?.map(z => {
          if (z.id === zoneId) {
            return {
              ...z,
              rates: z.rates.map(r => (r.id === rateId ? { ...r, ...updates } : r)),
            };
          }
          return z;
        }) || [];

      return updateProfile(profileId, { zones });
    },
    [profiles, updateProfile]
  );

  const deleteRate = useCallback(
    async (profileId: string, zoneId: string, rateId: string) => {
      const profile = profiles.find(p => p.profileId === profileId);
      if (!profile) return false;

      const zones =
        profile.zones?.map(z => {
          if (z.id === zoneId) {
            return {
              ...z,
              rates: z.rates.filter(r => r.id !== rateId),
            };
          }
          return z;
        }) || [];

      return updateProfile(profileId, { zones });
    },
    [profiles, updateProfile]
  );

  // ============== 发货地点操作 ==============

  const addLocation = useCallback(
    async (location: ShippingLocation) => {
      const newLocation = {
        ...location,
        id: location.id || generateId(),
        isDefault: locations.length === 0 ? true : location.isDefault,
      };

      const updatedLocations = newLocation.isDefault
        ? locations.map(l => ({ ...l, isDefault: false }))
        : [...locations];

      return saveLocations([...updatedLocations, newLocation]);
    },
    [locations, saveLocations]
  );

  const updateLocation = useCallback(
    async (locationId: string, updates: Partial<ShippingLocation>) => {
      let updatedLocations = locations.map(l => (l.id === locationId ? { ...l, ...updates } : l));

      // 如果设置为默认，需要取消其他位置的默认状态（不可变更新）
      if (updates.isDefault) {
        updatedLocations = updatedLocations.map(loc =>
          loc.id === locationId ? loc : { ...loc, isDefault: false }
        );
      }

      return saveLocations(updatedLocations);
    },
    [locations, saveLocations]
  );

  const deleteLocation = useCallback(
    async (locationId: string) => {
      const locationToDelete = locations.find(l => l.id === locationId);
      const newLocations = locations.filter(l => l.id !== locationId);

      if (locationToDelete?.isDefault && newLocations.length > 0) {
        newLocations[0] = { ...newLocations[0], isDefault: true };
      }

      return saveLocations(newLocations);
    },
    [locations, saveLocations]
  );

  // ============== 迁移 ==============

  const migrateFromLegacy = useCallback(
    async (profileName = '默认配送', locationName = '默认发货地点') => {
      // 如果没有需要迁移的旧版数据，直接返回
      if (legacyOptions.length === 0) {
        return false;
      }

      // 如果已有 profiles，不需要迁移
      if (profiles.length > 0) {
        return false;
      }

      // 迁移配送选项为配送区域
      const zones = legacyOptions.map(migrateOptionToZone);

      // 如果已存在空的 profile，合并到第一个 profile 中
      // 否则创建新的 profile
      let migratedProfile: ShippingProfile;

      const existingDefault = profiles.find(p => p.isDefault) || profiles[0];
      if (existingDefault) {
        // 将迁移的 zones 合并到现有空 profile
        migratedProfile = {
          ...existingDefault,
          name: existingDefault.name || profileName,
          zones: [...(existingDefault.zones || []), ...zones],
        };
      } else {
        // 创建新 profile
        migratedProfile = {
          profileId: generateUUID(),
          name: profileName,
          isDefault: true,
          zones,
        };
      }

      // 处理发货地点
      let finalLocations: ShippingLocation[];
      if (locations.length > 0) {
        finalLocations = locations;
      } else {
        // 创建默认发货地点
        finalLocations = [
          {
            id: generateId(),
            name: locationName,
            isDefault: true,
          },
        ];
      }

      setIsSaving(true);
      setError(null);

      try {
        // 构建最终的 profiles 列表
        const finalProfiles = existingDefault
          ? profiles.map(p => (p.profileId === existingDefault.profileId ? migratedProfile : p))
          : [migratedProfile];

        const result = await profileApi.setSettings({
          shippingProfiles: finalProfiles,
          shippingLocations: finalLocations,
        });

        if (result.error) {
          throw new Error(result.error);
        }

        await fetchData();
        return true;
      } catch (err) {
        console.error('Failed to migrate shipping data:', err);
        setError((err as Error).message);
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [profiles, locations, legacyOptions, fetchData]
  );

  // ============== 辅助函数 ==============

  const defaultProfile = useMemo(() => {
    return profiles.find(p => p.isDefault) || profiles[0] || null;
  }, [profiles]);

  const defaultLocation = useMemo(() => {
    return locations.find(l => l.isDefault) || locations[0] || null;
  }, [locations]);

  const getProfileById = useCallback(
    (profileId: string) => {
      return profiles.find(p => p.profileId === profileId) || null;
    },
    [profiles]
  );

  const getLocationById = useCallback(
    (locationId: string) => {
      return locations.find(l => l.id === locationId) || null;
    },
    [locations]
  );

  return {
    // 状态
    profiles,
    locations,
    legacyOptions,
    isLoading,
    isSaving,
    error,
    isUsingProfiles,
    hasMultipleLocations,
    defaultProfile,
    defaultLocation,

    // 档案操作
    addProfile,
    updateProfile,
    deleteProfile,
    setDefaultProfile,

    // 区域操作
    addZone,
    updateZone,
    deleteZone,

    // 费率操作
    addRate,
    updateRate,
    deleteRate,

    // 发货地点操作
    addLocation,
    updateLocation,
    deleteLocation,

    // 迁移
    migrateFromLegacy,
    migrateToProfiles: migrateFromLegacy, // 兼容旧名称

    // 辅助函数
    getProfileById,
    getLocationById,
    refetch: fetchData,

    // 工厂函数
    createEmptyProfile,
    createEmptyZone,
    createEmptyRate,
  };
}

export default useShippingProfiles;
