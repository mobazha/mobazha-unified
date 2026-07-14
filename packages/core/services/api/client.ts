/**
 * API client with standard envelope unwrapping.
 *
 * Success responses are wrapped in {"data": T} or {"data": T[], "meta": {...}}.
 * Error responses are wrapped in {"error": {"code": "...", "message": "...", "details": [...]}}.
 */

import type { ErrorEnvelope, ApiErrorCode } from '../../types';
import { isStandaloneBuyerAuth, getBuyerGatewayUrl } from './config';
import { getStoredToken } from '../auth/token';
import { isTransientRequestError } from './transientErrors';

/**
 * Return true if the token was refreshed and the request should be retried.
 * Return false to propagate the 401 error (fallback to forceLogout).
 */
type UnauthorizedCallback = () => boolean | Promise<boolean>;
let onUnauthorizedCallback: UnauthorizedCallback | null = null;

export function onUnauthorized(callback: UnauthorizedCallback): void {
  onUnauthorizedCallback = callback;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: unknown;
  timeout?: number;
  signal?: AbortSignal;
  keepalive?: boolean;
  /** If true, return the raw JSON without unwrapping the data envelope. */
  raw?: boolean;
  /** Do not treat an expected anonymous 401 as an expired signed-in session. */
  skipUnauthorizedHandler?: boolean;
  /** @internal Prevent infinite 401 retry loops. */
  _retried?: boolean;
  /** @internal Prevent infinite transient network retry loops. */
  _networkRetried?: boolean;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: ApiErrorCode | string,
    public details?: Array<{ field: string; message: string }>,
    public detail?: string,
    public traceID?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }

  toDiagnostic(): string {
    return [
      `Code: ${this.code || 'UNKNOWN'}`,
      this.detail && `Detail: ${this.detail}`,
      this.traceID && `Trace: ${this.traceID}`,
      `Time: ${new Date().toISOString()}`,
    ]
      .filter(Boolean)
      .join('\n');
  }
}

/**
 * Parse a structured error envelope from the response body.
 * Falls back to status text if the body is not in envelope format.
 */
async function parseErrorResponse(response: Response): Promise<ApiError> {
  try {
    const body = await response.json();
    if (body?.error?.code && body?.error?.message) {
      const { code, message, detail, traceID, details } = body.error as ErrorEnvelope['error'];
      return new ApiError(message, response.status, code, details, detail, traceID);
    }
    const fallbackMsg = body?.error?.message || body?.error || body?.message || response.statusText;
    return new ApiError(String(fallbackMsg), response.status);
  } catch {
    return new ApiError(response.statusText, response.status);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Core request function with envelope unwrapping.
 *
 * Transient GET failures (Tor / upstream blips) retry once after 400ms.
 * Timeouts, 401 refresh, and store-offline 503s are not retried here.
 *
 * For 204 No Content, returns `undefined` (callers should type as `T | void`).
 * For success responses, unwraps `{data: T}` and returns `T`.
 * For error responses, throws `ApiError` with structured code/details.
 */
export async function request<T>(url: string, options: RequestOptions = {}): Promise<T> {
  const {
    method = 'GET',
    headers = {},
    body,
    timeout = 30000,
    signal: externalSignal,
    keepalive = false,
    raw = false,
    skipUnauthorizedHandler = false,
    _retried = false,
    _networkRetried = false,
  } = options;

  const controller = new AbortController();
  let timedOut = false;
  const abortFromExternal = (): void => controller.abort(externalSignal?.reason);
  if (externalSignal?.aborted) {
    abortFromExternal();
  } else {
    externalSignal?.addEventListener('abort', abortFromExternal, { once: true });
  }
  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeout);

  try {
    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
    const mergedHeaders: Record<string, string> = { ...headers };
    if (isFormData) {
      // Let the browser set multipart boundary; strip any inherited JSON Content-Type.
      for (const key of Object.keys(mergedHeaders)) {
        if (key.toLowerCase() === 'content-type') {
          delete mergedHeaders[key];
        }
      }
    } else {
      mergedHeaders['Content-Type'] = mergedHeaders['Content-Type'] ?? 'application/json';
    }

    const requestInit: RequestInit = {
      method,
      headers: mergedHeaders,
      signal: controller.signal,
      keepalive,
    };

    if (body && method !== 'GET') {
      requestInit.body = isFormData ? body : JSON.stringify(body);
    }

    const response = await fetch(url, requestInit);

    if (!response.ok) {
      if (
        response.status === 401 &&
        !skipUnauthorizedHandler &&
        onUnauthorizedCallback &&
        !_retried
      ) {
        const isLocalNodeReject = isStandaloneBuyerAuth() && !url.startsWith(getBuyerGatewayUrl());
        // Basic-auth admin hitting a platform/hosting endpoint that only
        // accepts JWTs — the 401 is expected, not a session expiry signal.
        const isBasicOnPlatform =
          getStoredToken()?.startsWith('basic:') && /\/platform\//.test(url);
        if (!isLocalNodeReject && !isBasicOnPlatform) {
          const refreshed = await Promise.resolve(onUnauthorizedCallback());
          if (refreshed) {
            clearTimeout(timeoutId);
            return request<T>(url, { ...options, _retried: true });
          }
        }
      }
      throw await parseErrorResponse(response);
    }

    if (response.status === 204) {
      return undefined as unknown as T;
    }

    const json = await response.json();

    if (raw) {
      return json as T;
    }

    if (json !== null && typeof json === 'object' && 'data' in json) {
      return json.data as T;
    }

    return json as T;
  } catch (error) {
    const canRetryNetwork = !_networkRetried && method === 'GET' && isTransientRequestError(error);
    if (canRetryNetwork) {
      clearTimeout(timeoutId);
      await sleep(400);
      return request<T>(url, { ...options, _networkRetried: true });
    }

    if (error instanceof ApiError) {
      throw error;
    }

    if (timedOut) {
      throw new ApiError('Request timeout', undefined, 'TIMEOUT');
    }
    if (externalSignal?.aborted) {
      throw new ApiError('Request aborted', undefined, 'ABORTED');
    }

    if (
      error !== null &&
      typeof error === 'object' &&
      Reflect.get(error, 'name') === 'AbortError'
    ) {
      throw new ApiError('Request timeout', undefined, 'TIMEOUT');
    }

    if (error instanceof Error) {
      throw new ApiError(error.message);
    }

    throw new ApiError('Unknown error');
  } finally {
    clearTimeout(timeoutId);
    externalSignal?.removeEventListener('abort', abortFromExternal);
  }
}

export async function get<T>(url: string, headers?: Record<string, string>): Promise<T> {
  return request<T>(url, { method: 'GET', headers });
}

export async function post<T>(
  url: string,
  body?: unknown,
  headers?: Record<string, string>
): Promise<T> {
  return request<T>(url, { method: 'POST', body, headers });
}

export async function put<T>(
  url: string,
  body?: unknown,
  headers?: Record<string, string>
): Promise<T> {
  return request<T>(url, { method: 'PUT', body, headers });
}

export async function del<T>(url: string, headers?: Record<string, string>): Promise<T> {
  return request<T>(url, { method: 'DELETE', headers });
}

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
 * Check if an error indicates the target store is unavailable (offline or unreachable).
 * The backend cross-store proxy returns 503 with code STORE_UNAVAILABLE / SERVICE_UNAVAILABLE.
 */
export function isStoreUnavailableError(err: unknown): boolean {
  if (err instanceof ApiError && err.status === 503) {
    return err.code === 'STORE_UNAVAILABLE' || err.code === 'SERVICE_UNAVAILABLE';
  }
  return false;
}

export const apiClient = {
  request,
  get,
  post,
  put,
  delete: del,
  safeRequest,
};
