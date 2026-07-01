import { cache } from 'react';
import { headers } from 'next/headers';
import { HOSTING_API } from '@mobazha/core/config/apiPaths';
import { mapMarketplaceConfigToCuration, type CurationConfig } from '@mobazha/core/curation';
import { resolveMarketplaceSubdomainFromHost } from '@mobazha/core/marketplace/subdomain';
import type { MarketplaceCurationConfig } from '@mobazha/core/types/marketplace';
import { SSR_API_BASE } from '@/lib/ssrApiBase';

function unwrapEnvelope<T>(json: unknown): T {
  if (json && typeof json === 'object' && 'data' in json) {
    return (json as { data: T }).data;
  }
  return json as T;
}

async function fetchMarketplaceCurationConfigImpl({
  domain,
  subdomain,
}: {
  domain?: string | null;
  subdomain?: string | null;
}): Promise<CurationConfig | null> {
  if (!domain && !subdomain) {
    return null;
  }

  try {
    const params = new URLSearchParams();
    if (domain) params.set('domain', domain);
    if (subdomain) params.set('subdomain', subdomain);
    const url = `${SSR_API_BASE}${HOSTING_API.MARKETPLACE_CONFIG_CURRENT}?${params.toString()}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    const raw = unwrapEnvelope<MarketplaceCurationConfig>(await res.json());
    return mapMarketplaceConfigToCuration(raw);
  } catch {
    return null;
  }
}

/** Per-request dedupe for layout + generateMetadata. */
export const fetchMarketplaceCurationConfig = cache(fetchMarketplaceCurationConfigImpl);

export interface RequestMarketplaceContext {
  subdomain: string | null;
  domain: string | null;
  config: CurationConfig | null;
}

/** Read marketplace host headers and load config once per request. */
export const getRequestMarketplaceContext = cache(async (): Promise<RequestMarketplaceContext> => {
  const hdrs = await headers();
  let subdomain = hdrs.get('x-marketplace-subdomain') || null;
  const domain = hdrs.get('x-marketplace-domain') || null;

  // Local dev hits Next directly (no hosting proxy); derive subdomain from Host.
  if (!subdomain && !domain) {
    const host = hdrs.get('host') || '';
    subdomain = resolveMarketplaceSubdomainFromHost(host);
  }

  const config = await fetchMarketplaceCurationConfig({ domain, subdomain });
  return { subdomain, domain, config };
});
