/**
 * 通知服务
 *
 * 处理 WebSocket 通知消息，更新 Store，触发声音提醒，生成显示文本
 */

import type {
  NotificationData,
  NotificationDisplayData,
  OrderNotificationData,
  DisputeNotificationData,
  SocialNotificationData,
  PaymentNotificationData,
} from '../../types/notification';
import {
  isOrderNotification,
  isDisputeNotification,
  isSocialNotification,
  isPaymentNotification,
  eventTypeToSoundType,
} from '../../types/notification';
import { useNotificationStore } from '../../stores/notificationStore';
import { soundService } from './soundService';
import { onWebSocketMessage, type WebSocketMessage } from '../websocket';
import { getI18n } from '../../i18n/i18n';

// ============ 类型守卫 ============

function isNotificationWrapper(message: unknown): message is { notification: NotificationData } {
  return (
    typeof message === 'object' &&
    message !== null &&
    'notification' in message &&
    typeof (message as { notification: unknown }).notification === 'object'
  );
}

function isChatMessage(
  message: unknown
): message is { chatMessage: { messageId: string; peerID: string; subject: string } } {
  return typeof message === 'object' && message !== null && 'chatMessage' in message;
}

// ============ 显示文本生成 ============

function getDisplayName(name?: string, peerId?: string): string {
  if (name) {
    return name;
  }
  if (peerId) {
    return peerId.length > 12 ? `${peerId.slice(0, 6)}…${peerId.slice(-4)}` : peerId;
  }
  return '';
}

function getOrderNotificationDisplay(
  notification: OrderNotificationData,
  isBuyer: boolean
): NotificationDisplayData {
  const i18n = getI18n();
  const {
    type,
    orderID,
    buyerName: buyerNameVal,
    buyerID,
    vendorName: vendorNameVal,
    vendorID,
    title,
  } = notification;

  const buyerName = getDisplayName(buyerNameVal, buyerID);
  const vendorName = getDisplayName(vendorNameVal, vendorID);
  const route = isBuyer
    ? `/orders/purchases?orderID=${orderID}`
    : `/orders/sales?orderID=${orderID}`;

  let text = '';
  let name = '';

  switch (type) {
    case 'order.created':
      name = isBuyer ? '' : buyerName;
      text = isBuyer
        ? i18n.t('notifications.order.youPlacedOrder')
        : i18n.t('notifications.order.placedOrder');
      if (title) {
        text += ` - ${title}`;
      }
      break;

    case 'order.payment_received':
      name = isBuyer ? '' : buyerName;
      text = isBuyer
        ? i18n.t('notifications.order.yourPaymentSent')
        : i18n.t('notifications.order.sentPayment');
      break;

    case 'order.funded':
      text = i18n.t('notifications.order.orderFunded');
      break;

    case 'order.confirmed':
      name = isBuyer ? vendorName : '';
      text = isBuyer
        ? i18n.t('notifications.order.acceptedYourOrder')
        : i18n.t('notifications.order.youAcceptedOrder');
      break;

    case 'order.declined':
      name = isBuyer ? vendorName : '';
      text = isBuyer
        ? i18n.t('notifications.order.declinedYourOrder')
        : i18n.t('notifications.order.youDeclinedOrder');
      break;

    case 'order.cancelled':
      name = isBuyer ? '' : buyerName;
      text = isBuyer
        ? i18n.t('notifications.order.youCancelledOrder')
        : i18n.t('notifications.order.cancelledOrder');
      break;

    case 'order.refunded':
      name = isBuyer ? vendorName : '';
      text = isBuyer
        ? i18n.t('notifications.order.refundedYourOrder')
        : i18n.t('notifications.order.youRefundedOrder');
      break;

    case 'order.fulfilled':
      name = isBuyer ? vendorName : '';
      text = isBuyer
        ? i18n.t('notifications.order.fulfilledYourOrder')
        : i18n.t('notifications.order.youFulfilledOrder');
      break;

    case 'order.completed':
      name = buyerName;
      text = i18n.t('notifications.order.completedOrder');
      break;

    case 'order.vendor_finalized':
      name = vendorName;
      text = i18n.t('notifications.dispute.claimedPayment');
      break;

    case 'order.stale_warning':
      text = i18n.t('notifications.order.staleWarning');
      break;

    case 'order.expired':
      text = i18n.t('notifications.order.expired');
      break;

    default:
      text = type;
  }

  return { text, route, name };
}

function getDisputeNotificationDisplay(
  notification: DisputeNotificationData,
  currentUserId?: string
): NotificationDisplayData {
  const i18n = getI18n();
  const {
    type,
    orderID,
    caseID,
    disputerName: disputerNameVal,
    disputerID,
    disputeeName: disputeeNameVal,
    disputeeID,
    otherPartyName: otherPartyNameVal,
    otherPartyID,
    moderatorName: moderatorNameVal,
    buyer,
    buyerAccepted,
  } = notification;

  const disputerName = getDisplayName(disputerNameVal, disputerID);
  const disputeeName = getDisplayName(disputeeNameVal, disputeeID);
  const otherPartyName = getDisplayName(otherPartyNameVal, otherPartyID);
  const moderatorName = getDisplayName(moderatorNameVal);

  let text = '';
  let route = '';
  let name = '';

  switch (type) {
    case 'dispute.opened':
      name = disputerName;
      text = i18n.t('notifications.dispute.startedDispute');
      route =
        buyer === disputerID
          ? `/orders/purchases?orderID=${caseID || orderID}`
          : `/orders/sales?orderID=${caseID || orderID}`;
      break;

    case 'dispute.case_open':
      // 判断当前用户是争议方还是调解员
      if (disputeeID === currentUserId) {
        name = disputerName;
        text = i18n.t('notifications.dispute.openedCase');
        route = `/orders/${buyer === disputerID ? 'purchases' : 'sales'}?orderID=${caseID}`;
      } else {
        name = disputerName;
        text = i18n.t('notifications.dispute.modCaseOpened', { disputeeName });
        route = `/orders/cases?caseID=${caseID}`;
      }
      break;

    case 'dispute.case_update':
      name = moderatorName;
      text = i18n.t('notifications.dispute.caseUpdated');
      route = `/orders/cases?caseID=${caseID}`;
      break;

    case 'dispute.closed':
      name = otherPartyName;
      text = i18n.t('notifications.dispute.proposedOutcome');
      route =
        buyer === otherPartyID
          ? `/orders/purchases?orderID=${orderID}`
          : `/orders/sales?orderID=${orderID}`;
      break;

    case 'dispute.accepted':
      name = buyerAccepted ? getDisplayName(undefined, buyer) : disputeeName;
      text = i18n.t('notifications.dispute.acceptedPayout');
      route = `/orders/${buyer === otherPartyID ? 'purchases' : 'sales'}?orderID=${orderID}`;
      break;

    default:
      text = type;
      route = `/orders`;
  }

  return { text, route, name };
}

function getSocialNotificationDisplay(
  notification: SocialNotificationData
): NotificationDisplayData {
  const i18n = getI18n();
  const { type, handle, peerID } = notification;

  const name = getDisplayName(handle, peerID);
  const route = `/store/${peerID}`;

  let text = '';

  switch (type) {
    case 'social.follow':
      text = i18n.t('notifications.social.startedFollowing');
      break;

    case 'social.unfollow':
      text = i18n.t('notifications.social.unfollowed');
      break;

    case 'social.moderator_add':
      text = i18n.t('notifications.social.addedAsModerator');
      break;

    case 'social.moderator_remove':
      text = i18n.t('notifications.social.removedAsModerator');
      break;

    default:
      text = type;
  }

  return { text, route, name };
}

function getPaymentNotificationDisplay(
  notification: PaymentNotificationData
): NotificationDisplayData {
  const i18n = getI18n();
  const { type, orderID } = notification;
  const route = orderID ? `/orders/purchases?orderID=${orderID}` : '/orders';
  let text = '';

  switch (type) {
    case 'payment.locked':
      text = i18n.t('notifications.order.paymentLocked', {
        defaultValue: 'Payment has been locked',
      });
      break;
    case 'payment.expired':
      text = i18n.t('notifications.payment.expired', { defaultValue: 'Payment has expired' });
      break;
    case 'payment.cancelled':
      text = i18n.t('notifications.payment.cancelled', { defaultValue: 'Payment was cancelled' });
      break;
    default:
      text = type;
  }

  return { text, route };
}

export function getNotificationDisplayData(
  notification: NotificationData,
  options: {
    isBuyer?: boolean;
    currentUserId?: string;
  } = {}
): NotificationDisplayData {
  const { isBuyer = false, currentUserId } = options;

  if (isOrderNotification(notification)) {
    return getOrderNotificationDisplay(notification, isBuyer);
  }

  if (isDisputeNotification(notification)) {
    return getDisputeNotificationDisplay(notification, currentUserId);
  }

  if (isSocialNotification(notification)) {
    return getSocialNotificationDisplay(notification);
  }

  if (isPaymentNotification(notification)) {
    return getPaymentNotificationDisplay(notification);
  }

  return {
    text: (notification as NotificationData).type || 'notification',
    route: '/notifications',
  };
}

// ============ 服务类 ============

class NotificationService {
  private unsubscribeWebSocket: (() => void) | null = null;
  private initialized = false;
  private currentUserId: string | null = null;

  init(): void {
    if (this.initialized) return;
    soundService.init();
    this.subscribeToWebSocket();
    this.initialized = true;
  }

  setCurrentUserId(userId: string | null): void {
    this.currentUserId = userId;
  }

  private subscribeToWebSocket(): void {
    if (this.unsubscribeWebSocket) {
      this.unsubscribeWebSocket();
    }

    this.unsubscribeWebSocket = onWebSocketMessage((message: WebSocketMessage) => {
      this.handleWebSocketMessage(message.data as Record<string, unknown>);
    });
  }

  private handleWebSocketMessage(message: Record<string, unknown>): void {
    if (isNotificationWrapper(message)) {
      this.handleNotification(message.notification);
      return;
    }

    if (isChatMessage(message)) {
      const { chatMessage } = message;
      // subject 包含 order 关键字时判定为订单聊天（启发式规则）
      const isOrderChat = chatMessage.subject?.toLowerCase().includes('order');
      soundService.notifyChatMessage(chatMessage.peerID, isOrderChat);
      return;
    }
  }

  private static readonly ORDER_STATE_EVENTS = new Set([
    'order.funded',
    'order.confirmed',
    'order.declined',
    'order.cancelled',
    'order.refunded',
    'order.fulfilled',
    'order.completed',
    'order.vendor_finalized',
    'dispute.opened',
    'dispute.closed',
    'dispute.accepted',
  ]);

  private handleNotification(notification: NotificationData): void {
    const store = useNotificationStore.getState();
    store.addNotification(notification);

    // 订单状态变更事件：触发订单数据重新拉取（供 order hooks 使用）
    if (NotificationService.ORDER_STATE_EVENTS.has(notification.type)) {
      store.triggerOrderRefresh();
    }

    const soundType = eventTypeToSoundType(notification.type);
    soundService.notify(soundType);
  }

  addNotification(notification: NotificationData): void {
    this.handleNotification(notification);
  }

  getDisplayData(
    notification: NotificationData,
    options?: { isBuyer?: boolean }
  ): NotificationDisplayData {
    return getNotificationDisplayData(notification, {
      ...options,
      currentUserId: this.currentUserId || undefined,
    });
  }

  subscribe(): () => void {
    if (!this.initialized) {
      this.init();
    }
    // WebSocket 订阅是全局的，unsubscribe 目前无需额外清理
    return () => {};
  }

  dispose(): void {
    if (this.unsubscribeWebSocket) {
      this.unsubscribeWebSocket();
      this.unsubscribeWebSocket = null;
    }
    soundService.dispose();
    this.initialized = false;
  }
}

export const notificationService = new NotificationService();

export function initNotificationService(): void {
  notificationService.init();
}

export function subscribeToNotifications(): () => void {
  return notificationService.subscribe();
}

export default notificationService;
