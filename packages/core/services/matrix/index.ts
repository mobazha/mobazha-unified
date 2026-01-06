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
