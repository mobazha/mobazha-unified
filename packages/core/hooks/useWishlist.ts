/**
 * 收藏/愿望单 Hook — thin convenience wrapper over useWishlistStore.
 * Auto-fetches on first mount; all state is global (Zustand).
 */

import { useEffect } from 'react';
import { useWishlistStore } from '../stores/wishlistStore';
import type { AddWishlistParams } from '../services/api/wishlist';

export function useWishlist() {
  const items = useWishlistStore(s => s.items);
  const isLoading = useWishlistStore(s => s.isLoading);
  const error = useWishlistStore(s => s.error);
  const _fetched = useWishlistStore(s => s._fetched);
  const fetchWishlist = useWishlistStore(s => s.fetchWishlist);
  const addItem = useWishlistStore(s => s.addItem);
  const removeItem = useWishlistStore(s => s.removeItem);
  const toggleItem = useWishlistStore(s => s.toggleItem);
  const isInWishlist = useWishlistStore(s => s.isInWishlist);
  const getItemCount = useWishlistStore(s => s.getItemCount);

  useEffect(() => {
    if (!_fetched && !isLoading) {
      fetchWishlist();
    }
  }, [_fetched, isLoading, fetchWishlist]);

  return {
    items,
    isLoading,
    error,
    count: getItemCount(),
    fetchWishlist,
    addItem: (params: AddWishlistParams) => addItem(params),
    removeItem,
    toggleItem: (params: AddWishlistParams) => toggleItem(params),
    isInWishlist,
  };
}

export default useWishlist;
