import React, { Suspense } from 'react';
import type { Metadata, Viewport } from 'next';
import { headers } from 'next/headers';
import './globals.css';
import '@/lib/initPublicEnv';

// __SOVEREIGN__ 是 Vite (apps/web/vite.config.ts) 的编译时 define。
// Next.js 构建不替换此变量，导致裸引用在运行时抛 ReferenceError。
// 在最早期挂载到 globalThis（覆盖 SSR）— 客户端再通过 inline script 兜底（见 <head>）。
(globalThis as { __SOVEREIGN__?: boolean }).__SOVEREIGN__ = false;
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
import { MarketplaceProvider } from '@/components/MarketplaceProvider';
import { Toaster } from '@/components/ui';
import { ProductModalProvider, PaymentSelectorProvider } from '@/hooks';
import { defaultFont, storeFontVariableClasses } from '@/lib/fonts';
import { TGBackButtonManager } from '@/components/TGMiniAppProvider';
import { getRequestMarketplaceContext } from '@/lib/ssrMarketplace';
import {
  buildSelfCanonical,
  getCanonicalSiteUrl,
  getSiteUrl,
  isNamedStorefrontRequest,
  isOfficialSiteUrl,
} from '@/lib/siteUrl';
import { getRequestUrl } from '@/lib/requestUrl';

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
  (typeof __SOVEREIGN__ !== 'undefined' && __SOVEREIGN__ ? '' : 'https://app.mobazha.org');

/**
 * Structured data for the Mobazha organisation itself.
 *
 * Search engines and generative engines both use this to disambiguate the brand
 * from the many unrelated "decentralized marketplace" pages, and `sameAs` is the
 * cheapest way to connect the app to the docs site and the source repository.
 * The `@id` is stable so other nodes can reference it.
 */
function buildOrganizationJsonLd(siteUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${siteUrl}/#organization`,
    name: 'Mobazha',
    url: siteUrl,
    logo: `${siteUrl}/icons/icon-512x512.png`,
    description:
      'Mobazha is a decentralized, self-hostable peer-to-peer marketplace where sellers keep their own storefront, customer relationships and crypto payments.',
    sameAs: [
      'https://github.com/mobazha/mobazha-unified',
      'https://docs.mobazha.org',
      'https://mobazha.org',
    ],
  } as const;
}

/** `WebSite` node so engines can offer a sitelinks search box for Mobazha. */
function buildWebsiteJsonLd(siteUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${siteUrl}/#website`,
    name: 'Mobazha',
    url: siteUrl,
    publisher: { '@id': `${siteUrl}/#organization` },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${siteUrl}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  } as const;
}

const defaultMetadata: Metadata = {
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
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Mobazha - Decentralized Marketplace',
    description: 'Shop and grow with cryptos - A decentralized peer-to-peer marketplace',
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

export async function generateMetadata(): Promise<Metadata> {
  const [marketplace, requestSiteUrl, canonicalSiteUrl, requestUrl] = await Promise.all([
    getRequestMarketplaceContext(),
    getSiteUrl(),
    getCanonicalSiteUrl(),
    getRequestUrl(),
  ]);
  const marketplaceConfig = marketplace.config;

  /**
   * Self-referencing canonical for every route that does not publish its own.
   *
   * `/product/*` and `/store/*` override `alternates` with their own value, and
   * named storefront subdomains resolve `getCanonicalSiteUrl()` to the main
   * store, so their pages consolidate onto the canonical host automatically.
   * Query strings are dropped on purpose: `/search?q=…&sortBy=…` permutations
   * all point at `/search`, which is the signal we want for filters and sorts.
   */
  const alternates = requestUrl
    ? { canonical: buildSelfCanonical(canonicalSiteUrl, requestUrl.pathname) }
    : undefined;

  if (!marketplaceConfig) {
    return {
      ...defaultMetadata,
      ...(alternates && { alternates }),
    };
  }

  const brandName = marketplaceConfig.brand.name || 'Mobazha Marketplace';
  const description =
    marketplaceConfig.brand.tagline ||
    'Shop and grow with cryptos - A decentralized peer-to-peer marketplace';
  // Only advertise a brand image when the operator actually configured one —
  // otherwise fall through to the generated `opengraph-image` route.
  const image = marketplaceConfig.brand.banner || marketplaceConfig.brand.logo;

  return {
    ...defaultMetadata,
    metadataBase: new URL(requestSiteUrl || siteUrl),
    ...(alternates && { alternates }),
    title: {
      default: brandName,
      template: `%s | ${brandName}`,
    },
    description,
    openGraph: {
      type: 'website',
      siteName: brandName,
      title: brandName,
      description,
      ...(image && { images: [{ url: image, width: 1200, height: 630, alt: brandName }] }),
    },
    twitter: {
      card: 'summary_large_image',
      title: brandName,
      description,
      ...(image && { images: [image] }),
    },
    appleWebApp: {
      capable: true,
      statusBarStyle: 'default',
      title: brandName,
    },
  };
}

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
  // Language is carried by the URL prefix so crawlers, screen readers and link
  // previews see the right language: `/zh/...` is Simplified Chinese, everything
  // else is English. The client-side locale preference does not change the URL.
  // Read the same header `lib/requestUrl` uses; importing it here would collide
  // with the SEO branch's import edits.
  const requestUrlHeader = hdrs.get('x-mobazha-request-url');
  let htmlLang = 'en';
  if (requestUrlHeader) {
    try {
      if (new URL(requestUrlHeader).pathname.startsWith('/zh')) htmlLang = 'zh-Hans';
    } catch {
      // Malformed request URL — keep the English default.
    }
  }
  const {
    subdomain: marketplaceSubdomain,
    domain: marketplaceDomain,
    config: marketplaceConfig,
  } = await getRequestMarketplaceContext();
  const [canonicalSiteUrl, namedStorefront] = await Promise.all([
    getCanonicalSiteUrl(),
    isNamedStorefrontRequest(),
  ]);
  // These nodes name Mobazha itself, so they belong to the official site only.
  // The same image also serves self-hosted stores, custom domains and branded
  // marketplace subdomains, which must not claim to be Mobazha (or inherit its
  // sameAs links). Named storefronts are `robots: noindex` duplicates of the
  // main store and store pages already publish their own Organization node.
  const jsonLdNodes =
    !namedStorefront && isOfficialSiteUrl(canonicalSiteUrl)
      ? [buildOrganizationJsonLd(canonicalSiteUrl), buildWebsiteJsonLd(canonicalSiteUrl)]
      : [];

  return (
    <html
      lang={htmlLang}
      {...(storefrontPeerID ? { 'data-storefront': storefrontPeerID } : {})}
      suppressHydrationWarning
    >
      <head>
        {/* __SOVEREIGN__ — Vite 编译时 define，Next.js 不替换。
            必须在所有其他 script 之前定义，避免裸引用抛 ReferenceError。
            Next.js 永远走 SaaS / Standalone，恒为 false。 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `window.__SOVEREIGN__=false;`,
          }}
        />
        {/* Sync <html lang> before hydration — reduces browser auto-translate misfires */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  // Pages under /zh/ state their language in the URL and in the
                  // server-rendered <html lang>, so a saved locale must not win.
                  if (location.pathname === '/zh' || location.pathname.indexOf('/zh/') === 0) return;
                  var saved = localStorage.getItem('mobazha-locale');
                  if (saved) {
                    document.documentElement.lang = saved;
                    return;
                  }
                  var browser = (navigator.language || '').split('-')[0];
                  if (browser) document.documentElement.lang = browser;
                } catch (e) {}
              })();
            `,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var key = 'mbz:last-build-reload';
                function textOf(value) {
                  if (!value) return '';
                  if (typeof value === 'string') return value;
                  if (value.message) return value.message;
                  if (value.reason) return textOf(value.reason);
                  try { return String(value); } catch (e) { return ''; }
                }
                function shouldReload(value) {
                  return /ChunkLoadError|Loading chunk|failed to fetch dynamically imported module|Failed to fetch dynamically imported module|Unable to preload CSS|older or newer deployment|Failed to find Server Action/i.test(textOf(value));
                }
                function reloadOnce() {
                  try {
                    var now = Date.now();
                    var last = Number(sessionStorage.getItem(key) || '0');
                    if (now - last < 30000) return;
                    sessionStorage.setItem(key, String(now));
                  } catch (e) {}
                  location.reload();
                }
                window.addEventListener('error', function(event) {
                  if (shouldReload(event.error || event.message)) reloadOnce();
                }, true);
                window.addEventListener('unhandledrejection', function(event) {
                  if (shouldReload(event.reason)) reloadOnce();
                }, true);
              })();
            `,
          }}
        />
        {/* Versioned runtime config must execute before React hydration. The
            public placeholder is a no-op in SaaS/dev; standalone deployments
            proxy this path to the node's dynamic bootstrap handler. */}
        <script src="/runtime-config.js" />
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
        {/* Site-wide structured data (Organization + WebSite/SearchAction). */}
        {jsonLdNodes.map(node => (
          <script
            key={node['@type']}
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(node).replace(/<\//g, '<\\/'),
            }}
          />
        ))}
      </head>
      <body className={`${defaultFont.className} ${storeFontVariableClasses}`}>
        <QueryProvider>
          <OuterProviders>
            <StorefrontProvider peerID={storefrontPeerID}>
              <MarketplaceProvider
                initialSubdomain={marketplaceSubdomain}
                initialDomain={marketplaceDomain}
                initialConfig={marketplaceConfig}
              >
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
              </MarketplaceProvider>
            </StorefrontProvider>
          </OuterProviders>
        </QueryProvider>
      </body>
    </html>
  );
}
