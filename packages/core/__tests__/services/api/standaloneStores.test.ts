import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getMyStandaloneStores,
  getMyStandaloneStore,
} from '../../../services/api/standaloneStores';
import type { MyStoreItem } from '../../../services/api/myStores';

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

// Canonical MS1.1 DTO shape returned by GET /platform/v1/stores/my.
const sampleItem: MyStoreItem = {
  peer_id: '12D3KooWTestPeerID',
  store_name: 'My Store',
  node_type: 'standalone',
  role: 'owner',
  connectivity: 'public',
  status: 'active',
  is_online: true,
  endpoint_url: 'https://my-store.example.com',
  domain: 'my-store.example.com',
  last_active_at: '2026-03-07T12:00:00Z',
};

describe('standaloneStores API (legacy shim over getMyStores)', () => {
  describe('getMyStandaloneStores', () => {
    it('adapts canonical MS1.1 items to the legacy StandaloneStore shape', async () => {
      vi.mocked(globalThis.fetch).mockResolvedValue(jsonResponse(200, { data: [sampleItem] }));

      const stores = await getMyStandaloneStores();

      expect(stores).toHaveLength(1);
      expect(stores[0].peer_id).toBe('12D3KooWTestPeerID');
      expect(stores[0].connectivity).toBe('public');
      expect(stores[0].status).toBe('active');
      // Legacy `last_heartbeat` maps from canonical `last_active_at`.
      expect(stores[0].last_heartbeat).toBe('2026-03-07T12:00:00Z');
      expect(stores[0].domain).toBe('my-store.example.com');
      expect(stores[0].endpoint_url).toBe('https://my-store.example.com');
    });

    it('returns empty array when no stores', async () => {
      vi.mocked(globalThis.fetch).mockResolvedValue(jsonResponse(200, { data: [] }));

      const stores = await getMyStandaloneStores();
      expect(stores).toEqual([]);
    });

    it('filters out SaaS stores — only standalone nodes are returned', async () => {
      const saasItem: MyStoreItem = {
        ...sampleItem,
        peer_id: '12D3KooWSaaSTenant',
        node_type: 'saas',
      };
      vi.mocked(globalThis.fetch).mockResolvedValue(
        jsonResponse(200, { data: [sampleItem, saasItem] })
      );

      const stores = await getMyStandaloneStores();
      expect(stores).toHaveLength(1);
      expect(stores[0].peer_id).toBe('12D3KooWTestPeerID');
    });

    it('throws on 401 unauthorized', async () => {
      vi.mocked(globalThis.fetch).mockResolvedValue(
        jsonResponse(401, {
          error: { code: 'UNAUTHORIZED', message: 'authentication required' },
        })
      );

      await expect(getMyStandaloneStores()).rejects.toThrow();
    });

    it('handles NAT store without endpoint_url', async () => {
      const natItem: MyStoreItem = {
        ...sampleItem,
        peer_id: '12D3KooWNATStore',
        endpoint_url: undefined,
        domain: undefined,
        connectivity: 'nat',
        is_online: false,
      };
      vi.mocked(globalThis.fetch).mockResolvedValue(jsonResponse(200, { data: [natItem] }));

      const stores = await getMyStandaloneStores();
      expect(stores[0].connectivity).toBe('nat');
      expect(stores[0].endpoint_url).toBeUndefined();
    });

    it('coerces connectivity="unknown" to "nat" for legacy callers', async () => {
      const unknownItem: MyStoreItem = { ...sampleItem, connectivity: 'unknown' };
      vi.mocked(globalThis.fetch).mockResolvedValue(jsonResponse(200, { data: [unknownItem] }));

      const stores = await getMyStandaloneStores();
      expect(stores[0].connectivity).toBe('nat');
    });

    it('calls the canonical MS1.1 /stores/my endpoint', async () => {
      vi.mocked(globalThis.fetch).mockResolvedValue(jsonResponse(200, { data: [] }));

      await getMyStandaloneStores();

      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
      const calledUrl = vi.mocked(globalThis.fetch).mock.calls[0][0];
      expect(String(calledUrl)).toContain('/platform/v1/stores/my');
    });
  });

  describe('getMyStandaloneStore', () => {
    it('returns first standalone store when user has one', async () => {
      vi.mocked(globalThis.fetch).mockResolvedValue(jsonResponse(200, { data: [sampleItem] }));

      const store = await getMyStandaloneStore();
      expect(store?.peer_id).toBe('12D3KooWTestPeerID');
    });

    it('returns null when user has no standalone stores', async () => {
      vi.mocked(globalThis.fetch).mockResolvedValue(jsonResponse(200, { data: [] }));

      const store = await getMyStandaloneStore();
      expect(store).toBeNull();
    });

    it('returns null when user has only SaaS stores', async () => {
      const saasItem: MyStoreItem = { ...sampleItem, node_type: 'saas' };
      vi.mocked(globalThis.fetch).mockResolvedValue(jsonResponse(200, { data: [saasItem] }));

      const store = await getMyStandaloneStore();
      expect(store).toBeNull();
    });

    it('propagates errors from underlying API call', async () => {
      vi.mocked(globalThis.fetch).mockResolvedValue(
        jsonResponse(401, {
          error: { code: 'UNAUTHORIZED', message: 'authentication required' },
        })
      );

      await expect(getMyStandaloneStore()).rejects.toThrow();
    });
  });
});
