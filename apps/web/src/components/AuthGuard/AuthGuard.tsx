'use client';

import React, { useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useUserStore, useI18n } from '@mobazha/core';

interface AuthGuardProps {
  children: React.ReactNode;
  /** 自定义未认证时的重定向路径 */
  redirectTo?: string;
  /** 自定义加载状态 */
  fallback?: React.ReactNode;
}

/**
 * 认证守卫组件
 * 保护需要登录才能访问的页面
 * 未登录用户将被重定向到登录页面
 */
export function AuthGuard({ children, redirectTo = '/login', fallback }: AuthGuardProps) {
  const { isAuthenticated, isLoading } = useUserStore();
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useI18n();
  const hasRedirected = useRef(false);

  useEffect(() => {
    // 等待认证状态加载完成
    if (isLoading) return;

    if (!isAuthenticated && !hasRedirected.current) {
      hasRedirected.current = true;
      const fullPath = window.location.pathname + window.location.search;
      const redirectUrl = `${redirectTo}?redirect=${encodeURIComponent(fullPath)}`;
      router.replace(redirectUrl);
    }
  }, [isLoading, isAuthenticated, router, pathname, redirectTo]);

  // 加载中或未认证状态
  if (isLoading || !isAuthenticated) {
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

export default AuthGuard;
