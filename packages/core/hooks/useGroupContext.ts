/**
 * useGroupContext Hook
 * 群组上下文 Hook
 *
 * 用于管理群组集市的上下文信息
 */

import { useState, useCallback, useEffect } from 'react';
import type { GroupContext } from '../types/access';
import {
  detectGroupContext,
  saveGroupContext,
  getCurrentGroupContext,
  clearGroupContext,
  setUserPeerID,
  getUserPeerID,
  getGroupHeaders,
  initializeGroupMarketplace,
  verifyGroupMembership,
} from '../services/groupContext';

export interface UseGroupContextOptions {
  /** 是否自动初始化 */
  autoInit?: boolean;
  /** 当前用户的 peerID */
  userPeerID?: string;
}

export interface UseGroupContextReturn {
  // 状态
  context: GroupContext | null;
  loading: boolean;
  error: string | null;
  isInGroup: boolean;

  // 操作
  initialize: () => Promise<GroupContext | null>;
  detect: () => Promise<GroupContext | null>;
  save: (context: GroupContext) => Promise<void>;
  clear: () => void;
  verify: () => Promise<boolean>;

  // 工具方法
  getHeaders: () => Record<string, string>;
  getPeerID: () => string | null;
  setPeerID: (peerID: string) => void;
}

/**
 * 群组上下文 Hook
 *
 * @example
 * ```tsx
 * const { context, isInGroup, initialize, getHeaders } = useGroupContext({
 *   autoInit: true,
 *   userPeerID: 'Qm...',
 * });
 *
 * // 在 API 请求中使用群组 headers
 * const headers = getHeaders();
 * ```
 */
export function useGroupContext(options: UseGroupContextOptions = {}): UseGroupContextReturn {
  const { autoInit = false, userPeerID } = options;

  const [context, setContext] = useState<GroupContext | null>(null);
  const [loading, setLoading] = useState(autoInit);
  const [error, setError] = useState<string | null>(null);

  // 是否在群组环境中
  const isInGroup = context !== null;

  // 检测群组上下文
  const detect = useCallback(async (): Promise<GroupContext | null> => {
    setLoading(true);
    setError(null);

    try {
      const detected = await detectGroupContext();
      setContext(detected);
      return detected;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to detect group context';
      setError(message);
      console.error('[useGroupContext] Detect error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // 保存群组上下文
  const save = useCallback(async (ctx: GroupContext): Promise<void> => {
    try {
      await saveGroupContext(ctx);
      setContext(ctx);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save group context';
      setError(message);
      console.error('[useGroupContext] Save error:', err);
    }
  }, []);

  // 清除群组上下文
  const clear = useCallback((): void => {
    clearGroupContext();
    setContext(null);
  }, []);

  // 验证群组成员资格
  const verify = useCallback(async (): Promise<boolean> => {
    if (!context) {
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await verifyGroupMembership(
        context.platform,
        context.chatId,
        context.platformUserId
      );

      if (result.verified && (result.chatTitle || result.marketplaceID)) {
        const updatedContext: GroupContext = {
          ...context,
          chatTitle: result.chatTitle || context.chatTitle,
          marketplaceID: result.marketplaceID || context.marketplaceID,
          needsVerification: false,
        };
        await save(updatedContext);
      }

      return result.verified;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to verify membership';
      setError(message);
      console.error('[useGroupContext] Verify error:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [context, save]);

  // 初始化（完整流程）
  const initialize = useCallback(async (): Promise<GroupContext | null> => {
    setLoading(true);
    setError(null);

    try {
      const result = await initializeGroupMarketplace();
      setContext(result);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to initialize';
      setError(message);
      console.error('[useGroupContext] Initialize error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // 获取群组 headers
  const getHeaders = useCallback((): Record<string, string> => {
    return getGroupHeaders(context);
  }, [context]);

  // 获取用户 peerID
  const getPeerID = useCallback((): string | null => {
    return getUserPeerID();
  }, []);

  // 设置用户 peerID
  const setPeerID = useCallback((peerID: string): void => {
    setUserPeerID(peerID);
  }, []);

  // 自动初始化
  useEffect(() => {
    if (autoInit) {
      initialize();
    } else {
      // 仅从本地存储恢复
      const saved = getCurrentGroupContext();
      if (saved) {
        setContext(saved);
      }
    }
  }, [autoInit, initialize]);

  // 设置用户 peerID
  useEffect(() => {
    if (userPeerID) {
      setUserPeerID(userPeerID);
    }
  }, [userPeerID]);

  return {
    context,
    loading,
    error,
    isInGroup,
    initialize,
    detect,
    save,
    clear,
    verify,
    getHeaders,
    getPeerID,
    setPeerID,
  };
}

export default useGroupContext;
