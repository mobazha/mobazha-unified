/**
 * API 客户端基础
 */

// ApiResponse type imported but used only for documentation
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { ApiResponse as _ApiResponse } from '../../types';

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
