'use client';

/**
 * 从当前用户店铺商品中提取已有分类
 *
 * 用于商品创建/编辑页面的分类自动补全建议。
 * 从店铺现有商品的 categories 字段中提取去重后的分类列表。
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import type { ProductListItem } from '../types';
import { productsApi } from '../services/api';
import { useUserStore } from '../stores/userStore';

export function useStoreCategories() {
  const [listings, setListings] = useState<ProductListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const currentUser = useUserStore(state => state.profile);
  const peerID = currentUser?.peerID || null;

  const fetchListings = useCallback(async () => {
    if (!peerID) return;

    setIsLoading(true);
    try {
      const result = await productsApi.getStoreListingIndex(peerID);
      setListings(result);
    } catch {
      // 静默失败，分类建议不是关键功能
    } finally {
      setIsLoading(false);
    }
  }, [peerID]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  // 从商品中提取去重排序后的分类列表
  const categories = useMemo(() => {
    const categorySet = new Set<string>();
    listings.forEach(product => {
      if (product.categories && product.categories.length > 0) {
        product.categories.forEach(cat => categorySet.add(cat));
      }
    });
    return Array.from(categorySet).sort((a, b) => a.localeCompare(b));
  }, [listings]);

  return { categories, isLoading };
}
