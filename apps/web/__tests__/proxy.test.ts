// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import { afterEach, describe, expect, it, vi } from 'vitest';

describe('Next.js backend proxy', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('prefers the Docker-internal API URL for server-side requests', async () => {
    vi.stubEnv('INTERNAL_API_URL', 'http://hosting:8080');
    vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'http://localhost:18080');

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: 'token' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    const [{ NextRequest }, { proxy }] = await Promise.all([
      import('next/server'),
      import('../src/proxy'),
    ]);
    const request = new NextRequest(
      'http://localhost:3000/platform/v1/auth/signin?code=test-code&state=test-state',
      { method: 'POST' }
    );

    const response = await proxy(request);

    expect(fetchMock).toHaveBeenCalledWith(
      'http://hosting:8080/platform/v1/auth/signin?code=test-code&state=test-state',
      expect.objectContaining({ method: 'POST' })
    );
    expect(response.status).toBe(200);
  });
});
