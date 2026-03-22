import React, { Suspense } from 'react';
import type { Metadata, Viewport } from 'next';
import './globals.css';
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
import { Toaster } from '@/components/ui';
import { ProductModalProvider, PaymentSelectorProvider } from '@/hooks';
import { defaultFont, storeFontVariableClasses } from '@/lib/fonts';
import { BrandedSplash, INLINE_SPLASH_HTML } from '@/components/BrandedSplash';
import { TGBackButtonManager } from '@/components/TGMiniAppProvider';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://app.mobazha.org';

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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* 防闪烁脚本 - 在页面加载前立即应用主题 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const theme = localStorage.getItem('mobazha-theme') || 'classic';
                  const mode = localStorage.getItem('mobazha-theme-mode') || 'system';
                  let resolvedMode = mode;
                  if (mode === 'system') {
                    resolvedMode = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                  }
                  document.documentElement.setAttribute('data-theme', theme);
                  if (resolvedMode === 'dark') {
                    document.documentElement.classList.add('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className={`${defaultFont.className} ${storeFontVariableClasses}`}>
        {/* Inline splash: paints immediately before JS loads, removed by BrandedSplash on mount */}
        <div dangerouslySetInnerHTML={{ __html: INLINE_SPLASH_HTML }} />
        <QueryProvider>
          <OuterProviders>
            <Suspense fallback={<BrandedSplash />}>
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
          </OuterProviders>
        </QueryProvider>
      </body>
    </html>
  );
}
