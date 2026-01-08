import React from 'react';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import {
  AuthProvider,
  CurrencyProvider,
  DevTools,
  MobileNav,
  PWAInstall,
  ServiceWorkerProvider,
  ThemeProvider,
} from '@/components';
import { Toaster } from '@/components/ui';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Mobazha - Decentralized Marketplace',
  description: 'A decentralized peer-to-peer marketplace',
  manifest: '/manifest.json',
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
                {/* Main content with bottom padding for mobile nav */}
                <div className="pb-20 md:pb-0">{children}</div>

                {/* Mobile bottom navigation */}
                <MobileNav />

                {/* PWA install prompt */}
                <PWAInstall />

                {/* Dev tools (only in development) */}
                <DevTools />

                {/* Toast notifications */}
                <Toaster />
              </AuthProvider>
            </CurrencyProvider>
          </ServiceWorkerProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
