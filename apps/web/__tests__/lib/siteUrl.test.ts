import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const headersMock = vi.fn();

vi.mock('next/headers', () => ({
  headers: () => headersMock(),
}));

function headersFrom(values: Record<string, string>): Headers {
  const h = new Headers();
  for (const [k, v] of Object.entries(values)) {
    h.set(k, v);
  }
  return h;
}

// Load after mock so the module picks up the mocked `next/headers`.
async function loadSiteUrl() {
  vi.resetModules();
  return await import('@/lib/siteUrl');
}

describe('getSiteUrl', () => {
  beforeEach(() => {
    headersMock.mockReset();
    delete process.env.NEXT_PUBLIC_SITE_URL;
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
  });

  it('prefers x-store-domain when set', async () => {
    headersMock.mockResolvedValue(headersFrom({ 'x-store-domain': 'alice.mymbz.org' }));
    const { getSiteUrl } = await loadSiteUrl();
    expect(await getSiteUrl()).toBe('https://alice.mymbz.org');
  });

  it('falls back to NEXT_PUBLIC_SITE_URL when no x-store-domain', async () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://custom.example.com';
    headersMock.mockResolvedValue(headersFrom({}));
    const { getSiteUrl } = await loadSiteUrl();
    expect(await getSiteUrl()).toBe('https://custom.example.com');
  });

  it('falls back to x-forwarded-host when env not set', async () => {
    headersMock.mockResolvedValue(
      headersFrom({
        'x-forwarded-host': 'store.example.com',
        'x-forwarded-proto': 'https',
      })
    );
    const { getSiteUrl } = await loadSiteUrl();
    expect(await getSiteUrl()).toBe('https://store.example.com');
  });

  it('returns hardcoded default as last resort', async () => {
    headersMock.mockResolvedValue(headersFrom({}));
    const { getSiteUrl } = await loadSiteUrl();
    expect(await getSiteUrl()).toBe('https://app.mobazha.org');
  });
});

describe('getCanonicalSiteUrl', () => {
  beforeEach(() => {
    headersMock.mockReset();
    delete process.env.NEXT_PUBLIC_SITE_URL;
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
  });

  it('uses x-store-canonical-domain when present', async () => {
    // Current host is a named storefront; canonical points at main store.
    headersMock.mockResolvedValue(
      headersFrom({
        'x-store-domain': 'alice-vip.sf.mymbz.org',
        'x-store-canonical-domain': 'alice.mymbz.org',
      })
    );
    const { getCanonicalSiteUrl } = await loadSiteUrl();
    expect(await getCanonicalSiteUrl()).toBe('https://alice.mymbz.org');
  });

  it('falls back to getSiteUrl when canonical header absent', async () => {
    // Main store request — current host is already canonical.
    headersMock.mockResolvedValue(headersFrom({ 'x-store-domain': 'alice.mymbz.org' }));
    const { getCanonicalSiteUrl } = await loadSiteUrl();
    expect(await getCanonicalSiteUrl()).toBe('https://alice.mymbz.org');
  });
});

describe('isNamedStorefrontRequest', () => {
  beforeEach(() => {
    headersMock.mockReset();
  });

  it('returns true when x-store-canonical-domain is set', async () => {
    headersMock.mockResolvedValue(headersFrom({ 'x-store-canonical-domain': 'alice.mymbz.org' }));
    const { isNamedStorefrontRequest } = await loadSiteUrl();
    expect(await isNamedStorefrontRequest()).toBe(true);
  });

  it('returns false when x-store-canonical-domain is absent', async () => {
    headersMock.mockResolvedValue(headersFrom({ 'x-store-domain': 'alice.mymbz.org' }));
    const { isNamedStorefrontRequest } = await loadSiteUrl();
    expect(await isNamedStorefrontRequest()).toBe(false);
  });

  it('returns false when headers() throws', async () => {
    headersMock.mockRejectedValue(new Error('headers unavailable'));
    const { isNamedStorefrontRequest } = await loadSiteUrl();
    expect(await isNamedStorefrontRequest()).toBe(false);
  });
});
