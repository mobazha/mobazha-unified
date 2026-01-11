/**
 * 通知 API 服务
 */

import { post, safeRequest } from './client';
import { getGatewayUrl, getAuthHeaders } from './config';
import { withMockFallback } from './mode';

// 通知类型（简化分类）
export type NotificationType =
  | 'order'
  | 'payment'
  | 'dispute'
  | 'moderator'
  | 'follow'
  | 'message'
  | 'system';

// 后端返回的原始通知记录格式
interface BackendNotificationRecord {
  timestamp: string;
  read: boolean;
  type: string; // 后端返回的是详细事件类型，如 'newOrder', 'orderFunded' 等
  notification: {
    // 不同类型的通知有不同的字段
    notificationId?: string;
    orderID?: string;
    orderId?: string;
    peerID?: string;
    peerId?: string;
    caseId?: string;
    txid?: string;
    slug?: string;
    title?: string;
    thumbnail?: { tiny?: string; small?: string };
    vendorHandle?: string;
    vendorId?: string;
    buyerId?: string;
    buyerHandle?: string;
    [key: string]: unknown;
  };
}

// 后端返回的通知列表响应格式
interface BackendNotificationsResponse {
  unread: number;
  total: number;
  notifications: BackendNotificationRecord[];
}

// 前端使用的通知项格式
export interface Notification {
  id: string;
  type: string; // 保留原始事件类型，如 'newOrder'
  title: string;
  message: string;
  read: boolean;
  timestamp: string;
  data?: {
    orderId?: string;
    peerID?: string;
    txid?: string;
    caseId?: string;
    slug?: string;
    thumbnail?: { tiny?: string; small?: string };
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
 * 生成通知标题
 */
function generateNotificationTitle(type: string, notification: BackendNotificationRecord['notification']): string {
  switch (type) {
    case 'newOrder':
      return 'New Order';
    case 'orderFunded':
    case 'orderPaymentReceived':
      return 'Payment Received';
    case 'orderConfirmation':
      return 'Order Confirmed';
    case 'orderDeclined':
      return 'Order Declined';
    case 'orderCancel':
      return 'Order Cancelled';
    case 'refund':
      return 'Refund Received';
    case 'orderFulfillment':
      return 'Order Fulfilled';
    case 'orderCompletion':
      return 'Order Completed';
    case 'vendorFinalizedPayment':
      return 'Payment Finalized';
    case 'disputeOpen':
    case 'caseOpen':
      return 'Dispute Opened';
    case 'disputeClose':
      return 'Dispute Resolved';
    case 'disputeAccepted':
      return 'Dispute Accepted';
    case 'caseUpdate':
      return 'Case Update';
    case 'follow':
      return 'New Follower';
    case 'unfollow':
      return 'Unfollowed';
    case 'moderatorAdd':
      return 'Moderator Added';
    case 'moderatorRemove':
      return 'Moderator Removed';
    default:
      return notification.title || type;
  }
}

/**
 * 生成通知消息
 */
function generateNotificationMessage(type: string, notification: BackendNotificationRecord['notification']): string {
  const orderId = notification.orderID || notification.orderId || '';
  const vendorHandle = notification.vendorHandle || '';
  const buyerHandle = notification.buyerHandle || '';

  switch (type) {
    case 'newOrder':
      return orderId ? `You received a new order #${orderId.slice(0, 8)}` : 'You received a new order';
    case 'orderFunded':
    case 'orderPaymentReceived':
      return orderId ? `Payment received for order #${orderId.slice(0, 8)}` : 'Payment received';
    case 'orderConfirmation':
      return orderId ? `Order #${orderId.slice(0, 8)} has been confirmed` : 'Order confirmed';
    case 'orderFulfillment':
      return orderId ? `Order #${orderId.slice(0, 8)} has been shipped` : 'Order shipped';
    case 'orderCompletion':
      return orderId ? `Order #${orderId.slice(0, 8)} is complete` : 'Order completed';
    case 'disputeOpen':
    case 'caseOpen':
      return orderId ? `A dispute has been opened for order #${orderId.slice(0, 8)}` : 'A dispute has been opened';
    case 'follow':
      return buyerHandle ? `${buyerHandle} started following you` : 'Someone started following you';
    case 'unfollow':
      return buyerHandle ? `${buyerHandle} unfollowed you` : 'Someone unfollowed you';
    default:
      return vendorHandle || buyerHandle || 'Notification';
  }
}

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
    const response = await safeRequest<BackendNotificationsResponse>(
      url,
      { headers: getAuthHeaders(username, password) },
      { unread: 0, total: 0, notifications: [] }
    );

    // 转换后端格式到前端格式
    return (response.notifications || []).map((record): Notification => {
      const notif = record.notification || {};
      return {
        id: notif.notificationId || `${record.type}-${record.timestamp}`,
        type: record.type,
        title: generateNotificationTitle(record.type, notif),
        message: generateNotificationMessage(record.type, notif),
        read: record.read,
        timestamp: record.timestamp,
        data: {
          orderId: notif.orderID || notif.orderId,
          peerID: notif.peerID || notif.peerId,
          txid: notif.txid,
          caseId: notif.caseId,
          slug: notif.slug,
          thumbnail: notif.thumbnail,
        },
      };
    });
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
    const result = await safeRequest<{ unread: number; total: number }>(
      url,
      { headers: getAuthHeaders(username, password) },
      { unread: 0, total: 0 }
    );
    return result.unread;
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

