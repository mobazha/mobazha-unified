/**
 * Token 存储和管理
 *
 * 存储策略：
 * - 统一使用 localStorage 存储，与 Zustand persist 保持一致
 * - 避免 sessionStorage 和 localStorage 状态不同步的问题
 * - 支持 "记住我" 功能（关闭浏览器后仍保持登录）
 *
 * 安全说明：
 * - localStorage 可被 JavaScript 访问，存在 XSS 风险
 * - 对于去中心化 P2P 应用，这是可接受的权衡
 * - 如需更高安全性，后续可升级为 HttpOnly Cookie 方案
 */

const TOKEN_KEY = 'mobazha_auth_token';
const USER_KEY = 'mobazha_auth_user';

export interface StoredUser {
  id: string;
  name: string;
  displayName?: string;
  avatar?: string;
  role?: string;
  /** Casdoor User ID (如 telegram_123456, discord_789012) */
  casdoorId?: string;
}

/**
 * 获取存储的 Token（同步版本）
 *
 * 统一从 localStorage 读取，与 Zustand persist 保持一致
 */
export function getStoredToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

/**
 * 保存 Token
 *
 * @param token - JWT Token
 */
export function saveToken(token: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch (error) {
    console.error('Failed to save token:', error);
  }
}

/**
 * 清除 Token
 */
export function clearToken(): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch (error) {
    console.error('Failed to clear token:', error);
  }
}

/**
 * 获取存储的用户信息
 */
export function getStoredUser(): StoredUser | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const userStr = localStorage.getItem(USER_KEY);
    if (userStr) {
      return JSON.parse(userStr);
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * 保存用户信息
 *
 * @param user - 用户信息
 */
export function saveUser(user: StoredUser): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const userStr = JSON.stringify(user);
    localStorage.setItem(USER_KEY, userStr);
  } catch (error) {
    console.error('Failed to save user:', error);
  }
}

/**
 * 清除用户信息
 */
export function clearUser(): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.removeItem(USER_KEY);
  } catch (error) {
    console.error('Failed to clear user:', error);
  }
}

/**
 * 清除所有认证信息
 */
export function clearAuth(): void {
  clearToken();
  clearUser();
}

/**
 * 检查是否已认证
 */
export function isAuthenticated(): boolean {
  const token = getStoredToken();
  return !!token;
}

/**
 * 获取认证 Headers
 */
export function getAuthHeaders(): Record<string, string> {
  const token = getStoredToken();

  if (!token) {
    return {
      'Content-Type': 'application/json',
    };
  }

  // 处理不同的 token 格式
  if (token.startsWith('basic:')) {
    // Basic Auth 格式: "basic:base64encoded"
    const base64Credentials = token.slice(6); // 移除 "basic:" 前缀
    return {
      'Content-Type': 'application/json',
      Authorization: `Basic ${base64Credentials}`,
    };
  }

  // JWT/OAuth token
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}
