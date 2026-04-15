/**
 * Sales Channels API Service
 *
 * Store Links + Store Bot (Telegram) API calls.
 * Backend: mobazha_hosting /platform/v1/store-links and /platform/v1/store-bots
 */

import { getEnvConfig, isStandaloneMode } from '../../config/env';
import { getStoredToken } from '../auth/token';
import { getCachedSaaSToken } from '../auth/saasBridge';
import type { StoreLinkInfo, StoreBotInfo, BindStoreBotRequest } from '../../types/salesChannels';
import { HOSTING_API } from '../../config/apiPaths';

function getBaseUrl(): string {
  return getEnvConfig().api.baseUrl;
}

/**
 * Platform API calls (/platform/v1/*) are proxied to the SaaS backend.
 * In standalone mode the node proxy injects X-Standalone-Store-Key which
 * is sufficient for tenant identification on the SaaS side (API Key-only
 * auth path). If a SaaS JWT is cached we send it as well (gives the SaaS
 * more context), but it is not required.
 *
 * The local Basic Auth token is never forwarded — it is meaningless to
 * the SaaS platform and would be ignored.
 */
function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (isStandaloneMode()) {
    const saasJwt = getCachedSaaSToken();
    if (saasJwt) {
      headers.Authorization = `Bearer ${saasJwt}`;
    }
    return headers;
  }

  const token = getStoredToken();
  if (token) {
    if (token.startsWith('basic:')) {
      headers.Authorization = `Basic ${token.slice(6)}`;
    } else {
      headers.Authorization = `Bearer ${token}`;
    }
  }
  return headers;
}

function unwrapData<T>(json: unknown): T {
  if (json !== null && typeof json === 'object' && 'data' in json) {
    return (json as Record<string, unknown>).data as T;
  }
  return json as T;
}

function extractErrorMessage(errBody: unknown): string {
  if (errBody == null || typeof errBody !== 'object') return 'Request failed';
  const o = errBody as Record<string, unknown>;
  const err = o.error;
  if (typeof err === 'string') return err;
  if (typeof err === 'object' && err !== null && 'message' in err) {
    const msg = (err as Record<string, unknown>).message;
    return typeof msg === 'string' ? msg : 'Request failed';
  }
  if (typeof o.message === 'string') return o.message;
  return 'Request failed';
}

// ============ Store Links: Resolve (public, no auth) ============

export async function resolveStoreShortCode(shortCode: string): Promise<string | null> {
  try {
    const response = await fetch(`${getBaseUrl()}${HOSTING_API.STORE_LINKS_RESOLVE(shortCode)}`, {
      method: 'GET',
    });
    if (!response.ok) return null;
    const raw = await response.json();
    const data = unwrapData<{ peerID: string }>(raw);
    return data?.peerID || null;
  } catch {
    return null;
  }
}

// ============ Store Links ============

export async function getStoreLink(): Promise<StoreLinkInfo> {
  const response = await fetch(`${getBaseUrl()}${HOSTING_API.STORE_LINKS}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  const raw = await response.json();
  if (!response.ok) {
    throw new Error(extractErrorMessage(raw));
  }
  return unwrapData<StoreLinkInfo>(raw);
}

export async function regenerateStoreLink(): Promise<StoreLinkInfo> {
  const response = await fetch(`${getBaseUrl()}${HOSTING_API.STORE_LINKS_REGENERATE}`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  const raw = await response.json();
  if (!response.ok) {
    throw new Error(extractErrorMessage(raw));
  }
  return unwrapData<StoreLinkInfo>(raw);
}

// ============ Store Bots (Telegram) ============

export async function getStoreBot(peerID: string): Promise<StoreBotInfo> {
  const response = await fetch(`${getBaseUrl()}${HOSTING_API.STORE_BOTS}?peerID=${peerID}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  const raw = await response.json();
  if (!response.ok) {
    throw new Error(extractErrorMessage(raw));
  }
  return unwrapData<StoreBotInfo>(raw);
}

export async function bindStoreBot(data: BindStoreBotRequest): Promise<StoreBotInfo> {
  const response = await fetch(`${getBaseUrl()}${HOSTING_API.STORE_BOTS}`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  const raw = await response.json();
  if (!response.ok) {
    throw new Error(extractErrorMessage(raw));
  }
  return unwrapData<StoreBotInfo>(raw);
}

export async function unbindStoreBot(peerID: string): Promise<void> {
  const response = await fetch(`${getBaseUrl()}${HOSTING_API.STORE_BOTS}?peerID=${peerID}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    const raw = await response.json().catch(() => ({}));
    throw new Error(extractErrorMessage(raw));
  }
}

// ============ Store Branded Domains ============

export interface StoreDomainInfo {
  handle: string;
  subdomainUrl?: string;
  customDomain?: string | null;
  verified: boolean;
}

export interface HandleAvailability {
  available: boolean;
  reason?: string;
}

export async function getStoreDomain(peerID: string): Promise<StoreDomainInfo | null> {
  const response = await fetch(`${getBaseUrl()}${HOSTING_API.STORE_DOMAIN(peerID)}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  const raw = await response.json();
  if (!response.ok) return null;
  return unwrapData<StoreDomainInfo>(raw);
}

export async function setStoreDomainHandle(
  peerID: string,
  handle: string
): Promise<StoreDomainInfo> {
  const response = await fetch(`${getBaseUrl()}${HOSTING_API.STORE_DOMAIN(peerID)}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ handle }),
  });
  const raw = await response.json();
  if (!response.ok) {
    throw new Error(extractErrorMessage(raw));
  }
  return unwrapData<StoreDomainInfo>(raw);
}

export async function deleteStoreDomain(peerID: string): Promise<void> {
  const response = await fetch(`${getBaseUrl()}${HOSTING_API.STORE_DOMAIN(peerID)}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    const raw = await response.json().catch(() => ({}));
    throw new Error(extractErrorMessage(raw));
  }
}

export async function checkHandleAvailability(handle: string): Promise<HandleAvailability> {
  const response = await fetch(
    `${getBaseUrl()}${HOSTING_API.STORE_DOMAIN_CHECK}?handle=${encodeURIComponent(handle)}`,
    { method: 'GET', headers: getAuthHeaders() }
  );
  const raw = await response.json();
  if (!response.ok) {
    throw new Error(extractErrorMessage(raw));
  }
  return unwrapData<HandleAvailability>(raw);
}

export const salesChannelsApi = {
  resolveStoreShortCode,
  getStoreLink,
  regenerateStoreLink,
  getStoreBot,
  bindStoreBot,
  unbindStoreBot,
  getStoreDomain,
  setStoreDomainHandle,
  deleteStoreDomain,
  checkHandleAvailability,
};
