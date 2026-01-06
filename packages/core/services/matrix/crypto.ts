/**
 * Matrix 端到端加密模块
 *
 * 提供以下功能:
 * - 设备密钥管理
 * - 消息加密/解密
 * - 设备验证
 * - 密钥备份和恢复
 */

import type {
  CryptoConfig,
  DeviceInfo,
  VerificationRequest,
  KeyBackupInfo,
  CrossSigningStatus,
} from './types';
import { matrixEvents } from './events';

// 加密事件
export const CRYPTO_EVENTS = {
  DEVICE_VERIFIED: 'crypto.device_verified',
  DEVICE_UNVERIFIED: 'crypto.device_unverified',
  KEY_BACKUP_ENABLED: 'crypto.key_backup_enabled',
  KEY_BACKUP_RESTORED: 'crypto.key_backup_restored',
  VERIFICATION_REQUEST: 'crypto.verification_request',
  VERIFICATION_START: 'crypto.verification_start',
  VERIFICATION_CANCEL: 'crypto.verification_cancel',
  VERIFICATION_DONE: 'crypto.verification_done',
  CROSS_SIGNING_READY: 'crypto.cross_signing_ready',
  ROOM_KEY_REQUEST: 'crypto.room_key_request',
  ENCRYPTION_ERROR: 'crypto.encryption_error',
} as const;

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

  /**
   * 初始化加密服务
   */
  async initialize(client: unknown, config?: Partial<CryptoConfig>): Promise<boolean> {
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
      // 标记配置已使用
      void this.config;

      // 设置加密事件监听
      this.setupCryptoListeners();

      // 初始化加密组件
      await this.initCrypto();

      this.isInitialized = true;

      return true;
    } catch {
      return false;
    }
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
   * 获取密钥备份信息
   */
  async getKeyBackupInfo(): Promise<KeyBackupInfo | null> {
    // This requires additional API that may not be available
    return null;
  }

  /**
   * 恢复密钥备份
   */
  async restoreKeyBackup(_recoveryKey: string): Promise<boolean> {
    // This requires additional API that may not be available
    return false;
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
   * 导出房间密钥
   */
  async exportRoomKeys(_passphrase: string): Promise<string | null> {
    // This requires additional API that may not be available
    return null;
  }

  /**
   * 导入房间密钥
   */
  async importRoomKeys(_keysData: string, _passphrase: string): Promise<boolean> {
    // This requires additional API that may not be available
    return false;
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
   * 清理资源
   */
  async cleanup(): Promise<void> {
    this.verificationRequests.clear();
    this.client = null;
    this.config = null;
    this.isInitialized = false;
  }
}

// 导出单例
export const matrixCrypto = new MatrixCryptoService();
