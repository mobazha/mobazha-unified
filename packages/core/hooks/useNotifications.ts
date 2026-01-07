/**
 * 通知 Hook
 */

import { useState, useCallback, useEffect } from 'react';
import { notificationsApi, type Notification } from '../services/api/notifications';

interface NotificationsState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
}

interface UseNotificationsOptions {
  autoRefresh?: boolean;
  refreshInterval?: number; // ms
}

export function useNotifications(options: UseNotificationsOptions = {}) {
  const { autoRefresh = true, refreshInterval = 30000 } = options;

  const [state, setState] = useState<NotificationsState>({
    notifications: [],
    unreadCount: 0,
    isLoading: false,
    error: null,
  });

  /**
   * 获取通知列表
   */
  const fetchNotifications = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const notifications = await notificationsApi.getNotifications();
      const unreadCount = notifications.filter(n => !n.read).length;
      setState({ notifications, unreadCount, isLoading: false, error: null });
      return notifications;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch notifications';
      setState(prev => ({ ...prev, error: errorMessage, isLoading: false }));
      return [];
    }
  }, []);

  /**
   * 获取未读数量
   */
  const fetchUnreadCount = useCallback(async () => {
    try {
      const unreadCount = await notificationsApi.getUnreadNotificationCount();
      setState(prev => ({ ...prev, unreadCount }));
      return unreadCount;
    } catch {
      return 0;
    }
  }, []);

  /**
   * 标记单个通知为已读
   */
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const result = await notificationsApi.markNotificationAsRead(notificationId);
      if (result.success) {
        setState(prev => ({
          ...prev,
          notifications: prev.notifications.map(n =>
            n.id === notificationId ? { ...n, read: true } : n
          ),
          unreadCount: Math.max(0, prev.unreadCount - 1),
        }));
      }
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to mark as read';
      return { success: false, error: errorMessage };
    }
  }, []);

  /**
   * 标记所有通知为已读
   */
  const markAllAsRead = useCallback(async () => {
    try {
      const result = await notificationsApi.markAllNotificationsAsRead();
      if (result.success) {
        setState(prev => ({
          ...prev,
          notifications: prev.notifications.map(n => ({ ...n, read: true })),
          unreadCount: 0,
        }));
      }
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to mark all as read';
      return { success: false, error: errorMessage };
    }
  }, []);

  /**
   * 筛选通知
   */
  const getNotificationsByType = useCallback(
    (type: Notification['type']) => {
      return state.notifications.filter(n => n.type === type);
    },
    [state.notifications]
  );

  /**
   * 获取未读通知
   */
  const getUnreadNotifications = useCallback(() => {
    return state.notifications.filter(n => !n.read);
  }, [state.notifications]);

  // 初始加载
  useEffect(() => {
    if (!autoRefresh) return;

    let isMounted = true;

    const loadNotifications = async () => {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      try {
        const notifications = await notificationsApi.getNotifications();
        if (isMounted) {
          const unreadCount = notifications.filter(n => !n.read).length;
          setState({ notifications, unreadCount, isLoading: false, error: null });
        }
      } catch (error) {
        if (isMounted) {
          const errorMessage =
            error instanceof Error ? error.message : 'Failed to fetch notifications';
          setState(prev => ({ ...prev, error: errorMessage, isLoading: false }));
        }
      }
    };

    void loadNotifications();

    return () => {
      isMounted = false;
    };
  }, [autoRefresh]);

  // 自动刷新
  useEffect(() => {
    if (!autoRefresh || refreshInterval <= 0) return;

    let isMounted = true;

    const timer = setInterval(async () => {
      if (!isMounted) return;
      try {
        const unreadCount = await notificationsApi.getUnreadNotificationCount();
        if (isMounted) {
          setState(prev => ({ ...prev, unreadCount }));
        }
      } catch {
        // 静默失败，下次重试
      }
    }, refreshInterval);

    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, [autoRefresh, refreshInterval]);

  return {
    ...state,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    getNotificationsByType,
    getUnreadNotifications,
  };
}

export default useNotifications;
