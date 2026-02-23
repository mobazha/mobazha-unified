/**
 * Three-Layer API Helpers
 *
 * URL 路由策略集中在此文件。API 服务文件应使用这些 helper 而非直接引用
 * getGatewayUrl / getMyGatewayUrl / getSearchUrl，从而将"URL 选择"
 * 从上百个分散决策点收敛到三个集中入口。
 *
 * Layer 1 — auth*:    所有需要认证的端点（按当前角色路由）
 *                      独立站买家 → SaaS，其他 → 本地节点/hosting
 * Layer 2 — public*:  公开店铺数据（始终走本地节点，含群组上下文）
 *                      listings、profiles、ratings、exchange rates
 * Layer 3 — search*:  搜索/发现服务（含群组上下文）
 *                      trending、featured、search results
 */

import { get, post, put, del, request, safeRequest } from './client';
import type { RequestOptions } from './client';
import {
  getMyGatewayUrl,
  getGatewayUrl,
  getSearchUrl,
  getAuthHeaders,
  getHeadersWithContext,
} from './config';

// =====================================================================
// Layer 1: Authenticated — routes by current role via getMyGatewayUrl()
// =====================================================================

export function authGet<T>(path: string): Promise<T> {
  return get<T>(`${getMyGatewayUrl()}${path}`, getAuthHeaders());
}

export function authPost<T>(path: string, body?: unknown): Promise<T> {
  return post<T>(`${getMyGatewayUrl()}${path}`, body, getAuthHeaders());
}

export function authPut<T>(path: string, body?: unknown): Promise<T> {
  return put<T>(`${getMyGatewayUrl()}${path}`, body, getAuthHeaders());
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

export function publicPost<T>(path: string, body?: unknown): Promise<T> {
  return post<T>(`${getGatewayUrl()}${path}`, body, getHeadersWithContext());
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
// Layer 3: Search — search/discovery service via getSearchUrl()
// =====================================================================

export function searchGet<T>(path: string): Promise<T> {
  return get<T>(`${getSearchUrl()}${path}`, getHeadersWithContext());
}

export function searchSafeGet<T>(path: string, fallback: T): Promise<T> {
  return safeRequest<T>(`${getSearchUrl()}${path}`, { headers: getHeadersWithContext() }, fallback);
}

export function searchPost<T>(path: string, body?: unknown): Promise<T> {
  return post<T>(`${getSearchUrl()}${path}`, body, getHeadersWithContext());
}
