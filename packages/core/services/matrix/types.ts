/**
 * Matrix 服务类型定义
 *
 * v1.2: 前端不再持有 matrix-js-sdk，所有类型为纯 JSON 数据结构。
 * 后端 mautrix-go 处理 E2EE 和 Matrix 协议，前端仅消费 REST + WS 数据。
 */

export const MATRIX_EVENTS = {
  CONNECTED: 'matrix_connected',
  DISCONNECTED: 'matrix_disconnected',
  SYNC_ERROR: 'matrix_sync_error',
  MESSAGE_RECEIVED: 'matrix_message_received',
  MESSAGE_UPDATED: 'matrix_message_updated',
  MESSAGE_SENT: 'matrix_message_sent',
  MESSAGE_SENDING: 'matrix_message_sending',
  MESSAGE_FAILED: 'matrix_message_failed',
  READ_RECEIPT: 'matrix_read_receipt',
  ROOM_JOINED: 'matrix_room_joined',
  ROOM_LEFT: 'matrix_room_left',
  ROOM_INVITE: 'matrix_room_invite',
  ROOM_INVITE_PENDING: 'matrix_room_invite_pending',
  ROOM_EVENT: 'matrix_room_event',
  MEMBER_PEERID_UPDATED: 'matrix_member_peerid_updated',
  MEMBER_CHANGED: 'matrix_member_changed',
  TYPING: 'matrix_typing',
  UPLOAD_PROGRESS: 'matrix_upload_progress',
  MESSAGE_EDITED: 'matrix_message_edited',
  MESSAGE_REACTION: 'matrix_message_reaction',
  ERROR: 'matrix_error',
  AUTH_REQUIRED: 'matrix_auth_required',
  VERIFICATION_REQUEST_RECEIVED: 'matrix_verification_request_received',
  VERIFICATION_READY: 'matrix_verification_ready',
  VERIFICATION_SHOW_SAS: 'matrix_verification_show_sas',
  VERIFICATION_STARTED: 'matrix_verification_started',
  VERIFICATION_COMPLETED: 'matrix_verification_completed',
  VERIFICATION_CANCELLED: 'matrix_verification_cancelled',
} as const;

export type MatrixEventType = (typeof MATRIX_EVENTS)[keyof typeof MATRIX_EVENTS];

export const MESSAGE_STATUS = {
  SENDING: 'sending',
  SENT: 'sent',
  DELIVERED: 'delivered',
  READ: 'read',
  FAILED: 'failed',
} as const;

export type MessageStatus = (typeof MESSAGE_STATUS)[keyof typeof MESSAGE_STATUS];

export interface MatrixConfig {
  homeserverUrl: string;
  userId?: string;
  accessToken?: string;
  deviceId?: string;
}

export interface MatrixUser {
  userId: string;
  displayName?: string;
  avatarUrl?: string;
  rawMxcAvatarUrl?: string;
  peerID?: string;
  isExternal?: boolean;
}

/** Room classification for UI filtering and metadata handling. */
export type RoomType =
  | 'direct' // 一对一聊天
  | 'group' // 群组聊天
  | 'order' // 订单讨论
  | 'store' // 店铺社区
  | 'moderator' // 仲裁讨论
  | 'community'; // 社区集市

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
  membership?: 'join' | 'invite' | 'leave' | 'ban' | 'knock';
  inviter?: string; // 邀请者用户 ID
  roomType?: RoomType;
  isExternal?: boolean; // 是否为外部 Matrix 房间
  memberPeerIDs?: Record<string, string>; // userId → 原始 peerID 映射
  orderId?: string; // 订单讨论关联的订单 ID
  storeId?: string; // 店铺社区关联的店铺 ID
  moderatorId?: string; // 仲裁讨论关联的仲裁人 ID
  metadata?: RoomMetadata;
}

export interface RoomMetadata {
  type?: string;
  orderId?: string;
  orderState?: string;
  buyerId?: string;
  vendorId?: string;
  direct_target_peer_id?: string;
  storeId?: string;
  storeName?: string;
  storeOwner?: string;
  disputeId?: string;
  moderatorId?: string;
  createdAt?: number;
  updatedAt?: number;
  customData?: Record<string, unknown>;
}

/** Room event sub-types for displaying membership / state changes in chat timeline. */
export type RoomEventType =
  | 'join'
  | 'leave'
  | 'invite'
  | 'kick'
  | 'ban'
  | 'unban'
  | 'name_change'
  | 'avatar_change'
  | 'room_name'
  | 'room_topic'
  | 'encryption'
  | 'room_created';

/**
 * Unified message model consumed by chat UI components.
 * Backend returns BackendMessage which is converted to this type in rooms.ts converter.
 * E2EE decryption is handled transparently by backend mautrix-go.
 */
export interface MatrixMessage {
  id: string; // Matrix event_id
  localId?: string; // 本地乐观发送 ID，WS 确认后清除
  roomId: string;
  sender: string; // Matrix user ID (@xxx:server)
  senderName?: string;
  senderAvatar?: string;
  senderRawMxcAvatarUrl?: string;
  content: string; // 纯文本内容（后端已解密）
  type: MessageType;
  timestamp: number; // Unix ms
  status?: MessageStatus;
  isSystem?: boolean; // 系统消息（成员变动等）
  replyTo?: string; // 被回复的 event_id
  attachments?: MatrixAttachment[];
  isEdited?: boolean;
  replacesEventId?: string; // 编辑消息替换的原始 event_id
  reactions?: Record<string, string[]>; // emoji → userId[]
  uploadProgress?: number; // 0-100 文件上传进度
  isRoomEvent?: boolean;
  roomEventType?: RoomEventType;
  targetUserId?: string; // 成员事件目标用户
  targetUserName?: string;
  metadata?: Record<string, string>;
  decryptionFailed?: boolean;
}

export type MessageType =
  | 'text'
  | 'image'
  | 'file'
  | 'audio'
  | 'video'
  | 'location'
  | 'system'
  | 'verification';

export interface MatrixAttachment {
  url: string;
  filename?: string;
  mimetype?: string;
  size?: number;
  width?: number;
  height?: number;
  thumbnailUrl?: string;
}

export type InvitePolicy = 'auto_all' | 'auto_mobazha' | 'always_confirm';

export type MatrixEventListener = (data: unknown) => void;

// ============ Backend Response Types ============

/** Backend chat status from GET /v1/chat/status */
export interface ChatStatusResponse {
  connected: boolean;
  userId?: string;
  deviceId?: string;
  serverName?: string;
  syncRunning: boolean;
}

/** Backend room from GET /v1/chat/rooms */
export interface BackendRoom {
  roomId: string;
  name: string;
  topic?: string;
  avatarUrl?: string;
  roomType: string;
  isDirect: boolean;
  members?: BackendMember[];
  lastMessage?: BackendMessage;
  unreadCount: number;
  encrypted: boolean;
  metadata?: Record<string, string>;
}

/** Backend member */
export interface BackendMember {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  peerID?: string;
  membership: string;
}

/**
 * Backend message from GET /v1/chat/rooms/{id}/messages.
 * msgType values: "m.text", "m.image", "m.file", "m.audio", "m.video", "m.location"
 * — mapped to frontend MessageType via mapMsgType() in messages.ts.
 */
export interface BackendMessage {
  id: string; // Matrix event_id
  roomId: string;
  sender: string; // Matrix user ID
  content: string; // 已解密的纯文本
  msgType: string; // Matrix 原始 msgtype (m.text 等)
  timestamp: string; // ISO 8601
  editedAt?: string; // 编辑时间（ISO 8601）
  replyTo?: string; // 被回复的 event_id
  media?: BackendMediaInfo;
  metadata?: Record<string, string>;
}

/** Backend media info */
export interface BackendMediaInfo {
  url: string;
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  filename: string;
  thumbnailUrl?: string;
}

/** Messages response with pagination */
export interface ChatMessagesResponse {
  messages: BackendMessage[];
  end?: string;
}
