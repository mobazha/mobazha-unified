/**
 * 通知 API 服务
 */

import { get, post, safeRequest } from './client';
import { getGatewayUrl, getAuthHeaders } from './config';
import { withMockFallback } from './mode';

// 通知类型
export type NotificationType =
  | 'order'
  | 'payment'
  | 'dispute'
  | 'moderator'
  | 'follow'
  | 'message'
  | 'system';

// 通知项
export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  timestamp: string;
  data?: {
    orderId?: string;
    peerID?: string;
    txid?: string;
    caseId?: string;
  };
}

// Mock 通知数据
const mockNotifications: Notification[] = [
  {
    id: 'notif-1',
    type: 'order',
    title: 'Order Shipped',
    message: 'Your order #ORD-2024-002 has been shipped',
    read: false,
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    data: { orderId: 'ORD-002' },
  },
  {
    id: 'notif-2',
    type: 'payment',
    title: 'Payment Received',
    message: 'You received 0.015 BTC for order #ORD-2024-001',
    read: false,
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    data: { orderId: 'ORD-001' },
  },
  {
    id: 'notif-3',
    type: 'follow',
    title: 'New Follower',
    message: 'Alice Chen started following you',
    read: true,
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    data: { peerID: 'QmUser001' },
  },
  {
    id: 'notif-4',
    type: 'message',
    title: 'New Message',
    message: 'TechGear Store sent you a message',
    read: true,
    timestamp: new Date(Date.now() - 172800000).toISOString(),
    data: { peerID: 'QmVendor123' },
  },
];

/**
 * 获取通知列表
 */
export async function getNotifications(
  limit = 20,
  offsetId = '',
  username?: string,
  password?: string
): Promise<Notification[]> {
  const realFn = async () => {
    const url = `${getGatewayUrl()}/ob/notifications?limit=${limit}&offsetId=${offsetId}`;
    return safeRequest<Notification[]>(url, { headers: getAuthHeaders(username, password) }, []);
  };

  const mockFn = async () => {
    return mockNotifications;
  };

  return withMockFallback(realFn, mockFn, '/ob/notifications');
}

/**
 * 获取未读通知数量
 */
export async function getUnreadNotificationCount(
  username?: string,
  password?: string
): Promise<number> {
  const realFn = async () => {
    const url = `${getGatewayUrl()}/ob/notifications/count`;
    const result = await get<{ count: number }>(url, getAuthHeaders(username, password));
    return result.count;
  };

  const mockFn = async () => {
    return mockNotifications.filter(n => !n.read).length;
  };

  return withMockFallback(realFn, mockFn, '/ob/notifications/count');
}

/**
 * 标记单个通知为已读
 */
export async function markNotificationAsRead(
  notificationId: string,
  username?: string,
  password?: string
): Promise<{ success: boolean }> {
  const realFn = async () => {
    const url = `${getGatewayUrl()}/ob/marknotificationasread/${notificationId}`;
    return post<{ success: boolean }>(url, {}, getAuthHeaders(username, password));
  };

  const mockFn = async () => {
    const notification = mockNotifications.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
    }
    return { success: true };
  };

  return withMockFallback(realFn, mockFn, `/ob/marknotificationasread/${notificationId}`);
}

/**
 * 批量标记通知为已读
 */
export async function markAllNotificationsAsRead(
  notificationIds?: string[],
  username?: string,
  password?: string
): Promise<{ success: boolean }> {
  const realFn = async () => {
    const url = `${getGatewayUrl()}/ob/marknotificationsasread`;
    return post<{ success: boolean }>(url, notificationIds ? { ids: notificationIds } : {}, getAuthHeaders(username, password));
  };

  const mockFn = async () => {
    if (notificationIds) {
      notificationIds.forEach(id => {
        const notification = mockNotifications.find(n => n.id === id);
        if (notification) {
          notification.read = true;
        }
      });
    } else {
      mockNotifications.forEach(n => {
        n.read = true;
      });
    }
    return { success: true };
  };

  return withMockFallback(realFn, mockFn, '/ob/marknotificationsasread');
}

/**
 * 批量操作通知
 */
export async function batchNotifications(
  action: 'read' | 'delete',
  notificationIds: string[],
  username?: string,
  password?: string
): Promise<{ success: boolean }> {
  const url = `${getGatewayUrl()}/ob/notifications/batch`;
  return post(url, { action, ids: notificationIds }, getAuthHeaders(username, password));
}

/**
 * 通知 API 导出对象
 */
export const notificationsApi = {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  batchNotifications,
};

