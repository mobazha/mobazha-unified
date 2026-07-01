/**
 * 社交 API 服务
 *
 * Follow/Unfollow、粉丝/关注列表
 */

import { withMockFallback } from './mode';
import { mockUsers } from '../mock/data';
import { NODE_API } from '../../config/apiPaths';
import { authGet, authPut, authDel, authSafeGet, publicSafeGet, publicPost } from './helpers';

/**
 * 关注用户
 */
export async function followUser(peerID: string): Promise<{ success: boolean; error?: string }> {
  return authPut(NODE_API.FOLLOW(peerID), {});
}

/**
 * 取消关注用户
 */
export async function unfollowUser(peerID: string): Promise<{ success: boolean; error?: string }> {
  return authDel(NODE_API.FOLLOWING_PEER(peerID));
}

/**
 * 获取粉丝列表
 */
export async function getFollowers(peerID?: string): Promise<string[]> {
  const realFn = async () => {
    const timestamp = Date.now();
    if (peerID) {
      return publicSafeGet<string[]>(
        `${NODE_API.FOLLOWERS_PEER(peerID)}?usecache=true&${timestamp}`,
        []
      );
    }
    return authSafeGet<string[]>(NODE_API.FOLLOWERS, []);
  };

  const mockFn = async () => {
    return mockUsers.map(u => u.peerID);
  };

  return withMockFallback(realFn, mockFn, `/followers/${peerID || 'self'}`);
}

/**
 * 获取关注列表
 */
export async function getFollowing(peerID?: string): Promise<string[]> {
  const realFn = async () => {
    const timestamp = Date.now();
    if (peerID) {
      return publicSafeGet<string[]>(
        `${NODE_API.FOLLOWING_PEER(peerID)}?usecache=true&${timestamp}`,
        []
      );
    }
    return authSafeGet<string[]>(NODE_API.FOLLOWING, []);
  };

  const mockFn = async () => {
    return mockUsers.slice(0, 2).map(u => u.peerID);
  };

  return withMockFallback(realFn, mockFn, `/following/${peerID || 'self'}`);
}

/**
 * 检查用户是否关注我
 */
export async function isFollowingMe(peerID: string): Promise<boolean> {
  const realFn = async () => {
    const result = await authGet<{ followsMe: boolean }>(NODE_API.FOLLOWERS_CHECK(peerID));
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
export async function isFollowing(peerID: string): Promise<boolean> {
  const following = await getFollowing(undefined);
  return following.includes(peerID);
}

/**
 * 批量获取用户资料
 */
interface FetchProfilesBatchItem {
  peerID: string;
  profile?: {
    peerID?: string;
    name?: string;
    avatarHashes?: { medium?: string };
    shortDescription?: string;
  };
}

export interface SocialProfileSummary {
  peerID: string;
  name: string;
  avatarHashes?: { medium?: string };
  shortDescription?: string;
}

export async function fetchProfiles(peerIDs: string[]): Promise<SocialProfileSummary[]> {
  const realFn = async (): Promise<SocialProfileSummary[]> => {
    const data = await publicPost<FetchProfilesBatchItem[]>(NODE_API.PROFILES_BATCH, peerIDs);
    if (!Array.isArray(data)) return [];
    return data
      .map(item => {
        const peerID = item.profile?.peerID || item.peerID;
        const name = item.profile?.name?.trim() || '';
        if (!peerID || !name) return null;
        return {
          peerID,
          name,
          avatarHashes: item.profile?.avatarHashes,
          shortDescription: item.profile?.shortDescription,
        };
      })
      .filter((p): p is NonNullable<typeof p> => p !== null);
  };

  const mockFn = async (): Promise<SocialProfileSummary[]> => {
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
export async function getBlockedNodes(): Promise<string[]> {
  const realFn = async () => {
    const result = await authGet<{ blockedNodes?: string[] }>(NODE_API.PREFERENCES);
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
export async function blockUser(peerID: string): Promise<{ success: boolean; error?: string }> {
  const realFn = async () => {
    // 先获取当前屏蔽列表
    const currentBlocked = blockedNodesCache || (await getBlockedNodes());

    // 如果已经屏蔽，直接返回
    if (currentBlocked.includes(peerID)) {
      return { success: true };
    }

    // 添加到屏蔽列表
    const newBlockedNodes = [...currentBlocked, peerID];

    await authPut(NODE_API.PREFERENCES, { blockedNodes: newBlockedNodes });

    // 更新本地缓存
    blockedNodesCache = newBlockedNodes;

    return { success: true };
  };

  const mockFn = async () => {
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
export async function unblockUser(peerID: string): Promise<{ success: boolean; error?: string }> {
  const realFn = async () => {
    const currentBlocked = blockedNodesCache || (await getBlockedNodes());

    if (!currentBlocked.includes(peerID)) {
      return { success: true };
    }

    const newBlockedNodes = currentBlocked.filter(id => id !== peerID);

    await authPut(NODE_API.PREFERENCES, { blockedNodes: newBlockedNodes });

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
export async function isBlocked(peerID: string): Promise<boolean> {
  // 优先使用缓存
  if (blockedNodesCache !== null) {
    return blockedNodesCache.includes(peerID);
  }

  // 没有缓存则获取
  const blockedNodes = await getBlockedNodes();
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
