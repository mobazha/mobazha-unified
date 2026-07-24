'use client';

import { useEffect, useState, useRef, useCallback, type ReactNode } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import {
  useUserStore,
  useCartStore,
  useMatrixInit,
  isStandalone,
  usePlatformFeatureFlagsHydration,
} from '@mobazha/core';
import {
  hasOAuthCallback,
  getOAuthParams,
  clearOAuthParams,
  getLoginRedirectPath,
  attemptSilentAuth,
  completeTelegramBind,
  parseBindSessionFromStartParam,
  parseStartParam,
  resolveTelegramStartParam,
  storeContextService,
  storefrontContextService,
  standaloneStoresApi,
  resolveStoreShortCode,
  buildStorefrontAuthRedirect,
  extractStorefrontReturn,
  buildTelegramMiniAppStoreContextFromWindow,
  routedStoreContextService,
} from '@mobazha/core';
import { useTGMiniApp } from '@/components/TGMiniAppProvider';
import { useDiscordActivity } from '@/components/DiscordActivityProvider';

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
    needsOnboarding,
  } = useUserStore();
  const [isInitialized, setIsInitialized] = useState(false);
  const [isProcessingOAuth, setIsProcessingOAuth] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState<string | null>(null);
  const tg = useTGMiniApp();
  const discord = useDiscordActivity();
  const telegramStartParam = resolveTelegramStartParam(
    tg.initDataUnsafe?.start_param,
    searchParams.get('tgWebAppStartParam')
  );

  // Cross-domain token: detect _auth_token in hash before initializing refs.
  const hasHashToken =
    typeof window !== 'undefined' && window.location.hash.includes('_auth_token=');

  // Initialize as `true` when a hash token is present so the session-restore
  // effect is blocked from the very first render (prevents race condition).
  const hasRestoredSession = useRef(hasHashToken);
  const hashTokenHandled = useRef(false);

  // Synchronous guard for OAuth processing — survives React Strict Mode
  // double-invocation where useState updates are deferred.
  const oauthProcessingRef = useRef(false);

  // 登出时重置 hasRestoredSession，确保重新登录时能正确恢复会话。
  // 但不在 hash token 待处理期间重置，防止 restoreSession 竞态。
  useEffect(() => {
    if (!isAuthenticated && !hasHashToken) {
      hasRestoredSession.current = false;
    }
  }, [isAuthenticated, hasHashToken]);

  // 初始化 Matrix（在用户登录后自动连接；Sovereign 模式下完全禁用）
  useMatrixInit({
    enabled: !__SOVEREIGN__,
    autoConnect: !__SOVEREIGN__,
  });

  // SaaS: hydrate platform feature flags for all routes (not only /admin).
  usePlatformFeatureFlagsHydration(isInitialized);

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
    !!telegramStartParam ||
    (typeof window !== 'undefined' &&
      !!(window as unknown as Record<string, unknown>).__EMBEDDED_APP__);
  const isDiscordActivity = discord.isAvailable;
  const isMiniApp = isTGMiniApp || isDiscordActivity;

  // Mini App authentication flow
  const handleMiniAppAuth = useCallback(async () => {
    if (!isMiniApp) return false;

    // Detect standalone store + storefront context from a Telegram deep link.
    // Deep link formats handled (MS-Phase-2b · MS2b.1):
    //   store_<peerID>                          (legacy, still supported)
    //   sf_<slug>                               (storefront-only on the default node)
    //   store_<peerID>__sf_<slug>               (compound — standalone + storefront)
    // Both writes are additive: setStoreContext/setStorefrontSlug each persist
    // into localStorage, and getHeadersWithContext() reads them dynamically so
    // X-Store-PeerID / X-Storefront-Slug are emitted on every subsequent request.
    let hasDeepLinkStore = false;
    let hasRoutedStore = false;
    if (isTGMiniApp && telegramStartParam) {
      const parsed = parseStartParam(telegramStartParam);
      if (parsed.storeRouteToken) {
        hasRoutedStore = routedStoreContextService.setStoreRouteToken(parsed.storeRouteToken);
        if (hasRoutedStore) {
          storeContextService.clearStoreContext();
          storefrontContextService.clearStorefrontSlug();
          hasDeepLinkStore = true;
        }
      } else if (__SOVEREIGN__) {
        routedStoreContextService.clearStoreRoute();
      }
      if (parsed.storePeerID) {
        storeContextService.setStoreContext(parsed.storePeerID);
        hasDeepLinkStore = true;
      }
      if (parsed.storefrontSlug) {
        storefrontContextService.setStorefrontSlug(parsed.storefrontSlug);
      }
    }

    // The routed-store TMA is explicitly anonymous. Do not send Telegram initData
    // to Hosting auth or persist a SaaS/standalone buyer identity.
    if (hasRoutedStore) {
      enterAnonymousMode('telegram');
      return true;
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

    const telegramStoreContext = isTGMiniApp
      ? buildTelegramMiniAppStoreContextFromWindow()
      : undefined;

    // Check for binding deep link return (TG only)
    if (isTGMiniApp && telegramStartParam) {
      const bindSessionId = parseBindSessionFromStartParam(telegramStartParam);
      if (bindSessionId && tg.initData) {
        setLoadingMessage('Linking account…');
        try {
          const token = await completeTelegramBind(
            tg.initData,
            bindSessionId,
            telegramStoreContext
          );
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
      const token = await attemptSilentAuth(
        platform as 'telegram' | 'discord',
        credential,
        telegramStoreContext
      );

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
    telegramStartParam,
    tg.initData,
    discord.accessToken,
    loginMiniApp,
    enterAnonymousMode,
  ]);

  // Cross-domain token handler: process _auth_token from URL hash.
  // Wrapped in async IIFE to satisfy react-hooks/set-state-in-effect.
  useEffect(() => {
    if (hashTokenHandled.current || !hasHashToken) return;
    hashTokenHandled.current = true;

    (async () => {
      const params = new URLSearchParams(window.location.hash.replace('#', ''));
      const token = params.get('_auth_token');
      if (!token) {
        setIsInitialized(true);
        return;
      }

      window.history.replaceState(null, '', window.location.pathname + window.location.search);

      const { loginWithToken } = useUserStore.getState();
      const success = await loginWithToken(token);
      if (success) {
        const currentState = useUserStore.getState();
        if (currentState.needsOnboarding) {
          router.push('/onboarding');
        }
      }
      setIsInitialized(true);
    })();
  }, [router, hasHashToken]);

  // 处理 OAuth 回调（在任何页面都可能发生）
  // Uses oauthProcessingRef (synchronous) to prevent React Strict Mode
  // double-invocation from consuming the authorization code twice.
  //
  // IMPORTANT: always clear isProcessingOAuth in `finally`. Without it, any
  // throw / early return / hung await leaves the full-screen "Signing in…"
  // spinner forever (no auth request visible if we fail before fetch).
  useEffect(() => {
    const OAUTH_TIMEOUT_MS = 45_000;

    const handleOAuthCallback = async () => {
      if (!hasOAuthCallback() || oauthProcessingRef.current) return;

      oauthProcessingRef.current = true;
      setIsProcessingOAuth(true);

      try {
        const { code, state } = getOAuthParams();
        clearOAuthParams();

        if (!code || !state) return;

        const [, sfReturnUrl] = extractStorefrontReturn(state);

        let timeoutId: ReturnType<typeof setTimeout> | undefined;
        const success = await Promise.race([
          loginWithOAuth(code, state),
          new Promise<boolean>((_, reject) => {
            timeoutId = setTimeout(
              () => reject(new Error('Sign-in timed out. Please try again.')),
              OAUTH_TIMEOUT_MS
            );
          }),
        ]).finally(() => {
          if (timeoutId !== undefined) clearTimeout(timeoutId);
        });

        if (success && sfReturnUrl) {
          const token = useUserStore.getState().token;
          if (token) {
            window.location.href = buildStorefrontAuthRedirect(sfReturnUrl, token);
            return;
          }
        }

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
      } catch (err) {
        console.error('[AuthProvider] OAuth callback failed:', err);
      } finally {
        oauthProcessingRef.current = false;
        setIsProcessingOAuth(false);
        setIsInitialized(true);
      }
    };

    handleOAuthCallback();
    // Intentionally omit isProcessingOAuth from deps — including it re-fires the
    // effect on the setState(true) and races with the in-flight callback.
  }, [loginWithOAuth, router, searchParams]);

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

        // Session restore must never gate initialization: a throw here (a
        // malformed stored token, a node that won't answer) would otherwise
        // leave every route stuck behind the full-screen spinner forever, with
        // no error and no recovery short of clearing storage. Failing to
        // restore just means "not signed in".
        try {
          if (isMiniApp) {
            await handleMiniAppAuth();
          } else {
            await restoreSession();
          }
        } catch (err) {
          console.error('[AuthProvider] session restore failed, continuing signed out:', err);
        } finally {
          setLoadingMessage(null);
          setIsInitialized(true);
        }
      }
    };

    initAuth();
  }, [restoreSession, isProcessingOAuth, isMiniApp, handleMiniAppAuth, discordPending]);

  useEffect(() => {
    if (!isInitialized || isProcessingOAuth) return;

    // Standalone / Sovereign: admin setup lives inside /admin (StandaloneSetupWizard).
    // Never redirect to /onboarding — that route only exists for SaaS Casdoor flows.
    const standaloneOrSovereign =
      typeof __SOVEREIGN__ !== 'undefined' && __SOVEREIGN__ ? true : isStandalone();

    // 如果已认证且在登录页（且没有 OAuth 参数），重定向到目标页面
    if (isAuthenticated && pathname === '/login' && !hasOAuthCallback()) {
      if (needsOnboarding && !standaloneOrSovereign) {
        router.push('/onboarding');
      } else {
        const redirectPath = getRedirectPath(searchParams);
        router.push(redirectPath);
      }
    }

    // 如果已认证、需要 onboarding 且不在 onboarding 页面，重定向（仅 SaaS 模式）
    if (
      isAuthenticated &&
      needsOnboarding &&
      !standaloneOrSovereign &&
      pathname !== '/onboarding' &&
      pathname !== '/login'
    ) {
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

    if (isTGMiniApp && telegramStartParam?.startsWith('s_')) {
      shortCode = telegramStartParam.slice(2);
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
  }, [isInitialized, isTGMiniApp, telegramStartParam, searchParams, router]);

  if (!isInitialized || isProcessingOAuth) {
    const message = loadingMessage || (isProcessingOAuth ? 'Signing in…' : undefined);
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto mb-4" />
          {message && <p className="text-muted-foreground">{message}</p>}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export default AuthProvider;
