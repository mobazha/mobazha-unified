'use client';

import { createContext, useContext } from 'react';
import { resolveMarketplaceSubdomainFromWindow } from '../marketplace/subdomain';
import type { CurationConfig } from '../curation/types';

export interface MarketplaceContextValue {
  /** Resolved marketplace subdomain, if any. */
  subdomain: string | null;
  /** Resolved marketplace custom domain, if any. */
  domain: string | null;
  /** Stable host key for the current marketplace context. */
  marketplaceKey: string | null;
  /** True when browsing a native vertical sub-market (not app.mobazha.org hub). */
  isSubMarket: boolean;
  config: CurationConfig | null;
  loading: boolean;
  error: string | null;
  retry: () => void;
}

const defaultValue: MarketplaceContextValue = {
  subdomain: null,
  domain: null,
  marketplaceKey: null,
  isSubMarket: false,
  config: null,
  loading: false,
  error: null,
  retry: () => {},
};

export const MarketplaceContext = createContext<MarketplaceContextValue>(defaultValue);

export function useMarketplaceContext(): MarketplaceContextValue {
  return useContext(MarketplaceContext);
}

/** True when the current host maps to a native vertical sub-market. */
export function useIsSubMarket(): boolean {
  return useMarketplaceContext().isSubMarket;
}

/** @deprecated Use `useIsSubMarket()` inside React components. */
export function isMarketplaceMode(): boolean {
  return resolveMarketplaceSubdomainFromWindow() != null;
}
