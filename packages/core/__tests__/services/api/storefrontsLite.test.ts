import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  DEFAULT_STOREFRONT_ID,
  archiveStorefront,
  createStorefront,
  getStorefront,
  listStorefronts,
  lookupStorefrontBySlug,
  updateStorefront,
  type PublicStorefrontBySlug,
  type Storefront,
  type StorefrontCreateRequest,
} from '../../../services/api/storefrontsLite';

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: () => Promise.resolve(body),
    headers: new Headers(),
  } as unknown as Response;
}

function emptyResponse(status = 204): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: 'No Content',
    json: () => Promise.resolve(null),
    headers: new Headers(),
  } as unknown as Response;
}

beforeEach(() => {
  vi.mocked(globalThis.fetch).mockReset();
});

const peerID = '12D3KooWStore';

const defaultStorefront: Storefront = {
  id: 'default',
  name: 'Main Storefront',
  visibility: 'public',
  is_default: true,
  created_at: '2026-01-01T00:00:00Z',
};

const vipStorefront: Storefront = {
  id: 'vip',
  name: 'VIP',
  slug: 'alice-vip',
  visibility: 'unlisted',
  created_at: '2026-02-01T00:00:00Z',
  filter: { tags: ['vip'] },
  price_rule: { type: 'flat_discount', value_pct: 15 },
};

describe('storefrontsLite — listStorefronts', () => {
  it('returns the full storefront list including default + archived', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      jsonResponse(200, { data: [defaultStorefront, vipStorefront] })
    );

    const list = await listStorefronts(peerID);
    expect(list).toHaveLength(2);
    expect(list[0].id).toBe(DEFAULT_STOREFRONT_ID);
    expect(list[0].is_default).toBe(true);
    expect(list[1].slug).toBe('alice-vip');
  });

  it('calls the canonical per-store endpoint', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(jsonResponse(200, { data: [] }));

    await listStorefronts(peerID);

    const calledUrl = String(vi.mocked(globalThis.fetch).mock.calls[0][0]);
    expect(calledUrl).toContain(`/platform/v1/stores/${peerID}/storefronts`);
    expect(calledUrl.endsWith(`/storefronts`)).toBe(true);
  });

  it('rejects empty peerID without hitting the network', async () => {
    await expect(listStorefronts('')).rejects.toThrow('peerID is required');
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});

describe('storefrontsLite — getStorefront', () => {
  it('maps empty sfID to "default"', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(jsonResponse(200, { data: defaultStorefront }));

    const sf = await getStorefront(peerID, '');

    expect(sf.id).toBe('default');
    const calledUrl = String(vi.mocked(globalThis.fetch).mock.calls[0][0]);
    expect(calledUrl).toContain(
      `/platform/v1/stores/${peerID}/storefronts/${DEFAULT_STOREFRONT_ID}`
    );
  });

  it('fetches a named storefront by id', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(jsonResponse(200, { data: vipStorefront }));

    const sf = await getStorefront(peerID, 'vip');
    expect(sf.slug).toBe('alice-vip');
    expect(sf.price_rule?.type).toBe('flat_discount');
  });

  it('surfaces 404 as a thrown error', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      jsonResponse(404, { error: { code: 'NOT_FOUND', message: 'storefront not found' } })
    );

    await expect(getStorefront(peerID, 'missing')).rejects.toThrow();
  });
});

describe('storefrontsLite — createStorefront', () => {
  const payload: StorefrontCreateRequest = {
    id: 'vip',
    name: 'VIP',
    slug: 'alice-vip',
    visibility: 'unlisted',
    filter: { tags: ['vip'] },
  };

  it('POSTs the payload to the per-store collection endpoint', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(jsonResponse(201, { data: vipStorefront }));

    const sf = await createStorefront(peerID, payload);
    expect(sf.id).toBe('vip');

    const [url, init] = vi.mocked(globalThis.fetch).mock.calls[0];
    expect(String(url)).toContain(`/platform/v1/stores/${peerID}/storefronts`);
    expect((init as RequestInit).method).toBe('POST');

    const body = JSON.parse((init as RequestInit).body as string);
    expect(body).toEqual(payload);
  });

  it('rejects an id of "default" on the client, before network', async () => {
    await expect(createStorefront(peerID, { ...payload, id: 'default' })).rejects.toThrow(
      'reserved'
    );
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('rejects missing peerID / id without hitting the network', async () => {
    await expect(createStorefront('', payload)).rejects.toThrow('peerID is required');
    await expect(createStorefront(peerID, { ...payload, id: '' })).rejects.toThrow(
      'storefront id is required'
    );
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});

describe('storefrontsLite — updateStorefront', () => {
  it('PATCHes the default storefront when sfID is empty', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      jsonResponse(200, { data: { ...defaultStorefront, name: 'Renamed' } })
    );

    const sf = await updateStorefront(peerID, '', { name: 'Renamed' });
    expect(sf.name).toBe('Renamed');

    const [url, init] = vi.mocked(globalThis.fetch).mock.calls[0];
    expect(String(url)).toContain(
      `/platform/v1/stores/${peerID}/storefronts/${DEFAULT_STOREFRONT_ID}`
    );
    expect((init as RequestInit).method).toBe('PATCH');
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({ name: 'Renamed' });
  });

  it('forwards *_clear sentinels verbatim', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(jsonResponse(200, { data: vipStorefront }));

    await updateStorefront(peerID, 'vip', {
      filter_clear: true,
      price_rule_clear: true,
    });

    const body = JSON.parse(
      (vi.mocked(globalThis.fetch).mock.calls[0][1] as RequestInit).body as string
    );
    expect(body).toEqual({ filter_clear: true, price_rule_clear: true });
  });
});

describe('storefrontsLite — archiveStorefront', () => {
  it('DELETEs the specified storefront and returns void', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(emptyResponse(204));

    await expect(archiveStorefront(peerID, 'vip')).resolves.toBeUndefined();

    const [url, init] = vi.mocked(globalThis.fetch).mock.calls[0];
    expect(String(url)).toContain(`/platform/v1/stores/${peerID}/storefronts/vip`);
    expect((init as RequestInit).method).toBe('DELETE');
  });

  it('rejects archiving the default storefront client-side', async () => {
    await expect(archiveStorefront(peerID, DEFAULT_STOREFRONT_ID)).rejects.toThrow(
      'default storefront cannot be archived'
    );
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('rejects empty sfID before network', async () => {
    await expect(archiveStorefront(peerID, '')).rejects.toThrow('sfID is required');
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});

describe('storefrontsLite — lookupStorefrontBySlug', () => {
  const fixture: PublicStorefrontBySlug = {
    peer_id: peerID,
    id: 'vip',
    name: 'VIP',
    slug: 'alice-vip',
    visibility: 'unlisted',
  };

  it('normalises slug to lowercase + trims whitespace', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(jsonResponse(200, { data: fixture }));

    const res = await lookupStorefrontBySlug('  Alice-VIP  ');
    expect(res.peer_id).toBe(peerID);

    const calledUrl = String(vi.mocked(globalThis.fetch).mock.calls[0][0]);
    expect(calledUrl).toContain('/platform/v1/storefronts/by-slug/alice-vip');
  });

  it('rejects empty / whitespace-only slugs without hitting the network', async () => {
    await expect(lookupStorefrontBySlug('')).rejects.toThrow('slug is required');
    await expect(lookupStorefrontBySlug('   ')).rejects.toThrow('slug is required');
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});
