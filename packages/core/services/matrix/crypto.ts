/**
 * Matrix 加密模块 — v1.2 Stub
 *
 * E2EE 由后端 mautrix-go 透明处理，前端不再需要加密操作。
 * 保留导出接口以保持 useCrypto hook 和 index.ts 的编译兼容性。
 */

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

export interface KeyBackupResult {
  success: boolean;
  keyCount?: number;
  reason?: string;
  error?: string;
}

export interface NodeBackupInfo {
  deviceId: string;
  keyCount: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Stub crypto service — all methods return safe defaults.
 * E2EE is fully handled by the backend node (mautrix-go).
 */
class MatrixCryptoService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async initialize(_client?: any, _config?: any): Promise<boolean> {
    return true;
  }
  setAuthHeaders(_headers: Record<string, string>): void {
    /* no-op */
  }
  setNodeBaseUrl(_url: string): void {
    /* no-op */
  }
  async enableEncryption(_roomId: string): Promise<boolean> {
    return true;
  }
  async isRoomEncrypted(_roomId: string): Promise<boolean> {
    return true;
  }
  async getDevices(_userId?: string): Promise<never[]> {
    return [];
  }
  async startVerification(_userId: string, _deviceId?: string): Promise<null> {
    return null;
  }
  async acceptVerification(_transactionId: string): Promise<boolean> {
    return false;
  }
  async cancelVerification(_transactionId: string): Promise<void> {
    /* no-op */
  }
  async confirmVerification(_transactionId: string): Promise<boolean> {
    return false;
  }
  async verifyDevice(_userId: string, _deviceId: string): Promise<boolean> {
    return false;
  }
  async createKeyBackup(_passphrase?: string): Promise<null> {
    return null;
  }
  async listKeyBackups(): Promise<never[]> {
    return [];
  }
  async getKeyBackupInfo(_deviceId?: string): Promise<null> {
    return null;
  }
  async hasKeyBackup(): Promise<boolean> {
    return false;
  }
  async backupRoomKeys(): Promise<KeyBackupResult> {
    return { success: true, reason: 'backend_managed' };
  }
  async restoreRoomKeys(_deviceId?: string): Promise<KeyBackupResult> {
    return { success: true, reason: 'backend_managed' };
  }
  async restoreKeyBackup(_recoveryKey?: string): Promise<boolean> {
    return true;
  }
  async deleteKeyBackup(_deviceId?: string): Promise<boolean> {
    return true;
  }
  async backupSecretsBundle(): Promise<KeyBackupResult> {
    return { success: true, reason: 'backend_managed' };
  }
  async restoreSecretsBundle(): Promise<KeyBackupResult> {
    return { success: true, reason: 'backend_managed' };
  }
  async hasSecretsBundleBackup(): Promise<boolean> {
    return false;
  }
  async getCrossSigningStatus(): Promise<null> {
    return null;
  }
  async bootstrapCrossSigning(): Promise<boolean> {
    return true;
  }
  async exportRoomKeys(): Promise<null> {
    return null;
  }
  async importRoomKeys(_keysJson: string): Promise<boolean> {
    return true;
  }
  getVerificationRequest(_transactionId: string): undefined {
    return undefined;
  }
  getPendingVerifications(): never[] {
    return [];
  }
  isCryptoInitialized(): boolean {
    return true;
  }
  getConfig(): null {
    return null;
  }
  isKeyBackupEnabled(): boolean {
    return false;
  }
  isCrossSigningEnabled(): boolean {
    return false;
  }
  async cleanup(): Promise<void> {
    /* no-op */
  }
  async tryRestoreKeyBackupOnLogin(): Promise<void> {
    /* no-op */
  }
}

export const matrixCrypto = new MatrixCryptoService();
