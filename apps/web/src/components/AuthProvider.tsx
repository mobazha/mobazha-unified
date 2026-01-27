'use client';

import { useEffect, useState, useRef, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
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
  const { isAuthenticated, restoreSession, loginWithOAuth, isLoading } = useUserStore();
  const [isInitialized, setIsInitialized] = useState(false);
  const [isProcessingOAuth, setIsProcessingOAuth] = useState(false);

  // HMR 保护：使用 ref 避免热更新导致的重复执行
  const hasRestoredSession = useRef(false);

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
            // 获取登录前的页面路径
            const redirectPath = getLoginRedirectPath();
            router.push(redirectPath);
          }
        }
        setIsProcessingOAuth(false);
        setIsInitialized(true);
      }
    };

    handleOAuthCallback();
  }, [loginWithOAuth, router, isProcessingOAuth]);

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

    // 如果已认证且在登录页（且没有 OAuth 参数），重定向到首页
    if (isAuthenticated && pathname === '/login' && !hasOAuthCallback()) {
      router.push('/');
    }
  }, [isAuthenticated, isInitialized, pathname, router, isProcessingOAuth]);

  // 正在处理 OAuth 回调
  if (isProcessingOAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent mx-auto mb-4" />
          <p className="text-white">正在登录...</p>
        </div>
      </div>
    );
  }

  // 初始化中显示加载状态
  if (!isInitialized && isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent mx-auto mb-4" />
          <p className="text-slate-400">加载中...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export default AuthProvider;
