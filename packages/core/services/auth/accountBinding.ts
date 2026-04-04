/**
 * 账号绑定服务
 * 支持查询已绑定账号、绑定新账号、解绑账号等功能
 *
 * Architecture:
 * - Telegram: 通过 Login Widget 直接验证 (Hosting-side)，绕过 Casdoor OAuth
 * - Discord/Google/GitHub 等标准 OAuth: 通过 Casdoor link mode（method="link"），
 *   Casdoor 仅返回 provider 身份，不创建用户；Hosting 后端负责绑定到当前用户
 */

import { getHostingUrl } from '../api/config';
import { getStoredToken } from './token';
import {
  parseJwtToken,
  SF_RETURN_SEPARATOR,
  getStorefrontReturnOrigin,
  getSaaSMainOrigin,
  isAllowedStorefrontReturn,
} from './casdoor';
import { getEnvConfig } from '../../config/env';
import type {
  LinkedAccountsResponse,
  LinkUrlResponse,
  UnlinkResponse,
  LinkCallbackResponse,
  DirectLinkResponse,
  LinkConfigResponse,
  TelegramAuthData,
  OAuthProvider,
} from '../../types/account';
import { CASDOOR_PROVIDER_NAMES } from '../../types/account';

/**
 * 获取已绑定的账号列表
 */
export async function getLinkedAccounts(): Promise<LinkedAccountsResponse> {
  const baseUrl = getHostingUrl();
  const token = getStoredToken();

  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${baseUrl}/platform/v1/accounts/linked`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.error?.message || 'Failed to get linked accounts');
  }

  const data = await response.json();
  return data.data as LinkedAccountsResponse;
}

/**
 * 获取绑定账号的 OAuth URL
 * 直接使用前端的 Casdoor 配置生成 URL，避免前后端配置不一致
 *
 * @param provider 要绑定的 provider 类型
 * @param redirectUri 绑定完成后的回调 URL
 */
export function getLinkUrl(
  provider: OAuthProvider,
  redirectUri: string,
  stateSuffix?: string
): LinkUrlResponse {
  const token = getStoredToken();

  if (!token) {
    throw new Error('Not authenticated');
  }

  const claims = parseJwtToken(token);
  if (!claims || !claims.sub) {
    throw new Error('Invalid token: missing user identifier');
  }

  const env = getEnvConfig();
  const { serverUrl, clientId } = env.casdoor;

  // State format: link:<userUUID>:<provider>[::sf=<origin>]
  // Backend extracts provider from state to know which field to update on the user
  const state = `link:${claims.sub}:${provider}${stateSuffix || ''}`;

  const casdoorProviderName = CASDOOR_PROVIDER_NAMES[provider];

  // provider_hint triggers Casdoor auto-redirect; must match the provider name in Casdoor DB.
  // Telegram uses widget-based auth (not OAuth redirect), so provider_hint would skip the
  // login page and land on the callback without auth data — causing "hash not found" errors.
  const WIDGET_BASED_PROVIDERS: OAuthProvider[] = ['telegram'];

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid profile email',
    state,
    ...(!WIDGET_BASED_PROVIDERS.includes(provider) && { provider_hint: casdoorProviderName }),
  });

  const url = `${serverUrl}/login/oauth/authorize?${params.toString()}`;

  return { url };
}

/**
 * 发起绑定账号流程
 * 将重定向用户到 OAuth Provider 进行授权
 *
 * @param provider 要绑定的 provider 类型
 * @param redirectUri 绑定完成后的回调 URL（可选，默认使用当前页面）
 */
export function startLinkAccount(provider: OAuthProvider, redirectUri?: string): void {
  if (typeof window === 'undefined') {
    throw new Error('startLinkAccount can only be called in browser');
  }

  const sfReturnOrigin = getStorefrontReturnOrigin();
  const mainOrigin = getSaaSMainOrigin();

  let callbackUrl: string;
  let storefrontSuffix = '';

  if (!redirectUri && sfReturnOrigin && mainOrigin) {
    callbackUrl = `${mainOrigin}/settings/account?link_callback=1`;
    storefrontSuffix = `${SF_RETURN_SEPARATOR}${encodeURIComponent(sfReturnOrigin)}`;
  } else {
    callbackUrl = redirectUri || `${window.location.origin}/settings/account?link_callback=1`;
  }

  sessionStorage.setItem('link_provider', provider);
  sessionStorage.setItem('link_redirect', window.location.pathname);

  const { url } = getLinkUrl(provider, callbackUrl, storefrontSuffix);
  window.location.href = url;
}

/**
 * 处理绑定回调
 * 支持两种模式:
 *   - code 模式: Casdoor OAuth 返回已有用户 (标准 code 交换)
 *   - provider_id 模式: Casdoor link_only 返回 provider info (无用户创建)
 *
 * @param code OAuth 授权码 (可选)
 * @param state OAuth state 参数
 * @param providerId Provider ID 直传 (可选, 来自 Casdoor link_only 模式)
 */
export async function handleLinkCallback(
  code: string | null,
  state: string,
  providerId?: string | null
): Promise<LinkCallbackResponse> {
  const baseUrl = getHostingUrl();
  const token = getStoredToken();

  if (!token) {
    return { success: false, error: 'Not authenticated' };
  }

  const sfIdx = state.indexOf(SF_RETURN_SEPARATOR);
  const cleanState = sfIdx === -1 ? state : state.substring(0, sfIdx);

  const params = new URLSearchParams({ state: cleanState });
  if (code) params.set('code', code);
  if (providerId) params.set('provider_id', providerId);

  const response = await fetch(`${baseUrl}/platform/v1/accounts/link-callback?${params}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    return { success: false, error: errorData?.error?.message || 'Link failed' };
  }

  const data = await response.json();
  return data.data as LinkCallbackResponse;
}

// ---------------------------------------------------------------------------
// Direct Linking: Telegram via Login Widget (Hosting-side verification)
// ---------------------------------------------------------------------------

/**
 * 获取绑定配置（public endpoint，无需认证）
 * 返回各 provider 的前端配置（Telegram botUsername, Discord clientId 等）
 */
export async function getLinkConfig(): Promise<LinkConfigResponse> {
  const baseUrl = getHostingUrl();

  const response = await fetch(`${baseUrl}/platform/v1/accounts/link/config`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    throw new Error('Failed to get link config');
  }

  const data = await response.json();
  return data.data as LinkConfigResponse;
}

/**
 * 直接绑定 Telegram（通过 Login Widget auth data）
 * 后端验证 HMAC-SHA256 签名后更新 Casdoor user.Telegram 字段
 */
export async function directLinkTelegram(authData: TelegramAuthData): Promise<DirectLinkResponse> {
  const baseUrl = getHostingUrl();
  const token = getStoredToken();

  if (!token) {
    throw new Error('Not authenticated');
  }

  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(authData)) {
    if (v !== undefined && v !== null) params.set(k, String(v));
  }

  const response = await fetch(`${baseUrl}/platform/v1/accounts/link/telegram?${params}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.error?.message || 'Failed to link Telegram');
  }

  return { success: true };
}

/**
 * 解绑账号
 *
 * @param provider 要解绑的 provider 类型
 */
export async function unlinkAccount(provider: OAuthProvider): Promise<UnlinkResponse> {
  const baseUrl = getHostingUrl();
  const token = getStoredToken();

  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${baseUrl}/platform/v1/accounts/unlink`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ provider }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.error?.message || 'Failed to unlink account');
  }

  const data = await response.json();
  return data.data as UnlinkResponse;
}

/**
 * Extract storefront return origin from link callback state.
 * Returns validated origin or null.
 */
export function getLinkCallbackStorefrontReturn(): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const state = params.get('state');
  if (!state) return null;
  const idx = state.indexOf(SF_RETURN_SEPARATOR);
  if (idx === -1) return null;
  const origin = decodeURIComponent(state.substring(idx + SF_RETURN_SEPARATOR.length));
  return isAllowedStorefrontReturn(origin) ? origin : null;
}

/**
 * 检查是否有绑定回调参数
 * 支持两种模式:
 *   - code 模式: state + code (标准 OAuth)
 *   - provider_id 模式: state + provider_id (Casdoor link_only)
 */
export function hasLinkCallback(): boolean {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  const state = params.get('state');
  if (!state || !state.startsWith('link:')) return false;
  return params.has('code') || params.has('provider_id');
}

/**
 * 获取绑定回调参数
 */
export function getLinkCallbackParams(): {
  code: string | null;
  state: string | null;
  providerId: string | null;
} {
  if (typeof window === 'undefined') {
    return { code: null, state: null, providerId: null };
  }
  const params = new URLSearchParams(window.location.search);
  return {
    code: params.get('code'),
    state: params.get('state'),
    providerId: params.get('provider_id'),
  };
}

/**
 * 清理 URL 中的绑定回调参数
 */
export function clearLinkCallbackParams(): void {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  url.searchParams.delete('code');
  url.searchParams.delete('state');
  url.searchParams.delete('link_callback');
  url.searchParams.delete('provider_id');
  url.searchParams.delete('provider_type');
  window.history.replaceState({}, '', url.toString());
}

/**
 * 获取绑定后应该返回的页面路径
 */
export function getLinkRedirectPath(): string {
  if (typeof sessionStorage === 'undefined') return '/settings/account';
  const path = sessionStorage.getItem('link_redirect');
  sessionStorage.removeItem('link_redirect');
  sessionStorage.removeItem('link_provider');
  return path || '/settings/account';
}
