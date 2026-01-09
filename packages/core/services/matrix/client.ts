/**
 * Matrix 客户端服务
 * 核心聊天功能封装
 */

import type {
  MatrixConfig,
  MatrixRoom,
  MatrixMessage,
  MatrixUser,
  InvitePolicy,
  MessageType,
  RoomType,
  RoomEventType,
} from './types';
import { MATRIX_EVENTS, MESSAGE_STATUS } from './types';
import { matrixEvents } from './events';
import {
  saveCredentials,
  getCredentials,
  clearCredentials,
  STORAGE_KEYS,
  getStorage,
} from './storage';
import {
  getMatrixConfig,
  getMatrixCredentials,
  saveMatrixCredentials,
  getDerivedPassword,
  autoRegisterMatrix,
} from '../api/matrix';

// 浏览器环境全局 API 声明

declare const indexedDB: typeof globalThis.indexedDB | undefined;

declare const localStorage: typeof globalThis.localStorage | undefined;

// 默认配置
const DEFAULT_CONFIG: Partial<MatrixConfig> = {
  homeserverUrl: 'https://matrix.org',
};

// 存储 key
const MATRIX_CRYPTO_DEVICE_KEY = 'matrix_crypto_device'; // 追踪哪个设备拥有 crypto store

// 自动备份间隔（5分钟）
const AUTO_BACKUP_INTERVAL = 5 * 60 * 1000;
// 备份防抖延迟（30秒）
const BACKUP_DEBOUNCE_DELAY = 30 * 1000;

/**
 * Matrix 客户端服务类
 */
class MatrixClientService {
  private client: unknown = null; // matrix-js-sdk client
  private config: MatrixConfig | null = null;
  private serverConfig: { homeserverURL: string; serverName: string } | null = null;
  private isInitialized = false;
  private isConnected = false;
  private _invitePolicy: InvitePolicy = 'auto_mobazha';
  private processedMessageIds = new Set<string>();
  private currentPeerID: string | null = null;
  private initializationPromise: Promise<boolean> | null = null;
  private backupDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private autoBackupTimer: ReturnType<typeof setInterval> | null = null;

  // ============= 初始化和认证 =============

  /**
   * 使用 peerID 初始化 Matrix 客户端（自动登录）
   * @param peerID 用户的 peerID
   */
  async initializeWithPeerID(peerID: string): Promise<boolean> {
    // 防止并发初始化
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    // 检查是否已经初始化为同一用户
    if (this.isInitialized && this.client && this.currentPeerID === peerID) {
      return true;
    }

    // 如果是不同用户，先登出
    if (this.isInitialized && this.currentPeerID !== peerID) {
      await this.logout();
    }

    this.initializationPromise = this._doInitializeWithPeerID(peerID);
    try {
      return await this.initializationPromise;
    } finally {
      this.initializationPromise = null;
    }
  }

  /**
   * 内部初始化逻辑
   */
  private async _doInitializeWithPeerID(peerID: string): Promise<boolean> {
    try {
      // 1. 获取 Matrix 服务器配置
      const config = await this._getServerConfig();
      if (!config) {
        throw new Error('Matrix is not enabled on this server');
      }

      // 2. 尝试获取或创建凭据
      let accessToken: string | null = null;
      let userId: string | null = null;
      let deviceId: string | null = null;

      // 先检查本地存储
      const stored = await getCredentials();
      const expectedUserId = `@peer_${peerID.toLowerCase()}:${config.serverName}`;

      if (stored.accessToken && stored.userId === expectedUserId) {
        // 验证本地存储的 token 是否仍然有效
        const isValid = await this._validateAccessToken(config.homeserverURL, stored.accessToken);
        if (isValid) {
          // 本地凭据有效
          accessToken = stored.accessToken;
          userId = stored.userId;
          deviceId = stored.deviceId;
          console.info('[Matrix] Using valid cached credentials');
        } else {
          // Token 已过期，清除并重新登录
          console.warn('[Matrix] Cached token expired, re-authenticating...');
          await clearCredentials();
          const credentials = await this._autoRegister(peerID, config);
          accessToken = credentials.accessToken;
          userId = credentials.userId;
          deviceId = credentials.deviceId;
        }
      } else {
        // 需要自动注册/登录
        const credentials = await this._autoRegister(peerID, config);
        accessToken = credentials.accessToken;
        userId = credentials.userId;
        deviceId = credentials.deviceId;
      }

      if (!accessToken || !userId) {
        throw new Error('Failed to obtain Matrix credentials');
      }

      // 3. 在创建客户端之前，确保 crypto store 与当前设备匹配
      if (deviceId) {
        await this._ensureCryptoStoreMatchesDevice(userId, deviceId);
      }

      // 4. 创建 Matrix 客户端
      const sdk = await import('matrix-js-sdk');
      this.client = sdk.createClient({
        baseUrl: config.homeserverURL,
        accessToken,
        userId,
        deviceId: deviceId || undefined,
        useAuthorizationHeader: true,
      });

      // 5. 初始化 E2EE 加密 (在 startClient 之前)
      const matrixClient = this.client as InstanceType<typeof sdk.MatrixClient>;
      try {
        console.info('[Matrix] Initializing E2EE crypto...');
        const cryptoDbPrefix = `matrix-crypto-${userId}`;
        await matrixClient.initRustCrypto({
          useIndexedDB: true,
          cryptoDatabasePrefix: cryptoDbPrefix,
        });
        console.info('[Matrix] E2EE crypto initialized successfully');

        // 标记当前设备为 crypto store 的所有者
        if (deviceId) {
          this._markCryptoStoreDevice(userId, deviceId);
        }
      } catch (cryptoError) {
        console.warn('[Matrix] E2EE crypto init failed (messages may not decrypt):', cryptoError);
        // 继续运行，但加密功能可能不可用
      }

      // 5. 设置事件监听
      this.setupEventListeners();

      this.config = {
        homeserverUrl: config.homeserverURL,
        accessToken,
        userId,
        deviceId: deviceId || undefined,
      };
      this.currentPeerID = peerID;
      this.isInitialized = true;

      return true;
    } catch (error) {
      console.error('[Matrix] Initialization with peerID failed:', error);
      matrixEvents.emit(MATRIX_EVENTS.ERROR, { error });
      return false;
    }
  }

  /**
   * 获取 Matrix 服务器配置
   */
  private async _getServerConfig(): Promise<{ homeserverURL: string; serverName: string } | null> {
    if (this.serverConfig) {
      return this.serverConfig;
    }

    try {
      const config = await getMatrixConfig();
      if (!config.enabled) {
        return null;
      }
      this.serverConfig = {
        homeserverURL: config.homeserverURL,
        serverName: config.serverName,
      };
      return this.serverConfig;
    } catch (error) {
      console.error('[Matrix] Failed to get server config:', error);
      return null;
    }
  }

  /**
   * 自动注册/登录
   */
  private async _autoRegister(
    peerID: string,
    config: { homeserverURL: string; serverName: string }
  ): Promise<{ accessToken: string; userId: string; deviceId: string }> {
    const deviceId = await this._getOrCreateDeviceId();

    // 尝试从节点获取凭据
    const nodeCredentials = await getMatrixCredentials();

    if (nodeCredentials?.registered && nodeCredentials.password) {
      // 已注册，使用密码登录
      const expectedUserId = `@peer_${peerID.toLowerCase()}:${config.serverName}`;

      // 检查凭据是否匹配当前用户
      if (nodeCredentials.matrixUserId?.toLowerCase() === expectedUserId.toLowerCase()) {
        try {
          const loginResponse = await this._loginWithPassword(
            config.homeserverURL,
            nodeCredentials.matrixUserId,
            nodeCredentials.password,
            deviceId
          );
          return loginResponse;
        } catch (error) {
          // 登录失败，尝试同步密码
          if ((error as { errcode?: string }).errcode === 'M_FORBIDDEN') {
            return this._syncPasswordAndLogin(peerID, config, deviceId);
          }
          throw error;
        }
      }
    }

    // 首次注册
    return this._registerNewUser(peerID, config, deviceId);
  }

  /**
   * 注册新用户
   */
  private async _registerNewUser(
    peerID: string,
    config: { homeserverURL: string; serverName: string },
    deviceId: string
  ): Promise<{ accessToken: string; userId: string; deviceId: string }> {
    // 获取派生密码
    const derivedPassword = await getDerivedPassword();

    // 通过 Hosting 注册
    const regResponse = await autoRegisterMatrix(peerID, derivedPassword || undefined);

    if (!regResponse.registered) {
      throw new Error('Registration failed');
    }

    // 使用密码登录获取 access token
    const loginResponse = await this._loginWithPassword(
      regResponse.homeServer,
      regResponse.userID,
      derivedPassword || '',
      deviceId
    );

    // 保存到节点
    await saveMatrixCredentials(loginResponse.userId, config.serverName);

    return loginResponse;
  }

  /**
   * 同步密码并登录
   */
  private async _syncPasswordAndLogin(
    peerID: string,
    config: { homeserverURL: string; serverName: string },
    deviceId: string
  ): Promise<{ accessToken: string; userId: string; deviceId: string }> {
    const derivedPassword = await getDerivedPassword();
    if (!derivedPassword) {
      throw new Error('Failed to get derived password');
    }

    // 同步密码
    const syncResponse = await autoRegisterMatrix(peerID, derivedPassword);
    if (!syncResponse.registered) {
      throw new Error('Password sync failed');
    }

    const loginResponse = await this._loginWithPassword(
      syncResponse.homeServer || config.homeserverURL,
      syncResponse.userID,
      derivedPassword,
      deviceId
    );

    // 更新节点凭据
    await saveMatrixCredentials(loginResponse.userId, config.serverName);

    return loginResponse;
  }

  /**
   * 使用密码登录
   */
  private async _loginWithPassword(
    homeserverUrl: string,
    userId: string,
    password: string,
    deviceId: string
  ): Promise<{ accessToken: string; userId: string; deviceId: string }> {
    const sdk = await import('matrix-js-sdk');
    const tempClient = sdk.createClient({ baseUrl: homeserverUrl });

    const response = await tempClient.login('m.login.password', {
      user: userId,
      password,
      device_id: deviceId,
      initial_device_display_name: 'Mobazha Web',
    });

    // 保存凭据到本地
    await saveCredentials(response.access_token, response.user_id, response.device_id);

    return {
      accessToken: response.access_token,
      userId: response.user_id,
      deviceId: response.device_id,
    };
  }

  /**
   * 获取或创建设备 ID
   */
  private async _getOrCreateDeviceId(): Promise<string> {
    const storage = getStorage();
    let deviceId = await storage.getItem(STORAGE_KEYS.DEVICE_ID);

    if (!deviceId) {
      const random = this._generateRandomString(8);
      deviceId = `MBZ_WEB_${random}`;
      await storage.setItem(STORAGE_KEYS.DEVICE_ID, deviceId);
    }

    return deviceId;
  }

  /**
   * 生成随机字符串
   */
  private _generateRandomString(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }
    return result;
  }

  /**
   * 验证 access token 是否有效
   * 通过调用 whoami API 来验证
   */
  private async _validateAccessToken(homeserverUrl: string, accessToken: string): Promise<boolean> {
    try {
      const response = await fetch(`${homeserverUrl}/_matrix/client/v3/account/whoami`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      return response.ok; // 200 表示 token 有效
    } catch (error) {
      console.warn('[Matrix] Token validation failed:', error);
      return false;
    }
  }

  /**
   * 初始化 Matrix 客户端（简单模式，使用现有凭据）
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
    // 停止自动备份
    this._stopAutoBackup();

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
    this.currentPeerID = null;
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

    // 返回一个 Promise，等待初始同步完成
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Sync timeout after 60s'));
      }, 60000);

      // 监听同步状态变化
      const onSync = async (state: string, _prevState: string | null, data?: unknown) => {
        switch (state) {
          case 'PREPARED':
            // 初始同步完成
            clearTimeout(timeout);
            this.isConnected = true;
            matrixEvents.emit(MATRIX_EVENTS.CONNECTED);
            // eslint-disable-next-line no-console
            console.info('[Matrix] Sync prepared, initial sync complete');

            // 执行 E2EE 密钥恢复（异步，不阻塞）
            this._setupE2EEAfterSync().catch(error => {
              console.warn('[Matrix] E2EE setup failed (non-fatal):', error);
            });

            resolve();
            break;
          case 'SYNCING':
            // 正在同步中
            this.isConnected = true;
            break;
          case 'ERROR':
            // 同步错误
            this.isConnected = false;
            matrixEvents.emit(MATRIX_EVENTS.SYNC_ERROR, { error: data });
            console.error('[Matrix] Sync error:', data);
            // 不要 reject，让同步继续重试
            break;
          case 'STOPPED':
            // 同步停止
            this.isConnected = false;
            matrixEvents.emit(MATRIX_EVENTS.DISCONNECTED);
            break;
        }
      };

      matrixClient.on(sdk.ClientEvent.Sync, onSync);

      // 开始同步
      matrixClient.startClient({
        initialSyncLimit: 20,
      });
    });
  }

  /**
   * Sync 完成后设置 E2EE（密钥恢复、cross-signing 等）
   */
  private async _setupE2EEAfterSync(): Promise<void> {
    if (!this.client) return;

    const sdk = await import('matrix-js-sdk');
    const matrixClient = this.client as InstanceType<typeof sdk.MatrixClient>;
    const { matrixCrypto } = await import('./crypto');
    const { getGatewayUrl, getAuthHeaders } = await import('../api/config');

    // 1. 初始化 crypto 服务
    // 使用 getGatewayUrl() 获取正确的节点 API 基础 URL（已包含 /v1 前缀）
    const nodeBaseUrl = getGatewayUrl();
    const authHeaders = getAuthHeaders();

    console.info('[Matrix] Setting up E2EE after sync...');
    console.info('[Matrix] Node base URL for key backup:', nodeBaseUrl);

    await matrixCrypto.initialize(matrixClient, {
      nodeBaseUrl,
      authHeaders,
    });

    // 2. 尝试恢复 secrets bundle（cross-signing keys）
    try {
      const hasSecretsBackup = await matrixCrypto.hasSecretsBundleBackup();
      if (hasSecretsBackup) {
        console.info('[Matrix] Found secrets bundle backup, restoring...');
        const secretsResult = await matrixCrypto.restoreSecretsBundle();
        if (secretsResult.success) {
          console.info('[Matrix] Restored cross-signing secrets from node');
        }
      }
    } catch (error) {
      console.warn('[Matrix] Secrets bundle restore failed:', error);
    }

    // 3. Bootstrap cross-signing（如果尚未设置）
    try {
      const crypto = matrixClient.getCrypto?.();
      if (crypto) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const cryptoAny = crypto as any;
        if (typeof cryptoAny.isCrossSigningReady === 'function') {
          const isCrossSigningReady = await cryptoAny.isCrossSigningReady();
          if (!isCrossSigningReady) {
            console.info('[Matrix] Setting up cross-signing...');
            if (typeof cryptoAny.bootstrapCrossSigning === 'function') {
              await cryptoAny.bootstrapCrossSigning({
                setupNewCrossSigning: true,
              });
              console.info('[Matrix] Cross-signing setup complete');
              // 备份新创建的密钥
              await matrixCrypto.backupSecretsBundle();
            }
          } else {
            console.info('[Matrix] Cross-signing already set up');
          }
        }
      }
    } catch (error) {
      console.warn('[Matrix] Cross-signing setup failed:', error);
    }

    // 4. 尝试恢复房间密钥
    try {
      const hasKeyBackup = await matrixCrypto.hasKeyBackup();
      if (hasKeyBackup) {
        console.info('[Matrix] Found key backup, restoring room keys...');
        const result = await matrixCrypto.restoreRoomKeys();
        if (result.success) {
          console.info(`[Matrix] Restored ${result.keyCount} room keys from backup`);
        }
      }
    } catch (error) {
      console.warn('[Matrix] Room key restore failed:', error);
    }

    // 5. 启动自动备份
    this._startAutoBackup();

    console.info('[Matrix] E2EE setup complete');
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
   * 获取房间消息（包含房间事件）
   */
  async getMessages(roomId: string, limit = 50): Promise<MatrixMessage[]> {
    if (!this.client) return [];

    const sdk = await import('matrix-js-sdk');
    const matrixClient = this.client as InstanceType<typeof sdk.MatrixClient>;
    const room = matrixClient.getRoom(roomId);

    if (!room) {
      console.warn('[Matrix] Room not found for getMessages:', roomId);
      return [];
    }

    const timeline = room.getLiveTimeline();
    let events = timeline.getEvents();

    // 调试：打印所有事件类型
    const eventTypeCounts: Record<string, number> = {};
    events.forEach(event => {
      const t = event.getType();
      eventTypeCounts[t] = (eventTypeCounts[t] || 0) + 1;
    });
    console.log('[Matrix] Timeline event types:', eventTypeCounts);

    // 过滤可显示的事件：消息、成员变更、房间创建、加密启用
    const displayableEventTypes = [
      'm.room.message',
      'm.room.member',
      'm.room.create',
      'm.room.encryption',
    ];
    let displayableEvents = events.filter(event => {
      const eventType = event.getType();
      if (!displayableEventTypes.includes(eventType)) return false;

      // 消息事件：过滤掉密钥验证消息
      if (eventType === 'm.room.message') {
        const msgtype = event.getContent()?.msgtype || '';
        if (msgtype.startsWith('m.key.verification')) return false;
      }

      return true;
    });

    // 如果初始 timeline 消息很少，尝试加载历史消息
    const paginationToken = timeline.getPaginationToken(sdk.Direction.Backward);
    if (displayableEvents.length < limit && paginationToken) {
      try {
        console.log('[Matrix] Initial timeline has few messages, loading history...');
        await matrixClient.paginateEventTimeline(timeline, { backwards: true, limit });

        // 重新获取事件
        events = timeline.getEvents();
        displayableEvents = events.filter(event => {
          const eventType = event.getType();
          if (!displayableEventTypes.includes(eventType)) return false;

          if (eventType === 'm.room.message') {
            const msgtype = event.getContent()?.msgtype || '';
            if (msgtype.startsWith('m.key.verification')) return false;
          }

          return true;
        });
        console.log('[Matrix] After pagination, event count:', displayableEvents.length);
      } catch (error) {
        console.warn('[Matrix] Failed to paginate initial timeline:', error);
      }
    }

    // 获取房间 state events（创建、加密）
    const stateEvents: MatrixMessage[] = [];

    // 房间创建事件
    const createEvent = room.currentState.getStateEvents('m.room.create', '');
    if (createEvent) {
      const formatted = this.formatTimelineEvent(createEvent, roomId);
      if (formatted) {
        stateEvents.push(formatted);
      }
    }

    // 加密启用事件
    const encryptionEvent = room.currentState.getStateEvents('m.room.encryption', '');
    if (encryptionEvent) {
      const formatted = this.formatTimelineEvent(encryptionEvent, roomId);
      if (formatted) {
        stateEvents.push(formatted);
      }
    }

    const timelineMessages = displayableEvents
      .slice(-limit)
      .map(event => this.formatTimelineEvent(event, roomId))
      .filter((msg): msg is MatrixMessage => msg !== null);

    // 合并 state events 和 timeline messages，按时间排序
    const allMessages = [...stateEvents, ...timelineMessages]
      .filter(
        (msg, index, self) =>
          // 去重
          index === self.findIndex(m => m.id === msg.id)
      )
      .sort((a, b) => a.timestamp - b.timestamp);

    console.log(
      '[Matrix] Returning messages:',
      allMessages.length,
      '(state:',
      stateEvents.length,
      ', timeline:',
      timelineMessages.length,
      ')'
    );
    return allMessages;
  }

  /**
   * 格式化 timeline 事件（包括消息和房间事件）
   */
  private formatTimelineEvent(event: unknown, roomId: string): MatrixMessage | null {
    const e = event as {
      getId: () => string;
      getType: () => string;
      getWireType?: () => string;
      getSender: () => string;
      getContent: () => Record<string, unknown>;
      getClearContent?: () => Record<string, unknown> | null;
      getPrevContent: () => Record<string, unknown>;
      getTs: () => number;
      getStateKey: () => string | undefined;
      isDecryptionFailure?: () => boolean;
    };

    const eventType = e.getType();
    const wireType = e.getWireType?.() || eventType;

    // 对于加密消息，使用 getClearContent 获取解密后的内容
    // 如果是加密消息但还没解密成功，getClearContent 会返回 null
    const isEncrypted = wireType === 'm.room.encrypted';
    const clearContent = isEncrypted ? e.getClearContent?.() : null;
    const content = clearContent || e.getContent();

    // 普通消息或已解密的加密消息
    if (eventType === 'm.room.message' || (isEncrypted && clearContent?.body)) {
      // 检查解密是否失败
      if (e.isDecryptionFailure?.()) {
        return {
          id: e.getId(),
          roomId,
          sender: e.getSender(),
          content: '⚠️ Unable to decrypt message',
          type: 'text',
          timestamp: e.getTs(),
          isSystem: true,
        };
      }

      return {
        id: e.getId(),
        roomId,
        sender: e.getSender(),
        content: (content.body as string) || '',
        type: this.getMessageType((content.msgtype as string) || 'm.text'),
        timestamp: e.getTs(),
      };
    }

    // 加密消息但尚未解密（可能还在解密中）
    if (isEncrypted && !clearContent) {
      // 检查是否是解密失败
      if (e.isDecryptionFailure?.()) {
        return {
          id: e.getId(),
          roomId,
          sender: e.getSender(),
          content: '⚠️ Unable to decrypt message',
          type: 'text',
          timestamp: e.getTs(),
          isSystem: true,
        };
      }
      // 消息可能还在解密中，返回占位符
      return {
        id: e.getId(),
        roomId,
        sender: e.getSender(),
        content: '🔐 Decrypting...',
        type: 'text',
        timestamp: e.getTs(),
        isSystem: true,
      };
    }

    // 房间创建事件
    if (eventType === 'm.room.create') {
      const creator = e.getSender();
      return {
        id: e.getId(),
        roomId,
        sender: creator,
        content: `${this.extractDisplayName(creator)} created this DM`,
        type: 'text',
        timestamp: e.getTs(),
        isSystem: true,
        isRoomEvent: true,
        roomEventType: 'room_created',
      };
    }

    // 加密启用事件
    if (eventType === 'm.room.encryption') {
      return {
        id: e.getId(),
        roomId,
        sender: e.getSender(),
        content: `${this.extractDisplayName(e.getSender())} enabled end-to-end encryption`,
        type: 'text',
        timestamp: e.getTs(),
        isSystem: true,
        isRoomEvent: true,
        roomEventType: 'encryption',
      };
    }

    // 成员变更事件
    if (eventType === 'm.room.member') {
      const targetUserId = e.getStateKey();
      if (!targetUserId) return null;

      const membership = content.membership as string;
      const prevContent = e.getPrevContent();
      const prevMembership = prevContent?.membership as string | undefined;
      const displayName = (content.displayname as string) || this.extractDisplayName(targetUserId);
      const sender = e.getSender();

      let eventText = '';
      let roomEventType: RoomEventType | null = null;

      // 确定事件类型和文本
      if (membership === 'join') {
        if (prevMembership === 'invite') {
          eventText = `${displayName} joined the room`;
          roomEventType = 'join';
        } else if (prevMembership === 'join') {
          // 资料变更
          const prevDisplayName = prevContent?.displayname as string | undefined;
          if (displayName !== prevDisplayName && prevDisplayName) {
            eventText = `${prevDisplayName} changed their name to ${displayName}`;
            roomEventType = 'name_change';
          } else {
            return null; // 其他变更不显示
          }
        } else {
          eventText = `${displayName} joined the room`;
          roomEventType = 'join';
        }
      } else if (membership === 'leave') {
        if (sender === targetUserId) {
          eventText = `${displayName} left the room`;
          roomEventType = 'leave';
        } else {
          eventText = `${this.extractDisplayName(sender)} kicked ${displayName}`;
          roomEventType = 'kick';
        }
      } else if (membership === 'invite') {
        eventText = `${this.extractDisplayName(sender)} invited ${displayName}`;
        roomEventType = 'invite';
      } else if (membership === 'ban') {
        eventText = `${this.extractDisplayName(sender)} banned ${displayName}`;
        roomEventType = 'ban';
      } else {
        return null; // 不显示其他成员状态
      }

      if (!eventText || !roomEventType) return null;

      return {
        id: e.getId(),
        roomId,
        sender,
        content: eventText,
        type: 'text',
        timestamp: e.getTs(),
        isSystem: true,
        isRoomEvent: true,
        roomEventType,
        targetUserId,
        targetUserName: displayName,
      };
    }

    return null;
  }

  /**
   * 从 userId 提取显示名
   */
  private extractDisplayName(userId: string): string {
    // @peer_xxx:matrix.mobazha.org -> xxx 的前几位
    const match = userId.match(/@(?:peer_)?([^:]+):/);
    if (match) {
      const name = match[1];
      // 如果名字太长，截取前 8 位
      return name.length > 12 ? name.substring(0, 8) + '...' : name;
    }
    return userId;
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

      // 触发密钥备份（防抖）
      this._scheduleKeyBackup();

      return message;
    } catch (error) {
      console.error('[Matrix] Send message failed:', error);
      matrixEvents.emit(MATRIX_EVENTS.MESSAGE_FAILED, { localId, roomId, error });
      return null;
    }
  }

  /**
   * 调度密钥备份（防抖，避免频繁备份）
   */
  private _scheduleKeyBackup(): void {
    // 清除之前的定时器
    if (this.backupDebounceTimer) {
      clearTimeout(this.backupDebounceTimer);
    }

    // 延迟备份
    this.backupDebounceTimer = setTimeout(async () => {
      try {
        const { matrixCrypto } = await import('./crypto');
        if (matrixCrypto.isCryptoInitialized()) {
          console.info('[Matrix] Running scheduled key backup...');
          const result = await matrixCrypto.backupRoomKeys();
          if (result.success) {
            console.info(`[Matrix] Backed up ${result.keyCount} room keys`);
          }
        }
      } catch (error) {
        console.warn('[Matrix] Scheduled key backup failed:', error);
      }
    }, BACKUP_DEBOUNCE_DELAY);
  }

  /**
   * 启动自动定期备份
   */
  private _startAutoBackup(): void {
    // 清除旧的定时器
    if (this.autoBackupTimer) {
      clearInterval(this.autoBackupTimer);
    }

    // 每隔一段时间自动备份
    this.autoBackupTimer = setInterval(async () => {
      try {
        const { matrixCrypto } = await import('./crypto');
        if (matrixCrypto.isCryptoInitialized()) {
          const result = await matrixCrypto.backupRoomKeys();
          if (result.success && result.keyCount && result.keyCount > 0) {
            console.info(`[Matrix] Auto-backup: ${result.keyCount} room keys`);
          }
        }
      } catch (error) {
        console.warn('[Matrix] Auto-backup failed:', error);
      }
    }, AUTO_BACKUP_INTERVAL);
  }

  /**
   * 停止自动备份
   */
  private _stopAutoBackup(): void {
    if (this.autoBackupTimer) {
      clearInterval(this.autoBackupTimer);
      this.autoBackupTimer = null;
    }
    if (this.backupDebounceTimer) {
      clearTimeout(this.backupDebounceTimer);
      this.backupDebounceTimer = null;
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
      const existingRoom = await this.findDirectRoom(userId);
      if (existingRoom) return existingRoom;

      const response = await matrixClient.createRoom({
        is_direct: true,
        invite: [userId],
        name: displayName,
        preset: sdk.Preset.TrustedPrivateChat,
      });

      // 更新 m.direct 账户数据
      await this._updateDirectRoomMapping(userId, response.room_id);

      return response.room_id;
    } catch (error) {
      console.error('[Matrix] Create room failed:', error);
      return null;
    }
  }

  /**
   * 更新 m.direct 账户数据
   */
  private async _updateDirectRoomMapping(userId: string, roomId: string): Promise<void> {
    if (!this.client) return;

    try {
      const sdk = await import('matrix-js-sdk');
      const matrixClient = this.client as InstanceType<typeof sdk.MatrixClient>;

      // 获取当前 m.direct 数据
      // 使用类型断言因为 'm.direct' 不在标准 AccountDataEvents 类型中
      const directEvent = (
        matrixClient as unknown as {
          getAccountData: (type: string) => { getContent: () => Record<string, string[]> } | null;
        }
      ).getAccountData('m.direct');
      const directContent: Record<string, string[]> = directEvent?.getContent() || {};

      // 添加新的映射
      if (!directContent[userId]) {
        directContent[userId] = [];
      }
      if (!directContent[userId].includes(roomId)) {
        directContent[userId].push(roomId);
      }

      // 保存更新
      await (
        matrixClient as unknown as {
          setAccountData: (type: string, content: Record<string, string[]>) => Promise<void>;
        }
      ).setAccountData('m.direct', directContent);
    } catch (error) {
      console.warn('[Matrix] Failed to update m.direct:', error);
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
  async getRoomsByType(
    type: 'direct' | 'group' | 'order' | 'store' | 'moderator'
  ): Promise<MatrixRoom[]> {
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

    // 房间成员变化
    matrixClient.on(sdk.RoomMemberEvent.Membership, (event, member) => {
      const roomId = member.roomId;
      const senderId = event.getSender();
      const targetUserId = member.userId;
      const membership = member.membership;
      const prevMembership = event.getPrevContent()?.membership;

      // 处理当前用户收到的邀请
      if (targetUserId === this.config?.userId && membership === 'invite') {
        matrixEvents.emit(MATRIX_EVENTS.ROOM_INVITE, {
          roomId,
          inviter: senderId,
        });
      }

      // 发出房间事件用于时间线显示
      const roomEvent = this.formatMembershipEvent(event, member, prevMembership);
      if (roomEvent) {
        matrixEvents.emit(MATRIX_EVENTS.ROOM_EVENT, roomEvent);
      }
    });

    // 在线状态变化
    matrixClient.on(sdk.UserEvent.Presence, (_event, user) => {
      if (!user) return;
      const userId = user.userId;
      const presence = user.presence as 'online' | 'offline' | 'unavailable';
      matrixEvents.emit(MATRIX_EVENTS.PRESENCE_CHANGED, { userId, presence });
    });
  }

  /**
   * 查找已存在的直接聊天房间
   */
  private async findDirectRoom(userId: string): Promise<string | null> {
    if (!this.client) return null;

    try {
      const sdk = await import('matrix-js-sdk');
      const matrixClient = this.client as InstanceType<typeof sdk.MatrixClient>;

      // 获取 m.direct 账户数据
      // 使用类型断言因为 'm.direct' 不在标准 AccountDataEvents 类型中
      const directEvent = (
        matrixClient as unknown as {
          getAccountData: (type: string) => { getContent: () => Record<string, string[]> } | null;
        }
      ).getAccountData('m.direct');
      if (!directEvent) return null;

      const directContent = directEvent.getContent();
      const roomIds = directContent[userId];

      if (!roomIds || roomIds.length === 0) return null;

      // 返回第一个有效的房间
      for (const roomId of roomIds) {
        const room = matrixClient.getRoom(roomId);
        if (room && room.getMyMembership() === 'join') {
          return roomId;
        }
      }

      return null;
    } catch (error) {
      console.warn('[Matrix] Failed to find direct room:', error);
      return null;
    }
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
          getContent?: () => {
            type?: string;
            orderId?: string;
            storeId?: string;
            moderatorId?: string;
          };
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

    // 获取房间成员
    const members = this.getRoomMembers(room);

    return {
      roomId: r.roomId,
      name: r.name || r.normalizedName,
      isDirect,
      isEncrypted: this.isRoomEncrypted(room),
      unreadCount: this.getRoomUnreadCount(room),
      members,
      roomType: roomType || (isDirect ? 'direct' : 'group'),
      orderId,
      storeId,
      moderatorId,
    };
  }

  /**
   * 获取房间成员列表
   */
  private getRoomMembers(room: unknown): MatrixUser[] {
    const r = room as {
      getJoinedMembers?: () => Array<{
        userId: string;
        name?: string;
        getAvatarUrl?: (
          baseUrl: string,
          width: number,
          height: number,
          resizeMethod: string,
          allowDefault: boolean
        ) => string | null;
      }>;
    };

    if (!r.getJoinedMembers) return [];

    try {
      const members = r.getJoinedMembers();
      return members
        .filter(m => m.userId !== this.config?.userId) // 排除自己
        .map(m => ({
          userId: m.userId,
          displayName: m.name,
          avatarUrl:
            m.getAvatarUrl?.(this.config?.homeserverUrl || '', 40, 40, 'crop', false) || undefined,
        }));
    } catch {
      return [];
    }
  }

  /**
   * 检查是否是直接聊天房间
   */
  private isDirectRoom(roomId: string): boolean {
    if (!this.client) return false;

    try {
      // 同步方式检查 - 避免 async 问题
      const matrixClient = this.client as {
        getAccountData?: (type: string) => { getContent: () => Record<string, string[]> } | null;
      };

      if (!matrixClient.getAccountData) return false;

      const directEvent = matrixClient.getAccountData('m.direct');
      if (!directEvent) return false;

      const directContent = directEvent.getContent();

      // 检查任何用户的直接聊天列表是否包含此房间
      for (const roomIds of Object.values(directContent)) {
        if (roomIds.includes(roomId)) {
          return true;
        }
      }

      return false;
    } catch {
      return false;
    }
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
      getType: () => string;
      getWireType?: () => string;
      getContent: () => { body?: string; msgtype?: string };
      getClearContent?: () => { body?: string; msgtype?: string } | null;
      getTs: () => number;
      isDecryptionFailure?: () => boolean;
    };

    const wireType = e.getWireType?.() || e.getType();
    const isEncrypted = wireType === 'm.room.encrypted';

    // 对于加密消息，使用 getClearContent 获取解密后的内容
    const clearContent = isEncrypted ? e.getClearContent?.() : null;
    const content = clearContent || e.getContent();

    // 检查解密是否失败
    if (e.isDecryptionFailure?.()) {
      return {
        id: e.getId(),
        roomId,
        sender: e.getSender(),
        content: '⚠️ Unable to decrypt message',
        type: 'text',
        timestamp: e.getTs(),
        isSystem: true,
      };
    }

    // 加密消息但尚未解密
    if (isEncrypted && !clearContent?.body) {
      return {
        id: e.getId(),
        roomId,
        sender: e.getSender(),
        content: '🔐 Decrypting...',
        type: 'text',
        timestamp: e.getTs(),
        isSystem: true,
      };
    }

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
   * 格式化成员事件为 MatrixMessage
   */
  private formatMembershipEvent(
    event: unknown,
    member: unknown,
    prevMembership?: string
  ): MatrixMessage | null {
    const e = event as {
      getId: () => string;
      getSender: () => string;
      getTs: () => number;
      getContent: () => { displayname?: string; avatar_url?: string };
      getPrevContent: () => { displayname?: string; avatar_url?: string; membership?: string };
    };
    const m = member as {
      roomId: string;
      userId: string;
      name?: string;
      membership: string;
    };

    const senderId = e.getSender();
    const targetUserId = m.userId;
    const membership = m.membership;
    const content = e.getContent();
    const prevContent = e.getPrevContent();

    // 确定事件类型
    let roomEventType: RoomEventType | null = null;
    let displayContent = '';

    switch (membership) {
      case 'join':
        if (prevMembership === 'join') {
          // 资料变更
          if (content.displayname !== prevContent.displayname) {
            roomEventType = 'name_change';
            displayContent = content.displayname || '';
          } else if (content.avatar_url !== prevContent.avatar_url) {
            roomEventType = 'avatar_change';
          } else {
            return null; // 无变化，不显示
          }
        } else {
          roomEventType = 'join';
        }
        break;

      case 'invite':
        roomEventType = 'invite';
        break;

      case 'leave':
        if (senderId === targetUserId) {
          roomEventType = 'leave';
        } else if (prevMembership === 'ban') {
          roomEventType = 'unban';
        } else {
          roomEventType = 'kick';
        }
        break;

      case 'ban':
        roomEventType = 'ban';
        break;

      default:
        return null;
    }

    if (!roomEventType) return null;

    return {
      id: e.getId(),
      roomId: m.roomId,
      sender: senderId,
      senderName: undefined, // 需要从房间成员获取
      content: displayContent,
      type: 'system',
      timestamp: e.getTs(),
      isRoomEvent: true,
      roomEventType,
      targetUserId,
      targetUserName: m.name || content.displayname,
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

  // ============= Crypto Store 设备管理 =============

  /**
   * 确保 crypto store 与当前设备匹配
   * 在创建 Matrix 客户端之前调用，避免 IndexedDB 删除被阻塞
   */
  private async _ensureCryptoStoreMatchesDevice(
    userId: string,
    currentDeviceId: string
  ): Promise<void> {
    if (typeof indexedDB === 'undefined' || typeof localStorage === 'undefined') {
      return;
    }

    const storageKey = `${MATRIX_CRYPTO_DEVICE_KEY}_${userId}`;
    const storedDeviceId = localStorage.getItem(storageKey);

    if (storedDeviceId && storedDeviceId !== currentDeviceId) {
      console.warn(
        `[Matrix] Crypto store device mismatch: stored=${storedDeviceId}, current=${currentDeviceId}`
      );
      console.info('[Matrix] Clearing stale crypto stores before client creation...');

      // 清除 crypto stores - 此时还没有活跃连接，不会被阻塞
      await this._clearAllCryptoStores(userId);

      // 清除存储的设备 ID
      localStorage.removeItem(storageKey);

      console.info('[Matrix] Crypto stores cleared successfully');
    }
  }

  /**
   * 标记 crypto store 由当前设备拥有
   * 在 initRustCrypto 成功后调用
   */
  private _markCryptoStoreDevice(userId: string, deviceId: string): void {
    if (typeof localStorage === 'undefined') {
      return;
    }
    const storageKey = `${MATRIX_CRYPTO_DEVICE_KEY}_${userId}`;
    localStorage.setItem(storageKey, deviceId);
    console.info('[Matrix] Marked crypto store owned by device:', deviceId);
  }

  /**
   * 清除所有 crypto stores
   */
  private async _clearAllCryptoStores(userId: string): Promise<void> {
    if (typeof indexedDB === 'undefined') {
      return;
    }

    const deletedDbs = new Set<string>();

    // 已知的数据库名称（即使没有 databases() API 也能工作）
    const knownDbNames = [
      `matrix-js-sdk:crypto:${userId}`,
      `matrix-crypto-${userId}`,
      `matrix-js-sdk:crypto`,
      `matrix-crypto-${userId}::matrix-sdk-crypto`,
      `matrix-crypto-${userId}:matrix-sdk-crypto`,
    ];

    console.info('[Matrix] Clearing crypto stores...');
    for (const dbName of knownDbNames) {
      await this._clearIndexedDB(dbName);
      deletedDbs.add(dbName);
    }

    // 使用 databases() API（如果可用）查找其他 crypto 数据库
    if ('databases' in indexedDB && typeof indexedDB.databases === 'function') {
      try {
        const databases = await indexedDB.databases();
        const userIdLower = userId.toLowerCase();

        for (const db of databases) {
          if (!db.name || deletedDbs.has(db.name)) continue;

          // 匹配包含用户 ID 的 crypto 相关数据库
          const nameLower = db.name.toLowerCase();
          if (
            (nameLower.includes('crypto') || nameLower.includes('matrix')) &&
            nameLower.includes(userIdLower.replace(/[@:]/g, ''))
          ) {
            await this._clearIndexedDB(db.name);
            deletedDbs.add(db.name);
          }
        }
      } catch (err) {
        console.warn('[Matrix] Could not enumerate databases:', err);
      }
    }

    console.info('[Matrix] Cleared crypto stores:', Array.from(deletedDbs));
  }

  /**
   * 清除指定的 IndexedDB 数据库
   */
  private async _clearIndexedDB(dbName: string): Promise<void> {
    if (typeof indexedDB === 'undefined') {
      return;
    }
    return new Promise(resolve => {
      try {
        const request = indexedDB.deleteDatabase(dbName);
        request.onsuccess = () => {
          console.info(`[Matrix] Deleted IndexedDB: ${dbName}`);
          resolve();
        };
        request.onerror = () => {
          console.warn(`[Matrix] Failed to delete IndexedDB: ${dbName}`);
          resolve();
        };
        request.onblocked = () => {
          console.warn(`[Matrix] IndexedDB deletion blocked: ${dbName}`);
          resolve();
        };
      } catch (err) {
        console.warn(`[Matrix] Error deleting IndexedDB ${dbName}:`, err);
        resolve();
      }
    });
  }
}

// 导出单例
export const matrixClient = new MatrixClientService();
