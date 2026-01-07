'use client';

import React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { AvatarCompat as Avatar } from '@/components/ui/avatar-compat';
import { Skeleton } from '@/components/ui/skeleton';

/** 商品合约类型 */
export type ProductContractType = 'PHYSICAL_GOOD' | 'DIGITAL_GOOD' | 'SERVICE' | 'RWA_TOKEN';

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
  /** 是否数字商品 (已弃用，请使用 contractType) */
  isDigital?: boolean;
  /** 商品合约类型 */
  contractType?: ProductContractType;
  /** 是否显示紧凑模式 */
  compact?: boolean;
  /** 点击回调 */
  onClick?: () => void;
  /** 自定义类名 */
  className?: string;
}

// 商品类型标签配置
const contractTypeConfig: Record<ProductContractType, { label: string; color: string }> = {
  PHYSICAL_GOOD: { label: '', color: '' },
  DIGITAL_GOOD: { label: 'Digital', color: 'bg-blue-500' },
  SERVICE: { label: 'Service', color: 'bg-primary' },
  RWA_TOKEN: { label: 'RWA', color: 'bg-orange-500' },
};

/**
 * ProductCard 商品卡片组件
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
  contractType,
  compact = false,
  onClick,
  className,
}) => {
  const hasDiscount = originalPrice && Number(originalPrice) > Number(price);
  const discountPercent = hasDiscount
    ? Math.round((1 - Number(price) / Number(originalPrice)) * 100)
    : 0;

  const typeConfig = contractType
    ? contractTypeConfig[contractType]
    : isDigital
      ? contractTypeConfig.DIGITAL_GOOD
      : null;

  return (
    <Card
      className={cn(
        'overflow-hidden group cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5',
        className
      )}
      onClick={onClick}
    >
      {/* 商品图片 */}
      <div className="relative aspect-square overflow-hidden bg-muted">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
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
          <span className="absolute top-2 left-2 bg-destructive text-destructive-foreground text-xs font-bold px-2 py-1 rounded">
            -{discountPercent}%
          </span>
        )}

        {/* 商品类型标签 */}
        {typeConfig?.label && (
          <span
            className={cn(
              'absolute top-2 right-2 text-white text-xs font-medium px-2 py-1 rounded',
              typeConfig.color
            )}
          >
            {typeConfig.label}
          </span>
        )}
      </div>

      {/* 商品信息 */}
      <CardContent className={cn('space-y-2', compact ? 'p-2' : 'p-3')}>
        {/* 标题 */}
        <h3
          className={cn(
            'font-medium text-foreground line-clamp-2',
            compact ? 'text-sm min-h-[2rem]' : 'min-h-[2.5rem]'
          )}
        >
          {title}
        </h3>

        {/* 价格 */}
        <div className="flex items-baseline gap-2">
          <span className={cn('font-bold text-primary', compact ? 'text-base' : 'text-lg')}>
            {currency}
            {typeof price === 'number' ? price.toFixed(2) : price}
          </span>
          {hasDiscount && (
            <span className="text-sm text-muted-foreground line-through">
              {currency}
              {typeof originalPrice === 'number' ? originalPrice.toFixed(2) : originalPrice}
            </span>
          )}
        </div>

        {/* 评分 */}
        {rating !== undefined && (
          <div className="flex items-center gap-1 text-sm">
            <span className="text-yellow-500">★</span>
            <span className="text-muted-foreground">
              {rating.toFixed(1)}
              {reviewCount !== undefined && ` (${reviewCount})`}
            </span>
          </div>
        )}

        {/* 卖家信息 & 配送标签 */}
        {(vendorName || freeShipping) && (
          <div
            className={cn(
              'flex items-center justify-between pt-2 border-t border-border',
              compact && 'pt-1'
            )}
          >
            {vendorName && (
              <div className="flex items-center gap-2 min-w-0">
                {!compact && <Avatar src={vendorAvatar} name={vendorName} size="xs" />}
                <span
                  className={cn('text-muted-foreground truncate', compact ? 'text-xs' : 'text-sm')}
                >
                  {vendorName}
                </span>
              </div>
            )}
            {freeShipping && (
              <span className="text-xs text-primary font-medium flex-shrink-0">Free Shipping</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

ProductCard.displayName = 'ProductCard';

/**
 * ProductCardSkeleton - 商品卡片骨架
 */
export const ProductCardSkeleton: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <Skeleton className="aspect-square w-full" />
      <CardContent className="p-3 space-y-2">
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-3/5" />
        <Skeleton className="h-4 w-2/5" />
        <div className="flex items-center gap-2 pt-2">
          <Skeleton className="h-6 w-6 rounded-full" />
          <Skeleton className="h-4 w-20" />
        </div>
      </CardContent>
    </Card>
  );
};

ProductCardSkeleton.displayName = 'ProductCardSkeleton';
