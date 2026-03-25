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
  clearCredentialsKeepDevice,
  clearAllCredentials,
  updateTokens,
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

type MatrixClientInstance = import('matrix-js-sdk').MatrixClient;

interface MatrixVerificationRequest {
  phase: number;
  transactionId: string;
  otherUserId: string;
  cancellingUserId?: string;
  verifier?: MatrixVerifier;
  on(event: string, handler: () => void): void;
  accept(): Promise<void>;
  startVerification(method: string): Promise<MatrixVerifier>;
  cancel(): Promise<void>;
}

interface MatrixVerifier {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  on(event: string, handler: (...args: any[]) => void): void;
  verify(): Promise<void>;
  cancel(error: Error): void;
}

interface MatrixSasCallbacks {
  sas?: { emoji?: unknown[]; decimal?: unknown[] };
  emoji?: unknown[];
  decimal?: unknown[];
  confirm(): Promise<void>;
  cancel(): void;
}

interface IgnoreListClient {
  getIgnoredUsers(): string[];
  setIgnoredUsers(users: string[]): Promise<void>;
}

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
  private client: MatrixClientInstance | null = null;
  private config: MatrixConfig | null = null;
  private serverConfig: { homeserverURL: string; serverName: string } | null = null;
  private isInitialized = false;
  private isConnected = false;
  private _invitePolicy: InvitePolicy = 'auto_mobazha';
  private processedMessageIds = new Set<string>();
  private currentPeerID: string | null = null;
  private _peerIdCache = new Map<string, string>();
  private initializationPromise: Promise<boolean> | null = null;
  private backupDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private autoBackupTimer: ReturnType<typeof setInterval> | null = null;

  // Verification state
  private pendingVerificationRequest: MatrixVerificationRequest | null = null;
  private currentVerifier: MatrixVerifier | null = null;
  private sasCallbacks: MatrixSasCallbacks | null = null;
  private verificationDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private verifierListenersAttached = new WeakSet<object>();
  private verificationListenersSetup = false;
  private ignoreMutex: Promise<void> = Promise.resolve();

  private static readonly INVITE_POLICY_STORAGE_KEY = 'matrix_invite_policy';

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
      let refreshToken: string | null = null;
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
          refreshToken = stored.refreshToken;
          userId = stored.userId;
          deviceId = stored.deviceId;
        } else {
          // Token 已过期，清除并重新登录
          await clearCredentials();
          const credentials = await this._autoRegister(peerID, config);
          accessToken = credentials.accessToken;
          refreshToken = credentials.refreshToken || null;
          userId = credentials.userId;
          deviceId = credentials.deviceId;
        }
      } else {
        // 需要自动注册/登录
        const credentials = await this._autoRegister(peerID, config);
        accessToken = credentials.accessToken;
        refreshToken = credentials.refreshToken || null;
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

      // 4. 创建 Matrix 客户端（包含 token refresh 支持）
      const sdk = await import('matrix-js-sdk');

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const warnOnlyLogger: any = {
        trace() {},
        debug() {},
        info() {},
        warn(...msg: unknown[]) {
          console.warn('[Matrix]', ...msg);
        },
        error(...msg: unknown[]) {
          console.error('[Matrix]', ...msg);
        },
        getChild() {
          return warnOnlyLogger;
        },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const clientOpts: any = {
        baseUrl: config.homeserverURL,
        accessToken,
        userId,
        deviceId: deviceId || undefined,
        useAuthorizationHeader: true,
        logger: warnOnlyLogger,
      };

      // 如果有 refresh token，配置自动刷新
      if (refreshToken) {
        clientOpts.refreshToken = refreshToken;
        clientOpts.tokenRefreshFunction = this._createTokenRefreshFunction(config.homeserverURL);
      }

      this.client = sdk.createClient(clientOpts);

      // 5. 初始化 E2EE 加密 (在 startClient 之前)
      const matrixClient = this.client!;
      const cryptoDbPrefix = `matrix-crypto-${userId}`;

      try {
        await matrixClient.initRustCrypto({
          useIndexedDB: true,
          cryptoDatabasePrefix: cryptoDbPrefix,
        });

        // 标记当前设备为 crypto store 的所有者
        if (deviceId) {
          this._markCryptoStoreDevice(userId, deviceId);
        }
      } catch (cryptoError) {
        // 检查是否是数据损坏错误（TextDecoder 失败或 WASM panic）
        const errorMsg = cryptoError instanceof Error ? cryptoError.message : String(cryptoError);
        const isCorruptedData =
          errorMsg.includes('TextDecoder') ||
          errorMsg.includes('decode') ||
          errorMsg.includes('panic') ||
          errorMsg.includes('wasm') ||
          errorMsg.includes('unreachable');

        if (isCorruptedData) {
          console.warn('[Matrix] Crypto store data corrupted, clearing and retrying...');

          // 清除所有 crypto stores
          await this._clearAllCryptoStores(userId);

          // 清除 localStorage 中的设备标记
          if (typeof localStorage !== 'undefined') {
            const storageKey = `${MATRIX_CRYPTO_DEVICE_KEY}_${userId}`;
            localStorage.removeItem(storageKey);
          }

          // 重试初始化
          try {
            await matrixClient.initRustCrypto({
              useIndexedDB: true,
              cryptoDatabasePrefix: cryptoDbPrefix,
            });

            if (deviceId) {
              this._markCryptoStoreDevice(userId, deviceId);
            }
            console.warn(
              '[Matrix] Crypto re-initialized successfully after clearing corrupted data'
            );
          } catch (retryError) {
            console.error('[Matrix] Crypto initialization failed after retry:', retryError);
            // 继续运行，但加密功能不可用
          }
        } else {
          console.error('[Matrix] Crypto initialization failed:', cryptoError);
          // 继续运行，但加密功能可能不可用
        }
      }

      // 5. 设置事件监听
      this.setupEventListeners();
      this.setupVerificationListeners().catch(() => {});

      this.config = {
        homeserverUrl: config.homeserverURL,
        accessToken,
        userId,
        deviceId: deviceId || undefined,
      };
      this.currentPeerID = peerID;
      this.isInitialized = true;

      // 6. 从持久化存储加载邀请策略
      this._loadInvitePolicy();

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
  ): Promise<{ accessToken: string; refreshToken?: string; userId: string; deviceId: string }> {
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
  ): Promise<{ accessToken: string; refreshToken?: string; userId: string; deviceId: string }> {
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
  ): Promise<{ accessToken: string; refreshToken?: string; userId: string; deviceId: string }> {
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
  ): Promise<{ accessToken: string; refreshToken?: string; userId: string; deviceId: string }> {
    const sdk = await import('matrix-js-sdk');
    const tempClient = sdk.createClient({ baseUrl: homeserverUrl });

    const response = await tempClient.login('m.login.password', {
      user: userId,
      password,
      device_id: deviceId,
      initial_device_display_name: 'Mobazha Web',
      refresh_token: true, // 请求 refresh token
    });

    // 保存凭据到本地（包括 refresh_token）
    await saveCredentials(
      response.access_token,
      response.user_id,
      response.device_id,
      response.refresh_token
    );

    return {
      accessToken: response.access_token,
      refreshToken: response.refresh_token,
      userId: response.user_id,
      deviceId: response.device_id,
    };
  }

  /**
   * 创建 token 刷新函数
   * 当 access token 过期时，matrix-js-sdk 会调用此函数获取新 token
   */
  private _createTokenRefreshFunction(
    homeserverUrl: string
  ): (refreshToken: string) => Promise<{ accessToken: string; refreshToken?: string }> {
    return async (refreshToken: string) => {
      try {
        const sdk = await import('matrix-js-sdk');
        const tempClient = sdk.createClient({ baseUrl: homeserverUrl });

        // 调用 Matrix 服务器的 refresh token 端点
        const response = await tempClient.refreshToken(refreshToken);

        // 持久化新的 tokens
        await updateTokens(response.access_token, response.refresh_token);

        return {
          accessToken: response.access_token,
          refreshToken: response.refresh_token,
        };
      } catch (error) {
        // 刷新失败，触发重新登录
        console.warn('[Matrix] Token refresh failed, triggering re-authentication');
        matrixEvents.emit(MATRIX_EVENTS.AUTH_REQUIRED, {
          reason: 'TOKEN_REFRESH_FAILED',
        });
        throw error;
      }
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
      this.setupVerificationListeners().catch(() => {});

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
      const matrixClient = this.client!;

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
   * @param clearDevice 是否清除设备 ID（默认 false）
   *   - false: 普通登出，保留设备 ID，重新登录可恢复加密状态（推荐）
   *   - true: 完全登出，清除设备 ID，重新登录将创建新设备
   */
  async logout(clearDevice: boolean = false): Promise<void> {
    // 停止自动备份
    this._stopAutoBackup();

    if (this.client) {
      try {
        const matrixClient = this.client!;
        await matrixClient.logout();
      } catch (error) {
        console.warn('[Matrix] Logout error:', error);
      }
    }

    // 根据参数决定是否清除设备 ID
    if (clearDevice) {
      // 完全清除，包括设备 ID（用于切换账户或清除所有数据）
      await clearAllCredentials();
    } else {
      // 普通登出，保留设备 ID（Matrix 标准做法）
      await clearCredentialsKeepDevice();
    }

    this.client = null;
    this.isInitialized = false;
    this.isConnected = false;
    this.currentPeerID = null;
    this._peerIdCache.clear();
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
    const matrixClient = this.client!;

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
            console.warn('[Matrix] Sync prepared, initial sync complete');

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
          case 'ERROR': {
            // 同步错误
            this.isConnected = false;
            console.error('[Matrix] Sync error:', data);

            // 检查是否是 token 过期错误
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const errorData = data as any;
            const errcode = errorData?.error?.errcode || errorData?.errcode;
            if (errcode === 'M_UNKNOWN_TOKEN') {
              console.warn('[Matrix] Token expired, triggering re-authentication');
              matrixEvents.emit(MATRIX_EVENTS.AUTH_REQUIRED, {
                reason: 'TOKEN_EXPIRED',
              });
            } else {
              matrixEvents.emit(MATRIX_EVENTS.SYNC_ERROR, { error: data });
            }
            // 不要 reject，让同步继续重试
            break;
          }
          case 'STOPPED':
            // 同步停止
            this.isConnected = false;
            matrixEvents.emit(MATRIX_EVENTS.DISCONNECTED);
            break;
        }
      };

      // Read receipt events
      matrixClient.on(sdk.RoomEvent.Receipt, (event, room) => {
        if (!room) return;
        const content = event.getContent();
        for (const eventId of Object.keys(content)) {
          const readers = content[eventId]?.['m.read'];
          if (readers) {
            for (const userId of Object.keys(readers)) {
              if (userId !== this.config?.userId) {
                matrixEvents.emit(MATRIX_EVENTS.READ_RECEIPT, {
                  roomId: room.roomId,
                  userId,
                  eventId,
                });
              }
            }
          }
        }
      });

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

    const matrixClient = this.client!;
    const { matrixCrypto } = await import('./crypto');
    const { getGatewayUrl, getAuthHeaders } = await import('../api/config');

    // 1. 初始化 crypto 服务
    const nodeBaseUrl = getGatewayUrl();
    const authHeaders = getAuthHeaders();

    await matrixCrypto.initialize(matrixClient, {
      nodeBaseUrl,
      authHeaders,
    });

    // 2. 尝试恢复 secrets bundle（cross-signing keys）
    try {
      const hasSecretsBackup = await matrixCrypto.hasSecretsBundleBackup();
      if (hasSecretsBackup) {
        await matrixCrypto.restoreSecretsBundle();
      }
    } catch {
      // Secrets bundle restore is optional
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
            if (typeof cryptoAny.bootstrapCrossSigning === 'function') {
              // 获取密码用于 UIA 认证
              const derivedPassword = await getDerivedPassword();
              const userId = this.config?.userId;

              await cryptoAny.bootstrapCrossSigning({
                setupNewCrossSigning: true,
                // 提供 UIA 回调处理 401 认证请求

                authUploadDeviceSigningKeys: async (
                  makeRequest: (authData: Record<string, unknown>) => Promise<unknown>
                ) => {
                  // 尝试不带认证先请求
                  try {
                    await makeRequest({});
                    return;
                  } catch (uiaError) {
                    // 如果需要 UIA，使用密码认证
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const uiaErr = uiaError as any;
                    if (uiaErr?.data?.flows && derivedPassword && userId) {
                      await makeRequest({
                        type: 'm.login.password',
                        identifier: {
                          type: 'm.id.user',
                          user: userId,
                        },
                        password: derivedPassword,
                      });
                    } else {
                      throw uiaError;
                    }
                  }
                },
              });
              // 备份新创建的密钥
              await matrixCrypto.backupSecretsBundle();
            }
          }
        }
      }
    } catch {
      // Cross-signing setup is optional
    }

    // 4. 尝试恢复房间密钥
    try {
      const hasKeyBackup = await matrixCrypto.hasKeyBackup();
      if (hasKeyBackup) {
        await matrixCrypto.restoreRoomKeys();
      }
    } catch {
      // Room key restore is optional
    }

    // 5. 启动自动备份
    this._startAutoBackup();
  }

  /**
   * 停止同步
   */
  async stopSync(): Promise<void> {
    if (this.client) {
      const matrixClient = this.client!;
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

    const matrixClient = this.client!;
    const rooms = matrixClient.getRooms();

    return rooms.map(room => this.formatRoom(room));
  }

  /**
   * 获取房间消息（包含房间事件）
   */
  async getMessages(roomId: string, limit = 50): Promise<MatrixMessage[]> {
    if (!this.client) return [];

    const sdk = await import('matrix-js-sdk');
    const matrixClient = this.client!;
    const room = matrixClient.getRoom(roomId);

    if (!room) {
      console.warn('[Matrix] Room not found for getMessages:', roomId);
      return [];
    }

    const timeline = room.getLiveTimeline();
    let events = timeline.getEvents();

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

    // 将这些消息标记为已处理，避免 Timeline 事件重复处理
    allMessages.forEach(msg => {
      if (msg.id) {
        this.processedMessageIds.add(msg.id);
      }
    });

    return allMessages;
  }

  /**
   * Load older messages by paginating backward on the live timeline.
   * Returns only the newly-loaded messages (older ones) sorted chronologically.
   * Returns empty array when no more history is available.
   */
  async loadOlderMessages(roomId: string, limit = 50): Promise<MatrixMessage[]> {
    if (!this.client) return [];

    const sdk = await import('matrix-js-sdk');
    const matrixClient = this.client!;
    const room = matrixClient.getRoom(roomId);
    if (!room) return [];

    const timeline = room.getLiveTimeline();
    const token = timeline.getPaginationToken(sdk.Direction.Backward);
    if (!token) return [];

    const eventsBefore = new Set(
      timeline
        .getEvents()
        .map(e => e.getId())
        .filter((id): id is string => !!id)
    );

    try {
      await matrixClient.paginateEventTimeline(timeline, { backwards: true, limit });
    } catch (error) {
      console.warn('[Matrix] Failed to paginate backward:', error);
      return [];
    }

    const displayableTypes = ['m.room.message', 'm.room.member', 'm.room.encryption'];
    const newEvents = timeline.getEvents().filter(event => {
      const eventId = event.getId();
      if (eventId && eventsBefore.has(eventId)) return false;
      const type = event.getType();
      if (!displayableTypes.includes(type)) return false;
      if (type === 'm.room.message') {
        const msgtype = (event.getContent()?.msgtype as string) || '';
        if (msgtype.startsWith('m.key.verification')) return false;
      }
      return true;
    });

    const messages = newEvents
      .map((event: unknown) => this.formatTimelineEvent(event, roomId))
      .filter((msg: MatrixMessage | null): msg is MatrixMessage => msg !== null)
      .sort((a: MatrixMessage, b: MatrixMessage) => a.timestamp - b.timestamp);

    messages.forEach((msg: MatrixMessage) => {
      if (msg.id) this.processedMessageIds.add(msg.id);
    });

    return messages;
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

    // 获取发送者信息
    const senderInfo = this.getSenderInfo(roomId, e.getSender());

    // 普通消息或已解密的加密消息
    if (eventType === 'm.room.message' || (isEncrypted && clearContent?.body)) {
      const relatesTo = content['m.relates_to'] as
        | { rel_type?: string; event_id?: string }
        | undefined;
      if (relatesTo?.rel_type === 'm.replace' || relatesTo?.rel_type === 'm.annotation') {
        return null;
      }

      // 检查解密是否失败
      if (e.isDecryptionFailure?.()) {
        return {
          id: e.getId(),
          roomId,
          sender: e.getSender(),
          senderName: senderInfo?.displayName,
          senderAvatar: senderInfo?.avatarUrl,
          senderRawMxcAvatarUrl: senderInfo?.rawMxcAvatarUrl,
          content: '⚠️ Unable to decrypt message',
          type: 'text',
          timestamp: e.getTs(),
          isSystem: true,
        };
      }

      const msgtype = (content.msgtype as string) || 'm.text';
      const messageType = this.getMessageType(msgtype);

      const msg: MatrixMessage = {
        id: e.getId(),
        roomId,
        sender: e.getSender(),
        senderName: senderInfo?.displayName,
        senderAvatar: senderInfo?.avatarUrl,
        senderRawMxcAvatarUrl: senderInfo?.rawMxcAvatarUrl,
        content: (content.body as string) || '',
        type: messageType,
        timestamp: e.getTs(),
      };

      if (
        messageType === 'image' ||
        messageType === 'file' ||
        messageType === 'audio' ||
        messageType === 'video'
      ) {
        const mxcUrl = content.url as string | undefined;
        const info = content.info as
          | { mimetype?: string; size?: number; w?: number; h?: number; thumbnail_url?: string }
          | undefined;
        if (mxcUrl) {
          msg.attachments = [
            {
              url: this.mxcToHttp(mxcUrl) || mxcUrl,
              filename: (content.body as string) || undefined,
              mimetype: info?.mimetype,
              size: info?.size,
              width: info?.w,
              height: info?.h,
              thumbnailUrl: info?.thumbnail_url
                ? this.mxcToHttp(info.thumbnail_url) || info.thumbnail_url
                : undefined,
            },
          ];
        }
      }

      return msg;
    }

    // 加密消息但尚未解密（可能还在解密中）
    if (isEncrypted && !clearContent) {
      // 检查是否是解密失败
      if (e.isDecryptionFailure?.()) {
        return {
          id: e.getId(),
          roomId,
          sender: e.getSender(),
          senderName: senderInfo?.displayName,
          senderAvatar: senderInfo?.avatarUrl,
          senderRawMxcAvatarUrl: senderInfo?.rawMxcAvatarUrl,
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
        senderName: senderInfo?.displayName,
        senderAvatar: senderInfo?.avatarUrl,
        senderRawMxcAvatarUrl: senderInfo?.rawMxcAvatarUrl,
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
    const match = userId.match(/@(?:peer_)?([^:]+):/);
    if (match) {
      const name = match[1];
      if (name.length > 12) {
        return name.substring(0, 6) + '…' + name.substring(name.length - 4);
      }
      return name;
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
      const matrixClient = this.client!;

      // Auto-join if we're only invited (not yet a member)
      const room = matrixClient.getRoom(roomId);
      if (room) {
        const membership = room.getMyMembership();
        if (membership === 'invite') {
          await matrixClient.joinRoom(roomId);
          matrixEvents.emit(MATRIX_EVENTS.ROOM_JOINED, { roomId });
        }
      }

      const response = await matrixClient.sendMessage(roomId, {
        msgtype: sdk.MsgType.Text,
        body: content,
      });

      this.processedMessageIds.add(response.event_id);

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
   * Send an image message to a room.
   * Uploads the file to the Matrix content repository first, then sends an m.image event.
   */
  async sendImage(
    roomId: string,
    file: File,
    externalLocalId?: string
  ): Promise<MatrixMessage | null> {
    if (!this.client) return null;

    const localId = externalLocalId || `local_${Date.now()}`;
    matrixEvents.emit(MATRIX_EVENTS.MESSAGE_SENDING, { localId, roomId });

    try {
      const sdk = await import('matrix-js-sdk');
      const matrixClient = this.client!;

      const uploadResponse = await matrixClient.uploadContent(file, {
        type: file.type,
        progressHandler: (progress: { loaded: number; total: number }) => {
          const percent =
            progress.total > 0 ? Math.round((progress.loaded / progress.total) * 100) : 0;
          matrixEvents.emit(MATRIX_EVENTS.UPLOAD_PROGRESS, { localId, roomId, progress: percent });
        },
      });

      const mxcUrl =
        typeof uploadResponse === 'string'
          ? uploadResponse
          : (uploadResponse as { content_uri: string }).content_uri;

      const response = await matrixClient.sendMessage(roomId, {
        msgtype: sdk.MsgType.Image,
        body: file.name || 'image',
        url: mxcUrl,
        info: {
          mimetype: file.type,
          size: file.size,
        },
      });

      const eventId = (response as { event_id: string }).event_id;
      this.processedMessageIds.add(eventId);

      const message: MatrixMessage = {
        id: eventId,
        localId,
        roomId,
        sender: this.config!.userId!,
        content: file.name || 'image',
        type: 'image',
        timestamp: Date.now(),
        status: MESSAGE_STATUS.SENT,
        attachments: [{ url: mxcUrl, filename: file.name, mimetype: file.type, size: file.size }],
      };

      matrixEvents.emit(MATRIX_EVENTS.MESSAGE_SENT, message);
      this._scheduleKeyBackup();
      return message;
    } catch (error) {
      console.error('[Matrix] Send image failed:', error);
      matrixEvents.emit(MATRIX_EVENTS.MESSAGE_FAILED, { localId, roomId, error });
      return null;
    }
  }

  /**
   * Send an arbitrary file (image, audio, video, or generic file) to a room.
   * Uploads to the Matrix content repository first, then sends the appropriate m.* message.
   * Prefer {@link sendImage} for images when you want the dedicated image path.
   */
  async sendFile(
    roomId: string,
    file: File,
    externalLocalId?: string
  ): Promise<MatrixMessage | null> {
    if (!this.client) return null;

    const localId = externalLocalId || `local_${Date.now()}`;
    matrixEvents.emit(MATRIX_EVENTS.MESSAGE_SENDING, { localId, roomId });

    try {
      const sdk = await import('matrix-js-sdk');
      const matrixClient = this.client!;

      const uploadResponse = await matrixClient.uploadContent(file, {
        type: file.type,
        progressHandler: (progress: { loaded: number; total: number }) => {
          const percent =
            progress.total > 0 ? Math.round((progress.loaded / progress.total) * 100) : 0;
          matrixEvents.emit(MATRIX_EVENTS.UPLOAD_PROGRESS, { localId, roomId, progress: percent });
        },
      });

      const mxcUrl =
        typeof uploadResponse === 'string'
          ? uploadResponse
          : (uploadResponse as { content_uri: string }).content_uri;

      const body = file.name || 'file';
      const info = { mimetype: file.type, size: file.size };

      let messageType: MessageType;
      let response: { event_id: string };

      if (file.type.startsWith('image/')) {
        messageType = 'image';
        response = await matrixClient.sendMessage(roomId, {
          msgtype: sdk.MsgType.Image,
          body,
          url: mxcUrl,
          info,
        });
      } else if (file.type.startsWith('audio/')) {
        messageType = 'audio';
        response = await matrixClient.sendMessage(roomId, {
          msgtype: sdk.MsgType.Audio,
          body,
          url: mxcUrl,
          info,
        });
      } else if (file.type.startsWith('video/')) {
        messageType = 'video';
        response = await matrixClient.sendMessage(roomId, {
          msgtype: sdk.MsgType.Video,
          body,
          url: mxcUrl,
          info,
        });
      } else {
        messageType = 'file';
        response = await matrixClient.sendMessage(roomId, {
          msgtype: sdk.MsgType.File,
          body,
          url: mxcUrl,
          info,
        });
      }

      this.processedMessageIds.add(response.event_id);

      const message: MatrixMessage = {
        id: response.event_id,
        localId,
        roomId,
        sender: this.config!.userId!,
        content: file.name || 'file',
        type: messageType,
        timestamp: Date.now(),
        status: MESSAGE_STATUS.SENT,
        attachments: [{ url: mxcUrl, filename: file.name, mimetype: file.type, size: file.size }],
      };

      matrixEvents.emit(MATRIX_EVENTS.MESSAGE_SENT, message);
      this._scheduleKeyBackup();
      return message;
    } catch (error) {
      console.error('[Matrix] Send file failed:', error);
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
          await matrixCrypto.backupRoomKeys();
        }
      } catch {
        // Backup failed, will retry later
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
          await matrixCrypto.backupRoomKeys();
        }
      } catch {
        // Auto-backup failed, will retry later
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
   * Get or create a direct room with a peer by their Mobazha peer ID.
   * Builds the Matrix userId internally from server config.
   */
  async getOrCreateDirectRoom(peerID: string, displayName?: string): Promise<string | null> {
    const serverConfig = await this._getServerConfig();
    if (!serverConfig) return null;
    const matrixUserId = `@peer_${peerID.toLowerCase()}:${serverConfig.serverName}`;
    return this.createDirectRoom(matrixUserId, displayName);
  }

  /**
   * 创建直接聊天房间
   */
  async createDirectRoom(userId: string, displayName?: string): Promise<string | null> {
    if (!this.client) return null;

    try {
      const sdk = await import('matrix-js-sdk');
      const matrixClient = this.client!;

      // 检查是否已有直接聊天
      const existingRoom = await this.findDirectRoom(userId);
      if (existingRoom) return existingRoom;

      const response = await matrixClient.createRoom({
        is_direct: true,
        invite: [userId],
        name: displayName,
        preset: sdk.Preset.TrustedPrivateChat,
        power_level_content_override: {
          events: {
            'org.mobazha.member_peerid': 0,
          },
        },
      });

      // 更新 m.direct 账户数据
      await this._updateDirectRoomMapping(userId, response.room_id);

      // Write own peerID into room state for identity resolution
      await this.setMyPeerIDInRoom(response.room_id);

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
      const matrixClient = this.client!;

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
      const matrixClient = this.client!;
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
      const matrixClient = this.client!;
      await matrixClient.leave(roomId);
      matrixEvents.emit(MATRIX_EVENTS.ROOM_LEFT, { roomId });
      return true;
    } catch (error) {
      console.error('[Matrix] Leave room failed:', error);
      return false;
    }
  }

  /**
   * 设置邀请策略并持久化
   */
  setInvitePolicy(policy: InvitePolicy): void {
    this._invitePolicy = policy;
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(MatrixClientService.INVITE_POLICY_STORAGE_KEY, policy);
      } catch {
        // localStorage unavailable or full
      }
    }
  }

  /**
   * 获取邀请策略
   */
  getInvitePolicy(): InvitePolicy {
    return this._invitePolicy;
  }

  /**
   * 从 localStorage 加载邀请策略
   */
  private _loadInvitePolicy(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const saved = localStorage.getItem(MatrixClientService.INVITE_POLICY_STORAGE_KEY);
      if (saved === 'auto_all' || saved === 'auto_mobazha' || saved === 'always_confirm') {
        this._invitePolicy = saved;
      }
    } catch {
      // localStorage unavailable
    }
  }

  /**
   * 判断 userId 是否属于当前 Mobazha homeserver
   */
  isMobazhaUser(userId: string): boolean {
    if (!this.serverConfig?.serverName) return false;
    return userId.endsWith(`:${this.serverConfig.serverName}`);
  }

  /**
   * 根据邀请策略处理收到的房间邀请（对齐 mobazha-mobile handleRoomInvite）
   */
  private async _handleRoomInvite(roomId: string, inviter: string | undefined): Promise<void> {
    if (!this.client || !inviter) return;

    let shouldAutoAccept = false;
    switch (this._invitePolicy) {
      case 'auto_all':
        shouldAutoAccept = true;
        break;
      case 'auto_mobazha':
        shouldAutoAccept = this.isMobazhaUser(inviter);
        break;
      case 'always_confirm':
        shouldAutoAccept = false;
        break;
      default:
        shouldAutoAccept = this.isMobazhaUser(inviter);
    }

    if (shouldAutoAccept) {
      try {
        const matrixClient = this.client!;
        await matrixClient.joinRoom(roomId);
        matrixEvents.emit(MATRIX_EVENTS.ROOM_JOINED, { roomId });
        console.warn('[Matrix] Auto-joined room based on invite policy:', roomId);
      } catch (error) {
        console.error('[Matrix] Auto-join failed for room:', roomId, error);
      }
    }
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

  /**
   * 获取当前设备 ID
   */
  getDeviceId(): string | null {
    return this.config?.deviceId || null;
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
      const matrixClient = this.client!;

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
      const matrixClient = this.client!;

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
      const matrixClient = this.client!;

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
      const matrixClient = this.client!;

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
      const matrixClient = this.client!;
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
      const matrixClient = this.client!;
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
      const matrixClient = this.client!;
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
      const matrixClient = this.client!;
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
      const matrixClient = this.client!;
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
      const matrixClient = this.client!;
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

  async getReadReceiptForRoom(roomId: string): Promise<Record<string, string>> {
    if (!this.client) return {};

    try {
      const matrixClient = this.client!;
      const room = matrixClient.getRoom(roomId);
      if (!room) return {};

      const receipts: Record<string, string> = {};
      const members = room.getJoinedMembers();
      for (const member of members) {
        const receipt = room.getReadReceiptForUserId(member.userId);
        if (receipt?.eventId) {
          receipts[member.userId] = receipt.eventId;
        }
      }
      return receipts;
    } catch (error) {
      console.warn('[Matrix] Get read receipts failed:', error);
      return {};
    }
  }

  /**
   * 撤回/删除消息（Matrix redaction）
   */
  async redactEvent(roomId: string, eventId: string, reason?: string): Promise<void> {
    if (!this.client) throw new Error('Matrix client not initialized');

    const matrixClient = this.client!;
    await matrixClient.redactEvent(roomId, eventId, undefined, reason ? { reason } : undefined);
  }

  /**
   * 编辑消息（Matrix m.replace）
   */
  async editMessage(roomId: string, originalEventId: string, newContent: string): Promise<void> {
    if (!this.client) throw new Error('Matrix client not initialized');

    const sdk = await import('matrix-js-sdk');
    const matrixClient = this.client!;
    // m.replace relation is not covered by SDK's strict content types
    await (
      matrixClient as unknown as {
        sendMessage(
          roomId: string,
          content: Record<string, unknown>
        ): Promise<{ event_id: string }>;
      }
    ).sendMessage(roomId, {
      msgtype: sdk.MsgType.Text,
      body: `* ${newContent}`,
      'm.new_content': {
        msgtype: sdk.MsgType.Text,
        body: newContent,
      },
      'm.relates_to': {
        rel_type: 'm.replace',
        event_id: originalEventId,
      },
    });
    matrixEvents.emit(MATRIX_EVENTS.MESSAGE_EDITED, {
      roomId,
      eventId: originalEventId,
      newContent,
    });
  }

  /**
   * 发送 Emoji 回应（Matrix m.reaction）
   */
  async sendReaction(roomId: string, eventId: string, emoji: string): Promise<void> {
    if (!this.client) throw new Error('Matrix client not initialized');

    const matrixClient = this.client!;
    await (
      matrixClient as unknown as {
        sendEvent(
          roomId: string,
          eventType: string,
          content: Record<string, unknown>
        ): Promise<{ event_id: string }>;
      }
    ).sendEvent(roomId, 'm.reaction', {
      'm.relates_to': {
        rel_type: 'm.annotation',
        event_id: eventId,
        key: emoji,
      },
    });
  }

  /**
   * Sync profile display name to Matrix account
   */
  async setDisplayName(displayName: string): Promise<void> {
    if (!this.client) return;
    const matrixClient = this.client!;
    await matrixClient.setDisplayName(displayName);
  }

  /**
   * Sync full Mobazha profile (name + avatar) to Matrix global profile.
   * Called on init and profile updates so other users see real names/avatars.
   */
  async syncProfileToMatrix(displayName: string, avatarUrl?: string): Promise<void> {
    if (!this.client) return;
    const matrixClient = this.client!;

    try {
      await matrixClient.setDisplayName(displayName);
    } catch (e) {
      console.warn('[Matrix] setDisplayName failed:', e);
    }

    if (avatarUrl) {
      try {
        const resp = await fetch(avatarUrl);
        if (resp.ok) {
          const blob = await resp.blob();
          const file = new File([blob], 'avatar', { type: blob.type || 'image/jpeg' });
          const uploadResp = await matrixClient.uploadContent(file, { type: file.type });
          const mxcUrl =
            typeof uploadResp === 'string'
              ? uploadResp
              : (uploadResp as { content_uri?: string }).content_uri;
          if (mxcUrl) {
            await matrixClient.setAvatarUrl(mxcUrl);
          }
        }
      } catch (e) {
        console.warn('[Matrix] avatar sync failed:', e);
      }
    }
  }

  /**
   * Write own peerID into room state as `org.mobazha.member_peerid`.
   * Other users read this to resolve Matrix userId → Mobazha peerID.
   * Checks power levels first to avoid 403 spam on rooms we didn't create.
   */
  async setMyPeerIDInRoom(roomId: string): Promise<void> {
    if (!this.client || !this.currentPeerID || !this.config?.userId) return;
    try {
      const matrixClient = this.client!;

      const room = matrixClient.getRoom(roomId);
      if (room) {
        const state = (
          room as { currentState?: { getStateEvents?: (t: string, k?: string) => unknown } }
        ).currentState;
        if (state?.getStateEvents) {
          // Check if we already wrote the same value (skip redundant writes)
          const existing = state.getStateEvents(
            'org.mobazha.member_peerid',
            this.config.userId
          ) as {
            getContent?: () => { peer_id?: string };
          } | null;
          if (existing?.getContent?.().peer_id === this.currentPeerID) return;

          // Check power level before attempting (avoid 403 on rooms we didn't create)
          const plEvent = state.getStateEvents('m.room.power_levels', '') as {
            getContent?: () => {
              users?: Record<string, number>;
              users_default?: number;
              state_default?: number;
              events?: Record<string, number>;
            };
          } | null;
          if (plEvent?.getContent) {
            const pl = plEvent.getContent();
            const myLevel = pl.users?.[this.config.userId] ?? pl.users_default ?? 0;
            const requiredLevel =
              pl.events?.['org.mobazha.member_peerid'] ?? pl.state_default ?? 50;
            if (myLevel < requiredLevel) return;
          }
        }
      }

      await (
        matrixClient as unknown as {
          sendStateEvent(
            roomId: string,
            eventType: string,
            content: Record<string, unknown>,
            stateKey: string
          ): Promise<unknown>;
        }
      ).sendStateEvent(
        roomId,
        'org.mobazha.member_peerid',
        { peer_id: this.currentPeerID },
        this.config.userId
      );
    } catch (e) {
      console.warn('[Matrix] setMyPeerIDInRoom failed:', e);
    }
  }

  /**
   * Extract the case-correct Peer ID from a Matrix user ID.
   * @peer_<lowercasePeerID>:<server> → original peerID (lowercased).
   * For rooms with org.mobazha.member_peerid state, prefer that for case accuracy.
   */
  extractPeerIdFromUserId(userId: string): string | null {
    const match = userId.match(/@peer_([^:]+):/);
    return match ? match[1] : null;
  }

  /**
   * Resolve a Matrix userId to a Mobazha peerID using layered fallback:
   * cache → room state → parse MXID
   */
  private getMemberPeerID(room: unknown, userId: string): string | undefined {
    if (this._peerIdCache.has(userId)) {
      return this._peerIdCache.get(userId);
    }

    const r = room as {
      currentState?: {
        getStateEvents?: (type: string, stateKey?: string) => unknown;
      };
    };

    if (r.currentState?.getStateEvents) {
      try {
        const stateEvent = r.currentState.getStateEvents('org.mobazha.member_peerid', userId) as {
          getContent?: () => { peer_id?: string };
        } | null;
        if (stateEvent?.getContent) {
          const peerID = stateEvent.getContent().peer_id;
          if (peerID) {
            this._peerIdCache.set(userId, peerID);
            return peerID;
          }
        }
      } catch {
        // ignore
      }
    }

    const parsed = this.extractPeerIdFromUserId(userId);
    if (parsed) {
      this._peerIdCache.set(userId, parsed);
      return parsed;
    }

    return undefined;
  }

  // ============ Device Verification ============

  /**
   * Set up verification event listeners (CryptoEvent.VerificationRequestReceived)
   * Called during initialization after crypto is ready.
   */
  async setupVerificationListeners(): Promise<void> {
    if (!this.client || this.verificationListenersSetup) return;
    this.verificationListenersSetup = true;
    const matrixClient = this.client!;
    const crypto = matrixClient.getCrypto?.();
    if (!crypto) return;

    const { CryptoEvent } = await import('matrix-js-sdk/lib/crypto-api');
    const { VerificationPhase } = await import('matrix-js-sdk/lib/crypto-api/verification');

    (
      crypto as unknown as {
        on: (event: string, handler: (req: MatrixVerificationRequest) => void) => void;
      }
    ).on(CryptoEvent.VerificationRequestReceived, (request: MatrixVerificationRequest) => {
      if (this.verificationDebounceTimer) {
        clearTimeout(this.verificationDebounceTimer);
        this.verificationDebounceTimer = null;
      }
      this.verificationDebounceTimer = setTimeout(() => {
        this.verificationDebounceTimer = null;
        if (request.phase === VerificationPhase.Requested) {
          this.pendingVerificationRequest = request;
          this._setupVerificationRequestListeners(request);
          matrixEvents.emit(MATRIX_EVENTS.VERIFICATION_REQUEST_RECEIVED, {
            otherUserId: request.otherUserId,
            requestId: request.transactionId,
          });
        }
      }, 200);
    });
  }

  private async _setupVerificationRequestListeners(
    request: MatrixVerificationRequest
  ): Promise<void> {
    const { VerificationPhase } = await import('matrix-js-sdk/lib/crypto-api/verification');
    let completedEmitted = false;

    request.on('change', () => {
      switch (request.phase) {
        case VerificationPhase.Started: {
          matrixEvents.emit(MATRIX_EVENTS.VERIFICATION_STARTED, {
            requestId: request.transactionId,
          });
          try {
            const verifier = request.verifier;
            if (verifier && !this.currentVerifier) {
              this.currentVerifier = verifier;
              this._setupVerifierListeners(verifier, request);
            }
          } catch {
            /* verifier not ready yet */
          }
          break;
        }
        case VerificationPhase.Done:
          if (!completedEmitted) {
            completedEmitted = true;
            matrixEvents.emit(MATRIX_EVENTS.VERIFICATION_COMPLETED, {
              requestId: request.transactionId,
              otherUserId: request.otherUserId,
            });
          }
          this.pendingVerificationRequest = null;
          this.currentVerifier = null;
          this.sasCallbacks = null;
          break;
        case VerificationPhase.Cancelled:
          matrixEvents.emit(MATRIX_EVENTS.VERIFICATION_CANCELLED, {
            requestId: request.transactionId,
            reason: request.cancellingUserId,
          });
          this.pendingVerificationRequest = null;
          this.currentVerifier = null;
          this.sasCallbacks = null;
          break;
      }
    });
  }

  private async _setupVerifierListeners(
    verifier: MatrixVerifier,
    request: MatrixVerificationRequest
  ): Promise<void> {
    const { VerifierEvent } = await import('matrix-js-sdk/lib/crypto-api/verification');
    if (this.verifierListenersAttached.has(verifier)) return;
    this.verifierListenersAttached.add(verifier);

    verifier.on(VerifierEvent.ShowSas, (sas: MatrixSasCallbacks) => {
      if (this.sasCallbacks) return;
      const sasData = sas.sas || sas;
      matrixEvents.emit(MATRIX_EVENTS.VERIFICATION_SHOW_SAS, {
        requestId: request.transactionId,
        emoji: sasData.emoji,
        decimal: sasData.decimal,
      });
      this.sasCallbacks = sas;
    });

    verifier.on(VerifierEvent.Cancel, () => {
      matrixEvents.emit(MATRIX_EVENTS.VERIFICATION_CANCELLED, {
        requestId: request.transactionId,
        reason: 'verifier_cancel',
      });
      this.pendingVerificationRequest = null;
      this.currentVerifier = null;
      this.sasCallbacks = null;
    });
  }

  /**
   * Request SAS verification with another user
   */
  async requestVerification(userId: string): Promise<void> {
    if (!this.client) throw new Error('Client not initialized');
    const matrixClient = this.client!;
    const crypto = matrixClient.getCrypto?.();
    if (!crypto) throw new Error('Crypto not available');

    const devices = await crypto.getUserDeviceInfo([userId]);
    const userDevices = devices.get(userId);
    if (!userDevices || userDevices.size === 0) {
      throw new Error('No devices found for user');
    }

    const rooms = await this.getRooms();
    const directRoom = rooms.find(r => r.isDirect && r.members.some(m => m.userId === userId));
    if (!directRoom) {
      throw new Error('No direct message room exists with this user. Start a conversation first.');
    }
    const request = await (
      crypto as unknown as {
        requestVerificationDM(userId: string, roomId: string): Promise<MatrixVerificationRequest>;
      }
    ).requestVerificationDM(userId, directRoom.roomId);

    this.pendingVerificationRequest = request;
    this._setupVerificationRequestListeners(request);
  }

  /**
   * Accept incoming verification request
   */
  async acceptVerificationRequest(): Promise<boolean> {
    const request = this.pendingVerificationRequest;
    if (!request) return false;

    const { VerificationPhase } = await import('matrix-js-sdk/lib/crypto-api/verification');
    if (request.phase === VerificationPhase.Cancelled) {
      matrixEvents.emit(MATRIX_EVENTS.VERIFICATION_CANCELLED, { reason: 'already_cancelled' });
      this.pendingVerificationRequest = null;
      return false;
    }
    if (request.phase >= VerificationPhase.Ready) return false;

    await request.accept();
    const verifier = await request.startVerification('m.sas.v1');
    this.currentVerifier = verifier;
    this._setupVerifierListeners(verifier, request);
    return true;
  }

  /**
   * Confirm SAS emoji match
   */
  async confirmVerification(): Promise<boolean> {
    const sas = this.sasCallbacks;
    if (sas && typeof sas.confirm === 'function') {
      await sas.confirm();
      this.currentVerifier = null;
      this.sasCallbacks = null;
      return true;
    }
    const verifier = this.currentVerifier;
    if (verifier) {
      await verifier.verify();
      this.currentVerifier = null;
      return true;
    }
    return false;
  }

  /**
   * Cancel verification
   */
  async cancelVerification(): Promise<boolean> {
    try {
      const sas = this.sasCallbacks;
      if (sas && typeof sas.cancel === 'function') {
        sas.cancel();
        this.sasCallbacks = null;
      }
      const verifier = this.currentVerifier;
      if (verifier) {
        verifier.cancel(new Error('User cancelled'));
        this.currentVerifier = null;
      }
      const request = this.pendingVerificationRequest;
      if (request) {
        await request.cancel();
        this.pendingVerificationRequest = null;
      }
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if a user's devices are verified
   */
  async isUserVerified(userId: string): Promise<boolean> {
    if (!this.client) return false;
    const matrixClient = this.client!;
    const crypto = matrixClient.getCrypto?.();
    if (!crypto) return false;
    try {
      const verificationStatus = await crypto.getUserVerificationStatus(userId);
      return verificationStatus?.isVerified?.() ?? false;
    } catch {
      return false;
    }
  }

  async getIgnoredUsers(): Promise<string[]> {
    if (!this.client) return [];
    const matrixClient = this.client!;
    return (matrixClient as unknown as IgnoreListClient).getIgnoredUsers?.() ?? [];
  }

  async isUserIgnored(userId: string): Promise<boolean> {
    const ignored = await this.getIgnoredUsers();
    return ignored.includes(userId);
  }

  async blockUser(userId: string): Promise<void> {
    await this.mutateIgnoredUsers(current => {
      if (current.includes(userId)) return current;
      return [...current, userId];
    });
  }

  async unblockUser(userId: string): Promise<void> {
    await this.mutateIgnoredUsers(current => current.filter((id: string) => id !== userId));
  }

  private async mutateIgnoredUsers(mutator: (current: string[]) => string[]): Promise<void> {
    const task = this.ignoreMutex.then(async () => {
      if (!this.client) return;
      const matrixClient = this.client!;
      const ignoreClient = matrixClient as unknown as IgnoreListClient;
      const current: string[] = ignoreClient.getIgnoredUsers?.() ?? [];
      const next = mutator(current);
      if (next !== current) {
        await ignoreClient.setIgnoredUsers(next);
      }
    });
    this.ignoreMutex = task.catch(() => {});
    return task;
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
    const matrixClient = this.client!;

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

    // 新消息（包括加密和未加密）+ 编辑 + reaction
    matrixClient.on(sdk.RoomEvent.Timeline, (event, room, toStartOfTimeline) => {
      const eventType = event.getType();

      if (toStartOfTimeline) return;
      if (!room) return;

      // Handle m.reaction events
      if (eventType === 'm.reaction') {
        const content = event.getContent() as Record<string, unknown>;
        const relatesTo = content['m.relates_to'] as
          | { rel_type?: string; event_id?: string; key?: string }
          | undefined;
        if (relatesTo?.rel_type === 'm.annotation' && relatesTo.event_id && relatesTo.key) {
          matrixEvents.emit(MATRIX_EVENTS.MESSAGE_REACTION, {
            roomId: room.roomId,
            eventId: relatesTo.event_id,
            emoji: relatesTo.key,
            sender: event.getSender(),
          });
        }
        return;
      }

      if (eventType !== 'm.room.message' && eventType !== 'm.room.encrypted') return;

      // Skip local echo events — our send methods (sendMessage/sendImage/sendFile)
      // manage the full lifecycle via MESSAGE_SENDING → MESSAGE_SENT events.
      // Local echoes have a non-null `status` (e.g. "sending", "encrypting").
      if ((event as { status?: unknown }).status) return;

      // Handle m.replace (message edit)
      const content = event.getContent() as Record<string, unknown>;
      const relatesTo = content['m.relates_to'] as
        | { rel_type?: string; event_id?: string }
        | undefined;
      if (relatesTo?.rel_type === 'm.replace' && relatesTo.event_id) {
        const newContent = content['m.new_content'] as { body?: string } | undefined;
        if (newContent?.body) {
          matrixEvents.emit(MATRIX_EVENTS.MESSAGE_EDITED, {
            roomId: room.roomId,
            eventId: relatesTo.event_id,
            newContent: newContent.body,
          });
        }
        return;
      }

      const eventId = event.getId();
      if (!eventId || this.processedMessageIds.has(eventId)) return;
      this.processedMessageIds.add(eventId);

      const message = this.formatMessage(event, room.roomId);
      matrixEvents.emit(MATRIX_EVENTS.MESSAGE_RECEIVED, message);
    });

    // 监听消息解密事件，更新已显示的加密消息
    matrixClient.on(sdk.MatrixEventEvent.Decrypted, event => {
      if (event.getType() !== 'm.room.message') return;

      const eventId = event.getId();
      const roomId = event.getRoomId();
      if (!eventId || !roomId) return;

      // 如果消息已经处理过，发送更新事件
      if (this.processedMessageIds.has(eventId)) {
        const message = this.formatMessage(event, roomId);
        matrixEvents.emit(MATRIX_EVENTS.MESSAGE_UPDATED, message);
      }
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
        // Auto-join based on invite policy (aligned with mobazha-mobile)
        this._handleRoomInvite(roomId, senderId);
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

    // Room state events - listen for peerID updates from other members
    matrixClient.on(sdk.RoomStateEvent.Events, event => {
      const eventType = event.getType();

      if (eventType === 'org.mobazha.member_peerid') {
        const senderId = event.getSender();
        const content = event.getContent() as { peer_id?: string };
        if (content.peer_id && senderId) {
          this._peerIdCache.set(senderId, content.peer_id);
        }
        if (senderId !== this.config?.userId) {
          matrixEvents.emit(MATRIX_EVENTS.MEMBER_PEERID_UPDATED, {
            roomId: event.getRoomId(),
            userId: senderId,
            peerID: content.peer_id,
          });
        }
      }
    });
  }

  /**
   * 查找已存在的直接聊天房间
   */
  private async findDirectRoom(userId: string): Promise<string | null> {
    if (!this.client) return null;

    try {
      const matrixClient = this.client!;

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

      // 返回第一个有效的房间（优先 join，其次 invite）
      let inviteRoomId: string | null = null;
      for (const roomId of roomIds) {
        const room = matrixClient.getRoom(roomId);
        if (!room) continue;
        const membership = room.getMyMembership();
        if (membership === 'join') return roomId;
        if (membership === 'invite' && !inviteRoomId) inviteRoomId = roomId;
      }

      return inviteRoomId;
    } catch (error) {
      console.warn('[Matrix] Failed to find direct room:', error);
      return null;
    }
  }

  /**
   * 获取 Matrix 客户端的 baseUrl
   */
  private getBaseUrl(): string {
    if (!this.client) {
      return this.config?.homeserverUrl || '';
    }
    const matrixClient = this.client as { baseUrl?: string };
    return matrixClient.baseUrl || this.config?.homeserverUrl || '';
  }

  /**
   * 将 mxc:// URL 转换为认证媒体 URL
   * 使用 /_matrix/client/v1/media/download/ 端点（需要认证）
   */
  private mxcToHttp(
    mxcUrl: string | null | undefined,
    _width = 48,
    _height = 48
  ): string | undefined {
    if (!mxcUrl || !mxcUrl.startsWith('mxc://')) {
      return undefined;
    }
    if (!this.client) {
      return undefined;
    }

    // 解析 mxc URL: mxc://server/media_id
    const parts = mxcUrl.replace('mxc://', '').split('/');
    if (parts.length < 2) {
      return undefined;
    }
    const [mediaServer, mediaId] = parts;

    // 使用认证媒体端点（Matrix 1.11+）
    // 格式: {homeserver}/_matrix/client/v1/media/download/{server}/{mediaId}
    const baseUrl = this.getBaseUrl();
    return `${baseUrl}/_matrix/client/v1/media/download/${mediaServer}/${mediaId}`;
  }

  // 图片缓存
  private imageCache: Map<string, string> = new Map();

  /**
   * 下载需要认证的图片并返回 blob URL
   * 这是处理 Matrix 媒体的正确方式
   */
  async downloadAuthenticatedImage(url: string): Promise<string | null> {
    if (!url || !this.client) return null;

    // 检查缓存
    if (this.imageCache.has(url)) {
      return this.imageCache.get(url) || null;
    }

    try {
      let mediaUrl: string | undefined;

      // 如果是 mxc:// URL，转换为认证媒体 URL
      if (url.startsWith('mxc://')) {
        mediaUrl = this.mxcToHttp(url);
      }
      // 如果已经是认证媒体 URL，直接使用
      else if (url.includes('/_matrix/client/v1/media/')) {
        mediaUrl = url;
      }
      // 其他 HTTP URL，直接返回（不需要认证）
      else if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
      }

      if (!mediaUrl) {
        return null;
      }

      const matrixClient = this.client as { getAccessToken?: () => string | null };
      const accessToken = matrixClient.getAccessToken?.();

      if (!accessToken) {
        return null;
      }

      const response = await fetch(mediaUrl, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        return null;
      }

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      // 缓存结果
      this.imageCache.set(url, blobUrl);

      return blobUrl;
    } catch {
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
      getMyMembership?: () => string;
      getDMInviter?: () => string | undefined;
      getJoinedMembers?: () => unknown[];
      getAvatarUrl?: (
        baseUrl: string,
        width: number,
        height: number,
        resizeMethod: string,
        allowDefault: boolean
      ) => string | null;
      getMxcAvatarUrl?: () => string | null;
      currentState?: {
        getStateEvents?: (type: string, stateKey?: string) => unknown;
      };
    };

    const membership = (r.getMyMembership?.() || 'join') as MatrixRoom['membership'];
    const inviter = r.getDMInviter?.();

    // 获取房间头像 - 存储原始 mxc URL 用于认证下载
    const roomMxcUrl = r.getMxcAvatarUrl?.() || null;

    // 转换为认证媒体 URL
    const avatarUrl = roomMxcUrl ? this.mxcToHttp(roomMxcUrl, 64, 64) : undefined;

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
    // isDirectRoom 现在包含: getDMInviter 检查、m.direct 检查、成员数量检查
    const isDirect = roomType === 'direct' || (!roomType && this.isDirectRoom(r.roomId));

    // 获取房间成员 (enriched with peerID and isExternal)
    const members = this.getRoomMembers(room);

    // Build memberPeerIDs map from enriched members
    const memberPeerIDs: Record<string, string> = {};
    for (const m of members) {
      if (m.peerID) {
        memberPeerIDs[m.userId] = m.peerID;
      }
    }

    // For DM rooms, prefer the partner's Matrix displayName over raw room name
    let roomName = r.name || r.normalizedName;
    if (isDirect && members.length > 0) {
      const partner = members[0];
      if (partner.displayName && partner.displayName !== partner.userId) {
        roomName = partner.displayName;
      }
    }

    // 如果房间没有头像，使用第一个成员的头像
    let finalAvatarUrl = avatarUrl;
    let finalMxcUrl = roomMxcUrl;
    if (!finalAvatarUrl && members.length > 0) {
      finalAvatarUrl = members[0].avatarUrl;
      finalMxcUrl = members[0].rawMxcAvatarUrl || null;
    }

    return {
      roomId: r.roomId,
      name: roomName,
      avatarUrl: finalAvatarUrl,
      rawMxcAvatarUrl: finalMxcUrl || undefined,
      isDirect,
      isEncrypted: this.isRoomEncrypted(room),
      unreadCount: this.getRoomUnreadCount(room),
      members,
      membership,
      inviter,
      roomType: roomType || (isDirect ? 'direct' : 'group'),
      orderId,
      storeId,
      moderatorId,
      memberPeerIDs,
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
        getMxcAvatarUrl?: () => string | null;
      }>;
      getMembersWithMembership?: (membership: string) => Array<{
        userId: string;
        name?: string;
        getMxcAvatarUrl?: () => string | null;
      }>;
    };

    if (!r.getJoinedMembers) {
      return [];
    }

    try {
      const formatMember = (m: {
        userId: string;
        name?: string;
        getMxcAvatarUrl?: () => string | null;
      }): MatrixUser => {
        const rawMxcUrl = m.getMxcAvatarUrl?.() || undefined;
        const avatarUrl = rawMxcUrl ? this.mxcToHttp(rawMxcUrl, 48, 48) : undefined;
        const peerID = this.getMemberPeerID(room, m.userId);
        const serverName = this.serverConfig?.serverName;
        const isExternal = serverName ? !m.userId.endsWith(`:${serverName}`) : false;
        return {
          userId: m.userId,
          displayName: m.name,
          avatarUrl,
          rawMxcAvatarUrl: rawMxcUrl,
          peerID,
          isExternal,
        };
      };

      const joined = r.getJoinedMembers();
      const result = joined.filter(m => m.userId !== this.config?.userId).map(formatMember);

      // Also include invited members (for DM rooms where the other user hasn't joined yet)
      if (result.length === 0 && r.getMembersWithMembership) {
        const invited = r.getMembersWithMembership('invite');
        const invitedOthers = invited
          .filter(m => m.userId !== this.config?.userId)
          .map(formatMember);
        result.push(...invitedOthers);
      }

      return result;
    } catch {
      return [];
    }
  }

  /**
   * 检查是否是直接聊天房间
   * 参考移动端实现：
   * 1. 检查 getDMInviter
   * 2. 检查 m.direct 账户数据
   * 3. 如果只有2个成员，认为是直接聊天
   */
  private isDirectRoom(roomId: string): boolean {
    if (!this.client) return false;

    try {
      const matrixClient = this.client as {
        getRoom?: (roomId: string) => {
          getDMInviter?: () => string | null;
          getJoinedMemberCount?: () => number;
        } | null;
        getAccountData?: (type: string) => { getContent: () => Record<string, string[]> } | null;
      };

      const room = matrixClient.getRoom?.(roomId);

      // 1. 检查 DM 邀请者
      if (room?.getDMInviter?.()) {
        return true;
      }

      // 2. 检查 m.direct 账户数据
      if (matrixClient.getAccountData) {
        const directEvent = matrixClient.getAccountData('m.direct');
        if (directEvent) {
          const directContent = directEvent.getContent();
          for (const roomIds of Object.values(directContent)) {
            if (roomIds.includes(roomId)) {
              return true;
            }
          }
        }
      }

      // 3. 如果只有2个成员，认为是直接聊天
      if (room?.getJoinedMemberCount?.() === 2) {
        return true;
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
      getContent: () => Record<string, unknown>;
      getClearContent?: () => Record<string, unknown> | null;
      getTs: () => number;
      isDecryptionFailure?: () => boolean;
    };

    const wireType = e.getWireType?.() || e.getType();
    const isEncrypted = wireType === 'm.room.encrypted';

    // 对于加密消息，使用 getClearContent 获取解密后的内容
    const clearContent = isEncrypted ? e.getClearContent?.() : null;
    const content = clearContent || e.getContent();

    // 获取发送者信息
    const senderInfo = this.getSenderInfo(roomId, e.getSender());

    // 检查解密是否失败
    if (e.isDecryptionFailure?.()) {
      return {
        id: e.getId(),
        roomId,
        sender: e.getSender(),
        senderName: senderInfo?.displayName,
        senderAvatar: senderInfo?.avatarUrl,
        senderRawMxcAvatarUrl: senderInfo?.rawMxcAvatarUrl,
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
        senderName: senderInfo?.displayName,
        senderAvatar: senderInfo?.avatarUrl,
        senderRawMxcAvatarUrl: senderInfo?.rawMxcAvatarUrl,
        content: '🔐 Decrypting...',
        type: 'text',
        timestamp: e.getTs(),
        isSystem: true,
      };
    }

    const msgtype = (content.msgtype as string) || 'm.text';
    const messageType = this.getMessageType(msgtype);

    const msg: MatrixMessage = {
      id: e.getId(),
      roomId,
      sender: e.getSender(),
      senderName: senderInfo?.displayName,
      senderAvatar: senderInfo?.avatarUrl,
      senderRawMxcAvatarUrl: senderInfo?.rawMxcAvatarUrl,
      content: (content.body as string) || '',
      type: messageType,
      timestamp: e.getTs(),
    };

    if (
      messageType === 'image' ||
      messageType === 'file' ||
      messageType === 'audio' ||
      messageType === 'video'
    ) {
      const mxcUrl = content.url as string | undefined;
      const info = content.info as
        | { mimetype?: string; size?: number; w?: number; h?: number; thumbnail_url?: string }
        | undefined;
      if (mxcUrl) {
        msg.attachments = [
          {
            url: this.mxcToHttp(mxcUrl) || mxcUrl,
            filename: (content.body as string) || undefined,
            mimetype: info?.mimetype,
            size: info?.size,
            width: info?.w,
            height: info?.h,
            thumbnailUrl: info?.thumbnail_url
              ? this.mxcToHttp(info.thumbnail_url) || info.thumbnail_url
              : undefined,
          },
        ];
      }
    }

    return msg;
  }

  /**
   * 获取消息发送者信息
   */
  private getSenderInfo(
    roomId: string,
    senderId: string
  ): { displayName?: string; avatarUrl?: string; rawMxcAvatarUrl?: string } | null {
    if (!this.client) {
      return null;
    }

    try {
      const matrixClient = this.client as {
        getRoom?: (roomId: string) => {
          getMember?: (userId: string) => {
            name?: string;
            getAvatarUrl?: (
              baseUrl: string,
              width: number,
              height: number,
              resizeMethod: string,
              allowDefault: boolean
            ) => string | null;
            getMxcAvatarUrl?: () => string | null;
          } | null;
        } | null;
      };

      const room = matrixClient.getRoom?.(roomId);
      if (!room) {
        return null;
      }

      const member = room.getMember?.(senderId);
      if (!member) {
        return null;
      }

      // 获取原始 mxc URL
      const rawMxcAvatarUrl = member.getMxcAvatarUrl?.() || undefined;

      // 转换为认证媒体 URL
      const avatarUrl = rawMxcAvatarUrl ? this.mxcToHttp(rawMxcAvatarUrl, 48, 48) : undefined;

      return {
        displayName: member.name,
        avatarUrl,
        rawMxcAvatarUrl,
      };
    } catch {
      return null;
    }
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
      // 清除 crypto stores - 此时还没有活跃连接，不会被阻塞
      await this._clearAllCryptoStores(userId);

      // 清除存储的设备 ID
      localStorage.removeItem(storageKey);
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
      } catch {
        // Could not enumerate databases
      }
    }
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
        request.onsuccess = () => resolve();
        request.onerror = () => resolve();
        request.onblocked = () => resolve();
      } catch {
        resolve();
      }
    });
  }
}

// 导出单例
export const matrixClient = new MatrixClientService();
