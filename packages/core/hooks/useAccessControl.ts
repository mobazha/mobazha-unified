/**
 * useAccessControl Hook
 * 访问控制主 Hook
 *
 * 用于检查和管理店铺访问权限
 */

import { useState, useCallback, useEffect } from 'react';
import type {
  StoreAccessRequest,
  StoreAccessSettings,
  StoreAccessCheckResult,
  StoreAccessListItem,
  SubmitAccessRequestData,
  ReviewAccessRequestData,
} from '../types/access';
import {
  getStoreAccessRequests,
  submitStoreAccessRequest,
  reviewAccessRequest,
  checkStoreAccess,
  getStoreAccessSettings,
  updateStoreAccessSettings,
  getStoreAccessList,
  addToStoreAccessList,
  removeFromStoreAccessList,
} from '../services/api/access';
import { getCurrentGroupContext } from '../services/groupContext';

export interface UseAccessControlOptions {
  /** 店铺所有者的 peerID */
  storePeerID?: string;
  /** 当前用户的 peerID */
  requestorPeerID?: string;
  /** 是否自动检查访问权限 */
  autoCheck?: boolean;
}

export interface UseAccessControlReturn {
  // 访问权限状态
  accessCheck: StoreAccessCheckResult | null;
  checkingAccess: boolean;

  // 访问设置
  settings: StoreAccessSettings | null;
  settingsLoading: boolean;

  // 访问申请
  requests: StoreAccessRequest[];
  requestsLoading: boolean;

  // 白名单
  accessList: StoreAccessListItem[];
  accessListLoading: boolean;

  // 错误
  error: string | null;

  // 访问检查
  checkAccess: (
    storePeerID?: string,
    requestorPeerID?: string
  ) => Promise<StoreAccessCheckResult | null>;

  // 访问申请操作
  loadRequests: (status?: string) => Promise<void>;
  submitRequest: (data: SubmitAccessRequestData) => Promise<StoreAccessRequest | null>;
  approveRequest: (requestId: number, userGroupID?: number) => Promise<boolean>;
  rejectRequest: (requestId: number, note?: string) => Promise<boolean>;

  // 访问设置操作
  loadSettings: () => Promise<void>;
  updateSettings: (data: Partial<StoreAccessSettings>) => Promise<boolean>;

  // 白名单操作
  loadAccessList: () => Promise<void>;
  addToList: (requestorPeerID: string) => Promise<boolean>;
  removeFromList: (requestorPeerID: string) => Promise<boolean>;
}

/**
 * 访问控制 Hook
 *
 * @example
 * ```tsx
 * // 检查访问权限
 * const { accessCheck, checkAccess } = useAccessControl({
 *   storePeerID: 'Qm...',
 *   requestorPeerID: 'Qm...',
 *   autoCheck: true,
 * });
 *
 * // 管理访问申请
 * const { requests, loadRequests, approveRequest } = useAccessControl({
 *   storePeerID: myPeerID,
 * });
 * ```
 */
export function useAccessControl(options: UseAccessControlOptions = {}): UseAccessControlReturn {
  const { storePeerID, requestorPeerID, autoCheck = false } = options;

  // 访问权限状态
  const [accessCheck, setAccessCheck] = useState<StoreAccessCheckResult | null>(null);
  const [checkingAccess, setCheckingAccess] = useState(false);

  // 访问设置
  const [settings, setSettings] = useState<StoreAccessSettings | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(false);

  // 访问申请
  const [requests, setRequests] = useState<StoreAccessRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);

  // 白名单
  const [accessList, setAccessList] = useState<StoreAccessListItem[]>([]);
  const [accessListLoading, setAccessListLoading] = useState(false);

  // 错误
  const [error, setError] = useState<string | null>(null);

  // 检查访问权限
  const checkAccessFn = useCallback(
    async (
      targetStorePeerID?: string,
      targetRequestorPeerID?: string
    ): Promise<StoreAccessCheckResult | null> => {
      const store = targetStorePeerID || storePeerID;
      const requestor = targetRequestorPeerID || requestorPeerID;

      if (!store || !requestor) {
        return null;
      }

      setCheckingAccess(true);
      setError(null);

      try {
        const groupContext = getCurrentGroupContext();
        const result = await checkStoreAccess(store, requestor, groupContext?.marketplaceID);
        setAccessCheck(result);
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to check access';
        setError(message);
        console.error('[useAccessControl] Check error:', err);
        return null;
      } finally {
        setCheckingAccess(false);
      }
    },
    [storePeerID, requestorPeerID]
  );

  // 加载访问申请
  const loadRequests = useCallback(
    async (status?: string) => {
      if (!storePeerID) {
        return;
      }

      setRequestsLoading(true);
      setError(null);

      try {
        const result = await getStoreAccessRequests(storePeerID, status);
        setRequests(result);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load requests';
        setError(message);
        console.error('[useAccessControl] Load requests error:', err);
      } finally {
        setRequestsLoading(false);
      }
    },
    [storePeerID]
  );

  // 提交访问申请
  const submitRequest = useCallback(
    async (data: SubmitAccessRequestData): Promise<StoreAccessRequest | null> => {
      setError(null);

      try {
        const result = await submitStoreAccessRequest(data);
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to submit request';
        setError(message);
        console.error('[useAccessControl] Submit request error:', err);
        return null;
      }
    },
    []
  );

  // 批准申请
  const approveRequest = useCallback(
    async (requestId: number, userGroupID?: number): Promise<boolean> => {
      setError(null);

      try {
        const data: ReviewAccessRequestData = {
          status: 'approved',
          userGroupID,
        };
        await reviewAccessRequest(requestId, data);
        setRequests(prev =>
          prev.map(r => (r.id === requestId ? { ...r, status: 'approved' as const } : r))
        );
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to approve request';
        setError(message);
        console.error('[useAccessControl] Approve error:', err);
        return false;
      }
    },
    []
  );

  // 拒绝申请
  const rejectRequest = useCallback(async (requestId: number, note?: string): Promise<boolean> => {
    setError(null);

    try {
      const data: ReviewAccessRequestData = {
        status: 'rejected',
      };
      await reviewAccessRequest(requestId, data);
      setRequests(prev =>
        prev.map(r =>
          r.id === requestId ? { ...r, status: 'rejected' as const, reviewNote: note } : r
        )
      );
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to reject request';
      setError(message);
      console.error('[useAccessControl] Reject error:', err);
      return false;
    }
  }, []);

  // 加载访问设置
  const loadSettings = useCallback(async () => {
    if (!storePeerID) {
      return;
    }

    setSettingsLoading(true);
    setError(null);

    try {
      const result = await getStoreAccessSettings(storePeerID);
      setSettings(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load settings';
      setError(message);
      console.error('[useAccessControl] Load settings error:', err);
    } finally {
      setSettingsLoading(false);
    }
  }, [storePeerID]);

  // 更新访问设置
  const updateSettingsFn = useCallback(
    async (data: Partial<StoreAccessSettings>): Promise<boolean> => {
      if (!storePeerID) {
        return false;
      }

      setError(null);

      try {
        const result = await updateStoreAccessSettings(storePeerID, data);
        setSettings(result);
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update settings';
        setError(message);
        console.error('[useAccessControl] Update settings error:', err);
        return false;
      }
    },
    [storePeerID]
  );

  // 加载白名单
  const loadAccessList = useCallback(async () => {
    if (!storePeerID) {
      return;
    }

    setAccessListLoading(true);
    setError(null);

    try {
      const result = await getStoreAccessList(storePeerID);
      setAccessList(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load access list';
      setError(message);
      console.error('[useAccessControl] Load access list error:', err);
    } finally {
      setAccessListLoading(false);
    }
  }, [storePeerID]);

  // 添加到白名单
  const addToList = useCallback(
    async (targetRequestorPeerID: string): Promise<boolean> => {
      if (!storePeerID) {
        return false;
      }

      setError(null);

      try {
        const result = await addToStoreAccessList(storePeerID, targetRequestorPeerID);
        setAccessList(prev => [...prev, result]);
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to add to list';
        setError(message);
        console.error('[useAccessControl] Add to list error:', err);
        return false;
      }
    },
    [storePeerID]
  );

  // 从白名单移除
  const removeFromList = useCallback(
    async (targetRequestorPeerID: string): Promise<boolean> => {
      if (!storePeerID) {
        return false;
      }

      setError(null);

      try {
        await removeFromStoreAccessList(storePeerID, targetRequestorPeerID);
        setAccessList(prev => prev.filter(item => item.requestorPeerID !== targetRequestorPeerID));
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to remove from list';
        setError(message);
        console.error('[useAccessControl] Remove from list error:', err);
        return false;
      }
    },
    [storePeerID]
  );

  // 自动检查访问权限
  useEffect(() => {
    if (autoCheck && storePeerID && requestorPeerID) {
      checkAccessFn();
    }
  }, [autoCheck, storePeerID, requestorPeerID, checkAccessFn]);

  return {
    accessCheck,
    checkingAccess,
    settings,
    settingsLoading,
    requests,
    requestsLoading,
    accessList,
    accessListLoading,
    error,
    checkAccess: checkAccessFn,
    loadRequests,
    submitRequest,
    approveRequest,
    rejectRequest,
    loadSettings,
    updateSettings: updateSettingsFn,
    loadAccessList,
    addToList,
    removeFromList,
  };
}

export default useAccessControl;
