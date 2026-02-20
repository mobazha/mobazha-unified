/**
 * 社交 API 服务
 *
 * Follow/Unfollow、粉丝/关注列表
 */

import { del, get, post, put, safeRequest } from './client';
import { getGatewayUrl, getAuthHeaders, getHeadersWithContext } from './config';
import { withMockFallback } from './mode';
import { mockUsers } from '../mock/data';
import { NODE_API } from '../../config/apiPaths';

/**
 * 关注用户
 */
export async function followUser(
  peerID: string,
  username?: string,
  password?: string
): Promise<{ success: boolean; error?: string }> {
  const url = `${getGatewayUrl()}${NODE_API.FOLLOW(peerID)}`;
  return post(url, {}, getAuthHeaders(username, password));
}

/**
 * 取消关注用户
 */
export async function unfollowUser(
  peerID: string,
  username?: string,
  password?: string
): Promise<{ success: boolean; error?: string }> {
  const url = `${getGatewayUrl()}${NODE_API.FOLLOWING_PEER(peerID)}`;
  return del(url, getAuthHeaders(username, password));
}

/**
 * 获取粉丝列表
 */
export async function getFollowers(
  peerID?: string,
  username?: string,
  password?: string
): Promise<string[]> {
  const realFn = async () => {
    const timestamp = Date.now();
    const url = peerID
      ? `${getGatewayUrl()}${NODE_API.FOLLOWERS_PEER(peerID)}?usecache=true&${timestamp}`
      : `${getGatewayUrl()}${NODE_API.FOLLOWERS}`;
    return safeRequest<string[]>(url, { headers: getHeadersWithContext(username, password) }, []);
  };

  const mockFn = async () => {
    // Mock: 返回一些模拟的 peerID
    return mockUsers.map(u => u.peerID);
  };

  return withMockFallback(realFn, mockFn, `/followers/${peerID || 'self'}`);
}

/**
 * 获取关注列表
 */
export async function getFollowing(
  peerID?: string,
  username?: string,
  password?: string
): Promise<string[]> {
  const realFn = async () => {
    const timestamp = Date.now();
    const url = peerID
      ? `${getGatewayUrl()}${NODE_API.FOLLOWING_PEER(peerID)}?usecache=true&${timestamp}`
      : `${getGatewayUrl()}${NODE_API.FOLLOWING}`;
    return safeRequest<string[]>(url, { headers: getHeadersWithContext(username, password) }, []);
  };

  const mockFn = async () => {
    // Mock: 返回一些模拟的 peerID
    return mockUsers.slice(0, 2).map(u => u.peerID);
  };

  return withMockFallback(realFn, mockFn, `/following/${peerID || 'self'}`);
}

/**
 * 检查用户是否关注我
 */
export async function isFollowingMe(
  peerID: string,
  username?: string,
  password?: string
): Promise<boolean> {
  const realFn = async () => {
    const url = `${getGatewayUrl()}${NODE_API.FOLLOWERS_CHECK(peerID)}`;
    const result = await get<{ followsMe: boolean }>(url, getAuthHeaders(username, password));
    return result.followsMe;
  };

  const mockFn = async () => {
    // Mock: 随机返回
    return Math.random() > 0.5;
  };

  return withMockFallback(realFn, mockFn, `/followers/${peerID}/check`);
}

/**
 * 检查是否已关注用户
 */
export async function isFollowing(
  peerID: string,
  username?: string,
  password?: string
): Promise<boolean> {
  const following = await getFollowing(undefined, username, password);
  return following.includes(peerID);
}

/**
 * 批量获取用户资料
 */
export async function fetchProfiles(
  peerIDs: string[],
  username?: string,
  password?: string
): Promise<
  Array<{
    peerID: string;
    name: string;
    avatarHashes?: { medium?: string };
    shortDescription?: string;
  }>
> {
  const realFn = async () => {
    const url = `${getGatewayUrl()}${NODE_API.PROFILES_BATCH}`;
    return post<
      Array<{
        peerID: string;
        name: string;
        avatarHashes?: { medium?: string };
        shortDescription?: string;
      }>
    >(url, peerIDs, getAuthHeaders(username, password));
  };

  const mockFn = async () => {
    // Mock: 返回模拟的用户资料
    return peerIDs.map(peerID => {
      const user = mockUsers.find(u => u.peerID === peerID);
      return (
        user || {
          peerID,
          name: `User ${peerID.slice(-6)}`,
          shortDescription: 'Mock user profile',
        }
      );
    });
  };

  return withMockFallback(realFn, mockFn, '/profiles/batch');
}

// ============ Block 功能 ============

// 本地缓存屏蔽列表
let blockedNodesCache: string[] | null = null;

/**
 * 获取当前用户的屏蔽列表
 */
export async function getBlockedNodes(username?: string, password?: string): Promise<string[]> {
  const realFn = async () => {
    const url = `${getGatewayUrl()}${NODE_API.PREFERENCES}`;
    const result = await get<{ blockedNodes?: string[] }>(url, getAuthHeaders(username, password));
    blockedNodesCache = result.blockedNodes || [];
    return blockedNodesCache;
  };

  const mockFn = async () => {
    // Mock: 返回空列表
    return blockedNodesCache || [];
  };

  return withMockFallback(realFn, mockFn, '/preferences (blockedNodes)');
}

/**
 * 屏蔽用户
 */
export async function blockUser(
  peerID: string,
  username?: string,
  password?: string
): Promise<{ success: boolean; error?: string }> {
  const realFn = async () => {
    // 先获取当前屏蔽列表
    const currentBlocked = blockedNodesCache || (await getBlockedNodes(username, password));

    // 如果已经屏蔽，直接返回
    if (currentBlocked.includes(peerID)) {
      return { success: true };
    }

    // 添加到屏蔽列表
    const newBlockedNodes = [...currentBlocked, peerID];

    const url = `${getGatewayUrl()}${NODE_API.PREFERENCES}`;
    await put(url, { blockedNodes: newBlockedNodes }, getAuthHeaders(username, password));

    // 更新本地缓存
    blockedNodesCache = newBlockedNodes;

    return { success: true };
  };

  const mockFn = async () => {
    // Mock: 添加到本地缓存
    if (!blockedNodesCache) blockedNodesCache = [];
    if (!blockedNodesCache.includes(peerID)) {
      blockedNodesCache.push(peerID);
    }
    return { success: true };
  };

  return withMockFallback(realFn, mockFn, `/preferences (block ${peerID})`);
}

/**
 * 取消屏蔽用户
 */
export async function unblockUser(
  peerID: string,
  username?: string,
  password?: string
): Promise<{ success: boolean; error?: string }> {
  const realFn = async () => {
    // 先获取当前屏蔽列表
    const currentBlocked = blockedNodesCache || (await getBlockedNodes(username, password));

    // 如果没有屏蔽，直接返回
    if (!currentBlocked.includes(peerID)) {
      return { success: true };
    }

    // 从屏蔽列表移除
    const newBlockedNodes = currentBlocked.filter(id => id !== peerID);

    const url = `${getGatewayUrl()}${NODE_API.PREFERENCES}`;
    await put(url, { blockedNodes: newBlockedNodes }, getAuthHeaders(username, password));

    // 更新本地缓存
    blockedNodesCache = newBlockedNodes;

    return { success: true };
  };

  const mockFn = async () => {
    // Mock: 从本地缓存移除
    if (blockedNodesCache) {
      blockedNodesCache = blockedNodesCache.filter(id => id !== peerID);
    }
    return { success: true };
  };

  return withMockFallback(realFn, mockFn, `/preferences (unblock ${peerID})`);
}

/**
 * 检查用户是否被屏蔽
 */
export async function isBlocked(
  peerID: string,
  username?: string,
  password?: string
): Promise<boolean> {
  // 优先使用缓存
  if (blockedNodesCache !== null) {
    return blockedNodesCache.includes(peerID);
  }

  // 没有缓存则获取
  const blockedNodes = await getBlockedNodes(username, password);
  return blockedNodes.includes(peerID);
}

/**
 * 同步检查用户是否被屏蔽（使用缓存）
 */
export function isBlockedSync(peerID: string): boolean {
  return blockedNodesCache?.includes(peerID) || false;
}

/**
 * 清除屏蔽列表缓存
 */
export function clearBlockedNodesCache(): void {
  blockedNodesCache = null;
}
