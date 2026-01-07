'use client';

import React from 'react';
import Link from 'next/link';
import { Container, Grid } from '@/components/layouts';
import { Button } from '@/components/ui/button';
import { ProductCard, ProductCardSkeleton } from '@/components/ProductCard';

interface Product {
  id: string;
  slug: string;
  title: string;
  imageUrl?: string;
  price: number;
  currency?: string;
  vendorName?: string;
  vendorAvatar?: string;
  rating?: number;
  reviewCount?: number;
  freeShipping?: boolean;
  isDigital?: boolean;
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
  viewAllHref = '/market',
  containerSize = 'xl',
  titleClassName,
}) => {
  return (
    <section className="py-6 sm:py-10 lg:py-16">
      <Container size={containerSize}>
        {/* Section Header */}
        <div className="flex items-end justify-between mb-4 sm:mb-8">
          <div>
            <h2
              className={
                titleClassName ||
                'text-lg sm:text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white'
              }
            >
              {title}
            </h2>
            {subtitle && (
              <p className="mt-1 sm:mt-2 text-sm sm:text-base text-slate-500 dark:text-slate-400">
                {subtitle}
              </p>
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
            : products.map(product => (
                <Link key={product.id} href={`/product/${product.slug}`}>
                  <ProductCard
                    title={product.title}
                    imageUrl={product.imageUrl}
                    price={product.price}
                    currency={product.currency}
                    vendorName={product.vendorName}
                    vendorAvatar={product.vendorAvatar}
                    rating={product.rating}
                    reviewCount={product.reviewCount}
                    freeShipping={product.freeShipping}
                    isDigital={product.isDigital}
                  />
                </Link>
              ))}
        </Grid>

        {/* Empty State */}
        {!isLoading && products.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-slate-400"
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
            <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
              No products found
            </h3>
            <p className="text-slate-500 dark:text-slate-300">Check back later for new listings.</p>
          </div>
        )}
      </Container>
    </section>
  );
};
