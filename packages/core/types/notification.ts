/**
 * 通知类型定义
 *
 * 与后端 mobazha3.0/pkg/events/registry.go 对齐
 * 使用 dot-separated 命名格式：{category}.{action}
 */

// ============ 后端事件类型 ============

export type OrderNotificationType =
  | 'order.created'
  | 'order.funded'
  | 'order.payment_received'
  | 'order.confirmed'
  | 'order.declined'
  | 'order.cancelled'
  | 'order.refunded'
  | 'order.fulfilled'
  | 'order.completed'
  | 'order.vendor_finalized';

export type DisputeNotificationType =
  | 'dispute.opened'
  | 'dispute.closed'
  | 'dispute.accepted'
  | 'dispute.case_open'
  | 'dispute.case_update';

export type SocialNotificationType =
  | 'social.follow'
  | 'social.unfollow'
  | 'social.moderator_add'
  | 'social.moderator_remove';

export type PaymentNotificationType = 'payment.locked' | 'payment.expired' | 'payment.cancelled';

/**
 * 所有持久化通知事件类型（与后端 registry 对齐）
 */
export type NotificationEventType =
  | OrderNotificationType
  | DisputeNotificationType
  | SocialNotificationType
  | PaymentNotificationType;

/**
 * 通知类别
 */
export type NotificationCategory = 'order' | 'dispute' | 'social' | 'payment' | 'unknown';

// ============ 声音提醒类型 ============

export type SoundNotificationType =
  | 'chat_message'
  | 'order_chat'
  | 'new_order'
  | 'payment'
  | 'dispute'
  | 'order_complete';

export type SoundPriority = 'normal' | 'high' | 'urgent';

export interface SoundConfig {
  soundFile: string;
  priority: SoundPriority;
  cooldown: number; // ms
}

// ============ 通知数据接口 ============

export interface BaseNotificationData {
  id: string;
  type: NotificationEventType;
  timestamp: string;
  read: boolean;
}

export interface OrderNotificationData extends BaseNotificationData {
  type: OrderNotificationType;
  orderID: string;
  buyerID?: string;
  buyerHandle?: string;
  vendorID?: string;
  vendorHandle?: string;
  title?: string;
  slug?: string;
  thumbnail?: string;
}

export interface DisputeNotificationData extends BaseNotificationData {
  type: DisputeNotificationType;
  orderID?: string;
  caseID?: string;
  buyer?: string;
  disputerID?: string;
  disputerHandle?: string;
  disputeeID?: string;
  disputeeHandle?: string;
  otherPartyID?: string;
  otherPartyHandle?: string;
  moderatorID?: string;
  moderatorHandle?: string;
  buyerAccepted?: boolean;
  expiresIn?: number;
}

export interface SocialNotificationData extends BaseNotificationData {
  type: SocialNotificationType;
  peerID: string;
  handle?: string;
}

export interface PaymentNotificationData extends BaseNotificationData {
  type: PaymentNotificationType;
  orderID?: string;
  amount?: string;
  coinType?: string;
}

export type NotificationData =
  | OrderNotificationData
  | DisputeNotificationData
  | SocialNotificationData
  | PaymentNotificationData;

export interface NotificationRecord {
  id: string;
  notification: NotificationData;
  read: boolean;
  timestamp: string;
}

// ============ WebSocket 消息类型 ============

export interface NotificationWrapper {
  notification: NotificationData;
}

export interface ChatMessageWrapper {
  chatMessage: {
    messageId: string;
    peerID: string;
    subject: string;
    message: string;
    timestamp: string;
    read: boolean;
    outgoing: boolean;
  };
}

export interface MessageReadWrapper {
  messageRead: {
    messageId: string;
    peerID: string;
    subject: string;
  };
}

export interface MessageTypingWrapper {
  messageTyping: {
    peerID: string;
    subject: string;
  };
}

export interface WalletWrapper {
  wallet:
    | {
        block: {
          height: number;
          hash: string;
          timestamp: string;
        };
      }
    | {
        transaction: {
          txid: string;
          value: number;
          address: string;
          status: string;
          timestamp: string;
          confirmations: number;
        };
      };
}

export interface StatusWrapper {
  status: 'publishing' | 'publish complete' | 'error publishing';
}

export type WebSocketNotificationMessage =
  | NotificationWrapper
  | ChatMessageWrapper
  | MessageReadWrapper
  | MessageTypingWrapper
  | WalletWrapper
  | StatusWrapper;

// ============ 通知显示 ============

export interface NotificationDisplayData {
  text: string;
  route: string;
  name?: string;
}

// ============ 通知设置 ============

export interface NotificationSettings {
  soundEnabled: boolean;
  ttsEnabled: boolean;
  volume: number; // 0-1
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  soundEnabled: true,
  ttsEnabled: false,
  volume: 0.5,
};

// ============ 常量 ============

export const ORDER_NOTIFICATION_TYPES: OrderNotificationType[] = [
  'order.created',
  'order.funded',
  'order.payment_received',
  'order.confirmed',
  'order.declined',
  'order.cancelled',
  'order.refunded',
  'order.fulfilled',
  'order.completed',
  'order.vendor_finalized',
];

export const DISPUTE_NOTIFICATION_TYPES: DisputeNotificationType[] = [
  'dispute.opened',
  'dispute.closed',
  'dispute.accepted',
  'dispute.case_open',
  'dispute.case_update',
];

export const SOCIAL_NOTIFICATION_TYPES: SocialNotificationType[] = [
  'social.follow',
  'social.unfollow',
  'social.moderator_add',
  'social.moderator_remove',
];

export const PAYMENT_NOTIFICATION_TYPES: PaymentNotificationType[] = [
  'payment.locked',
  'payment.expired',
  'payment.cancelled',
];

export const SOUND_CONFIGS: Record<SoundNotificationType, SoundConfig> = {
  chat_message: {
    soundFile: 'notification.mp3',
    priority: 'normal',
    cooldown: 2000,
  },
  order_chat: {
    soundFile: 'order-chat.mp3',
    priority: 'high',
    cooldown: 1500,
  },
  new_order: {
    soundFile: 'new-order.mp3',
    priority: 'high',
    cooldown: 1500,
  },
  payment: {
    soundFile: 'payment.mp3',
    priority: 'high',
    cooldown: 1500,
  },
  dispute: {
    soundFile: 'dispute.mp3',
    priority: 'urgent',
    cooldown: 1000,
  },
  order_complete: {
    soundFile: 'complete.mp3',
    priority: 'normal',
    cooldown: 2000,
  },
};

// ============ 工具函数 ============

export function getNotificationCategory(type: NotificationEventType): NotificationCategory {
  const category = type.split('.')[0];
  if (
    category === 'order' ||
    category === 'dispute' ||
    category === 'social' ||
    category === 'payment'
  ) {
    return category;
  }
  return 'unknown';
}

export function isOrderNotification(
  notification: NotificationData
): notification is OrderNotificationData {
  return (ORDER_NOTIFICATION_TYPES as string[]).includes(notification.type);
}

export function isDisputeNotification(
  notification: NotificationData
): notification is DisputeNotificationData {
  return (DISPUTE_NOTIFICATION_TYPES as string[]).includes(notification.type);
}

export function isSocialNotification(
  notification: NotificationData
): notification is SocialNotificationData {
  return (SOCIAL_NOTIFICATION_TYPES as string[]).includes(notification.type);
}

export function isPaymentNotification(
  notification: NotificationData
): notification is PaymentNotificationData {
  return (PAYMENT_NOTIFICATION_TYPES as string[]).includes(notification.type);
}

const ALL_NOTIFICATION_TYPES: readonly string[] = [
  ...ORDER_NOTIFICATION_TYPES,
  ...DISPUTE_NOTIFICATION_TYPES,
  ...SOCIAL_NOTIFICATION_TYPES,
  ...PAYMENT_NOTIFICATION_TYPES,
];

export function isValidNotificationEventType(type: string): type is NotificationEventType {
  return ALL_NOTIFICATION_TYPES.includes(type);
}

export function normalizeNotificationType(type: string): NotificationEventType {
  if (isValidNotificationEventType(type)) {
    return type;
  }
  return 'social.follow';
}

export function eventTypeToSoundType(eventType: NotificationEventType): SoundNotificationType {
  switch (eventType) {
    case 'order.created':
      return 'new_order';
    case 'payment.locked':
    case 'order.payment_received':
    case 'order.funded':
      return 'payment';
    case 'dispute.opened':
    case 'dispute.case_open':
    case 'dispute.case_update':
    case 'dispute.closed':
    case 'dispute.accepted':
    case 'order.refunded':
    case 'order.vendor_finalized':
      return 'dispute';
    case 'order.completed':
    case 'order.fulfilled':
      return 'order_complete';
    default:
      return 'chat_message';
  }
}
