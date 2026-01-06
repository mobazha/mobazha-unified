/**
 * Matrix 服务导出
 */

// 类型
export * from './types';

// 事件
export { matrixEvents } from './events';

// 存储
export {
  getStorage,
  setStorage,
  saveCredentials,
  getCredentials,
  clearCredentials,
  STORAGE_KEYS,
} from './storage';

// 客户端
export { matrixClient } from './client';

// E2E 加密
export { matrixCrypto, CRYPTO_EVENTS } from './crypto';
export type { KeyBackupResult, NodeBackupInfo } from './crypto';
