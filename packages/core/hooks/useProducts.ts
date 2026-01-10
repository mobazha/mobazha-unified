/**
 * 商品相关 Hooks
 */

import { useState, useEffect, useCallback } from 'react';
import type { ProductListItem, Product, RatingIndex, RatingDetail } from '../types';
import { productsApi } from '../services/api';

/**
 * 获取热门商品列表
 */
export function useTrendingListings() {
  const [listings, setListings] = useState<ProductListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await productsApi.fetchTrendingListings();
      setListings(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取商品失败');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { listings, isLoading, error, refetch };
}

/**
 * 获取精选商品列表
 */
export function useFeaturedListings() {
  const [listings, setListings] = useState<ProductListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await productsApi.fetchFeaturedListings();
      setListings(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取商品失败');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { listings, isLoading, error, refetch };
}

/**
 * 获取店铺商品列表
 * 使用网关 API 直接获取，比搜索服务更可靠
 */
export function useStoreListings(peerID: string | null, _pageSize = 12) {
  const [listings, setListings] = useState<ProductListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!peerID) return;

    setIsLoading(true);
    setError(null);

    try {
      // 使用网关 API 直接获取店铺商品列表，比搜索服务更可靠
      const result = await productsApi.getStoreListingIndex(peerID);
      setListings(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取商品失败');
    } finally {
      setIsLoading(false);
    }
  }, [peerID]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { listings, isLoading, error, refetch };
}

/**
 * 获取商品详情
 */
export function useListing(slug: string | null, peerID?: string) {
  const [listing, setListing] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!slug) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await productsApi.getListing(slug, peerID);
      setListing(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取商品详情失败');
    } finally {
      setIsLoading(false);
    }
  }, [slug, peerID]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { listing, isLoading, error, refetch };
}

/**
 * 获取商品评价索引
 */
export function useListingRatings(slug: string | null, peerID?: string) {
  const [ratingIndex, setRatingIndex] = useState<RatingIndex | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!slug) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await productsApi.getRatingIndex(peerID, slug);
      setRatingIndex(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取评价失败');
    } finally {
      setIsLoading(false);
    }
  }, [slug, peerID]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { ratingIndex, isLoading, error, refetch };
}

/**
 * 获取店铺评价（包含统计和详细评价列表）
 * @param peerID 店铺 peerID
 * @param pageSize 每页加载数量，默认 5
 */
export function useStoreRatings(peerID: string | null, pageSize = 5) {
  const [ratingIndex, setRatingIndex] = useState<RatingIndex | null>(null);
  const [ratings, setRatings] = useState<RatingDetail[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadedCount, setLoadedCount] = useState(0);

  // 获取评价索引
  const fetchIndex = useCallback(async () => {
    if (!peerID) return;

    setIsLoading(true);
    setError(null);

    try {
      const index = await productsApi.getRatingIndex(peerID);
      setRatingIndex(index);
      setHasMore(index.ratings.length > 0);
      setLoadedCount(0);
      setRatings([]);

      // 自动加载第一页详细评价
      if (index.ratings.length > 0) {
        const firstPageIds = index.ratings.slice(0, pageSize);
        const details = await productsApi.fetchRatings(firstPageIds);
        setRatings(details);
        setLoadedCount(firstPageIds.length);
        setHasMore(index.ratings.length > firstPageIds.length);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取评价失败');
    } finally {
      setIsLoading(false);
    }
  }, [peerID, pageSize]);

  // 加载更多评价
  const loadMore = useCallback(async () => {
    if (!ratingIndex || isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);

    try {
      const nextIds = ratingIndex.ratings.slice(loadedCount, loadedCount + pageSize);
      if (nextIds.length > 0) {
        const newDetails = await productsApi.fetchRatings(nextIds);
        setRatings(prev => [...prev, ...newDetails]);
        setLoadedCount(prev => prev + nextIds.length);
        setHasMore(loadedCount + nextIds.length < ratingIndex.ratings.length);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error('Failed to load more ratings:', err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [ratingIndex, loadedCount, pageSize, isLoadingMore, hasMore]);

  useEffect(() => {
    fetchIndex();
  }, [fetchIndex]);

  return {
    ratingIndex,
    ratings,
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    loadMore,
    refetch: fetchIndex,
  };
}

/**
 * 商品搜索
 */
export function useProductSearch(initialQuery = '') {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<ProductListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    setError(null);
    setQuery(searchQuery);

    try {
      // TODO: 实现实际的搜索 API 调用
      // 暂时返回空数组
      setResults([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : '搜索失败');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearResults = useCallback(() => {
    setResults([]);
    setQuery('');
  }, []);

  return { query, results, isLoading, error, search, clearResults };
}
