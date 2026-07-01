'use client';

/**
 * 认证守卫 Hook
 *
 * Mini App-aware: in TG/Discord environments, protected routes trigger
 * a registration prompt instead of redirecting to /login.
 */

import { useMemo } from 'react';
import { useUserStore } from '../stores';
import { isPublicRoute } from '../config';

export interface AuthGuardResult {
  /** 用户是否已认证 */
  isAuthenticated: boolean;
  /** 会话是否已恢复（用于避免闪烁） */
  isSessionRestored: boolean;
  /** 当前路由是否需要认证 */
  requiresAuth: boolean;
  /** 是否应该重定向到登录页（仅 web 环境） */
  shouldRedirect: boolean;
  /** Mini App 中需要注册才能继续（替代 redirect） */
  shouldPromptRegister: boolean;
  /** 是否正在加载中 */
  isLoading: boolean;
}

/**
 * 认证守卫 Hook
 *
 * @param pathname 当前路径（从路由获取）
 * @returns 认证守卫状态
 */
export function useAuthGuard(pathname: string): AuthGuardResult {
  const { isAuthenticated, isSessionRestored, isLoading, isAnonymousMiniAppUser } = useUserStore();

  const result = useMemo(() => {
    const requiresAuth = !isPublicRoute(pathname);

    const needsAuth = isSessionRestored && !isAuthenticated && requiresAuth;

    // In Mini App anonymous mode: prompt registration instead of redirect
    const shouldPromptRegister = needsAuth && isAnonymousMiniAppUser;
    const shouldRedirect = needsAuth && !isAnonymousMiniAppUser;

    return {
      isAuthenticated,
      isSessionRestored,
      requiresAuth,
      shouldRedirect,
      shouldPromptRegister,
      isLoading,
    };
  }, [pathname, isAuthenticated, isSessionRestored, isLoading, isAnonymousMiniAppUser]);

  return result;
}

/**
 * 检查路径是否需要认证（纯函数版本，用于 middleware）
 *
 * @param pathname 路径
 * @returns true 表示需要认证
 */
export function requiresAuthentication(pathname: string): boolean {
  return !isPublicRoute(pathname);
}
