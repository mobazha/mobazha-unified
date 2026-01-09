/**
 * useVerifiedModerators Hook
 * 用于获取和检查认证仲裁员的 React Hook
 */

import { useState, useEffect, useCallback } from 'react';
import {
  fetchVerifiedModerators,
  hasVerifiedModeratorSync,
  isVerifiedModeratorsLoaded,
} from '../services/verifiedModerators';

export interface UseVerifiedModeratorsReturn {
  /** 已认证的仲裁员 peerID 集合 */
  verifiedModerators: Set<string>;
  /** 是否正在加载 */
  isLoading: boolean;
  /** 加载是否完成 */
  isLoaded: boolean;
  /** 检查商品是否有认证仲裁员 */
  hasVerifiedMod: (moderatorPeerIDs?: string[]) => boolean;
  /** 刷新数据 */
  refresh: () => Promise<void>;
}

/**
 * Hook 用于获取和检查认证仲裁员
 */
export function useVerifiedModerators(): UseVerifiedModeratorsReturn {
  const [verifiedModerators, setVerifiedModerators] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(!isVerifiedModeratorsLoaded());
  const [isLoaded, setIsLoaded] = useState(isVerifiedModeratorsLoaded());

  const loadVerifiedModerators = useCallback(async () => {
    setIsLoading(true);
    try {
      const mods = await fetchVerifiedModerators();
      setVerifiedModerators(mods);
      setIsLoaded(true);
    } catch (error) {
      console.error('Failed to load verified moderators:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 首次加载
  useEffect(() => {
    loadVerifiedModerators();
  }, [loadVerifiedModerators]);

  // 检查是否有认证仲裁员
  const hasVerifiedMod = useCallback(
    (moderatorPeerIDs?: string[]): boolean => {
      if (!moderatorPeerIDs || moderatorPeerIDs.length === 0) {
        return false;
      }
      // 优先使用缓存的同步检查
      if (isVerifiedModeratorsLoaded()) {
        return hasVerifiedModeratorSync(moderatorPeerIDs);
      }
      // 使用本地状态
      return moderatorPeerIDs.some(peerID => verifiedModerators.has(peerID));
    },
    [verifiedModerators]
  );

  return {
    verifiedModerators,
    isLoading,
    isLoaded,
    hasVerifiedMod,
    refresh: loadVerifiedModerators,
  };
}

export default useVerifiedModerators;
