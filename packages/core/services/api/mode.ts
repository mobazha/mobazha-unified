/**
 * API 模式管理
 *
 * 支持 Mock 和 Real API 切换
 */

export type ApiMode = 'mock' | 'real' | 'auto';

interface ApiModeConfig {
  mode: ApiMode;
  fallbackToMock: boolean; // Real API 失败时是否回退到 Mock
  mockDelay: number; // Mock 响应延迟 (ms)
  logRequests: boolean; // 是否记录请求日志
}

// 默认配置
const defaultConfig: ApiModeConfig = {
  mode: 'auto', // auto: 优先使用 Real，失败回退 Mock
  fallbackToMock: true,
  mockDelay: 100,
  logRequests: process.env.NODE_ENV === 'development',
};

let currentConfig: ApiModeConfig = { ...defaultConfig };

/**
 * 设置 API 模式配置
 */
export function setApiModeConfig(config: Partial<ApiModeConfig>): void {
  currentConfig = { ...currentConfig, ...config };
}

/**
 * 获取 API 模式配置
 */
export function getApiModeConfig(): ApiModeConfig {
  return currentConfig;
}

/**
 * 设置 API 模式
 */
export function setApiMode(mode: ApiMode): void {
  currentConfig.mode = mode;
}

/**
 * 获取当前 API 模式
 */
export function getApiMode(): ApiMode {
  return currentConfig.mode;
}

/**
 * 是否使用 Mock 数据
 */
export function shouldUseMock(): boolean {
  return currentConfig.mode === 'mock';
}

/**
 * 是否应该在 Real API 失败时回退到 Mock
 */
export function shouldFallbackToMock(): boolean {
  return currentConfig.mode === 'auto' && currentConfig.fallbackToMock;
}

/**
 * Mock 延迟模拟
 */
export async function mockDelay(): Promise<void> {
  if (currentConfig.mockDelay > 0) {
    await new Promise(resolve => setTimeout(resolve, currentConfig.mockDelay));
  }
}

/**
 * API 请求日志
 */
export function logApiRequest(endpoint: string, method: string, usedMock: boolean): void {
  if (currentConfig.logRequests) {
    const modeLabel = usedMock ? '[MOCK]' : '[REAL]';
    // eslint-disable-next-line no-console
    console.debug(`${modeLabel} ${method} ${endpoint}`);
  }
}

export interface MockFallbackOptions {
  /** When true, skip the console.warn before falling back to mock. */
  quietFallbackWhen?: (error: unknown) => boolean;
}

/**
 * 创建带 Mock 回退的 API 调用
 */
export async function withMockFallback<T>(
  realFn: () => Promise<T>,
  mockFn: () => Promise<T>,
  endpoint: string,
  options?: MockFallbackOptions
): Promise<T> {
  const mode = getApiMode();

  // Mock 模式直接使用 Mock
  if (mode === 'mock') {
    await mockDelay();
    logApiRequest(endpoint, 'GET', true);
    return mockFn();
  }

  // Real 模式直接使用 Real
  if (mode === 'real') {
    logApiRequest(endpoint, 'GET', false);
    return realFn();
  }

  // Auto 模式：优先 Real，失败回退 Mock
  try {
    const result = await realFn();
    logApiRequest(endpoint, 'GET', false);
    return result;
  } catch (error) {
    if (shouldFallbackToMock()) {
      const quiet = options?.quietFallbackWhen?.(error) ?? false;
      if (!quiet) {
        console.warn(`[API] Real API failed for ${endpoint}, falling back to mock:`, error);
      }
      await mockDelay();
      logApiRequest(endpoint, 'GET', true);
      return mockFn();
    }
    throw error;
  }
}

/**
 * 环境变量初始化
 */
export function initApiModeFromEnv(): void {
  const envMode = process.env.NEXT_PUBLIC_API_MODE as ApiMode;
  if (envMode && ['mock', 'real', 'auto'].includes(envMode)) {
    setApiMode(envMode);
  }

  const envFallback = process.env.NEXT_PUBLIC_API_FALLBACK_TO_MOCK;
  if (envFallback !== undefined) {
    currentConfig.fallbackToMock = envFallback === 'true';
  }
}

// 自动初始化
if (typeof window !== 'undefined') {
  initApiModeFromEnv();
}
