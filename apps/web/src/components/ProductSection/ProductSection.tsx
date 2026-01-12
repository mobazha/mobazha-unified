'use client';

import React, { useCallback } from 'react';
import Link from 'next/link';
import { Container, Grid } from '@/components/layouts';
import { Button } from '@/components/ui/button';
import { ProductCard, ProductCardSkeleton } from '@/components/ProductCard';
import { useProductModal } from '@/hooks';
import { useUserStore, useVerifiedModerators } from '@mobazha/core';

interface Product {
  id: string;
  slug: string;
  title: string;
  imageUrl?: string;
  price: number;
  currency?: string;
  divisibility?: number;
  vendorName?: string;
  vendorAvatar?: string;
  vendorPeerID?: string;
  rating?: number;
  reviewCount?: number;
  freeShipping?: boolean;
  isDigital?: boolean;
  /** 仲裁员 peerID 列表 */
  moderators?: string[];
}

export interface ProductSectionProps {
  title: string;
  subtitle?: string;
  products: Product[];
  isLoading?: boolean;
  showViewAll?: boolean;
  viewAllHref?: string;
  containerSize?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  titleClassName?: string;
}

export const ProductSection: React.FC<ProductSectionProps> = ({
  title,
  subtitle,
  products,
  isLoading = false,
  showViewAll = true,
  viewAllHref = '/marketplace',
  containerSize = 'xl',
  titleClassName,
}) => {
  const { openProduct, isMobile } = useProductModal();
  const profile = useUserStore(state => state.profile);
  const { hasVerifiedMod } = useVerifiedModerators();

  // 处理商品点击
  const handleProductClick = useCallback(
    (e: React.MouseEvent, product: Product) => {
      // 阻止 Link 的默认导航（桌面端）
      if (!isMobile) {
        e.preventDefault();
        openProduct(product.slug, product.vendorPeerID);
      }
      // 移动端让 Link 正常工作
    },
    [isMobile, openProduct]
  );

  // 处理举报
  const handleReport = useCallback((_product: Product) => {
    // TODO: 打开举报对话框
  }, []);

  // 处理屏蔽
  const handleBlock = useCallback((_product: Product) => {
    // TODO: 实现屏蔽卖家功能
  }, []);

  return (
    <section className="py-6 sm:py-10 lg:py-16">
      <Container size={containerSize}>
        {/* Section Header */}
        <div className="flex items-end justify-between mb-4 sm:mb-8">
          <div>
            <h2
              className={
                titleClassName || 'text-lg sm:text-2xl lg:text-3xl font-bold text-foreground'
              }
            >
              {title}
            </h2>
            {subtitle && (
              <p className="mt-1 sm:mt-2 text-sm sm:text-base text-muted-foreground">{subtitle}</p>
            )}
          </div>
          {showViewAll && (
            <Link href={viewAllHref}>
              <Button variant="ghost" size="sm">
                View All
                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </Button>
            </Link>
          )}
        </div>

        {/* Products Grid */}
        <Grid cols={4} colsMobile={2} colsTablet={3} gap="md">
          {isLoading
            ? Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)
            : products.map((product, index) => {
                // 构建商品链接，如果有 vendorPeerID 则添加 peerID 参数
                const productHref = product.vendorPeerID
                  ? `/product/${product.slug}?peerID=${product.vendorPeerID}`
                  : `/product/${product.slug}`;
                // 检查是否为自己的商品
                const isOwnListing = profile?.peerID === product.vendorPeerID;
                return (
                  <Link
                    key={`${product.id}-${index}`}
                    href={productHref}
                    prefetch={false}
                    onClick={e => handleProductClick(e, product)}
                  >
                    <ProductCard
                      title={product.title}
                      imageUrl={product.imageUrl}
                      price={product.price}
                      currency={product.currency}
                      divisibility={product.divisibility}
                      vendorName={product.vendorName}
                      vendorAvatar={product.vendorAvatar}
                      vendorPeerID={product.vendorPeerID}
                      rating={product.rating}
                      reviewCount={product.reviewCount}
                      freeShipping={product.freeShipping}
                      isDigital={product.isDigital}
                      hasVerifiedModerator={hasVerifiedMod(product.moderators)}
                      isOwnListing={isOwnListing}
                      onReport={() => handleReport(product)}
                      onBlock={() => handleBlock(product)}
                    />
                  </Link>
                );
              })}
        </Grid>

        {/* Empty State */}
        {!isLoading && products.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
              <svg
                className="w-8 h-8 text-muted-foreground"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">No products found</h3>
            <p className="text-muted-foreground">Check back later for new listings.</p>
          </div>
        )}
      </Container>
    </section>
  );
};
