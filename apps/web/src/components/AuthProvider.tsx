'use client';

import { useEffect, useState, useRef, useCallback, type ReactNode } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useUserStore, useCartStore, useMatrixInit } from '@mobazha/core';
import {
  hasOAuthCallback,
  getOAuthParams,
  clearOAuthParams,
  getLoginRedirectPath,
  attemptSilentAuth,
  completeTelegramBind,
  parseBindSessionFromStartParam,
  storeContextService,
  standaloneStoresApi,
  resolveStoreShortCode,
} from '@mobazha/core';
import { useTGMiniApp } from './TGMiniAppProvider/TGMiniAppProvider';
import { useDiscordActivity } from './DiscordActivityProvider/DiscordActivityProvider';

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
  const {
    isAuthenticated,
    restoreSession,
    loginWithOAuth,
    loginMiniApp,
    enterAnonymousMode,
    isLoading,
    needsOnboarding,
  } = useUserStore();
  const [isInitialized, setIsInitialized] = useState(false);
  const [isProcessingOAuth, setIsProcessingOAuth] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState<string | null>(null);
  const tg = useTGMiniApp();
  const discord = useDiscordActivity();

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

  // Sync local cart to backend when user logs in (anonymous → authenticated).
  // Uses undefined sentinel to skip the initial auth transition (session restore).
  const prevAuthRef = useRef<boolean | undefined>(undefined);
  useEffect(() => {
    if (!isInitialized) return;
    if (prevAuthRef.current !== undefined && isAuthenticated && !prevAuthRef.current) {
      useCartStore.getState().syncAllItems();
    }
    prevAuthRef.current = isAuthenticated;
  }, [isAuthenticated, isInitialized]);

  // Detect Mini App platform (non-reactive, determined at mount).
  // __EMBEDDED_APP__ is set synchronously in index.html when window.Telegram
  // exists, providing a reliable fallback even if the TG SDK hasn't fully
  // initialized by the time this component mounts.
  const isTGMiniApp =
    tg.isAvailable ||
    (typeof window !== 'undefined' &&
      !!(window as unknown as Record<string, unknown>).__EMBEDDED_APP__);
  const isDiscordActivity = discord.isAvailable;
  const isMiniApp = isTGMiniApp || isDiscordActivity;

  // Mini App authentication flow
  const handleMiniAppAuth = useCallback(async () => {
    if (!isMiniApp) return false;

    // Detect standalone store context from deep link (e.g. startapp=store_QmPeerID).
    // setStoreContext persists to localStorage; getHeadersWithContext() reads it dynamically.
    let hasDeepLinkStore = false;
    if (isTGMiniApp && tg.initDataUnsafe?.start_param) {
      const storePeerID = storeContextService.parseStoreFromStartParam(
        tg.initDataUnsafe.start_param
      );
      if (storePeerID) {
        storeContextService.setStoreContext(storePeerID);
        hasDeepLinkStore = true;
      }
    }

    // No deep link but stale localStorage context — validate asynchronously.
    // We intentionally don't await: auth flow should not be blocked by
    // store validation. If the stored peerID turns out stale, subsequent
    // proxy requests will get a 404 and the context will be cleared then.
    if (!hasDeepLinkStore && storeContextService.getStorePeerID()) {
      void storeContextService.validateStoreContext(() =>
        standaloneStoresApi.getMyStandaloneStore()
      );
    }

    const platform = isTGMiniApp ? 'telegram' : 'discord';
    let credential: string | null = null;
    if (isTGMiniApp) {
      credential = tg.initData;
      // Fallback: TGMiniAppProvider context may not have initialized yet
      // (SDK loaded via document.write but useState ran before context propagated).
      // Read directly from the global if the context value is empty.
      if (!credential) {
        const wa = (window as unknown as { Telegram?: { WebApp?: { initData?: string } } }).Telegram
          ?.WebApp;
        credential = wa?.initData || null;
      }
    } else {
      // SDK flow stores token in context + sessionStorage; URL fallback for legacy
      credential =
        discord.accessToken ??
        sessionStorage.getItem('discord_access_token') ??
        new URLSearchParams(window.location.search).get('access_token');
    }

    if (!credential) {
      enterAnonymousMode(platform as 'telegram' | 'discord');
      return true;
    }

    // Check for binding deep link return (TG only)
    if (isTGMiniApp && tg.initDataUnsafe?.start_param) {
      const bindSessionId = parseBindSessionFromStartParam(tg.initDataUnsafe.start_param);
      if (bindSessionId && tg.initData) {
        setLoadingMessage('Linking account…');
        try {
          const token = await completeTelegramBind(tg.initData, bindSessionId);
          if (token) {
            await loginMiniApp(token, 'telegram');
            return true;
          }
        } catch {
          // Binding failed, fall through to normal auth
        }
      }
    }

    // Attempt silent sign-in
    setLoadingMessage(isTGMiniApp ? 'Connecting…' : 'Signing in…');
    try {
      const token = await attemptSilentAuth(platform as 'telegram' | 'discord', credential);

      if (token) {
        await loginMiniApp(token, platform as 'telegram' | 'discord');
        return true;
      }

      // User doesn't have an account — enter anonymous mode
      enterAnonymousMode(platform as 'telegram' | 'discord');
      return true;
    } catch {
      enterAnonymousMode(platform as 'telegram' | 'discord');
      return true;
    }
  }, [
    isMiniApp,
    isTGMiniApp,
    tg.initData,
    tg.initDataUnsafe,
    discord.accessToken,
    loginMiniApp,
    enterAnonymousMode,
  ]);

  // 处理 OAuth 回调（在任何页面都可能发生）
  useEffect(() => {
    const handleOAuthCallback = async () => {
      if (hasOAuthCallback() && !isProcessingOAuth) {
        setIsProcessingOAuth(true);
        const { code, state } = getOAuthParams();

        if (code && state) {
          const success = await loginWithOAuth(code, state);
          clearOAuthParams();

          if (success) {
            hasRestoredSession.current = true;

            const currentState = useUserStore.getState();
            if (currentState.needsOnboarding) {
              router.push('/onboarding');
            } else {
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

  // Delay auth initialization until Discord SDK is ready (avoids premature anonymous mode)
  const discordPending = isDiscordActivity && !discord.isReady;

  // 恢复会话（仅在没有 OAuth 回调时）
  useEffect(() => {
    if (discordPending) return;

    const initAuth = async () => {
      if (hasRestoredSession.current) {
        setIsInitialized(true);
        return;
      }

      if (!hasOAuthCallback() && !isProcessingOAuth) {
        hasRestoredSession.current = true;

        if (isMiniApp) {
          await handleMiniAppAuth();
        } else {
          await restoreSession();
        }
        setLoadingMessage(null);
        setIsInitialized(true);
      }
    };

    initAuth();
  }, [restoreSession, isProcessingOAuth, isMiniApp, handleMiniAppAuth, discordPending]);

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

  // Resolve store short-code deep links:
  //   TMA platform bot: startapp=s_{shortCode}
  //   Direct/custom bot: ?s={shortCode}
  const shortCodeHandled = useRef(false);
  useEffect(() => {
    if (!isInitialized || shortCodeHandled.current) return;

    let shortCode: string | null = null;

    if (isTGMiniApp && tg.initDataUnsafe?.start_param?.startsWith('s_')) {
      shortCode = tg.initDataUnsafe.start_param.slice(2);
    }

    if (!shortCode) {
      shortCode = searchParams.get('s');
    }

    if (!shortCode?.trim()) return;

    shortCodeHandled.current = true;

    resolveStoreShortCode(shortCode).then(peerID => {
      if (peerID) {
        router.replace(`/store/${peerID}`);
      }
    });
  }, [isInitialized, isTGMiniApp, tg.initDataUnsafe, searchParams, router]);

  // 正在处理 OAuth 回调 or Mini App auth
  if (isProcessingOAuth || (!isInitialized && (isLoading || loadingMessage))) {
    const message = loadingMessage || (isProcessingOAuth ? 'Signing in…' : 'Loading…');
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">{message}</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export default AuthProvider;
