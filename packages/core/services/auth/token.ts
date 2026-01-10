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
}

/**
 * 获取存储的 Token（同步版本）
 *
 * 优先从 localStorage 读取，保持与 Zustand persist 一致
 */
export function getStoredToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    // 统一从 localStorage 读取
    // 兼容：也检查 sessionStorage（用于迁移旧数据）
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      return token;
    }

    // 迁移：如果 sessionStorage 中有 token，迁移到 localStorage
    const sessionToken = sessionStorage.getItem(TOKEN_KEY);
    if (sessionToken) {
      localStorage.setItem(TOKEN_KEY, sessionToken);
      sessionStorage.removeItem(TOKEN_KEY);
      return sessionToken;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * 保存 Token
 *
 * @param token - JWT Token
 * @param _persistent - 保留参数，现在始终持久化到 localStorage
 */
export function saveToken(token: string, _persistent = true): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    // 统一保存到 localStorage
    localStorage.setItem(TOKEN_KEY, token);
    // 清理可能存在的 sessionStorage 数据
    sessionStorage.removeItem(TOKEN_KEY);
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
    // 同时清理两个存储位置
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
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
    // 优先从 localStorage 读取
    const userStr = localStorage.getItem(USER_KEY);
    if (userStr) {
      return JSON.parse(userStr);
    }

    // 迁移：如果 sessionStorage 中有数据，迁移到 localStorage
    const sessionUserStr = sessionStorage.getItem(USER_KEY);
    if (sessionUserStr) {
      localStorage.setItem(USER_KEY, sessionUserStr);
      sessionStorage.removeItem(USER_KEY);
      return JSON.parse(sessionUserStr);
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
 * @param _persistent - 保留参数，现在始终持久化到 localStorage
 */
export function saveUser(user: StoredUser, _persistent = true): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const userStr = JSON.stringify(user);
    // 统一保存到 localStorage
    localStorage.setItem(USER_KEY, userStr);
    // 清理可能存在的 sessionStorage 数据
    sessionStorage.removeItem(USER_KEY);
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
    // 同时清理两个存储位置
    localStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(USER_KEY);
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

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}
