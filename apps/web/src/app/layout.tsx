import React, { Suspense } from 'react';
import type { Metadata, Viewport } from 'next';
import { headers } from 'next/headers';
import './globals.css';

// __OUTPOST__ 是 Vite (apps/web/vite.config.ts) 的编译时 define。
// Next.js 构建不替换此变量，导致裸引用在运行时抛 ReferenceError。
// 在最早期挂载到 globalThis（覆盖 SSR）— 客户端再通过 inline script 兜底（见 <head>）。
(globalThis as { __OUTPOST__?: boolean }).__OUTPOST__ = false;
import {
  AuthProvider,
  MainContent,
  MobileNav,
  NonEmbedUI,
  PWAInstall,
  QueryProvider,
  SessionExpiredDialog,
} from '@/components';
import { OuterProviders } from '@/components/OuterProviders';
import { ChatSystemLazy } from '@/components/ChatSystem';
import { StandaloneThemeWrapper } from '@/components/StandaloneThemeWrapper';
import { StorefrontProvider } from '@/components/StorefrontProvider';
import { Toaster } from '@/components/ui';
import { ProductModalProvider, PaymentSelectorProvider } from '@/hooks';
import { defaultFont, storeFontVariableClasses } from '@/lib/fonts';
import { TGBackButtonManager } from '@/components/TGMiniAppProvider';

/**
 * AuthProvider 加载状态
 * 用于 Suspense fallback，在 useSearchParams 初始化期间显示
 * 样式与 AuthProvider 内部的加载状态保持一致
 */
function AuthProviderLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto mb-4" />
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (typeof __OUTPOST__ !== 'undefined' && __OUTPOST__ ? '' : 'https://app.mobazha.org');

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Mobazha - Decentralized Marketplace',
    template: '%s | Mobazha',
  },
  description: 'Shop and grow with cryptos - A decentralized peer-to-peer marketplace',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  openGraph: {
    type: 'website',
    siteName: 'Mobazha',
    title: 'Mobazha - Decentralized Marketplace',
    description: 'Shop and grow with cryptos - A decentralized peer-to-peer marketplace',
    images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'Mobazha' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Mobazha - Decentralized Marketplace',
    description: 'Shop and grow with cryptos - A decentralized peer-to-peer marketplace',
    images: ['/og-default.png'],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Mobazha',
  },
  other: {
    'apple-mobile-web-app-capable': 'yes',
    'mobile-web-app-capable': 'yes',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
  interactiveWidget: 'resizes-content',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const hdrs = await headers();
  const storefrontPeerID = hdrs.get('x-storefront-peerid') || hdrs.get('x-store-peerid') || null;

  return (
    <html
      lang="en"
      {...(storefrontPeerID ? { 'data-storefront': storefrontPeerID } : {})}
      suppressHydrationWarning
    >
      <head>
        {/* __OUTPOST__ — Vite 编译时 define，Next.js 不替换。
            必须在所有其他 script 之前定义，避免裸引用抛 ReferenceError。
            Next.js 永远走 SaaS / Standalone，恒为 false。 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `window.__OUTPOST__=false;`,
          }}
        />
        {/* Runtime config — injected by container init at startup (standalone mode).
            Sets window.__RUNTIME_CONFIG__ with SAAS_API_URL and other env-specific values.
            Must load synchronously before React hydration so applyRuntimeConfig() picks it up.
            Uses document.write to guarantee blocking execution (same pattern as Telegram SDK below).
            In SaaS/dev the file 404s silently — onerror="" suppresses console noise. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `document.write('<scr'+'ipt src="/runtime-config.js" onerror=""><\\/scr'+'ipt>');`,
          }}
        />
        {/* Storefront peerID — synchronous global for client hooks (SSR-injected) */}
        {storefrontPeerID && (
          <script
            dangerouslySetInnerHTML={{
              __html: `window.__STOREFRONT_PEERID__="${storefrontPeerID.replace(/[^a-zA-Z0-9]/g, '')}";`,
            }}
          />
        )}
        {/* Telegram Mini App SDK — must load SYNCHRONOUSLY before React hydration.
            Inside Telegram WebView, window.Telegram is pre-injected by the native app.
            We detect its presence and use document.write to load the full SDK script
            so that window.Telegram.WebApp is ready before TGMiniAppProvider mounts. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              var _tg = window.Telegram;
              var _hash = location.hash || '';
              var _hasTgHash = _hash.indexOf('tgWebAppData') !== -1;
              if (_tg || _hasTgHash) {
                window.__EMBEDDED_APP__ = true;
                document.write('<scr' + 'ipt src="https://telegram.org/js/telegram-web-app.js"></scr' + 'ipt>');
              }
            `,
          }}
        />
        {/* 防闪烁脚本 - 在页面加载前立即应用主题 + Telegram 嵌入态 (MVP-3 M2) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var root = document.documentElement;
                  var theme = localStorage.getItem('mobazha-theme') || 'classic';
                  var mode = localStorage.getItem('mobazha-theme-mode') || 'system';
                  var resolvedMode = mode;
                  if (mode === 'system') {
                    resolvedMode = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                  }
                  root.setAttribute('data-theme', theme);
                  if (resolvedMode === 'dark') {
                    root.classList.add('dark');
                  }
                  var isTG = !!window.Telegram || (location.hash || '').indexOf('tgWebAppData') !== -1;
                  if (!isTG) return;
                  root.setAttribute('data-embedded', 'telegram');
                  var themeMatch = (location.hash || '').match(/tgWebAppThemeParams=([^&]+)/);
                  var appliedBg = null;
                  if (themeMatch) {
                    try {
                      var params = JSON.parse(decodeURIComponent(themeMatch[1]));
                      var norm = function(c) { return c && c.charAt(0) !== '#' ? '#' + c : c; };
                      appliedBg = norm(params.bg_color || params.secondary_bg_color) || null;
                      if (appliedBg) {
                        root.style.setProperty('--theme-background', appliedBg);
                        var secBg = norm(params.secondary_bg_color);
                        if (secBg) {
                          root.style.setProperty('--theme-backgroundAlt', secBg);
                          root.style.setProperty('--theme-surface', secBg);
                        }
                        var txt = norm(params.text_color);
                        if (txt) root.style.setProperty('--theme-textPrimary', txt);
                        var hint = norm(params.hint_color);
                        if (hint) root.style.setProperty('--theme-textMuted', hint);
                        root.style.backgroundColor = appliedBg;
                        var meta = document.querySelector('meta[name="theme-color"]');
                        if (meta) meta.setAttribute('content', appliedBg);
                      }
                    } catch (e) {}
                  }
                  if (!appliedBg && resolvedMode === 'dark') {
                    root.style.backgroundColor = '#17212b';
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className={`${defaultFont.className} ${storeFontVariableClasses}`}>
        <QueryProvider>
          <OuterProviders>
            <StorefrontProvider peerID={storefrontPeerID}>
              <Suspense fallback={<AuthProviderLoading />}>
                <TGBackButtonManager />
                <AuthProvider>
                  <ProductModalProvider>
                    <PaymentSelectorProvider>
                      <StandaloneThemeWrapper>
                        <MainContent>{children}</MainContent>

                        <NonEmbedUI>
                          <MobileNav />
                          <ChatSystemLazy />
                          <PWAInstall />
                          <SessionExpiredDialog />
                        </NonEmbedUI>

                        {/* Toast notifications */}
                        <Toaster />
                      </StandaloneThemeWrapper>
                    </PaymentSelectorProvider>
                  </ProductModalProvider>
                </AuthProvider>
              </Suspense>
            </StorefrontProvider>
          </OuterProviders>
        </QueryProvider>
      </body>
    </html>
  );
}
