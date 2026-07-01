/**
 * Type-safe API client powered by openapi-fetch + OpenAPI-generated types.
 *
 * Three client factories, one per backend service:
 *   - createNodeClient()    → mobazha3.0 node API  (/v1/*)
 *   - createHostingClient() → mobazha_hosting API   (/api/*)
 *   - createSearchClient()  → mobazha.info search   (/info/api/*)
 *
 * Usage:
 *   import { createNodeClient, createHostingClient } from './openapi-client';
 *   const node = createNodeClient();
 *   const { data, error } = await node.GET('/v1/profiles');
 */

import createClient, { type Middleware } from 'openapi-fetch';
import type { paths } from '../../types/api-generated';
import { getGatewayUrl, getHostingUrl, getSearchUrl } from './config';
import { getStoredToken } from '../auth/token';

let onUnauthorizedCb: (() => void) | null = null;

/**
 * Register a callback invoked on 401 responses (mirrors client.ts pattern).
 */
export function onOpenApiUnauthorized(cb: () => void): void {
  onUnauthorizedCb = cb;
}

const authMiddleware: Middleware = {
  async onRequest({ request }) {
    const token = getStoredToken();
    if (token) {
      request.headers.set('Authorization', `Bearer ${token}`);
    }
    return request;
  },
  async onResponse({ response }) {
    if (response.status === 401 && onUnauthorizedCb) {
      onUnauthorizedCb();
    }
    return response;
  },
};

// ---------------------------------------------------------------------------
// Node API client  (paths starting with /v1/*)
// getGatewayUrl() already returns a base that includes "/v1",
// but OpenAPI paths are defined WITH the /v1 prefix (e.g. /v1/profiles).
// So we strip /v1 from the baseUrl to avoid duplication.
// ---------------------------------------------------------------------------
type NodePaths = {
  [P in keyof paths as P extends `/v1/${string}` ? P : never]: paths[P];
};

export function createNodeClient() {
  const base = getGatewayUrl(); // e.g. "/v1" or "https://host/v1"
  const baseUrl = base.endsWith('/v1') ? base.slice(0, -3) : base.replace(/\/v1$/, '');

  const client = createClient<NodePaths>({ baseUrl });
  client.use(authMiddleware);
  return client;
}

// ---------------------------------------------------------------------------
// Hosting API client  (non-/v1 paths: /api/*, /healthz, /readyz, /metrics, …)
// ---------------------------------------------------------------------------
type HostingPaths = {
  [P in keyof paths as P extends `/v1/${string}` ? never : P]: paths[P];
};

export function createHostingClient() {
  const client = createClient<HostingPaths>({ baseUrl: getHostingUrl() });
  client.use(authMiddleware);
  return client;
}

// ---------------------------------------------------------------------------
// Search API client  (paths starting with /info/*)
// ---------------------------------------------------------------------------
export function createSearchClient() {
  const client = createClient<paths>({ baseUrl: getSearchUrl() });
  client.use(authMiddleware);
  return client;
}

// ---------------------------------------------------------------------------
// Convenience: re-export generated types for consumers
// ---------------------------------------------------------------------------
export type { paths, paths as ApiPaths };
export type { components as ApiComponents } from '../../types/api-generated';
