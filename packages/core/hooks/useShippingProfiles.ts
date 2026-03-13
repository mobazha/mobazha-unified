/**
 * useShippingProfiles hook
 * 管理配送档案 — 调用独立 Shipping CRUD API（替代 preferences blob）
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { shippingApi } from '../services/api/shipping';
import type { ShippingProfile, ShippingZone, ShippingRate, ShippingLocation } from '../types';
import { createEmptyZone, createEmptyRate, createEmptyLocationGroup, generateId } from '../types';
import { toISOCountryCode } from '../utils/countryUtils';

const SPECIAL_REGION_CODES = ['ALL', 'WORLDWIDE'];

function normalizeRegionCode(code: string): string {
  const upperCode = code.toUpperCase();
  if (SPECIAL_REGION_CODES.includes(upperCode)) {
    return upperCode === 'WORLDWIDE' ? 'ALL' : upperCode;
  }
  return toISOCountryCode(code);
}

function normalizeZoneRegions(zone: ShippingZone): ShippingZone {
  return {
    ...zone,
    regions: zone.regions?.map(normalizeRegionCode) || [],
  };
}

function normalizeProfileRegions(profile: ShippingProfile): ShippingProfile {
  return {
    ...profile,
    locationGroups: profile.locationGroups?.map(lg => ({
      ...lg,
      zones: lg.zones?.map(normalizeZoneRegions),
    })),
  };
}

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

export function createEmptyProfile(isDefault = false): ShippingProfile {
  return {
    profileId: generateUUID(),
    name: '',
    isDefault,
    locationGroups: [
      {
        id: generateId(),
        locationIds: [],
        zones: [],
      },
    ],
  };
}

export function useShippingProfiles() {
  const [profiles, setProfiles] = useState<ShippingProfile[]>([]);
  const [locations, setLocations] = useState<ShippingLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [staleCount, setStaleCount] = useState(0);

  const isUsingProfiles = useMemo(() => profiles.length > 0, [profiles]);
  const hasMultipleLocations = useMemo(() => locations.length > 1, [locations]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [profileList, locationList] = await Promise.all([
        shippingApi.listProfiles(),
        shippingApi.listLocations(),
      ]);

      setProfiles(profileList.map(normalizeProfileRegions));
      setLocations(locationList);

      try {
        const staleResult = await shippingApi.listStaleRefs(1, 1);
        setStaleCount(staleResult?.meta?.total ?? 0);
      } catch {
        setStaleCount(0);
      }
    } catch (err) {
      console.error('Failed to fetch shipping data:', err);
      setError((err as Error).message);
      setProfiles([]);
      setLocations([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ============== Profile 操作 ==============

  const addProfile = useCallback(
    async (profile: ShippingProfile): Promise<ShippingProfile | false> => {
      setIsSaving(true);
      setError(null);
      try {
        const created = await shippingApi.createProfile(profile);
        await fetchData();
        return created;
      } catch (err) {
        console.error('Failed to create shipping profile:', err);
        setError((err as Error).message);
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [fetchData]
  );

  const updateProfile = useCallback(
    async (profileId: string, updates: Partial<ShippingProfile>) => {
      setIsSaving(true);
      setError(null);
      try {
        const existing = profiles.find(p => p.profileId === profileId);
        if (!existing) return false;

        const merged: ShippingProfile = { ...existing, ...updates };
        await shippingApi.updateProfile(profileId, merged);
        await fetchData();
        return true;
      } catch (err) {
        console.error('Failed to update shipping profile:', err);
        setError((err as Error).message);
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [profiles, fetchData]
  );

  const deleteProfile = useCallback(
    async (profileId: string, migrateTo?: string) => {
      setIsSaving(true);
      setError(null);
      try {
        await shippingApi.deleteProfile(profileId, migrateTo);
        await fetchData();
        return true;
      } catch (err) {
        console.error('Failed to delete shipping profile:', err);
        setError((err as Error).message);
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [fetchData]
  );

  const setDefaultProfile = useCallback(
    async (profileId: string) => {
      setIsSaving(true);
      setError(null);
      try {
        await shippingApi.setDefaultProfile(profileId);
        await fetchData();
        return true;
      } catch (err) {
        console.error('Failed to set default profile:', err);
        setError((err as Error).message);
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [fetchData]
  );

  // ============== Zone 操作 ==============

  const addZone = useCallback(
    async (profileId: string, zone: ShippingZone) => {
      const profile = profiles.find(p => p.profileId === profileId);
      if (!profile) return false;

      const newZone = { ...zone, id: zone.id || generateId() };
      const locationGroups =
        profile.locationGroups.length > 0
          ? profile.locationGroups.map((lg, idx) =>
              idx === 0 ? { ...lg, zones: [...(lg.zones || []), newZone] } : lg
            )
          : [{ ...createEmptyLocationGroup(), zones: [newZone] }];

      return updateProfile(profileId, { locationGroups });
    },
    [profiles, updateProfile]
  );

  const updateZone = useCallback(
    async (profileId: string, zoneId: string, updates: Partial<ShippingZone>) => {
      const profile = profiles.find(p => p.profileId === profileId);
      if (!profile) return false;

      const locationGroups = profile.locationGroups.map(lg => ({
        ...lg,
        zones: lg.zones?.map(z => (z.id === zoneId ? { ...z, ...updates } : z)),
      }));

      return updateProfile(profileId, { locationGroups });
    },
    [profiles, updateProfile]
  );

  const deleteZone = useCallback(
    async (profileId: string, zoneId: string) => {
      const profile = profiles.find(p => p.profileId === profileId);
      if (!profile) return false;

      const locationGroups = profile.locationGroups.map(lg => ({
        ...lg,
        zones: lg.zones?.filter(z => z.id !== zoneId),
      }));

      return updateProfile(profileId, { locationGroups });
    },
    [profiles, updateProfile]
  );

  // ============== Rate 操作 ==============

  const mapZones = (
    zones: ShippingZone[] | undefined,
    zoneId: string,
    fn: (z: ShippingZone) => ShippingZone
  ) => zones?.map(z => (z.id === zoneId ? fn(z) : z)) || [];

  const addRate = useCallback(
    async (profileId: string, zoneId: string, rate: ShippingRate) => {
      const profile = profiles.find(p => p.profileId === profileId);
      if (!profile) return false;

      const addRateToZone = (z: ShippingZone) => ({
        ...z,
        rates: [...z.rates, { ...rate, id: rate.id || generateId() }],
      });

      const locationGroups = profile.locationGroups.map(lg => ({
        ...lg,
        zones: mapZones(lg.zones, zoneId, addRateToZone),
      }));

      return updateProfile(profileId, { locationGroups });
    },
    [profiles, updateProfile]
  );

  const updateRate = useCallback(
    async (profileId: string, zoneId: string, rateId: string, updates: Partial<ShippingRate>) => {
      const profile = profiles.find(p => p.profileId === profileId);
      if (!profile) return false;

      const updateRateInZone = (z: ShippingZone) => ({
        ...z,
        rates: z.rates.map(r => (r.id === rateId ? { ...r, ...updates } : r)),
      });

      const locationGroups = profile.locationGroups.map(lg => ({
        ...lg,
        zones: mapZones(lg.zones, zoneId, updateRateInZone),
      }));

      return updateProfile(profileId, { locationGroups });
    },
    [profiles, updateProfile]
  );

  const deleteRate = useCallback(
    async (profileId: string, zoneId: string, rateId: string) => {
      const profile = profiles.find(p => p.profileId === profileId);
      if (!profile) return false;

      const deleteRateFromZone = (z: ShippingZone) => ({
        ...z,
        rates: z.rates.filter(r => r.id !== rateId),
      });

      const locationGroups = profile.locationGroups.map(lg => ({
        ...lg,
        zones: mapZones(lg.zones, zoneId, deleteRateFromZone),
      }));

      return updateProfile(profileId, { locationGroups });
    },
    [profiles, updateProfile]
  );

  // ============== Location 操作 ==============

  const addLocation = useCallback(
    async (location: ShippingLocation) => {
      setIsSaving(true);
      setError(null);
      try {
        await shippingApi.createLocation(location);
        await fetchData();
        return true;
      } catch (err) {
        console.error('Failed to create shipping location:', err);
        setError((err as Error).message);
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [fetchData]
  );

  const updateLocation = useCallback(
    async (locationId: string, updates: Partial<ShippingLocation>) => {
      setIsSaving(true);
      setError(null);
      try {
        const existing = locations.find(l => l.id === locationId);
        if (!existing) return false;

        await shippingApi.updateLocation(locationId, { ...existing, ...updates });
        await fetchData();
        return true;
      } catch (err) {
        console.error('Failed to update shipping location:', err);
        setError((err as Error).message);
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [locations, fetchData]
  );

  const deleteLocation = useCallback(
    async (locationId: string) => {
      setIsSaving(true);
      setError(null);
      try {
        await shippingApi.deleteLocation(locationId);
        await fetchData();
        return true;
      } catch (err) {
        console.error('Failed to delete shipping location:', err);
        setError((err as Error).message);
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [fetchData]
  );

  // ============== Stale 操作 ==============

  const refreshStaleSnapshots = useCallback(async () => {
    setIsSaving(true);
    setError(null);
    try {
      const result = await shippingApi.refreshStaleSnapshots();
      await fetchData();
      return result;
    } catch (err) {
      console.error('Failed to refresh stale snapshots:', err);
      setError((err as Error).message);
      return { refreshed: 0, errors: 0 };
    } finally {
      setIsSaving(false);
    }
  }, [fetchData]);

  // ============== 辅助 ==============

  const defaultProfile = useMemo(() => {
    return profiles.find(p => p.isDefault) || profiles[0] || null;
  }, [profiles]);

  const defaultLocation = useMemo(() => {
    return locations.find(l => l.isDefault) || locations[0] || null;
  }, [locations]);

  const getProfileById = useCallback(
    (profileId: string) => profiles.find(p => p.profileId === profileId) || null,
    [profiles]
  );

  const getLocationById = useCallback(
    (locationId: string) => locations.find(l => l.id === locationId) || null,
    [locations]
  );

  const migrateToProfiles = useCallback(async (_defaultName?: string) => false, []);

  return {
    profiles,
    locations,
    isLoading,
    isSaving,
    error,
    isUsingProfiles,
    hasMultipleLocations,
    defaultProfile,
    defaultLocation,
    staleCount,

    addProfile,
    updateProfile,
    deleteProfile,
    setDefaultProfile,

    addZone,
    updateZone,
    deleteZone,

    addRate,
    updateRate,
    deleteRate,

    addLocation,
    updateLocation,
    deleteLocation,

    refreshStaleSnapshots,
    migrateToProfiles,

    getProfileById,
    getLocationById,
    refetch: fetchData,

    createEmptyProfile,
    createEmptyZone,
    createEmptyRate,
  };
}

export default useShippingProfiles;
