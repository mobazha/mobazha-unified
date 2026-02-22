import React, { Suspense } from 'react';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import {
  AppKitProvider,
  AuthProvider,
  ChatSystem,
  CurrencyProvider,
  MobileNav,
  PWAInstall,
  ServiceWorkerProvider,
  SessionExpiredDialog,
  ThemeProvider,
} from '@/components';
import { Toaster } from '@/components/ui';
import { ProductModalProvider, PaymentSelectorProvider } from '@/hooks';

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

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Mobazha - Decentralized Marketplace',
  description: 'Shop and grow with cryptos - A decentralized peer-to-peer marketplace',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
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
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
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
      <body className={inter.className}>
        <ThemeProvider>
          <ServiceWorkerProvider>
            <AppKitProvider>
              <CurrencyProvider>
                <Suspense fallback={<AuthProviderLoading />}>
                  <AuthProvider>
                    <ProductModalProvider>
                      <PaymentSelectorProvider>
                        {/* Main content with bottom padding for mobile nav */}
                        <div className="pb-20 md:pb-0">{children}</div>

                        {/* Mobile bottom navigation */}
                        <MobileNav />

                        {/* Chat floating button and drawer */}
                        <ChatSystem />

                        {/* PWA install prompt */}
                        <PWAInstall />

                        {/* Session expired dialog (global 401 handler) */}
                        <SessionExpiredDialog />

                        {/* Toast notifications */}
                        <Toaster />
                      </PaymentSelectorProvider>
                    </ProductModalProvider>
                  </AuthProvider>
                </Suspense>
              </CurrencyProvider>
            </AppKitProvider>
          </ServiceWorkerProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
