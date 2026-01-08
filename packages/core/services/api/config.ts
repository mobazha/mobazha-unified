/**
 * API 配置
 */

import { getEnvConfig } from '../../config/env';
import { getStoredToken } from '../auth/token';

// API 端点配置
export interface ApiConfig {
  gatewayUrl: string;
  searchUrl: string;
  mbzGatewayUrl: string;
}

// 覆盖配置（可选）
let configOverrides: Partial<ApiConfig> = {};

/**
 * 检测是否在浏览器环境（每次调用时检测）
 */
function shouldUseProxy(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

/**
 * 设置 API 配置覆盖
 */
export function setApiConfig(config: Partial<ApiConfig>): void {
  configOverrides = { ...configOverrides, ...config };
}

/**
 * 获取 API 配置（始终从环境配置获取最新值）
 * 在浏览器环境下自动使用代理路径
 *
 * API 路径说明（参考移动端和桌面端）：
 * - gatewayUrl: 包含 /v1 前缀，如 /proxy/v1，用于 /v1/ob/* 接口
 * - searchUrl: 搜索 API，如 /proxy/info
 * - mbzGatewayUrl: MBZ Gateway，如 /proxy/info/v1
 */
export function getApiConfig(): ApiConfig {
  const env = getEnvConfig();

  // 浏览器环境使用代理
  if (shouldUseProxy()) {
    return {
      gatewayUrl: configOverrides.gatewayUrl ?? '/proxy/v1',
      searchUrl: configOverrides.searchUrl ?? '/proxy/info',
      mbzGatewayUrl: configOverrides.mbzGatewayUrl ?? '/proxy/info/v1',
    };
  }

  return {
    gatewayUrl: configOverrides.gatewayUrl ?? env.api.gateway,
    searchUrl: configOverrides.searchUrl ?? env.api.search,
    mbzGatewayUrl: configOverrides.mbzGatewayUrl ?? env.api.mbzGateway,
  };
}

/**
 * 获取 Hosting 服务基础 URL
 * 用于 /api/* 接口（如 /api/signin, /api/userinfo）
 * 这些接口不需要 /v1 前缀
 */
export function getHostingUrl(): string {
  // 浏览器环境使用代理（不含 /v1）
  if (shouldUseProxy()) {
    return '/proxy';
  }
  const env = getEnvConfig();
  return env.api.baseUrl;
}

/**
 * 获取 Gateway API URL（始终获取最新配置）
 * 在浏览器环境下自动使用代理路径
 *
 * 注意：返回的 URL 已包含 /v1 前缀（参考移动端 gatewayAPI）
 * 用于 /v1/ob/* 接口（如 /v1/ob/profile, /v1/ob/listing）
 */
export function getGatewayUrl(): string {
  if (configOverrides.gatewayUrl) {
    return configOverrides.gatewayUrl;
  }
  // 浏览器环境使用代理（包含 /v1 前缀）
  if (shouldUseProxy()) {
    return '/proxy/v1';
  }
  const env = getEnvConfig();
  return env.api.gateway;
}

/**
 * 获取 Search API URL（始终获取最新配置）
 * 在浏览器环境下自动使用代理路径
 */
export function getSearchUrl(): string {
  if (configOverrides.searchUrl) {
    return configOverrides.searchUrl;
  }
  // 浏览器环境使用代理
  if (shouldUseProxy()) {
    return '/proxy/info';
  }
  const env = getEnvConfig();
  return env.api.search;
}

/**
 * 获取 MBZ Gateway URL（始终获取最新配置）
 * 在浏览器环境下自动使用代理路径
 */
export function getMbzGatewayUrl(): string {
  if (configOverrides.mbzGatewayUrl) {
    return configOverrides.mbzGatewayUrl;
  }
  // 浏览器环境使用代理
  if (shouldUseProxy()) {
    return '/proxy/info/v1';
  }
  const env = getEnvConfig();
  return env.api.mbzGateway;
}

/**
 * 认证凭据（保留 Basic Auth 支持，向后兼容）
 */
let authCredentials: { username: string; password: string } | null = null;

/**
 * 设置认证凭据（Basic Auth）
 * @deprecated 推荐使用 Token 认证
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
 * 优先使用 Bearer Token，其次使用 Basic Auth
 */
export function getAuthHeaders(username?: string, password?: string): Record<string, string> {
  const baseHeaders = { 'Content-Type': 'application/json' };

  // 优先使用 Bearer Token
  const token = getStoredToken();
  if (token) {
    return {
      ...baseHeaders,
      Authorization: `Bearer ${token}`,
    };
  }

  // 兼容 Basic Auth（用于测试或特殊场景）
  const user = username ?? authCredentials?.username;
  const pass = password ?? authCredentials?.password;

  if (user && pass) {
    const encoded = btoa(`${user}:${pass}`);
    return {
      ...baseHeaders,
      Authorization: `Basic ${encoded}`,
    };
  }

  return baseHeaders;
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

/**
 * 将 IPFS hash 转换为完整的图片 URL
 * 参考移动端实现: mobazha-mobile/utils/files.js
 */
export function getImageUrl(hash: string | undefined | null): string | undefined {
  if (!hash || hash === '') {
    return undefined;
  }
  // 如果已经是完整 URL，直接返回
  if (hash.startsWith('http://') || hash.startsWith('https://') || hash.startsWith('/')) {
    return hash;
  }
  // 将 IPFS hash 转换为 gateway URL
  return `${getMbzGatewayUrl()}/ob/image/${hash}`;
}
