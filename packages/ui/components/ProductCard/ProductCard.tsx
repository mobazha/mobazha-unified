'use client';

import React from 'react';
import { cn } from '../../lib/utils';
import { Card } from '../Card';
import { Avatar } from '../Avatar';
import { Skeleton } from '../Skeleton';

export interface ProductCardProps {
  /** 商品标题 */
  title: string;
  /** 商品图片 URL */
  imageUrl?: string;
  /** 价格 */
  price: number | string;
  /** 货币符号 */
  currency?: string;
  /** 原价（用于显示折扣） */
  originalPrice?: number | string;
  /** 卖家名称 */
  vendorName?: string;
  /** 卖家头像 */
  vendorAvatar?: string;
  /** 评分 (0-5) */
  rating?: number;
  /** 评价数量 */
  reviewCount?: number;
  /** 是否免费配送 */
  freeShipping?: boolean;
  /** 是否数字商品 */
  isDigital?: boolean;
  /** 点击回调 */
  onClick?: () => void;
  /** 自定义类名 */
  className?: string;
}

/**
 * ProductCard 商品卡片组件
 *
 * @example
 * ```tsx
 * <ProductCard
 *   title="Premium Headphones"
 *   imageUrl="/product.jpg"
 *   price={99.99}
 *   currency="$"
 *   vendorName="TechStore"
 *   rating={4.5}
 *   reviewCount={128}
 *   freeShipping
 * />
 * ```
 */
export const ProductCard: React.FC<ProductCardProps> = ({
  title,
  imageUrl,
  price,
  currency = '$',
  originalPrice,
  vendorName,
  vendorAvatar,
  rating,
  reviewCount,
  freeShipping = false,
  isDigital = false,
  onClick,
  className,
}) => {
  const hasDiscount = originalPrice && Number(originalPrice) > Number(price);
  const discountPercent = hasDiscount
    ? Math.round((1 - Number(price) / Number(originalPrice)) * 100)
    : 0;

  return (
    <Card
      padding="none"
      hoverable
      onClick={onClick}
      className={cn('overflow-hidden group', className)}
    >
      {/* 商品图片 */}
      <div className="relative aspect-square overflow-hidden bg-slate-100 dark:bg-slate-700">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-400">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}

        {/* 折扣标签 */}
        {hasDiscount && (
          <span className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
            -{discountPercent}%
          </span>
        )}

        {/* 数字商品标签 */}
        {isDigital && (
          <span className="absolute top-2 right-2 bg-emerald-500 text-white text-xs font-medium px-2 py-1 rounded">
            Digital
          </span>
        )}
      </div>

      {/* 商品信息 */}
      <div className="p-3 space-y-2">
        {/* 标题 */}
        <h3 className="font-medium text-slate-900 dark:text-white line-clamp-2 min-h-[2.5rem]">
          {title}
        </h3>

        {/* 价格 */}
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
            {currency}
            {typeof price === 'number' ? price.toFixed(2) : price}
          </span>
          {hasDiscount && (
            <span className="text-sm text-slate-400 line-through">
              {currency}
              {typeof originalPrice === 'number' ? originalPrice.toFixed(2) : originalPrice}
            </span>
          )}
        </div>

        {/* 评分 */}
        {rating !== undefined && (
          <div className="flex items-center gap-1 text-sm">
            <div className="flex items-center text-amber-500">
              {[...Array(5)].map((_, i) => (
                <svg
                  key={i}
                  className={cn(
                    'w-4 h-4',
                    i < Math.floor(rating) ? 'fill-current' : 'fill-slate-300'
                  )}
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            <span className="text-slate-500">
              {rating.toFixed(1)}
              {reviewCount !== undefined && ` (${reviewCount})`}
            </span>
          </div>
        )}

        {/* 卖家信息 & 配送标签 */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700">
          {vendorName && (
            <div className="flex items-center gap-2 min-w-0">
              <Avatar src={vendorAvatar} name={vendorName} size="xs" />
              <span className="text-sm text-slate-500 truncate">{vendorName}</span>
            </div>
          )}
          {freeShipping && (
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex-shrink-0">
              Free Shipping
            </span>
          )}
        </div>
      </div>
    </Card>
  );
};

ProductCard.displayName = 'ProductCard';

/**
 * ProductCardSkeleton - 商品卡片骨架
 */
export const ProductCardSkeleton: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <Card padding="none" className={cn('overflow-hidden', className)}>
      <Skeleton variant="rectangular" className="aspect-square" />
      <div className="p-3 space-y-2">
        <Skeleton variant="text" height={20} />
        <Skeleton variant="text" width="60%" height={20} />
        <Skeleton variant="text" width="40%" />
        <div className="flex items-center gap-2 pt-2">
          <Skeleton variant="circular" width={24} height={24} />
          <Skeleton variant="text" width={80} />
        </div>
      </div>
    </Card>
  );
};

ProductCardSkeleton.displayName = 'ProductCardSkeleton';
