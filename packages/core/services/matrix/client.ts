/**
 * Matrix 客户端服务 — Facade
 * 初始化 / 认证 / 同步 / 生命周期管理
 * 所有业务逻辑委托给 messages.ts、rooms.ts、verification.ts、event-listeners.ts
 */

import type { MatrixConfig, MatrixRoom, MatrixMessage, MatrixContext, InvitePolicy } from './types';
import { MATRIX_EVENTS } from './types';
import { matrixEvents } from './events';
import {
  saveCredentials,
  getCredentials,
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

// Module imports
import * as msgModule from './messages';
import * as roomModule from './rooms';
import * as verifyModule from './verification';
import { setupEventListeners as registerEventListeners } from './event-listeners';
import type { EventListenerCallbacks } from './event-listeners';

// Browser globals
declare const indexedDB: typeof globalThis.indexedDB | undefined;
declare const localStorage: typeof globalThis.localStorage | undefined;

type MatrixClientInstance = import('matrix-js-sdk').MatrixClient;

const DEFAULT_CONFIG: Partial<MatrixConfig> = {
  homeserverUrl: 'https://matrix.org',
};

const MATRIX_CRYPTO_DEVICE_KEY = 'matrix_crypto_device';
const AUTO_BACKUP_INTERVAL = 5 * 60 * 1000;
const BACKUP_DEBOUNCE_DELAY = 30 * 1000;

/**
 * Matrix 客户端服务类 (Facade)
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

  // Verification module state
  private _verifyState = verifyModule.createVerificationState();

  // Event listener cleanup
  private _cleanupListeners: (() => void) | null = null;

  // ============ Context builder ============

  private get _ctx(): MatrixContext {
    return {
      client: this.client!,
      config: this.config!,
      serverConfig: this.serverConfig,
      currentPeerID: this.currentPeerID,
      processedMessageIds: this.processedMessageIds,
      peerIdCache: this._peerIdCache,
    };
  }

  // ============= 初始化和认证 =============

  async initializeWithPeerID(peerID: string): Promise<boolean> {
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    if (this.isInitialized && this.client && this.currentPeerID === peerID) {
      return true;
    }

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

  private async _doInitializeWithPeerID(peerID: string): Promise<boolean> {
    try {
      const config = await this._getServerConfig();
      if (!config) {
        throw new Error('Matrix is not enabled on this server');
      }

      let accessToken: string | null = null;
      let refreshToken: string | null = null;
      let userId: string | null = null;
      let deviceId: string | null = null;

      const stored = await getCredentials();
      const expectedUserId = `@peer_${peerID.toLowerCase()}:${config.serverName}`;

      if (stored.accessToken && stored.userId === expectedUserId) {
        const isValid = await this._validateAccessToken(config.homeserverURL, stored.accessToken);
        if (isValid) {
          accessToken = stored.accessToken;
          refreshToken = stored.refreshToken;
          userId = stored.userId;
          deviceId = stored.deviceId;
        } else {
          await clearCredentialsKeepDevice();
          const credentials = await this._autoRegister(peerID, config);
          accessToken = credentials.accessToken;
          refreshToken = credentials.refreshToken || null;
          userId = credentials.userId;
          deviceId = credentials.deviceId;
        }
      } else {
        const credentials = await this._autoRegister(peerID, config);
        accessToken = credentials.accessToken;
        refreshToken = credentials.refreshToken || null;
        userId = credentials.userId;
        deviceId = credentials.deviceId;
      }

      if (!accessToken || !userId) {
        throw new Error('Failed to obtain Matrix credentials');
      }

      if (deviceId) {
        await this._ensureCryptoStoreMatchesDevice(userId, deviceId);
      }

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

      if (refreshToken) {
        clientOpts.refreshToken = refreshToken;
        clientOpts.tokenRefreshFunction = this._createTokenRefreshFunction(config.homeserverURL);
      }

      this.client = sdk.createClient(clientOpts);

      const matrixClient = this.client!;
      const cryptoDbPrefix = `matrix-crypto-${userId}`;

      try {
        await matrixClient.initRustCrypto({
          useIndexedDB: true,
          cryptoDatabasePrefix: cryptoDbPrefix,
        });
        if (deviceId) {
          this._markCryptoStoreDevice(userId, deviceId);
        }
      } catch (cryptoError) {
        const errorMsg = cryptoError instanceof Error ? cryptoError.message : String(cryptoError);
        const isCorruptedData =
          errorMsg.includes('TextDecoder') ||
          errorMsg.includes('decode') ||
          errorMsg.includes('panic') ||
          errorMsg.includes('wasm') ||
          errorMsg.includes('unreachable');

        if (isCorruptedData) {
          console.warn('[Matrix] Crypto store data corrupted, clearing and retrying...');
          await this._clearAllCryptoStores(userId);
          if (typeof localStorage !== 'undefined') {
            localStorage.removeItem(`${MATRIX_CRYPTO_DEVICE_KEY}_${userId}`);
          }

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
          }
        } else {
          console.error('[Matrix] Crypto initialization failed:', cryptoError);
        }
      }

      // Set config BEFORE setting up event listeners so _ctx is valid
      this.config = {
        homeserverUrl: config.homeserverURL,
        accessToken,
        userId,
        deviceId: deviceId || undefined,
      };
      this.currentPeerID = peerID;
      this.isInitialized = true;

      // Setup event listeners via module
      await this._setupListeners();
      verifyModule.setupVerificationListeners(this._ctx, this._verifyState).catch(() => {});

      // Load invite policy from storage
      this._invitePolicy = roomModule.loadInvitePolicy();

      return true;
    } catch (error) {
      console.error('[Matrix] Initialization with peerID failed:', error);
      matrixEvents.emit(MATRIX_EVENTS.ERROR, { error });
      return false;
    }
  }

  async initialize(config?: Partial<MatrixConfig>): Promise<boolean> {
    if (this.isInitialized) {
      console.warn('[Matrix] Already initialized');
      return true;
    }

    try {
      this.config = { ...DEFAULT_CONFIG, ...config } as MatrixConfig;

      const stored = await getCredentials();
      if (stored.accessToken && stored.userId) {
        this.config.accessToken = stored.accessToken;
        this.config.userId = stored.userId;
        this.config.deviceId = stored.deviceId || undefined;
      }

      const sdk = await import('matrix-js-sdk');
      this.client = sdk.createClient({
        baseUrl: this.config.homeserverUrl,
        accessToken: this.config.accessToken,
        userId: this.config.userId,
        deviceId: this.config.deviceId,
        useAuthorizationHeader: true,
      });

      await this._setupListeners();
      verifyModule.setupVerificationListeners(this._ctx, this._verifyState).catch(() => {});
      this.isInitialized = true;

      return true;
    } catch (error) {
      console.error('[Matrix] Initialization failed:', error);
      return false;
    }
  }

  async login(username: string, password: string): Promise<boolean> {
    if (!this.client) throw new Error('Matrix client not initialized');

    try {
      const response = await this.client.login('m.login.password', {
        user: username,
        password,
        initial_device_display_name: 'Mobazha Web',
      });

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

  async logout(clearDevice = false): Promise<void> {
    this._stopAutoBackup();

    if (this.client) {
      try {
        await this.client.logout();
      } catch (error) {
        console.warn('[Matrix] Logout error:', error);
      }
    }

    if (clearDevice) {
      await clearAllCredentials();
    } else {
      await clearCredentialsKeepDevice();
    }

    // Cleanup listeners
    if (this._cleanupListeners) {
      this._cleanupListeners();
      this._cleanupListeners = null;
    }

    this.client = null;
    this.isInitialized = false;
    this.isConnected = false;
    this.currentPeerID = null;
    this._peerIdCache.clear();
    this.processedMessageIds.clear();
    msgModule.resetMessageState();
    verifyModule.resetVerificationState(this._verifyState);
    matrixEvents.emit(MATRIX_EVENTS.DISCONNECTED);
  }

  // ============= Sync lifecycle =============

  async startSync(): Promise<void> {
    if (!this.client || !this.config?.accessToken) {
      throw new Error('Not logged in');
    }

    const sdk = await import('matrix-js-sdk');
    const matrixClient = this.client!;

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Sync timeout after 60s'));
      }, 60000);

      const onSync = async (state: string, _prevState: string | null, data?: unknown) => {
        switch (state) {
          case 'PREPARED':
            clearTimeout(timeout);
            this.isConnected = true;
            matrixEvents.emit(MATRIX_EVENTS.CONNECTED);
            console.warn('[Matrix] Sync prepared, initial sync complete');
            this._setupE2EEAfterSync().catch(error => {
              console.warn('[Matrix] E2EE setup failed (non-fatal):', error);
            });
            resolve();
            break;
          case 'SYNCING':
            this.isConnected = true;
            break;
          case 'ERROR': {
            this.isConnected = false;
            console.error('[Matrix] Sync error:', data);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const errorData = data as any;
            const errcode = errorData?.error?.errcode || errorData?.errcode;
            if (errcode === 'M_UNKNOWN_TOKEN') {
              console.warn('[Matrix] Token expired, triggering re-authentication');
              matrixEvents.emit(MATRIX_EVENTS.AUTH_REQUIRED, { reason: 'TOKEN_EXPIRED' });
            } else {
              matrixEvents.emit(MATRIX_EVENTS.SYNC_ERROR, { error: data });
            }
            break;
          }
          case 'STOPPED':
            this.isConnected = false;
            matrixEvents.emit(MATRIX_EVENTS.DISCONNECTED);
            break;
        }
      };

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
      matrixClient.startClient({ initialSyncLimit: 20 });
    });
  }

  async stopSync(): Promise<void> {
    if (this.client) {
      this.client.stopClient();
    }
    this.isConnected = false;
    matrixEvents.emit(MATRIX_EVENTS.DISCONNECTED);
  }

  // ============= Status getters =============

  isClientConnected(): boolean {
    return this.isConnected;
  }

  getUserId(): string | null {
    return this.config?.userId || null;
  }

  getDeviceId(): string | null {
    return this.config?.deviceId || null;
  }

  // ============= Messages (delegated) =============

  async getMessages(roomId: string, limit = 50): Promise<MatrixMessage[]> {
    return msgModule.getMessages(this._ctx, roomId, limit);
  }

  async loadOlderMessages(roomId: string, limit = 50): Promise<MatrixMessage[]> {
    return msgModule.loadOlderMessages(this._ctx, roomId, limit);
  }

  async sendMessage(roomId: string, content: string): Promise<MatrixMessage | null> {
    const result = await msgModule.sendMessage(this._ctx, roomId, content);
    this._scheduleKeyBackup();
    return result;
  }

  async sendImage(
    roomId: string,
    file: File,
    externalLocalId?: string
  ): Promise<MatrixMessage | null> {
    const result = await msgModule.sendImage(this._ctx, roomId, file, externalLocalId);
    this._scheduleKeyBackup();
    return result;
  }

  async sendFile(
    roomId: string,
    file: File,
    externalLocalId?: string
  ): Promise<MatrixMessage | null> {
    const result = await msgModule.sendFile(this._ctx, roomId, file, externalLocalId);
    this._scheduleKeyBackup();
    return result;
  }

  async sendTyping(roomId: string, isTyping: boolean, timeout = 5000): Promise<void> {
    return msgModule.sendTyping(this._ctx, roomId, isTyping, timeout);
  }

  async markRoomAsRead(roomId: string): Promise<boolean> {
    return msgModule.markRoomAsRead(this._ctx, roomId);
  }

  async getReadReceiptForRoom(roomId: string): Promise<Record<string, string>> {
    return msgModule.getReadReceiptForRoom(this._ctx, roomId);
  }

  async redactEvent(roomId: string, eventId: string, reason?: string): Promise<void> {
    return msgModule.redactEvent(this._ctx, roomId, eventId, reason);
  }

  async editMessage(roomId: string, originalEventId: string, newContent: string): Promise<void> {
    return msgModule.editMessage(this._ctx, roomId, originalEventId, newContent);
  }

  async sendReaction(roomId: string, eventId: string, emoji: string): Promise<void> {
    return msgModule.sendReaction(this._ctx, roomId, eventId, emoji);
  }

  mxcToHttp(mxcUrl: string | null | undefined, width = 48, height = 48): string | undefined {
    return msgModule.mxcToHttp(this._ctx, mxcUrl, width, height);
  }

  async downloadAuthenticatedImage(url: string): Promise<string | null> {
    return msgModule.downloadAuthenticatedImage(this._ctx, url);
  }

  // ============= Rooms (delegated) =============

  async getRooms(): Promise<MatrixRoom[]> {
    return roomModule.getRooms(this._ctx);
  }

  async getRoomsByType(
    type: 'direct' | 'group' | 'order' | 'store' | 'moderator'
  ): Promise<MatrixRoom[]> {
    return roomModule.getRoomsByType(this._ctx, type);
  }

  async getOrCreateDirectRoom(peerID: string, displayName?: string): Promise<string | null> {
    return roomModule.getOrCreateDirectRoom(this._ctx, peerID, displayName);
  }

  async createDirectRoom(userId: string, displayName?: string): Promise<string | null> {
    return roomModule.createDirectRoom(this._ctx, userId, displayName);
  }

  async joinRoom(roomIdOrAlias: string): Promise<boolean> {
    return roomModule.joinRoom(this._ctx, roomIdOrAlias);
  }

  async leaveRoom(roomId: string): Promise<boolean> {
    return roomModule.leaveRoom(this._ctx, roomId);
  }

  async inviteToRoom(roomId: string, userId: string): Promise<boolean> {
    return roomModule.inviteToRoom(this._ctx, roomId, userId);
  }

  async kickFromRoom(roomId: string, userId: string, reason?: string): Promise<boolean> {
    return roomModule.kickFromRoom(this._ctx, roomId, userId, reason);
  }

  async setRoomName(roomId: string, name: string): Promise<boolean> {
    return roomModule.setRoomName(this._ctx, roomId, name);
  }

  async setRoomTopic(roomId: string, topic: string): Promise<boolean> {
    return roomModule.setRoomTopic(this._ctx, roomId, topic);
  }

  async createOrderRoom(
    orderId: string,
    participants: string[],
    orderInfo?: { title?: string; vendorId?: string; buyerId?: string }
  ): Promise<string | null> {
    return roomModule.createOrderRoom(this._ctx, orderId, participants, orderInfo);
  }

  async getOrderRoom(orderId: string): Promise<MatrixRoom | null> {
    return roomModule.getOrderRoom(this._ctx, orderId);
  }

  async createStoreRoom(
    storeId: string,
    storeInfo: { name: string; description?: string; ownerId: string }
  ): Promise<string | null> {
    return roomModule.createStoreRoom(this._ctx, storeId, storeInfo);
  }

  async getStoreRoom(storeId: string): Promise<MatrixRoom | null> {
    return roomModule.getStoreRoom(this._ctx, storeId);
  }

  async createModeratorRoom(
    orderId: string,
    moderatorId: string,
    participants: string[]
  ): Promise<string | null> {
    return roomModule.createModeratorRoom(this._ctx, orderId, moderatorId, participants);
  }

  async createGroupRoom(
    name: string,
    members: string[],
    options?: { topic?: string; isEncrypted?: boolean }
  ): Promise<string | null> {
    return roomModule.createGroupRoom(this._ctx, name, members, options);
  }

  // ============= Invite policy (delegated) =============

  setInvitePolicy(policy: InvitePolicy): void {
    this._invitePolicy = policy;
    roomModule.saveInvitePolicy(policy);
  }

  getInvitePolicy(): InvitePolicy {
    return this._invitePolicy;
  }

  isMobazhaUser(userId: string): boolean {
    return roomModule.isMobazhaUser(this._ctx, userId);
  }

  // ============= Profile (delegated) =============

  async setDisplayName(displayName: string): Promise<void> {
    return roomModule.setDisplayName(this._ctx, displayName);
  }

  async syncProfileToMatrix(displayName: string, avatarUrl?: string): Promise<void> {
    return roomModule.syncProfileToMatrix(this._ctx, displayName, avatarUrl);
  }

  async setMyPeerIDInRoom(roomId: string): Promise<void> {
    return roomModule.setMyPeerIDInRoom(this._ctx, roomId);
  }

  extractPeerIdFromUserId(userId: string): string | null {
    return roomModule.extractPeerIdFromUserId(userId);
  }

  // ============= Verification (delegated) =============

  async setupVerificationListeners(): Promise<void> {
    return verifyModule.setupVerificationListeners(this._ctx, this._verifyState);
  }

  async requestVerification(userId: string): Promise<void> {
    const rooms = await this.getRooms();
    return verifyModule.requestVerification(this._ctx, this._verifyState, userId, rooms);
  }

  async acceptVerificationRequest(): Promise<boolean> {
    return verifyModule.acceptVerificationRequest(this._verifyState);
  }

  async confirmVerification(): Promise<boolean> {
    return verifyModule.confirmVerification(this._verifyState);
  }

  async cancelVerification(): Promise<boolean> {
    return verifyModule.cancelVerification(this._verifyState);
  }

  async isUserVerified(userId: string): Promise<boolean> {
    return verifyModule.isUserVerified(this._ctx, userId);
  }

  async getIgnoredUsers(): Promise<string[]> {
    return verifyModule.getIgnoredUsers(this._ctx);
  }

  async isUserIgnored(userId: string): Promise<boolean> {
    return verifyModule.isUserIgnored(this._ctx, userId);
  }

  async blockUser(userId: string): Promise<void> {
    return verifyModule.blockUser(this._ctx, this._verifyState, userId);
  }

  async unblockUser(userId: string): Promise<void> {
    return verifyModule.unblockUser(this._ctx, this._verifyState, userId);
  }

  // ============= Private: Event listeners =============

  private async _setupListeners(): Promise<void> {
    if (this._cleanupListeners) {
      this._cleanupListeners();
    }
    const callbacks: EventListenerCallbacks = {
      onSyncStateChange: connected => {
        this.isConnected = connected;
      },
      getInvitePolicy: () => this._invitePolicy,
      scheduleKeyBackup: () => this._scheduleKeyBackup(),
    };
    this._cleanupListeners = await registerEventListeners(this._ctx, callbacks);
  }

  // ============= Private: Backup =============

  private _scheduleKeyBackup(): void {
    if (this.backupDebounceTimer) {
      clearTimeout(this.backupDebounceTimer);
    }
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

  private _startAutoBackup(): void {
    if (this.autoBackupTimer) {
      clearInterval(this.autoBackupTimer);
    }
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

  // ============= Private: Auth helpers =============

  private async _getServerConfig(): Promise<{ homeserverURL: string; serverName: string } | null> {
    if (this.serverConfig) return this.serverConfig;

    try {
      const config = await getMatrixConfig();
      if (!config.enabled) return null;
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

  private async _autoRegister(
    peerID: string,
    config: { homeserverURL: string; serverName: string }
  ): Promise<{ accessToken: string; refreshToken?: string; userId: string; deviceId: string }> {
    const deviceId = await this._getOrCreateDeviceId();
    const nodeCredentials = await getMatrixCredentials();

    if (nodeCredentials?.registered && nodeCredentials.password) {
      const expectedUserId = `@peer_${peerID.toLowerCase()}:${config.serverName}`;
      if (nodeCredentials.matrixUserId?.toLowerCase() === expectedUserId.toLowerCase()) {
        try {
          return await this._loginWithPassword(
            config.homeserverURL,
            nodeCredentials.matrixUserId,
            nodeCredentials.password,
            deviceId
          );
        } catch (error) {
          if ((error as { errcode?: string }).errcode === 'M_FORBIDDEN') {
            return this._syncPasswordAndLogin(peerID, config, deviceId);
          }
          throw error;
        }
      }
    }

    return this._registerNewUser(peerID, config, deviceId);
  }

  private async _registerNewUser(
    peerID: string,
    config: { homeserverURL: string; serverName: string },
    deviceId: string
  ): Promise<{ accessToken: string; refreshToken?: string; userId: string; deviceId: string }> {
    const derivedPassword = await getDerivedPassword();
    const regResponse = await autoRegisterMatrix(peerID, derivedPassword || undefined);
    if (!regResponse.registered) throw new Error('Registration failed');

    const loginResponse = await this._loginWithPassword(
      regResponse.homeServer,
      regResponse.userID,
      derivedPassword || '',
      deviceId
    );
    await saveMatrixCredentials(loginResponse.userId, config.serverName);
    return loginResponse;
  }

  private async _syncPasswordAndLogin(
    peerID: string,
    config: { homeserverURL: string; serverName: string },
    deviceId: string
  ): Promise<{ accessToken: string; refreshToken?: string; userId: string; deviceId: string }> {
    const derivedPassword = await getDerivedPassword();
    if (!derivedPassword) throw new Error('Failed to get derived password');

    const syncResponse = await autoRegisterMatrix(peerID, derivedPassword);
    if (!syncResponse.registered) throw new Error('Password sync failed');

    const loginResponse = await this._loginWithPassword(
      syncResponse.homeServer || config.homeserverURL,
      syncResponse.userID,
      derivedPassword,
      deviceId
    );
    await saveMatrixCredentials(loginResponse.userId, config.serverName);
    return loginResponse;
  }

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
      refresh_token: true,
    });

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

  private _createTokenRefreshFunction(
    homeserverUrl: string
  ): (refreshToken: string) => Promise<{ accessToken: string; refreshToken?: string }> {
    return async (refreshToken: string) => {
      try {
        const sdk = await import('matrix-js-sdk');
        const tempClient = sdk.createClient({ baseUrl: homeserverUrl });
        const response = await tempClient.refreshToken(refreshToken);
        await updateTokens(response.access_token, response.refresh_token);
        return { accessToken: response.access_token, refreshToken: response.refresh_token };
      } catch (error) {
        console.warn('[Matrix] Token refresh failed, triggering re-authentication');
        matrixEvents.emit(MATRIX_EVENTS.AUTH_REQUIRED, { reason: 'TOKEN_REFRESH_FAILED' });
        throw error;
      }
    };
  }

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

  private _generateRandomString(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }
    return result;
  }

  private async _validateAccessToken(homeserverUrl: string, accessToken: string): Promise<boolean> {
    try {
      const response = await fetch(`${homeserverUrl}/_matrix/client/v3/account/whoami`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      return response.ok;
    } catch (error) {
      console.warn('[Matrix] Token validation failed:', error);
      return false;
    }
  }

  // ============= Private: E2EE setup =============

  private async _setupE2EEAfterSync(): Promise<void> {
    if (!this.client) return;

    const matrixClient = this.client!;
    const { matrixCrypto } = await import('./crypto');
    const { getGatewayUrl, getAuthHeaders } = await import('../api/config');

    const nodeBaseUrl = getGatewayUrl();
    const authHeaders = getAuthHeaders();
    await matrixCrypto.initialize(matrixClient, { nodeBaseUrl, authHeaders });

    try {
      const hasSecretsBackup = await matrixCrypto.hasSecretsBundleBackup();
      if (hasSecretsBackup) {
        await matrixCrypto.restoreSecretsBundle();
      }
    } catch {
      // optional
    }

    try {
      const crypto = matrixClient.getCrypto?.();
      if (crypto) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const cryptoAny = crypto as any;
        if (typeof cryptoAny.isCrossSigningReady === 'function') {
          const isCrossSigningReady = await cryptoAny.isCrossSigningReady();
          if (!isCrossSigningReady) {
            if (typeof cryptoAny.bootstrapCrossSigning === 'function') {
              const derivedPassword = await getDerivedPassword();
              const userId = this.config?.userId;

              await cryptoAny.bootstrapCrossSigning({
                setupNewCrossSigning: true,
                authUploadDeviceSigningKeys: async (
                  makeRequest: (authData: Record<string, unknown>) => Promise<unknown>
                ) => {
                  try {
                    await makeRequest({});
                    return;
                  } catch (uiaError) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const uiaErr = uiaError as any;
                    if (uiaErr?.data?.flows && derivedPassword && userId) {
                      await makeRequest({
                        type: 'm.login.password',
                        identifier: { type: 'm.id.user', user: userId },
                        password: derivedPassword,
                      });
                    } else {
                      throw uiaError;
                    }
                  }
                },
              });
              await matrixCrypto.backupSecretsBundle();
            }
          }
        }
      }
    } catch {
      // optional
    }

    try {
      const hasKeyBackup = await matrixCrypto.hasKeyBackup();
      if (hasKeyBackup) {
        await matrixCrypto.restoreRoomKeys();
      }
    } catch {
      // optional
    }

    this._startAutoBackup();
  }

  // ============= Private: Crypto store management =============

  private async _ensureCryptoStoreMatchesDevice(
    userId: string,
    currentDeviceId: string
  ): Promise<void> {
    if (typeof indexedDB === 'undefined' || typeof localStorage === 'undefined') return;

    const storageKey = `${MATRIX_CRYPTO_DEVICE_KEY}_${userId}`;
    const storedDeviceId = localStorage.getItem(storageKey);

    if (storedDeviceId && storedDeviceId !== currentDeviceId) {
      console.warn(
        `[Matrix] Crypto store device mismatch: stored=${storedDeviceId}, current=${currentDeviceId}`
      );
      await this._clearAllCryptoStores(userId);
      localStorage.removeItem(storageKey);
    }
  }

  private _markCryptoStoreDevice(userId: string, deviceId: string): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(`${MATRIX_CRYPTO_DEVICE_KEY}_${userId}`, deviceId);
  }

  private async _clearAllCryptoStores(userId: string): Promise<void> {
    if (typeof indexedDB === 'undefined') return;

    const deletedDbs = new Set<string>();
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

    if ('databases' in indexedDB && typeof indexedDB.databases === 'function') {
      try {
        const databases = await indexedDB.databases();
        const userIdLower = userId.toLowerCase();
        for (const db of databases) {
          if (!db.name || deletedDbs.has(db.name)) continue;
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

  private async _clearIndexedDB(dbName: string): Promise<void> {
    if (typeof indexedDB === 'undefined') return;
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

// Singleton export
export const matrixClient = new MatrixClientService();
