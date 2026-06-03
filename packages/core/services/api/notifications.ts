/**
 * 通知 API 服务
 */

import { withMockFallback } from './mode';
import { getI18n } from '../../i18n/i18n';
import { NODE_API } from '../../config/apiPaths';
import { authPost, authSafeGet } from './helpers';
import {
  readStringField,
  resolveCaseID,
  resolveNotificationID,
  resolveOrderID,
  resolveOrderOrCaseID,
  resolvePeerID,
} from '../../utils/normalizeIds';

// 后端返回的原始通知记录格式
interface BackendNotificationRecord {
  timestamp: string;
  read: boolean;
  type: string; // dot-separated 格式，如 'order.created', 'dispute.opened'
  notification: {
    // 不同类型的通知有不同的字段，因此大部分为可选
    notificationID?: string;
    notificationId?: string;
    orderID?: string;
    orderId?: string;
    peerID?: string;
    peerId?: string;
    caseID?: string;
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
    vendorName?: string;
    vendorAvatar?: string;
    vendorId?: string;
    vendorID?: string;
    buyerId?: string;
    buyerID?: string;
    buyerName?: string;
    buyerAvatar?: string;
    price?: {
      amount: number;
      currencyCode: string;
    };
    disputerID?: string;
    disputerName?: string;
    disputerAvatar?: string;
    disputeeID?: string;
    disputeeName?: string;
    disputeeAvatar?: string;
    otherPartyID?: string;
    otherPartyName?: string;
    otherPartyAvatar?: string;
    moderatorID?: string;
    moderatorName?: string;
    moderatorAvatar?: string;
    buyer?: string;
    [key: string]: unknown;
  };
}

// 通知过滤器类型
export type NotificationFilter = 'all' | 'orders' | 'followers';

// 过滤器到后端类型的映射（使用 dot-separated 格式）
export const NOTIFICATION_FILTER_TYPES: Record<NotificationFilter, string> = {
  all: '',
  orders:
    'order.created,order.payment_received,order.funded,order.confirmed,order.declined,order.cancelled,order.refunded,order.shipped,order.completed,order.rated,order.vendor_finalized,dispute.opened,dispute.closed,dispute.accepted,dispute.case_open,dispute.case_update,payment.locked,payment.expired,payment.cancelled',
  followers: 'social.follow,social.moderator_add,social.moderator_remove',
};

interface BackendNotificationsResponse {
  unread: number;
  total: number;
  notifications: BackendNotificationRecord[];
}

// 前端使用的通知项格式
export interface Notification {
  id: string;
  type: string; // dot-separated 格式
  title: string;
  message: string;
  read: boolean;
  timestamp: string;
  data?: {
    orderID?: string;
    peerID?: string;
    txid?: string;
    caseID?: string;
    slug?: string;
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
    productTitle?: string;
    price?: {
      amount: number;
      currencyCode: string;
    };
    vendorName?: string;
    vendorAvatar?: string;
    vendorID?: string;
    buyerName?: string;
    buyerAvatar?: string;
    buyerID?: string;
    disputerName?: string;
    disputerAvatar?: string;
    disputerID?: string;
    disputeeName?: string;
    disputeeAvatar?: string;
    disputeeID?: string;
    otherPartyName?: string;
    otherPartyAvatar?: string;
    moderatorName?: string;
    moderatorAvatar?: string;
  };
}

export interface NotificationsResult {
  notifications: Notification[];
  total: number;
  unread: number;
  hasMore: boolean;
  lastOffsetId?: string;
}

const mockNotifications: Notification[] = [
  {
    id: 'notif-1',
    type: 'order.created',
    title: 'New Order',
    message: 'Buyer placed an order',
    read: false,
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    data: {
      orderID: 'QmOrder001',
      productTitle: 'Vintage T-Shirt',
      price: { amount: 2500, currencyCode: 'USD' },
      buyerName: 'alice_buyer',
      buyerID: 'QmBuyer001',
      thumbnail: { tiny: '', small: '' },
    },
  },
  {
    id: 'notif-2',
    type: 'order.funded',
    title: 'Payment Received',
    message: 'Order has been funded',
    read: false,
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    data: {
      orderID: 'QmOrder002',
      productTitle: 'Handmade Bracelet',
      price: { amount: 1500, currencyCode: 'USD' },
      buyerName: 'bob_shop',
      buyerID: 'QmBuyer002',
    },
  },
  {
    id: 'notif-3',
    type: 'social.follow',
    title: 'New Follower',
    message: 'Alice Chen started following you',
    read: true,
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    data: {
      peerID: 'QmUser001',
      buyerName: 'alice_chen',
      avatarHashes: { tiny: '', small: '' },
    },
  },
  {
    id: 'notif-4',
    type: 'social.follow',
    title: 'New Follower',
    message: 'TechGear Store started following you',
    read: true,
    timestamp: new Date(Date.now() - 172800000).toISOString(),
    data: {
      peerID: 'QmVendor123',
      buyerName: 'techgear_store',
    },
  },
  {
    id: 'notif-5',
    type: 'dispute.opened',
    title: 'Dispute Opened',
    message: 'A dispute has been opened',
    read: false,
    timestamp: new Date(Date.now() - 259200000).toISOString(),
    data: {
      orderID: 'QmOrder003',
      caseID: 'QmCase001',
      disputerName: 'unhappy_buyer',
      disputerID: 'QmDisputer001',
    },
  },
];

function generateNotificationTitle(
  type: string,
  notification: BackendNotificationRecord['notification']
): string {
  const { t } = getI18n();

  switch (type) {
    case 'order.created':
      return t('notifications.titles.newOrder');
    case 'order.funded':
    case 'order.payment_received':
      return t('notifications.titles.paymentReceived');
    case 'order.confirmed':
      return t('notifications.titles.orderConfirmed');
    case 'order.declined':
      return t('notifications.titles.orderDeclined');
    case 'order.cancelled':
      return t('notifications.titles.orderCancelled');
    case 'order.refunded':
      return t('notifications.titles.refundReceived');
    case 'order.shipped':
      return t('notifications.titles.orderShipped');
    case 'order.completed':
      return t('notifications.titles.orderCompleted');
    case 'order.rated':
      return t('notifications.titles.orderRated');
    case 'order.vendor_finalized':
      return t('notifications.titles.paymentFinalized');
    case 'dispute.opened':
    case 'dispute.case_open':
      return t('notifications.titles.disputeOpened');
    case 'dispute.closed':
      return t('notifications.titles.disputeResolved');
    case 'dispute.accepted':
      return t('notifications.titles.disputeAccepted');
    case 'dispute.case_update':
      return t('notifications.titles.caseUpdate');
    case 'social.follow':
      return t('notifications.titles.newFollower');
    case 'social.unfollow':
      return t('notifications.titles.unfollowed');
    case 'social.moderator_add':
      return t('notifications.titles.moderatorAdded');
    case 'social.moderator_remove':
      return t('notifications.titles.moderatorRemoved');
    case 'payment.locked':
      return t('notifications.titles.paymentReceived');
    case 'order.expired':
      return t('notifications.titles.orderExpired', { defaultValue: 'Order Expired' });
    case 'order.stale_warning':
      return t('notifications.titles.orderStaleWarning', { defaultValue: 'Order Warning' });
    case 'payment.expired':
      return t('notifications.titles.paymentExpired', { defaultValue: 'Payment Expired' });
    case 'payment.cancelled':
      return t('notifications.titles.paymentCancelled', { defaultValue: 'Payment Cancelled' });
    default:
      return notification.title || type;
  }
}

function generateNotificationMessage(
  type: string,
  notification: BackendNotificationRecord['notification']
): string {
  const { t } = getI18n();
  const orderId = resolveOrderOrCaseID(notification);
  const buyerName =
    notification.buyerName ?? (notification as { buyerHandle?: string }).buyerHandle ?? '';
  const shortOrderId = orderId ? orderId.slice(0, 8) : '';
  const productTitle = notification.title || '';

  switch (type) {
    case 'order.created':
      return orderId
        ? t('notifications.messages.newOrderWithId', { orderId: shortOrderId })
        : t('notifications.messages.newOrderNoId');
    case 'order.funded':
    case 'order.payment_received':
      return orderId
        ? t('notifications.messages.paymentReceivedWithId', { orderId: shortOrderId })
        : t('notifications.messages.paymentReceivedNoId');
    case 'order.confirmed':
      return orderId
        ? t('notifications.messages.orderConfirmedWithId', { orderId: shortOrderId })
        : t('notifications.messages.orderConfirmedNoId');
    case 'order.declined':
      return orderId
        ? t('notifications.messages.orderDeclinedWithId', { orderId: shortOrderId })
        : t('notifications.messages.orderDeclinedNoId');
    case 'order.cancelled':
      return orderId
        ? t('notifications.messages.orderCancelledWithId', { orderId: shortOrderId })
        : t('notifications.messages.orderCancelledNoId');
    case 'order.refunded':
      return orderId
        ? t('notifications.messages.refundReceivedWithId', { orderId: shortOrderId })
        : t('notifications.messages.refundReceivedNoId');
    case 'order.shipped':
      return orderId
        ? t('notifications.messages.orderShippedWithId', { orderId: shortOrderId })
        : t('notifications.messages.orderShippedNoId');
    case 'order.completed':
      return orderId
        ? t('notifications.messages.orderCompleteWithId', { orderId: shortOrderId })
        : t('notifications.messages.orderCompleteNoId');
    case 'order.rated':
      return orderId
        ? t('notifications.messages.orderRatedWithId', { orderId: shortOrderId })
        : t('notifications.messages.orderRatedNoId');
    case 'order.vendor_finalized':
      return orderId
        ? t('notifications.messages.paymentFinalizedWithId', { orderId: shortOrderId })
        : t('notifications.messages.paymentFinalizedNoId');
    case 'dispute.opened':
    case 'dispute.case_open':
      return orderId
        ? t('notifications.messages.disputeOpenedWithId', { orderId: shortOrderId })
        : t('notifications.messages.disputeOpenedNoId');
    case 'dispute.closed':
      return orderId
        ? t('notifications.messages.disputeResolvedWithId', { orderId: shortOrderId })
        : t('notifications.messages.disputeResolvedNoId');
    case 'dispute.accepted':
      return orderId
        ? t('notifications.messages.disputeAcceptedWithId', { orderId: shortOrderId })
        : t('notifications.messages.disputeAcceptedNoId');
    case 'dispute.case_update':
      return orderId
        ? t('notifications.messages.caseUpdateWithId', { orderId: shortOrderId })
        : t('notifications.messages.caseUpdateNoId');
    case 'social.follow':
      return buyerName
        ? t('notifications.messages.followedBy', { name: buyerName })
        : t('notifications.messages.followedBySomeone');
    case 'social.unfollow':
      return buyerName
        ? t('notifications.messages.unfollowedBy', { name: buyerName })
        : t('notifications.messages.unfollowedBySomeone');
    case 'social.moderator_add':
      return buyerName
        ? t('notifications.messages.moderatorAddedBy', { name: buyerName })
        : t('notifications.messages.moderatorAddedBySomeone');
    case 'social.moderator_remove':
      return buyerName
        ? t('notifications.messages.moderatorRemovedBy', { name: buyerName })
        : t('notifications.messages.moderatorRemovedBySomeone');
    case 'order.expired':
      if (productTitle && orderId)
        return t('notifications.messages.orderExpiredWithTitle', {
          title: productTitle,
          orderId: shortOrderId,
        });
      return orderId
        ? t('notifications.messages.orderExpiredWithId', { orderId: shortOrderId })
        : t('notifications.messages.orderExpiredNoId');
    case 'order.stale_warning':
      if (productTitle && orderId)
        return t('notifications.messages.orderStaleWarningWithTitle', {
          title: productTitle,
          orderId: shortOrderId,
        });
      return orderId
        ? t('notifications.messages.orderStaleWarningWithId', { orderId: shortOrderId })
        : t('notifications.messages.orderStaleWarningNoId');
    case 'payment.locked':
      return orderId
        ? t('notifications.messages.paymentReceivedWithId', { orderId: shortOrderId })
        : t('notifications.messages.paymentReceivedNoId');
    case 'payment.expired':
    case 'payment.cancelled':
      return orderId
        ? t('notifications.messages.orderCancelledWithId', { orderId: shortOrderId })
        : t('notifications.messages.orderCancelledNoId');
    default:
      return (
        (notification.vendorName ?? (notification as { vendorHandle?: string }).vendorHandle) ||
        buyerName ||
        t('notifications.messages.defaultNotification')
      );
  }
}

export async function getNotifications(
  options: {
    limit?: number;
    offsetId?: string;
    filter?: NotificationFilter;
  } = {}
): Promise<NotificationsResult> {
  const { limit = 20, offsetId = '', filter = 'all' } = options;

  const realFn = async () => {
    const params = new URLSearchParams();
    params.append('limit', String(limit));
    if (offsetId) {
      params.append('offsetID', offsetId);
    }
    const filterTypes = NOTIFICATION_FILTER_TYPES[filter];
    if (filterTypes) {
      params.append('filter', filterTypes);
    }

    const response = await authSafeGet<BackendNotificationsResponse>(
      `${NODE_API.NOTIFICATIONS}?${params.toString()}`,
      { unread: 0, total: 0, notifications: [] }
    );

    const notifications = (response.notifications || []).map(
      (record: BackendNotificationRecord, index: number): Notification => {
        const notif = record.notification || {};
        const notifRecord = notif as Record<string, unknown>;
        const orderID = resolveOrderID(notifRecord);
        const caseID = resolveCaseID(notifRecord);
        const orderOrCaseID = resolveOrderOrCaseID(notifRecord);
        const uniqueId =
          resolveNotificationID(notifRecord) || `${record.type}-${record.timestamp}-${index}`;
        return {
          id: uniqueId,
          type: record.type,
          title: generateNotificationTitle(record.type, notif),
          message: generateNotificationMessage(record.type, notif),
          read: record.read,
          timestamp: record.timestamp,
          data: {
            orderID: orderID || orderOrCaseID || undefined,
            peerID: resolvePeerID(notifRecord) || undefined,
            txid: notif.txid,
            caseID: caseID || orderOrCaseID || undefined,
            slug: notif.slug,
            thumbnail: notif.thumbnail,
            avatarHashes: notif.avatarHashes,
            productTitle: notif.title,
            price: notif.price,
            vendorName: notif.vendorName ?? (notif as { vendorHandle?: string }).vendorHandle,
            vendorAvatar: notif.vendorAvatar,
            vendorID: readStringField(notifRecord, 'vendorID', 'vendorId') || undefined,
            buyerName: notif.buyerName ?? (notif as { buyerHandle?: string }).buyerHandle,
            buyerAvatar: notif.buyerAvatar,
            buyerID: readStringField(notifRecord, 'buyerID', 'buyerId') || undefined,
            disputerName:
              notif.disputerName ?? (notif as { disputerHandle?: string }).disputerHandle,
            disputerAvatar: notif.disputerAvatar,
            disputerID: readStringField(notifRecord, 'disputerID', 'disputerId') || undefined,
            disputeeName:
              notif.disputeeName ?? (notif as { disputeeHandle?: string }).disputeeHandle,
            disputeeAvatar: notif.disputeeAvatar,
            disputeeID: readStringField(notifRecord, 'disputeeID', 'disputeeId') || undefined,
            otherPartyName:
              notif.otherPartyName ?? (notif as { otherPartyHandle?: string }).otherPartyHandle,
            otherPartyAvatar: notif.otherPartyAvatar,
            moderatorName:
              notif.moderatorName ?? (notif as { moderatorHandle?: string }).moderatorHandle,
            moderatorAvatar: notif.moderatorAvatar,
          },
        };
      }
    );

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
    let filtered = mockNotifications;
    if (filter === 'orders') {
      filtered = mockNotifications.filter(
        n =>
          n.type.startsWith('order.') ||
          n.type.startsWith('dispute.') ||
          n.type.startsWith('payment.')
      );
    } else if (filter === 'followers') {
      filtered = mockNotifications.filter(n => n.type.startsWith('social.'));
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

/** 简化版，兼容旧的只需 Notification[] 的调用方 */
export async function getNotificationsList(limit = 20, offsetId = ''): Promise<Notification[]> {
  const result = await getNotifications({ limit, offsetId });
  return result.notifications;
}

export async function getUnreadNotificationCount(): Promise<number> {
  const realFn = async () => {
    const result = await authSafeGet<{ unread: number; total: number }>(
      NODE_API.NOTIFICATIONS_COUNT,
      { unread: 0, total: 0 }
    );
    return result.unread;
  };

  const mockFn = async () => {
    return mockNotifications.filter(n => !n.read).length;
  };

  return withMockFallback(realFn, mockFn, '/notifications/count');
}

export async function markNotificationAsRead(
  notificationId: string
): Promise<{ success: boolean }> {
  const realFn = async () => {
    const encodedId = encodeURIComponent(notificationId);
    return authPost<{ success: boolean }>(NODE_API.NOTIFICATION_READ(encodedId), {});
  };

  const mockFn = async () => {
    const notification = mockNotifications.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
    }
    return { success: true };
  };

  const encodedId = encodeURIComponent(notificationId);
  return withMockFallback(realFn, mockFn, `/notifications/${encodedId}/read`);
}

export async function markAllNotificationsAsRead(
  notificationIds?: string[]
): Promise<{ success: boolean }> {
  const realFn = async () => {
    return authPost<{ success: boolean }>(
      NODE_API.NOTIFICATIONS_READ,
      notificationIds ? { ids: notificationIds } : {}
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

  return withMockFallback(realFn, mockFn, '/notifications/read');
}

export async function batchNotifications(
  action: 'read' | 'delete',
  notificationIds: string[]
): Promise<{ success: boolean }> {
  return authPost(NODE_API.NOTIFICATIONS_BATCH, { action, ids: notificationIds });
}

const GUEST_ORDER_TOKEN_PREFIX = 'gst_';

export function getNotificationRoute(notification: Notification): string | null {
  const { type, data } = notification;
  const orderOrCaseId = resolveOrderOrCaseID(data);

  if (type.startsWith('order.') || type.startsWith('payment.')) {
    if (orderOrCaseId) {
      if (orderOrCaseId.startsWith(GUEST_ORDER_TOKEN_PREFIX)) {
        const params = new URLSearchParams({
          source: 'guest',
          guestOrder: orderOrCaseId,
        });
        return `/admin/orders?${params.toString()}`;
      }
      return `/orders/${orderOrCaseId}`;
    }
  }

  if (type.startsWith('dispute.')) {
    if (!orderOrCaseId) {
      return null;
    }
    return `/orders/${orderOrCaseId}?tab=dispute`;
  }

  if (type.startsWith('social.')) {
    if (data?.peerID) {
      return `/store/${data.peerID}`;
    }
  }

  return null;
}

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
