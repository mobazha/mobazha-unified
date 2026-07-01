'use client';

import React, { useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useUserStore, useI18n, isMockMode, isStandalone } from '@mobazha/core';

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
 *
 * Standalone 模式下（非 /admin 路径），触发 Casdoor Popup 而非跳转到 /login，
 * 让买家不离开当前页面即可完成登录。Popup 被阻止时 fallback 到 /login。
 *
 * Mock 模式（NEXT_PUBLIC_USE_MOCK_DATA=true）下跳过认证，
 * 允许在无后端的情况下开发和视觉验证 admin 页面。
 */
export function AuthGuard({ children, redirectTo = '/login', fallback }: AuthGuardProps) {
  const { isAuthenticated, isLoading } = useUserStore();
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useI18n();
  const hasRedirected = useRef(false);
  const popupTriggeredRef = useRef(false);
  const mockMode = isMockMode();

  useEffect(() => {
    if (mockMode) return;
    if (isLoading) return;

    if (!isAuthenticated && !hasRedirected.current) {
      if (isStandalone() && !pathname.startsWith('/admin')) {
        if (popupTriggeredRef.current) return;
        popupTriggeredRef.current = true;
        const { loginStandalone } = useUserStore.getState();
        loginStandalone().catch(() => {
          const fullPath = window.location.pathname + window.location.search;
          router.replace(`/login?redirect=${encodeURIComponent(fullPath)}`);
        });
        return;
      }

      hasRedirected.current = true;
      const fullPath = window.location.pathname + window.location.search;
      const redirectUrl = `${redirectTo}?redirect=${encodeURIComponent(fullPath)}`;
      router.replace(redirectUrl);
    }
  }, [isLoading, isAuthenticated, router, pathname, redirectTo, mockMode]);

  if (mockMode) {
    return <>{children}</>;
  }

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
