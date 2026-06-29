import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useModerators } from '@/hooks/useModerators';

const mockGetModerators = vi.fn();

vi.mock('@mobazha/core', async importOriginal => {
  const actual = await importOriginal<typeof import('@mobazha/core')>();
  return {
    ...actual,
    moderatorsApi: {
      ...actual.moderatorsApi,
      getModerators: (...args: unknown[]) => mockGetModerators(...args),
    },
  };
});

describe('useModerators public gating', () => {
  beforeEach(() => {
    mockGetModerators.mockReset();
    mockGetModerators.mockResolvedValue({
      moderators: [],
      total: 0,
      page: 1,
      limit: 10,
      hasMore: false,
    });
  });

  it('does not fetch store-policy moderators without a seller peerID', async () => {
    renderHook(() => useModerators({ autoFetch: true }));

    await waitFor(() => {
      expect(mockGetModerators).not.toHaveBeenCalled();
    });
  });

  it('fetches seller public moderators when vendorPeerID is provided', async () => {
    renderHook(() => useModerators({ autoFetch: true, vendorPeerID: 'QmSeller' }));

    await waitFor(() => {
      expect(mockGetModerators).toHaveBeenCalledWith(
        expect.objectContaining({ vendorPeerID: 'QmSeller' })
      );
    });
  });
});
