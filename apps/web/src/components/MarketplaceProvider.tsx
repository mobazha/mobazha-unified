'use client';

import { useMemo, useState, useSyncExternalStore, type ReactNode } from 'react';
import {
  ApiCurationProvider,
  CurationConfigProvider,
  StaticCurationProvider,
  useCuration,
} from '@mobazha/core/curation';
import type { CurationConfig } from '@mobazha/core/curation';
import {
  MarketplaceContext,
  type MarketplaceContextValue,
} from '@mobazha/core/hooks/useMarketplaceContext';
import { resolveMarketplaceSubdomainFromWindow } from '@mobazha/core/marketplace/subdomain';
import { useRuntimeConfig } from '@mobazha/core';
import { getCurrentMarketplaceConfig } from '@mobazha/core/services/api/marketplace';

function normalizeWindowHostname(hostname: string): string | null {
  const normalized = hostname.trim().toLowerCase().replace(/\.$/, '');
  return normalized || null;
}

function MarketplaceContextBridge({
  subdomain,
  domain,
  marketplaceKey,
  children,
}: {
  subdomain: string | null;
  domain: string | null;
  marketplaceKey: string;
  children: ReactNode;
}) {
  const { config, loading, error, retry } = useCuration();

  const value = useMemo<MarketplaceContextValue>(
    () => ({
      subdomain,
      domain,
      marketplaceKey,
      isSubMarket: true,
      config,
      loading,
      error,
      retry,
    }),
    [subdomain, domain, marketplaceKey, config, loading, error, retry]
  );

  return <MarketplaceContext.Provider value={value}>{children}</MarketplaceContext.Provider>;
}

export function MarketplaceProvider({
  initialSubdomain = null,
  initialDomain = null,
  initialConfig = null,
  children,
}: {
  initialSubdomain?: string | null;
  initialDomain?: string | null;
  initialConfig?: CurationConfig | null;
  children: ReactNode;
}) {
  const skipWindowResolve = !!(initialSubdomain || initialDomain || initialConfig);
  const runtimeConfig = useRuntimeConfig();
  const isDedicatedMarketplace = runtimeConfig.experience.kind === 'marketplace';
  const windowDomain = useSyncExternalStore(
    () => () => {},
    () => {
      if (skipWindowResolve || !isDedicatedMarketplace || typeof window === 'undefined') {
        return null;
      }
      return normalizeWindowHostname(window.location.hostname);
    },
    () => null
  );
  const windowSubdomain = useSyncExternalStore(
    () => () => {},
    () => (skipWindowResolve || windowDomain ? null : resolveMarketplaceSubdomainFromWindow()),
    () => null
  );
  const subdomain = initialSubdomain ?? initialConfig?.subdomain ?? windowSubdomain;
  const [domain] = useState<string | null>(
    initialDomain ?? initialConfig?.domain ?? windowDomain ?? null
  );

  const isSubMarket = !!subdomain || !!domain || !!initialConfig;
  const marketplaceKey =
    subdomain || domain || initialConfig?.subdomain || initialConfig?.domain || 'marketplace';

  const curationProvider = useMemo(() => {
    if (initialConfig && !subdomain && !domain) {
      return new StaticCurationProvider(initialConfig);
    }
    if (!subdomain && !domain) {
      return null;
    }
    return new ApiCurationProvider(() =>
      getCurrentMarketplaceConfig({
        subdomain: subdomain || undefined,
        domain: domain || undefined,
      })
    );
  }, [subdomain, domain, initialConfig]);

  if (!isSubMarket || !curationProvider) {
    const value: MarketplaceContextValue = {
      subdomain: null,
      domain: null,
      marketplaceKey: null,
      isSubMarket: false,
      config: null,
      loading: false,
      error: null,
      retry: () => {},
    };
    return <MarketplaceContext.Provider value={value}>{children}</MarketplaceContext.Provider>;
  }

  return (
    <CurationConfigProvider provider={curationProvider} initialConfig={initialConfig}>
      <MarketplaceContextBridge
        subdomain={subdomain}
        domain={domain}
        marketplaceKey={marketplaceKey}
      >
        {children}
      </MarketplaceContextBridge>
    </CurationConfigProvider>
  );
}
