'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton-compat';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Grid } from '@/components/layouts';
import {
  ProductCard,
  ProductCardSkeleton,
  type ProductContractType,
  type RwaTradeMode,
} from '@/components/ProductCard';
import { useI18n, productDataService, getImageUrl, useVerifiedModerators } from '@mobazha/core';
import type { ProductListItem } from '@mobazha/core';
import { Package, Coins, Search, X } from 'lucide-react';
import { useProductModal } from '@/hooks';
import { RwaFilterSidebar, type RwaFilterState, defaultRwaFilterState } from './RwaFilterSidebar';

interface RwaTabProps {
  peerId: string;
  isOwnStore: boolean;
  /** Optional: products can be passed from parent to avoid refetching */
  products?: ProductListItem[];
}

// 排序选项配置
const sortOptions = [
  { value: 'newest', labelKey: 'search.newest' },
  { value: 'price-asc', labelKey: 'search.priceLowHigh' },
  { value: 'price-desc', labelKey: 'search.priceHighLow' },
] as const;

export const RwaTab: React.FC<RwaTabProps> = ({
  peerId,
  isOwnStore,
  products: externalProducts,
}) => {
  const { t } = useI18n();
  const { hasVerifiedMod } = useVerifiedModerators();
  const { openProduct, isMobile } = useProductModal();

  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [loading, setLoading] = useState(!externalProducts);
  const [error, setError] = useState<string | null>(null);

  // 统一筛选状态
  const [filter, setFilter] = useState<RwaFilterState>(defaultRwaFilterState);

  // 获取商品列表（仅当没有外部传入商品时）
  const fetchProducts = useCallback(async () => {
    if (externalProducts) {
      setProducts(externalProducts);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const productsData = isOwnStore
        ? await productDataService.getMyListings()
        : await productDataService.getStoreListings(peerId);

      setProducts(productsData as ProductListItem[]);
    } catch (err) {
      console.error('Failed to fetch products:', err);
      setError(t('rwa.fetchError'));
    } finally {
      setLoading(false);
    }
  }, [peerId, isOwnStore, externalProducts, t]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // 外部商品更新时同步
  useEffect(() => {
    if (externalProducts) {
      setProducts(externalProducts);
    }
  }, [externalProducts]);

  // 筛选 RWA 商品
  const rwaProducts = useMemo(() => {
    return products.filter(product => product.contractType?.toUpperCase() === 'RWA_TOKEN');
  }, [products]);

  // 应用筛选和排序
  const filteredProducts = useMemo(() => {
    let result = [...rwaProducts];

    // 搜索过滤
    if (filter.search.trim()) {
      const searchLower = filter.search.toLowerCase();
      result = result.filter(product => product.title?.toLowerCase().includes(searchLower));
    }

    // 代币标准筛选
    if (filter.tokenStandard !== 'all') {
      result = result.filter(
        product => product.tokenStandard?.toUpperCase() === filter.tokenStandard
      );
    }

    // 交易模式筛选
    if (filter.tradeMode !== 'all') {
      result = result.filter(product => {
        const tradeMode = product.rwaTradeMode;
        if (filter.tradeMode === 'instant') {
          // rwaTradeMode: 0 = instant, 'instant' (兼容旧数据)
          return tradeMode === 0 || (tradeMode as unknown) === 'instant';
        } else {
          // rwaTradeMode: 1 = confirm_required, 'confirm_required' (兼容旧数据)
          return tradeMode === 1 || (tradeMode as unknown) === 'confirm_required';
        }
      });
    }

    // 排序
    switch (filter.sortBy) {
      case 'price-asc':
        result.sort((a, b) => (Number(a.price?.amount) || 0) - (Number(b.price?.amount) || 0));
        break;
      case 'price-desc':
        result.sort((a, b) => (Number(b.price?.amount) || 0) - (Number(a.price?.amount) || 0));
        break;
      case 'newest':
      default:
        // Keep original order (usually newest first from API)
        break;
    }

    return result;
  }, [rwaProducts, filter]);

  // 各代币标准的商品数量统计
  const tokenStandardCounts = useMemo(() => {
    const counts = { ERC721: 0, ERC1155: 0, ERC3525: 0 };
    rwaProducts.forEach(product => {
      const standard = product.tokenStandard?.toUpperCase();
      if (standard === 'ERC721') counts.ERC721++;
      else if (standard === 'ERC1155') counts.ERC1155++;
      else if (standard === 'ERC3525') counts.ERC3525++;
    });
    return counts;
  }, [rwaProducts]);

  // 更新筛选状态的辅助函数
  const updateFilter = (updates: Partial<RwaFilterState>) => {
    setFilter(prev => ({ ...prev, ...updates }));
  };

  if (loading) {
    return (
      <div className="flex gap-6">
        {/* 左侧筛选栏骨架 */}
        <div className="hidden lg:block w-56 shrink-0 space-y-4">
          <Skeleton variant="text" className="h-5 w-20" />
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} variant="text" className="h-6 w-full" />
            ))}
          </div>
        </div>
        {/* 右侧内容区骨架 */}
        <div className="flex-1 space-y-4">
          <div className="flex items-center gap-4">
            <Skeleton variant="rounded" className="h-9 flex-1 max-w-sm" />
            <Skeleton variant="rounded" className="h-9 w-32" />
          </div>
          <Grid cols={3} colsMobile={2} colsTablet={3} gap="md">
            {Array.from({ length: 6 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </Grid>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-6">
      {/* 左侧筛选边栏 - 仅桌面端显示 */}
      {rwaProducts.length > 0 && (
        <RwaFilterSidebar
          filter={filter}
          onFilterChange={setFilter}
          tokenStandardCounts={tokenStandardCounts}
          className="hidden lg:block"
        />
      )}

      {/* 右侧主内容区 */}
      <div className="flex-1 min-w-0 space-y-4">
        {/* 顶部工具栏：搜索 + 数量 + 排序 */}
        {rwaProducts.length > 0 && (
          <div className="flex items-center gap-4">
            {/* 搜索框 */}
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('filter.searchRwa')}
                value={filter.search}
                onChange={e => updateFilter({ search: e.target.value })}
                className="pl-9 h-9"
              />
              {filter.search && (
                <button
                  onClick={() => updateFilter({ search: '' })}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* 商品数量 */}
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              {filteredProducts.length} {t('filter.resultsFound')}
            </span>

            {/* 排序下拉 */}
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-sm text-muted-foreground hidden sm:inline">
                {t('search.sortBy')}
              </span>
              <Select
                value={filter.sortBy}
                onValueChange={(value: RwaFilterState['sortBy']) => updateFilter({ sortBy: value })}
              >
                <SelectTrigger className="w-[120px] h-9">
                  <SelectValue placeholder={t('search.sortBy')} />
                </SelectTrigger>
                <SelectContent>
                  {sortOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {t(option.labelKey)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* 错误提示 */}
        {error && (
          <div className="bg-destructive/10 text-destructive rounded-lg p-4 text-sm">
            {error}
            <button className="ml-2 underline hover:no-underline" onClick={fetchProducts}>
              {t('common.retry')}
            </button>
          </div>
        )}

        {/* 空状态 - 没有 RWA 商品 */}
        {rwaProducts.length === 0 && !error && (
          <div className="text-center py-10 sm:py-12">
            <div className="w-12 h-12 sm:w-14 sm:h-14 mx-auto mb-3 rounded-full bg-muted flex items-center justify-center">
              <Coins className="w-6 h-6 sm:w-7 sm:h-7 text-muted-foreground" />
            </div>
            <h3 className="text-base font-medium text-foreground mb-1">
              {isOwnStore ? t('rwa.noRwaYet') : t('rwa.noRwaInStore')}
            </h3>
            {isOwnStore && (
              <p className="text-muted-foreground text-sm">{t('rwa.createFirstRwa')}</p>
            )}
          </div>
        )}

        {/* 空状态 - 筛选后无结果 */}
        {rwaProducts.length > 0 && filteredProducts.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
              <Package className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-base font-medium text-foreground mb-2">
              {t('empty.noProductsFound')}
            </h3>
            <p className="text-sm text-muted-foreground">{t('empty.tryAdjustingFilters')}</p>
          </div>
        )}

        {/* RWA 商品列表 */}
        {filteredProducts.length > 0 && (
          <Grid cols={3} colsMobile={2} colsTablet={3} gap="md">
            {filteredProducts.map((product, index) => (
              <Link
                key={`${product.slug}-${index}`}
                href={`/product/${product.slug}?peerID=${peerId}`}
                onClick={e => {
                  // 桌面端使用弹框
                  if (!isMobile) {
                    e.preventDefault();
                    openProduct(product.slug, peerId);
                  }
                }}
              >
                <ProductCard
                  title={product.title}
                  imageUrl={getImageUrl(product.thumbnail?.medium)}
                  price={Number(product.price?.amount || 0)}
                  currency={product.price?.currency?.code}
                  divisibility={product.price?.currency?.divisibility}
                  // 在店铺页面内不显示店名和头像（已经在店铺里了，无需重复显示）
                  vendorPeerID={peerId}
                  rating={product.averageRating}
                  reviewCount={product.ratingCount}
                  freeShipping={product.freeShipping && product.freeShipping.length > 0}
                  contractType={product.contractType as ProductContractType}
                  tokenStandard={product.tokenStandard}
                  rwaTradeMode={product.rwaTradeMode as RwaTradeMode}
                  hasVerifiedModerator={hasVerifiedMod(product.moderators)}
                  isOwnListing={isOwnStore}
                />
              </Link>
            ))}
          </Grid>
        )}
      </div>
    </div>
  );
};

export default RwaTab;
