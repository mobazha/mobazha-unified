/**
 * useProductGroups Hook
 * 产品组管理 Hook
 */

import { useState, useCallback, useEffect } from 'react';
import type {
  ProductGroup,
  ProductGroupItem,
  CreateProductGroupRequest,
  UpdateProductGroupRequest,
  ProductGroupAuthorization,
  AddProductGroupAuthorizationRequest,
} from '../types/access';
import {
  getProductGroups,
  createProductGroup,
  updateProductGroup,
  deleteProductGroup,
  getProductGroupItems,
  addProductToGroup,
  removeProductFromGroup,
  getProductGroupAuthorizations,
  addProductGroupAuthorization,
  deleteProductGroupAuthorization,
} from '../services/api/access';

export interface UseProductGroupsOptions {
  /** 用户 ID（Telegram User ID 等） */
  userID?: string;
  /** 是否自动加载 */
  autoLoad?: boolean;
}

export interface UseProductGroupsReturn {
  // 状态
  groups: ProductGroup[];
  loading: boolean;
  error: string | null;

  // 操作
  loadGroups: (userID?: string) => Promise<void>;
  createGroup: (data: CreateProductGroupRequest) => Promise<ProductGroup | null>;
  updateGroup: (groupId: number, data: UpdateProductGroupRequest) => Promise<ProductGroup | null>;
  deleteGroup: (groupId: number) => Promise<boolean>;
  refresh: () => Promise<void>;

  // 商品管理
  loadItems: (groupId: number) => Promise<ProductGroupItem[]>;
  addItem: (
    groupId: number,
    listingSlug: string,
    peerID: string
  ) => Promise<ProductGroupItem | null>;
  removeItem: (groupId: number, slug: string) => Promise<boolean>;

  // 授权管理
  loadAuthorizations: (groupId: number) => Promise<ProductGroupAuthorization[]>;
  addAuthorization: (
    groupId: number,
    data: AddProductGroupAuthorizationRequest
  ) => Promise<ProductGroupAuthorization | null>;
  removeAuthorization: (groupId: number, authId: number) => Promise<boolean>;
}

/**
 * 产品组管理 Hook
 *
 * @example
 * ```tsx
 * const { groups, loading, createGroup, addItem } = useProductGroups({
 *   userID: '123456789',
 *   autoLoad: true,
 * });
 * ```
 */
export function useProductGroups(options: UseProductGroupsOptions = {}): UseProductGroupsReturn {
  const { userID, autoLoad = false } = options;

  const [groups, setGroups] = useState<ProductGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 加载产品组列表
  const loadGroups = useCallback(
    async (id?: string) => {
      const targetUserID = id || userID;
      if (!targetUserID) {
        setError('Missing userID');
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const result = await getProductGroups(targetUserID);
        setGroups(result);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load groups';
        setError(message);
        console.error('[useProductGroups] Load error:', err);
      } finally {
        setLoading(false);
      }
    },
    [userID]
  );

  // 创建产品组
  const createGroupFn = useCallback(
    async (data: CreateProductGroupRequest): Promise<ProductGroup | null> => {
      setError(null);

      try {
        const newGroup = await createProductGroup(data);
        setGroups(prev => [...prev, newGroup]);
        return newGroup;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create group';
        setError(message);
        console.error('[useProductGroups] Create error:', err);
        return null;
      }
    },
    []
  );

  // 更新产品组
  const updateGroupFn = useCallback(
    async (groupId: number, data: UpdateProductGroupRequest): Promise<ProductGroup | null> => {
      setError(null);

      try {
        const updated = await updateProductGroup(groupId, data);
        setGroups(prev => prev.map(g => (g.id === groupId ? updated : g)));
        return updated;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update group';
        setError(message);
        console.error('[useProductGroups] Update error:', err);
        return null;
      }
    },
    []
  );

  // 删除产品组
  const deleteGroupFn = useCallback(async (groupId: number): Promise<boolean> => {
    setError(null);

    try {
      await deleteProductGroup(groupId);
      setGroups(prev => prev.filter(g => g.id !== groupId));
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete group';
      setError(message);
      console.error('[useProductGroups] Delete error:', err);
      return false;
    }
  }, []);

  // 刷新
  const refresh = useCallback(async () => {
    await loadGroups();
  }, [loadGroups]);

  // 加载商品
  const loadItems = useCallback(async (groupId: number): Promise<ProductGroupItem[]> => {
    try {
      return await getProductGroupItems(groupId);
    } catch (err) {
      console.error('[useProductGroups] Load items error:', err);
      return [];
    }
  }, []);

  // 添加商品
  const addItem = useCallback(
    async (
      groupId: number,
      listingSlug: string,
      peerID: string
    ): Promise<ProductGroupItem | null> => {
      try {
        return await addProductToGroup(groupId, listingSlug, peerID);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to add item';
        setError(message);
        console.error('[useProductGroups] Add item error:', err);
        return null;
      }
    },
    []
  );

  // 移除商品
  const removeItem = useCallback(async (groupId: number, slug: string): Promise<boolean> => {
    try {
      await removeProductFromGroup(groupId, slug);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to remove item';
      setError(message);
      console.error('[useProductGroups] Remove item error:', err);
      return false;
    }
  }, []);

  // 加载授权规则
  const loadAuthorizations = useCallback(
    async (groupId: number): Promise<ProductGroupAuthorization[]> => {
      try {
        return await getProductGroupAuthorizations(groupId);
      } catch (err) {
        console.error('[useProductGroups] Load authorizations error:', err);
        return [];
      }
    },
    []
  );

  // 添加授权规则
  const addAuthorizationFn = useCallback(
    async (
      groupId: number,
      data: AddProductGroupAuthorizationRequest
    ): Promise<ProductGroupAuthorization | null> => {
      try {
        return await addProductGroupAuthorization(groupId, data);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to add authorization';
        setError(message);
        console.error('[useProductGroups] Add authorization error:', err);
        return null;
      }
    },
    []
  );

  // 移除授权规则
  const removeAuthorization = useCallback(
    async (groupId: number, authId: number): Promise<boolean> => {
      try {
        await deleteProductGroupAuthorization(groupId, authId);
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to remove authorization';
        setError(message);
        console.error('[useProductGroups] Remove authorization error:', err);
        return false;
      }
    },
    []
  );

  // 自动加载
  useEffect(() => {
    if (autoLoad && userID) {
      loadGroups();
    }
  }, [autoLoad, userID, loadGroups]);

  return {
    groups,
    loading,
    error,
    loadGroups,
    createGroup: createGroupFn,
    updateGroup: updateGroupFn,
    deleteGroup: deleteGroupFn,
    refresh,
    loadItems,
    addItem,
    removeItem,
    loadAuthorizations,
    addAuthorization: addAuthorizationFn,
    removeAuthorization,
  };
}

export default useProductGroups;
