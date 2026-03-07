/**
 * 商品相关 Hooks — React Query 版本
 *
 * 迁移自手工 useState + useEffect + fetch 模式，自动获得：
 * - 多组件共享同一数据时请求去重
 * - stale-while-revalidate（页面切换时立即显示缓存）
 * - 自动重试（适配弱网环境）
 * - 后台刷新
 */

import { useState, useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { ProductListItem, RatingDetail } from '../types';
import { productsApi } from '../services/api';
import { queryKeys } from './queryKeys';
import { formatQueryError } from './queryUtils';

export function useTrendingListings() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.products.trending(),
    queryFn: () => productsApi.fetchTrendingListings(),
    staleTime: 2 * 60 * 1000,
  });

  return {
    listings: data ?? [],
    isLoading,
    error: formatQueryError(error),
    refetch,
  };
}

export function useFeaturedListings() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.products.featured(),
    queryFn: () => productsApi.fetchFeaturedListings(),
    staleTime: 2 * 60 * 1000,
  });

  return {
    listings: data ?? [],
    isLoading,
    error: formatQueryError(error),
    refetch,
  };
}

export function useStoreListings(peerID: string | null, _pageSize = 12) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.products.store(peerID!),
    queryFn: () => productsApi.getStoreListingsWithFallback(peerID!, _pageSize),
    enabled: !!peerID,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });

  return {
    listings: data?.listings ?? [],
    isLoading,
    isOffline: data?.isOffline ?? false,
    error: formatQueryError(error),
    refetch,
  };
}

export function useMyListings() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.products.myListings(),
    queryFn: () => productsApi.getListingIndex(),
    staleTime: 2 * 60 * 1000,
  });

  return {
    listings: data ?? [],
    isLoading,
    error: formatQueryError(error),
    refetch,
  };
}

export function useListing(slug: string | null, peerID?: string) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.products.detail(slug!, peerID),
    queryFn: () => productsApi.getPublicListing(slug!, peerID),
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
  });

  return {
    listing: data ?? null,
    isLoading,
    error: formatQueryError(error),
    refetch,
  };
}

export function useListingRatings(slug: string | null, peerID?: string) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.products.ratings(slug!, peerID),
    queryFn: () => productsApi.getRatingIndex(peerID, slug!),
    enabled: !!slug,
    staleTime: 2 * 60 * 1000,
  });

  return {
    ratingIndex: data ?? null,
    isLoading,
    error: formatQueryError(error),
    refetch,
  };
}

/**
 * 获取店铺评价（包含统计和详细评价列表）
 *
 * 评价索引通过 useQuery 获取；首页详情在 useEffect 中加载（避免 queryFn 内 setState）。
 * 后续分页通过 loadMore 手动追加。
 */
export function useStoreRatings(peerID: string | null, pageSize = 5) {
  const [ratings, setRatings] = useState<RatingDetail[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadedCount, setLoadedCount] = useState(0);
  const [initialLoaded, setInitialLoaded] = useState(false);

  const {
    data: ratingIndex,
    isLoading,
    error,
    refetch: refetchIndex,
  } = useQuery({
    queryKey: queryKeys.products.storeRatings(peerID!),
    queryFn: () => productsApi.getRatingIndex(peerID!),
    enabled: !!peerID,
    staleTime: 2 * 60 * 1000,
  });

  useEffect(() => {
    if (!ratingIndex) return;

    const ratingIds = ratingIndex.ratings ?? [];
    let cancelled = false;

    if (ratingIds.length > 0) {
      const firstPageIds = ratingIds.slice(0, pageSize);
      productsApi.fetchRatings(firstPageIds).then(details => {
        if (cancelled) return;
        setRatings(details);
        setLoadedCount(firstPageIds.length);
        setHasMore(ratingIds.length > firstPageIds.length);
        setInitialLoaded(true);
      });
    } else {
      setRatings([]);
      setLoadedCount(0);
      setHasMore(false);
      setInitialLoaded(true);
    }

    return () => {
      cancelled = true;
    };
  }, [ratingIndex, pageSize]);

  const loadMore = useCallback(async () => {
    if (!ratingIndex || isLoadingMore || !hasMore) return;

    const ratingIds = ratingIndex.ratings ?? [];
    setIsLoadingMore(true);
    try {
      const nextIds = ratingIds.slice(loadedCount, loadedCount + pageSize);
      if (nextIds.length > 0) {
        const newDetails = await productsApi.fetchRatings(nextIds);
        setRatings(prev => [...prev, ...newDetails]);
        const newCount = loadedCount + nextIds.length;
        setLoadedCount(newCount);
        setHasMore(newCount < ratingIds.length);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error('Failed to load more ratings:', err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [ratingIndex, loadedCount, pageSize, isLoadingMore, hasMore]);

  return {
    ratingIndex: ratingIndex ?? null,
    ratings,
    isLoading: isLoading || (!initialLoaded && !!peerID),
    isLoadingMore,
    error: formatQueryError(error),
    hasMore,
    loadMore,
    refetch: refetchIndex,
  };
}

/**
 * 商品搜索（TODO: 实现实际搜索 API，迁移为 useQuery）
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
      setResults([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
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

/**
 * 预取商品详情（用于列表→详情页的无缝跳转）
 *
 * Desktop: hover 触发（onMouseEnter）
 * Mobile: touchStart 触发 或 Intersection Observer
 */
export function usePrefetchProduct() {
  const queryClient = useQueryClient();

  return useCallback(
    (slug: string, peerID?: string) => {
      queryClient.prefetchQuery({
        queryKey: queryKeys.products.detail(slug, peerID),
        queryFn: () => productsApi.getPublicListing(slug, peerID),
        staleTime: 5 * 60 * 1000,
      });
    },
    [queryClient]
  );
}
