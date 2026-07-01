import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetProfile = vi.fn();
const mockGetImageUrl = vi.fn();

vi.mock('../../services/api/profile', () => ({
  getProfile: (...args: unknown[]) => mockGetProfile(...args),
}));

vi.mock('../../services/api/config', () => ({
  getImageUrl: (...args: unknown[]) => mockGetImageUrl(...args),
}));

import { clearProfileCache, getProfileDisplayInfo } from '../../services/profileCache';

describe('profileCache', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearProfileCache();
  });

  it('builds avatar URLs with peerID as store hint for remote profiles', async () => {
    mockGetProfile.mockResolvedValueOnce({
      peerID: '12D3KooWTestPeer',
      name: "Alice's Digital Shop",
      avatarHashes: {
        medium: 'bafy-avatar-hash',
      },
    });
    mockGetImageUrl.mockImplementation((hash: string, storeHint?: string) => {
      return `/v1/media/images/${hash}?store=${storeHint ?? ''}`;
    });

    const result = await getProfileDisplayInfo('12D3KooWTestPeer');

    expect(mockGetImageUrl).toHaveBeenCalledWith('bafy-avatar-hash', '12D3KooWTestPeer');
    expect(result).toEqual({
      name: "Alice's Digital Shop",
      avatar: '/v1/media/images/bafy-avatar-hash?store=12D3KooWTestPeer',
    });
  });
});
