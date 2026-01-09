/**
 * 请求去重工具
 *
 * 用于防止 React Strict Mode 或其他原因导致的重复 API 请求。
 * 支持设置 TTL 缓存，在指定时间内重复请求会返回已有的 Promise。
 *
 * @example
 * ```typescript
 * // 创建去重实例
 * const productDedup = createRequestDedup<Product | null>(5000);
 *
 * // 使用去重函数
 * const product = await productDedup.request(
 *   `product-${slug}-${peerID}`,
 *   () => productDataService.getProduct(slug, peerID)
 * );
 * ```
 */

interface CachedRequest<T> {
  promise: Promise<T>;
  timestamp: number;
}

/**
 * 创建一个请求去重实例
 * @param ttl 缓存有效期（毫秒），默认 5000ms
 */
export function createRequestDedup<T>(ttl: number = 5000) {
  const cache = new Map<string, CachedRequest<T>>();

  // 清理过期缓存
  const cleanup = () => {
    const now = Date.now();
    for (const [key, value] of cache.entries()) {
      if (now - value.timestamp > ttl) {
        cache.delete(key);
      }
    }
  };

  return {
    /**
     * 发起去重请求
     * @param key 请求的唯一标识
     * @param fetcher 实际的请求函数
     */
    async request(key: string, fetcher: () => Promise<T>): Promise<T> {
      const existing = cache.get(key);

      // 如果有缓存且未过期，直接返回
      if (existing && Date.now() - existing.timestamp < ttl) {
        return existing.promise;
      }

      const promise = fetcher();
      cache.set(key, { promise, timestamp: Date.now() });

      // 定期清理过期缓存
      setTimeout(cleanup, ttl + 100);

      return promise;
    },

    /**
     * 清除指定 key 的缓存
     */
    invalidate(key: string) {
      cache.delete(key);
    },

    /**
     * 清除所有缓存
     */
    clear() {
      cache.clear();
    },
  };
}

// ============ 预定义的去重实例 ============

// 商品详情去重
export const productDedup = createRequestDedup<unknown>(5000);

// 用户资料去重
export const profileDedup = createRequestDedup<unknown>(5000);

// 商品评价去重
export const ratingsDedup = createRequestDedup<unknown>(5000);

// 商品列表去重（首页、店铺等）
export const listingsDedup = createRequestDedup<unknown>(3000);

// 搜索结果去重
export const searchDedup = createRequestDedup<unknown>(2000);

// ============ 便捷函数 ============

/**
 * 去重获取商品详情
 */
export async function getProductWithDedup<T>(
  slug: string,
  peerID: string | undefined,
  fetcher: () => Promise<T>
): Promise<T> {
  const key = `product-${slug}-${peerID || ''}`;
  return productDedup.request(key, fetcher) as Promise<T>;
}

/**
 * 去重获取用户资料
 */
export async function getProfileWithDedup<T>(
  peerID: string,
  fetcher: () => Promise<T>
): Promise<T> {
  const key = `profile-${peerID}`;
  return profileDedup.request(key, fetcher) as Promise<T>;
}

/**
 * 去重获取商品评价
 */
export async function getRatingsWithDedup<T>(
  slug: string,
  peerID: string,
  fetcher: () => Promise<T>
): Promise<T> {
  const key = `ratings-${slug}-${peerID}`;
  return ratingsDedup.request(key, fetcher) as Promise<T>;
}

/**
 * 去重获取商品列表
 */
export async function getListingsWithDedup<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  return listingsDedup.request(key, fetcher) as Promise<T>;
}
