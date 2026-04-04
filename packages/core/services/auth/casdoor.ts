/**
 * Casdoor 认证服务
 * 支持 OAuth2 授权码流程
 */

import { getEnvConfig, getStoreSubdomainBase } from '../../config/env';
import { getHostingUrl } from '../api/config';
import { HOSTING_API } from '../../config/apiPaths';
import { getCasdoorThemeParams } from '../../theme/casdoorTheme';

export const SF_RETURN_SEPARATOR = '::sf=';

export interface CasdoorUser {
  id: string;
  name: string;
  displayName: string;
  avatar: string;
  email?: string;
  phone?: string;
  createdTime?: string;
}

export interface CasdoorTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
}

export interface CasdoorClaims {
  sub: string;
  iss: string;
  aud: string;
  exp: number;
  iat: number;
  name: string;
  preferred_username: string;
}

export interface LoginResult {
  success: boolean;
  token?: string;
  user?: CasdoorUser;
  error?: string;
}

/**
 * 生成随机 state 参数（用于 CSRF 保护）
 */
function generateState(): string {
  const array = new Uint8Array(16);
  // 使用 globalThis 访问 crypto API（兼容浏览器和 Node.js）
  const cryptoApi = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined;
  if (cryptoApi && typeof cryptoApi.getRandomValues === 'function') {
    cryptoApi.getRandomValues(array);
  } else {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Get the main SaaS domain origin (e.g. "https://test-new.mobazha.org").
 * Derived from the API base URL which always points to the SaaS gateway.
 */
export function getSaaSMainOrigin(): string | null {
  const baseUrl = getEnvConfig().api.baseUrl;
  if (!baseUrl) return null;
  try {
    const u = new URL(baseUrl);
    return u.origin;
  } catch {
    return null;
  }
}

/**
 * Detect whether the current window is on a branded storefront subdomain
 * that differs from the main SaaS domain.  Returns the current origin
 * if so, otherwise null.
 */
export function getStorefrontReturnOrigin(): string | null {
  if (typeof window === 'undefined') return null;

  const subdomainBase = getStoreSubdomainBase();
  const host = window.location.hostname;

  if (host.endsWith(`.${subdomainBase}`)) {
    return window.location.origin;
  }
  return null;
}

/**
 * Validate that a return URL belongs to a trusted storefront domain.
 */
export function isAllowedStorefrontReturn(url: string): boolean {
  try {
    const u = new URL(url);
    const subdomainBase = getStoreSubdomainBase();
    return u.hostname.endsWith(`.${subdomainBase}`) && u.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Extract storefront return URL from an OAuth state parameter.
 * Returns [cleanState, returnOrigin | null].
 */
export function extractStorefrontReturn(state: string): [string, string | null] {
  const idx = state.indexOf(SF_RETURN_SEPARATOR);
  if (idx === -1) return [state, null];
  const cleanState = state.substring(0, idx);
  const returnOrigin = decodeURIComponent(state.substring(idx + SF_RETURN_SEPARATOR.length));
  if (!isAllowedStorefrontReturn(returnOrigin)) {
    return [cleanState, null];
  }
  return [cleanState, returnOrigin];
}

/**
 * Build the redirect_uri and state pair, handling storefront subdomains.
 *
 * When the user is on a branded storefront subdomain (e.g.
 * alice-digital-shop.mobaza.org), redirect_uri always points to the main
 * SaaS domain (registered in Casdoor) and the storefront origin is
 * appended to state so the callback can bounce the token back.
 */
function buildOAuthCallbackParams(
  appName: string,
  redirectPath: string,
  explicitRedirectUri?: string
): { callbackUrl: string; state: string } {
  let state = `${appName}_${generateState()}`;

  if (explicitRedirectUri) {
    return { callbackUrl: explicitRedirectUri, state };
  }

  const sfReturnOrigin = getStorefrontReturnOrigin();
  if (sfReturnOrigin) {
    const mainOrigin = getSaaSMainOrigin();
    if (mainOrigin) {
      state += `${SF_RETURN_SEPARATOR}${encodeURIComponent(sfReturnOrigin)}`;
      return { callbackUrl: `${mainOrigin}${redirectPath}`, state };
    }
  }

  const callbackUrl =
    typeof window !== 'undefined' ? `${window.location.origin}${redirectPath}` : redirectPath;
  return { callbackUrl, state };
}

/**
 * 获取 Casdoor 登录页面 URL（OAuth2 授权码流程）
 */
export function getSigninUrl(redirectUri?: string): string {
  const env = getEnvConfig();
  const { serverUrl, clientId, appName, redirectPath } = env.casdoor;

  const { callbackUrl, state } = buildOAuthCallbackParams(appName, redirectPath, redirectUri);

  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.setItem('casdoor_state', state);
  }

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: callbackUrl,
    scope: 'openid profile email',
    state,
  });

  // 添加主题参数，让 Casdoor 页面与当前主题保持一致
  if (typeof window !== 'undefined') {
    const themeParams = getCasdoorThemeParams();
    params.set('theme', themeParams.theme);
    params.set('colorPrimary', themeParams.colorPrimary);
    params.set('borderRadius', String(themeParams.borderRadius));
  }

  return `${serverUrl}/login/oauth/authorize?${params.toString()}`;
}

/**
 * 获取 Casdoor 注册页面 URL
 */
export function getSignupUrl(redirectUri?: string): string {
  const env = getEnvConfig();
  const { serverUrl, clientId, appName, redirectPath } = env.casdoor;

  const { callbackUrl, state } = buildOAuthCallbackParams(appName, redirectPath, redirectUri);

  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.setItem('casdoor_state', state);
  }

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: callbackUrl,
    scope: 'openid profile email',
    state,
  });

  // 添加主题参数，让 Casdoor 页面与当前主题保持一致
  if (typeof window !== 'undefined') {
    const themeParams = getCasdoorThemeParams();
    params.set('theme', themeParams.theme);
    params.set('colorPrimary', themeParams.colorPrimary);
    params.set('borderRadius', String(themeParams.borderRadius));
  }

  return `${serverUrl}/signup/oauth/authorize?${params.toString()}`;
}

/**
 * 发起 OAuth2 登录（跳转到 Casdoor）
 *
 * Embedded apps (TMA / Discord / Farcaster) use platform-native auth
 * (`initData` / access_token) and must never be redirected to Casdoor.
 * The guard lives here (not only at call sites) as defense-in-depth.
 */
export function startCasdoorLogin(): void {
  if (typeof window === 'undefined') {
    console.error('startCasdoorLogin can only be called in browser');
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const win = window as any;
  if (
    win.Telegram?.WebApp ||
    win.Telegram ||
    win.__DISCORD_EMBEDDED__ ||
    win.__FARCASTER_FRAME__ ||
    win.__EMBEDDED_APP__
  ) {
    console.warn('[startCasdoorLogin] BLOCKED: embedded app detected — use platform-native auth');
    return;
  }

  if (!sessionStorage.getItem('login_redirect')) {
    const currentPath = window.location.pathname + window.location.search;
    const cleanPath = currentPath.replace(/[?&](code|state)=[^&]*/g, '').replace(/\?$/, '');
    sessionStorage.setItem('login_redirect', cleanPath || '/');
  }

  window.location.href = getSigninUrl();
}

/**
 * 检查 URL 是否有 OAuth 回调参数
 */
export function hasOAuthCallback(): boolean {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  return params.has('code') && params.has('state');
}

/**
 * 获取 OAuth 回调参数
 */
export function getOAuthParams(): { code: string | null; state: string | null } {
  if (typeof window === 'undefined') {
    return { code: null, state: null };
  }
  const params = new URLSearchParams(window.location.search);
  return {
    code: params.get('code'),
    state: params.get('state'),
  };
}

/**
 * 清理 URL 中的 OAuth 参数
 */
export function clearOAuthParams(): void {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  url.searchParams.delete('code');
  url.searchParams.delete('state');
  window.history.replaceState({}, '', url.toString());
}

/**
 * 获取登录后应该返回的页面路径
 */
export function getLoginRedirectPath(): string {
  if (typeof sessionStorage === 'undefined') return '/';
  const path = sessionStorage.getItem('login_redirect');
  sessionStorage.removeItem('login_redirect');
  return path || '/';
}

/**
 * 设置登录后应该返回的页面路径
 * 用于在重定向到登录页之前保存原始路径
 *
 * @param path 要保存的路径
 */
export function setLoginRedirectPath(path: string): void {
  if (typeof sessionStorage === 'undefined') return;

  // 确保是有效的相对路径
  if (path && path.startsWith('/') && !path.startsWith('//')) {
    // 排除登录页和 OAuth 回调参数
    const cleanPath = path.replace(/[?&](code|state)=[^&]*/g, '').replace(/\?$/, '');
    sessionStorage.setItem('login_redirect', cleanPath || '/');
  }
}

/**
 * 处理 OAuth2 回调，交换 code 获取 token
 * 调用后端 /api/signin 接口（不需要 /v1 前缀）
 */
export async function handleOAuthCallback(code: string, state: string): Promise<LoginResult> {
  const baseUrl = getHostingUrl();

  const [cleanState] = extractStorefrontReturn(state);

  try {
    if (typeof sessionStorage !== 'undefined') {
      const savedState = sessionStorage.getItem('casdoor_state');
      if (savedState) {
        const [savedClean] = extractStorefrontReturn(savedState);
        if (savedClean !== cleanState) {
          console.warn('OAuth state mismatch, possible CSRF attack');
        }
      }
      sessionStorage.removeItem('casdoor_state');
    }

    const url = `${baseUrl}${HOSTING_API.AUTH_SIGNIN}?code=${encodeURIComponent(code)}&state=${encodeURIComponent(cleanState)}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OAuth token exchange failed:', errorText);
      return {
        success: false,
        error: `Login failed: ${errorText}`,
      };
    }

    const data = await response.json();

    if (data.data) {
      return {
        success: true,
        token: data.data,
      };
    }

    return {
      success: false,
      error: data.msg || 'Failed to get token',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * 验证 Token 是否有效
 */
export async function validateToken(token: string): Promise<boolean> {
  const env = getEnvConfig();
  const { serverUrl } = env.casdoor;

  try {
    const response = await fetch(`${serverUrl}/api/userinfo`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * 获取用户信息
 */
export async function getUserInfo(token: string): Promise<CasdoorUser | null> {
  const env = getEnvConfig();
  const { serverUrl } = env.casdoor;

  try {
    const response = await fetch(`${serverUrl}/api/userinfo`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return {
      id: data.sub || data.id,
      name: data.name || data.preferred_username,
      displayName: data.displayName || data.name,
      avatar: data.avatar || data.picture,
      email: data.email,
      phone: data.phone,
    };
  } catch {
    return null;
  }
}

/**
 * 解析 JWT Token（不验证签名，仅解码）
 */
export function parseJwtToken(token: string): CasdoorClaims | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const payload = parts[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded) as CasdoorClaims;
  } catch {
    return null;
  }
}

/**
 * 检查 Token 是否过期
 * Basic Auth tokens (basic:...) 没有过期概念，始终返回 false
 */
export function isTokenExpired(token: string): boolean {
  if (token.startsWith('basic:')) {
    return false;
  }

  const claims = parseJwtToken(token);
  if (!claims) {
    return true;
  }

  const now = Math.floor(Date.now() / 1000);
  return claims.exp < now;
}

/**
 * 获取存储的用户 ID（Telegram 或其他平台）
 * 返回格式: telegram_123456
 */
export function getStoredUserId(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    // 从多个可能的存储位置查找
    const userInfoStr =
      localStorage.getItem('userInfo') ||
      sessionStorage.getItem('userInfo') ||
      localStorage.getItem('mobazha_auth_user');

    if (userInfoStr) {
      const userInfo = JSON.parse(userInfoStr);
      // 检查是否有 id 字段，格式可能是 telegram_xxx 或其他
      if (userInfo.id) {
        return userInfo.id;
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * 获取 Telegram User ID
 * 返回格式: telegram_123456，如果不是 Telegram 用户则返回 null
 */
export function getTelegramUserId(): string | null {
  const userId = getStoredUserId();
  if (userId && userId.startsWith('telegram_')) {
    return userId;
  }
  return null;
}

/**
 * 检查当前用户是否通过 Telegram 登录
 */
export function isTelegramUser(): boolean {
  return getTelegramUserId() !== null;
}

/**
 * 获取存储的 Casdoor User ID
 * 返回格式: telegram_123456, discord_789012, google_xxx 等
 * 这是后端 API（如产品组）所需的用户标识
 */
export function getCasdoorUserId(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const userInfoStr =
      localStorage.getItem('mobazha_auth_user') || localStorage.getItem('userInfo');

    if (userInfoStr) {
      const userInfo = JSON.parse(userInfoStr);
      // 优先返回 casdoorId
      if (userInfo.casdoorId) {
        return userInfo.casdoorId;
      }
      // 兼容：如果 id 不是 peerID 格式（不以 Qm 或 12D3 开头），可能是 userID
      if (userInfo.id && !userInfo.id.startsWith('Qm') && !userInfo.id.startsWith('12D3')) {
        return userInfo.id;
      }
    }
    return null;
  } catch {
    return null;
  }
}
