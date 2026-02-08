'use client';

/**
 * 从当前用户店铺商品中提取已有分类，并合并预定义分类建议。
 *
 * 用于商品创建/编辑页面的分类自动补全建议。
 * 合并两个来源：
 * 1. 店铺现有商品的 categories 字段（优先显示）
 * 2. 预定义的常见电商分类（补充建议）
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import type { ProductListItem } from '../types';
import { productsApi } from '../services/api';
import { useUserStore } from '../stores/userStore';
import { PREDEFINED_CATEGORIES } from '../data/categories';

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

  // 从商品中提取店铺自有分类
  const storeCategories = useMemo(() => {
    const categorySet = new Set<string>();
    listings.forEach(product => {
      if (product.categories && product.categories.length > 0) {
        product.categories.forEach(cat => categorySet.add(cat));
      }
    });
    return Array.from(categorySet).sort((a, b) => a.localeCompare(b));
  }, [listings]);

  // 合并店铺分类和预定义分类（店铺分类优先，去重）
  const categories = useMemo(() => {
    const merged = new Set<string>(storeCategories);
    PREDEFINED_CATEGORIES.forEach(cat => merged.add(cat));
    return Array.from(merged).sort((a, b) => a.localeCompare(b));
  }, [storeCategories]);

  return { categories, storeCategories, isLoading };
}
