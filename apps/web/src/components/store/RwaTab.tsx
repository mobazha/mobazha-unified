'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton-compat';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Grid, HStack } from '@/components/layouts';
import {
  ProductCard,
  ProductCardSkeleton,
  type ProductContractType,
  type RwaTradeMode,
} from '@/components/ProductCard';
import { useI18n, productDataService, getImageUrl, useVerifiedModerators } from '@mobazha/core';
import type { ProductListItem } from '@mobazha/core';
import { Package, Coins } from 'lucide-react';
import { useProductModal } from '@/hooks';

interface RwaTabProps {
  peerId: string;
  isOwnStore: boolean;
  /** Optional: products can be passed from parent to avoid refetching */
  products?: ProductListItem[];
  /** Store info for vendor display */
  storeName?: string;
  storeAvatar?: string;
}

// 代币标准筛选类型
type TokenStandardFilter = 'all' | 'ERC721' | 'ERC1155' | 'ERC3525';

// 交易模式筛选类型
type TradeModeFilter = 'all' | 'instant' | 'confirm_required';

// 排序选项
type SortOption = 'newest' | 'price-asc' | 'price-desc';

export const RwaTab: React.FC<RwaTabProps> = ({
  peerId,
  isOwnStore,
  products: externalProducts,
  storeName,
  storeAvatar,
}) => {
  const { t } = useI18n();
  const { hasVerifiedMod } = useVerifiedModerators();
  const { openProduct, isMobile } = useProductModal();

  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [loading, setLoading] = useState(!externalProducts);
  const [error, setError] = useState<string | null>(null);

  // 筛选状态
  const [tokenStandardFilter, setTokenStandardFilter] = useState<TokenStandardFilter>('all');
  const [tradeModeFilter, setTradeModeFilter] = useState<TradeModeFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('newest');

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
      setError(t('rwa.fetchError') || '获取 RWA 商品失败');
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

    // 代币标准筛选
    if (tokenStandardFilter !== 'all') {
      result = result.filter(
        product => product.tokenStandard?.toUpperCase() === tokenStandardFilter
      );
    }

    // 交易模式筛选
    if (tradeModeFilter !== 'all') {
      result = result.filter(product => {
        const tradeMode = product.rwaTradeMode;
        if (tradeModeFilter === 'instant') {
          return tradeMode === 'instant' || tradeMode === 0;
        } else {
          return tradeMode === 'confirm_required' || tradeMode === 1;
        }
      });
    }

    // 排序
    switch (sortBy) {
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
  }, [rwaProducts, tokenStandardFilter, tradeModeFilter, sortBy]);

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

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton variant="text" className="h-6 w-32" />
          <Skeleton variant="rounded" className="h-9 w-32" />
        </div>
        <Grid cols={4} colsMobile={2} gap="md">
          {Array.from({ length: 4 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </Grid>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 头部筛选栏 */}
      {rwaProducts.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3 justify-between">
          <HStack gap="sm" className="flex-wrap">
            {/* 代币标准筛选 */}
            <Select
              value={tokenStandardFilter}
              onValueChange={(value: TokenStandardFilter) => setTokenStandardFilter(value)}
            >
              <SelectTrigger className="w-[140px] h-8">
                <SelectValue placeholder={t('rwa.filterTokenStandard') || '代币标准'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {t('filter.allTypes') || '全部'} ({rwaProducts.length})
                </SelectItem>
                <SelectItem value="ERC721">
                  <span className="flex items-center gap-2">
                    <Badge className="bg-purple-500 text-white text-xs px-1.5">ERC721</Badge>
                    NFT ({tokenStandardCounts.ERC721})
                  </span>
                </SelectItem>
                <SelectItem value="ERC1155">
                  <span className="flex items-center gap-2">
                    <Badge className="bg-blue-500 text-white text-xs px-1.5">ERC1155</Badge>
                    {t('rwa.membership') || '会员权益'} ({tokenStandardCounts.ERC1155})
                  </span>
                </SelectItem>
                <SelectItem value="ERC3525">
                  <span className="flex items-center gap-2">
                    <Badge className="bg-green-500 text-white text-xs px-1.5">ERC3525</Badge>
                    {t('rwa.share') || '份额代币'} ({tokenStandardCounts.ERC3525})
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>

            {/* 交易模式筛选 */}
            <Select
              value={tradeModeFilter}
              onValueChange={(value: TradeModeFilter) => setTradeModeFilter(value)}
            >
              <SelectTrigger className="w-[130px] h-8">
                <SelectValue placeholder={t('rwa.filterTradeMode') || '交易模式'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('filter.allTypes') || '全部'}</SelectItem>
                <SelectItem value="instant">
                  <span className="flex items-center gap-1">
                    <span>⚡</span>
                    {t('rwa.instantTrade') || '即时交易'}
                  </span>
                </SelectItem>
                <SelectItem value="confirm_required">
                  <span className="flex items-center gap-1">
                    <span>🔒</span>
                    {t('rwa.confirmRequired') || '需确认'}
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>

            {/* 排序 */}
            <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
              <SelectTrigger className="w-[130px] h-8">
                <SelectValue placeholder={t('search.sortBy') || '排序'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">{t('search.newest') || '最新上架'}</SelectItem>
                <SelectItem value="price-asc">
                  {t('search.priceLowHigh') || '价格从低到高'}
                </SelectItem>
                <SelectItem value="price-desc">
                  {t('search.priceHighLow') || '价格从高到低'}
                </SelectItem>
              </SelectContent>
            </Select>

            {/* 结果数量 */}
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              {t('rwa.foundItems', { count: filteredProducts.length }) ||
                `找到 ${filteredProducts.length} 件商品`}
            </span>
          </HStack>
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="bg-destructive/10 text-destructive rounded-lg p-4 text-sm">
          {error}
          <button className="ml-2 underline hover:no-underline" onClick={fetchProducts}>
            {t('common.retry') || '重试'}
          </button>
        </div>
      )}

      {/* 空状态 - 没有 RWA 商品 */}
      {rwaProducts.length === 0 && !error && (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
            <Coins className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">
            {isOwnStore
              ? t('rwa.noRwaYet') || '还没有 RWA 数字资产商品'
              : t('rwa.noRwaInStore') || '该店铺暂无 RWA 数字资产商品'}
          </h3>
          {isOwnStore && (
            <p className="text-muted-foreground text-sm mb-4">
              {t('rwa.createFirstRwa') || '创建商品时选择 RWA Token 类型，开始销售数字资产'}
            </p>
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
            {t('empty.noProductsFound') || '未找到匹配的商品'}
          </h3>
          <p className="text-sm text-muted-foreground">
            {t('empty.tryAdjustingFilters') || '尝试调整筛选条件'}
          </p>
        </div>
      )}

      {/* RWA 商品列表 */}
      {filteredProducts.length > 0 && (
        <Grid cols={4} colsMobile={2} gap="md">
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
                currency={product.price?.currency?.code || 'USD'}
                divisibility={product.price?.currency?.divisibility}
                vendorName={isOwnStore ? undefined : storeName}
                vendorAvatar={isOwnStore ? undefined : storeAvatar}
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
  );
};

export default RwaTab;
