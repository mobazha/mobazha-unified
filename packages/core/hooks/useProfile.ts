/**
 * 用户资料相关 Hooks
 */

import { useState, useEffect, useCallback } from 'react';
import type { UserProfile } from '../types';
import { profileApi } from '../services/api';

/**
 * 获取用户/店铺资料
 */
export function useProfile(peerID: string | null) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!peerID) {
      setProfile(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await profileApi.getProfile(peerID);
      setProfile(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取资料失败');
    } finally {
      setIsLoading(false);
    }
  }, [peerID]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { profile, isLoading, error, refetch };
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
      // 通过获取资料来判断是否在线
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
