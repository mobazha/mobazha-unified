/**
 * 用户/店铺 API 服务
 */

import type { UserProfile, UserSettings } from '../../types';
import { get, post, ApiError } from './client';
import { getGatewayUrl, getBuyerGatewayUrl, getSearchUrl, getAuthHeaders } from './config';
import { isStandaloneMode } from '../../config/env';
import { NODE_API, SEARCH_API } from '../../config/apiPaths';
import { authGet, authPost, authPut, publicGet, searchPost } from './helpers';

/**
 * 获取用户资料
 *
 * 使用共享的 get() client，确保 401 等错误被统一拦截处理。
 */
export async function getProfile(peerID?: string): Promise<UserProfile | null> {
  try {
    if (!peerID) {
      return await publicGet<UserProfile>(NODE_API.PROFILES);
    }
    if (isStandaloneMode()) {
      return await publicGet<UserProfile>(`${NODE_API.PROFILES}/${peerID}`);
    }
    const timestamp = Date.now();
    const url = `${getSearchUrl()}${SEARCH_API.PROFILE_RAW(peerID)}?${timestamp}`;
    return await get<UserProfile>(url, getAuthHeaders());
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      return null;
    }
    return null;
  }
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
 */
export async function getBuyerProfile(): Promise<UserProfile | null> {
  const url = `${getBuyerGatewayUrl()}${NODE_API.PROFILES}`;
  try {
    return await get<UserProfile>(url, getAuthHeaders());
  } catch {
    return null;
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
  return authPut(NODE_API.PROFILES, { ...profile, vendor: true });
}

/**
 * 设置接受的币种
 */
export async function setAcceptedCoins(
  coins: string[]
): Promise<{ success: boolean; error?: string }> {
  return authPost(NODE_API.PREFERENCES_CURRENCY, { currencies: coins });
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
  return authPut(NODE_API.PREFERENCES, settings);
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
  return `${getGatewayUrl()}${NODE_API.PROFILE_AVATAR(peerID)}?size=${size}`;
}

/**
 * 获取头图 URL
 */
export function getHeaderUrl(
  peerID: string,
  size: 'tiny' | 'small' | 'medium' | 'large' = 'large'
): string {
  return `${getGatewayUrl()}${NODE_API.PROFILE_HEADER(peerID)}?size=${size}`;
}
