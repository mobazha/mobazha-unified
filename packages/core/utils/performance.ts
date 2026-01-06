/**
 * 性能优化工具函数
 */

/**
 * 防抖函数
 * 在指定时间内多次调用只执行最后一次
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return function (this: unknown, ...args: Parameters<T>) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      func.apply(this, args);
      timeoutId = null;
    }, wait);
  };
}

/**
 * 节流函数
 * 在指定时间内只执行一次
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;

  return function (this: unknown, ...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

/**
 * 记忆化函数
 * 缓存函数结果，相同参数直接返回缓存值
 */
export function memoize<T extends (...args: unknown[]) => unknown>(
  func: T,
  resolver?: (...args: Parameters<T>) => string
): T {
  const cache = new Map<string, ReturnType<T>>();

  return function (this: unknown, ...args: Parameters<T>): ReturnType<T> {
    const key = resolver ? resolver(...args) : JSON.stringify(args);

    if (cache.has(key)) {
      return cache.get(key)!;
    }

    const result = func.apply(this, args) as ReturnType<T>;
    cache.set(key, result);
    return result;
  } as T;
}

/**
 * 延迟执行 (requestIdleCallback polyfill)
 */
export function scheduleIdleTask(callback: () => void, timeout = 2000): void {
  if ('requestIdleCallback' in window) {
    (
      window as Window & {
        requestIdleCallback: (cb: () => void, options?: { timeout: number }) => void;
      }
    ).requestIdleCallback(callback, { timeout });
  } else {
    setTimeout(callback, 1);
  }
}

/**
 * 预加载图片
 */
export function preloadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * 预加载多张图片
 */
export function preloadImages(srcs: string[]): Promise<HTMLImageElement[]> {
  return Promise.all(srcs.map(preloadImage));
}

/**
 * 预加载脚本
 */
export function preloadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'script';
    link.href = src;
    link.onload = () => resolve();
    link.onerror = reject;
    document.head.appendChild(link);
  });
}

/**
 * 测量函数执行时间
 */
export function measureTime<T>(func: () => T, label = 'Execution'): T {
  const start = performance.now();
  const result = func();
  const end = performance.now();

  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.log(`[Performance] ${label}: ${(end - start).toFixed(2)}ms`);
  }

  return result;
}

/**
 * 异步测量执行时间
 */
export async function measureTimeAsync<T>(func: () => Promise<T>, label = 'Execution'): Promise<T> {
  const start = performance.now();
  const result = await func();
  const end = performance.now();

  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.log(`[Performance] ${label}: ${(end - start).toFixed(2)}ms`);
  }

  return result;
}

/**
 * 分批处理大数组
 * 避免长时间阻塞主线程
 */
export async function batchProcess<T, R>(
  items: T[],
  processor: (item: T, index: number) => R,
  batchSize = 100,
  delayMs = 0
): Promise<R[]> {
  const results: R[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = batch.map((item, idx) => processor(item, i + idx));
    results.push(...batchResults);

    if (delayMs > 0 && i + batchSize < items.length) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  return results;
}

/**
 * 创建带超时的 Promise
 */
export function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs)
    ),
  ]);
}

/**
 * 重试函数
 */
export async function retry<T>(
  func: () => Promise<T>,
  maxRetries = 3,
  delayMs = 1000,
  backoff = 2
): Promise<T> {
  let lastError: Error | null = null;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await func();
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs * Math.pow(backoff, i)));
      }
    }
  }

  throw lastError;
}

/**
 * 检查是否在视口内
 */
export function isInViewport(element: Element, offset = 0): boolean {
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= -offset &&
    rect.left >= -offset &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) + offset &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth) + offset
  );
}

/**
 * RAF 节流
 * 使用 requestAnimationFrame 进行节流，适合动画相关操作
 */
export function rafThrottle<T extends (...args: unknown[]) => unknown>(
  func: T
): (...args: Parameters<T>) => void {
  let rafId: number | null = null;
  let lastArgs: Parameters<T> | null = null;

  return function (this: unknown, ...args: Parameters<T>) {
    lastArgs = args;

    if (rafId === null) {
      rafId = requestAnimationFrame(() => {
        func.apply(this, lastArgs!);
        rafId = null;
      });
    }
  };
}
