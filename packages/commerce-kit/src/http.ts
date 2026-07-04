export type CommerceHttpErrorKind = 'http' | 'network' | 'timeout' | 'aborted' | 'invalid-response';

export interface CommerceHttpErrorDetails {
  kind: CommerceHttpErrorKind;
  status?: number;
  requestId?: string;
  body?: unknown;
  cause?: unknown;
}

export class CommerceHttpError extends Error {
  readonly kind: CommerceHttpErrorKind;
  readonly status?: number;
  readonly requestId?: string;
  readonly body?: unknown;
  override readonly cause?: unknown;

  constructor(message: string, details: CommerceHttpErrorDetails) {
    super(message);
    this.name = 'CommerceHttpError';
    this.kind = details.kind;
    this.status = details.status;
    this.requestId = details.requestId;
    this.body = details.body;
    this.cause = details.cause;
  }
}

export interface CommerceRequestInit extends RequestInit {
  timeoutMs?: number;
  requestId?: string;
}

export interface CommerceHttpClientOptions {
  baseUrl?: string;
  getAuthorization?: () => string | undefined;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  createRequestId?: () => string;
}

export interface CommerceHttpClient {
  request<T>(path: string, init?: CommerceRequestInit): Promise<T>;
}

let fallbackRequestSequence = 0;

function createDefaultRequestId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  fallbackRequestSequence += 1;
  return `commerce-${Date.now().toString(36)}-${fallbackRequestSequence.toString(36)}`;
}

function responseRequestId(response: Response, fallback: string): string {
  return response.headers.get('X-Request-ID') ?? fallback;
}

async function readErrorBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function httpErrorMessage(status: number, body: unknown): string {
  if (body && typeof body === 'object') {
    for (const key of ['message', 'error']) {
      const value = Reflect.get(body, key);
      if (typeof value === 'string' && value.trim()) return value;
      if (value && typeof value === 'object') {
        const nestedMessage = Reflect.get(value, 'message');
        if (typeof nestedMessage === 'string' && nestedMessage.trim()) return nestedMessage;
      }
    }
  }
  return `commerce API request failed: ${status}`;
}

export function createCommerceHttpClient(
  options: CommerceHttpClientOptions = {}
): CommerceHttpClient {
  const fetchImpl = options.fetchImpl ?? fetch;
  const baseUrl = options.baseUrl?.replace(/\/$/, '') ?? '';
  const defaultTimeoutMs = options.timeoutMs ?? 30_000;
  const createRequestId = options.createRequestId ?? createDefaultRequestId;

  return {
    async request<T>(path: string, init: CommerceRequestInit = {}): Promise<T> {
      const {
        timeoutMs = defaultTimeoutMs,
        requestId: requestedRequestId,
        signal: externalSignal,
        ...requestInit
      } = init;
      const headers = new Headers(requestInit.headers);
      if (!headers.has('Accept')) headers.set('Accept', 'application/json');
      const authorization = options.getAuthorization?.();
      if (authorization && !headers.has('Authorization')) {
        headers.set('Authorization', authorization);
      }
      const requestId = requestedRequestId ?? headers.get('X-Request-ID') ?? createRequestId();
      if (!headers.has('X-Request-ID')) headers.set('X-Request-ID', requestId);

      const controller = new AbortController();
      let timedOut = false;
      const abortFromExternal = (): void => controller.abort(externalSignal?.reason);
      if (externalSignal?.aborted) {
        abortFromExternal();
      } else {
        externalSignal?.addEventListener('abort', abortFromExternal, { once: true });
      }
      const normalizedTimeoutMs = Number.isFinite(timeoutMs) ? Math.max(0, timeoutMs) : 0;
      const timeoutId = normalizedTimeoutMs
        ? setTimeout(() => {
            timedOut = true;
            controller.abort();
          }, normalizedTimeoutMs)
        : undefined;

      try {
        const response = await fetchImpl(`${baseUrl}${path}`, {
          ...requestInit,
          headers,
          credentials: requestInit.credentials ?? 'same-origin',
          signal: controller.signal,
        });
        const resolvedRequestId = responseRequestId(response, requestId);
        if (!response.ok) {
          const body = await readErrorBody(response);
          throw new CommerceHttpError(httpErrorMessage(response.status, body), {
            kind: 'http',
            status: response.status,
            requestId: resolvedRequestId,
            body,
          });
        }
        if (response.status === 204) return undefined as T;
        try {
          const payload = (await response.json()) as T | { data?: T };
          if (
            payload &&
            typeof payload === 'object' &&
            'data' in payload &&
            payload.data !== undefined
          ) {
            return payload.data;
          }
          return payload as T;
        } catch (cause) {
          throw new CommerceHttpError('commerce API returned invalid JSON', {
            kind: 'invalid-response',
            status: response.status,
            requestId: resolvedRequestId,
            cause,
          });
        }
      } catch (cause) {
        if (cause instanceof CommerceHttpError) throw cause;
        if (timedOut) {
          throw new CommerceHttpError('commerce API request timed out', {
            kind: 'timeout',
            requestId,
            cause,
          });
        }
        if (externalSignal?.aborted || controller.signal.aborted) {
          throw new CommerceHttpError('commerce API request was aborted', {
            kind: 'aborted',
            requestId,
            cause,
          });
        }
        throw new CommerceHttpError('commerce API network request failed', {
          kind: 'network',
          requestId,
          cause,
        });
      } finally {
        if (timeoutId !== undefined) clearTimeout(timeoutId);
        externalSignal?.removeEventListener('abort', abortFromExternal);
      }
    },
  };
}
