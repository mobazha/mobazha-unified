/**
 * Verified Moderators Service
 * 认证仲裁员服务 - 获取和管理已认证的仲裁员列表
 */

// Verified moderator 类型
export interface VerifiedModeratorType {
  name: string;
  description?: string;
  badge?: {
    large?: string;
    medium?: string;
    small?: string;
    tiny?: string;
  };
}

// Verified moderator 条目
export interface VerifiedModerator {
  peerID: string;
  type: string | VerifiedModeratorType;
}

// API 响应类型
export interface VerifiedModeratorsResponse {
  data?: {
    name?: string;
    description?: string;
    link?: string;
  };
  types?: VerifiedModeratorType[];
  moderators?: Array<{
    peerID: string;
    type: string;
  }>;
}

// 缓存的 verified moderators
let cachedVerifiedModerators: Set<string> | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Verified Moderators API URL - 通过代理访问
// 实际请求会被代理到: ${apiBase}/info/api/moderator/verified
const VERIFIED_MODERATORS_URL = '/proxy/info/api/moderator/verified';

/**
 * 获取已认证的仲裁员列表
 */
export async function fetchVerifiedModerators(): Promise<Set<string>> {
  // 检查缓存
  if (cachedVerifiedModerators && Date.now() - cacheTimestamp < CACHE_DURATION) {
    return cachedVerifiedModerators;
  }

  try {
    const response = await fetch(VERIFIED_MODERATORS_URL, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch verified moderators: ${response.status}`);
    }

    const data: VerifiedModeratorsResponse = await response.json();

    // 提取所有 moderator peerIDs
    const moderatorPeerIDs = new Set<string>();
    if (data.moderators && Array.isArray(data.moderators)) {
      for (const mod of data.moderators) {
        if (mod.peerID) {
          moderatorPeerIDs.add(mod.peerID);
        }
      }
    }

    // 更新缓存
    cachedVerifiedModerators = moderatorPeerIDs;
    cacheTimestamp = Date.now();

    return moderatorPeerIDs;
  } catch (error) {
    console.error('Failed to fetch verified moderators:', error);
    // 如果有缓存，返回缓存（即使过期）
    if (cachedVerifiedModerators) {
      return cachedVerifiedModerators;
    }
    return new Set();
  }
}

/**
 * 检查给定的 moderator peerIDs 中是否有已认证的
 * @param moderatorPeerIDs 商品的 moderator peerID 列表
 * @returns 是否有已认证的 moderator
 */
export async function hasVerifiedModerator(moderatorPeerIDs?: string[]): Promise<boolean> {
  if (!moderatorPeerIDs || moderatorPeerIDs.length === 0) {
    return false;
  }

  const verifiedModerators = await fetchVerifiedModerators();
  return moderatorPeerIDs.some(peerID => verifiedModerators.has(peerID));
}

/**
 * 同步检查是否有已认证的 moderator（使用缓存）
 * 注意：如果缓存为空，返回 false
 */
export function hasVerifiedModeratorSync(moderatorPeerIDs?: string[]): boolean {
  if (!moderatorPeerIDs || moderatorPeerIDs.length === 0) {
    return false;
  }

  if (!cachedVerifiedModerators) {
    return false;
  }

  return moderatorPeerIDs.some(peerID => cachedVerifiedModerators!.has(peerID));
}

/**
 * 预加载 verified moderators（可在应用启动时调用）
 */
export function preloadVerifiedModerators(): void {
  fetchVerifiedModerators().catch(err => {
    console.warn('Failed to preload verified moderators:', err);
  });
}

// 导出缓存状态检查
export function isVerifiedModeratorsLoaded(): boolean {
  return cachedVerifiedModerators !== null;
}
