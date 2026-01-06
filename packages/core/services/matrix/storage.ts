/**
 * Matrix 存储适配器
 * 支持 Web (localStorage) 和 React Native (AsyncStorage)
 */

import type { MatrixStorage } from './types';

// 存储键
export const STORAGE_KEYS = {
  ACCESS_TOKEN: '@matrix_access_token',
  USER_ID: '@matrix_user_id',
  DEVICE_ID: '@matrix_device_id',
  CRYPTO_DEVICE: '@matrix_crypto_device',
  SYNC_TOKEN: '@matrix_sync_token',
} as const;

/**
 * Web 存储实现 (localStorage)
 */
class WebStorage implements MatrixStorage {
  async getItem(key: string): Promise<string | null> {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(key);
  }

  async setItem(key: string, value: string): Promise<void> {
    if (typeof window === 'undefined') return;
    localStorage.setItem(key, value);
  }

  async removeItem(key: string): Promise<void> {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(key);
  }
}

/**
 * 内存存储实现 (SSR fallback)
 */
class MemoryStorage implements MatrixStorage {
  private store: Map<string, string> = new Map();

  async getItem(key: string): Promise<string | null> {
    return this.store.get(key) ?? null;
  }

  async setItem(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }

  async removeItem(key: string): Promise<void> {
    this.store.delete(key);
  }
}

// 当前存储实例
let currentStorage: MatrixStorage | null = null;

/**
 * 获取存储实例
 */
export function getStorage(): MatrixStorage {
  if (currentStorage) return currentStorage;

  // 检测环境
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    currentStorage = new WebStorage();
  } else {
    currentStorage = new MemoryStorage();
  }

  return currentStorage;
}

/**
 * 设置自定义存储实现 (用于 React Native)
 */
export function setStorage(storage: MatrixStorage): void {
  currentStorage = storage;
}

/**
 * 存储凭据
 */
export async function saveCredentials(
  accessToken: string,
  userId: string,
  deviceId: string
): Promise<void> {
  const storage = getStorage();
  await Promise.all([
    storage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken),
    storage.setItem(STORAGE_KEYS.USER_ID, userId),
    storage.setItem(STORAGE_KEYS.DEVICE_ID, deviceId),
  ]);
}

/**
 * 获取存储的凭据
 */
export async function getCredentials(): Promise<{
  accessToken: string | null;
  userId: string | null;
  deviceId: string | null;
}> {
  const storage = getStorage();
  const [accessToken, userId, deviceId] = await Promise.all([
    storage.getItem(STORAGE_KEYS.ACCESS_TOKEN),
    storage.getItem(STORAGE_KEYS.USER_ID),
    storage.getItem(STORAGE_KEYS.DEVICE_ID),
  ]);
  return { accessToken, userId, deviceId };
}

/**
 * 清除凭据
 */
export async function clearCredentials(): Promise<void> {
  const storage = getStorage();
  await Promise.all([
    storage.removeItem(STORAGE_KEYS.ACCESS_TOKEN),
    storage.removeItem(STORAGE_KEYS.USER_ID),
    storage.removeItem(STORAGE_KEYS.DEVICE_ID),
    storage.removeItem(STORAGE_KEYS.CRYPTO_DEVICE),
    storage.removeItem(STORAGE_KEYS.SYNC_TOKEN),
  ]);
}
