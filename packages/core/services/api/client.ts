/**
 * API 客户端基础
 */

// ApiResponse type imported but used only for documentation
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { ApiResponse as _ApiResponse } from '../../types';
import { isStandaloneBuyerAuth, getBuyerGatewayUrl } from './config';

/**
 * 401 回调注册（用于通知 userStore 触发会话过期流程）
 * 避免 API client 直接依赖 store（防止循环依赖）
 */
type UnauthorizedCallback = () => void;
let onUnauthorizedCallback: UnauthorizedCallback | null = null;

/**
 * 注册 401 未授权回调
 * 由 userStore 初始化时调用
 */
export function onUnauthorized(callback: UnauthorizedCallback): void {
  onUnauthorizedCallback = callback;
}

/**
 * 请求选项
 */
export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: unknown;
  timeout?: number;
}

/**
 * API 错误
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * 发起 API 请求
 */
export async function request<T>(url: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', headers = {}, body, timeout = 30000 } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const requestInit: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      signal: controller.signal,
    };

    if (body && method !== 'GET') {
      requestInit.body = JSON.stringify(body);
    }

    const response = await fetch(url, requestInit);

    if (!response.ok) {
      if (response.status === 401 && onUnauthorizedCallback) {
        // In standalone buyer mode, a 401 from the local node means the
        // request hit a private seller route — not a buyer token issue.
        // Only trigger forceLogout when the buyer's own SaaS token is rejected.
        const isLocalNodeReject = isStandaloneBuyerAuth() && !url.startsWith(getBuyerGatewayUrl());
        if (!isLocalNodeReject) {
          onUnauthorizedCallback();
        }
      }
      throw new ApiError(`HTTP ${response.status}: ${response.statusText}`, response.status);
    }

    const data = await response.json();
    return data as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new ApiError('Request timeout', undefined, 'TIMEOUT');
      }
      throw new ApiError(error.message);
    }

    throw new ApiError('Unknown error');
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * GET 请求
 */
export async function get<T>(url: string, headers?: Record<string, string>): Promise<T> {
  return request<T>(url, { method: 'GET', headers });
}

/**
 * POST 请求
 */
export async function post<T>(
  url: string,
  body?: unknown,
  headers?: Record<string, string>
): Promise<T> {
  return request<T>(url, { method: 'POST', body, headers });
}

/**
 * PUT 请求
 */
export async function put<T>(
  url: string,
  body?: unknown,
  headers?: Record<string, string>
): Promise<T> {
  return request<T>(url, { method: 'PUT', body, headers });
}

/**
 * DELETE 请求
 */
export async function del<T>(url: string, headers?: Record<string, string>): Promise<T> {
  return request<T>(url, { method: 'DELETE', headers });
}

/**
 * 安全请求（捕获错误返回空数组）
 */
export async function safeRequest<T>(
  url: string,
  options: RequestOptions = {},
  fallback: T
): Promise<T> {
  try {
    return await request<T>(url, options);
  } catch (error) {
    console.warn('[API] Request failed:', url, error);
    return fallback;
  }
}

/**
 * API 客户端对象 (用于对象风格调用)
 */
export const apiClient = {
  request,
  get,
  post,
  put,
  delete: del,
  safeRequest,
};
