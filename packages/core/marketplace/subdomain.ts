/**
 * Resolve native sub-market subdomain from the request host.
 * Mirrors hosting `marketplaceSubdomainFromHost` (mobazha_hosting/api/marketplace_handlers.go).
 */

const RESERVED_SUBDOMAINS = new Set(['app', 'www', 'api', 'miniapp', 'miniapptest']);

function marketplaceSubdomainBase(): string {
  if (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_MARKETPLACE_SUBDOMAIN_BASE) {
    return process.env.NEXT_PUBLIC_MARKETPLACE_SUBDOMAIN_BASE.trim();
  }
  return '';
}

export function resolveMarketplaceSubdomainFromHost(
  host: string,
  base = marketplaceSubdomainBase()
): string | null {
  const normalized = host.split(':')[0]?.trim().toLowerCase();
  const configuredBase = base.trim().toLowerCase();
  if (!normalized || !configuredBase || normalized === configuredBase) {
    return null;
  }

  const suffix = `.${configuredBase}`;
  if (!normalized.endsWith(suffix)) {
    return null;
  }

  const subdomain = normalized.slice(0, -suffix.length);
  if (!subdomain || subdomain.includes('.') || RESERVED_SUBDOMAINS.has(subdomain)) {
    return null;
  }

  return subdomain;
}

export function resolveMarketplaceSubdomainFromWindow(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return resolveMarketplaceSubdomainFromHost(window.location.hostname);
}
