/**
 * 用户资料相关 Hooks
 */

import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { profileApi } from '../services/api';
import { queryKeys } from './queryKeys';
import { formatQueryError } from './queryUtils';

/**
 * 获取用户/店铺资料 (React Query 版本)
 *
 * 相比手工 fetch 版本，自动获得：
 * - 多组件共享同一 peerID 时请求去重
 * - stale-while-revalidate（页面切换时立即显示缓存）
 * - 自动重试（适配弱网环境）
 * - 后台刷新（refetchOnMount）
 */
export function useProfile(peerID: string | null) {
  const {
    data: profile = null,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.profiles.detail(peerID!),
    queryFn: () => profileApi.getProfile(peerID!),
    enabled: !!peerID,
    staleTime: 2 * 60 * 1000,
  });

  return {
    profile,
    isLoading,
    error: formatQueryError(error),
    refetch,
  };
}

/**
 * 检查用户是否在线
 */
export function useUserOnline(peerID: string | null) {
  const [isOnline, setIsOnline] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  const checkOnline = useCallback(async () => {
    if (!peerID) {
      setIsOnline(false);
      return;
    }

    setIsChecking(true);

    try {
      const profile = await profileApi.getProfile(peerID);
      setIsOnline(!!profile);
    } catch {
      setIsOnline(false);
    } finally {
      setIsChecking(false);
    }
  }, [peerID]);

  useEffect(() => {
    checkOnline();
  }, [checkOnline]);

  return { isOnline, isChecking, checkOnline };
}

/**
 * 头像 URL 工具
 */
export function useAvatarUrl(
  peerID: string | null,
  size: 'tiny' | 'small' | 'medium' | 'large' = 'medium'
) {
  if (!peerID) return null;
  return profileApi.getAvatarUrl(peerID, size);
}

/**
 * 头图 URL 工具
 */
export function useHeaderUrl(
  peerID: string | null,
  size: 'tiny' | 'small' | 'medium' | 'large' = 'large'
) {
  if (!peerID) return null;
  return profileApi.getHeaderUrl(peerID, size);
}
