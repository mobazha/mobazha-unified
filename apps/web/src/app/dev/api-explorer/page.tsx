'use client';

import React, { useState, useCallback } from 'react';
import { createNodeClient, createHostingClient } from '@mobazha/core/services/api/openapi-client';
import { getAuthHeaders, getHostingUrl } from '@mobazha/core/services/api/config';

function safeStringify(val: unknown, maxLen = 2000): string {
  if (typeof val === 'string') return val.slice(0, maxLen);
  try {
    return (JSON.stringify(val, null, 2) ?? '').slice(0, maxLen);
  } catch {
    return '[Circular or non-serializable]';
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type EndpointGroup = 'node' | 'hosting' | 'health';

type EndpointDef = {
  id: string;
  label: string;
  group: EndpointGroup;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  description: string;
  typeSafe?: boolean;
};

type Result = {
  endpointId: string;
  status: number;
  ok: boolean;
  duration: number;
  data: unknown;
  error?: string;
  typeSafe?: boolean;
};

// ---------------------------------------------------------------------------
// Endpoints catalog (from openapi.yaml)
// ---------------------------------------------------------------------------

const ENDPOINTS: EndpointDef[] = [
  // Health & Observability
  {
    id: 'healthz',
    label: 'GET /healthz',
    group: 'health',
    method: 'GET',
    path: '/healthz',
    description: 'Liveness probe',
    typeSafe: true,
  },
  {
    id: 'readyz',
    label: 'GET /readyz',
    group: 'health',
    method: 'GET',
    path: '/readyz',
    description: 'Readiness probe',
    typeSafe: true,
  },

  // Node API (/v1) — proxied to mobazha3.0
  {
    id: 'profiles',
    label: 'GET /v1/profiles',
    group: 'node',
    method: 'GET',
    path: '/v1/profiles',
    description: 'My profile',
    typeSafe: true,
  },
  {
    id: 'preferences',
    label: 'GET /v1/preferences',
    group: 'node',
    method: 'GET',
    path: '/v1/preferences',
    description: 'Preferences',
  },
  {
    id: 'listings-index',
    label: 'GET /v1/listings/index',
    group: 'node',
    method: 'GET',
    path: '/v1/listings/index',
    description: 'My listings index',
  },
  {
    id: 'exchangerates',
    label: 'GET /v1/exchangerates',
    group: 'node',
    method: 'GET',
    path: '/v1/exchangerates',
    description: 'Exchange rates',
  },
  {
    id: 'wallet-balance',
    label: 'GET /v1/wallet/balance',
    group: 'node',
    method: 'GET',
    path: '/v1/wallet/balance',
    description: 'All balances',
  },
  {
    id: 'wallet-currencies',
    label: 'GET /v1/wallet/currencies',
    group: 'node',
    method: 'GET',
    path: '/v1/wallet/currencies',
    description: 'Supported currencies',
    typeSafe: true,
  },
  {
    id: 'wallet-status',
    label: 'GET /v1/wallet/status',
    group: 'node',
    method: 'GET',
    path: '/v1/wallet/status',
    description: 'Wallet status',
  },
  {
    id: 'notifications',
    label: 'GET /v1/notifications',
    group: 'node',
    method: 'GET',
    path: '/v1/notifications',
    description: 'Notifications',
  },
  {
    id: 'purchases',
    label: 'GET /v1/purchases',
    group: 'node',
    method: 'GET',
    path: '/v1/purchases',
    description: 'Purchase orders',
    typeSafe: true,
  },
  {
    id: 'sales',
    label: 'GET /v1/sales',
    group: 'node',
    method: 'GET',
    path: '/v1/sales',
    description: 'Sales orders',
  },
  {
    id: 'config',
    label: 'GET /v1/config',
    group: 'node',
    method: 'GET',
    path: '/v1/config',
    description: 'Node config',
  },
  {
    id: 'carts',
    label: 'GET /v1/carts',
    group: 'node',
    method: 'GET',
    path: '/v1/carts',
    description: 'Carts',
  },
  {
    id: 'chat-convos',
    label: 'GET /v1/chat/conversations',
    group: 'node',
    method: 'GET',
    path: '/v1/chat/conversations',
    description: 'Chat conversations',
  },
  {
    id: 'followers',
    label: 'GET /v1/followers',
    group: 'node',
    method: 'GET',
    path: '/v1/followers',
    description: 'Followers',
  },
  {
    id: 'following',
    label: 'GET /v1/following',
    group: 'node',
    method: 'GET',
    path: '/v1/following',
    description: 'Following',
  },

  // Hosting API (/api)
  {
    id: 'product-groups',
    label: 'GET /api/v1/product-groups',
    group: 'hosting',
    method: 'GET',
    path: '/api/v1/product-groups',
    description: 'Product groups',
    typeSafe: true,
  },
  {
    id: 'matrix-config',
    label: 'GET /api/matrix/config',
    group: 'hosting',
    method: 'GET',
    path: '/api/matrix/config',
    description: 'Matrix config',
  },
  {
    id: 'store-access-settings',
    label: 'GET /api/v1/store-access-settings',
    group: 'hosting',
    method: 'GET',
    path: '/api/v1/store-access-settings',
    description: 'Access settings',
  },
];

// ---------------------------------------------------------------------------
// Raw fetch helper (for endpoints not yet in openapi-fetch types)
// ---------------------------------------------------------------------------

async function rawFetch(ep: EndpointDef): Promise<{ status: number; ok: boolean; data: unknown }> {
  const headers = getAuthHeaders();
  const baseUrl = getHostingUrl();
  const url = baseUrl ? `${baseUrl}${ep.path}` : ep.path;
  const res = await fetch(url, { method: ep.method, headers });
  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('json') ? await res.json() : await res.text();
  return { status: res.status, ok: res.ok, data };
}

// ---------------------------------------------------------------------------
// Type-safe fetch via openapi-fetch
// ---------------------------------------------------------------------------

let _nodeClient: ReturnType<typeof createNodeClient> | null = null;
let _hostingClient: ReturnType<typeof createHostingClient> | null = null;

function getNodeClientCached() {
  if (!_nodeClient) _nodeClient = createNodeClient();
  return _nodeClient;
}

function getHostingClientCached() {
  if (!_hostingClient) _hostingClient = createHostingClient();
  return _hostingClient;
}

async function typeSafeFetch(
  ep: EndpointDef
): Promise<{ status: number; ok: boolean; data: unknown }> {
  const node = getNodeClientCached();
  const hosting = getHostingClientCached();

  // Route to correct client based on path
  if (ep.path === '/healthz') {
    const { data, error, response } = await hosting.GET('/healthz', {});
    return { status: response?.status ?? 0, ok: !error, data: data ?? error };
  }
  if (ep.path === '/readyz') {
    const { data, error, response } = await hosting.GET('/readyz', {});
    return { status: response?.status ?? 0, ok: !error, data: data ?? error };
  }
  if (ep.path === '/v1/profiles') {
    const { data, error, response } = await node.GET('/v1/profiles', {});
    return { status: response?.status ?? 0, ok: !error, data: data ?? error };
  }
  if (ep.path === '/v1/purchases') {
    const { data: purData, error: purErr, response: purRes } = await node.GET('/v1/purchases', {});
    return { status: purRes?.status ?? 0, ok: !purErr, data: purData ?? purErr };
  }
  if (ep.path === '/v1/wallet/currencies') {
    const { data, error, response } = await node.GET('/v1/wallet/currencies', {});
    return { status: response?.status ?? 0, ok: !error, data: data ?? error };
  }
  // Fallback to raw fetch (includes /api/v1/product-groups and other non-typed paths)
  return rawFetch(ep);
}

// ---------------------------------------------------------------------------
// StatusBadge
// ---------------------------------------------------------------------------

function StatusBadge({ status, ok }: { status: number; ok: boolean }) {
  if (status === 0) return <span className="text-xs text-muted-foreground">--</span>;
  const color = ok
    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
  return <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${color}`}>{status}</span>;
}

function MethodBadge({ method }: { method: string }) {
  const colors: Record<string, string> = {
    GET: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    POST: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    PUT: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    DELETE: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  };
  return (
    <span
      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${colors[method] ?? 'bg-muted text-muted-foreground'}`}
    >
      {method}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function ApiExplorerPage() {
  const [results, setResults] = useState<Record<string, Result>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState<'all' | EndpointGroup>('all');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [comparisonMode, setComparisonMode] = useState(false);
  const [comparisonResults, setComparisonResults] = useState<
    Record<string, { raw: Result; typed: Result }>
  >({});

  const callEndpoint = useCallback(async (ep: EndpointDef, useTypeSafe = false) => {
    const key = useTypeSafe ? `${ep.id}-typed` : ep.id;
    setLoading(prev => ({ ...prev, [key]: true }));

    const start = performance.now();
    try {
      const result = useTypeSafe && ep.typeSafe ? await typeSafeFetch(ep) : await rawFetch(ep);
      const duration = Math.round(performance.now() - start);

      const r: Result = {
        endpointId: ep.id,
        status: result.status,
        ok: result.ok,
        duration,
        data: result.data,
        typeSafe: useTypeSafe,
      };
      setResults(prev => ({ ...prev, [key]: r }));
      return r;
    } catch (err) {
      const duration = Math.round(performance.now() - start);
      const r: Result = {
        endpointId: ep.id,
        status: 0,
        ok: false,
        duration,
        data: null,
        error: err instanceof Error ? err.message : String(err),
        typeSafe: useTypeSafe,
      };
      setResults(prev => ({ ...prev, [key]: r }));
      return r;
    } finally {
      setLoading(prev => ({ ...prev, [key]: false }));
    }
  }, []);

  const callAll = useCallback(async () => {
    const filtered = ENDPOINTS.filter(ep => filter === 'all' || ep.group === filter);
    await Promise.allSettled(filtered.map(ep => callEndpoint(ep)));
  }, [filter, callEndpoint]);

  const runComparison = useCallback(async () => {
    const typeSafeEndpoints = ENDPOINTS.filter(ep => ep.typeSafe);
    setComparisonMode(true);

    for (const ep of typeSafeEndpoints) {
      const [raw, typed] = await Promise.all([callEndpoint(ep, false), callEndpoint(ep, true)]);
      setComparisonResults(prev => ({
        ...prev,
        [ep.id]: { raw, typed },
      }));
    }
  }, [callEndpoint]);

  const visibleEndpoints = ENDPOINTS.filter(ep => filter === 'all' || ep.group === filter);
  const successCount = Object.values(results).filter(r => r.ok).length;
  const failCount = Object.values(results).filter(r => !r.ok && r.status !== 0).length;
  const typeSafeCount = ENDPOINTS.filter(ep => ep.typeSafe).length;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold">API Explorer</h1>
            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">
              DEV TOOL
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            {ENDPOINTS.length} endpoints from{' '}
            <code className="bg-muted px-1 rounded text-xs">openapi.yaml</code> &middot;{' '}
            {typeSafeCount} type-safe via{' '}
            <code className="bg-muted px-1 rounded text-xs">openapi-fetch</code>
          </p>
        </header>

        {/* Controls */}
        <div className="flex flex-wrap gap-3 mb-6 items-center">
          <div className="flex gap-0.5 bg-muted rounded-lg p-0.5">
            {(
              [
                { key: 'all', label: 'All' },
                { key: 'health', label: 'Health' },
                { key: 'node', label: 'Node /v1' },
                { key: 'hosting', label: 'Hosting /api' },
              ] as const
            ).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key as 'all' | EndpointGroup)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  filter === key
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <button
            onClick={callAll}
            className="px-4 py-1.5 bg-primary text-primary-foreground rounded-md text-xs font-medium hover:bg-primary/90 transition-colors"
          >
            Run All ({visibleEndpoints.length})
          </button>

          <button
            onClick={runComparison}
            className="px-4 py-1.5 border border-primary text-primary rounded-md text-xs font-medium hover:bg-primary/10 transition-colors"
          >
            Compare: Raw vs Type-Safe ({typeSafeCount})
          </button>

          {Object.keys(results).length > 0 && (
            <div className="flex items-center gap-3 ml-auto text-xs">
              {successCount > 0 && (
                <span className="text-green-600 dark:text-green-400 font-medium">
                  {successCount} ok
                </span>
              )}
              {failCount > 0 && (
                <span className="text-destructive font-medium">{failCount} fail</span>
              )}
              <button
                onClick={() => {
                  setResults({});
                  setComparisonResults({});
                  setComparisonMode(false);
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                Clear
              </button>
            </div>
          )}
        </div>

        {/* Comparison results */}
        {comparisonMode && Object.keys(comparisonResults).length > 0 && (
          <div className="mb-8 space-y-3">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-primary" />
              Type Safety Comparison
            </h2>
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/50 text-muted-foreground">
                    <th className="text-left px-3 py-2 font-medium">Endpoint</th>
                    <th className="text-center px-3 py-2 font-medium">Raw fetch</th>
                    <th className="text-center px-3 py-2 font-medium">openapi-fetch</th>
                    <th className="text-center px-3 py-2 font-medium">Match</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(comparisonResults).map(([id, { raw, typed }]) => {
                    const match = raw.status === typed.status;
                    return (
                      <tr key={id} className="border-t border-border">
                        <td className="px-3 py-2 font-mono">
                          {ENDPOINTS.find(e => e.id === id)?.path}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <StatusBadge status={raw.status} ok={raw.ok} />
                          <span className="text-muted-foreground ml-1">{raw.duration}ms</span>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <StatusBadge status={typed.status} ok={typed.ok} />
                          <span className="text-muted-foreground ml-1">{typed.duration}ms</span>
                        </td>
                        <td className="px-3 py-2 text-center">
                          {match ? (
                            <span className="text-green-600 dark:text-green-400">&#10003;</span>
                          ) : (
                            <span className="text-destructive">&#10007;</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Endpoint list */}
        <div className="space-y-2">
          {visibleEndpoints.map(ep => {
            const result = results[ep.id];
            const typedResult = results[`${ep.id}-typed`];
            const isLoading = loading[ep.id];
            const isExpanded = expanded === ep.id;

            return (
              <div
                key={ep.id}
                className={`border rounded-lg transition-colors ${
                  isExpanded
                    ? 'border-primary/40 bg-primary/5'
                    : 'border-border hover:border-primary/20'
                }`}
              >
                <div className="flex items-center gap-2 px-3 py-2.5">
                  <button
                    onClick={() => callEndpoint(ep)}
                    disabled={isLoading}
                    className="shrink-0 px-2.5 py-1 text-[10px] font-medium rounded border border-border bg-background hover:bg-muted transition-colors disabled:opacity-40"
                  >
                    {isLoading ? '...' : 'Run'}
                  </button>

                  <MethodBadge method={ep.method} />

                  <button
                    onClick={() => setExpanded(isExpanded ? null : ep.id)}
                    className="flex-1 text-left font-mono text-xs text-foreground hover:text-primary transition-colors"
                  >
                    {ep.path}
                  </button>

                  <span className="text-[10px] text-muted-foreground hidden sm:inline">
                    {ep.description}
                  </span>

                  {ep.typeSafe && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
                      TS
                    </span>
                  )}

                  {result && (
                    <div className="flex items-center gap-1.5">
                      <StatusBadge status={result.status} ok={result.ok} />
                      <span className="text-[10px] text-muted-foreground w-10 text-right">
                        {result.duration}ms
                      </span>
                    </div>
                  )}
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="px-3 pb-3 border-t border-border/50">
                    <div className="flex gap-2 mt-2 mb-2">
                      {ep.typeSafe && (
                        <button
                          onClick={() => callEndpoint(ep, true)}
                          disabled={loading[`${ep.id}-typed`]}
                          className="px-2.5 py-1 text-[10px] font-medium rounded border border-primary/30 text-primary hover:bg-primary/10 transition-colors disabled:opacity-40"
                        >
                          Run Type-Safe
                        </button>
                      )}
                    </div>

                    {result && (
                      <div className="mt-2">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-medium text-muted-foreground uppercase">
                            {result.typeSafe ? 'openapi-fetch' : 'raw fetch'}
                          </span>
                          <StatusBadge status={result.status} ok={result.ok} />
                        </div>
                        {result.error && (
                          <p className="text-[10px] text-destructive mb-1">{result.error}</p>
                        )}
                        <pre className="text-[10px] bg-muted rounded p-2 overflow-auto max-h-48 text-muted-foreground leading-relaxed">
                          {safeStringify(result.data)}
                        </pre>
                      </div>
                    )}

                    {typedResult && (
                      <div className="mt-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-medium text-primary uppercase">
                            openapi-fetch (type-safe)
                          </span>
                          <StatusBadge status={typedResult.status} ok={typedResult.ok} />
                          <span className="text-[10px] text-muted-foreground">
                            {typedResult.duration}ms
                          </span>
                        </div>
                        <pre className="text-[10px] bg-primary/5 rounded p-2 overflow-auto max-h-48 text-muted-foreground leading-relaxed border border-primary/10">
                          {safeStringify(typedResult.data)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Code example */}
        <div className="mt-10 border border-border rounded-lg p-4">
          <h2 className="text-sm font-semibold mb-3">Usage Example: openapi-fetch</h2>
          <pre className="text-xs bg-muted rounded p-4 overflow-auto text-muted-foreground leading-relaxed">{`import { createNodeClient, createHostingClient } from '@mobazha/core/services/api/openapi-client';

// Type-safe node API calls
const node = createNodeClient();
const { data, error } = await node.GET('/v1/profiles', {});
//    ^? data is fully typed from openapi.yaml

// Type-safe hosting API calls
const hosting = createHostingClient();
const { data: groups } = await hosting.GET('/api/v1/product-groups', {});

// Path parameters are type-checked
const { data: order } = await node.GET('/v1/orders/{orderID}', {
  params: { path: { orderID: 'abc123' } }
});

// Health check (also type-safe)
const { data: health } = await hosting.GET('/healthz', {});
//    ^? { status: string; timestamp: string; ... }

// POST with typed body
const { data: result } = await node.POST('/v1/orders/purchase', {
  body: { /* typed request body */ }
});`}</pre>
        </div>

        {/* Footer */}
        <footer className="mt-6 text-[10px] text-muted-foreground border-t border-border pt-4">
          OpenAPI spec: <code className="bg-muted px-1 rounded">api/docs/openapi.yaml</code>{' '}
          &middot; Types:{' '}
          <code className="bg-muted px-1 rounded">packages/core/types/api-generated.d.ts</code>{' '}
          &middot; Client:{' '}
          <code className="bg-muted px-1 rounded">
            packages/core/services/api/openapi-client.ts
          </code>
        </footer>
      </div>
    </div>
  );
}
