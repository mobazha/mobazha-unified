/**
 * 通知 Hook
 *
 * 提供通知列表、实时订阅、声音设置等功能
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { onWebSocketStatusChange } from '../services/websocket';
import { notificationsApi, getNotificationRoute } from '../services/api/notifications';
import type {
  NotificationFilter,
  Notification as ApiNotification,
} from '../services/api/notifications';
import {
  useNotificationStore,
  selectNotifications,
  selectUnreadCount,
  selectNotificationLoading,
  selectNotificationError,
  selectSoundEnabled,
  selectTtsEnabled,
  selectVolume,
} from '../stores/notificationStore';
import {
  notificationService,
  soundService,
  getNotificationDisplayData,
} from '../services/notification';
import { resolveOrderOrCaseID, resolvePeerID } from '../utils/normalizeIds';
import type {
  NotificationData,
  NotificationEventType,
  NotificationCategory,
  SoundNotificationType,
  NotificationDisplayData,
} from '../types/notification';
import { getNotificationCategory, normalizeNotificationType } from '../types/notification';

// 重导出 API 类型
export type { NotificationFilter, ApiNotification };

// ============ 类型定义 ============

interface UseNotificationsOptions {
  /** 是否自动加载 */
  autoLoad?: boolean;
  /** 是否启用实时订阅 */
  enableRealtime?: boolean;
  /** 过滤器类型 */
  filter?: NotificationFilter;
  /** 每页数量 */
  pageSize?: number;
}

interface UseNotificationsReturn {
  // 状态
  notifications: NotificationData[];
  /** API 原始通知数据（包含更多详细信息） */
  apiNotifications: ApiNotification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  /** 是否有更多通知可加载 */
  hasMore: boolean;
  /** 当前过滤器 */
  currentFilter: NotificationFilter;
  /** 总数 */
  total: number;

  // 声音设置
  soundEnabled: boolean;
  ttsEnabled: boolean;
  volume: number;

  // 动作：通知管理
  fetchNotifications: (reset?: boolean) => Promise<NotificationData[]>;
  fetchUnreadCount: () => Promise<number>;
  /** 加载更多通知 */
  loadMore: () => Promise<void>;
  /** 切换过滤器 */
  setFilter: (filter: NotificationFilter) => void;
  markAsRead: (id: string) => Promise<{ success: boolean; error?: string }>;
  markAllAsRead: () => Promise<{ success: boolean; error?: string }>;
  deleteNotification: (id: string) => Promise<{ success: boolean; error?: string }>;
  deleteNotifications: (ids: string[]) => Promise<{ success: boolean; error?: string }>;
  clearNotifications: () => void;

  // 动作：声音设置
  setSoundEnabled: (enabled: boolean) => void;
  setTtsEnabled: (enabled: boolean) => void;
  setVolume: (volume: number) => void;
  testSound: (type?: SoundNotificationType) => void;

  // 动作：当前上下文
  setCurrentRoom: (roomId: string | null) => void;

  // 选择器
  getNotificationsByType: (type: NotificationEventType) => NotificationData[];
  getNotificationsByCategory: (category: NotificationCategory) => NotificationData[];
  getUnreadNotifications: () => NotificationData[];
  getOrderNotifications: () => NotificationData[];
  getDisputeNotifications: () => NotificationData[];
  getSocialNotifications: () => NotificationData[];

  // 显示数据
  getDisplayData: (
    notification: NotificationData,
    options?: { isBuyer?: boolean }
  ) => NotificationDisplayData;

  /** 获取通知的路由地址 */
  getRoute: (notification: ApiNotification) => string | null;
}

// ============ Hook 实现 ============

export function useNotifications(options: UseNotificationsOptions = {}): UseNotificationsReturn {
  const {
    autoLoad = true,
    enableRealtime = true,
    filter: initialFilter = 'all',
    pageSize = 20,
  } = options;

  // 从 Store 获取状态
  const notifications = useNotificationStore(selectNotifications);
  const unreadCount = useNotificationStore(selectUnreadCount);
  const isLoading = useNotificationStore(selectNotificationLoading);
  const error = useNotificationStore(selectNotificationError);
  const soundEnabled = useNotificationStore(selectSoundEnabled);
  const ttsEnabled = useNotificationStore(selectTtsEnabled);
  const volume = useNotificationStore(selectVolume);

  // 本地分页状态
  const [currentFilter, setCurrentFilter] = useState<NotificationFilter>(initialFilter);
  const [apiNotifications, setApiNotifications] = useState<ApiNotification[]>([]);
  const apiNotificationsRef = useRef<ApiNotification[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const [lastOffsetId, setLastOffsetId] = useState<string>('');

  // 使用 getState() 获取稳定的 store 方法引用，避免无限循环
  // 注意：不要在 useCallback 依赖中使用整个 store 对象，因为它每次渲染都会变化
  const getStoreActions = useCallback(() => useNotificationStore.getState(), []);

  // ============ 通知管理 ============

  /**
   * 转换 API 通知到内部格式
   */
  const convertApiToInternal = useCallback((apiNotifs: ApiNotification[]): NotificationData[] => {
    return apiNotifs.map(n => {
      const eventType = normalizeNotificationType(n.type);

      const base = {
        id: n.id,
        type: eventType,
        timestamp: n.timestamp,
        read: n.read,
      };

      if (n.data) {
        const dataRecord = n.data as Record<string, unknown>;
        const orderID = resolveOrderOrCaseID(dataRecord);
        if (orderID) {
          return {
            ...base,
            orderID,
          } as NotificationData;
        }
        const peerID = resolvePeerID(dataRecord);
        if (peerID) {
          return {
            ...base,
            peerID,
          } as NotificationData;
        }
      }

      return base as NotificationData;
    });
  }, []);

  /**
   * 获取通知列表
   */
  const fetchNotifications = useCallback(
    async (reset = true): Promise<NotificationData[]> => {
      const store = getStoreActions();
      store.setLoading(true);
      try {
        const result = await notificationsApi.getNotifications({
          limit: pageSize,
          offsetId: reset ? '' : lastOffsetId,
          filter: currentFilter,
        });

        // 更新分页状态
        setHasMore(result.hasMore);
        setTotal(result.total);
        setLastOffsetId(result.lastOffsetId || '');
        store.setUnreadCount(result.unread);

        // 转换并存储到 store（避免依赖 apiNotifications 造成重复请求）
        if (reset) {
          const convertedNotifications = convertApiToInternal(result.notifications);
          apiNotificationsRef.current = result.notifications;
          setApiNotifications(result.notifications);
          store.setNotifications(convertedNotifications);
          return convertedNotifications;
        }

        const combinedNotifications = [...apiNotificationsRef.current, ...result.notifications];
        apiNotificationsRef.current = combinedNotifications;
        setApiNotifications(combinedNotifications);
        const convertedNotifications = convertApiToInternal(combinedNotifications);
        store.setNotifications(convertedNotifications);
        return convertedNotifications;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch notifications';
        store.setError(errorMessage);
        return [];
      }
    },
    [getStoreActions, pageSize, lastOffsetId, currentFilter, convertApiToInternal]
  );

  /**
   * 加载更多通知
   */
  const loadMore = useCallback(async (): Promise<void> => {
    if (!hasMore || isLoading) return;
    await fetchNotifications(false);
  }, [hasMore, isLoading, fetchNotifications]);

  /**
   * 切换过滤器
   */
  const setFilter = useCallback((filter: NotificationFilter): void => {
    setCurrentFilter(filter);
    setLastOffsetId('');
    setHasMore(true);
    // 切换过滤器后重新加载
  }, []);

  /**
   * 获取未读数量并同步到 store
   */
  const fetchUnreadCount = useCallback(async (): Promise<number> => {
    try {
      const count = await notificationsApi.getUnreadNotificationCount();
      getStoreActions().setUnreadCount(count);
      return count;
    } catch {
      return 0;
    }
  }, [getStoreActions]);

  /**
   * 标记单个通知为已读
   */
  const markAsRead = useCallback(
    async (id: string): Promise<{ success: boolean; error?: string }> => {
      // 乐观更新本地状态，保证未读数即时下降
      getStoreActions().markAsRead(id);
      const updatedNotifications = apiNotificationsRef.current.map(notification =>
        notification.id === id ? { ...notification, read: true } : notification
      );
      apiNotificationsRef.current = updatedNotifications;
      setApiNotifications(updatedNotifications);
      try {
        const result = await notificationsApi.markNotificationAsRead(id);
        if (!result.success) {
          void fetchNotifications(true);
        }
        return result;
      } catch (err) {
        void fetchNotifications(true);
        const errorMessage = err instanceof Error ? err.message : 'Failed to mark as read';
        return { success: false, error: errorMessage };
      }
    },
    [getStoreActions, fetchNotifications]
  );

  /**
   * 标记所有通知为已读
   */
  const markAllAsRead = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    try {
      const result = await notificationsApi.markAllNotificationsAsRead();
      if (result.success) {
        getStoreActions().markAllAsRead();
        const updatedNotifications = apiNotificationsRef.current.map(notification => ({
          ...notification,
          read: true,
        }));
        apiNotificationsRef.current = updatedNotifications;
        setApiNotifications(updatedNotifications);
      }
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to mark all as read';
      return { success: false, error: errorMessage };
    }
  }, [getStoreActions]);

  const deleteNotifications = useCallback(
    async (ids: string[]): Promise<{ success: boolean; error?: string }> => {
      if (ids.length === 0) {
        return { success: true };
      }

      const removedById = new Map(
        apiNotificationsRef.current
          .filter(notification => ids.includes(notification.id))
          .map(notification => [notification.id, notification] as const)
      );
      const hadUnreadRemoved = [...removedById.values()].some(notification => !notification.read);

      ids.forEach(id => getStoreActions().removeNotification(id));

      const updatedNotifications = apiNotificationsRef.current.filter(
        notification => !ids.includes(notification.id)
      );
      apiNotificationsRef.current = updatedNotifications;
      setApiNotifications(updatedNotifications);

      try {
        const result = await notificationsApi.batchNotifications('delete', ids);
        if (!result.success) {
          void fetchNotifications(true);
          return { success: false, error: 'Failed to delete notifications' };
        }
        if (hadUnreadRemoved) {
          void fetchUnreadCount();
        }
        return { success: true };
      } catch (err) {
        void fetchNotifications(true);
        const errorMessage = err instanceof Error ? err.message : 'Failed to delete notifications';
        return { success: false, error: errorMessage };
      }
    },
    [getStoreActions, fetchNotifications, fetchUnreadCount]
  );

  /**
   * 删除单条通知
   */
  const deleteNotification = useCallback(
    async (id: string): Promise<{ success: boolean; error?: string }> => {
      return deleteNotifications([id]);
    },
    [deleteNotifications]
  );

  /**
   * 清空所有通知
   */
  const clearNotifications = useCallback((): void => {
    getStoreActions().clearNotifications();
  }, [getStoreActions]);

  // ============ 声音设置 ============

  const setSoundEnabled = useCallback(
    (enabled: boolean): void => {
      getStoreActions().setSoundEnabled(enabled);
    },
    [getStoreActions]
  );

  const setTtsEnabled = useCallback(
    (enabled: boolean): void => {
      getStoreActions().setTtsEnabled(enabled);
    },
    [getStoreActions]
  );

  const setVolume = useCallback(
    (newVolume: number): void => {
      getStoreActions().setVolume(newVolume);
      soundService.updateVolume(newVolume);
    },
    [getStoreActions]
  );

  const testSound = useCallback((type?: SoundNotificationType): void => {
    soundService.testPlay(type || 'chat_message');
  }, []);

  // ============ 当前上下文 ============

  const setCurrentRoom = useCallback(
    (roomId: string | null): void => {
      getStoreActions().setCurrentRoom(roomId);
    },
    [getStoreActions]
  );

  // ============ 选择器 ============

  const getNotificationsByType = useCallback(
    (type: NotificationEventType): NotificationData[] => {
      return notifications.filter(n => n.type === type);
    },
    [notifications]
  );

  const getNotificationsByCategory = useCallback(
    (category: NotificationCategory): NotificationData[] => {
      return notifications.filter(n => getNotificationCategory(n.type) === category);
    },
    [notifications]
  );

  const getUnreadNotifications = useCallback((): NotificationData[] => {
    return notifications.filter(n => !n.read);
  }, [notifications]);

  const getOrderNotifications = useCallback((): NotificationData[] => {
    return getStoreActions().getOrderNotifications();
  }, [getStoreActions]);

  const getDisputeNotifications = useCallback((): NotificationData[] => {
    return getStoreActions().getDisputeNotifications();
  }, [getStoreActions]);

  const getSocialNotifications = useCallback((): NotificationData[] => {
    return getStoreActions().getSocialNotifications();
  }, [getStoreActions]);

  // ============ 显示数据 ============

  const getDisplayData = useCallback(
    (notification: NotificationData, opts?: { isBuyer?: boolean }): NotificationDisplayData => {
      return getNotificationDisplayData(notification, opts);
    },
    []
  );

  /**
   * 获取通知的路由地址
   */
  const getRoute = useCallback((notification: ApiNotification): string | null => {
    return getNotificationRoute(notification);
  }, []);

  // ============ 副作用 ============

  // 初始化通知服务和加载数据
  useEffect(() => {
    if (enableRealtime) {
      notificationService.init();
      void fetchUnreadCount();
    }

    if (autoLoad) {
      void fetchNotifications(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoLoad, enableRealtime]);

  // 过滤器变化时重新加载
  useEffect(() => {
    void fetchNotifications(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentFilter]);

  // Reconcile unread count on tab-visible and WS reconnect.
  // The backend pushes counts in real-time via WS; these are fallbacks
  // to recover from missed events during disconnect or background.
  useEffect(() => {
    const unsubWs = onWebSocketStatusChange(status => {
      if (status === 'connected') {
        void fetchUnreadCount();
      }
    });

    if (typeof document === 'undefined') return unsubWs;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void fetchUnreadCount();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      unsubWs();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchUnreadCount]);

  // 订阅实时通知
  useEffect(() => {
    if (!enableRealtime) return;

    const unsubscribe = notificationService.subscribe();

    return () => {
      unsubscribe();
    };
  }, [enableRealtime]);

  // ============ 返回 ============

  return useMemo(
    () => ({
      // 状态
      notifications,
      apiNotifications,
      unreadCount,
      isLoading,
      error,
      hasMore,
      currentFilter,
      total,

      // 声音设置
      soundEnabled,
      ttsEnabled,
      volume,

      // 动作：通知管理
      fetchNotifications,
      fetchUnreadCount,
      loadMore,
      setFilter,
      markAsRead,
      markAllAsRead,
      deleteNotification,
      deleteNotifications,
      clearNotifications,

      // 动作：声音设置
      setSoundEnabled,
      setTtsEnabled,
      setVolume,
      testSound,

      // 动作：当前上下文
      setCurrentRoom,

      // 选择器
      getNotificationsByType,
      getNotificationsByCategory,
      getUnreadNotifications,
      getOrderNotifications,
      getDisputeNotifications,
      getSocialNotifications,

      // 显示数据
      getDisplayData,
      getRoute,
    }),
    [
      notifications,
      apiNotifications,
      unreadCount,
      isLoading,
      error,
      hasMore,
      currentFilter,
      total,
      soundEnabled,
      ttsEnabled,
      volume,
      fetchNotifications,
      fetchUnreadCount,
      loadMore,
      setFilter,
      markAsRead,
      markAllAsRead,
      deleteNotification,
      deleteNotifications,
      clearNotifications,
      setSoundEnabled,
      setTtsEnabled,
      setVolume,
      testSound,
      setCurrentRoom,
      getNotificationsByType,
      getNotificationsByCategory,
      getUnreadNotifications,
      getOrderNotifications,
      getDisputeNotifications,
      getSocialNotifications,
      getDisplayData,
      getRoute,
    ]
  );
}

// ============ 便捷 Hook ============

/**
 * 仅获取未读数量的轻量级 Hook
 */
export function useUnreadNotificationCount(): number {
  return useNotificationStore(selectUnreadCount);
}

/**
 * 仅获取通知声音设置的 Hook
 */
export function useNotificationSoundSettings() {
  const soundEnabled = useNotificationStore(selectSoundEnabled);
  const ttsEnabled = useNotificationStore(selectTtsEnabled);
  const volume = useNotificationStore(selectVolume);
  const store = useNotificationStore();

  return {
    soundEnabled,
    ttsEnabled,
    volume,
    setSoundEnabled: store.setSoundEnabled,
    setTtsEnabled: store.setTtsEnabled,
    setVolume: (v: number) => {
      store.setVolume(v);
      soundService.updateVolume(v);
    },
    testSound: (type?: SoundNotificationType) => soundService.testPlay(type || 'chat_message'),
  };
}

export default useNotifications;
