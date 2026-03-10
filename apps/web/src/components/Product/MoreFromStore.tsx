'use client';

import React, { memo, useState, useEffect } from 'react';
import Link from 'next/link';
import { Store, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton-compat';
import { ProductCard, type ProductContractType } from '@/components/ProductCard/ProductCard';
import { useI18n, productDataService, getImageUrl } from '@mobazha/core';
import type { ProductListItem } from '@mobazha/core';
import { cn } from '@/lib/utils';

export interface MoreFromStoreProps {
  /** 卖家 peerID */
  vendorPeerID: string;
  /** 卖家名称 */
  vendorName?: string;
  /** 当前商品 slug（用于过滤） */
  currentSlug?: string;
  /** 显示的商品数量 */
  maxItems?: number;
  /** 紧凑模式（弹窗内使用） */
  compact?: boolean;
  /** 自定义样式 */
  className?: string;
  /** 商品点击回调 */
  onProductClick?: (product: ProductListItem) => void;
}

/**
 * 店铺更多商品组件
 *
 * 显示同一店铺的其他商品推荐。
 *
 * @example
 * <MoreFromStore
 *   vendorPeerID={product.vendorID?.peerID}
 *   vendorName={vendor?.name}
 *   currentSlug={product.slug}
 * />
 */
export const MoreFromStore = memo(function MoreFromStore({
  vendorPeerID,
  vendorName,
  currentSlug,
  maxItems = 6,
  compact = false,
  className,
  onProductClick,
}: MoreFromStoreProps) {
  const { t } = useI18n();
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 获取店铺商品
  useEffect(() => {
    if (!vendorPeerID) {
      setIsLoading(false);
      return;
    }

    let isCancelled = false;

    const fetchStoreProducts = async () => {
      setIsLoading(true);
      try {
        // 获取店铺商品列表
        const storeProducts = await productDataService.getStoreListings(vendorPeerID);

        if (isCancelled) return;

        // 过滤掉当前商品
        const filteredProducts = storeProducts.filter(p => p.slug !== currentSlug);

        // 限制数量
        setProducts(filteredProducts.slice(0, maxItems));
      } catch (error) {
        console.error('Failed to fetch store products:', error);
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchStoreProducts();

    return () => {
      isCancelled = true;
    };
  }, [vendorPeerID, currentSlug, maxItems]);

  // 如果没有 vendorPeerID 或没有其他商品，不渲染
  if (!vendorPeerID) {
    return null;
  }

  // 加载完成且没有商品
  if (!isLoading && products.length === 0) {
    return null;
  }

  return (
    <Card className={cn(compact ? 'p-3' : 'p-3 sm:p-4', className)} data-testid="more-from-store">
      {/* 标题栏 */}
      <div className={cn('flex items-center justify-between', compact ? 'mb-2' : 'mb-3')}>
        <h2
          className={cn(
            'font-bold text-foreground flex items-center gap-1.5',
            compact ? 'text-sm' : 'text-sm sm:text-base'
          )}
        >
          <Store
            className={cn('text-muted-foreground', compact ? 'w-4 h-4' : 'w-4 h-4 sm:w-5 sm:h-5')}
          />
          {t('product.moreFromStore')}
          {vendorName && (
            <span
              className={cn(
                'text-muted-foreground font-normal',
                compact ? 'text-sm hidden md:inline' : 'text-base hidden sm:inline'
              )}
            >
              - {vendorName}
            </span>
          )}
        </h2>
        <Link href={`/store/${vendorPeerID}`}>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'hover:text-primary transition-colors touch-feedback',
              compact ? 'text-xs h-7 px-2' : 'text-sm'
            )}
          >
            {t('product.viewAllProducts')}
            <ChevronRight className="w-4 h-4 ml-0.5" />
          </Button>
        </Link>
      </div>

      {/* 加载骨架 */}
      {isLoading && (
        <div
          className={cn(
            'grid gap-3',
            compact
              ? 'grid-cols-2 md:grid-cols-4'
              : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 sm:gap-4'
          )}
        >
          {[...Array(maxItems)].map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="aspect-square rounded-lg" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      )}

      {/* 商品网格 */}
      {!isLoading && products.length > 0 && (
        <div
          className={cn(
            'grid gap-3',
            compact
              ? 'grid-cols-2 md:grid-cols-4'
              : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 sm:gap-4'
          )}
        >
          {products.map(product => {
            const card = (
              <ProductCard
                key={product.slug}
                title={product.title}
                imageUrl={
                  getImageUrl(product.thumbnail?.medium, vendorPeerID) ||
                  getImageUrl(product.thumbnail?.small, vendorPeerID)
                }
                price={product.price?.amount || 0}
                currency={product.price?.currency?.code || 'USD'}
                rating={product.averageRating}
                reviewCount={product.ratingCount}
                freeShipping={product.freeShipping && product.freeShipping.length > 0}
                contractType={product.contractType as ProductContractType}
                tokenStandard={product.tokenStandard}
                rwaTradeMode={product.rwaTradeMode}
                vendorName={product.vendorName}
                vendorPeerID={product.vendorPeerID}
                onClick={onProductClick ? () => onProductClick(product) : undefined}
                compact
                className="hover-lift transition-all"
              />
            );

            if (onProductClick) {
              return <React.Fragment key={product.slug}>{card}</React.Fragment>;
            }

            const href = `/product/${product.slug}${vendorPeerID ? `?peerID=${vendorPeerID}` : ''}`;
            return (
              <Link key={product.slug} href={href} className="block">
                {card}
              </Link>
            );
          })}
        </div>
      )}

      {/* 移动端水平滚动提示 */}
      {!isLoading && products.length > 2 && !compact && (
        <div className="sm:hidden mt-4 text-center">
          <Link href={`/store/${vendorPeerID}`}>
            <Button variant="outline" size="sm" className="w-full touch-feedback">
              {t('product.viewStore')}
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
      )}
    </Card>
  );
});

export default MoreFromStore;
