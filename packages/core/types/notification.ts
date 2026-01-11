/**
 * 通知类型定义
 *
 * 与后端 mobazha3.0/internal/notifications/notifier.go 对齐
 */

// ============ 后端事件类型 ============

/**
 * 订单相关通知类型
 */
export type OrderNotificationType =
  | 'newOrder' // 新订单
  | 'orderFunded' // 资金到账
  | 'orderPaymentReceived' // 收到付款
  | 'orderConfirmation' // 订单确认
  | 'orderDeclined' // 订单拒绝
  | 'orderCancel' // 订单取消
  | 'refund' // 退款
  | 'orderFulfillment' // 发货
  | 'orderCompletion'; // 订单完成

/**
 * 争议相关通知类型
 */
export type DisputeNotificationType =
  | 'disputeOpen' // 开启争议
  | 'caseOpen' // 案例开启
  | 'caseUpdate' // 案例更新
  | 'disputeClose' // 争议关闭
  | 'disputeAccepted' // 争议接受
  | 'vendorFinalizedPayment'; // 卖家最终付款

/**
 * 社交相关通知类型
 */
export type SocialNotificationType =
  | 'follow' // 关注
  | 'unfollow' // 取消关注
  | 'moderatorAdd' // 添加调解员
  | 'moderatorRemove'; // 移除调解员

/**
 * 所有通知事件类型（与后端对齐）
 */
export type NotificationEventType =
  | OrderNotificationType
  | DisputeNotificationType
  | SocialNotificationType;

/**
 * 通知类别
 */
export type NotificationCategory = 'order' | 'dispute' | 'peer' | 'unknown';

// ============ 声音提醒类型 ============

/**
 * 声音通知类型
 */
export type SoundNotificationType =
  | 'chat_message' // 普通聊天消息
  | 'order_chat' // 订单聊天消息
  | 'new_order' // 收到新订单
  | 'payment' // 收到付款
  | 'dispute' // 争议/退款
  | 'order_complete'; // 订单完成

/**
 * 声音优先级
 */
export type SoundPriority = 'normal' | 'high' | 'urgent';

/**
 * 声音配置
 */
export interface SoundConfig {
  soundFile: string;
  priority: SoundPriority;
  cooldown: number; // 冷却时间（毫秒）
}

// ============ 通知数据接口 ============

/**
 * 基础通知数据
 */
export interface BaseNotificationData {
  id: string;
  type: NotificationEventType;
  timestamp: string;
  read: boolean;
}

/**
 * 订单通知数据
 */
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

/**
 * 争议通知数据
 */
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

/**
 * 社交通知数据
 */
export interface SocialNotificationData extends BaseNotificationData {
  type: SocialNotificationType;
  peerID: string;
  handle?: string;
}

/**
 * 通用通知数据（联合类型）
 */
export type NotificationData =
  | OrderNotificationData
  | DisputeNotificationData
  | SocialNotificationData;

/**
 * API 返回的通知记录
 */
export interface NotificationRecord {
  id: string;
  notification: NotificationData;
  read: boolean;
  timestamp: string;
}

// ============ WebSocket 消息类型 ============

/**
 * WebSocket 通知消息包装
 */
export interface NotificationWrapper {
  notification: NotificationData;
}

/**
 * WebSocket 聊天消息
 */
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

/**
 * WebSocket 消息已读
 */
export interface MessageReadWrapper {
  messageRead: {
    messageId: string;
    peerID: string;
    subject: string;
  };
}

/**
 * WebSocket 正在输入
 */
export interface MessageTypingWrapper {
  messageTyping: {
    peerID: string;
    subject: string;
  };
}

/**
 * WebSocket 钱包消息
 */
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

/**
 * WebSocket 状态消息
 */
export interface StatusWrapper {
  status: 'publishing' | 'publish complete' | 'error publishing';
}

/**
 * 所有 WebSocket 消息类型
 */
export type WebSocketNotificationMessage =
  | NotificationWrapper
  | ChatMessageWrapper
  | MessageReadWrapper
  | MessageTypingWrapper
  | WalletWrapper
  | StatusWrapper;

// ============ 通知显示 ============

/**
 * 通知显示数据
 */
export interface NotificationDisplayData {
  text: string;
  route: string;
  name?: string;
}

// ============ 通知设置 ============

/**
 * 通知设置
 */
export interface NotificationSettings {
  soundEnabled: boolean;
  ttsEnabled: boolean;
  volume: number; // 0-1
}

/**
 * 默认通知设置
 */
export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  soundEnabled: true,
  ttsEnabled: false,
  volume: 0.5,
};

// ============ 常量 ============

/**
 * 订单通知类型列表
 */
export const ORDER_NOTIFICATION_TYPES: OrderNotificationType[] = [
  'newOrder',
  'orderFunded',
  'orderPaymentReceived',
  'orderConfirmation',
  'orderDeclined',
  'orderCancel',
  'refund',
  'orderFulfillment',
  'orderCompletion',
];

/**
 * 争议通知类型列表
 */
export const DISPUTE_NOTIFICATION_TYPES: DisputeNotificationType[] = [
  'disputeOpen',
  'caseOpen',
  'caseUpdate',
  'disputeClose',
  'disputeAccepted',
  'vendorFinalizedPayment',
];

/**
 * 社交通知类型列表
 */
export const SOCIAL_NOTIFICATION_TYPES: SocialNotificationType[] = [
  'follow',
  'unfollow',
  'moderatorAdd',
  'moderatorRemove',
];

/**
 * 声音配置映射
 */
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

// ============ 工具函数类型 ============

/**
 * 获取通知类别
 */
export function getNotificationCategory(type: NotificationEventType): NotificationCategory {
  if ((ORDER_NOTIFICATION_TYPES as string[]).includes(type)) {
    return 'order';
  }
  if ((DISPUTE_NOTIFICATION_TYPES as string[]).includes(type)) {
    return 'dispute';
  }
  if ((SOCIAL_NOTIFICATION_TYPES as string[]).includes(type)) {
    return 'peer';
  }
  return 'unknown';
}

/**
 * 判断是否为订单通知
 */
export function isOrderNotification(
  notification: NotificationData
): notification is OrderNotificationData {
  return (ORDER_NOTIFICATION_TYPES as string[]).includes(notification.type);
}

/**
 * 判断是否为争议通知
 */
export function isDisputeNotification(
  notification: NotificationData
): notification is DisputeNotificationData {
  return (DISPUTE_NOTIFICATION_TYPES as string[]).includes(notification.type);
}

/**
 * 判断是否为社交通知
 */
export function isSocialNotification(
  notification: NotificationData
): notification is SocialNotificationData {
  return (SOCIAL_NOTIFICATION_TYPES as string[]).includes(notification.type);
}

/**
 * API 简化分类类型
 */
export type ApiNotificationCategory =
  | 'order'
  | 'payment'
  | 'dispute'
  | 'moderator'
  | 'follow'
  | 'message'
  | 'system';

/**
 * API 分类到默认事件类型的映射
 * 用于处理从 API 返回的简化分类类型
 */
const API_CATEGORY_TO_EVENT_TYPE: Record<ApiNotificationCategory, NotificationEventType> = {
  order: 'newOrder',
  payment: 'orderPaymentReceived',
  dispute: 'disputeOpen',
  moderator: 'moderatorAdd',
  follow: 'follow',
  message: 'follow', // 消息类型暂时映射到 follow，因为没有专门的消息事件类型
  system: 'follow', // 系统通知暂时映射到 follow
};

/**
 * 检查是否为有效的通知事件类型
 */
export function isValidNotificationEventType(type: string): type is NotificationEventType {
  return (
    (ORDER_NOTIFICATION_TYPES as readonly string[]).includes(type) ||
    (DISPUTE_NOTIFICATION_TYPES as readonly string[]).includes(type) ||
    (SOCIAL_NOTIFICATION_TYPES as readonly string[]).includes(type)
  );
}

/**
 * 将 API 返回的类型转换为内部事件类型
 * 如果是有效的事件类型则直接使用，否则从分类映射转换
 */
export function normalizeNotificationType(type: string): NotificationEventType {
  // 如果已经是有效的事件类型，直接返回
  if (isValidNotificationEventType(type)) {
    return type;
  }

  // 否则尝试从 API 分类映射
  if (type in API_CATEGORY_TO_EVENT_TYPE) {
    return API_CATEGORY_TO_EVENT_TYPE[type as ApiNotificationCategory];
  }

  // 默认返回 follow
  return 'follow';
}

/**
 * 事件类型到声音类型的映射
 */
export function eventTypeToSoundType(eventType: NotificationEventType): SoundNotificationType {
  switch (eventType) {
    case 'newOrder':
      return 'new_order';
    case 'orderPaymentReceived':
    case 'orderFunded':
      return 'payment';
    case 'disputeOpen':
    case 'caseOpen':
    case 'caseUpdate':
    case 'disputeClose':
    case 'disputeAccepted':
    case 'refund':
    case 'vendorFinalizedPayment':
      return 'dispute';
    case 'orderCompletion':
    case 'orderFulfillment':
      return 'order_complete';
    default:
      return 'chat_message';
  }
}
