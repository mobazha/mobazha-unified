'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore, getEnvConfig } from '@mobazha/core';
import {
  startCasdoorLogin,
  hasOAuthCallback,
  getOAuthParams,
  clearOAuthParams,
  getLoginRedirectPath,
  isHosted,
  isBasic,
} from '@mobazha/core';

/**
 * 登录页面
 *
 * 支持两种认证模式：
 * - hosted（托管模式）：直接跳转到 Casdoor 登录，无中间界面
 * - basic（VPS模式）：显示用户名/密码表单
 */
export default function LoginPage() {
  const router = useRouter();
  const { login, loginWithOAuth, isAuthenticated, isLoading, error } = useUserStore();

  const [isProcessing, setIsProcessing] = useState(false);
  const [localError, setLocalError] = useState('');

  // 获取配置
  const envConfig = getEnvConfig();
  const presetUsername = envConfig.auth.basic?.username;

  // Basic Auth 表单状态（使用预设用户名作为初始值）
  const [username, setUsername] = useState(() => (isBasic() ? presetUsername : '') || '');
  const [password, setPassword] = useState('');

  // 防止重复处理
  const hasProcessedOAuth = useRef(false);
  const hasRedirectedToCasdoor = useRef(false);

  // 初始化：处理各种情况
  useEffect(() => {
    // 如果已认证，重定向到首页
    if (isAuthenticated && !isProcessing) {
      router.push('/');
      return;
    }

    // 处理 OAuth 回调（托管模式）
    if (hasOAuthCallback() && !hasProcessedOAuth.current) {
      hasProcessedOAuth.current = true;

      const processOAuth = async () => {
        setIsProcessing(true);
        const { code, state } = getOAuthParams();

        if (code && state) {
          // eslint-disable-next-line no-console
          console.log('🔑 Processing OAuth callback...');
          const success = await loginWithOAuth(code, state);

          // 清理 URL 中的 OAuth 参数
          clearOAuthParams();

          if (success) {
            const redirectPath = getLoginRedirectPath();
            router.push(redirectPath);
          } else {
            setLocalError('登录失败，请重试');
            setIsProcessing(false);
          }
        } else {
          setIsProcessing(false);
        }
      };

      processOAuth();
      return;
    }

    // 托管模式：自动跳转到 Casdoor（无中间界面）
    if (isHosted() && !isAuthenticated && !isProcessing && !hasRedirectedToCasdoor.current) {
      hasRedirectedToCasdoor.current = true;
      // eslint-disable-next-line no-console
      console.log('🔐 Hosted mode: Redirecting to Casdoor...');
      startCasdoorLogin();
      return;
    }
  }, [isAuthenticated, isProcessing, router, loginWithOAuth]);

  // Basic Auth 登录处理
  const handleBasicLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');

    if (!username || !password) {
      setLocalError('请输入用户名和密码');
      return;
    }

    const success = await login({ username, password });
    if (success) {
      const redirectPath = getLoginRedirectPath();
      router.push(redirectPath);
    }
  };

  // 正在处理 OAuth 回调或跳转中
  if (isProcessing || (hasOAuthCallback() && isLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent mx-auto mb-4" />
          <p className="text-white text-lg">正在登录...</p>
          <p className="text-slate-400 text-sm mt-2">请稍候</p>
        </div>
      </div>
    );
  }

  // VPS 模式（Basic Auth）：显示登录表单
  if (isBasic()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900">
        <div className="w-full max-w-md px-8 py-10 bg-slate-800/60 backdrop-blur-lg rounded-2xl shadow-2xl border border-slate-700/50">
          {/* Logo & Title */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Mobazha</h1>
            <p className="text-slate-400">去中心化市场</p>
            <span className="inline-block mt-2 px-3 py-1 bg-emerald-500/20 text-emerald-400 text-xs rounded-full">
              VPS 模式
            </span>
          </div>

          {/* Error Message */}
          {(error || localError) && (
            <div className="mb-6 p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
              <p className="text-sm text-red-300">{error || localError}</p>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleBasicLogin} className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-slate-300 mb-1">
                用户名
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="请输入用户名"
                autoComplete="username"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-1">
                密码
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="请输入密码"
                autoComplete="current-password"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center text-lg mt-6"
            >
              {isLoading ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-5 w-5 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  登录中...
                </>
              ) : (
                <>
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                    />
                  </svg>
                  登录
                </>
              )}
            </button>
          </form>

          {/* Environment Info */}
          <div className="mt-8 text-center">
            <p className="text-xs text-slate-500">API: {envConfig.api.gateway}</p>
          </div>
        </div>
      </div>
    );
  }

  // 托管模式但没有自动跳转（可能是用户手动访问）：显示跳转按钮
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900">
      <div className="w-full max-w-md px-8 py-10 bg-slate-800/60 backdrop-blur-lg rounded-2xl shadow-2xl border border-slate-700/50">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Mobazha</h1>
          <p className="text-slate-400">去中心化市场</p>
          <span className="inline-block mt-2 px-3 py-1 bg-indigo-500/20 text-indigo-400 text-xs rounded-full">
            托管模式
          </span>
        </div>

        {/* Login Info */}
        <div className="mb-6 p-4 bg-slate-900/50 rounded-lg border border-slate-600/50">
          <p className="text-slate-300 text-sm">
            点击下方按钮将跳转到安全登录页面，完成登录后会自动返回。
          </p>
        </div>

        {/* Error Message */}
        {(error || localError) && (
          <div className="mb-6 p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
            <p className="text-sm text-red-300">{error || localError}</p>
          </div>
        )}

        {/* Login Button */}
        <button
          type="button"
          onClick={() => startCasdoorLogin()}
          disabled={isLoading}
          className="w-full py-4 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center text-lg"
        >
          {isLoading ? (
            <>
              <svg
                className="animate-spin -ml-1 mr-2 h-5 w-5 text-white"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              处理中...
            </>
          ) : (
            <>
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                />
              </svg>
              登录 / 注册
            </>
          )}
        </button>

        {/* Divider */}
        <div className="mt-8 flex items-center">
          <div className="flex-1 border-t border-slate-700"></div>
          <span className="px-4 text-slate-500 text-sm">支持平台</span>
          <div className="flex-1 border-t border-slate-700"></div>
        </div>

        {/* Platform Icons */}
        <div className="mt-4 flex justify-center space-x-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-slate-700/50 rounded-full flex items-center justify-center mx-auto mb-1">
              <span className="text-2xl">🌐</span>
            </div>
            <span className="text-xs text-slate-400">浏览器</span>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-slate-700/50 rounded-full flex items-center justify-center mx-auto mb-1">
              <span className="text-2xl">📱</span>
            </div>
            <span className="text-xs text-slate-400">Telegram</span>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-slate-700/50 rounded-full flex items-center justify-center mx-auto mb-1">
              <span className="text-2xl">🎮</span>
            </div>
            <span className="text-xs text-slate-400">Discord</span>
          </div>
        </div>

        {/* Environment Info */}
        <div className="mt-6 text-center">
          <p className="text-xs text-slate-500">
            {envConfig.isTestEnv ? '测试环境' : '生产环境'}: {envConfig.api.baseUrl}
          </p>
        </div>
      </div>
    </div>
  );
}
