/**
 * 社交功能 Hook
 *
 * Follow/Unfollow、粉丝/关注列表管理
 */

import { useState, useCallback } from 'react';
import { socialApi, profileApi } from '../services/api';

interface SocialState {
  followers: string[];
  following: string[];
  isLoading: boolean;
  error: string | null;
}

export function useSocial(peerID?: string) {
  const [state, setState] = useState<SocialState>({
    followers: [],
    following: [],
    isLoading: false,
    error: null,
  });

  /**
   * 获取粉丝列表
   */
  const fetchFollowers = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const followers = await socialApi.getFollowers(peerID);
      setState(prev => ({ ...prev, followers, isLoading: false }));
      return followers;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch followers';
      setState(prev => ({ ...prev, error: errorMessage, isLoading: false }));
      return [];
    }
  }, [peerID]);

  /**
   * 获取关注列表
   */
  const fetchFollowing = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const following = await socialApi.getFollowing(peerID);
      setState(prev => ({ ...prev, following, isLoading: false }));
      return following;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch following';
      setState(prev => ({ ...prev, error: errorMessage, isLoading: false }));
      return [];
    }
  }, [peerID]);

  /**
   * 关注用户
   */
  const follow = useCallback(async (targetPeerID: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const result = await socialApi.followUser(targetPeerID);
      if (result.success) {
        setState(prev => ({
          ...prev,
          following: [...prev.following, targetPeerID],
          isLoading: false,
        }));
      } else {
        throw new Error(result.error || 'Failed to follow');
      }
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to follow';
      setState(prev => ({ ...prev, error: errorMessage, isLoading: false }));
      return { success: false, error: errorMessage };
    }
  }, []);

  /**
   * 取消关注
   */
  const unfollow = useCallback(async (targetPeerID: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const result = await socialApi.unfollowUser(targetPeerID);
      if (result.success) {
        setState(prev => ({
          ...prev,
          following: prev.following.filter(id => id !== targetPeerID),
          isLoading: false,
        }));
      } else {
        throw new Error(result.error || 'Failed to unfollow');
      }
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to unfollow';
      setState(prev => ({ ...prev, error: errorMessage, isLoading: false }));
      return { success: false, error: errorMessage };
    }
  }, []);

  /**
   * 检查是否已关注
   */
  const isFollowing = useCallback(
    (targetPeerID: string) => {
      return state.following.includes(targetPeerID);
    },
    [state.following]
  );

  /**
   * 获取用户资料列表（带基本信息）
   */
  const fetchProfilesForPeerIDs = useCallback(async (peerIDs: string[]) => {
    if (peerIDs.length === 0) return [];
    try {
      return await socialApi.fetchProfiles(peerIDs);
    } catch {
      // 回退到逐个获取
      const profiles = await Promise.all(
        peerIDs.map(async id => {
          const profile = await profileApi.getProfile(id);
          return profile
            ? {
                peerID: id,
                name: profile.name || `User ${id.slice(-6)}`,
                avatarHashes: profile.avatarHashes,
                shortDescription: profile.shortDescription,
              }
            : {
                peerID: id,
                name: `User ${id.slice(-6)}`,
              };
        })
      );
      return profiles;
    }
  }, []);

  return {
    ...state,
    fetchFollowers,
    fetchFollowing,
    follow,
    unfollow,
    isFollowing,
    fetchProfilesForPeerIDs,
  };
}

export default useSocial;

