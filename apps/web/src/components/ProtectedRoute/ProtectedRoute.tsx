'use client';

import React, { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthGuard, useI18n } from '@mobazha/core';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** 自定义未认证时的重定向路径 */
  redirectTo?: string;
  /** 自定义加载状态 */
  fallback?: React.ReactNode;
}

/**
 * 路由保护组件（用于 Vite/React Router）
 *
 * 保护需要登录才能访问的页面。
 * 未登录用户将被重定向到登录页面，并保存原始路径用于登录后返回。
 *
 * @example
 * ```tsx
 * // 在 routes.tsx 中使用
 * {
 *   path: '/wallet',
 *   element: (
 *     <ProtectedRoute>
 *       <WalletPage />
 *     </ProtectedRoute>
 *   ),
 * }
 * ```
 */
export function ProtectedRoute({ children, redirectTo = '/login', fallback }: ProtectedRouteProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { shouldRedirect, isSessionRestored, isLoading } = useAuthGuard(location.pathname);
  const { t } = useI18n();
  const hasRedirected = useRef(false);

  useEffect(() => {
    // 等待会话恢复完成
    if (!isSessionRestored) return;

    if (shouldRedirect && !hasRedirected.current) {
      hasRedirected.current = true;
      // 使用 state 传递原始路径，登录后可以重定向回来
      navigate(redirectTo, {
        replace: true,
        state: { from: location.pathname },
      });
    }
  }, [isSessionRestored, shouldRedirect, navigate, location.pathname, redirectTo]);

  // 重置重定向标志（当路径变化时）
  useEffect(() => {
    hasRedirected.current = false;
  }, [location.pathname]);

  // 会话恢复中或需要重定向时显示加载状态
  if (!isSessionRestored || shouldRedirect) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">
            {isLoading ? t('common.loading') : t('common.redirecting')}
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export default ProtectedRoute;
