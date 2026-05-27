'use client';

import '@/lib/initPublicEnv';
import React from 'react';
import { ThemeProvider } from './ThemeProvider';
import { TGMiniAppProvider } from './TGMiniAppProvider';
import { DiscordActivityProvider } from './DiscordActivityProvider';
import { ServiceWorkerProvider } from './ServiceWorkerProvider';
import { AppKitProvider } from './AppKitProvider';
import { CurrencyProvider } from './CurrencyProvider';
import { PlatformProvider } from '@/lib/platform';

/**
 * Shared outer Provider tree used by BOTH entry points:
 *   - layout.tsx  (Next.js production)
 *   - main.tsx    (Vite development / TMA debugging)
 *
 * These providers do NOT depend on a router and must wrap it.
 * The order matters — later providers may depend on earlier ones.
 *
 * If you add/remove/reorder a provider here, BOTH entry points
 * get the change automatically. This is the single source of truth.
 *
 * QueryProvider is NOT included because Next.js and Vite use
 * different QueryClient configurations.
 */
export function OuterProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <TGMiniAppProvider>
        {/*
          PlatformProvider (MVP-1) depends on useTGMiniApp() to detect the
          Telegram SDK, so it must live INSIDE <TGMiniAppProvider>. It exposes
          channel-neutral capabilities (usePrimaryCTA / useBackAction /
          useConfirm / useHaptic / useShare) to every business component
          beneath it. Placed outside Discord / AppKit / Currency so those
          tree branches can consume platform hooks uniformly.
        */}
        <PlatformProvider>
          <DiscordActivityProvider>
            <ServiceWorkerProvider>
              <AppKitProvider>
                <CurrencyProvider>{children}</CurrencyProvider>
              </AppKitProvider>
            </ServiceWorkerProvider>
          </DiscordActivityProvider>
        </PlatformProvider>
      </TGMiniAppProvider>
    </ThemeProvider>
  );
}
