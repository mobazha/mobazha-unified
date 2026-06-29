import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useWishlist, useWishlistStore, useUserStore } from '@mobazha/core';

vi.mock('@mobazha/core/services/api/wishlist', async importOriginal => {
  const actual = await importOriginal<typeof import('@mobazha/core/services/api/wishlist')>();
  return {
    ...actual,
    wishlistApi: {
      ...actual.wishlistApi,
      getWishlist: vi.fn().mockResolvedValue([]),
    },
  };
});

describe('useWishlist auth gating', () => {
  beforeEach(() => {
    useWishlistStore.setState({
      items: [],
      isLoading: false,
      error: null,
      _fetched: false,
    });
    useUserStore.setState({ isAuthenticated: false } as never);
  });

  it('does not fetch wishlists when logged out', async () => {
    const fetchWishlist = vi.fn().mockResolvedValue(undefined);
    useWishlistStore.setState({ fetchWishlist });

    renderHook(() => useWishlist());

    await waitFor(() => {
      expect(fetchWishlist).not.toHaveBeenCalled();
    });
  });

  it('fetches wishlists when authenticated', async () => {
    const fetchWishlist = vi.fn().mockResolvedValue(undefined);
    useWishlistStore.setState({ fetchWishlist });
    useUserStore.setState({ isAuthenticated: true } as never);

    renderHook(() => useWishlist());

    await waitFor(() => {
      expect(fetchWishlist).toHaveBeenCalledTimes(1);
    });
  });
});
