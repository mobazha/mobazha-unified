'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { usePlatform } from '@mobazha/ui/hooks';

/**
 * Main content wrapper that adjusts bottom padding based on platform.
 * - Web / TMA: pb-24 for MobileNav (hidden on md+ for web)
 * - Other embedded / iframe: no padding
 */
export function MainContent({ children }: { children: React.ReactNode }) {
  const { isEmbeddedApp, isTGMiniApp } = usePlatform();
  const pathname = usePathname();
  const isEmbed = pathname === '/embed' || pathname?.startsWith('/embed/');

  let paddingClass = 'pb-24 md:pb-0';
  if (isEmbed) {
    paddingClass = '';
  } else if (isEmbeddedApp && !isTGMiniApp) {
    paddingClass = '';
  }

  return <div className={paddingClass}>{children}</div>;
}
