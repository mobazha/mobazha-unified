/**
 * 通知 Hook
 *
 * 提供通知列表、实时订阅、声音设置等功能
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  onWebSocketMessage,
  onWebSocketStatusChange,
  type WebSocketMessage,
} from '../services/websocket';
import { notificationsApi, getNotificationRoute } from '../services/api/notifications';
import type {
  NotificationFilter,
  Notification as ApiNotification,
  NotificationSource,
  NotificationsResult,
  MarketplaceReviewEventsResult,
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
import { getI18n } from '../i18n/i18n';

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

const WS_MARKETPLACE_REVIEW_EVENT = 'marketplace_seller_review';
const WS_RECONCILE_DEBOUNCE_MS = 250;
const SHARED_RECONCILE_DEBOUNCE_MS = 120;

const MARKETPLACE_FILTERS = new Set<NotificationFilter>(['all', 'system']);

export function supportsMarketplaceReview(filter: NotificationFilter): boolean {
  return MARKETPLACE_FILTERS.has(filter);
}

export function mergeNotificationsByLatest(
  nodeNotifications: ApiNotification[],
  marketplaceNotifications: ApiNotification[],
  includeMarketplace: boolean
): ApiNotification[] {
  const merged = includeMarketplace
    ? [...nodeNotifications, ...marketplaceNotifications]
    : [...nodeNotifications];
  const deduped = new Map<string, ApiNotification>();
  for (const notification of merged) {
    const key = `${notification.source}:${notification.id}`;
    if (!deduped.has(key)) {
      deduped.set(key, notification);
      continue;
    }
    const existing = deduped.get(key);
    if (!existing) {
      deduped.set(key, notification);
      continue;
    }
    if (!existing.read && notification.read) {
      deduped.set(key, notification);
    }
  }

  return [...deduped.values()].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

export function splitIdsBySource(
  ids: string[],
  notifications: ApiNotification[]
): Record<NotificationSource, string[]> {
  const idSet = new Set(ids);
  const groups: Record<NotificationSource, string[]> = {
    node: [],
    'marketplace-review': [],
  };
  for (const notification of notifications) {
    if (!idSet.has(notification.id)) continue;
    groups[notification.source].push(notification.id);
  }
  return groups;
}

export function isMarketplaceWsMessage(message: WebSocketMessage): message is WebSocketMessage & {
  type: typeof WS_MARKETPLACE_REVIEW_EVENT;
  data: { unread?: number };
} {
  if (message.type !== WS_MARKETPLACE_REVIEW_EVENT) return false;
  return typeof message.data === 'object' && message.data !== null;
}

interface SharedFetchResult {
  includeMarketplace: boolean;
  reset: boolean;
  fetchedNode: boolean;
  fetchedMarketplace: boolean;
  nodeResult: NotificationsResult | null;
  marketplaceResult: MarketplaceReviewEventsResult | null;
}

const inFlightRequestMap = new Map<string, Promise<SharedFetchResult>>();
const sharedReconcileListeners = new Set<() => void>();
let sharedReconcileTimer: ReturnType<typeof setTimeout> | null = null;

function withInFlightDedup(key: string, requestFn: () => Promise<SharedFetchResult>) {
  const existing = inFlightRequestMap.get(key);
  if (existing) {
    return existing;
  }
  const request = requestFn().finally(() => {
    inFlightRequestMap.delete(key);
  });
  inFlightRequestMap.set(key, request);
  return request;
}

function subscribeSharedReconcile(listener: () => void): () => void {
  sharedReconcileListeners.add(listener);
  return () => {
    sharedReconcileListeners.delete(listener);
  };
}

function triggerSharedReconcile(): void {
  if (sharedReconcileTimer) {
    clearTimeout(sharedReconcileTimer);
  }
  sharedReconcileTimer = setTimeout(() => {
    sharedReconcileListeners.forEach(listener => listener());
  }, SHARED_RECONCILE_DEBOUNCE_MS);
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
  const nodeNotificationsRef = useRef<ApiNotification[]>([]);
  const marketplaceNotificationsRef = useRef<ApiNotification[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const nodeOffsetRef = useRef<string>('');
  const marketplaceBeforeIDRef = useRef<number | undefined>(undefined);
  const nodeHasMoreRef = useRef(true);
  const marketplaceHasMoreRef = useRef(true);
  const nodeTotalRef = useRef(0);
  const marketplaceTotalRef = useRef(0);
  const nodeUnreadRef = useRef(0);
  const marketplaceUnreadRef = useRef(0);
  const wsReconcileTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 使用 getState() 获取稳定的 store 方法引用，避免无限循环
  // 注意：不要在 useCallback 依赖中使用整个 store 对象，因为它每次渲染都会变化
  const getStoreActions = useCallback(() => useNotificationStore.getState(), []);

  // ============ 通知管理 ============

  /**
   * 转换 API 通知到内部格式
   */
  const convertApiToInternal = useCallback((apiNotifs: ApiNotification[]): NotificationData[] => {
    return apiNotifs
      .filter(n => n.source === 'node')
      .map(n => {
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
      const includeMarketplace = supportsMarketplaceReview(currentFilter);
      const fetchNode = reset || nodeHasMoreRef.current;
      const fetchMarketplace = includeMarketplace && (reset || marketplaceHasMoreRef.current);
      const nodeOffset = fetchNode ? (reset ? '' : nodeOffsetRef.current) : nodeOffsetRef.current;
      const marketplaceBeforeID = fetchMarketplace
        ? reset
          ? undefined
          : marketplaceBeforeIDRef.current
        : marketplaceBeforeIDRef.current;
      const requestKey = JSON.stringify({
        filter: currentFilter,
        limit: pageSize,
        fetchNode,
        fetchMarketplace,
        nodeOffset,
        marketplaceBeforeID,
        includeMarketplace,
      });

      try {
        const sharedResult = await withInFlightDedup(requestKey, async () => {
          const [nodeResult, marketplaceResult] = await Promise.all([
            fetchNode
              ? notificationsApi.getNotifications({
                  limit: pageSize,
                  offsetId: nodeOffset,
                  filter: currentFilter,
                })
              : Promise.resolve(null),
            fetchMarketplace
              ? notificationsApi.getMarketplaceReviewEvents({
                  limit: pageSize,
                  beforeID: marketplaceBeforeID,
                })
              : Promise.resolve(null),
          ]);
          return {
            includeMarketplace,
            reset,
            fetchedNode: fetchNode,
            fetchedMarketplace: fetchMarketplace,
            nodeResult,
            marketplaceResult,
          } satisfies SharedFetchResult;
        });

        if (sharedResult.fetchedNode && sharedResult.nodeResult) {
          const nodeResult = sharedResult.nodeResult;
          nodeUnreadRef.current = nodeResult.unread;
          nodeOffsetRef.current = nodeResult.lastOffsetId || '';
          nodeHasMoreRef.current = nodeResult.hasMore;
          nodeTotalRef.current = nodeResult.total;
          nodeNotificationsRef.current = sharedResult.reset
            ? nodeResult.notifications.filter(n => n.source === 'node')
            : mergeNotificationsByLatest(
                nodeNotificationsRef.current,
                nodeResult.notifications,
                true
              ).filter(n => n.source === 'node');
        }

        if (!sharedResult.includeMarketplace) {
          marketplaceNotificationsRef.current = [];
          marketplaceBeforeIDRef.current = undefined;
          marketplaceHasMoreRef.current = false;
          marketplaceTotalRef.current = 0;
        } else if (sharedResult.fetchedMarketplace && sharedResult.marketplaceResult) {
          const marketplaceResult = sharedResult.marketplaceResult;
          marketplaceUnreadRef.current = marketplaceResult.unread;
          marketplaceBeforeIDRef.current = marketplaceResult.nextBeforeID;
          marketplaceHasMoreRef.current = marketplaceResult.hasMore;
          marketplaceTotalRef.current = marketplaceResult.total;
          marketplaceNotificationsRef.current = sharedResult.reset
            ? marketplaceResult.notifications.filter(n => n.source === 'marketplace-review')
            : mergeNotificationsByLatest(
                marketplaceNotificationsRef.current,
                marketplaceResult.notifications,
                true
              ).filter(n => n.source === 'marketplace-review');
        }

        setHasMore(
          nodeHasMoreRef.current ||
            (sharedResult.includeMarketplace && marketplaceHasMoreRef.current)
        );
        setTotal(
          nodeTotalRef.current + (sharedResult.includeMarketplace ? marketplaceTotalRef.current : 0)
        );

        const mergedNotifications = mergeNotificationsByLatest(
          nodeNotificationsRef.current,
          marketplaceNotificationsRef.current,
          sharedResult.includeMarketplace
        );
        apiNotificationsRef.current = mergedNotifications;
        setApiNotifications(mergedNotifications);
        const convertedNotifications = convertApiToInternal(mergedNotifications);
        store.setNotifications(convertedNotifications);
        store.setUnreadCount(nodeUnreadRef.current + marketplaceUnreadRef.current);
        return convertedNotifications;
      } catch (err) {
        const { t } = getI18n();
        const errorMessage =
          err instanceof Error && err.message ? err.message : t('notifications.errors.fetchFailed');
        store.setError(errorMessage);
        return [];
      } finally {
        store.setLoading(false);
      }
    },
    [getStoreActions, pageSize, currentFilter, convertApiToInternal]
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
    nodeOffsetRef.current = '';
    marketplaceBeforeIDRef.current = undefined;
    nodeHasMoreRef.current = true;
    marketplaceHasMoreRef.current = true;
    nodeTotalRef.current = 0;
    marketplaceTotalRef.current = 0;
    setHasMore(true);
  }, []);

  /**
   * 获取未读数量并同步到 store
   */
  const fetchUnreadCount = useCallback(async (): Promise<number> => {
    try {
      const [nodeUnread, marketplaceSummary] = await Promise.all([
        notificationsApi.getUnreadNotificationCount(),
        notificationsApi.getMarketplaceReviewEvents({ limit: 1 }),
      ]);
      nodeUnreadRef.current = nodeUnread;
      marketplaceUnreadRef.current = marketplaceSummary.unread;
      const combinedUnread = nodeUnread + marketplaceSummary.unread;
      getStoreActions().setUnreadCount(combinedUnread);
      return combinedUnread;
    } catch {
      return 0;
    }
  }, [getStoreActions]);

  /**
   * 标记单个通知为已读
   */
  const markAsRead = useCallback(
    async (id: string): Promise<{ success: boolean; error?: string }> => {
      const target = apiNotificationsRef.current.find(notification => notification.id === id);
      if (!target) {
        const { t } = getI18n();
        return { success: false, error: t('notifications.errors.notificationNotFound') };
      }

      // 乐观更新本地状态，保证未读数即时下降
      if (target.source === 'node') {
        getStoreActions().markAsRead(id);
        nodeUnreadRef.current = Math.max(0, nodeUnreadRef.current - (target.read ? 0 : 1));
      } else {
        const reviewMeta = target.data?.marketplaceReview;
        if (!reviewMeta) {
          const { t } = getI18n();
          return {
            success: false,
            error: t('notifications.errors.marketplaceReviewMetadataMissing'),
          };
        }
        marketplaceUnreadRef.current = Math.max(
          0,
          marketplaceUnreadRef.current - (target.read ? 0 : 1)
        );
      }

      const updatedNotifications = apiNotificationsRef.current.map(notification =>
        notification.id === id ? { ...notification, read: true } : notification
      );
      apiNotificationsRef.current = updatedNotifications;
      setApiNotifications(updatedNotifications);
      getStoreActions().setUnreadCount(nodeUnreadRef.current + marketplaceUnreadRef.current);
      const marketplaceReviewMeta = target.data?.marketplaceReview;
      try {
        const result =
          target.source === 'marketplace-review' && marketplaceReviewMeta
            ? await notificationsApi.markMarketplaceReviewEventAsRead(
                marketplaceReviewMeta.marketplaceID,
                marketplaceReviewMeta.eventID
              )
            : await notificationsApi.markNotificationAsRead(id);
        if (!result.success) {
          void fetchNotifications(true);
        }
        if (result.success) {
          triggerSharedReconcile();
        }
        return result;
      } catch (err) {
        void fetchNotifications(true);
        const { t } = getI18n();
        const errorMessage =
          err instanceof Error && err.message
            ? err.message
            : t('notifications.errors.markAsReadFailed');
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
      const [nodeResult, marketplaceResult] = await Promise.allSettled([
        notificationsApi.markAllNotificationsAsRead(),
        notificationsApi.markAllMarketplaceReviewEventsAsRead(),
      ]);

      const nodeSuccess = nodeResult.status === 'fulfilled' ? nodeResult.value.success : false;
      const marketplaceSuccess =
        marketplaceResult.status === 'fulfilled' ? marketplaceResult.value.success : false;

      if (!nodeSuccess || !marketplaceSuccess) {
        void fetchNotifications(true);
        void fetchUnreadCount();
        triggerSharedReconcile();
        const { t } = getI18n();
        const error =
          !nodeSuccess && !marketplaceSuccess
            ? t('notifications.errors.markAllBothFailed')
            : !nodeSuccess
              ? t('notifications.errors.markAllNodeFailed')
              : t('notifications.errors.markAllMarketplaceFailed');
        return {
          success: false,
          error,
        };
      }

      getStoreActions().markAllAsRead();
      const updatedNotifications = apiNotificationsRef.current.map(notification => ({
        ...notification,
        read: true,
      }));
      apiNotificationsRef.current = updatedNotifications;
      setApiNotifications(updatedNotifications);
      nodeUnreadRef.current = 0;
      marketplaceUnreadRef.current = 0;
      getStoreActions().setUnreadCount(0);
      triggerSharedReconcile();
      return { success: true };
    } catch (err) {
      const { t } = getI18n();
      const errorMessage =
        err instanceof Error && err.message ? err.message : t('notifications.markAllReadFailed');
      return { success: false, error: errorMessage };
    }
  }, [getStoreActions, fetchNotifications, fetchUnreadCount]);

  const deleteNotifications = useCallback(
    async (ids: string[]): Promise<{ success: boolean; error?: string }> => {
      if (ids.length === 0) {
        return { success: true };
      }

      const sourceGroups = splitIdsBySource(ids, apiNotificationsRef.current);
      const immutableIds = sourceGroups['marketplace-review'];
      const nodeIds = sourceGroups.node;

      if (nodeIds.length === 0 && immutableIds.length > 0) {
        const { t } = getI18n();
        return {
          success: false,
          error: t('notifications.errors.deleteImmutableOnly'),
        };
      }

      const removedById = new Map(
        apiNotificationsRef.current
          .filter(notification => nodeIds.includes(notification.id))
          .map(notification => [notification.id, notification] as const)
      );
      const hadUnreadRemoved = [...removedById.values()].some(notification => !notification.read);

      nodeIds.forEach(id => getStoreActions().removeNotification(id));

      const updatedNotifications = apiNotificationsRef.current.filter(
        notification => !nodeIds.includes(notification.id)
      );
      apiNotificationsRef.current = updatedNotifications;
      setApiNotifications(updatedNotifications);

      try {
        const result = await notificationsApi.batchNotifications('delete', nodeIds);
        if (!result.success) {
          void fetchNotifications(true);
          const { t } = getI18n();
          return { success: false, error: t('notifications.deleteFailed') };
        }
        if (hadUnreadRemoved) {
          void fetchUnreadCount();
        }
        triggerSharedReconcile();
        if (immutableIds.length > 0) {
          const { t } = getI18n();
          return {
            success: false,
            error: t('notifications.errors.deletePartialImmutable'),
          };
        }
        return { success: true };
      } catch (err) {
        void fetchNotifications(true);
        const { t } = getI18n();
        const errorMessage =
          err instanceof Error && err.message ? err.message : t('notifications.deleteFailed');
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
    setApiNotifications([]);
    apiNotificationsRef.current = [];
    nodeNotificationsRef.current = [];
    marketplaceNotificationsRef.current = [];
    nodeOffsetRef.current = '';
    marketplaceBeforeIDRef.current = undefined;
    nodeHasMoreRef.current = true;
    marketplaceHasMoreRef.current = true;
    nodeTotalRef.current = 0;
    marketplaceTotalRef.current = 0;
    setHasMore(true);
    setTotal(0);
    nodeUnreadRef.current = 0;
    marketplaceUnreadRef.current = 0;
    getStoreActions().setUnreadCount(0);
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

  // 初始化通知服务和基础未读同步
  useEffect(() => {
    if (enableRealtime) {
      notificationService.init();
      void fetchUnreadCount();
    }
  }, [enableRealtime, fetchUnreadCount]);

  // autoLoad 场景下首屏与过滤器切换加载
  useEffect(() => {
    if (!autoLoad) return;
    void fetchNotifications(true);
  }, [autoLoad, currentFilter, fetchNotifications]);

  const reconcileNotifications = useCallback(() => {
    void fetchUnreadCount();
    if (autoLoad || apiNotificationsRef.current.length > 0) {
      void fetchNotifications(true);
    }
  }, [autoLoad, fetchNotifications, fetchUnreadCount]);

  useEffect(() => {
    return subscribeSharedReconcile(() => {
      reconcileNotifications();
    });
  }, [reconcileNotifications]);

  // Reconcile unread count and list on tab-visible / WS reconnect.
  useEffect(() => {
    const unsubWs = onWebSocketStatusChange(status => {
      if (status === 'connected') {
        reconcileNotifications();
      }
    });

    if (typeof document === 'undefined') return unsubWs;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        reconcileNotifications();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      unsubWs();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [reconcileNotifications]);

  // Hosting marketplace review WS events trigger prompt reconciliation
  useEffect(() => {
    if (!enableRealtime) return;
    const unsubMessage = onWebSocketMessage(message => {
      if (!isMarketplaceWsMessage(message)) return;
      const nextUnread =
        typeof message.data.unread === 'number' ? Math.max(0, message.data.unread) : null;
      if (nextUnread !== null) {
        marketplaceUnreadRef.current = nextUnread;
        getStoreActions().setUnreadCount(nodeUnreadRef.current + marketplaceUnreadRef.current);
      }
      if (wsReconcileTimerRef.current) {
        clearTimeout(wsReconcileTimerRef.current);
      }
      wsReconcileTimerRef.current = setTimeout(() => {
        reconcileNotifications();
      }, WS_RECONCILE_DEBOUNCE_MS);
    });

    return () => {
      unsubMessage();
      if (wsReconcileTimerRef.current) {
        clearTimeout(wsReconcileTimerRef.current);
        wsReconcileTimerRef.current = null;
      }
    };
  }, [enableRealtime, getStoreActions, reconcileNotifications]);

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
