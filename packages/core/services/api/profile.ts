/**
 * 用户/店铺 API 服务
 */

import type { UserProfile, UserSettings } from '../../types';
import { get, post, put, ApiError, isStoreUnavailableError } from './client';
import { getGatewayUrl, getBuyerGatewayUrl, getSearchUrl, getAuthHeaders } from './config';
import { isStandaloneMode } from '../../config/env';
import { NODE_API, SEARCH_API } from '../../config/apiPaths';
import { authGet, authPost, authPut, publicGet, publicPost, searchPost } from './helpers';
import { isStoreKnownOffline, markStoreOffline, markStoreOnline } from './storeStatusCache';

/**
 * 获取用户资料
 *
 * Unified strategy: Node API first, Search service fallback.
 *
 * For SaaS tenants the Node API responds via the local bridge (fast).
 * For online standalone stores it proxies via LibP2P (real-time data).
 * On 503 (store offline), falls back to the search service index and
 * caches the offline status so parallel requests skip the proxy attempt.
 */
export async function getProfile(peerID?: string): Promise<UserProfile | null> {
  try {
    if (!peerID) {
      return await publicGet<UserProfile>(NODE_API.PROFILES);
    }
    if (isStandaloneMode()) {
      return await publicGet<UserProfile>(`${NODE_API.PROFILES}/${peerID}`);
    }

    // SaaS: if store is known offline, go straight to search
    if (isStoreKnownOffline(peerID)) {
      return await fetchProfileFromSearch(peerID);
    }

    // Node API first (works for both SaaS tenants and online standalone stores)
    try {
      const profile = await publicGet<UserProfile>(`${NODE_API.PROFILES}/${peerID}`);
      markStoreOnline(peerID);
      return profile;
    } catch (nodeErr) {
      if (isStoreUnavailableError(nodeErr)) {
        markStoreOffline(peerID);
        return await fetchProfileFromSearch(peerID);
      }
      // Other errors (network, 500): try search as best-effort fallback
      return await fetchProfileFromSearch(peerID);
    }
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      return null;
    }
    return null;
  }
}

async function fetchProfileFromSearch(peerID: string): Promise<UserProfile | null> {
  try {
    const url = `${getSearchUrl()}${SEARCH_API.PROFILE_RAW(peerID)}`;
    return await get<UserProfile>(url, getAuthHeaders());
  } catch {
    return null;
  }
}

interface FetchProfilesBatchItem {
  id?: string;
  peerID: string;
  profile?: UserProfile;
}

export interface PublicProfileSnapshot {
  peerID: string;
  name: string;
  handle?: string;
  avatarHashes?: UserProfile['avatarHashes'];
  shortDescription?: string;
}

function snapshotFromProfile(peerID: string, profile: UserProfile): PublicProfileSnapshot | null {
  const name = profile.name?.trim() || profile.handle?.trim() || '';
  if (!name) return null;
  return {
    peerID,
    name,
    handle: profile.handle,
    avatarHashes: profile.avatarHashes,
    shortDescription: profile.shortDescription,
  };
}

/**
 * 批量获取公开店铺资料（POST /v1/profiles/batch，解析嵌套 profile 信封）。
 */
export async function fetchPublicProfilesBatch(
  peerIDs: string[]
): Promise<PublicProfileSnapshot[]> {
  const unique = [...new Set(peerIDs.filter(Boolean))];
  if (!unique.length) return [];

  const snapshots: PublicProfileSnapshot[] = [];
  const missing: string[] = [];

  try {
    const data = await publicPost<FetchProfilesBatchItem[]>(NODE_API.PROFILES_BATCH, unique);
    if (Array.isArray(data)) {
      const byPeer = new Map<string, UserProfile>();
      for (const item of data) {
        const pid = item.profile?.peerID || item.peerID;
        if (pid && item.profile) {
          byPeer.set(pid, item.profile);
        }
      }
      for (const peerID of unique) {
        const profile = byPeer.get(peerID);
        if (profile) {
          const snap = snapshotFromProfile(peerID, profile);
          if (snap) {
            snapshots.push(snap);
            continue;
          }
        }
        missing.push(peerID);
      }
    } else {
      missing.push(...unique);
    }
  } catch {
    missing.push(...unique);
  }

  if (!missing.length) return snapshots;

  const fallbacks = await Promise.all(
    missing.map(async peerID => {
      const profile = await getProfile(peerID);
      return profile ? snapshotFromProfile(peerID, profile) : null;
    })
  );
  return [...snapshots, ...fallbacks.filter((p): p is PublicProfileSnapshot => p !== null)];
}

/**
 * 获取自己的资料
 */
export async function getMyProfile(): Promise<UserProfile | null> {
  try {
    return await authGet<UserProfile>(NODE_API.PROFILES);
  } catch {
    return null;
  }
}

/**
 * 获取买家自己的资料（独立站模式）
 *
 * 独立站买家通过 Casdoor 登录后，需要从 SaaS 平台获取自己的 profile（含 peerID）。
 * 使用 getBuyerGatewayUrl() 路由到 SaaS → /buyer-api/v1/profile。
 * JWT Bearer token 由 getAuthHeaders() 自动附加。
 *
 * Returns null only when the profile genuinely does not exist (HTTP 404).
 * Throws for all other errors (network, 403, 500, …) so the caller can
 * distinguish "needs onboarding" from "SaaS unreachable".
 */
export async function getBuyerProfile(): Promise<UserProfile | null> {
  const url = `${getBuyerGatewayUrl()}${NODE_API.PROFILES}`;
  try {
    return await get<UserProfile>(url, getAuthHeaders());
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      return null;
    }
    throw err;
  }
}

/**
 * 创建用户资料（首次，POST）
 * 用于新用户 onboarding 流程
 *
 * 注意：后端 POST /v1/profiles 成功时返回 200 {}（空对象），
 * 不包含 success 字段，所以只要请求不抛异常就视为成功。
 */
export async function createProfile(
  profile: Partial<UserProfile>
): Promise<{ success: boolean; error?: string }> {
  try {
    await authPost(NODE_API.PROFILES, profile);
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to create profile',
    };
  }
}

/**
 * 创建买家资料（独立站模式，POST）
 *
 * 独立站买家通过 Casdoor 登录后，profile 存储在 SaaS 平台。
 * 使用 getBuyerGatewayUrl() 路由到 SaaS → /buyer-api/v1/profiles。
 */
export async function createBuyerProfile(
  profile: Partial<UserProfile>
): Promise<{ success: boolean; error?: string }> {
  const url = `${getBuyerGatewayUrl()}${NODE_API.PROFILES}`;
  try {
    await post(url, profile, getAuthHeaders());
    return { success: true };
  } catch (err) {
    // 409 = profile already exists on SaaS (e.g. node auto-init or previous attempt).
    // Fall back to PUT update so buyer onboarding always succeeds.
    if (err instanceof ApiError && err.status === 409) {
      try {
        await put(url, profile, getAuthHeaders());
        return { success: true };
      } catch (putErr) {
        return {
          success: false,
          error: putErr instanceof Error ? putErr.message : 'Failed to update profile',
        };
      }
    }
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to create profile',
    };
  }
}

/**
 * 更新用户资料
 */
export async function setProfile(
  profile: Partial<UserProfile>
): Promise<{ success: boolean; error?: string }> {
  try {
    await authPut(NODE_API.PROFILES, { ...profile, vendor: true });
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Update failed',
    };
  }
}

/**
 * 设置接受的币种
 */
export async function setAcceptedCoins(
  coins: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    await authPost(NODE_API.PREFERENCES_CURRENCY, { currencies: coins });
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Update failed',
    };
  }
}

/**
 * 获取用户设置/偏好
 * 后端 API 路径: /v1/preferences
 */
export async function getSettings(): Promise<UserSettings | null> {
  try {
    return await authGet<UserSettings>(NODE_API.PREFERENCES);
  } catch {
    return null;
  }
}

/**
 * 更新用户设置/偏好
 * 后端 API 路径: /v1/preferences
 */
export async function setSettings(
  settings: Partial<UserSettings>
): Promise<{ success: boolean; error?: string }> {
  try {
    await authPut(NODE_API.PREFERENCES, settings);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Update failed',
    };
  }
}

/**
 * 举报用户
 */
export async function reportProfile(peerID: string, reason: string): Promise<{ success: boolean }> {
  return searchPost(SEARCH_API.REPORTS, { peerID, reason, report_type: 'node' });
}

/**
 * 获取 PeerID
 */
export async function getPeerID(): Promise<string | null> {
  try {
    const response = await authGet<{ peerID: string }>(NODE_API.PEER_ID);
    return response.peerID;
  } catch {
    return null;
  }
}

/**
 * 获取头像 URL
 */
export function getAvatarUrl(
  peerID: string,
  size: 'tiny' | 'small' | 'medium' | 'large' = 'medium'
): string {
  return `${getGatewayUrl()}${NODE_API.PROFILE_AVATAR(peerID, size)}`;
}

/**
 * 获取头图 URL
 */
export function getHeaderUrl(
  peerID: string,
  size: 'tiny' | 'small' | 'medium' | 'large' = 'large'
): string {
  return `${getGatewayUrl()}${NODE_API.PROFILE_HEADER(peerID, size)}`;
}
