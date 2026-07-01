/**
 * 通知状态管理
 *
 * 管理通知列表、未读计数、声音设置等状态
 */

import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';
import type {
  NotificationData,
  NotificationSettings,
  NotificationEventType,
  NotificationCategory,
} from '../types/notification';
import {
  DEFAULT_NOTIFICATION_SETTINGS,
  getNotificationCategory,
  ORDER_NOTIFICATION_TYPES,
  DISPUTE_NOTIFICATION_TYPES,
  SOCIAL_NOTIFICATION_TYPES,
} from '../types/notification';

// ============ 状态接口 ============

interface NotificationState {
  // 通知数据
  notifications: NotificationData[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;

  // 声音设置
  soundEnabled: boolean;
  ttsEnabled: boolean;
  volume: number;

  // 当前查看的房间/页面（用于避免重复提醒）
  currentRoomId: string | null;
  currentPage: string | null;

  // Incremented when an order-state-changing notification arrives (e.g. orderFunded).
  // Order hooks watch this to trigger refetch.
  orderRefreshTrigger: number;

  // 动作：通知管理
  setNotifications: (notifications: NotificationData[]) => void;
  addNotification: (notification: NotificationData) => void;
  removeNotification: (id: string) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;

  // 动作：未读计数（WS 推送直接设置）
  setUnreadCount: (count: number) => void;

  // 动作：加载状态
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // 动作：声音设置
  setSoundEnabled: (enabled: boolean) => void;
  setTtsEnabled: (enabled: boolean) => void;
  setVolume: (volume: number) => void;

  // 动作：当前上下文
  setCurrentRoom: (roomId: string | null) => void;
  setCurrentPage: (page: string | null) => void;

  // 动作：订单刷新
  triggerOrderRefresh: () => void;

  // 选择器方法
  getNotificationsByType: (type: NotificationEventType) => NotificationData[];
  getNotificationsByCategory: (category: NotificationCategory) => NotificationData[];
  getUnreadNotifications: () => NotificationData[];
  getOrderNotifications: () => NotificationData[];
  getDisputeNotifications: () => NotificationData[];
  getSocialNotifications: () => NotificationData[];
}

// ============ 创建 Store ============

export const useNotificationStore = create<NotificationState>()(
  devtools(
    persist(
      (set, get) => ({
        // 初始状态
        notifications: [],
        unreadCount: 0,
        isLoading: false,
        error: null,

        // 声音设置（使用默认值）
        soundEnabled: DEFAULT_NOTIFICATION_SETTINGS.soundEnabled,
        ttsEnabled: DEFAULT_NOTIFICATION_SETTINGS.ttsEnabled,
        volume: DEFAULT_NOTIFICATION_SETTINGS.volume,

        // 当前上下文
        currentRoomId: null,
        currentPage: null,

        // 订单刷新触发器
        orderRefreshTrigger: 0,

        // ============ 通知管理 ============

        setNotifications: notifications => {
          set({ notifications, isLoading: false, error: null });
        },

        addNotification: notification => {
          set(state => {
            // 检查是否已存在
            const exists = state.notifications.some(n => n.id === notification.id);
            if (exists) {
              return state;
            }

            // 添加到列表开头
            const notifications = [notification, ...state.notifications];
            const unreadCount = notification.read ? state.unreadCount : state.unreadCount + 1;

            return { notifications, unreadCount };
          });
        },

        removeNotification: id => {
          set(state => {
            const notification = state.notifications.find(n => n.id === id);
            const notifications = state.notifications.filter(n => n.id !== id);
            const unreadCount =
              notification && !notification.read
                ? Math.max(0, state.unreadCount - 1)
                : state.unreadCount;

            return { notifications, unreadCount };
          });
        },

        markAsRead: id => {
          set(state => {
            const notifications = state.notifications.map(n =>
              n.id === id ? { ...n, read: true } : n
            );
            const wasUnread = state.notifications.find(n => n.id === id && !n.read);
            const unreadCount = wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount;

            return { notifications, unreadCount };
          });
        },

        markAllAsRead: () => {
          set(state => ({
            notifications: state.notifications.map(n => ({ ...n, read: true })),
            unreadCount: 0,
          }));
        },

        clearNotifications: () => {
          set({ notifications: [], unreadCount: 0 });
        },

        // ============ 未读计数（WS 推送） ============

        setUnreadCount: count => set({ unreadCount: count }),

        // ============ 加载状态 ============

        setLoading: loading => set({ isLoading: loading }),

        setError: error => set({ error, isLoading: false }),

        // ============ 声音设置 ============

        setSoundEnabled: enabled => set({ soundEnabled: enabled }),

        setTtsEnabled: enabled => set({ ttsEnabled: enabled }),

        setVolume: volume => set({ volume: Math.max(0, Math.min(1, volume)) }),

        // ============ 当前上下文 ============

        setCurrentRoom: roomId => set({ currentRoomId: roomId }),

        setCurrentPage: page => set({ currentPage: page }),

        // ============ 订单刷新 ============

        triggerOrderRefresh: () =>
          set(state => ({ orderRefreshTrigger: state.orderRefreshTrigger + 1 })),

        // ============ 选择器方法 ============

        getNotificationsByType: type => {
          return get().notifications.filter(n => n.type === type);
        },

        getNotificationsByCategory: category => {
          return get().notifications.filter(n => getNotificationCategory(n.type) === category);
        },

        getUnreadNotifications: () => {
          return get().notifications.filter(n => !n.read);
        },

        getOrderNotifications: () => {
          return get().notifications.filter(n =>
            (ORDER_NOTIFICATION_TYPES as string[]).includes(n.type)
          );
        },

        getDisputeNotifications: () => {
          return get().notifications.filter(n =>
            (DISPUTE_NOTIFICATION_TYPES as string[]).includes(n.type)
          );
        },

        getSocialNotifications: () => {
          return get().notifications.filter(n =>
            (SOCIAL_NOTIFICATION_TYPES as string[]).includes(n.type)
          );
        },
      }),
      {
        name: 'mobazha-notification-storage',
        // 只持久化设置，不持久化通知数据（通知从服务器获取）
        partialize: state => ({
          soundEnabled: state.soundEnabled,
          ttsEnabled: state.ttsEnabled,
          volume: state.volume,
        }),
      }
    ),
    { name: 'NotificationStore' }
  )
);

// ============ 选择器 ============

export const selectNotifications = (state: NotificationState) => state.notifications;
export const selectUnreadCount = (state: NotificationState) => state.unreadCount;
export const selectNotificationLoading = (state: NotificationState) => state.isLoading;
export const selectNotificationError = (state: NotificationState) => state.error;
export const selectSoundEnabled = (state: NotificationState) => state.soundEnabled;
export const selectTtsEnabled = (state: NotificationState) => state.ttsEnabled;
export const selectVolume = (state: NotificationState) => state.volume;
export const selectCurrentRoomId = (state: NotificationState) => state.currentRoomId;
export const selectOrderRefreshTrigger = (state: NotificationState) => state.orderRefreshTrigger;

// ============ 获取通知设置 ============

export function getNotificationSettings(): NotificationSettings {
  const state = useNotificationStore.getState();
  return {
    soundEnabled: state.soundEnabled,
    ttsEnabled: state.ttsEnabled,
    volume: state.volume,
  };
}
