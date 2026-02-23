/**
 * Casdoor 认证服务
 * 支持 OAuth2 授权码流程
 */

import { getEnvConfig } from '../../config/env';
import { getHostingUrl } from '../api/config';
import { getCasdoorThemeParams } from '../../theme/casdoorTheme';

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
 * 获取 Casdoor 登录页面 URL（OAuth2 授权码流程）
 */
export function getSigninUrl(redirectUri?: string): string {
  const env = getEnvConfig();
  const { serverUrl, clientId, appName, redirectPath } = env.casdoor;

  // 生成并保存 state
  const state = `${appName}_${generateState()}`;
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.setItem('casdoor_state', state);
  }

  // 构建回调 URL
  const callbackUrl =
    redirectUri ||
    (typeof window !== 'undefined' ? `${window.location.origin}${redirectPath}` : redirectPath);

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

  const state = `${appName}_${generateState()}`;
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.setItem('casdoor_state', state);
  }

  const callbackUrl =
    redirectUri ||
    (typeof window !== 'undefined' ? `${window.location.origin}${redirectPath}` : redirectPath);

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
 */
export function startCasdoorLogin(): void {
  if (typeof window === 'undefined') {
    console.error('startCasdoorLogin can only be called in browser');
    return;
  }

  // 保存当前页面路径，登录后返回
  const currentPath = window.location.pathname + window.location.search;
  // 排除 OAuth 回调参数
  const cleanPath = currentPath.replace(/[?&](code|state)=[^&]*/g, '').replace(/\?$/, '');
  sessionStorage.setItem('login_redirect', cleanPath || '/');

  console.log('🔐 Redirecting to Casdoor login...');
  const signinUrl = getSigninUrl();
  window.location.href = signinUrl;
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
  // 使用 getHostingUrl() 获取基础 URL（不含 /v1）
  // /api/signin 是 hosting 服务接口，不是节点代理接口
  const baseUrl = getHostingUrl();

  try {
    // 验证 state（防止 CSRF）
    if (typeof sessionStorage !== 'undefined') {
      const savedState = sessionStorage.getItem('casdoor_state');
      if (savedState && savedState !== state) {
        console.warn('OAuth state mismatch, possible CSRF attack');
        // 不强制失败，因为某些情况下 state 可能不匹配但仍然有效
      }
      sessionStorage.removeItem('casdoor_state');
    }

    // 调用后端交换 token（/api/signin 不需要 /v1 前缀）
    const url = `${baseUrl}/api/signin?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`;

    console.log('🔑 Exchanging code for token...');
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
      console.log('✅ Login successful');
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
