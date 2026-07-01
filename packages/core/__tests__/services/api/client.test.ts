import { describe, it, expect, vi, beforeEach } from 'vitest';
import { request, onUnauthorized } from '../../../services/api/client';

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: () => Promise.resolve(body),
    headers: new Headers(),
  } as unknown as Response;
}

function noContentResponse(): Response {
  return {
    ok: true,
    status: 204,
    statusText: 'No Content',
    json: () => Promise.reject(new Error('No body')),
    headers: new Headers(),
  } as unknown as Response;
}

beforeEach(() => {
  vi.mocked(globalThis.fetch).mockReset();
});

describe('client.request — envelope unwrapping', () => {
  it('unwraps {data: T} for single object', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      jsonResponse(200, { data: { id: 1, name: 'test' } })
    );
    const result = await request<{ id: number; name: string }>('http://api/test');
    expect(result).toEqual({ id: 1, name: 'test' });
  });

  it('unwraps {data: T[]} for array', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(jsonResponse(200, { data: [1, 2, 3] }));
    const result = await request<number[]>('http://api/test');
    expect(result).toEqual([1, 2, 3]);
  });

  it('unwraps list envelope {data: T[], meta: {...}}', async () => {
    const envelope = { data: [{ id: 1 }], meta: { total: 100, limit: 10 } };
    vi.mocked(globalThis.fetch).mockResolvedValue(jsonResponse(200, envelope));
    const result = await request<Array<{ id: number }>>('http://api/test');
    expect(result).toEqual([{ id: 1 }]);
  });

  it('returns raw JSON when raw=true', async () => {
    const envelope = { data: { id: 1 }, meta: { total: 1 } };
    vi.mocked(globalThis.fetch).mockResolvedValue(jsonResponse(200, envelope));
    const result = await request('http://api/test', { raw: true });
    expect(result).toEqual(envelope);
  });

  it('returns undefined for 204 No Content', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(noContentResponse());
    const result = await request('http://api/test', { method: 'DELETE' });
    expect(result).toBeUndefined();
  });

  it('passes through non-envelope responses', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(jsonResponse(200, { token: 'abc' }));
    const result = await request<{ token: string }>('http://api/test');
    expect(result).toEqual({ token: 'abc' });
  });
});

describe('client.request — structured error parsing', () => {
  it('parses error envelope with code and message', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      jsonResponse(400, {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Name required',
          details: [{ field: 'name', message: 'required' }],
        },
      })
    );
    await expect(request('http://api/test')).rejects.toMatchObject({
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'Name required',
      details: [{ field: 'name', message: 'required' }],
    });
  });

  it('falls back to plain error string', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(jsonResponse(500, { error: 'something broke' }));
    await expect(request('http://api/test')).rejects.toMatchObject({
      status: 500,
      message: 'something broke',
    });
  });

  it('handles non-JSON error body', async () => {
    const resp = {
      ok: false,
      status: 502,
      statusText: 'Bad Gateway',
      json: () => Promise.reject(new Error('not json')),
      headers: new Headers(),
    } as unknown as Response;
    vi.mocked(globalThis.fetch).mockResolvedValue(resp);
    await expect(request('http://api/test')).rejects.toMatchObject({
      status: 502,
      message: 'Bad Gateway',
    });
  });
});

describe('client.request — 401 callback', () => {
  it('invokes onUnauthorized callback on 401', async () => {
    const callback = vi.fn();
    onUnauthorized(callback);
    vi.mocked(globalThis.fetch).mockResolvedValue(
      jsonResponse(401, { error: { code: 'UNAUTHORIZED', message: 'expired' } })
    );
    await expect(request('http://api/test')).rejects.toThrow();
    expect(callback).toHaveBeenCalled();
  });
});

describe('client.request — multipart body', () => {
  it('sends FormData without forcing application/json Content-Type', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(jsonResponse(200, { data: { ok: true } }));
    const formData = new FormData();
    formData.append('file', new Blob(['a']), 'test.csv');
    await request<{ ok: boolean }>('http://api/upload', { method: 'POST', body: formData });
    const [, init] = vi.mocked(globalThis.fetch).mock.calls[0] as [string, RequestInit];
    expect(init.body).toBe(formData);
    const headers = init.headers as Record<string, string>;
    expect(headers['Content-Type']).toBeUndefined();
  });

  it('strips inherited application/json Content-Type when body is FormData', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(jsonResponse(200, { data: { ok: true } }));
    const formData = new FormData();
    formData.append('file', new Blob(['a']), 'test.csv');
    await request<{ ok: boolean }>('http://api/upload', {
      method: 'POST',
      body: formData,
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer tok' },
    });
    const [, init] = vi.mocked(globalThis.fetch).mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers['Content-Type']).toBeUndefined();
    expect(headers.Authorization).toBe('Bearer tok');
  });
});
