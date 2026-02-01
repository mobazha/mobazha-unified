/**
 * Application Configuration
 *
 * Controls whether to use real API or mock data.
 * Set via environment variables or runtime configuration.
 */

// 导出环境配置
export * from './env';

// 导出测试账号配置
export * from './testAccounts';

// 导出 AppKit 配置
export * from './appkit';

// 导出路由配置
export * from './routeConfig';

export interface AppConfig {
  /** Use mock data instead of real API */
  useMockData: boolean;
  /** API base URL */
  apiBaseUrl: string;
  /** Matrix homeserver URL */
  matrixHomeserver: string;
  /** Enable Matrix chat functionality (set to false to disable during development) */
  matrixEnabled: boolean;
  /** Enable debug logging */
  debug: boolean;
}

// Default configuration
const defaultConfig: AppConfig = {
  useMockData: true, // Default to mock data for development
  apiBaseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000',
  matrixHomeserver: process.env.NEXT_PUBLIC_MATRIX_HOMESERVER || 'https://matrix.org',
  matrixEnabled: false, // Set to true to enable Matrix chat (disabled by default for development)
  debug: process.env.NODE_ENV === 'development',
};

// Runtime configuration (can be modified at runtime)
let runtimeConfig: Partial<AppConfig> = {};

/**
 * Get the current application configuration
 */
export function getConfig(): AppConfig {
  // Check matrixEnabled from env or runtime config
  const matrixEnabledFromEnv = process.env.NEXT_PUBLIC_MATRIX_ENABLED;
  let matrixEnabled = defaultConfig.matrixEnabled;
  if (matrixEnabledFromEnv === 'true') {
    matrixEnabled = true;
  } else if (matrixEnabledFromEnv === 'false') {
    matrixEnabled = false;
  } else if (runtimeConfig.matrixEnabled !== undefined) {
    matrixEnabled = runtimeConfig.matrixEnabled;
  }

  return {
    ...defaultConfig,
    ...runtimeConfig,
    // Environment variables take precedence
    useMockData:
      process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true' ||
      (process.env.NEXT_PUBLIC_USE_MOCK_DATA !== 'false' && runtimeConfig.useMockData !== false),
    matrixEnabled,
  };
}

/**
 * Update runtime configuration
 */
export function setConfig(config: Partial<AppConfig>): void {
  runtimeConfig = { ...runtimeConfig, ...config };
}

/**
 * Check if mock data should be used
 */
export function isMockMode(): boolean {
  return getConfig().useMockData;
}

/**
 * Check if Matrix chat is enabled
 */
export function isMatrixEnabled(): boolean {
  return getConfig().matrixEnabled;
}

/**
 * Enable mock data mode
 */
export function enableMockData(): void {
  setConfig({ useMockData: true });
}

/**
 * Disable mock data mode (use real API)
 */
export function disableMockData(): void {
  setConfig({ useMockData: false });
}

/**
 * Toggle mock data mode
 */
export function toggleMockData(): boolean {
  const current = isMockMode();
  setConfig({ useMockData: !current });
  return !current;
}

export default {
  getConfig,
  setConfig,
  isMockMode,
  isMatrixEnabled,
  enableMockData,
  disableMockData,
  toggleMockData,
};
