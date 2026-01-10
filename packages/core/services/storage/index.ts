/**
 * 平台无关的存储服务
 *
 * 支持的平台：
 * - Web: localStorage
 * - Telegram Mini App: CloudStorage API
 * - Discord Mini App: SDK Storage（预留）
 *
 * @example
 * ```typescript
 * import { getStorageService, detectPlatform } from './storage';
 *
 * const storage = getStorageService();
 * await storage.setItem('token', 'xxx');
 * const token = await storage.getItem('token');
 * ```
 */

import type { IStorageService, PlatformType } from './types';

// 重新导出类型
export type { IStorageService, PlatformType } from './types';

/**
 * 检测当前运行平台
 */
export function detectPlatform(): PlatformType {
  if (typeof window === 'undefined') {
    return 'web';
  }

  // Telegram Mini App 检测
  // 通过检查 Telegram WebApp 的 initData 来判断
  if (window.Telegram?.WebApp?.initData) {
    return 'telegram';
  }

  // Discord Mini App 检测（预留）
  // Discord Embedded App SDK 检测
  // if (window.DiscordSDK) {
  //   return 'discord';
  // }

  return 'web';
}

/**
 * 检查是否在 Telegram Mini App 中运行
 */
export function isTelegramMiniApp(): boolean {
  return detectPlatform() === 'telegram';
}

/**
 * 检查是否在 Discord Mini App 中运行
 */
export function isDiscordMiniApp(): boolean {
  return detectPlatform() === 'discord';
}

/**
 * 检查是否在普通 Web 浏览器中运行
 */
export function isWebBrowser(): boolean {
  return detectPlatform() === 'web';
}

// ============ Web localStorage 实现 ============

const webStorage: IStorageService = {
  async getItem(key: string): Promise<string | null> {
    if (typeof window === 'undefined') {
      return null;
    }
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.error('[Storage] Failed to set item:', key, error);
    }
  },

  async removeItem(key: string): Promise<void> {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('[Storage] Failed to remove item:', key, error);
    }
  },

  async getItems(keys: string[]): Promise<Record<string, string | null>> {
    const result: Record<string, string | null> = {};
    for (const key of keys) {
      result[key] = await this.getItem(key);
    }
    return result;
  },

  async removeItems(keys: string[]): Promise<void> {
    for (const key of keys) {
      await this.removeItem(key);
    }
  },

  async getKeys(): Promise<string[]> {
    if (typeof window === 'undefined') {
      return [];
    }
    try {
      return Object.keys(localStorage);
    } catch {
      return [];
    }
  },
};

// ============ Telegram CloudStorage 实现 ============

const telegramStorage: IStorageService = {
  async getItem(key: string): Promise<string | null> {
    return new Promise(resolve => {
      const cloudStorage = window.Telegram?.WebApp?.CloudStorage;
      if (!cloudStorage) {
        // 回退到 localStorage
        resolve(localStorage.getItem(key));
        return;
      }

      cloudStorage.getItem(key, (error, value) => {
        if (error) {
          console.error('[Storage] Telegram CloudStorage getItem error:', error);
          // 回退到 localStorage
          resolve(localStorage.getItem(key));
          return;
        }
        resolve(value || null);
      });
    });
  },

  async setItem(key: string, value: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const cloudStorage = window.Telegram?.WebApp?.CloudStorage;
      if (!cloudStorage) {
        // 回退到 localStorage
        localStorage.setItem(key, value);
        resolve();
        return;
      }

      cloudStorage.setItem(key, value, error => {
        if (error) {
          console.error('[Storage] Telegram CloudStorage setItem error:', error);
          // 回退到 localStorage
          try {
            localStorage.setItem(key, value);
            resolve();
          } catch (e) {
            reject(e);
          }
          return;
        }
        resolve();
      });
    });
  },

  async removeItem(key: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const cloudStorage = window.Telegram?.WebApp?.CloudStorage;
      if (!cloudStorage) {
        // 回退到 localStorage
        localStorage.removeItem(key);
        resolve();
        return;
      }

      cloudStorage.removeItem(key, error => {
        if (error) {
          console.error('[Storage] Telegram CloudStorage removeItem error:', error);
          // 回退到 localStorage
          try {
            localStorage.removeItem(key);
            resolve();
          } catch (e) {
            reject(e);
          }
          return;
        }
        resolve();
      });
    });
  },

  async getItems(keys: string[]): Promise<Record<string, string | null>> {
    return new Promise(resolve => {
      const cloudStorage = window.Telegram?.WebApp?.CloudStorage;
      if (!cloudStorage) {
        // 回退到 localStorage
        const result: Record<string, string | null> = {};
        for (const key of keys) {
          result[key] = localStorage.getItem(key);
        }
        resolve(result);
        return;
      }

      cloudStorage.getItems(keys, (error, values) => {
        if (error || !values) {
          // 回退到 localStorage
          const result: Record<string, string | null> = {};
          for (const key of keys) {
            result[key] = localStorage.getItem(key);
          }
          resolve(result);
          return;
        }
        // 将 undefined 转换为 null
        const result: Record<string, string | null> = {};
        for (const key of keys) {
          result[key] = values[key] || null;
        }
        resolve(result);
      });
    });
  },

  async removeItems(keys: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const cloudStorage = window.Telegram?.WebApp?.CloudStorage;
      if (!cloudStorage) {
        // 回退到 localStorage
        for (const key of keys) {
          localStorage.removeItem(key);
        }
        resolve();
        return;
      }

      cloudStorage.removeItems(keys, error => {
        if (error) {
          // 回退到 localStorage
          try {
            for (const key of keys) {
              localStorage.removeItem(key);
            }
            resolve();
          } catch (e) {
            reject(e);
          }
          return;
        }
        resolve();
      });
    });
  },

  async getKeys(): Promise<string[]> {
    return new Promise(resolve => {
      const cloudStorage = window.Telegram?.WebApp?.CloudStorage;
      if (!cloudStorage) {
        // 回退到 localStorage
        resolve(Object.keys(localStorage));
        return;
      }

      cloudStorage.getKeys((error, keys) => {
        if (error || !keys) {
          resolve(Object.keys(localStorage));
          return;
        }
        resolve(keys);
      });
    });
  },
};

// ============ Discord SDK Storage 实现（预留） ============

// const discordStorage: IStorageService = {
//   // Discord Embedded App SDK 存储实现
//   // 参考: https://discord.com/developers/docs/activities/overview
// };

// ============ 存储服务获取 ============

let cachedStorageService: IStorageService | null = null;
let cachedPlatform: PlatformType | null = null;

/**
 * 获取当前平台的存储服务
 *
 * 自动检测平台并返回对应的存储实现：
 * - Web: localStorage
 * - Telegram Mini App: CloudStorage
 * - Discord Mini App: SDK Storage（预留）
 */
export function getStorageService(): IStorageService {
  const platform = detectPlatform();

  // 如果平台没变，返回缓存的服务
  if (cachedStorageService && cachedPlatform === platform) {
    return cachedStorageService;
  }

  cachedPlatform = platform;

  switch (platform) {
    case 'telegram':
      cachedStorageService = telegramStorage;
      break;
    // case 'discord':
    //   cachedStorageService = discordStorage;
    //   break;
    default:
      cachedStorageService = webStorage;
  }

  return cachedStorageService;
}

/**
 * 获取 Web localStorage 存储服务
 * 用于需要强制使用 localStorage 的场景
 */
export function getWebStorage(): IStorageService {
  return webStorage;
}

/**
 * 重置存储服务缓存
 * 主要用于测试
 */
export function resetStorageServiceCache(): void {
  cachedStorageService = null;
  cachedPlatform = null;
}
