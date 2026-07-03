import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('../../services/api/config', () => ({
  getSearchUrl: () => 'https://search.test',
}));

describe('fetchVerifiedModerators', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal('fetch', vi.fn());
  });

  it('unwraps Search data envelope and collects peerIDs', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          moderators: [{ peerID: 'QmVerifiedMod' }, { peerID: '12D3Verified' }],
        },
      }),
    } as Response);

    const { fetchVerifiedModerators } = await import('../../services/verifiedModerators');
    const result = await fetchVerifiedModerators();

    expect(result.has('QmVerifiedMod')).toBe(true);
    expect(result.has('12D3Verified')).toBe(true);
  });
});
