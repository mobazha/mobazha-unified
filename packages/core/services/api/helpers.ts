/**
 * Three-Layer API Helpers
 *
 * URL 路由策略集中在此文件。API 服务文件应使用这些 helper 而非直接引用
 * getGatewayUrl / getMyGatewayUrl / getSearchUrl，从而将"URL 选择"
 * 从上百个分散决策点收敛到三个集中入口。
 *
 * Layer 1 — auth*:      需要认证且按当前角色路由的端点
 *                        独立站买家 → SaaS，其他 → 本地节点/hosting
 * Layer 1b — nodeAuth*:  需要认证但必须走本地节点的管理端点
 *                        system、wallet-rpc、AI/MCP local admin
 * Layer 2 — public*:    公开店铺路由（始终走本地节点，含认证和店铺上下文）
 *                        listings、profiles、ratings、exchange rates
 * Layer 2a — anonymous*: 匿名买家路由（保留店铺上下文，但强制移除认证）
 *                        guest checkout settings/order/status
 * Layer 3 — search*:    搜索/发现服务（含群组上下文）
 *                        trending、featured、search results
 */

import { get, post, put, del, request, safeRequest } from './client';
import type { RequestOptions } from './client';
import {
  getMyGatewayUrl,
  getGatewayUrl,
  getSearchUrl,
  getHostingUrl,
  getAuthHeaders,
  getHeadersWithContext,
} from './config';

// =====================================================================
// Layer 1: Authenticated — routes by current role via getMyGatewayUrl()
// =====================================================================

export function authGet<T>(path: string, headers?: Record<string, string>): Promise<T> {
  return get<T>(`${getMyGatewayUrl()}${path}`, {
    ...getAuthHeaders(),
    ...headers,
  });
}

// Layer 1b: Authenticated local node — bypass standalone-buyer SaaS routing
// for node-local resources that do not exist behind the buyer gateway.
export function nodeAuthGet<T>(path: string): Promise<T> {
  return get<T>(`${getGatewayUrl()}${path}`, getAuthHeaders());
}

export function nodeAuthPost<T>(
  path: string,
  body?: unknown,
  headers?: Record<string, string>
): Promise<T> {
  return post<T>(`${getGatewayUrl()}${path}`, body, {
    ...getAuthHeaders(),
    ...headers,
  });
}

export function nodeAuthPut<T>(path: string, body?: unknown): Promise<T> {
  return put<T>(`${getGatewayUrl()}${path}`, body, getAuthHeaders());
}

export function nodeAuthPatch<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(`${getGatewayUrl()}${path}`, {
    method: 'PATCH',
    body,
    headers: getAuthHeaders(),
  });
}

export function nodeAuthDel<T>(path: string): Promise<T> {
  return del<T>(`${getGatewayUrl()}${path}`, getAuthHeaders());
}

export function nodeAuthSafeGet<T>(
  path: string,
  fallback: T,
  opts?: { timeout?: number }
): Promise<T> {
  const reqOpts: RequestOptions = { headers: getAuthHeaders() };
  if (opts?.timeout) reqOpts.timeout = opts.timeout;
  return safeRequest<T>(`${getGatewayUrl()}${path}`, reqOpts, fallback);
}

export function nodeAuthRequest<T>(
  path: string,
  reqOpts: Omit<RequestOptions, 'headers'>
): Promise<T> {
  return request<T>(`${getGatewayUrl()}${path}`, {
    ...reqOpts,
    headers: getAuthHeaders(),
  });
}

export function authPost<T>(
  path: string,
  body?: unknown,
  headers?: Record<string, string>
): Promise<T> {
  return post<T>(`${getMyGatewayUrl()}${path}`, body, {
    ...getAuthHeaders(),
    ...headers,
  });
}

export function authPut<T>(path: string, body?: unknown): Promise<T> {
  return put<T>(`${getMyGatewayUrl()}${path}`, body, getAuthHeaders());
}

export function authPatch<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(`${getMyGatewayUrl()}${path}`, {
    method: 'PATCH',
    body,
    headers: getAuthHeaders(),
  });
}

export function authDel<T>(path: string): Promise<T> {
  return del<T>(`${getMyGatewayUrl()}${path}`, getAuthHeaders());
}

export function authSafeGet<T>(path: string, fallback: T, opts?: { timeout?: number }): Promise<T> {
  const reqOpts: RequestOptions = { headers: getAuthHeaders() };
  if (opts?.timeout) reqOpts.timeout = opts.timeout;
  return safeRequest<T>(`${getMyGatewayUrl()}${path}`, reqOpts, fallback);
}

export function authRequest<T>(path: string, reqOpts: Omit<RequestOptions, 'headers'>): Promise<T> {
  return request<T>(`${getMyGatewayUrl()}${path}`, {
    ...reqOpts,
    headers: getAuthHeaders(),
  });
}

// =====================================================================
// Layer 2: Public — always local node via getGatewayUrl(), with context
// =====================================================================

export function publicGet<T>(path: string): Promise<T> {
  return get<T>(`${getGatewayUrl()}${path}`, getHeadersWithContext());
}

export function publicGetWithHeaders<T>(path: string, headers: Record<string, string>): Promise<T> {
  return get<T>(`${getGatewayUrl()}${path}`, {
    ...getHeadersWithContext(),
    ...headers,
  });
}

export function publicPost<T>(path: string, body?: unknown): Promise<T> {
  return post<T>(`${getGatewayUrl()}${path}`, body, getHeadersWithContext());
}

function anonymousHeadersWithContext(): Record<string, string> {
  return Object.fromEntries(
    Object.entries(getHeadersWithContext()).filter(([key]) => key.toLowerCase() !== 'authorization')
  );
}

// Layer 2a: Anonymous buyer — store routing context without credentials

/** Public buyer request that preserves routing context but never sends user/admin credentials. */
export function anonymousGet<T>(
  path: string,
  options?: Pick<RequestOptions, 'signal' | 'timeout'>
): Promise<T> {
  const url = `${getGatewayUrl()}${path}`;
  const headers = anonymousHeadersWithContext();
  if (!options) return get<T>(url, headers);
  return request<T>(url, { ...options, method: 'GET', headers });
}

/** Public buyer mutation that preserves routing context but never sends user/admin credentials. */
export function anonymousPost<T>(
  path: string,
  body?: unknown,
  options?: Pick<RequestOptions, 'signal' | 'timeout'>
): Promise<T> {
  const url = `${getGatewayUrl()}${path}`;
  const headers = anonymousHeadersWithContext();
  if (!options) return post<T>(url, body, headers);
  return request<T>(url, { ...options, method: 'POST', body, headers });
}

export function publicSafeGet<T>(
  path: string,
  fallback: T,
  opts?: { timeout?: number }
): Promise<T> {
  const reqOpts: RequestOptions = { headers: getHeadersWithContext() };
  if (opts?.timeout) reqOpts.timeout = opts.timeout;
  return safeRequest<T>(`${getGatewayUrl()}${path}`, reqOpts, fallback);
}

// =====================================================================
// Layer H: Hosting Platform — /platform/v1/* via getHostingUrl()
// =====================================================================

export function hostingGet<T>(path: string): Promise<T> {
  return get<T>(`${getHostingUrl()}${path}`, getAuthHeaders());
}

export function hostingPost<T>(path: string, body?: unknown): Promise<T> {
  return post<T>(`${getHostingUrl()}${path}`, body, getAuthHeaders());
}

export function hostingPut<T>(path: string, body?: unknown): Promise<T> {
  return put<T>(`${getHostingUrl()}${path}`, body, getAuthHeaders());
}

export function hostingPatch<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(`${getHostingUrl()}${path}`, {
    method: 'PATCH',
    body,
    headers: getAuthHeaders(),
  });
}

export function hostingDel<T>(path: string): Promise<T> {
  return del<T>(`${getHostingUrl()}${path}`, getAuthHeaders());
}

// =====================================================================
// Layer 3: Search — search/discovery service via getSearchUrl()
// =====================================================================

export function searchGet<T>(path: string): Promise<T> {
  return get<T>(`${getSearchUrl()}${path}`, getHeadersWithContext());
}

export function searchSafeGet<T>(path: string, fallback: T): Promise<T> {
  return safeRequest<T>(`${getSearchUrl()}${path}`, { headers: getHeadersWithContext() }, fallback);
}

/**
 * Search GET that preserves the full response envelope (data + meta).
 * Use for endpoints returning `{ "data": [...], "meta": { "total": N } }`.
 */
export function searchRawGet<T>(path: string, fallback: T): Promise<T> {
  return safeRequest<T>(
    `${getSearchUrl()}${path}`,
    { headers: getHeadersWithContext(), raw: true },
    fallback
  );
}

export function searchPost<T>(path: string, body?: unknown): Promise<T> {
  return post<T>(`${getSearchUrl()}${path}`, body, getHeadersWithContext());
}
