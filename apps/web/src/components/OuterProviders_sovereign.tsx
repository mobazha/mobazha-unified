'use client';

import React from 'react';
import { ThemeProvider } from './ThemeProvider';
import { CurrencyProvider } from './CurrencyProvider';

/**
 * Sovereign-only outer Provider tree.
 * Strips: TGMiniAppProvider, PlatformProvider, DiscordActivityProvider,
 * ServiceWorkerProvider, AppKitProvider — none of these are needed
 * in a privacy-focused single-store Sovereign deployment.
 */
export function OuterProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <CurrencyProvider>{children}</CurrencyProvider>
    </ThemeProvider>
  );
}
