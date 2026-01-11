/**
 * 平台存储类型声明
 *
 * 为 Telegram Mini App 和 Discord Mini App 提供类型支持
 */

// Telegram WebApp 类型声明
declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData?: string;
        initDataUnsafe?: {
          user?: {
            id: number;
            first_name: string;
            last_name?: string;
            username?: string;
            language_code?: string;
          };
        };
        CloudStorage?: {
          setItem: (
            key: string,
            value: string,
            callback?: (error: Error | null, success?: boolean) => void
          ) => void;
          getItem: (key: string, callback?: (error: Error | null, value?: string) => void) => void;
          getItems: (
            keys: string[],
            callback?: (error: Error | null, values?: Record<string, string>) => void
          ) => void;
          removeItem: (
            key: string,
            callback?: (error: Error | null, success?: boolean) => void
          ) => void;
          removeItems: (
            keys: string[],
            callback?: (error: Error | null, success?: boolean) => void
          ) => void;
          getKeys: (callback?: (error: Error | null, keys?: string[]) => void) => void;
        };
      };
    };

    // Discord SDK 预留（未来扩展）
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    DiscordSDK?: {
      // Discord Embedded App SDK 类型
      // https://discord.com/developers/docs/activities/overview
    };
  }
}

/**
 * 存储服务接口
 */
export interface IStorageService {
  /**
   * 获取存储项
   */
  getItem(key: string): Promise<string | null>;

  /**
   * 设置存储项
   */
  setItem(key: string, value: string): Promise<void>;

  /**
   * 删除存储项
   */
  removeItem(key: string): Promise<void>;

  /**
   * 批量获取存储项
   */
  getItems?(keys: string[]): Promise<Record<string, string | null>>;

  /**
   * 批量删除存储项
   */
  removeItems?(keys: string[]): Promise<void>;

  /**
   * 获取所有键
   */
  getKeys?(): Promise<string[]>;
}

/**
 * 支持的平台类型
 */
export type PlatformType = 'web' | 'telegram' | 'discord';

export {};
