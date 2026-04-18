/**
 * API 配置
 */

import { getEnvConfig, isStandaloneMode } from '../../config/env';
import { NODE_API } from '../../config/apiPaths';
import { getStoredToken } from '../auth/token';
import { getStoreHeaders } from '../storeContext';
import { getStorefrontHeaders } from '../storefrontContext';

// API 端点配置
export interface ApiConfig {
  gatewayUrl: string;
  searchUrl: string;
  mbzGatewayUrl: string;
  mediaBaseUrl?: string;
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
 * - gatewayUrl: 包含 /v1 前缀，如 /proxy/v1，用于 /v1/* 接口
 * - searchUrl: 搜索 API，如 /proxy/info
 * - mbzGatewayUrl: MBZ Gateway，如 /proxy/info/v1
 */
export function getApiConfig(): ApiConfig {
  const env = getEnvConfig();

  // 浏览器环境使用代理
  // 注意：服务器 nginx 直接代理 /v1, /info, /api 路径，无需 /proxy 前缀
  if (shouldUseProxy()) {
    return {
      gatewayUrl: configOverrides.gatewayUrl ?? '/v1',
      searchUrl: configOverrides.searchUrl ?? '/info',
      mbzGatewayUrl: configOverrides.mbzGatewayUrl ?? '/info/v1',
    };
  }

  return {
    gatewayUrl: configOverrides.gatewayUrl ?? env.api.gateway,
    searchUrl: configOverrides.searchUrl ?? env.api.search,
    mbzGatewayUrl: configOverrides.mbzGatewayUrl ?? env.api.mbzGateway,
  };
}

/**
 * 获取 Hosting 平台服务基础 URL
 * 用于 /platform/v1/* 接口（如 /platform/v1/auth/signin, /platform/v1/accounts/me）
 */
export function getHostingUrl(): string {
  if (shouldUseProxy()) {
    return '';
  }
  const env = getEnvConfig();
  return env.api.baseUrl;
}

/**
 * 获取 Gateway API URL（始终获取最新配置）
 * 在浏览器环境下自动使用代理路径
 *
 * 注意：返回的 URL 已包含 /v1 前缀（参考移动端 gatewayAPI）
 * 用于 /v1/* 接口（如 /v1/profile, /v1/listing）
 */
export function getGatewayUrl(): string {
  if (configOverrides.gatewayUrl) {
    return configOverrides.gatewayUrl;
  }
  // 浏览器环境：服务器 nginx 直接代理 /v1 路径
  if (shouldUseProxy()) {
    return '/v1';
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
  // 浏览器环境：服务器 nginx 直接代理 /info 路径
  if (shouldUseProxy()) {
    return '/info';
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
  // 浏览器环境：服务器 nginx 直接代理 /info 路径
  if (shouldUseProxy()) {
    return '/info/v1';
  }
  const env = getEnvConfig();
  return env.api.mbzGateway;
}

/**
 * 获取买家 API URL（独立站模式专用）
 *
 * 独立站模式下，买家写操作（下单、消息、查看购买记录）通过 SaaS 平台路由。
 * Caddy 将 /buyer-api/* 转发到 SaaS hosting（strip prefix 后变为 /v1/*）。
 * 非独立站模式下，直接复用 getGatewayUrl()（所有请求走同一网关）。
 */
export function getBuyerGatewayUrl(): string {
  if (!isStandaloneMode()) {
    return getGatewayUrl();
  }
  if (shouldUseProxy()) {
    return '/buyer-api/v1';
  }
  return getGatewayUrl();
}

/**
 * 获取买家 WebSocket URL（独立站模式专用）
 *
 * 独立站买家的 WebSocket 需连接到 SaaS 平台（业务数据在 SaaS 侧）。
 * Caddy 将 /buyer-api/ws 转发到 SaaS hosting（strip prefix 后变为 /ws）。
 * 非独立站模式下返回默认 env.api.websocket（与卖家相同）。
 */
export function getBuyerWebSocketUrl(): string {
  if (!isStandaloneMode() || !shouldUseProxy()) {
    return getEnvConfig().api.websocket;
  }
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/buyer-api/ws`;
}

/**
 * 获取卖家 WebSocket URL（独立站模式专用）
 *
 * 独立站卖家的 WebSocket 需连接到本地节点（通过 Caddy 代理的 /ws）。
 * 非独立站模式下返回默认 env.api.websocket。
 */
export function getSellerWebSocketUrl(): string {
  if (!isStandaloneMode() || !shouldUseProxy()) {
    return getEnvConfig().api.websocket;
  }
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws`;
}

/**
 * 独立站买家标志（由 userStore 在登录/恢复会话时设置）。
 * API 层通过此标志判断是否将"用户自己的数据"请求路由到 SaaS，
 * 避免 API 模块直接依赖 store（防止循环依赖）。
 */
let _standaloneBuyerAuth = false;

export function setStandaloneBuyerAuth(value: boolean): void {
  _standaloneBuyerAuth = value;
}

export function isStandaloneBuyerAuth(): boolean {
  return _standaloneBuyerAuth && isStandaloneMode();
}

/**
 * 获取当前用户"自己的数据"的 Gateway URL。
 *
 * 公共店铺数据（listings、profiles、exchange rates）始终从独立站节点读取（getGatewayUrl）。
 * 用户私有数据（preferences、notifications、orders、chat）根据角色路由：
 *   - 独立站买家 → SaaS（getBuyerGatewayUrl）
 *   - 其他模式 → 本地网关（getGatewayUrl）
 */
export function getMyGatewayUrl(): string {
  if (isStandaloneBuyerAuth()) {
    return getBuyerGatewayUrl();
  }
  return getGatewayUrl();
}

/**
 * 获取认证 Headers
 * 从 stored token 获取认证信息（Bearer 或 Basic）
 */
export function getAuthHeaders(): Record<string, string> {
  const baseHeaders = { 'Content-Type': 'application/json' };

  const token = getStoredToken();
  if (token) {
    if (token.startsWith('basic:')) {
      return {
        ...baseHeaders,
        Authorization: `Basic ${token.slice(6)}`,
      };
    }
    return {
      ...baseHeaders,
      Authorization: `Bearer ${token}`,
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
 * 设置独立站店铺上下文 Headers（向后兼容的显式设置，
 * 通常不需要调用——getHeadersWithContext 会自动读取 storeContext）。
 */
export function setStoreContextHeaders(_context: Record<string, string>): void {
  // No-op: getHeadersWithContext() dynamically reads from storeContext.getStoreHeaders()
  // which is backed by localStorage. This function is kept for API compatibility.
}

/**
 * 获取包含群组上下文、店铺上下文和 Storefront 上下文的 Headers.
 *
 * Layering: `getStorefrontHeaders()` is feature-flag gated on
 * `tgBridgeBotV2Enabled` (see `storefrontContext.ts`) so the header is only
 * emitted once the backend route is rolled out. Order is preserved so
 * an explicit setter can still override.
 */
export function getHeadersWithContext(): Record<string, string> {
  return {
    ...getAuthHeaders(),
    ...groupContext,
    ...getStoreHeaders(),
    ...getStorefrontHeaders(),
  };
}

/**
 * 获取 CDN 媒体基础 URL（如 https://media.mobazha.org）。
 * 配置后，getImageUrl 直接构造 CDN URL 绕过 gateway，降低延迟。
 * 未配置时返回 undefined，fallback 到 gateway 路径。
 *
 * 优先级：configOverrides > env.api.mediaBaseUrl
 */
export function getMediaBaseURL(): string | undefined {
  if (configOverrides.mediaBaseUrl) {
    return configOverrides.mediaBaseUrl;
  }
  const env = getEnvConfig();
  return env.api.mediaBaseUrl || undefined;
}

/**
 * 将 CID hash 转换为完整的图片 URL。
 *
 * @param hash - CID hash, full URL, or undefined
 * @param storeHint - Optional peerID of the store that owns this image.
 *   When provided, the URL routes through the gateway with ?store={peerID}
 *   so the gateway can on-demand fetch from the standalone store (E'+D).
 *   After R2 backfill, subsequent requests use CDN directly.
 *
 * 优先级：
 *  1. 已是完整 URL → 直接返回
 *  2. storeHint 存在 → gateway URL + ?store= (跨店铺路由，跳过 CDN)
 *  3. CDN base URL 已配置 → 构造 CDN 直达 URL（绕过 gateway）
 *  4. Fallback → 通过 gateway 的 /v1/media/images/{hash} 路径
 */
export function getImageUrl(
  hash: string | undefined | null,
  storeHint?: string
): string | undefined {
  if (!hash || typeof hash !== 'string' || hash === '') {
    return undefined;
  }
  const h = hash.trim();
  if (!h) return undefined;
  if (h.startsWith('http://') || h.startsWith('https://') || h.startsWith('/')) {
    return h;
  }
  if (storeHint) {
    return `${getGatewayUrl()}${NODE_API.MEDIA_IMAGE(h)}?store=${encodeURIComponent(storeHint)}`;
  }
  const cdnBase = getMediaBaseURL();
  if (cdnBase) {
    return `${cdnBase}/${h}`;
  }
  return `${getGatewayUrl()}${NODE_API.MEDIA_IMAGE(h)}`;
}
