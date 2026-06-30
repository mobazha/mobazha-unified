import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useNativeMarketplaceAttribution } from '@mobazha/core';

vi.mock('@mobazha/core/services/api/marketplace', () => ({
  submitPublicMarketplaceAttributionEvent: vi.fn(),
}));

import { submitPublicMarketplaceAttributionEvent } from '@mobazha/core/services/api/marketplace';

const mockSubmitPublicMarketplaceAttributionEvent =
  submitPublicMarketplaceAttributionEvent as ReturnType<typeof vi.fn>;

describe('useNativeMarketplaceAttribution impression dedupe', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    mockSubmitPublicMarketplaceAttributionEvent.mockResolvedValue(undefined);
  });

  it('allows retry when impression submit previously failed', async () => {
    mockSubmitPublicMarketplaceAttributionEvent
      .mockRejectedValueOnce(new Error('network failed'))
      .mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useNativeMarketplaceAttribution('mp-retry'));

    act(() => {
      result.current.trackImpression();
    });

    await waitFor(() => {
      expect(mockSubmitPublicMarketplaceAttributionEvent).toHaveBeenCalledTimes(1);
    });

    act(() => {
      result.current.trackImpression();
    });

    await waitFor(() => {
      expect(mockSubmitPublicMarketplaceAttributionEvent).toHaveBeenCalledTimes(2);
    });
  });

  it('persists sent impression key after successful submit', async () => {
    const { result, unmount } = renderHook(() => useNativeMarketplaceAttribution('mp-success'));

    act(() => {
      result.current.trackImpression();
    });

    await waitFor(() => {
      expect(mockSubmitPublicMarketplaceAttributionEvent).toHaveBeenCalledTimes(1);
    });

    unmount();

    const remounted = renderHook(() => useNativeMarketplaceAttribution('mp-success'));

    act(() => {
      remounted.result.current.trackImpression();
    });

    await waitFor(() => {
      expect(mockSubmitPublicMarketplaceAttributionEvent).toHaveBeenCalledTimes(1);
    });
  });

  it('does not throw on checkout handoff when sessionStorage.setItem throws', async () => {
    const sessionStoragePrototype = Object.getPrototypeOf(window.sessionStorage);
    const setItemSpy = vi.spyOn(sessionStoragePrototype, 'setItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    const { result } = renderHook(() => useNativeMarketplaceAttribution('mp-security'));

    expect(() => {
      act(() => {
        result.current.trackCheckoutHandoff({
          listingSlug: 'psa-charizard',
          peerID: 'QmSeller',
        });
      });
    }).not.toThrow();

    await waitFor(() => {
      expect(mockSubmitPublicMarketplaceAttributionEvent).toHaveBeenCalledTimes(1);
    });

    expect(setItemSpy).toHaveBeenCalled();
    expect(mockSubmitPublicMarketplaceAttributionEvent).toHaveBeenCalledWith(
      'mp-security',
      expect.objectContaining({
        eventType: 'checkout_handoff',
        listingSlug: 'psa-charizard',
        peerID: 'QmSeller',
      })
    );
    setItemSpy.mockRestore();
  });
});
