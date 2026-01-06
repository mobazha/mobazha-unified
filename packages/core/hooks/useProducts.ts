/**
 * 商品相关 Hooks
 */

import { useState, useEffect, useCallback } from 'react';
import type { Listing, ListingRating } from '../types';
import { productsApi } from '../services/api';

/**
 * 获取热门商品列表
 */
export function useTrendingListings() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await productsApi.getTrendingListings();
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
  const [listings, setListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await productsApi.getFeaturedListings();
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
 */
export function useStoreListings(peerID: string | null, pageSize = 12) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!peerID) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await productsApi.getStoreListings(peerID, pageSize);
      setListings(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取商品失败');
    } finally {
      setIsLoading(false);
    }
  }, [peerID, pageSize]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { listings, isLoading, error, refetch };
}

/**
 * 获取商品详情
 */
export function useListing(slug: string | null, peerID?: string) {
  const [listing, setListing] = useState<Listing | null>(null);
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
 * 获取商品评价
 */
export function useListingRatings(slug: string | null, peerID?: string) {
  const [ratings, setRatings] = useState<ListingRating[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!slug) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await productsApi.getListingRatings(slug, peerID);
      setRatings(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取评价失败');
    } finally {
      setIsLoading(false);
    }
  }, [slug, peerID]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { ratings, isLoading, error, refetch };
}

/**
 * 商品搜索
 */
export function useProductSearch(initialQuery = '') {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<Listing[]>([]);
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
      const result = await productsApi.searchListings(searchQuery);
      setResults(result);
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
