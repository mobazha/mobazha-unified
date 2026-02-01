'use client';

/**
 * 认证守卫 Hook
 *
 * 用于检查当前路由是否需要认证，以及用户是否已登录
 * 可用于 Next.js middleware 和 Vite ProtectedRoute 组件
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
  /** 是否应该重定向到登录页 */
  shouldRedirect: boolean;
  /** 是否正在加载中 */
  isLoading: boolean;
}

/**
 * 认证守卫 Hook
 *
 * @param pathname 当前路径（从路由获取）
 * @returns 认证守卫状态
 *
 * @example
 * ```tsx
 * // Next.js
 * import { usePathname } from 'next/navigation';
 * const pathname = usePathname();
 * const { shouldRedirect } = useAuthGuard(pathname);
 *
 * // Vite/React Router
 * import { useLocation } from 'react-router-dom';
 * const { pathname } = useLocation();
 * const { shouldRedirect } = useAuthGuard(pathname);
 * ```
 */
export function useAuthGuard(pathname: string): AuthGuardResult {
  const { isAuthenticated, isSessionRestored, isLoading } = useUserStore();

  const result = useMemo(() => {
    const requiresAuth = !isPublicRoute(pathname);

    // 只有在以下条件都满足时才需要重定向：
    // 1. 会话已恢复（避免在初始化阶段就重定向）
    // 2. 用户未认证
    // 3. 当前路由需要认证
    const shouldRedirect = isSessionRestored && !isAuthenticated && requiresAuth;

    return {
      isAuthenticated,
      isSessionRestored,
      requiresAuth,
      shouldRedirect,
      isLoading,
    };
  }, [pathname, isAuthenticated, isSessionRestored, isLoading]);

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
