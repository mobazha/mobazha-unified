/**
 * useUserGroups Hook
 * 用户组管理 Hook
 */

import { useState, useCallback, useEffect } from 'react';
import type {
  UserGroup,
  UserGroupMember,
  CreateUserGroupRequest,
  UpdateUserGroupRequest,
} from '../types/access';
import {
  getUserGroups,
  createUserGroup,
  updateUserGroup,
  deleteUserGroup,
  getUserGroupMembers,
  addUserGroupMember,
  addUserGroupMembersBatch,
  removeUserGroupMember,
} from '../services/api/access';

export interface UseUserGroupsOptions {
  /** 店铺所有者的 peerID */
  ownerPeerID?: string;
  /** 是否自动加载 */
  autoLoad?: boolean;
}

export interface UseUserGroupsReturn {
  // 状态
  groups: UserGroup[];
  loading: boolean;
  error: string | null;

  // 操作
  loadGroups: (peerID?: string) => Promise<void>;
  createGroup: (data: CreateUserGroupRequest) => Promise<UserGroup | null>;
  updateGroup: (groupId: number, data: UpdateUserGroupRequest) => Promise<UserGroup | null>;
  deleteGroup: (groupId: number) => Promise<boolean>;
  refresh: () => Promise<void>;

  // 成员管理
  loadMembers: (groupId: number) => Promise<UserGroupMember[]>;
  addMember: (groupId: number, peerID: string) => Promise<UserGroupMember | null>;
  addMembersBatch: (
    groupId: number,
    peerIDs: string[]
  ) => Promise<{ added: number; failed: number } | null>;
  removeMember: (groupId: number, memberId: number) => Promise<boolean>;
}

/**
 * 用户组管理 Hook
 *
 * @example
 * ```tsx
 * const { groups, loading, createGroup, deleteGroup } = useUserGroups({
 *   ownerPeerID: 'Qm...',
 *   autoLoad: true,
 * });
 * ```
 */
export function useUserGroups(options: UseUserGroupsOptions = {}): UseUserGroupsReturn {
  const { ownerPeerID, autoLoad = false } = options;

  const [groups, setGroups] = useState<UserGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 加载用户组列表
  const loadGroups = useCallback(
    async (peerID?: string) => {
      const targetPeerID = peerID || ownerPeerID;
      if (!targetPeerID) {
        setError('Missing ownerPeerID');
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const result = await getUserGroups(targetPeerID);
        setGroups(result);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load groups';
        setError(message);
        console.error('[useUserGroups] Load error:', err);
      } finally {
        setLoading(false);
      }
    },
    [ownerPeerID]
  );

  // 创建用户组
  const createGroup = useCallback(
    async (data: CreateUserGroupRequest): Promise<UserGroup | null> => {
      setError(null);

      try {
        const newGroup = await createUserGroup(data);
        setGroups(prev => [...prev, newGroup]);
        return newGroup;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create group';
        setError(message);
        console.error('[useUserGroups] Create error:', err);
        return null;
      }
    },
    []
  );

  // 更新用户组
  const updateGroupFn = useCallback(
    async (groupId: number, data: UpdateUserGroupRequest): Promise<UserGroup | null> => {
      setError(null);

      try {
        const updated = await updateUserGroup(groupId, data);
        setGroups(prev => prev.map(g => (g.id === groupId ? updated : g)));
        return updated;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update group';
        setError(message);
        console.error('[useUserGroups] Update error:', err);
        return null;
      }
    },
    []
  );

  // 删除用户组
  const deleteGroupFn = useCallback(async (groupId: number): Promise<boolean> => {
    setError(null);

    try {
      await deleteUserGroup(groupId);
      setGroups(prev => prev.filter(g => g.id !== groupId));
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete group';
      setError(message);
      console.error('[useUserGroups] Delete error:', err);
      return false;
    }
  }, []);

  // 刷新
  const refresh = useCallback(async () => {
    await loadGroups();
  }, [loadGroups]);

  // 加载成员
  const loadMembers = useCallback(async (groupId: number): Promise<UserGroupMember[]> => {
    try {
      return await getUserGroupMembers(groupId);
    } catch (err) {
      console.error('[useUserGroups] Load members error:', err);
      return [];
    }
  }, []);

  // 添加成员
  const addMember = useCallback(
    async (groupId: number, peerID: string): Promise<UserGroupMember | null> => {
      try {
        return await addUserGroupMember(groupId, peerID);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to add member';
        setError(message);
        console.error('[useUserGroups] Add member error:', err);
        return null;
      }
    },
    []
  );

  // 批量添加成员
  const addMembersBatchFn = useCallback(
    async (
      groupId: number,
      peerIDs: string[]
    ): Promise<{ added: number; failed: number } | null> => {
      try {
        return await addUserGroupMembersBatch(groupId, peerIDs);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to add members';
        setError(message);
        console.error('[useUserGroups] Add members batch error:', err);
        return null;
      }
    },
    []
  );

  // 移除成员
  const removeMember = useCallback(async (groupId: number, memberId: number): Promise<boolean> => {
    try {
      await removeUserGroupMember(groupId, memberId);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to remove member';
      setError(message);
      console.error('[useUserGroups] Remove member error:', err);
      return false;
    }
  }, []);

  // 自动加载
  useEffect(() => {
    if (autoLoad && ownerPeerID) {
      loadGroups();
    }
  }, [autoLoad, ownerPeerID, loadGroups]);

  return {
    groups,
    loading,
    error,
    loadGroups,
    createGroup,
    updateGroup: updateGroupFn,
    deleteGroup: deleteGroupFn,
    refresh,
    loadMembers,
    addMember,
    addMembersBatch: addMembersBatchFn,
    removeMember,
  };
}

export default useUserGroups;
