import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getMyStandaloneStores,
  getMyStandaloneStore,
} from '../../../services/api/standaloneStores';
import type { StandaloneStore } from '../../../services/api/standaloneStores';

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

const sampleStore: StandaloneStore = {
  id: 1,
  peer_id: '12D3KooWTestPeerID',
  endpoint_url: 'https://my-store.example.com',
  domain: 'my-store.example.com',
  connectivity: 'public',
  plan: 'free',
  status: 'active',
  last_heartbeat: '2026-03-07T12:00:00Z',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-03-07T12:00:00Z',
};

describe('standaloneStores API', () => {
  describe('getMyStandaloneStores', () => {
    it('returns stores array from envelope', async () => {
      vi.mocked(globalThis.fetch).mockResolvedValue(jsonResponse(200, { data: [sampleStore] }));

      const stores = await getMyStandaloneStores();
      expect(stores).toEqual([sampleStore]);
      expect(stores[0].peer_id).toBe('12D3KooWTestPeerID');
      expect(stores[0].connectivity).toBe('public');
    });

    it('returns empty array when no stores', async () => {
      vi.mocked(globalThis.fetch).mockResolvedValue(jsonResponse(200, { data: [] }));

      const stores = await getMyStandaloneStores();
      expect(stores).toEqual([]);
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
      const natStore: StandaloneStore = {
        ...sampleStore,
        peer_id: '12D3KooWNATStore',
        endpoint_url: undefined,
        domain: undefined,
        connectivity: 'nat',
      };
      vi.mocked(globalThis.fetch).mockResolvedValue(jsonResponse(200, { data: [natStore] }));

      const stores = await getMyStandaloneStores();
      expect(stores[0].connectivity).toBe('nat');
      expect(stores[0].endpoint_url).toBeUndefined();
    });

    it('calls the correct API path', async () => {
      vi.mocked(globalThis.fetch).mockResolvedValue(jsonResponse(200, { data: [] }));

      await getMyStandaloneStores();

      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
      const calledUrl = vi.mocked(globalThis.fetch).mock.calls[0][0];
      expect(String(calledUrl)).toContain('/platform/v1/stores/my-stores');
    });
  });

  describe('getMyStandaloneStore', () => {
    it('returns first store when user has one', async () => {
      vi.mocked(globalThis.fetch).mockResolvedValue(jsonResponse(200, { data: [sampleStore] }));

      const store = await getMyStandaloneStore();
      expect(store).toEqual(sampleStore);
      expect(store?.peer_id).toBe('12D3KooWTestPeerID');
    });

    it('returns null when user has no stores', async () => {
      vi.mocked(globalThis.fetch).mockResolvedValue(jsonResponse(200, { data: [] }));

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
