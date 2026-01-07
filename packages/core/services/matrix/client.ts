/**
 * Matrix 客户端服务
 * 核心聊天功能封装
 */

import type { MatrixConfig, MatrixRoom, MatrixMessage, InvitePolicy, MessageType, RoomType } from './types';
import { MATRIX_EVENTS, MESSAGE_STATUS } from './types';
import { matrixEvents } from './events';
import { saveCredentials, getCredentials, clearCredentials } from './storage';

// 默认配置
const DEFAULT_CONFIG: Partial<MatrixConfig> = {
  homeserverUrl: 'https://matrix.org',
};


/**
 * Matrix 客户端服务类
 */
class MatrixClientService {
  private client: unknown = null; // matrix-js-sdk client
  private config: MatrixConfig | null = null;
  private isInitialized = false;
  private isConnected = false;
  private _invitePolicy: InvitePolicy = 'auto_mobazha';
  private processedMessageIds = new Set<string>();

  /**
   * 初始化 Matrix 客户端
   */
  async initialize(config?: Partial<MatrixConfig>): Promise<boolean> {
    if (this.isInitialized) {
      console.warn('[Matrix] Already initialized');
      return true;
    }

    try {
      // 合并配置
      this.config = {
        ...DEFAULT_CONFIG,
        ...config,
      } as MatrixConfig;

      // 尝试从存储恢复凭据
      const stored = await getCredentials();
      if (stored.accessToken && stored.userId) {
        this.config.accessToken = stored.accessToken;
        this.config.userId = stored.userId;
        this.config.deviceId = stored.deviceId || undefined;
      }

      // 动态导入 matrix-js-sdk
      const sdk = await import('matrix-js-sdk');

      // 创建客户端
      this.client = sdk.createClient({
        baseUrl: this.config.homeserverUrl,
        accessToken: this.config.accessToken,
        userId: this.config.userId,
        deviceId: this.config.deviceId,
        useAuthorizationHeader: true,
      });

      // 设置事件监听
      this.setupEventListeners();

      this.isInitialized = true;
      console.log('[Matrix] Initialized successfully');

      return true;
    } catch (error) {
      console.error('[Matrix] Initialization failed:', error);
      return false;
    }
  }

  /**
   * 登录
   */
  async login(username: string, password: string): Promise<boolean> {
    if (!this.client) {
      throw new Error('Matrix client not initialized');
    }

    try {
      const sdk = await import('matrix-js-sdk');
      const matrixClient = this.client as InstanceType<typeof sdk.MatrixClient>;

      const response = await matrixClient.login('m.login.password', {
        user: username,
        password: password,
        initial_device_display_name: 'Mobazha Web',
      });

      // 保存凭据
      await saveCredentials(response.access_token, response.user_id, response.device_id);

      this.config = {
        ...this.config!,
        accessToken: response.access_token,
        userId: response.user_id,
        deviceId: response.device_id,
      };

      return true;
    } catch (error) {
      console.error('[Matrix] Login failed:', error);
      return false;
    }
  }

  /**
   * 登出
   */
  async logout(): Promise<void> {
    if (this.client) {
      try {
        const sdk = await import('matrix-js-sdk');
        const matrixClient = this.client as InstanceType<typeof sdk.MatrixClient>;
        await matrixClient.logout();
      } catch (error) {
        console.warn('[Matrix] Logout error:', error);
      }
    }

    await clearCredentials();
    this.client = null;
    this.isInitialized = false;
    this.isConnected = false;
    matrixEvents.emit(MATRIX_EVENTS.DISCONNECTED);
  }

  /**
   * 启动同步
   */
  async startSync(): Promise<void> {
    if (!this.client || !this.config?.accessToken) {
      throw new Error('Not logged in');
    }

    const sdk = await import('matrix-js-sdk');
    const matrixClient = this.client as InstanceType<typeof sdk.MatrixClient>;

    await matrixClient.startClient({
      initialSyncLimit: 20,
    });

    this.isConnected = true;
    matrixEvents.emit(MATRIX_EVENTS.CONNECTED);
  }

  /**
   * 停止同步
   */
  async stopSync(): Promise<void> {
    if (this.client) {
      const sdk = await import('matrix-js-sdk');
      const matrixClient = this.client as InstanceType<typeof sdk.MatrixClient>;
      matrixClient.stopClient();
    }
    this.isConnected = false;
    matrixEvents.emit(MATRIX_EVENTS.DISCONNECTED);
  }

  /**
   * 获取房间列表
   */
  async getRooms(): Promise<MatrixRoom[]> {
    if (!this.client) return [];

    const sdk = await import('matrix-js-sdk');
    const matrixClient = this.client as InstanceType<typeof sdk.MatrixClient>;
    const rooms = matrixClient.getRooms();

    return rooms.map(room => this.formatRoom(room));
  }

  /**
   * 获取房间消息
   */
  async getMessages(roomId: string, limit = 50): Promise<MatrixMessage[]> {
    if (!this.client) return [];

    const sdk = await import('matrix-js-sdk');
    const matrixClient = this.client as InstanceType<typeof sdk.MatrixClient>;
    const room = matrixClient.getRoom(roomId);

    if (!room) return [];

    const timeline = room.getLiveTimeline();
    const events = timeline.getEvents();

    return events
      .filter(event => event.getType() === 'm.room.message')
      .slice(-limit)
      .map(event => this.formatMessage(event, roomId));
  }

  /**
   * 发送文本消息
   */
  async sendMessage(roomId: string, content: string): Promise<MatrixMessage | null> {
    if (!this.client) return null;

    const localId = `local_${Date.now()}`;

    // 发送中状态
    matrixEvents.emit(MATRIX_EVENTS.MESSAGE_SENDING, { localId, roomId });

    try {
      const sdk = await import('matrix-js-sdk');
      const matrixClient = this.client as InstanceType<typeof sdk.MatrixClient>;

      const response = await matrixClient.sendMessage(roomId, {
        msgtype: sdk.MsgType.Text,
        body: content,
      });

      const message: MatrixMessage = {
        id: response.event_id,
        localId,
        roomId,
        sender: this.config!.userId!,
        content,
        type: 'text',
        timestamp: Date.now(),
        status: MESSAGE_STATUS.SENT,
      };

      matrixEvents.emit(MATRIX_EVENTS.MESSAGE_SENT, message);
      return message;
    } catch (error) {
      console.error('[Matrix] Send message failed:', error);
      matrixEvents.emit(MATRIX_EVENTS.MESSAGE_FAILED, { localId, roomId, error });
      return null;
    }
  }

  /**
   * 创建直接聊天房间
   */
  async createDirectRoom(userId: string, displayName?: string): Promise<string | null> {
    if (!this.client) return null;

    try {
      const sdk = await import('matrix-js-sdk');
      const matrixClient = this.client as InstanceType<typeof sdk.MatrixClient>;

      // 检查是否已有直接聊天
      const existingRoom = this.findDirectRoom(userId);
      if (existingRoom) return existingRoom;

      const response = await matrixClient.createRoom({
        is_direct: true,
        invite: [userId],
        name: displayName,
        preset: sdk.Preset.TrustedPrivateChat,
      });

      return response.room_id;
    } catch (error) {
      console.error('[Matrix] Create room failed:', error);
      return null;
    }
  }

  /**
   * 加入房间
   */
  async joinRoom(roomIdOrAlias: string): Promise<boolean> {
    if (!this.client) return false;

    try {
      const sdk = await import('matrix-js-sdk');
      const matrixClient = this.client as InstanceType<typeof sdk.MatrixClient>;
      await matrixClient.joinRoom(roomIdOrAlias);
      matrixEvents.emit(MATRIX_EVENTS.ROOM_JOINED, { roomId: roomIdOrAlias });
      return true;
    } catch (error) {
      console.error('[Matrix] Join room failed:', error);
      return false;
    }
  }

  /**
   * 离开房间
   */
  async leaveRoom(roomId: string): Promise<boolean> {
    if (!this.client) return false;

    try {
      const sdk = await import('matrix-js-sdk');
      const matrixClient = this.client as InstanceType<typeof sdk.MatrixClient>;
      await matrixClient.leave(roomId);
      matrixEvents.emit(MATRIX_EVENTS.ROOM_LEFT, { roomId });
      return true;
    } catch (error) {
      console.error('[Matrix] Leave room failed:', error);
      return false;
    }
  }

  /**
   * 设置邀请策略
   */
  setInvitePolicy(policy: InvitePolicy): void {
    this._invitePolicy = policy;
  }

  /**
   * 获取邀请策略
   */
  getInvitePolicy(): InvitePolicy {
    return this._invitePolicy;
  }

  /**
   * 检查是否已连接
   */
  isClientConnected(): boolean {
    return this.isConnected;
  }

  /**
   * 获取当前用户 ID
   */
  getUserId(): string | null {
    return this.config?.userId || null;
  }

  // ============ 订单讨论 ============

  /**
   * 创建订单讨论房间
   */
  async createOrderRoom(
    orderId: string,
    participants: string[],
    orderInfo?: { title?: string; vendorId?: string; buyerId?: string }
  ): Promise<string | null> {
    if (!this.client) return null;

    try {
      const sdk = await import('matrix-js-sdk');
      const matrixClient = this.client as InstanceType<typeof sdk.MatrixClient>;

      const roomName = orderInfo?.title
        ? `Order: ${orderInfo.title}`
        : `Order Discussion: ${orderId.slice(0, 8)}`;

      const response = await matrixClient.createRoom({
        name: roomName,
        topic: `Order discussion for ${orderId}`,
        invite: participants,
        preset: sdk.Preset.PrivateChat,
        initial_state: [
          {
            type: 'mobazha.room.type',
            content: { type: 'order', orderId },
            state_key: '',
          },
          {
            type: 'mobazha.order.info',
            content: {
              orderId,
              vendorId: orderInfo?.vendorId,
              buyerId: orderInfo?.buyerId,
            },
            state_key: '',
          },
        ],
      });

      return response.room_id;
    } catch (error) {
      console.error('[Matrix] Create order room failed:', error);
      return null;
    }
  }

  /**
   * 获取订单讨论房间
   */
  async getOrderRoom(orderId: string): Promise<MatrixRoom | null> {
    const rooms = await this.getRooms();
    return rooms.find(r => r.orderId === orderId) || null;
  }

  // ============ 店铺社区 ============

  /**
   * 创建店铺社区房间
   */
  async createStoreRoom(
    storeId: string,
    storeInfo: { name: string; description?: string; ownerId: string }
  ): Promise<string | null> {
    if (!this.client) return null;

    try {
      const sdk = await import('matrix-js-sdk');
      const matrixClient = this.client as InstanceType<typeof sdk.MatrixClient>;

      const response = await matrixClient.createRoom({
        name: `${storeInfo.name} Community`,
        topic: storeInfo.description || `Community chat for ${storeInfo.name}`,
        preset: sdk.Preset.PublicChat, // 公开房间
        visibility: sdk.Visibility.Public,
        initial_state: [
          {
            type: 'mobazha.room.type',
            content: { type: 'store', storeId },
            state_key: '',
          },
          {
            type: 'mobazha.store.info',
            content: {
              storeId,
              storeName: storeInfo.name,
              ownerId: storeInfo.ownerId,
            },
            state_key: '',
          },
        ],
      });

      return response.room_id;
    } catch (error) {
      console.error('[Matrix] Create store room failed:', error);
      return null;
    }
  }

  /**
   * 获取店铺社区房间
   */
  async getStoreRoom(storeId: string): Promise<MatrixRoom | null> {
    const rooms = await this.getRooms();
    return rooms.find(r => r.storeId === storeId) || null;
  }

  // ============ 仲裁讨论 ============

  /**
   * 创建仲裁讨论房间
   */
  async createModeratorRoom(
    orderId: string,
    moderatorId: string,
    participants: string[]
  ): Promise<string | null> {
    if (!this.client) return null;

    try {
      const sdk = await import('matrix-js-sdk');
      const matrixClient = this.client as InstanceType<typeof sdk.MatrixClient>;

      const response = await matrixClient.createRoom({
        name: `Dispute: ${orderId.slice(0, 8)}`,
        topic: `Dispute discussion for order ${orderId}`,
        invite: [moderatorId, ...participants],
        preset: sdk.Preset.TrustedPrivateChat,
        initial_state: [
          {
            type: 'mobazha.room.type',
            content: { type: 'moderator', orderId, moderatorId },
            state_key: '',
          },
        ],
      });

      return response.room_id;
    } catch (error) {
      console.error('[Matrix] Create moderator room failed:', error);
      return null;
    }
  }

  // ============ 群组聊天 ============

  /**
   * 创建群组聊天房间
   */
  async createGroupRoom(
    name: string,
    members: string[],
    options?: { topic?: string; isEncrypted?: boolean }
  ): Promise<string | null> {
    if (!this.client) return null;

    try {
      const sdk = await import('matrix-js-sdk');
      const matrixClient = this.client as InstanceType<typeof sdk.MatrixClient>;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const initialState: any[] = [
        {
          type: 'mobazha.room.type',
          content: { type: 'group' },
          state_key: '',
        },
      ];

      // 如果需要加密
      if (options?.isEncrypted) {
        initialState.push({
          type: 'm.room.encryption',
          content: { algorithm: 'm.megolm.v1.aes-sha2' },
          state_key: '',
        });
      }

      const response = await matrixClient.createRoom({
        name,
        topic: options?.topic,
        invite: members,
        preset: sdk.Preset.PrivateChat,
        initial_state: initialState,
      });

      return response.room_id;
    } catch (error) {
      console.error('[Matrix] Create group room failed:', error);
      return null;
    }
  }

  /**
   * 邀请用户到房间
   */
  async inviteToRoom(roomId: string, userId: string): Promise<boolean> {
    if (!this.client) return false;

    try {
      const sdk = await import('matrix-js-sdk');
      const matrixClient = this.client as InstanceType<typeof sdk.MatrixClient>;
      await matrixClient.invite(roomId, userId);
      return true;
    } catch (error) {
      console.error('[Matrix] Invite to room failed:', error);
      return false;
    }
  }

  /**
   * 踢出用户
   */
  async kickFromRoom(roomId: string, userId: string, reason?: string): Promise<boolean> {
    if (!this.client) return false;

    try {
      const sdk = await import('matrix-js-sdk');
      const matrixClient = this.client as InstanceType<typeof sdk.MatrixClient>;
      await matrixClient.kick(roomId, userId, reason);
      return true;
    } catch (error) {
      console.error('[Matrix] Kick from room failed:', error);
      return false;
    }
  }

  /**
   * 更新房间名称
   */
  async setRoomName(roomId: string, name: string): Promise<boolean> {
    if (!this.client) return false;

    try {
      const sdk = await import('matrix-js-sdk');
      const matrixClient = this.client as InstanceType<typeof sdk.MatrixClient>;
      await matrixClient.setRoomName(roomId, name);
      return true;
    } catch (error) {
      console.error('[Matrix] Set room name failed:', error);
      return false;
    }
  }

  /**
   * 更新房间主题
   */
  async setRoomTopic(roomId: string, topic: string): Promise<boolean> {
    if (!this.client) return false;

    try {
      const sdk = await import('matrix-js-sdk');
      const matrixClient = this.client as InstanceType<typeof sdk.MatrixClient>;
      await matrixClient.setRoomTopic(roomId, topic);
      return true;
    } catch (error) {
      console.error('[Matrix] Set room topic failed:', error);
      return false;
    }
  }

  /**
   * 发送正在输入状态
   */
  async sendTyping(roomId: string, isTyping: boolean, timeout = 5000): Promise<void> {
    if (!this.client) return;

    try {
      const sdk = await import('matrix-js-sdk');
      const matrixClient = this.client as InstanceType<typeof sdk.MatrixClient>;
      await matrixClient.sendTyping(roomId, isTyping, timeout);
    } catch (error) {
      console.warn('[Matrix] Send typing failed:', error);
    }
  }

  /**
   * 标记房间已读
   */
  async markRoomAsRead(roomId: string): Promise<boolean> {
    if (!this.client) return false;

    try {
      const sdk = await import('matrix-js-sdk');
      const matrixClient = this.client as InstanceType<typeof sdk.MatrixClient>;
      const room = matrixClient.getRoom(roomId);

      if (room) {
        const timeline = room.getLiveTimeline();
        const events = timeline.getEvents();
        if (events.length > 0) {
          const lastEvent = events[events.length - 1];
          await matrixClient.sendReadReceipt(lastEvent);
        }
      }
      return true;
    } catch (error) {
      console.error('[Matrix] Mark room as read failed:', error);
      return false;
    }
  }

  /**
   * 按类型获取房间
   */
  async getRoomsByType(type: 'direct' | 'group' | 'order' | 'store' | 'moderator'): Promise<MatrixRoom[]> {
    const rooms = await this.getRooms();
    return rooms.filter(r => {
      if (type === 'direct') return r.isDirect;
      return r.roomType === type;
    });
  }

  // ============ Private Methods ============

  /**
   * 设置事件监听器
   */
  private async setupEventListeners(): Promise<void> {
    if (!this.client) return;

    const sdk = await import('matrix-js-sdk');
    const matrixClient = this.client as InstanceType<typeof sdk.MatrixClient>;

    // 同步状态
    matrixClient.on(sdk.ClientEvent.Sync, (state: string) => {
      if (state === 'PREPARED') {
        this.isConnected = true;
        matrixEvents.emit(MATRIX_EVENTS.CONNECTED);
      } else if (state === 'ERROR' || state === 'STOPPED') {
        this.isConnected = false;
        matrixEvents.emit(MATRIX_EVENTS.DISCONNECTED);
      }
    });

    // 新消息
    matrixClient.on(sdk.RoomEvent.Timeline, (event, room) => {
      if (!room || event.getType() !== 'm.room.message') return;

      const eventId = event.getId();
      if (!eventId || this.processedMessageIds.has(eventId)) return;
      this.processedMessageIds.add(eventId);

      const message = this.formatMessage(event, room.roomId);
      matrixEvents.emit(MATRIX_EVENTS.MESSAGE_RECEIVED, message);
    });

    // 房间邀请
    matrixClient.on(sdk.RoomMemberEvent.Membership, (event, member) => {
      if (member.userId !== this.config?.userId) return;

      if (member.membership === 'invite') {
        matrixEvents.emit(MATRIX_EVENTS.ROOM_INVITE, {
          roomId: member.roomId,
          inviter: event.getSender(),
        });
      }
    });
  }

  /**
   * 查找已存在的直接聊天房间
   */
  private findDirectRoom(_userId: string): string | null {
    if (!this.client) return null;
    // TODO: 实现查找逻辑
    return null;
  }

  /**
   * 格式化房间数据
   */
  private formatRoom(room: unknown): MatrixRoom {
    const r = room as {
      roomId: string;
      name?: string;
      normalizedName?: string;
      getJoinedMembers?: () => unknown[];
      currentState?: {
        getStateEvents?: (type: string, stateKey?: string) => unknown;
      };
    };

    // 尝试获取房间类型
    let roomType: RoomType | undefined;
    let orderId: string | undefined;
    let storeId: string | undefined;
    let moderatorId: string | undefined;

    if (r.currentState?.getStateEvents) {
      try {
        const typeEvent = r.currentState.getStateEvents('mobazha.room.type', '') as {
          getContent?: () => { type?: string; orderId?: string; storeId?: string; moderatorId?: string };
        } | null;

        if (typeEvent?.getContent) {
          const content = typeEvent.getContent();
          roomType = content.type as RoomType;
          orderId = content.orderId;
          storeId = content.storeId;
          moderatorId = content.moderatorId;
        }
      } catch {
        // Ignore state event errors
      }
    }

    // 判断是否是直接聊天
    const isDirect = roomType === 'direct' || (!roomType && this.isDirectRoom(r.roomId));

    return {
      roomId: r.roomId,
      name: r.name || r.normalizedName,
      isDirect,
      isEncrypted: this.isRoomEncrypted(room),
      unreadCount: this.getRoomUnreadCount(room),
      members: [],
      roomType: roomType || (isDirect ? 'direct' : 'group'),
      orderId,
      storeId,
      moderatorId,
    };
  }

  /**
   * 检查是否是直接聊天房间
   */
  private isDirectRoom(_roomId: string): boolean {
    // TODO: 检查 m.direct 账户数据
    return false;
  }

  /**
   * 检查房间是否加密
   */
  private isRoomEncrypted(room: unknown): boolean {
    const r = room as {
      currentState?: {
        getStateEvents?: (type: string, stateKey?: string) => unknown;
      };
    };

    if (r.currentState?.getStateEvents) {
      try {
        const encryptionEvent = r.currentState.getStateEvents('m.room.encryption', '');
        return !!encryptionEvent;
      } catch {
        return false;
      }
    }
    return false;
  }

  /**
   * 获取房间未读消息数
   */
  private getRoomUnreadCount(room: unknown): number {
    const r = room as {
      getUnreadNotificationCount?: (type?: string) => number;
    };

    if (r.getUnreadNotificationCount) {
      return r.getUnreadNotificationCount('total') || 0;
    }
    return 0;
  }

  /**
   * 格式化消息数据
   */
  private formatMessage(event: unknown, roomId: string): MatrixMessage {
    const e = event as {
      getId: () => string;
      getSender: () => string;
      getContent: () => { body?: string; msgtype?: string };
      getTs: () => number;
    };

    const content = e.getContent();

    return {
      id: e.getId(),
      roomId,
      sender: e.getSender(),
      content: content.body || '',
      type: this.getMessageType(content.msgtype || 'm.text'),
      timestamp: e.getTs(),
    };
  }

  /**
   * 获取消息类型
   */
  private getMessageType(msgtype: string): MessageType {
    switch (msgtype) {
      case 'm.image':
        return 'image';
      case 'm.file':
        return 'file';
      case 'm.audio':
        return 'audio';
      case 'm.video':
        return 'video';
      case 'm.location':
        return 'location';
      default:
        return 'text';
    }
  }
}

// 导出单例
export const matrixClient = new MatrixClientService();
