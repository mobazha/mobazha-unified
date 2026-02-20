/**
 * 通知 API 服务
 */

import { post, safeRequest } from './client';
import { getGatewayUrl, getAuthHeaders } from './config';
import { withMockFallback } from './mode';
import { getI18n } from '../../i18n/i18n';

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
    notificationID?: string;
    notificationId?: string;
    orderID?: string;
    orderId?: string;
    peerID?: string;
    peerId?: string;
    caseId?: string;
    txid?: string;
    slug?: string;
    title?: string;
    thumbnail?: {
      tiny?: string;
      small?: string;
      medium?: string;
      large?: string;
      original?: string;
    };
    avatarHashes?: {
      tiny?: string;
      small?: string;
      medium?: string;
      large?: string;
      original?: string;
    };
    vendorHandle?: string;
    vendorId?: string;
    vendorID?: string;
    buyerId?: string;
    buyerID?: string;
    buyerHandle?: string;
    // 价格信息
    price?: {
      amount: number;
      currencyCode: string;
    };
    // 争议相关
    disputerID?: string;
    disputerHandle?: string;
    disputeeID?: string;
    disputeeHandle?: string;
    buyer?: string;
    [key: string]: unknown;
  };
}

// 通知过滤器类型
export type NotificationFilter = 'all' | 'orders' | 'followers';

// 过滤器到后端类型的映射
export const NOTIFICATION_FILTER_TYPES: Record<NotificationFilter, string> = {
  all: '',
  orders:
    'newOrder,orderPaymentReceived,orderFunded,orderConfirmation,orderDeclined,orderCancel,refund,orderFulfillment,orderCompletion,disputeOpen,disputeClose,disputeAccepted,caseOpen,caseUpdate,vendorFinalizedPayment',
  followers: 'follow,moderatorAdd,moderatorRemove',
};

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
    // 商品/头像图片
    thumbnail?: {
      tiny?: string;
      small?: string;
      medium?: string;
      large?: string;
      original?: string;
    };
    avatarHashes?: {
      tiny?: string;
      small?: string;
      medium?: string;
      large?: string;
      original?: string;
    };
    // 商品信息
    productTitle?: string;
    price?: {
      amount: number;
      currencyCode: string;
    };
    // 用户信息
    vendorHandle?: string;
    vendorId?: string;
    buyerHandle?: string;
    buyerId?: string;
    // 争议相关
    disputerHandle?: string;
    disputerId?: string;
    disputeeHandle?: string;
    disputeeId?: string;
  };
}

// 分页结果
export interface NotificationsResult {
  notifications: Notification[];
  total: number;
  unread: number;
  hasMore: boolean;
  lastOffsetId?: string;
}

// Mock 通知数据
const mockNotifications: Notification[] = [
  {
    id: 'notif-1',
    type: 'newOrder',
    title: 'New Order',
    message: 'Buyer placed an order',
    read: false,
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    data: {
      orderId: 'QmOrder001',
      productTitle: 'Vintage T-Shirt',
      price: { amount: 2500, currencyCode: 'USD' },
      buyerHandle: 'alice_buyer',
      buyerId: 'QmBuyer001',
      thumbnail: { tiny: '', small: '' },
    },
  },
  {
    id: 'notif-2',
    type: 'orderFunded',
    title: 'Payment Received',
    message: 'Order has been funded',
    read: false,
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    data: {
      orderId: 'QmOrder002',
      productTitle: 'Handmade Bracelet',
      price: { amount: 1500, currencyCode: 'USD' },
      buyerHandle: 'bob_shop',
      buyerId: 'QmBuyer002',
    },
  },
  {
    id: 'notif-3',
    type: 'follow',
    title: 'New Follower',
    message: 'Alice Chen started following you',
    read: true,
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    data: {
      peerID: 'QmUser001',
      buyerHandle: 'alice_chen',
      avatarHashes: { tiny: '', small: '' },
    },
  },
  {
    id: 'notif-4',
    type: 'follow',
    title: 'New Follower',
    message: 'TechGear Store started following you',
    read: true,
    timestamp: new Date(Date.now() - 172800000).toISOString(),
    data: {
      peerID: 'QmVendor123',
      buyerHandle: 'techgear_store',
    },
  },
  {
    id: 'notif-5',
    type: 'disputeOpen',
    title: 'Dispute Opened',
    message: 'A dispute has been opened',
    read: false,
    timestamp: new Date(Date.now() - 259200000).toISOString(),
    data: {
      orderId: 'QmOrder003',
      caseId: 'QmCase001',
      disputerHandle: 'unhappy_buyer',
      disputerId: 'QmDisputer001',
    },
  },
];

/**
 * 生成通知标题（支持 i18n）
 */
function generateNotificationTitle(
  type: string,
  notification: BackendNotificationRecord['notification']
): string {
  const { t } = getI18n();

  switch (type) {
    case 'newOrder':
      return t('notifications.titles.newOrder');
    case 'orderFunded':
    case 'orderPaymentReceived':
      return t('notifications.titles.paymentReceived');
    case 'orderConfirmation':
      return t('notifications.titles.orderConfirmed');
    case 'orderDeclined':
      return t('notifications.titles.orderDeclined');
    case 'orderCancel':
      return t('notifications.titles.orderCancelled');
    case 'refund':
      return t('notifications.titles.refundReceived');
    case 'orderFulfillment':
      return t('notifications.titles.orderFulfilled');
    case 'orderCompletion':
      return t('notifications.titles.orderCompleted');
    case 'vendorFinalizedPayment':
      return t('notifications.titles.paymentFinalized');
    case 'disputeOpen':
    case 'caseOpen':
      return t('notifications.titles.disputeOpened');
    case 'disputeClose':
      return t('notifications.titles.disputeResolved');
    case 'disputeAccepted':
      return t('notifications.titles.disputeAccepted');
    case 'caseUpdate':
      return t('notifications.titles.caseUpdate');
    case 'follow':
      return t('notifications.titles.newFollower');
    case 'unfollow':
      return t('notifications.titles.unfollowed');
    case 'moderatorAdd':
      return t('notifications.titles.moderatorAdded');
    case 'moderatorRemove':
      return t('notifications.titles.moderatorRemoved');
    default:
      return notification.title || type;
  }
}

/**
 * 生成通知消息（支持 i18n）
 */
function generateNotificationMessage(
  type: string,
  notification: BackendNotificationRecord['notification']
): string {
  const { t } = getI18n();
  const orderId = notification.orderID || notification.orderId || '';
  const vendorHandle = notification.vendorHandle || '';
  const buyerHandle = notification.buyerHandle || '';
  const shortOrderId = orderId ? orderId.slice(0, 8) : '';

  switch (type) {
    case 'newOrder':
      return orderId
        ? t('notifications.messages.newOrderWithId', { orderId: shortOrderId })
        : t('notifications.messages.newOrderNoId');
    case 'orderFunded':
    case 'orderPaymentReceived':
      return orderId
        ? t('notifications.messages.paymentReceivedWithId', { orderId: shortOrderId })
        : t('notifications.messages.paymentReceivedNoId');
    case 'orderConfirmation':
      return orderId
        ? t('notifications.messages.orderConfirmedWithId', { orderId: shortOrderId })
        : t('notifications.messages.orderConfirmedNoId');
    case 'orderDeclined':
      return orderId
        ? t('notifications.messages.orderDeclinedWithId', { orderId: shortOrderId })
        : t('notifications.messages.orderDeclinedNoId');
    case 'orderCancel':
      return orderId
        ? t('notifications.messages.orderCancelledWithId', { orderId: shortOrderId })
        : t('notifications.messages.orderCancelledNoId');
    case 'refund':
      return orderId
        ? t('notifications.messages.refundReceivedWithId', { orderId: shortOrderId })
        : t('notifications.messages.refundReceivedNoId');
    case 'orderFulfillment':
      return orderId
        ? t('notifications.messages.orderShippedWithId', { orderId: shortOrderId })
        : t('notifications.messages.orderShippedNoId');
    case 'orderCompletion':
      return orderId
        ? t('notifications.messages.orderCompleteWithId', { orderId: shortOrderId })
        : t('notifications.messages.orderCompleteNoId');
    case 'vendorFinalizedPayment':
      return orderId
        ? t('notifications.messages.paymentFinalizedWithId', { orderId: shortOrderId })
        : t('notifications.messages.paymentFinalizedNoId');
    case 'disputeOpen':
    case 'caseOpen':
      return orderId
        ? t('notifications.messages.disputeOpenedWithId', { orderId: shortOrderId })
        : t('notifications.messages.disputeOpenedNoId');
    case 'disputeClose':
      return orderId
        ? t('notifications.messages.disputeResolvedWithId', { orderId: shortOrderId })
        : t('notifications.messages.disputeResolvedNoId');
    case 'disputeAccepted':
      return orderId
        ? t('notifications.messages.disputeAcceptedWithId', { orderId: shortOrderId })
        : t('notifications.messages.disputeAcceptedNoId');
    case 'caseUpdate':
      return orderId
        ? t('notifications.messages.caseUpdateWithId', { orderId: shortOrderId })
        : t('notifications.messages.caseUpdateNoId');
    case 'follow':
      return buyerHandle
        ? t('notifications.messages.followedBy', { name: buyerHandle })
        : t('notifications.messages.followedBySomeone');
    case 'unfollow':
      return buyerHandle
        ? t('notifications.messages.unfollowedBy', { name: buyerHandle })
        : t('notifications.messages.unfollowedBySomeone');
    case 'moderatorAdd':
      return buyerHandle
        ? t('notifications.messages.moderatorAddedBy', { name: buyerHandle })
        : t('notifications.messages.moderatorAddedBySomeone');
    case 'moderatorRemove':
      return buyerHandle
        ? t('notifications.messages.moderatorRemovedBy', { name: buyerHandle })
        : t('notifications.messages.moderatorRemovedBySomeone');
    default:
      return vendorHandle || buyerHandle || t('notifications.messages.defaultNotification');
  }
}

/**
 * 获取通知列表（带分页和过滤）
 */
export async function getNotifications(
  options: {
    limit?: number;
    offsetId?: string;
    filter?: NotificationFilter;
    username?: string;
    password?: string;
  } = {}
): Promise<NotificationsResult> {
  const { limit = 20, offsetId = '', filter = 'all', username, password } = options;

  const realFn = async () => {
    const params = new URLSearchParams();
    params.append('limit', String(limit));
    if (offsetId) {
      params.append('offsetID', offsetId);
    }
    // 添加 filter 参数
    const filterTypes = NOTIFICATION_FILTER_TYPES[filter];
    if (filterTypes) {
      params.append('filter', filterTypes);
    }

    const url = `${getGatewayUrl()}/notifications?${params.toString()}`;
    const response = await safeRequest<BackendNotificationsResponse>(
      url,
      { headers: getAuthHeaders(username, password) },
      { unread: 0, total: 0, notifications: [] }
    );

    // 转换后端格式到前端格式
    const notifications = (response.notifications || []).map((record, index): Notification => {
      const notif = record.notification || {};
      // 确保 ID 唯一：优先使用后端 notificationID（大小写敏感），再兜底 type-timestamp-index
      const uniqueId =
        notif.notificationID ||
        notif.notificationId ||
        `${record.type}-${record.timestamp}-${index}`;
      return {
        id: uniqueId,
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
          avatarHashes: notif.avatarHashes,
          productTitle: notif.title,
          price: notif.price,
          vendorHandle: notif.vendorHandle,
          vendorId: notif.vendorId || notif.vendorID,
          buyerHandle: notif.buyerHandle,
          buyerId: notif.buyerId || notif.buyerID,
          disputerHandle: notif.disputerHandle,
          disputerId: notif.disputerID,
          disputeeHandle: notif.disputeeHandle,
          disputeeId: notif.disputeeID,
        },
      };
    });

    const lastNotif = notifications[notifications.length - 1];
    return {
      notifications,
      total: response.total || 0,
      unread: response.unread || 0,
      hasMore: notifications.length >= limit && notifications.length < (response.total || 0),
      lastOffsetId: lastNotif?.id,
    };
  };

  const mockFn = async () => {
    // Mock 数据也支持过滤
    let filtered = mockNotifications;
    if (filter === 'orders') {
      filtered = mockNotifications.filter(
        n =>
          ['order', 'payment', 'dispute'].includes(n.type) ||
          n.type.startsWith('order') ||
          n.type.startsWith('dispute') ||
          n.type.startsWith('case')
      );
    } else if (filter === 'followers') {
      filtered = mockNotifications.filter(
        n => n.type === 'follow' || n.type === 'moderatorAdd' || n.type === 'moderatorRemove'
      );
    }
    return {
      notifications: filtered,
      total: filtered.length,
      unread: filtered.filter(n => !n.read).length,
      hasMore: false,
    };
  };

  return withMockFallback(realFn, mockFn, '/notifications');
}

/**
 * 获取通知列表（简化版，兼容旧接口）
 */
export async function getNotificationsList(
  limit = 20,
  offsetId = '',
  username?: string,
  password?: string
): Promise<Notification[]> {
  const result = await getNotifications({ limit, offsetId, username, password });
  return result.notifications;
}

/**
 * 获取未读通知数量
 */
export async function getUnreadNotificationCount(
  username?: string,
  password?: string
): Promise<number> {
  const realFn = async () => {
    const url = `${getGatewayUrl()}/notifications/count`;
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

  return withMockFallback(realFn, mockFn, '/notifications/count');
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
    const encodedId = encodeURIComponent(notificationId);
    const url = `${getGatewayUrl()}/marknotificationasread/${encodedId}`;
    return post<{ success: boolean }>(url, {}, getAuthHeaders(username, password));
  };

  const mockFn = async () => {
    const notification = mockNotifications.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
    }
    return { success: true };
  };

  const encodedId = encodeURIComponent(notificationId);
  return withMockFallback(realFn, mockFn, `/marknotificationasread/${encodedId}`);
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
    const url = `${getGatewayUrl()}/marknotificationsasread`;
    return post<{ success: boolean }>(
      url,
      notificationIds ? { ids: notificationIds } : {},
      getAuthHeaders(username, password)
    );
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

  return withMockFallback(realFn, mockFn, '/marknotificationsasread');
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
  const url = `${getGatewayUrl()}/notifications/batch`;
  return post(url, { action, ids: notificationIds }, getAuthHeaders(username, password));
}

/**
 * 获取通知的路由地址
 */
export function getNotificationRoute(notification: Notification): string | null {
  const { type, data } = notification;

  // 订单相关通知
  if (
    type.startsWith('order') ||
    type === 'newOrder' ||
    type === 'refund' ||
    type === 'vendorFinalizedPayment'
  ) {
    if (data?.orderId) {
      return `/orders/${data.orderId}`;
    }
  }

  // 争议相关通知
  if (type.startsWith('dispute') || type.startsWith('case')) {
    if (data?.orderId) {
      return `/orders/${data.orderId}?tab=dispute`;
    }
    if (data?.caseId) {
      return `/moderator/cases/${data.caseId}`;
    }
  }

  // 关注相关通知
  if (
    type === 'follow' ||
    type === 'unfollow' ||
    type === 'moderatorAdd' ||
    type === 'moderatorRemove'
  ) {
    if (data?.peerID) {
      return `/store/${data.peerID}`;
    }
  }

  return null;
}

/**
 * 通知 API 导出对象
 */
export const notificationsApi = {
  getNotifications,
  getNotificationsList,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  batchNotifications,
  getNotificationRoute,
  NOTIFICATION_FILTER_TYPES,
};
