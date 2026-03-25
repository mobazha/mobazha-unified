/**
 * Matrix 服务类型定义
 */

// Matrix 事件类型
export const MATRIX_EVENTS = {
  CONNECTED: 'matrix_connected',
  DISCONNECTED: 'matrix_disconnected',
  SYNC_ERROR: 'matrix_sync_error',
  MESSAGE_RECEIVED: 'matrix_message_received',
  MESSAGE_UPDATED: 'matrix_message_updated', // 消息更新（如解密后更新）
  MESSAGE_SENT: 'matrix_message_sent',
  MESSAGE_SENDING: 'matrix_message_sending',
  MESSAGE_FAILED: 'matrix_message_failed',
  READ_RECEIPT: 'matrix_read_receipt',
  ROOM_JOINED: 'matrix_room_joined',
  ROOM_LEFT: 'matrix_room_left',
  ROOM_INVITE: 'matrix_room_invite',
  ROOM_INVITE_PENDING: 'matrix_room_invite_pending',
  ROOM_EVENT: 'matrix_room_event', // 房间事件（成员变更等）
  MEMBER_PEERID_UPDATED: 'matrix_member_peerid_updated',
  MEMBER_CHANGED: 'matrix_member_changed',
  TYPING: 'matrix_typing',
  PRESENCE_CHANGED: 'matrix_presence_changed',
  UPLOAD_PROGRESS: 'matrix_upload_progress',
  MESSAGE_EDITED: 'matrix_message_edited',
  MESSAGE_REACTION: 'matrix_message_reaction',
  ERROR: 'matrix_error',
  AUTH_REQUIRED: 'matrix_auth_required', // Token 过期需要重新登录
  // Verification events
  START_VERIFICATION: 'matrix_start_verification',
  VERIFICATION_REQUEST_RECEIVED: 'matrix_verification_request_received',
  VERIFICATION_STARTED: 'matrix_verification_started',
  VERIFICATION_SHOW_SAS: 'matrix_verification_show_sas',
  VERIFICATION_COMPLETED: 'matrix_verification_completed',
  VERIFICATION_CANCELLED: 'matrix_verification_cancelled',
  // Crypto events (for useCrypto hook)
  CRYPTO_VERIFICATION_REQUEST: 'crypto.verification_request',
  CRYPTO_VERIFICATION_DONE: 'crypto.verification_done',
  CRYPTO_VERIFICATION_CANCEL: 'crypto.verification_cancel',
  CRYPTO_DEVICE_VERIFIED: 'crypto.device_verified',
  CRYPTO_KEY_BACKUP_ENABLED: 'crypto.key_backup_enabled',
} as const;

export type MatrixEventType = (typeof MATRIX_EVENTS)[keyof typeof MATRIX_EVENTS];

// 消息状态
export const MESSAGE_STATUS = {
  SENDING: 'sending',
  SENT: 'sent',
  DELIVERED: 'delivered',
  READ: 'read',
  FAILED: 'failed',
} as const;

export type MessageStatus = (typeof MESSAGE_STATUS)[keyof typeof MESSAGE_STATUS];

// Matrix 配置
export interface MatrixConfig {
  homeserverUrl: string;
  userId?: string;
  accessToken?: string;
  deviceId?: string;
}

// Matrix 用户信息
export interface MatrixUser {
  userId: string;
  displayName?: string;
  avatarUrl?: string;
  rawMxcAvatarUrl?: string; // 原始 mxc:// URL，用于认证下载
  peerID?: string;
  isExternal?: boolean;
}

// 房间类型
export type RoomType =
  | 'direct' // 一对一聊天
  | 'group' // 群组聊天
  | 'order' // 订单讨论
  | 'store' // 店铺社区
  | 'moderator' // 仲裁讨论
  | 'community'; // 社区集市

// Matrix 房间信息
export interface MatrixRoom {
  roomId: string;
  name?: string;
  topic?: string;
  avatarUrl?: string;
  rawMxcAvatarUrl?: string; // 原始 mxc:// URL，用于认证下载
  isDirect: boolean;
  isEncrypted: boolean;
  lastMessage?: MatrixMessage;
  unreadCount: number;
  members: MatrixUser[];
  timestamp?: number;
  // 成员状态
  membership?: 'join' | 'invite' | 'leave' | 'ban' | 'knock';
  inviter?: string; // 邀请者用户ID
  // 扩展字段
  roomType?: RoomType;
  isExternal?: boolean; // 是否为外部 Matrix 房间
  memberPeerIDs?: Record<string, string>; // userId -> 原始 peerID 映射
  orderId?: string; // 订单讨论关联的订单 ID
  storeId?: string; // 店铺社区关联的店铺 ID
  moderatorId?: string; // 仲裁讨论关联的仲裁人 ID
  metadata?: RoomMetadata;
}

// 房间元数据
export interface RoomMetadata {
  // 订单相关
  orderId?: string;
  orderState?: string;
  buyerId?: string;
  vendorId?: string;
  // 店铺相关
  storeId?: string;
  storeName?: string;
  storeOwner?: string;
  // 仲裁相关
  disputeId?: string;
  moderatorId?: string;
  // 通用
  createdAt?: number;
  updatedAt?: number;
  customData?: Record<string, unknown>;
}

// 房间事件类型（用于显示成员变更等）
export type RoomEventType =
  | 'join' // 用户加入
  | 'leave' // 用户离开
  | 'invite' // 用户被邀请
  | 'kick' // 用户被踢出
  | 'ban' // 用户被禁止
  | 'unban' // 用户被解禁
  | 'name_change' // 用户改名
  | 'avatar_change' // 用户改头像
  | 'room_name' // 房间改名
  | 'room_topic' // 房间话题变更
  | 'encryption' // 启用加密
  | 'room_created'; // 房间创建

// Matrix 消息
export interface MatrixMessage {
  id: string;
  localId?: string;
  roomId: string;
  sender: string;
  senderName?: string;
  senderAvatar?: string;
  senderRawMxcAvatarUrl?: string; // 原始 mxc:// URL，用于认证下载
  content: string;
  type: MessageType;
  timestamp: number;
  status?: MessageStatus;
  isSystem?: boolean;
  replyTo?: string;
  attachments?: MatrixAttachment[];
  isEdited?: boolean;
  replacesEventId?: string;
  reactions?: Record<string, string[]>; // emoji -> [senderUserId, ...]
  // 房间事件相关
  uploadProgress?: number; // 0-100, only present during file/image upload
  isRoomEvent?: boolean;
  roomEventType?: RoomEventType;
  targetUserId?: string; // 被操作的用户（如被邀请/踢出的人）
  targetUserName?: string; // 被操作用户的显示名
}

// 消息类型
export type MessageType =
  | 'text'
  | 'image'
  | 'file'
  | 'audio'
  | 'video'
  | 'location'
  | 'system'
  | 'verification';

// 附件
export interface MatrixAttachment {
  url: string;
  filename?: string;
  mimetype?: string;
  size?: number;
  width?: number;
  height?: number;
  thumbnailUrl?: string;
}

// 邀请策略
export type InvitePolicy = 'auto_all' | 'auto_mobazha' | 'always_confirm';

// 验证状态
export interface VerificationState {
  isVerifying: boolean;
  targetUserId?: string;
  phase?: string;
  sasEmojis?: string[];
  sasDecimals?: number[];
}

// 用户验证状态
export interface UserVerificationStatus {
  userId: string;
  isVerified: boolean;
  isCrossSigningVerified: boolean;
  devices: DeviceVerificationStatus[];
}

// 设备验证状态
export interface DeviceVerificationStatus {
  deviceId: string;
  isVerified: boolean;
  displayName?: string;
}

// 社区信息
export interface Community {
  spaceId: string;
  name: string;
  topic?: string;
  avatarUrl?: string;
  ownerId: string;
  ownerPeerID?: string;
  accessMode: CommunityAccessMode;
  memberCount: number;
  chatRoomId?: string;
}

// 社区访问模式
export type CommunityAccessMode = 'public' | 'knock' | 'invite';

// Knock 请求
export interface KnockRequest {
  userId: string;
  displayName?: string;
  avatarUrl?: string;
  reason?: string;
  timestamp: number;
}

// 事件监听器
export type MatrixEventListener = (data: unknown) => void;

// 存储接口
export interface MatrixStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

// ============ E2E Crypto Types ============

// 加密配置
export interface CryptoConfig {
  keyBackupEnabled: boolean;
  crossSigningEnabled: boolean;
  autoVerifyOwnDevices: boolean;
}

// 设备信息
export interface DeviceInfo {
  deviceId: string;
  displayName: string;
  lastSeenIp?: string;
  lastSeenTs?: number;
  verified: boolean;
}

// 验证请求
export interface VerificationRequest {
  transactionId: string;
  userId: string;
  deviceId?: string;
  methods: string[];
  status: 'pending' | 'started' | 'cancelled' | 'done';
  timestamp: number;
  sasEmojis?: SasEmoji[];
  sasDecimals?: number[];
}

// SAS Emoji (用于验证显示)
export interface SasEmoji {
  emoji: string;
  description: string;
}

// 密钥备份信息
export interface KeyBackupInfo {
  version: string;
  algorithm: string;
  authData: Record<string, unknown>;
  count: number;
  etag: string;
}

// 交叉签名状态
export interface CrossSigningStatus {
  publicKeysOnDevice: boolean;
  privateKeysInStorage: boolean;
  privateKeysCachedLocally: {
    masterKey: boolean;
    selfSigningKey: boolean;
    userSigningKey: boolean;
  };
}

// 加密错误
export interface CryptoError {
  code: string;
  message: string;
  roomId?: string;
  deviceId?: string;
}

// 恢复密钥
export interface RecoveryKey {
  privateKey: Uint8Array;
  encodedKey: string;
}
