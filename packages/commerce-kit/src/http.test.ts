import { afterEach, describe, expect, it, vi } from 'vitest';
import { CommerceHttpError, createCommerceHttpClient } from './http';

afterEach(() => {
  vi.useRealTimers();
});

describe('createCommerceHttpClient', () => {
  it('adds authorization and request ID headers and unwraps data envelopes', async () => {
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const headers = new Headers(init?.headers);
      expect(headers.get('Authorization')).toBe('Bearer token');
      expect(headers.get('X-Request-ID')).toBe('request-1');
      expect(init?.credentials).toBe('same-origin');
      return Response.json({ data: { ok: true } });
    });
    const client = createCommerceHttpClient({
      baseUrl: 'https://node.example/',
      getAuthorization: () => 'Bearer token',
      createRequestId: () => 'request-1',
      fetchImpl,
    });

    await expect(client.request<{ ok: boolean }>('/v1/status')).resolves.toEqual({ ok: true });
    expect(fetchImpl).toHaveBeenCalledWith('https://node.example/v1/status', expect.any(Object));
  });

  it('exposes HTTP status, response request ID and parsed error body', async () => {
    const client = createCommerceHttpClient({
      createRequestId: () => 'client-request',
      fetchImpl: async () =>
        Response.json(
          { error: { message: 'checkout disabled', code: 'CHECKOUT_DISABLED' } },
          { status: 409, headers: { 'X-Request-ID': 'server-request' } }
        ),
    });

    const error = await client.request('/v1/guest/orders').catch((cause: unknown) => cause);

    expect(error).toBeInstanceOf(CommerceHttpError);
    expect(error).toMatchObject({
      kind: 'http',
      status: 409,
      requestId: 'server-request',
      message: 'checkout disabled',
      body: { error: { message: 'checkout disabled', code: 'CHECKOUT_DISABLED' } },
    });
  });

  it('distinguishes request timeouts from caller cancellation', async () => {
    vi.useFakeTimers();
    const fetchImpl: typeof fetch = vi.fn(
      async (_input, init): Promise<Response> =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(init.signal?.reason), {
            once: true,
          });
        })
    );
    const client = createCommerceHttpClient({
      timeoutMs: 25,
      createRequestId: () => 'timed-request',
      fetchImpl,
    });
    const timeoutRequest = client.request('/slow');
    const timeoutExpectation = expect(timeoutRequest).rejects.toMatchObject({
      kind: 'timeout',
      requestId: 'timed-request',
    });
    await vi.advanceTimersByTimeAsync(25);
    await timeoutExpectation;

    const caller = new AbortController();
    const abortedRequest = client.request('/cancelled', {
      signal: caller.signal,
      timeoutMs: 0,
      requestId: 'cancelled-request',
    });
    caller.abort();
    await expect(abortedRequest).rejects.toMatchObject({
      kind: 'aborted',
      requestId: 'cancelled-request',
    });
  });

  it('wraps network and invalid JSON failures with stable error kinds', async () => {
    const networkCause = new TypeError('fetch failed');
    const networkClient = createCommerceHttpClient({
      createRequestId: () => 'network-request',
      fetchImpl: async () => {
        throw networkCause;
      },
    });
    await expect(networkClient.request('/offline')).rejects.toMatchObject({
      kind: 'network',
      requestId: 'network-request',
      cause: networkCause,
    });

    const invalidClient = createCommerceHttpClient({
      createRequestId: () => 'invalid-request',
      fetchImpl: async () => new Response('not-json', { status: 200 }),
    });
    await expect(invalidClient.request('/invalid')).rejects.toMatchObject({
      kind: 'invalid-response',
      status: 200,
      requestId: 'invalid-request',
    });
  });
});
