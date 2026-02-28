/**
 * Shipping API 服务
 *
 * 独立 CRUD 端点（替代 preferences blob）：
 *   - Profile：配送档案管理（含乐观锁 version）
 *   - Location：发货地点管理
 *   - Stale Refs：过时快照检测与刷新
 */

import { NODE_API } from '../../config/apiPaths';
import { authGet, authPost, authPut, authPatch, authDel } from './helpers';
import type { ShippingProfile, ShippingLocation, LocationGroup } from '../../types';

// ========== 后端 API 类型（与 Go models 对齐） ==========

export interface ShippingProfileEntity {
  id: string;
  name: string;
  isDefault: boolean;
  version: number;
  locationGroups: LocationGroup[];
  listingCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ShippingLocationEntity {
  id: string;
  name: string;
  address?: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ListingShippingRef {
  id: string;
  listingSlug: string;
  shippingProfileID: string;
  snapshotVersion: number;
  isStale: boolean;
  listingTitle?: string;
  profileName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ListResponse<T> {
  data: T[];
  meta: { page: number; pageSize: number; total: number };
}

export interface RefreshResult {
  refreshed: number;
  errors: number;
}

// ========== 内部类型转换 ==========

function entityToProfile(e: ShippingProfileEntity): ShippingProfile {
  return {
    profileId: e.id,
    name: e.name,
    isDefault: e.isDefault,
    locationGroups: e.locationGroups || [],
    listingCount: e.listingCount,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
    version: e.version,
  };
}

function profileToCreateBody(p: Partial<ShippingProfile>): Record<string, unknown> {
  return {
    id: p.profileId,
    name: p.name || '',
    isDefault: p.isDefault ?? false,
    locationGroups: p.locationGroups || [],
  };
}

function profileToUpdateBody(p: ShippingProfile): Record<string, unknown> {
  return {
    name: p.name,
    isDefault: p.isDefault,
    locationGroups: p.locationGroups || [],
    version: p.version ?? 0,
  };
}

function entityToLocation(e: ShippingLocationEntity): ShippingLocation {
  return {
    id: e.id,
    name: e.name,
    address: e.address,
    isDefault: e.isDefault,
  };
}

function locationToBody(l: Partial<ShippingLocation>): Record<string, unknown> {
  return {
    id: l.id,
    name: l.name || '',
    address: l.address || '',
    isDefault: l.isDefault ?? false,
  };
}

// ========== Profile API ==========

export async function createProfile(data: Partial<ShippingProfile>): Promise<ShippingProfile> {
  const entity = await authPost<ShippingProfileEntity>(
    NODE_API.SHIPPING_PROFILES,
    profileToCreateBody(data)
  );
  return entityToProfile(entity);
}

export async function listProfiles(): Promise<ShippingProfile[]> {
  const entities = await authGet<ShippingProfileEntity[]>(NODE_API.SHIPPING_PROFILES);
  return (entities || []).map(entityToProfile);
}

export async function getProfile(profileID: string): Promise<ShippingProfile> {
  const entity = await authGet<ShippingProfileEntity>(NODE_API.SHIPPING_PROFILE(profileID));
  return entityToProfile(entity);
}

export async function updateProfile(
  profileID: string,
  data: ShippingProfile
): Promise<ShippingProfile> {
  const entity = await authPut<ShippingProfileEntity>(
    NODE_API.SHIPPING_PROFILE(profileID),
    profileToUpdateBody(data)
  );
  return entityToProfile(entity);
}

export async function patchProfile(
  profileID: string,
  patch: { name?: string; isDefault?: boolean; locationGroups?: LocationGroup[]; version: number }
): Promise<ShippingProfile> {
  const body: Record<string, unknown> = { version: patch.version };
  if (patch.name !== undefined) body.name = patch.name;
  if (patch.isDefault !== undefined) body.isDefault = patch.isDefault;
  if (patch.locationGroups !== undefined) {
    body.locationGroups = JSON.stringify(patch.locationGroups);
  }
  const entity = await authPatch<ShippingProfileEntity>(NODE_API.SHIPPING_PROFILE(profileID), body);
  return entityToProfile(entity);
}

export async function deleteProfile(profileID: string, migrateTo?: string): Promise<void> {
  const path = migrateTo
    ? `${NODE_API.SHIPPING_PROFILE(profileID)}?migrateTo=${encodeURIComponent(migrateTo)}`
    : NODE_API.SHIPPING_PROFILE(profileID);
  await authDel(path);
}

export async function setDefaultProfile(profileID: string): Promise<void> {
  await authPost(NODE_API.SHIPPING_PROFILE_SET_DEFAULT(profileID));
}

// ========== Location API ==========

export async function createLocation(data: Partial<ShippingLocation>): Promise<ShippingLocation> {
  const entity = await authPost<ShippingLocationEntity>(
    NODE_API.SHIPPING_LOCATIONS,
    locationToBody(data)
  );
  return entityToLocation(entity);
}

export async function listLocations(): Promise<ShippingLocation[]> {
  const entities = await authGet<ShippingLocationEntity[]>(NODE_API.SHIPPING_LOCATIONS);
  return (entities || []).map(entityToLocation);
}

export async function getLocation(locationID: string): Promise<ShippingLocation> {
  const entity = await authGet<ShippingLocationEntity>(NODE_API.SHIPPING_LOCATION(locationID));
  return entityToLocation(entity);
}

export async function updateLocation(
  locationID: string,
  data: ShippingLocation
): Promise<ShippingLocation> {
  const entity = await authPut<ShippingLocationEntity>(
    NODE_API.SHIPPING_LOCATION(locationID),
    locationToBody(data)
  );
  return entityToLocation(entity);
}

export async function deleteLocation(locationID: string): Promise<void> {
  await authDel(NODE_API.SHIPPING_LOCATION(locationID));
}

// ========== Stale Refs API ==========

export async function listProfileListings(
  profileID: string,
  page = 1,
  pageSize = 20
): Promise<ListResponse<ListingShippingRef>> {
  return authGet<ListResponse<ListingShippingRef>>(
    `${NODE_API.SHIPPING_PROFILE_LISTINGS(profileID)}?page=${page}&pageSize=${pageSize}`
  );
}

export async function listStaleRefs(
  page = 1,
  pageSize = 20
): Promise<ListResponse<ListingShippingRef>> {
  return authGet<ListResponse<ListingShippingRef>>(
    `${NODE_API.SHIPPING_STALE_LISTINGS}?page=${page}&pageSize=${pageSize}`
  );
}

export async function refreshStaleSnapshots(): Promise<RefreshResult> {
  return authPost<RefreshResult>(NODE_API.SHIPPING_REFRESH_SNAPSHOTS);
}

// ========== 聚合导出 ==========

export const shippingApi = {
  createProfile,
  listProfiles,
  getProfile,
  updateProfile,
  patchProfile,
  deleteProfile,
  setDefaultProfile,

  createLocation,
  listLocations,
  getLocation,
  updateLocation,
  deleteLocation,

  listProfileListings,
  listStaleRefs,
  refreshStaleSnapshots,
};
