/**
 * 用户/店铺 API 服务
 */

import type { UserProfile, UserSettings } from '../../types';
import { get, post, put } from './client';
import { getGatewayUrl, getSearchUrl, getAuthHeaders, getHeadersWithContext } from './config';

/**
 * 获取用户资料
 */
export async function getProfile(peerID?: string): Promise<UserProfile | null> {
  const timestamp = Date.now();
  let url: string;

  if (!peerID) {
    url = `${getGatewayUrl()}/ob/profile`;
  } else {
    url = `${getSearchUrl()}/api/profile/raw?peerId=${peerID}&${timestamp}`;
  }

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (response.status === 404) {
      return null;
    }

    return await response.json();
  } catch {
    return null;
  }
}

/**
 * 获取自己的资料
 */
export async function getMyProfile(
  username?: string,
  password?: string
): Promise<UserProfile | null> {
  const url = `${getGatewayUrl()}/ob/profile`;
  try {
    return await get<UserProfile>(url, getAuthHeaders(username, password));
  } catch {
    return null;
  }
}

/**
 * 更新用户资料
 */
export async function setProfile(
  profile: Partial<UserProfile>,
  username?: string,
  password?: string
): Promise<{ success: boolean; error?: string }> {
  const url = `${getGatewayUrl()}/ob/profile`;
  return put(url, { ...profile, vendor: true }, getAuthHeaders(username, password));
}

/**
 * 设置接受的币种
 */
export async function setAcceptedCoins(
  coins: string[],
  username?: string,
  password?: string
): Promise<{ success: boolean; error?: string }> {
  const url = `${getGatewayUrl()}/ob/bulkupdatecurrency`;
  return post(url, { currencies: coins }, getAuthHeaders(username, password));
}

/**
 * 获取用户设置/偏好
 * 后端 API 路径: /v1/ob/preferences
 */
export async function getSettings(
  username?: string,
  password?: string
): Promise<UserSettings | null> {
  const url = `${getGatewayUrl()}/ob/preferences`;
  try {
    return await get<UserSettings>(url, getAuthHeaders(username, password));
  } catch {
    return null;
  }
}

/**
 * 更新用户设置/偏好
 * 后端 API 路径: /v1/ob/preferences
 */
export async function setSettings(
  settings: Partial<UserSettings>,
  username?: string,
  password?: string
): Promise<{ success: boolean; error?: string }> {
  const url = `${getGatewayUrl()}/ob/preferences`;
  return put(url, settings, getAuthHeaders(username, password));
}

/**
 * 举报用户
 */
export async function reportProfile(peerID: string, reason: string): Promise<{ success: boolean }> {
  const url = `${getSearchUrl()}/api/reports`;
  return post(url, { peerID, reason, report_type: 'node' }, getHeadersWithContext());
}

/**
 * 获取 PeerID
 */
export async function getPeerID(username?: string, password?: string): Promise<string | null> {
  const url = `${getGatewayUrl()}/ob/peerid`;
  try {
    const response = await get<{ peerID: string }>(url, getAuthHeaders(username, password));
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
  return `${getGatewayUrl()}/ob/avatar/${peerID}?size=${size}`;
}

/**
 * 获取头图 URL
 */
export function getHeaderUrl(
  peerID: string,
  size: 'tiny' | 'small' | 'medium' | 'large' = 'large'
): string {
  return `${getGatewayUrl()}/ob/header/${peerID}?size=${size}`;
}
