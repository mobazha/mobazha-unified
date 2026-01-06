/**
 * API 配置
 */

// API 端点配置
export interface ApiConfig {
  gatewayUrl: string;
  searchUrl: string;
  mbzGatewayUrl: string;
}

// 默认配置
const defaultConfig: ApiConfig = {
  gatewayUrl: 'http://localhost:4002',
  searchUrl: 'https://search.mobazha.com',
  mbzGatewayUrl: 'https://gateway.mobazha.com',
};

// 当前配置
let currentConfig: ApiConfig = { ...defaultConfig };

/**
 * 设置 API 配置
 */
export function setApiConfig(config: Partial<ApiConfig>): void {
  currentConfig = { ...currentConfig, ...config };
}

/**
 * 获取 API 配置
 */
export function getApiConfig(): ApiConfig {
  return currentConfig;
}

/**
 * 获取 Gateway API URL
 */
export function getGatewayUrl(): string {
  return currentConfig.gatewayUrl;
}

/**
 * 获取 Search API URL
 */
export function getSearchUrl(): string {
  return currentConfig.searchUrl;
}

/**
 * 获取 MBZ Gateway URL
 */
export function getMbzGatewayUrl(): string {
  return currentConfig.mbzGatewayUrl;
}

/**
 * 认证凭据
 */
let authCredentials: { username: string; password: string } | null = null;

/**
 * 设置认证凭据
 */
export function setAuthCredentials(username: string, password: string): void {
  authCredentials = { username, password };
}

/**
 * 清除认证凭据
 */
export function clearAuthCredentials(): void {
  authCredentials = null;
}

/**
 * 获取认证 Headers
 */
export function getAuthHeaders(username?: string, password?: string): Record<string, string> {
  const user = username ?? authCredentials?.username;
  const pass = password ?? authCredentials?.password;

  if (!user || !pass) {
    return { 'Content-Type': 'application/json' };
  }

  const encoded = btoa(`${user}:${pass}`);
  return {
    'Content-Type': 'application/json',
    Authorization: `Basic ${encoded}`,
  };
}

/**
 * 群组上下文 Headers（可选）
 */
let groupContext: Record<string, string> = {};

/**
 * 设置群组上下文
 */
export function setGroupContext(context: Record<string, string>): void {
  groupContext = context;
}

/**
 * 获取包含群组上下文的 Headers
 */
export function getHeadersWithContext(
  username?: string,
  password?: string
): Record<string, string> {
  return {
    ...getAuthHeaders(username, password),
    ...groupContext,
  };
}
