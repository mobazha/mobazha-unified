/**
 * Matrix 服务类型定义
 */

// Matrix 事件类型
export const MATRIX_EVENTS = {
  CONNECTED: 'matrix_connected',
  DISCONNECTED: 'matrix_disconnected',
  MESSAGE_RECEIVED: 'matrix_message_received',
  MESSAGE_SENT: 'matrix_message_sent',
  MESSAGE_SENDING: 'matrix_message_sending',
  MESSAGE_FAILED: 'matrix_message_failed',
  READ_RECEIPT: 'matrix_read_receipt',
  ROOM_JOINED: 'matrix_room_joined',
  ROOM_LEFT: 'matrix_room_left',
  ROOM_INVITE: 'matrix_room_invite',
  ROOM_INVITE_PENDING: 'matrix_room_invite_pending',
  MEMBER_PEERID_UPDATED: 'matrix_member_peerid_updated',
  MEMBER_CHANGED: 'matrix_member_changed',
  TYPING: 'matrix_typing',
  PRESENCE_CHANGED: 'matrix_presence_changed',
  ERROR: 'matrix_error',
  // Verification events
  START_VERIFICATION: 'matrix_start_verification',
  VERIFICATION_REQUEST_RECEIVED: 'matrix_verification_request_received',
  VERIFICATION_STARTED: 'matrix_verification_started',
  VERIFICATION_SHOW_SAS: 'matrix_verification_show_sas',
  VERIFICATION_COMPLETED: 'matrix_verification_completed',
  VERIFICATION_CANCELLED: 'matrix_verification_cancelled',
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
  peerID?: string;
  isExternal?: boolean;
}

// Matrix 房间信息
export interface MatrixRoom {
  roomId: string;
  name?: string;
  topic?: string;
  avatarUrl?: string;
  isDirect: boolean;
  isEncrypted: boolean;
  lastMessage?: MatrixMessage;
  unreadCount: number;
  members: MatrixUser[];
  timestamp?: number;
}

// Matrix 消息
export interface MatrixMessage {
  id: string;
  localId?: string;
  roomId: string;
  sender: string;
  senderName?: string;
  senderAvatar?: string;
  content: string;
  type: MessageType;
  timestamp: number;
  status?: MessageStatus;
  isSystem?: boolean;
  replyTo?: string;
  attachments?: MatrixAttachment[];
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
