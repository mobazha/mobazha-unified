/**
 * 收藏/愿望单 API 服务
 */

import { withMockFallback } from './mode';
import { ApiError } from './client';
import { NODE_API } from '../../config/apiPaths';
import { authGet, authPost, authDel } from './helpers';

const isExpectedUnauthenticatedWishlistError = (error: unknown): boolean =>
  error instanceof ApiError && error.status === 401;

export interface WishlistItem {
  peerID: string;
  slug: string;
  title: string;
  thumbnail: string;
  price: string;
  currency: string;
  createdAt: string;
}

export interface AddWishlistParams {
  peerID: string;
  slug: string;
  title: string;
  thumbnail: string;
  price: string;
  currency: string;
}

export async function getWishlist(): Promise<WishlistItem[]> {
  const realFn = async () => {
    return authGet<WishlistItem[]>(NODE_API.WISHLISTS);
  };

  const mockFn = async () => {
    return mockWishlistData;
  };

  return withMockFallback(realFn, mockFn, '/wishlists', {
    quietFallbackWhen: isExpectedUnauthenticatedWishlistError,
  });
}

export async function addToWishlist(params: AddWishlistParams): Promise<WishlistItem> {
  const realFn = async () => {
    return authPost<WishlistItem>(NODE_API.WISHLISTS, params);
  };

  const mockFn = async () => {
    const existing = mockWishlistData.find(
      i => i.peerID === params.peerID && i.slug === params.slug
    );
    if (existing) return existing;
    const item: WishlistItem = { ...params, createdAt: new Date().toISOString() };
    mockWishlistData.unshift(item);
    return item;
  };

  return withMockFallback(realFn, mockFn, '/wishlists');
}

export async function removeFromWishlist(peerID: string, slug: string): Promise<void> {
  const realFn = async () => {
    await authDel<void>(NODE_API.WISHLIST_ITEM(peerID, slug));
  };

  const mockFn = async () => {
    mockWishlistData = mockWishlistData.filter(i => !(i.peerID === peerID && i.slug === slug));
  };

  return withMockFallback(realFn, mockFn, `/wishlists/${peerID}/${slug}`);
}

let mockWishlistData: WishlistItem[] = [];

export const wishlistApi = {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
};
