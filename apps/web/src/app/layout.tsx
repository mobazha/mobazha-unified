import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { DevTools, MobileNav, PWAInstall, ServiceWorkerProvider } from '@/components';

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
    <html lang="en">
      <body className={inter.className}>
        <ServiceWorkerProvider>
          {/* Main content with bottom padding for mobile nav */}
          <div className="pb-16 md:pb-0">{children}</div>

          {/* Mobile bottom navigation */}
          <MobileNav />

          {/* PWA install prompt */}
          <PWAInstall />

          {/* Dev tools (only in development) */}
          <DevTools />
        </ServiceWorkerProvider>
      </body>
    </html>
  );
}
