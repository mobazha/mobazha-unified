'use client';

import { useEffect, useState, useRef, type ReactNode } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useUserStore, useMatrixInit } from '@mobazha/core';
import {
  hasOAuthCallback,
  getOAuthParams,
  clearOAuthParams,
  getLoginRedirectPath,
} from '@mobazha/core';

interface AuthProviderProps {
  children: ReactNode;
  /** 不需要认证的路由 */
  publicPaths?: string[];
}

/**
 * 获取登录后应重定向到的路径
 * 优先级：
 * 1. URL 查询参数 redirect
 * 2. sessionStorage 中的 login_redirect（用于 OAuth 流程）
 * 3. 默认返回首页
 */
function getRedirectPath(searchParams: URLSearchParams): string {
  // 1. 检查 URL 查询参数
  const redirectParam = searchParams.get('redirect');
  if (redirectParam) {
    // 确保是相对路径，防止 open redirect 攻击
    if (redirectParam.startsWith('/') && !redirectParam.startsWith('//')) {
      return redirectParam;
    }
  }

  // 2. 检查 sessionStorage（用于 OAuth 流程）
  const sessionRedirect = getLoginRedirectPath();
  if (sessionRedirect && sessionRedirect !== '/') {
    return sessionRedirect;
  }

  // 3. 默认返回首页
  return '/';
}

/**
 * 认证状态提供者
 * 自动恢复会话并处理 OAuth 回调
 * 同时初始化 Matrix 聊天连接
 */
export function AuthProvider({
  children,
  publicPaths: _publicPaths = ['/login', '/offline'],
}: AuthProviderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isAuthenticated, restoreSession, loginWithOAuth, isLoading, needsOnboarding } =
    useUserStore();
  const [isInitialized, setIsInitialized] = useState(false);
  const [isProcessingOAuth, setIsProcessingOAuth] = useState(false);

  // HMR 保护：使用 ref 避免热更新导致的重复执行
  const hasRestoredSession = useRef(false);

  // 登出时重置 hasRestoredSession，确保重新登录时能正确恢复会话
  useEffect(() => {
    if (!isAuthenticated) {
      hasRestoredSession.current = false;
    }
  }, [isAuthenticated]);

  // 初始化 Matrix（在用户登录后自动连接）
  useMatrixInit({
    enabled: true,
    autoConnect: true,
  });

  // 处理 OAuth 回调（在任何页面都可能发生）
  useEffect(() => {
    const handleOAuthCallback = async () => {
      if (hasOAuthCallback() && !isProcessingOAuth) {
        setIsProcessingOAuth(true);
        const { code, state } = getOAuthParams();

        if (code && state) {
          console.log('🔑 Processing OAuth callback in AuthProvider...');
          const success = await loginWithOAuth(code, state);

          // 清理 URL 中的 OAuth 参数
          clearOAuthParams();

          if (success) {
            // OAuth 登录成功，标记会话已恢复，防止后续不必要的 restoreSession 调用
            hasRestoredSession.current = true;

            // 检查是否需要 onboarding（无 profile）
            const currentState = useUserStore.getState();
            if (currentState.needsOnboarding) {
              router.push('/onboarding');
            } else {
              // 获取登录前的页面路径
              const redirectPath = getRedirectPath(searchParams);
              router.push(redirectPath);
            }
          }
        }
        setIsProcessingOAuth(false);
        setIsInitialized(true);
      }
    };

    handleOAuthCallback();
  }, [loginWithOAuth, router, isProcessingOAuth, searchParams]);

  // 恢复会话（仅在没有 OAuth 回调时）
  // 使用 ref 防止 HMR 导致的重复执行
  useEffect(() => {
    const initAuth = async () => {
      // HMR 保护：如果已经恢复过会话，跳过
      if (hasRestoredSession.current) {
        setIsInitialized(true);
        return;
      }

      if (!hasOAuthCallback() && !isProcessingOAuth) {
        hasRestoredSession.current = true;
        // 尝试恢复会话
        await restoreSession();
        setIsInitialized(true);
      }
    };

    initAuth();
  }, [restoreSession, isProcessingOAuth]);

  useEffect(() => {
    if (!isInitialized || isProcessingOAuth) return;

    // 如果已认证且在登录页（且没有 OAuth 参数），重定向到目标页面
    if (isAuthenticated && pathname === '/login' && !hasOAuthCallback()) {
      if (needsOnboarding) {
        router.push('/onboarding');
      } else {
        const redirectPath = getRedirectPath(searchParams);
        router.push(redirectPath);
      }
    }

    // 如果已认证、需要 onboarding 且不在 onboarding 页面，重定向
    if (isAuthenticated && needsOnboarding && pathname !== '/onboarding' && pathname !== '/login') {
      router.push('/onboarding');
    }
  }, [
    isAuthenticated,
    isInitialized,
    pathname,
    router,
    isProcessingOAuth,
    searchParams,
    needsOnboarding,
  ]);

  // 正在处理 OAuth 回调
  if (isProcessingOAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-foreground">正在登录...</p>
        </div>
      </div>
    );
  }

  // 初始化中显示加载状态
  if (!isInitialized && isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export default AuthProvider;
