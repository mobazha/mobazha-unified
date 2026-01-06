/**
 * Matrix E2E 加密 Hook
 *
 * 提供端到端加密功能的 React Hook
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { matrixCrypto, CRYPTO_EVENTS } from '../services/matrix/crypto';
import { matrixEvents } from '../services/matrix/events';
import type {
  DeviceInfo,
  VerificationRequest,
  KeyBackupInfo,
  CrossSigningStatus,
} from '../services/matrix/types';

export interface UseCryptoState {
  /** 加密是否已初始化 */
  isInitialized: boolean;
  /** 当前用户的设备列表 */
  devices: DeviceInfo[];
  /** 待处理的验证请求 */
  pendingVerifications: VerificationRequest[];
  /** 当前验证请求 */
  currentVerification: VerificationRequest | null;
  /** 密钥备份信息 */
  keyBackupInfo: KeyBackupInfo | null;
  /** 交叉签名状态 */
  crossSigningStatus: CrossSigningStatus | null;
  /** 是否正在加载 */
  isLoading: boolean;
  /** 错误信息 */
  error: string | null;
}

export interface UseCryptoActions {
  /** 启用房间加密 */
  enableEncryption: (roomId: string) => Promise<boolean>;
  /** 检查房间是否加密 */
  isRoomEncrypted: (roomId: string) => Promise<boolean>;
  /** 获取设备列表 */
  refreshDevices: (userId?: string) => Promise<void>;
  /** 开始设备验证 */
  startVerification: (userId: string, deviceId?: string) => Promise<VerificationRequest | null>;
  /** 接受验证请求 */
  acceptVerification: (transactionId: string) => Promise<boolean>;
  /** 取消验证 */
  cancelVerification: (transactionId: string) => Promise<void>;
  /** 确认验证 (Emoji 匹配) */
  confirmVerification: (transactionId: string) => Promise<boolean>;
  /** 手动验证设备 */
  verifyDevice: (userId: string, deviceId: string) => Promise<boolean>;
  /** 创建密钥备份 */
  createKeyBackup: (passphrase?: string) => Promise<KeyBackupInfo | null>;
  /** 恢复密钥备份 */
  restoreKeyBackup: (recoveryKey: string) => Promise<boolean>;
  /** 导出房间密钥 */
  exportRoomKeys: (passphrase: string) => Promise<string | null>;
  /** 导入房间密钥 */
  importRoomKeys: (keysData: string, passphrase: string) => Promise<boolean>;
  /** 初始化交叉签名 */
  bootstrapCrossSigning: () => Promise<boolean>;
  /** 刷新状态 */
  refresh: () => Promise<void>;
}

export type UseCryptoReturn = UseCryptoState & UseCryptoActions;

/**
 * E2E 加密 Hook
 *
 * @example
 * ```tsx
 * function VerificationPanel() {
 *   const {
 *     devices,
 *     pendingVerifications,
 *     startVerification,
 *     confirmVerification,
 *   } = useCrypto();
 *
 *   return (
 *     <div>
 *       <h3>Your Devices</h3>
 *       {devices.map(d => (
 *         <div key={d.deviceId}>
 *           {d.displayName} - {d.verified ? '✓' : '⚠'}
 *         </div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useCrypto(): UseCryptoReturn {
  const [state, setState] = useState<UseCryptoState>({
    isInitialized: false,
    devices: [],
    pendingVerifications: [],
    currentVerification: null,
    keyBackupInfo: null,
    crossSigningStatus: null,
    isLoading: false,
    error: null,
  });

  const mountedRef = useRef(true);

  // 安全更新状态
  const safeSetState = useCallback((updater: (prev: UseCryptoState) => UseCryptoState) => {
    if (mountedRef.current) {
      setState(updater);
    }
  }, []);

  // 刷新所有状态
  const refresh = useCallback(async () => {
    safeSetState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const [devices, keyBackupInfo, crossSigningStatus] = await Promise.all([
        matrixCrypto.getDevices(),
        matrixCrypto.getKeyBackupInfo(),
        matrixCrypto.getCrossSigningStatus(),
      ]);

      const pendingVerifications = matrixCrypto.getPendingVerifications();

      safeSetState(prev => ({
        ...prev,
        isInitialized: matrixCrypto.isCryptoInitialized(),
        devices,
        pendingVerifications,
        keyBackupInfo,
        crossSigningStatus,
        isLoading: false,
      }));
    } catch (error) {
      safeSetState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
    }
  }, [safeSetState]);

  // 启用房间加密
  const enableEncryption = useCallback(async (roomId: string): Promise<boolean> => {
    return matrixCrypto.enableEncryption(roomId);
  }, []);

  // 检查房间是否加密
  const isRoomEncrypted = useCallback(async (roomId: string): Promise<boolean> => {
    return matrixCrypto.isRoomEncrypted(roomId);
  }, []);

  // 刷新设备列表
  const refreshDevices = useCallback(
    async (userId?: string) => {
      const devices = await matrixCrypto.getDevices(userId);
      safeSetState(prev => ({ ...prev, devices }));
    },
    [safeSetState]
  );

  // 开始验证
  const startVerification = useCallback(
    async (userId: string, deviceId?: string): Promise<VerificationRequest | null> => {
      const request = await matrixCrypto.startVerification(userId, deviceId);
      if (request) {
        safeSetState(prev => ({ ...prev, currentVerification: request }));
      }
      return request;
    },
    [safeSetState]
  );

  // 接受验证
  const acceptVerification = useCallback(async (transactionId: string): Promise<boolean> => {
    return matrixCrypto.acceptVerification(transactionId);
  }, []);

  // 取消验证
  const cancelVerification = useCallback(
    async (transactionId: string) => {
      await matrixCrypto.cancelVerification(transactionId);
      safeSetState(prev => ({
        ...prev,
        currentVerification:
          prev.currentVerification?.transactionId === transactionId
            ? null
            : prev.currentVerification,
      }));
    },
    [safeSetState]
  );

  // 确认验证
  const confirmVerification = useCallback(
    async (transactionId: string): Promise<boolean> => {
      const success = await matrixCrypto.confirmVerification(transactionId);
      if (success) {
        safeSetState(prev => ({
          ...prev,
          currentVerification:
            prev.currentVerification?.transactionId === transactionId
              ? null
              : prev.currentVerification,
        }));
        // 刷新设备列表
        await refreshDevices();
      }
      return success;
    },
    [safeSetState, refreshDevices]
  );

  // 手动验证设备
  const verifyDevice = useCallback(
    async (userId: string, deviceId: string): Promise<boolean> => {
      const success = await matrixCrypto.verifyDevice(userId, deviceId);
      if (success) {
        await refreshDevices(userId);
      }
      return success;
    },
    [refreshDevices]
  );

  // 创建密钥备份
  const createKeyBackup = useCallback(
    async (passphrase?: string): Promise<KeyBackupInfo | null> => {
      const backupInfo = await matrixCrypto.createKeyBackup(passphrase);
      if (backupInfo) {
        safeSetState(prev => ({ ...prev, keyBackupInfo: backupInfo }));
      }
      return backupInfo;
    },
    [safeSetState]
  );

  // 恢复密钥备份
  const restoreKeyBackup = useCallback(async (recoveryKey: string): Promise<boolean> => {
    return matrixCrypto.restoreKeyBackup(recoveryKey);
  }, []);

  // 导出房间密钥
  const exportRoomKeys = useCallback(async (passphrase: string): Promise<string | null> => {
    return matrixCrypto.exportRoomKeys(passphrase);
  }, []);

  // 导入房间密钥
  const importRoomKeys = useCallback(
    async (keysData: string, passphrase: string): Promise<boolean> => {
      return matrixCrypto.importRoomKeys(keysData, passphrase);
    },
    []
  );

  // 初始化交叉签名
  const bootstrapCrossSigning = useCallback(async (): Promise<boolean> => {
    const success = await matrixCrypto.bootstrapCrossSigning();
    if (success) {
      const crossSigningStatus = await matrixCrypto.getCrossSigningStatus();
      safeSetState(prev => ({ ...prev, crossSigningStatus }));
    }
    return success;
  }, [safeSetState]);

  // 监听加密事件
  useEffect(() => {
    mountedRef.current = true;

    const handleVerificationRequest = (request: unknown) => {
      const req = request as VerificationRequest;
      safeSetState(prev => ({
        ...prev,
        pendingVerifications: [
          ...prev.pendingVerifications.filter(v => v.transactionId !== req.transactionId),
          req,
        ],
      }));
    };

    const handleVerificationDone = (request: unknown) => {
      const req = request as VerificationRequest;
      safeSetState(prev => ({
        ...prev,
        pendingVerifications: prev.pendingVerifications.filter(
          v => v.transactionId !== req.transactionId
        ),
        currentVerification:
          prev.currentVerification?.transactionId === req.transactionId
            ? null
            : prev.currentVerification,
      }));
    };

    const handleDeviceVerified = () => {
      refreshDevices();
    };

    const handleKeyBackupEnabled = (backupInfo: unknown) => {
      safeSetState(prev => ({ ...prev, keyBackupInfo: backupInfo as KeyBackupInfo }));
    };

    // 订阅事件
    matrixEvents.on(CRYPTO_EVENTS.VERIFICATION_REQUEST, handleVerificationRequest);
    matrixEvents.on(CRYPTO_EVENTS.VERIFICATION_DONE, handleVerificationDone);
    matrixEvents.on(CRYPTO_EVENTS.VERIFICATION_CANCEL, handleVerificationDone);
    matrixEvents.on(CRYPTO_EVENTS.DEVICE_VERIFIED, handleDeviceVerified);
    matrixEvents.on(CRYPTO_EVENTS.KEY_BACKUP_ENABLED, handleKeyBackupEnabled);

    // 初始刷新
    refresh();

    return () => {
      mountedRef.current = false;
      matrixEvents.off(CRYPTO_EVENTS.VERIFICATION_REQUEST, handleVerificationRequest);
      matrixEvents.off(CRYPTO_EVENTS.VERIFICATION_DONE, handleVerificationDone);
      matrixEvents.off(CRYPTO_EVENTS.VERIFICATION_CANCEL, handleVerificationDone);
      matrixEvents.off(CRYPTO_EVENTS.DEVICE_VERIFIED, handleDeviceVerified);
      matrixEvents.off(CRYPTO_EVENTS.KEY_BACKUP_ENABLED, handleKeyBackupEnabled);
    };
  }, [safeSetState, refresh, refreshDevices]);

  return {
    ...state,
    enableEncryption,
    isRoomEncrypted,
    refreshDevices,
    startVerification,
    acceptVerification,
    cancelVerification,
    confirmVerification,
    verifyDevice,
    createKeyBackup,
    restoreKeyBackup,
    exportRoomKeys,
    importRoomKeys,
    bootstrapCrossSigning,
    refresh,
  };
}

export default useCrypto;
