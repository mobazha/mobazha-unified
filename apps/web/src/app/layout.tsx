import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { DevTools, MobileNav } from '@/components';

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
        {/* Main content with bottom padding for mobile nav */}
        <div className="pb-16 md:pb-0">{children}</div>

        {/* Mobile bottom navigation */}
        <MobileNav />

        {/* Dev tools (only in development) */}
        <DevTools />
      </body>
    </html>
  );
}
