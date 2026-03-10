'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { usePlatform } from '@mobazha/ui/hooks';

/**
 * Main content wrapper that adjusts bottom padding based on platform.
 * Embedded apps (TG/Discord/Farcaster) and /embed/* iframe pages don't show MobileNav, so no padding needed.
 */
export function MainContent({ children }: { children: React.ReactNode }) {
  const { isEmbeddedApp } = usePlatform();
  const pathname = usePathname();
  const isEmbed = pathname === '/embed' || pathname?.startsWith('/embed/');

  return <div className={isEmbeddedApp || isEmbed ? '' : 'pb-24 md:pb-0'}>{children}</div>;
}
