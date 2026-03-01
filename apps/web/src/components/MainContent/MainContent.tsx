'use client';

import React from 'react';
import { usePlatform } from '@mobazha/ui/hooks';

/**
 * Main content wrapper that adjusts bottom padding based on platform.
 * Embedded apps (TG/Discord/Farcaster) don't show MobileNav, so no padding needed.
 */
export function MainContent({ children }: { children: React.ReactNode }) {
  const { isEmbeddedApp } = usePlatform();

  return <div className={isEmbeddedApp ? '' : 'pb-20 md:pb-0'}>{children}</div>;
}
