/**
 * 全局 Profile 缓存服务
 *
 * 设计思路：
 * 1. 后端 search 服务（/info/api/profile/raw）自带服务端缓存，响应很快
 * 2. 前端缓存主要解决：同一会话内避免重复 HTTP 请求 + 页面间共享
 * 3. 缓存策略采用 stale-while-revalidate 思想：
 *    - 缓存 5 分钟内：直接返回缓存，不发请求（短时间内 profile 不太会变）
 *    - 缓存 5~30 分钟：先返回缓存（保证 UI 即时渲染），后台静默刷新
 *    - 缓存超过 30 分钟：视为过期，重新请求
 *    - 失败缓存（null）：1 分钟后允许重试，避免临时错误永久缓存
 *
 * @example
 * ```typescript
 * import { fetchProfileWithCache, getProfileDisplayInfo } from '../services/profileCache';
 *
 * // 获取完整 profile
 * const profile = await fetchProfileWithCache(peerID);
 *
 * // 获取展示用的名称和头像
 * const { name, avatar } = await getProfileDisplayInfo(peerID);
 * ```
 */

import { getProfile } from './api/profile';
import { getImageUrl } from './api/config';
import type { UserProfile } from '../types/user';

// ============ 缓存时间配置 ============

/** 缓存新鲜期：5 分钟内直接返回，不发请求 */
const FRESH_MS = 5 * 60 * 1000;

/** 缓存陈旧期：5~30 分钟内先返回旧数据，后台刷新 */
const STALE_MS = 30 * 60 * 1000;

/** 失败缓存重试间隔：1 分钟后允许重试 */
const FAIL_RETRY_MS = 60 * 1000;

// ============ 缓存数据结构 ============

interface CacheEntry {
  profile: UserProfile | null;
  timestamp: number;
  /** 是否为失败缓存（getProfile 返回 null 或出错） */
  isFailed: boolean;
}

/** 全局 profile 缓存（模块级单例） */
const cache = new Map<string, CacheEntry>();

/** 正在进行中的请求（防止并发重复请求同一个 peerID） */
const pendingRequests = new Map<string, Promise<UserProfile | null>>();

// ============ 内部工具函数 ============

/**
 * 判断缓存条目状态
 */
function getCacheStatus(entry: CacheEntry | undefined): 'fresh' | 'stale' | 'expired' | 'miss' {
  if (!entry) return 'miss';

  const age = Date.now() - entry.timestamp;

  // 失败缓存：超过重试间隔则视为过期
  if (entry.isFailed) {
    return age > FAIL_RETRY_MS ? 'expired' : 'fresh';
  }

  // 成功缓存：分三档
  if (age < FRESH_MS) return 'fresh';
  if (age < STALE_MS) return 'stale';
  return 'expired';
}

/**
 * 发起实际请求（带去重：同一 peerID 的并发请求只执行一次）
 */
async function doFetch(peerID: string): Promise<UserProfile | null> {
  // 如果已有进行中的请求，复用
  const pending = pendingRequests.get(peerID);
  if (pending) return pending;

  const request = (async () => {
    try {
      const profile = await getProfile(peerID);
      cache.set(peerID, {
        profile,
        timestamp: Date.now(),
        isFailed: !profile,
      });
      return profile;
    } catch {
      cache.set(peerID, {
        profile: null,
        timestamp: Date.now(),
        isFailed: true,
      });
      return null;
    } finally {
      pendingRequests.delete(peerID);
    }
  })();

  pendingRequests.set(peerID, request);
  return request;
}

// ============ 公共 API ============

/**
 * 获取 profile，带缓存（stale-while-revalidate 策略）
 *
 * - fresh（5分钟内）：直接返回缓存
 * - stale（5~30分钟）：返回缓存 + 后台静默刷新
 * - expired（30分钟后）或 miss：发起请求
 * - 失败缓存：1分钟后允许重试
 */
export async function fetchProfileWithCache(peerID: string): Promise<UserProfile | null> {
  if (!peerID) return null;

  const entry = cache.get(peerID);
  const status = getCacheStatus(entry);

  switch (status) {
    case 'fresh':
      // 缓存新鲜，直接返回
      return entry!.profile;

    case 'stale':
      // 缓存陈旧：先返回旧数据，后台静默刷新（不阻塞 UI）
      doFetch(peerID); // fire-and-forget
      return entry!.profile;

    case 'expired':
    case 'miss':
    default:
      // 缓存过期或不存在：发起请求
      return doFetch(peerID);
  }
}

/**
 * Profile 展示信息
 */
export interface ProfileDisplayInfo {
  name: string;
  avatar: string;
}

/**
 * 获取用于 UI 展示的 profile 信息（名称 + 头像 URL）
 * 内部使用 fetchProfileWithCache，自动处理头像 hash → URL 转换
 */
export async function getProfileDisplayInfo(peerID: string): Promise<ProfileDisplayInfo | null> {
  const profile = await fetchProfileWithCache(peerID);
  if (!profile) return null;

  const avatarHash = profile.avatarHashes?.medium || profile.avatarHashes?.small || '';
  const avatarUrl = avatarHash ? getImageUrl(avatarHash, peerID) || '' : '';
  return {
    name: profile.name || profile.handle || '',
    avatar: avatarUrl,
  };
}

/**
 * 批量获取 profile 展示信息
 * 并行获取多个 peerID 的 profile，返回 Map
 */
export async function batchGetProfileDisplayInfo(
  peerIDs: string[]
): Promise<Map<string, ProfileDisplayInfo>> {
  const result = new Map<string, ProfileDisplayInfo>();
  if (peerIDs.length === 0) return result;

  const uniqueIDs = [...new Set(peerIDs.filter(Boolean))];
  const infos = await Promise.all(uniqueIDs.map(getProfileDisplayInfo));

  for (let i = 0; i < uniqueIDs.length; i++) {
    const info = infos[i];
    if (info) {
      result.set(uniqueIDs[i], info);
    }
  }

  return result;
}

/**
 * 清除 profile 缓存
 * 用于登出、切换账号等场景
 */
export function clearProfileCache(): void {
  cache.clear();
  pendingRequests.clear();
}

/**
 * 使指定 peerID 的缓存失效（下次获取将重新请求）
 * 用于已知 profile 已更新的场景（如编辑自己的 profile 后）
 */
export function invalidateProfileCache(peerID: string): void {
  cache.delete(peerID);
}
