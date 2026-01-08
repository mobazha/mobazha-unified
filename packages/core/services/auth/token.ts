/**
 * Token 存储和管理
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
 * 获取存储的 Token
 */
export function getStoredToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

/**
 * 保存 Token
 * @param token - JWT Token
 * @param persistent - 是否持久化存储（localStorage vs sessionStorage）
 */
export function saveToken(token: string, persistent = false): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    if (persistent) {
      localStorage.setItem(TOKEN_KEY, token);
      sessionStorage.removeItem(TOKEN_KEY);
    } else {
      sessionStorage.setItem(TOKEN_KEY, token);
      localStorage.removeItem(TOKEN_KEY);
    }
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
    sessionStorage.removeItem(TOKEN_KEY);
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
    const userStr = sessionStorage.getItem(USER_KEY) || localStorage.getItem(USER_KEY);
    if (!userStr) {
      return null;
    }
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}

/**
 * 保存用户信息
 */
export function saveUser(user: StoredUser, persistent = false): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const userStr = JSON.stringify(user);
    if (persistent) {
      localStorage.setItem(USER_KEY, userStr);
      sessionStorage.removeItem(USER_KEY);
    } else {
      sessionStorage.setItem(USER_KEY, userStr);
      localStorage.removeItem(USER_KEY);
    }
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
    sessionStorage.removeItem(USER_KEY);
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

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}
