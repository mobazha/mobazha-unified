import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getMyStores,
  claimStore,
  getOwnerReputation,
  type MyStoreItem,
  type ClaimStoreResponse,
  type OwnerReputationResponse,
} from '../../../services/api/myStores';

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: () => Promise.resolve(body),
    headers: new Headers(),
  } as unknown as Response;
}

beforeEach(() => {
  vi.mocked(globalThis.fetch).mockReset();
});

const standaloneItem: MyStoreItem = {
  peer_id: '12D3KooWStandalone',
  store_name: 'Alice Standalone',
  node_type: 'standalone',
  role: 'owner',
  connectivity: 'public',
  status: 'active',
  is_online: true,
  endpoint_url: 'https://alice.example.com',
  domain: 'alice.example.com',
  last_active_at: '2026-04-01T10:00:00Z',
};

const saasItem: MyStoreItem = {
  peer_id: '12D3KooWSaaSTenant',
  store_name: 'Alice SaaS',
  node_type: 'saas',
  role: 'owner',
  connectivity: 'tunnel',
  status: 'active',
  is_online: false,
  last_active_at: '2026-04-01T09:30:00Z',
};

describe('myStores API — MS1.1 getMyStores', () => {
  it('returns the full MyStoreItem array unwrapped from the envelope', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      jsonResponse(200, { data: [standaloneItem, saasItem] })
    );

    const items = await getMyStores();
    expect(items).toHaveLength(2);
    expect(items[0].peer_id).toBe('12D3KooWStandalone');
    expect(items[0].node_type).toBe('standalone');
    expect(items[1].node_type).toBe('saas');
  });

  it('hits the canonical MS1.1 endpoint, not the legacy alias', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(jsonResponse(200, { data: [] }));

    await getMyStores();

    const calledUrl = String(vi.mocked(globalThis.fetch).mock.calls[0][0]);
    expect(calledUrl).toContain('/platform/v1/stores/my');
    // Must not accidentally be the legacy path (prefix vs. suffix check).
    expect(calledUrl.endsWith('/my-stores')).toBe(false);
  });

  it('surfaces 401 as a thrown error (unauth callers handle fallback)', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      jsonResponse(401, { error: { code: 'UNAUTHORIZED', message: 'no token' } })
    );

    await expect(getMyStores()).rejects.toThrow();
  });

  it('returns [] when the user manages no stores', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(jsonResponse(200, { data: [] }));

    const items = await getMyStores();
    expect(items).toEqual([]);
  });
});

describe('myStores API — MS1.3 claimStore', () => {
  const fixtureResponse: ClaimStoreResponse = {
    peer_id: '12D3KooWTarget',
    owner_user_id: 'casdoor-user-123',
    already_own: false,
  };

  const validClaimRequest = {
    peer_id: '12D3KooWTarget',
    timestamp: 1_700_000_000,
    nonce: 'a1b2c3d4e5f6',
    signature: 'base64-encoded-libp2p-signature==',
  };

  it('POSTs the full signed payload to /stores/claim', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(jsonResponse(200, { data: fixtureResponse }));

    const res = await claimStore(validClaimRequest);

    expect(res).toEqual(fixtureResponse);

    const [url, init] = vi.mocked(globalThis.fetch).mock.calls[0];
    expect(String(url)).toContain('/platform/v1/stores/claim');
    expect((init as RequestInit).method).toBe('POST');

    const body = JSON.parse((init as RequestInit).body as string);
    expect(body).toEqual(validClaimRequest);
  });

  it('surfaces idempotent re-claims via already_own=true', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      jsonResponse(200, {
        data: { ...fixtureResponse, already_own: true },
      })
    );

    const res = await claimStore(validClaimRequest);
    expect(res.already_own).toBe(true);
    expect(res.owner_user_id).toBe('casdoor-user-123');
  });

  it('throws on invalid signature (401)', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      jsonResponse(401, {
        error: { code: 'UNAUTHORIZED', message: 'invalid signature' },
      })
    );

    await expect(claimStore({ ...validClaimRequest, signature: 'tampered' })).rejects.toThrow();
  });

  it('surfaces 409 when the store is claimed by another account', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      jsonResponse(409, {
        error: {
          code: 'FORBIDDEN',
          message: 'store already claimed by another account',
        },
      })
    );

    await expect(claimStore(validClaimRequest)).rejects.toThrow();
  });
});

describe('myStores API — MS1.4 getOwnerReputation', () => {
  it('returns the reputation aggregate including store details', async () => {
    const fixture: OwnerReputationResponse = {
      peer_id: '12D3KooWStandalone',
      owner_public_id: 'ab12cd34ef56',
      store_count: 2,
      stores: [
        {
          peer_id: '12D3KooWStandalone',
          store_name: 'Alice Standalone',
          node_type: 'standalone',
          connectivity: 'public',
          status: 'active',
          is_online: true,
          is_self: true,
          domain: 'alice.example.com',
          created_at: '2026-01-15T00:00:00Z',
        },
        {
          peer_id: '12D3KooWSaaSTenant',
          store_name: 'Alice SaaS',
          node_type: 'saas',
          connectivity: 'tunnel',
          status: 'active',
          is_online: true,
          is_self: false,
          created_at: '2026-02-01T00:00:00Z',
        },
      ],
    };

    vi.mocked(globalThis.fetch).mockResolvedValue(jsonResponse(200, { data: fixture }));

    const res = await getOwnerReputation('12D3KooWStandalone');
    expect(res.peer_id).toBe('12D3KooWStandalone');
    expect(res.store_count).toBe(2);
    expect(res.stores).toHaveLength(2);
    expect(res.owner_public_id).toBe('ab12cd34ef56');
    expect(res.stores[0].is_self).toBe(true);
    expect(res.stores[1].is_self).toBe(false);
  });

  it('treats an unclaimed store as a valid neutral response', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      jsonResponse(200, {
        data: {
          peer_id: '12D3KooWUnclaimed',
          owner_public_id: '',
          store_count: 0,
          stores: [],
        },
      })
    );

    const res = await getOwnerReputation('12D3KooWUnclaimed');
    expect(res.owner_public_id).toBe('');
    expect(res.store_count).toBe(0);
    expect(res.stores).toEqual([]);
  });

  it('encodes peer_id as a query parameter', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      jsonResponse(200, {
        data: {
          peer_id: '12D3KooW+SpecialChars',
          owner_public_id: '',
          store_count: 0,
          stores: [],
        },
      })
    );

    await getOwnerReputation('12D3KooW+SpecialChars');

    const calledUrl = String(vi.mocked(globalThis.fetch).mock.calls[0][0]);
    expect(calledUrl).toContain('/platform/v1/stores/owner-reputation');
    expect(calledUrl).toContain('peer_id=12D3KooW%2BSpecialChars');
  });

  it('rejects empty peerID without hitting the network', async () => {
    await expect(getOwnerReputation('')).rejects.toThrow('peerID is required');
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});
