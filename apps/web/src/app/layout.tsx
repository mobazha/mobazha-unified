import React, { Suspense } from 'react';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import {
  AuthProvider,
  ChatSystem,
  CurrencyProvider,
  MobileNav,
  PWAInstall,
  ServiceWorkerProvider,
  ThemeProvider,
} from '@/components';
import { Toaster } from '@/components/ui';
import { ProductModalProvider, PaymentSelectorProvider } from '@/hooks';

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
            <CurrencyProvider>
              <AuthProvider>
                <Suspense fallback={null}>
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

                      {/* Dev tools (only in development) - 临时禁用 */}
                      {/* <DevTools /> */}

                      {/* Toast notifications */}
                      <Toaster />
                    </PaymentSelectorProvider>
                  </ProductModalProvider>
                </Suspense>
              </AuthProvider>
            </CurrencyProvider>
          </ServiceWorkerProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
