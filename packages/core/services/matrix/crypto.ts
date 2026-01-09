/**
 * Matrix 端到端加密模块
 *
 * 提供以下功能:
 * - 设备密钥管理
 * - 消息加密/解密
 * - 设备验证
 * - 密钥备份和恢复 (通过 Mobazha 节点，去中心化存储)
 *
 * 安全说明:
 * - 密钥备份存储在用户自己的 Mobazha 节点上
 * - 加密/解密在节点端使用节点私钥完成
 * - 前端永远不接触私钥
 */

import type {
  CryptoConfig,
  DeviceInfo,
  VerificationRequest,
  KeyBackupInfo,
  CrossSigningStatus,
} from './types';
import { matrixEvents } from './events';
import { getConfig } from '../../config';

// Node API 端点 (去中心化存储在用户节点上)
// 注意: 路径不含 /v1 前缀，因为 nodeBaseUrl (getGatewayUrl) 已包含 /v1
const NODE_KEY_BACKUP_API = '/matrix/key-backup';
const NODE_SECRETS_BUNDLE_API = '/matrix/secrets-bundle';

// 加密事件
export const CRYPTO_EVENTS = {
  DEVICE_VERIFIED: 'crypto.device_verified',
  DEVICE_UNVERIFIED: 'crypto.device_unverified',
  KEY_BACKUP_ENABLED: 'crypto.key_backup_enabled',
  KEY_BACKUP_RESTORED: 'crypto.key_backup_restored',
  KEY_BACKUP_DELETED: 'crypto.key_backup_deleted',
  VERIFICATION_REQUEST: 'crypto.verification_request',
  VERIFICATION_START: 'crypto.verification_start',
  VERIFICATION_CANCEL: 'crypto.verification_cancel',
  VERIFICATION_DONE: 'crypto.verification_done',
  CROSS_SIGNING_READY: 'crypto.cross_signing_ready',
  ROOM_KEY_REQUEST: 'crypto.room_key_request',
  ENCRYPTION_ERROR: 'crypto.encryption_error',
} as const;

/**
 * 密钥备份结果
 */
export interface KeyBackupResult {
  success: boolean;
  keyCount?: number;
  reason?: string;
  error?: string;
}

/**
 * 节点备份信息
 */
export interface NodeBackupInfo {
  deviceId: string;
  keyCount: number;
  createdAt: string;
  updatedAt: string;
}

// 扩展事件类型 (在运行时使用，不需要类型检查)
type CryptoEventType = (typeof CRYPTO_EVENTS)[keyof typeof CRYPTO_EVENTS];

// MatrixClient 类型简化定义
interface MatrixClientLike {
  getUserId: () => string | null;
  getDeviceId: () => string | null;
  getRoom: (roomId: string) => RoomLike | null;
  getRooms: () => RoomLike[];
  getCrypto?: () => CryptoApiLike | undefined;
  sendStateEvent: (
    roomId: string,
    eventType: string,
    content: object,
    stateKey?: string
  ) => Promise<unknown>;
  on: (event: string, handler: (...args: unknown[]) => void) => void;
}

interface RoomLike {
  roomId: string;
  currentState: {
    getStateEvents: (type: string, stateKey: string) => unknown;
  };
}

interface CryptoApiLike {
  setDeviceVerified?: (userId: string, deviceId: string) => Promise<void>;
  getUserDeviceInfo?: (userIds: string[]) => Promise<Map<string, Map<string, DeviceLike>>>;
  requestVerificationDM?: (userId: string, roomId: string) => Promise<VerificationRequestLike>;
  resetKeyBackup?: () => Promise<KeyBackupLike>;
  getCrossSigningStatus?: () => Promise<CrossSigningStatusLike>;
  bootstrapCrossSigning?: (options: {
    authUploadDeviceSigningKeys: (makeRequest: (data: object) => Promise<void>) => Promise<void>;
  }) => Promise<void>;
}

interface DeviceLike {
  deviceId: string;
  displayName?: string;
  verified?: boolean | number;
}

interface VerificationRequestLike {
  transactionId?: string;
}

interface KeyBackupLike {
  version?: string;
  auth_data?: Record<string, unknown>;
}

interface CrossSigningStatusLike {
  publicKeysOnDevice?: boolean;
  privateKeysInSecretStorage?: boolean;
  privateKeysCachedLocally?: {
    masterKey?: boolean;
    selfSigningKey?: boolean;
    userSigningKey?: boolean;
  };
}

/**
 * Matrix 加密服务类
 */
class MatrixCryptoService {
  private client: MatrixClientLike | null = null;
  private config: CryptoConfig | null = null;
  private isInitialized = false;
  private verificationRequests = new Map<string, VerificationRequest>();
  private nodeBaseUrl = '';
  private authHeaders: Record<string, string> = {};

  /**
   * 初始化加密服务
   */
  async initialize(
    client: unknown,
    config?: Partial<CryptoConfig> & {
      nodeBaseUrl?: string;
      authHeaders?: Record<string, string>;
    }
  ): Promise<boolean> {
    if (this.isInitialized) {
      return true;
    }

    try {
      this.client = client as MatrixClientLike;
      // 存储配置供未来使用
      this.config = {
        keyBackupEnabled: true,
        crossSigningEnabled: true,
        autoVerifyOwnDevices: true,
        ...config,
      };

      // 设置节点 API 配置
      this.nodeBaseUrl = config?.nodeBaseUrl || getConfig().apiBaseUrl || '';
      this.authHeaders = config?.authHeaders || {};

      // 设置加密事件监听
      this.setupCryptoListeners();

      // 初始化加密组件
      await this.initCrypto();

      this.isInitialized = true;

      return true;
    } catch (error) {
      console.error('[MatrixCrypto] Initialization failed:', error);
      return false;
    }
  }

  /**
   * 设置认证头
   */
  setAuthHeaders(headers: Record<string, string>): void {
    this.authHeaders = headers;
  }

  /**
   * 设置节点 Base URL
   */
  setNodeBaseUrl(url: string): void {
    this.nodeBaseUrl = url;
  }

  /**
   * 初始化加密组件
   */
  private async initCrypto(): Promise<void> {
    if (!this.client) return;

    try {
      const crypto = this.client.getCrypto?.();
      if (crypto) {
        const userId = this.client.getUserId();
        const deviceId = this.client.getDeviceId();
        if (userId && deviceId) {
          await crypto.setDeviceVerified?.(userId, deviceId);
        }
      }
    } catch {
      // Crypto may not be available
    }
  }

  /**
   * 设置加密事件监听
   */
  private setupCryptoListeners(): void {
    if (!this.client) return;

    // 设备验证请求
    this.client.on('crypto.verification.request', (request: unknown) => {
      this.handleVerificationRequest(request);
    });

    // 密钥请求
    this.client.on('crypto.roomKeyRequest', (request: unknown) => {
      this.emitCryptoEvent(CRYPTO_EVENTS.ROOM_KEY_REQUEST, request);
    });
  }

  /**
   * 发送加密事件
   */
  private emitCryptoEvent(event: CryptoEventType, data: unknown): void {
    // 使用 any 绕过类型检查，因为这些是扩展事件
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    matrixEvents.emit(event as any, data);
  }

  /**
   * 处理验证请求
   */
  private handleVerificationRequest(request: unknown): void {
    const req = request as VerificationRequest;
    this.verificationRequests.set(req.transactionId, req);
    this.emitCryptoEvent(CRYPTO_EVENTS.VERIFICATION_REQUEST, req);
  }

  /**
   * 启用房间加密
   */
  async enableEncryption(roomId: string): Promise<boolean> {
    if (!this.client) return false;

    try {
      await this.client.sendStateEvent(roomId, 'm.room.encryption', {
        algorithm: 'm.megolm.v1.aes-sha2',
        rotation_period_ms: 604800000,
        rotation_period_msgs: 100,
      });

      return true;
    } catch {
      this.emitCryptoEvent(CRYPTO_EVENTS.ENCRYPTION_ERROR, { roomId });
      return false;
    }
  }

  /**
   * 检查房间是否加密
   */
  async isRoomEncrypted(roomId: string): Promise<boolean> {
    if (!this.client) return false;

    const room = this.client.getRoom(roomId);
    if (!room) return false;

    const encryptionEvent = room.currentState.getStateEvents('m.room.encryption', '');
    return !!encryptionEvent;
  }

  /**
   * 获取设备列表
   */
  async getDevices(userId?: string): Promise<DeviceInfo[]> {
    if (!this.client) return [];

    try {
      const targetUserId = userId || this.client.getUserId();
      if (!targetUserId) return [];

      const crypto = this.client.getCrypto?.();
      if (!crypto?.getUserDeviceInfo) return [];

      const devices = await crypto.getUserDeviceInfo([targetUserId]);
      if (!devices) return [];

      const userDevices = devices.get(targetUserId);
      if (!userDevices) return [];

      return Array.from(userDevices.values()).map(device => ({
        deviceId: device.deviceId,
        displayName: device.displayName || device.deviceId,
        verified: device.verified === true || device.verified === 2, // 2 = verified in older versions
      }));
    } catch {
      return [];
    }
  }

  /**
   * 开始设备验证
   */
  async startVerification(userId: string, deviceId?: string): Promise<VerificationRequest | null> {
    if (!this.client) return null;

    try {
      const crypto = this.client.getCrypto?.();
      if (!crypto?.requestVerificationDM) return null;

      const rooms = this.client.getRooms();
      if (rooms.length === 0) return null;

      const request = await crypto.requestVerificationDM(userId, rooms[0].roomId);

      const verificationRequest: VerificationRequest = {
        transactionId: request?.transactionId || `${Date.now()}`,
        userId,
        deviceId,
        methods: ['m.sas.v1'],
        status: 'pending',
        timestamp: Date.now(),
      };

      this.verificationRequests.set(verificationRequest.transactionId, verificationRequest);
      this.emitCryptoEvent(CRYPTO_EVENTS.VERIFICATION_START, verificationRequest);

      return verificationRequest;
    } catch {
      return null;
    }
  }

  /**
   * 接受验证请求
   */
  async acceptVerification(transactionId: string): Promise<boolean> {
    const request = this.verificationRequests.get(transactionId);
    if (!request) return false;

    request.status = 'started';
    this.emitCryptoEvent(CRYPTO_EVENTS.VERIFICATION_START, request);

    return true;
  }

  /**
   * 取消验证
   */
  async cancelVerification(transactionId: string): Promise<void> {
    const request = this.verificationRequests.get(transactionId);
    if (request) {
      request.status = 'cancelled';
      this.verificationRequests.delete(transactionId);
      this.emitCryptoEvent(CRYPTO_EVENTS.VERIFICATION_CANCEL, request);
    }
  }

  /**
   * 完成验证
   */
  async confirmVerification(transactionId: string): Promise<boolean> {
    const request = this.verificationRequests.get(transactionId);
    if (!request) return false;

    request.status = 'done';
    this.verificationRequests.delete(transactionId);

    this.emitCryptoEvent(CRYPTO_EVENTS.VERIFICATION_DONE, request);
    this.emitCryptoEvent(CRYPTO_EVENTS.DEVICE_VERIFIED, {
      userId: request.userId,
      deviceId: request.deviceId,
    });

    return true;
  }

  /**
   * 手动验证设备
   */
  async verifyDevice(userId: string, deviceId: string): Promise<boolean> {
    if (!this.client) return false;

    try {
      const crypto = this.client.getCrypto?.();
      if (!crypto?.setDeviceVerified) return false;

      await crypto.setDeviceVerified(userId, deviceId);

      this.emitCryptoEvent(CRYPTO_EVENTS.DEVICE_VERIFIED, { userId, deviceId });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 创建密钥备份
   */
  async createKeyBackup(_passphrase?: string): Promise<KeyBackupInfo | null> {
    if (!this.client) return null;

    try {
      const crypto = this.client.getCrypto?.();
      if (!crypto?.resetKeyBackup) return null;

      const backup = await crypto.resetKeyBackup();

      if (backup) {
        const backupInfo: KeyBackupInfo = {
          version: backup.version || '1',
          algorithm: 'm.megolm_backup.v1.curve25519-aes-sha2',
          authData: backup.auth_data || {},
          count: 0,
          etag: '',
        };

        this.emitCryptoEvent(CRYPTO_EVENTS.KEY_BACKUP_ENABLED, backupInfo);
        return backupInfo;
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * 列出所有可用的密钥备份
   */
  async listKeyBackups(): Promise<NodeBackupInfo[]> {
    try {
      const url = `${this.nodeBaseUrl}${NODE_KEY_BACKUP_API}/list`;

      const response = await fetch(url, {
        headers: this.authHeaders,
      });

      if (response.status === 404) {
        return [];
      }

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      // API 可能返回 { backups: [...] } 或直接返回数组
      const backups = Array.isArray(data) ? data : data.backups || [];
      return backups;
    } catch {
      return [];
    }
  }

  /**
   * 获取特定设备的密钥备份信息 (从 Mobazha 节点)
   */
  async getKeyBackupInfo(deviceId?: string): Promise<NodeBackupInfo | null> {
    try {
      // 如果没有指定 deviceId，先列出所有备份
      if (!deviceId) {
        const backups = await this.listKeyBackups();
        return backups.length > 0 ? backups[0] : null;
      }

      const url = `${this.nodeBaseUrl}${NODE_KEY_BACKUP_API}/info?deviceId=${encodeURIComponent(deviceId)}`;

      const response = await fetch(url, {
        headers: this.authHeaders,
      });

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        return null;
      }

      const info = await response.json();
      return info;
    } catch {
      return null;
    }
  }

  /**
   * 检查是否有密钥备份（检查所有设备的备份）
   */
  async hasKeyBackup(): Promise<boolean> {
    const backups = await this.listKeyBackups();
    return backups.length > 0;
  }

  /**
   * 备份房间密钥到 Mobazha 节点
   * 节点使用私钥加密密钥数据
   */
  async backupRoomKeys(): Promise<KeyBackupResult> {
    if (!this.client) {
      return { success: false, reason: 'not_initialized' };
    }

    try {
      const crypto = this.client.getCrypto?.();
      if (!crypto) {
        return { success: false, reason: 'crypto_not_available' };
      }

      // 导出房间密钥

      let roomKeys: unknown[] = [];
      const cryptoAny = crypto as any;
      if (typeof cryptoAny.exportRoomKeys === 'function') {
        roomKeys = await cryptoAny.exportRoomKeys();
      } else {
        console.warn('[MatrixCrypto] exportRoomKeys not available');
        return { success: false, reason: 'not_supported' };
      }

      const deviceId = this.client.getDeviceId();
      const keysJson = JSON.stringify(roomKeys);

      // 发送到节点进行加密存储
      const url = `${this.nodeBaseUrl}${NODE_KEY_BACKUP_API}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.authHeaders,
        },
        body: JSON.stringify({
          deviceId,
          keys: keysJson,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[MatrixCrypto] Failed to save backup:', errorText);
        return { success: false, reason: 'save_failed', error: errorText };
      }

      this.emitCryptoEvent(CRYPTO_EVENTS.KEY_BACKUP_ENABLED, { keyCount: roomKeys.length });

      return { success: true, keyCount: roomKeys.length };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'unknown';
      console.error('[MatrixCrypto] Backup failed:', errorMsg);
      return { success: false, reason: 'backup_failed', error: errorMsg };
    }
  }

  /**
   * 从特定设备的备份中获取密钥
   */
  private async fetchKeysFromDevice(deviceId: string): Promise<unknown[]> {
    const url = `${this.nodeBaseUrl}${NODE_KEY_BACKUP_API}?deviceId=${encodeURIComponent(deviceId)}`;

    const response = await fetch(url, {
      headers: this.authHeaders,
    });

    if (response.status === 404 || !response.ok) {
      return [];
    }

    const backup = await response.json();
    if (!backup || !backup.keys) {
      return [];
    }

    try {
      const keys = typeof backup.keys === 'string' ? JSON.parse(backup.keys) : backup.keys;
      return Array.isArray(keys) ? keys : [];
    } catch {
      return [];
    }
  }

  /**
   * 从 Mobazha 节点恢复房间密钥
   * 优化策略：只恢复密钥数量最多的前几个备份，避免重复请求
   */
  async restoreRoomKeys(deviceId?: string): Promise<KeyBackupResult> {
    if (!this.client) {
      return { success: false, reason: 'not_initialized' };
    }

    try {
      let allKeys: unknown[] = [];

      if (deviceId) {
        // 从指定设备恢复
        allKeys = await this.fetchKeysFromDevice(deviceId);
      } else {
        // 列出所有备份
        const backups = await this.listKeyBackups();

        if (backups.length === 0) {
          return { success: false, reason: 'no_backup' };
        }

        // 优化：按密钥数量降序排序，只恢复前 3 个备份
        // 因为大部分密钥在多个设备备份中是重复的，恢复密钥最多的几个就足够了
        const sortedBackups = [...backups].sort((a, b) => (b.keyCount || 0) - (a.keyCount || 0));
        const maxBackupsToRestore = 3;
        const backupsToRestore = sortedBackups.slice(0, maxBackupsToRestore);

        // 从选中的备份中收集密钥
        for (const backup of backupsToRestore) {
          // 处理 API 可能返回的不同字段名
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const backupAny = backup as any;
          const backupDeviceId = backup.deviceId || backupAny.device_id;
          if (backupDeviceId) {
            const keys = await this.fetchKeysFromDevice(backupDeviceId);
            allKeys = allKeys.concat(keys);
          }
        }
      }

      if (allKeys.length === 0) {
        return { success: false, reason: 'no_backup' };
      }

      // 去重 (基于 room_id + session_id)
      const uniqueKeys = this.deduplicateKeys(allKeys);

      // 导入密钥到 Matrix 客户端
      const crypto = this.client.getCrypto?.();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cryptoAny = crypto as any;
      if (!cryptoAny || typeof cryptoAny.importRoomKeys !== 'function') {
        return { success: false, reason: 'not_supported' };
      }

      await cryptoAny.importRoomKeys(uniqueKeys);

      this.emitCryptoEvent(CRYPTO_EVENTS.KEY_BACKUP_RESTORED, { keyCount: uniqueKeys.length });

      return { success: true, keyCount: uniqueKeys.length };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'unknown';
      console.error('[MatrixCrypto] Restore failed:', errorMsg);
      return { success: false, reason: 'restore_failed', error: errorMsg };
    }
  }

  /**
   * 去重密钥 (基于 room_id + session_id)
   */
  private deduplicateKeys(keys: unknown[]): unknown[] {
    const seen = new Set<string>();
    const result: unknown[] = [];

    for (const key of keys) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const k = key as any;
      const id = `${k.room_id || ''}:${k.session_id || ''}`;
      if (!seen.has(id)) {
        seen.add(id);
        result.push(key);
      }
    }

    return result;
  }

  /**
   * 恢复密钥备份 (别名方法，兼容旧 API)
   */
  async restoreKeyBackup(_recoveryKey?: string): Promise<boolean> {
    const result = await this.restoreRoomKeys();
    return result.success;
  }

  /**
   * 删除密钥备份
   */
  async deleteKeyBackup(deviceId?: string): Promise<boolean> {
    try {
      let url = `${this.nodeBaseUrl}${NODE_KEY_BACKUP_API}`;
      if (deviceId) {
        url += `?deviceId=${encodeURIComponent(deviceId)}`;
      }

      const response = await fetch(url, {
        method: 'DELETE',
        headers: this.authHeaders,
      });

      if (!response.ok) {
        console.error('[MatrixCrypto] Failed to delete backup:', response.statusText);
        return false;
      }

      this.emitCryptoEvent(CRYPTO_EVENTS.KEY_BACKUP_DELETED, { deviceId });

      return true;
    } catch (error) {
      console.error('[MatrixCrypto] Delete failed:', error);
      return false;
    }
  }

  /**
   * 备份交叉签名密钥包到 Mobazha 节点
   */
  async backupSecretsBundle(): Promise<KeyBackupResult> {
    if (!this.client) {
      return { success: false, reason: 'not_initialized' };
    }

    try {
      const crypto = this.client.getCrypto?.();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cryptoAny = crypto as any;
      if (!cryptoAny || typeof cryptoAny.exportSecretsBundle !== 'function') {
        console.warn('[MatrixCrypto] exportSecretsBundle not available');
        return { success: false, reason: 'not_supported' };
      }

      const secretsBundle = await cryptoAny.exportSecretsBundle();
      if (!secretsBundle) {
        return { success: false, reason: 'no_secrets' };
      }

      const deviceId = this.client.getDeviceId();
      const url = `${this.nodeBaseUrl}${NODE_SECRETS_BUNDLE_API}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.authHeaders,
        },
        body: JSON.stringify({
          deviceId,
          secrets: JSON.stringify(secretsBundle),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[MatrixCrypto] Failed to save secrets bundle:', errorText);
        return { success: false, reason: 'save_failed', error: errorText };
      }

      return { success: true };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'unknown';
      console.error('[MatrixCrypto] Secrets backup failed:', errorMsg);
      return { success: false, reason: 'backup_failed', error: errorMsg };
    }
  }

  /**
   * 从 Mobazha 节点恢复交叉签名密钥包
   */
  async restoreSecretsBundle(): Promise<KeyBackupResult> {
    if (!this.client) {
      return { success: false, reason: 'not_initialized' };
    }

    try {
      const crypto = this.client.getCrypto?.();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cryptoAny = crypto as any;
      if (!cryptoAny || typeof cryptoAny.importSecretsBundle !== 'function') {
        console.warn('[MatrixCrypto] importSecretsBundle not available');
        return { success: false, reason: 'not_supported' };
      }

      const url = `${this.nodeBaseUrl}${NODE_SECRETS_BUNDLE_API}`;
      const response = await fetch(url, {
        headers: this.authHeaders,
      });

      if (response.status === 404) {
        return { success: false, reason: 'no_backup' };
      }

      if (!response.ok) {
        console.error('[MatrixCrypto] Failed to fetch secrets bundle:', response.statusText);
        return { success: false, reason: 'fetch_failed' };
      }

      const backup = await response.json();
      if (!backup || !backup.secrets) {
        return { success: false, reason: 'no_backup' };
      }

      // 解析密钥包
      let secretsBundle: unknown;
      if (typeof backup.secrets === 'object') {
        secretsBundle = backup.secrets;
      } else if (typeof backup.secrets === 'string') {
        try {
          secretsBundle = JSON.parse(backup.secrets);
        } catch {
          console.error('[MatrixCrypto] Failed to parse secrets bundle');
          return { success: false, reason: 'parse_error' };
        }
      } else {
        return { success: false, reason: 'invalid_format' };
      }

      // 导入到 Matrix 客户端
      await cryptoAny.importSecretsBundle(secretsBundle);

      return { success: true };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'unknown';
      console.error('[MatrixCrypto] Secrets restore failed:', errorMsg);
      return { success: false, reason: 'restore_failed', error: errorMsg };
    }
  }

  /**
   * 检查是否有交叉签名密钥包备份
   */
  async hasSecretsBundleBackup(): Promise<boolean> {
    try {
      const url = `${this.nodeBaseUrl}${NODE_SECRETS_BUNDLE_API}/info`;
      const response = await fetch(url, {
        headers: this.authHeaders,
      });

      if (response.status === 404 || !response.ok) {
        return false;
      }

      const info = await response.json();
      return info !== null && info.exists === true;
    } catch {
      return false;
    }
  }

  /**
   * 获取交叉签名状态
   */
  async getCrossSigningStatus(): Promise<CrossSigningStatus | null> {
    if (!this.client) return null;

    try {
      const crypto = this.client.getCrypto?.();
      if (!crypto?.getCrossSigningStatus) return null;

      const status = await crypto.getCrossSigningStatus();
      if (!status) return null;

      return {
        publicKeysOnDevice: status.publicKeysOnDevice || false,
        privateKeysInStorage: status.privateKeysInSecretStorage || false,
        privateKeysCachedLocally: {
          masterKey: status.privateKeysCachedLocally?.masterKey || false,
          selfSigningKey: status.privateKeysCachedLocally?.selfSigningKey || false,
          userSigningKey: status.privateKeysCachedLocally?.userSigningKey || false,
        },
      };
    } catch {
      return null;
    }
  }

  /**
   * 初始化交叉签名
   */
  async bootstrapCrossSigning(): Promise<boolean> {
    if (!this.client) return false;

    try {
      const crypto = this.client.getCrypto?.();
      if (!crypto?.bootstrapCrossSigning) return false;

      await crypto.bootstrapCrossSigning({
        authUploadDeviceSigningKeys: async makeRequest => {
          return makeRequest({});
        },
      });

      this.emitCryptoEvent(CRYPTO_EVENTS.CROSS_SIGNING_READY, null);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 导出房间密钥为 JSON 字符串
   */
  async exportRoomKeys(): Promise<string | null> {
    if (!this.client) return null;

    try {
      const crypto = this.client.getCrypto?.();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cryptoAny = crypto as any;
      if (!cryptoAny || typeof cryptoAny.exportRoomKeys !== 'function') {
        return null;
      }

      const roomKeys = await cryptoAny.exportRoomKeys();
      return JSON.stringify(roomKeys);
    } catch (error) {
      console.error('[MatrixCrypto] Failed to export room keys:', error);
      return null;
    }
  }

  /**
   * 导入房间密钥
   */
  async importRoomKeys(keysJson: string): Promise<boolean> {
    if (!this.client) return false;

    try {
      const crypto = this.client.getCrypto?.();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cryptoAny = crypto as any;
      if (!cryptoAny || typeof cryptoAny.importRoomKeys !== 'function') {
        return false;
      }

      const roomKeys = JSON.parse(keysJson);
      await cryptoAny.importRoomKeys(roomKeys);
      return true;
    } catch (error) {
      console.error('[MatrixCrypto] Failed to import room keys:', error);
      return false;
    }
  }

  /**
   * 获取验证请求
   */
  getVerificationRequest(transactionId: string): VerificationRequest | undefined {
    return this.verificationRequests.get(transactionId);
  }

  /**
   * 获取所有待处理的验证请求
   */
  getPendingVerifications(): VerificationRequest[] {
    return Array.from(this.verificationRequests.values()).filter(r => r.status === 'pending');
  }

  /**
   * 检查是否已初始化
   */
  isCryptoInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * 获取配置
   */
  getConfig(): CryptoConfig | null {
    return this.config;
  }

  /**
   * 检查密钥备份是否启用
   */
  isKeyBackupEnabled(): boolean {
    return this.config?.keyBackupEnabled ?? true;
  }

  /**
   * 检查交叉签名是否启用
   */
  isCrossSigningEnabled(): boolean {
    return this.config?.crossSigningEnabled ?? true;
  }

  /**
   * 清理资源
   */
  async cleanup(): Promise<void> {
    this.verificationRequests.clear();
    this.client = null;
    this.config = null;
    this.nodeBaseUrl = '';
    this.authHeaders = {};
    this.isInitialized = false;
  }

  /**
   * 登录后尝试自动恢复密钥备份
   * 用于新设备登录时恢复聊天历史
   */
  async tryRestoreKeyBackupOnLogin(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    try {
      // 检查是否有备份
      const hasBackup = await this.hasKeyBackup();
      if (!hasBackup) {
        return;
      }

      // 恢复密钥
      await this.restoreRoomKeys();

      // 尝试恢复交叉签名密钥
      const hasSecrets = await this.hasSecretsBundleBackup();
      if (hasSecrets) {
        await this.restoreSecretsBundle();
      }
    } catch {
      // 非致命错误 - 用户仍可使用聊天，只是无法解密历史消息
    }
  }
}

// 导出单例
export const matrixCrypto = new MatrixCryptoService();
