export interface CommerceHttpClientOptions {
  baseUrl?: string;
  getAuthorization?: () => string | undefined;
  fetchImpl?: typeof fetch;
}

export interface CommerceHttpClient {
  request<T>(path: string, init?: RequestInit): Promise<T>;
}

export function createCommerceHttpClient(
  options: CommerceHttpClientOptions = {}
): CommerceHttpClient {
  const fetchImpl = options.fetchImpl ?? fetch;
  const baseUrl = options.baseUrl?.replace(/\/$/, '') ?? '';
  return {
    async request<T>(path: string, init: RequestInit = {}): Promise<T> {
      const headers = new Headers(init.headers);
      if (!headers.has('Accept')) headers.set('Accept', 'application/json');
      const authorization = options.getAuthorization?.();
      if (authorization && !headers.has('Authorization')) {
        headers.set('Authorization', authorization);
      }
      const response = await fetchImpl(`${baseUrl}${path}`, {
        ...init,
        headers,
        credentials: init.credentials ?? 'same-origin',
      });
      if (!response.ok) {
        throw new Error(`commerce API request failed: ${response.status}`);
      }
      if (response.status === 204) return undefined as T;
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
    },
  };
}
