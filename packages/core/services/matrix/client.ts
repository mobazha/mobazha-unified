/**
 * Matrix 客户端服务
 * 核心聊天功能封装
 */

import type {
  MatrixConfig,
  MatrixUser,
  MatrixRoom,
  MatrixMessage,
  InvitePolicy,
  MessageType,
} from './types';
import { MATRIX_EVENTS, MESSAGE_STATUS } from './types';
import { matrixEvents } from './events';
import { getStorage, saveCredentials, getCredentials, clearCredentials } from './storage';

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
  private invitePolicy: InvitePolicy = 'auto_mobazha';
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
        msgtype: 'm.text',
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
        preset: 'trusted_private_chat',
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
    this.invitePolicy = policy;
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
      if (this.processedMessageIds.has(eventId)) return;
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
  private findDirectRoom(userId: string): string | null {
    if (!this.client) return null;
    // 实现查找逻辑
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
    };

    return {
      roomId: r.roomId,
      name: r.name || r.normalizedName,
      isDirect: true, // 简化处理
      isEncrypted: false, // 需要检查
      unreadCount: 0,
      members: [],
    };
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
