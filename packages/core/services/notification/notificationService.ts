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
} from '../../types/notification';
import {
  isOrderNotification,
  isDisputeNotification,
  isSocialNotification,
  eventTypeToSoundType,
} from '../../types/notification';
import { useNotificationStore } from '../../stores/notificationStore';
import { soundService } from './soundService';
import { onWebSocketMessage, type WebSocketMessage } from '../websocket';
import { getI18n } from '../../i18n/i18n';

// ============ 类型守卫 ============

/**
 * 检查是否为通知包装消息
 */
function isNotificationWrapper(
  message: unknown
): message is { notification: NotificationData } {
  return (
    typeof message === 'object' &&
    message !== null &&
    'notification' in message &&
    typeof (message as { notification: unknown }).notification === 'object'
  );
}

/**
 * 检查是否为聊天消息
 */
function isChatMessage(
  message: unknown
): message is { chatMessage: { messageId: string; peerID: string; subject: string } } {
  return (
    typeof message === 'object' &&
    message !== null &&
    'chatMessage' in message
  );
}

// ============ 显示文本生成 ============

/**
 * 获取用户显示名称
 */
function getDisplayName(handle?: string, peerId?: string): string {
  if (handle) {
    return `@${handle}`;
  }
  if (peerId) {
    return `${peerId.slice(0, 8)}…`;
  }
  return 'Unknown';
}

/**
 * 生成订单通知显示数据
 */
function getOrderNotificationDisplay(
  notification: OrderNotificationData,
  isBuyer: boolean
): NotificationDisplayData {
  const i18n = getI18n();
  const { type, orderID, buyerHandle, buyerID, vendorHandle, vendorID, title } = notification;

  const buyerName = getDisplayName(buyerHandle, buyerID);
  const vendorName = getDisplayName(vendorHandle, vendorID);
  const route = isBuyer
    ? `/orders/purchases?orderID=${orderID}`
    : `/orders/sales?orderID=${orderID}`;

  let text = '';
  let name = '';

  switch (type) {
    case 'newOrder':
      name = isBuyer ? '' : buyerName;
      text = isBuyer
        ? i18n.t('notifications.order.youPlacedOrder')
        : i18n.t('notifications.order.placedOrder');
      if (title) {
        text += ` - ${title}`;
      }
      break;

    case 'orderPaymentReceived':
      name = isBuyer ? '' : buyerName;
      text = isBuyer
        ? i18n.t('notifications.order.yourPaymentSent')
        : i18n.t('notifications.order.sentPayment');
      break;

    case 'orderFunded':
      text = i18n.t('notifications.order.orderFunded');
      break;

    case 'orderConfirmation':
      name = isBuyer ? vendorName : '';
      text = isBuyer
        ? i18n.t('notifications.order.acceptedYourOrder')
        : i18n.t('notifications.order.youAcceptedOrder');
      break;

    case 'orderDeclined':
      name = isBuyer ? vendorName : '';
      text = isBuyer
        ? i18n.t('notifications.order.declinedYourOrder')
        : i18n.t('notifications.order.youDeclinedOrder');
      break;

    case 'orderCancel':
      name = isBuyer ? '' : buyerName;
      text = isBuyer
        ? i18n.t('notifications.order.youCancelledOrder')
        : i18n.t('notifications.order.cancelledOrder');
      break;

    case 'refund':
      name = isBuyer ? vendorName : '';
      text = isBuyer
        ? i18n.t('notifications.order.refundedYourOrder')
        : i18n.t('notifications.order.youRefundedOrder');
      break;

    case 'orderFulfillment':
      name = isBuyer ? vendorName : '';
      text = isBuyer
        ? i18n.t('notifications.order.fulfilledYourOrder')
        : i18n.t('notifications.order.youFulfilledOrder');
      break;

    case 'orderCompletion':
      name = buyerName;
      text = i18n.t('notifications.order.completedOrder');
      break;

    default:
      text = type;
  }

  return { text, route, name };
}

/**
 * 生成争议通知显示数据
 */
function getDisputeNotificationDisplay(
  notification: DisputeNotificationData,
  currentUserId?: string
): NotificationDisplayData {
  const i18n = getI18n();
  const {
    type,
    orderID,
    caseID,
    disputerHandle,
    disputerID,
    disputeeHandle,
    disputeeID,
    otherPartyHandle,
    otherPartyID,
    moderatorHandle,
    buyer,
    buyerAccepted,
  } = notification;

  const disputerName = getDisplayName(disputerHandle, disputerID);
  const disputeeName = getDisplayName(disputeeHandle, disputeeID);
  const otherPartyName = getDisplayName(otherPartyHandle, otherPartyID);
  const moderatorName = getDisplayName(moderatorHandle);

  let text = '';
  let route = '';
  let name = '';

  switch (type) {
    case 'disputeOpen':
      name = disputerName;
      text = i18n.t('notifications.dispute.startedDispute');
      route = buyer === disputerID
        ? `/orders/purchases?orderID=${caseID || orderID}`
        : `/orders/sales?orderID=${caseID || orderID}`;
      break;

    case 'caseOpen':
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

    case 'caseUpdate':
      name = moderatorName;
      text = i18n.t('notifications.dispute.caseUpdated');
      route = `/orders/cases?caseID=${caseID}`;
      break;

    case 'disputeClose':
      name = otherPartyName;
      text = i18n.t('notifications.dispute.proposedOutcome');
      route = buyer === otherPartyID
        ? `/orders/purchases?orderID=${orderID}`
        : `/orders/sales?orderID=${orderID}`;
      break;

    case 'disputeAccepted':
      name = buyerAccepted ? getDisplayName(undefined, buyer) : disputeeName;
      text = i18n.t('notifications.dispute.acceptedPayout');
      route = `/orders/${buyer === otherPartyID ? 'purchases' : 'sales'}?orderID=${orderID}`;
      break;

    case 'vendorFinalizedPayment':
      name = disputeeName;
      text = i18n.t('notifications.dispute.claimedPayment');
      route = `/orders/purchases?orderID=${orderID}`;
      break;

    default:
      text = type;
      route = `/orders`;
  }

  return { text, route, name };
}

/**
 * 生成社交通知显示数据
 */
function getSocialNotificationDisplay(
  notification: SocialNotificationData
): NotificationDisplayData {
  const i18n = getI18n();
  const { type, handle, peerID } = notification;

  const name = getDisplayName(handle, peerID);
  const route = `/store/${peerID}`;

  let text = '';

  switch (type) {
    case 'follow':
      text = i18n.t('notifications.social.startedFollowing');
      break;

    case 'unfollow':
      text = i18n.t('notifications.social.unfollowed');
      break;

    case 'moderatorAdd':
      text = i18n.t('notifications.social.addedAsModerator');
      break;

    case 'moderatorRemove':
      text = i18n.t('notifications.social.removedAsModerator');
      break;

    default:
      text = type;
  }

  return { text, route, name };
}

/**
 * 生成通知显示数据
 */
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

  return {
    text: (notification as NotificationData).type || 'notification',
    route: '/notifications',
  };
}

// ============ 服务类 ============

/**
 * 通知服务类
 */
class NotificationService {
  private unsubscribeWebSocket: (() => void) | null = null;
  private initialized = false;
  private currentUserId: string | null = null;

  /**
   * 初始化服务
   */
  init(): void {
    if (this.initialized) return;

    // 初始化声音服务
    soundService.init();

    // 订阅 WebSocket 消息
    this.subscribeToWebSocket();

    this.initialized = true;
  }

  /**
   * 设置当前用户 ID
   */
  setCurrentUserId(userId: string | null): void {
    this.currentUserId = userId;
  }

  /**
   * 订阅 WebSocket 消息
   */
  private subscribeToWebSocket(): void {
    if (this.unsubscribeWebSocket) {
      this.unsubscribeWebSocket();
    }

    this.unsubscribeWebSocket = onWebSocketMessage((message: WebSocketMessage) => {
      this.handleWebSocketMessage(message.data as Record<string, unknown>);
    });
  }

  /**
   * 处理 WebSocket 消息
   */
  private handleWebSocketMessage(message: Record<string, unknown>): void {
    // 处理通知消息
    if (isNotificationWrapper(message)) {
      this.handleNotification(message.notification);
      return;
    }

    // 处理聊天消息
    if (isChatMessage(message)) {
      const { chatMessage } = message;
      // 检查是否为订单聊天（subject 格式通常包含 order ID）
      const isOrderChat = chatMessage.subject?.toLowerCase().includes('order');
      soundService.notifyChatMessage(chatMessage.peerID, isOrderChat);
      return;
    }

    // 其他消息类型暂不处理
  }

  /**
   * 处理通知
   */
  private handleNotification(notification: NotificationData): void {
    const store = useNotificationStore.getState();

    // 添加到 Store
    store.addNotification(notification);

    // 播放声音
    const soundType = eventTypeToSoundType(notification.type);
    soundService.notify(soundType);
  }

  /**
   * 手动添加通知（用于测试或手动触发）
   */
  addNotification(notification: NotificationData): void {
    this.handleNotification(notification);
  }

  /**
   * 获取通知显示数据
   */
  getDisplayData(
    notification: NotificationData,
    options?: { isBuyer?: boolean }
  ): NotificationDisplayData {
    return getNotificationDisplayData(notification, {
      ...options,
      currentUserId: this.currentUserId || undefined,
    });
  }

  /**
   * 订阅通知（返回取消订阅函数）
   */
  subscribe(): () => void {
    if (!this.initialized) {
      this.init();
    }

    // 返回取消订阅函数
    return () => {
      // 目前不需要做什么，因为 WebSocket 订阅是全局的
    };
  }

  /**
   * 清理资源
   */
  dispose(): void {
    if (this.unsubscribeWebSocket) {
      this.unsubscribeWebSocket();
      this.unsubscribeWebSocket = null;
    }
    soundService.dispose();
    this.initialized = false;
  }
}

// ============ 单例导出 ============

/** 通知服务单例 */
export const notificationService = new NotificationService();

/** 初始化通知服务 */
export function initNotificationService(): void {
  notificationService.init();
}

/** 订阅通知 */
export function subscribeToNotifications(): () => void {
  return notificationService.subscribe();
}

export default notificationService;
