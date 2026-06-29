import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../services/api/config', () => ({
  getSearchUrl: () => 'https://search.test',
  getGatewayUrl: () => 'https://gateway.test/v1',
  getBuyerGatewayUrl: () => 'https://gateway.test/v1',
  getAuthHeaders: () => ({ 'Content-Type': 'application/json' }),
}));

vi.mock('../../../config/env', () => ({
  isStandaloneMode: () => false,
}));

vi.mock('../../../services/api/storeStatusCache', () => ({
  isStoreKnownOffline: vi.fn(() => false),
  markStoreOffline: vi.fn(),
  markStoreOnline: vi.fn(),
}));

vi.mock('../../../services/api/client', () => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  ApiError: class ApiError extends Error {
    constructor(
      message: string,
      public status?: number
    ) {
      super(message);
      this.name = 'ApiError';
    }
  },
  isStoreUnavailableError: vi.fn(() => false),
}));

vi.mock('../../../services/api/helpers', () => ({
  authGet: vi.fn(),
  authPost: vi.fn(),
  authPut: vi.fn(),
  publicGet: vi.fn(),
  publicPost: vi.fn(),
  searchPost: vi.fn(),
}));

vi.mock('../../../services/auth/token', () => ({
  isAuthenticated: vi.fn(),
}));

import { get } from '../../../services/api/client';
import { publicPost } from '../../../services/api/helpers';
import { isAuthenticated } from '../../../services/auth/token';
import { fetchPublicProfilesBatch } from '../../../services/api/profile';

describe('fetchPublicProfilesBatch anonymous access', () => {
  beforeEach(() => {
    vi.mocked(isAuthenticated).mockReset();
    vi.mocked(publicPost).mockReset();
    vi.mocked(get).mockReset();
  });

  it('does not call POST /profiles/batch when logged out', async () => {
    vi.mocked(isAuthenticated).mockReturnValue(false);
    vi.mocked(get).mockResolvedValue({
      peerID: 'QmSeller1',
      name: 'Wilson Cards',
      handle: 'wilson',
    });

    const result = await fetchPublicProfilesBatch(['QmSeller1']);

    expect(publicPost).not.toHaveBeenCalled();
    expect(get).toHaveBeenCalled();
    expect(result).toEqual([
      expect.objectContaining({
        peerID: 'QmSeller1',
        name: 'Wilson Cards',
        handle: 'wilson',
      }),
    ]);
  });

  it('still uses profiles/batch when authenticated', async () => {
    vi.mocked(isAuthenticated).mockReturnValue(true);
    vi.mocked(publicPost).mockResolvedValue([
      {
        peerID: 'QmSeller1',
        profile: {
          peerID: 'QmSeller1',
          name: 'Wilson Cards',
        },
      },
    ]);

    const result = await fetchPublicProfilesBatch(['QmSeller1']);

    expect(publicPost).toHaveBeenCalledWith('/profiles/batch', ['QmSeller1']);
    expect(result).toEqual([
      expect.objectContaining({
        peerID: 'QmSeller1',
        name: 'Wilson Cards',
      }),
    ]);
  });
});
