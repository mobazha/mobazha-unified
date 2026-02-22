'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Shield, Flag, EyeOff, Pencil, Copy, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { AvatarCompat as Avatar } from '@/components/ui/avatar-compat';
import { Skeleton } from '@/components/ui/skeleton';
import { useCurrencyFormat, useI18n } from '@mobazha/core';

// HTML 实体解码
function decodeHtmlEntities(text: string): string {
  if (typeof window === 'undefined') {
    // SSR 环境下的简单解码
    return text
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');
  }
  const textarea = document.createElement('textarea');
  textarea.innerHTML = text;
  return textarea.value;
}

/** 商品合约类型 */
export type ProductContractType = 'PHYSICAL_GOOD' | 'DIGITAL_GOOD' | 'SERVICE' | 'RWA_TOKEN';

/** RWA 交易模式类型 */
export type RwaTradeMode = 'instant' | 'confirm_required' | number;

/** 代币标准类型 */
export type TokenStandard = 'ERC721' | 'ERC1155' | 'ERC3525' | string;

export interface ProductCardProps {
  /** 商品标题 */
  title: string;
  /** 商品图片 URL */
  imageUrl?: string;
  /** 价格 (默认为最小单位，即 API 返回的原始值) */
  price: number | string;
  /** 货币代码 (如 USD, BTC, ETH) */
  currency?: string;
  /** 价格精度/小数位数 (如 2 for USD cents, 8 for BTC satoshi)，如果提供则使用此值 */
  divisibility?: number;
  /** 价格是否为最小单位 (如 cents, satoshi, wei)，默认为 true，因为 API 返回的都是最小单位 */
  priceInMinimalUnit?: boolean;
  /** 原价（用于显示折扣） */
  originalPrice?: number | string;
  /** 卖家名称 */
  vendorName?: string;
  /** 卖家头像 */
  vendorAvatar?: string;
  /** 卖家 Peer ID (用于 block 功能) */
  vendorPeerID?: string;
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
  /** 代币标准 (ERC721/ERC1155/ERC3525) */
  tokenStandard?: TokenStandard;
  /** RWA 交易模式 (0=instant, 1=confirm_required) */
  rwaTradeMode?: RwaTradeMode;
  /** 是否有认证的仲裁员 */
  hasVerifiedModerator?: boolean;
  /** 是否为自己的商品 (自己的商品不显示 report/block) */
  isOwnListing?: boolean;
  /** 是否显示紧凑模式 */
  compact?: boolean;
  /** 点击回调 */
  onClick?: () => void;
  /** 举报回调 */
  onReport?: () => void;
  /** 屏蔽回调 */
  onBlock?: () => void;
  /** 编辑回调 (自己的商品) */
  onEdit?: () => void;
  /** 克隆回调 (自己的商品) */
  onClone?: () => void;
  /** 删除回调 (自己的商品) */
  onDelete?: () => void;
  /** 自定义类名 */
  className?: string;
}

// 商品类型标签配置
const contractTypeConfig: Record<ProductContractType, { label: string; color: string }> = {
  PHYSICAL_GOOD: { label: '', color: '' },
  DIGITAL_GOOD: { label: 'Digital', color: 'bg-info' },
  SERVICE: { label: 'Service', color: 'bg-primary' },
  RWA_TOKEN: { label: 'RWA', color: 'bg-warning' },
};

/**
 * ProductCard 商品卡片组件
 * 使用货币系统自动转换价格到用户偏好的本地货币
 */
export const ProductCard: React.FC<ProductCardProps> = ({
  title,
  imageUrl,
  price,
  currency = 'USD',
  divisibility,
  priceInMinimalUnit = true, // 默认 true，因为 API 返回的都是最小单位
  originalPrice,
  vendorName,
  vendorAvatar,
  vendorPeerID,
  rating,
  reviewCount,
  freeShipping = false,
  isDigital = false,
  contractType,
  tokenStandard,
  rwaTradeMode,
  hasVerifiedModerator = false,
  isOwnListing = false,
  compact = false,
  onClick,
  onReport,
  onBlock,
  onEdit,
  onClone,
  onDelete,
  className,
}) => {
  // 使用货币格式化 hook
  const { formatLocalPrice } = useCurrencyFormat();
  const { t } = useI18n();
  // hover 状态
  const [isHovered, setIsHovered] = useState(false);

  const hasDiscount = originalPrice && Number(originalPrice) > Number(price);
  const discountPercent = hasDiscount
    ? Math.round((1 - Number(price) / Number(originalPrice)) * 100)
    : 0;

  const typeConfig = contractType
    ? contractTypeConfig[contractType]
    : isDigital
      ? contractTypeConfig.DIGITAL_GOOD
      : null;

  // 使用货币系统格式化价格（自动转换到用户本地货币）
  // 如果提供了 divisibility，使用它；否则让服务使用货币的默认精度
  const formatOptions = { isMinimalUnit: priceInMinimalUnit, divisibility };
  const formattedPrice = formatLocalPrice(price, currency, formatOptions);
  const formattedOriginalPrice = originalPrice
    ? formatLocalPrice(originalPrice, currency, formatOptions)
    : '';

  // 处理 Report 按钮点击
  const handleReportClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onReport?.();
  };

  const handleBlockClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onBlock?.();
  };

  // 处理 Edit 按钮点击
  const handleEditClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onEdit?.();
  };

  const handleCloneClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onClone?.();
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDelete?.();
  };

  // 是否显示操作按钮 (不是自己的商品，且提供了回调函数)
  const showActionButtons = !isOwnListing && (onReport || onBlock);

  // 是否显示自己商品的操作按钮
  const showOwnListingButtons = isOwnListing && (onEdit || onClone || onDelete);

  return (
    <Card
      data-testid="product-card"
      className={cn(
        'overflow-hidden group cursor-pointer transition-all duration-200',
        'hover:shadow-lg hover:-translate-y-0.5',
        'active:scale-[0.98] active:opacity-90',
        className
      )}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
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

        {/* Verified Moderator 盾牌 - 左上角 */}
        {hasVerifiedModerator && (
          <div className="absolute top-2 left-2 z-10" title={t('listing.verifiedModerator')}>
            <div className="w-7 h-7 rounded-full bg-warning flex items-center justify-center shadow-md">
              <Shield className="w-4 h-4 text-white" fill="currentColor" />
            </div>
          </div>
        )}

        {/* 折扣标签 - 有盾牌时调整位置 */}
        {hasDiscount && (
          <span
            className={cn(
              'absolute bg-destructive text-destructive-foreground text-xs font-bold px-2 py-1 rounded z-10',
              hasVerifiedModerator ? 'top-2 left-11' : 'top-2 left-2'
            )}
          >
            -{discountPercent}%
          </span>
        )}

        {/* 商品类型标签 + 代币标准 - 右上角 */}
        {typeConfig?.label && (
          <span
            className={cn(
              'absolute top-2 right-2 text-white text-xs font-medium px-2 py-1 rounded z-10 flex items-center gap-1',
              typeConfig.color
            )}
          >
            <span>{typeConfig.label}</span>
            {contractType === 'RWA_TOKEN' &&
              tokenStandard &&
              ['ERC721', 'ERC1155', 'ERC3525'].includes(tokenStandard) && (
                <span className="pl-1 border-l border-white/30">{tokenStandard}</span>
              )}
          </span>
        )}

        {/* RWA 交易模式徽标 - 右下角 */}
        {contractType === 'RWA_TOKEN' && (
          <div
            className={cn(
              'absolute bottom-2 right-2 z-10 flex items-center gap-1 px-2 py-1 rounded-md text-white text-xs font-medium shadow-md',
              rwaTradeMode === 1 || rwaTradeMode === 'confirm_required'
                ? 'bg-warning'
                : 'bg-success'
            )}
          >
            <span className="text-sm">
              {rwaTradeMode === 1 || rwaTradeMode === 'confirm_required' ? '🔒' : '⚡'}
            </span>
            <span>
              {rwaTradeMode === 1 || rwaTradeMode === 'confirm_required' ? 'Confirm' : 'Instant'}
            </span>
          </div>
        )}

        {/* Hover 操作按钮 - Report 和 Block */}
        {showActionButtons && isHovered && (
          <div className="absolute bottom-2 left-2 z-20 flex gap-1.5 animate-in fade-in duration-150">
            {onReport && (
              <button
                onClick={handleReportClick}
                className={cn(
                  'w-8 h-8 rounded-md flex items-center justify-center',
                  'bg-white/90 hover:bg-white shadow-md',
                  'transition-all duration-150 hover:scale-105',
                  'text-muted-foreground hover:text-destructive'
                )}
                title={t('listing.report')}
              >
                <Flag className="w-4 h-4" />
              </button>
            )}
            {onBlock && vendorPeerID && (
              <button
                onClick={handleBlockClick}
                className={cn(
                  'w-8 h-8 rounded-md flex items-center justify-center',
                  'bg-white/90 hover:bg-white shadow-md',
                  'transition-all duration-150 hover:scale-105',
                  'text-muted-foreground hover:text-destructive'
                )}
                title={t('listing.blockSeller')}
              >
                <EyeOff className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Hover 操作按钮 - 自己商品的编辑、克隆、删除 */}
        {showOwnListingButtons && isHovered && (
          <div className="absolute bottom-2 left-2 z-20 flex gap-1.5 animate-in fade-in duration-150">
            {onEdit && (
              <button
                data-testid="product-card-edit"
                onClick={handleEditClick}
                className={cn(
                  'w-8 h-8 rounded-md flex items-center justify-center',
                  'bg-white/90 dark:bg-card/90 hover:bg-white dark:hover:bg-card shadow-md',
                  'transition-all duration-150 hover:scale-105',
                  'text-muted-foreground hover:text-primary'
                )}
                title={t('listing.edit')}
              >
                <Pencil className="w-4 h-4" />
              </button>
            )}
            {onClone && (
              <button
                onClick={handleCloneClick}
                className={cn(
                  'w-8 h-8 rounded-md flex items-center justify-center',
                  'bg-white/90 dark:bg-card/90 hover:bg-white dark:hover:bg-card shadow-md',
                  'transition-all duration-150 hover:scale-105',
                  'text-muted-foreground hover:text-primary'
                )}
                title={t('listing.clone')}
              >
                <Copy className="w-4 h-4" />
              </button>
            )}
            {onDelete && (
              <button
                data-testid="product-card-delete"
                onClick={handleDeleteClick}
                className={cn(
                  'w-8 h-8 rounded-md flex items-center justify-center',
                  'bg-white/90 dark:bg-card/90 hover:bg-white dark:hover:bg-card shadow-md',
                  'transition-all duration-150 hover:scale-105',
                  'text-muted-foreground hover:text-destructive'
                )}
                title={t('listing.deleteListing')}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* 商品信息 */}
      <CardContent className={cn('space-y-1', compact ? 'p-2' : 'p-2.5 sm:p-3')}>
        {/* 标题 */}
        <h3 className="font-medium text-foreground line-clamp-2 text-sm leading-tight">
          {decodeHtmlEntities(title)}
        </h3>

        {/* 价格和评分 - 同一行 */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-baseline gap-1 min-w-0">
            <span
              className={cn(
                'font-bold text-primary truncate',
                compact ? 'text-sm' : 'text-sm sm:text-base'
              )}
            >
              {formattedPrice}
            </span>
            {hasDiscount && (
              <span className="text-[10px] text-muted-foreground line-through flex-shrink-0">
                {formattedOriginalPrice}
              </span>
            )}
          </div>
          {/* 评分显示：有评价才显示评分，否则显示空心星 */}
          <div className="flex items-center gap-0.5 text-xs flex-shrink-0">
            {reviewCount !== undefined && reviewCount > 0 ? (
              <>
                <span className="text-warning">★</span>
                <span className="text-muted-foreground">{Number(rating || 0).toFixed(1)}</span>
              </>
            ) : (
              <span className="text-muted-foreground/50">☆</span>
            )}
          </div>
        </div>

        {/* 卖家信息 & 配送标签 */}
        {(vendorName || freeShipping) && (
          <div
            className={cn(
              'flex items-center justify-between pt-1.5 border-t border-border',
              compact && 'pt-1'
            )}
          >
            {vendorName && (
              <div className="flex items-center gap-1.5 min-w-0">
                {!compact && (
                  <Avatar
                    src={vendorAvatar}
                    name={vendorName}
                    size="xs"
                    className="flex-shrink-0"
                  />
                )}
                <span
                  className={cn('text-muted-foreground truncate text-xs', compact && 'text-xs')}
                >
                  {vendorName}
                </span>
              </div>
            )}
            {freeShipping && (
              <span className="text-[10px] text-primary font-medium flex-shrink-0">
                Free Shipping
              </span>
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
      <CardContent className="p-2.5 sm:p-3 space-y-1.5">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-12" />
        </div>
        <div className="flex items-center gap-1.5 pt-1.5 border-t border-border">
          <Skeleton className="h-5 w-5 rounded-full" />
          <Skeleton className="h-3 w-16" />
        </div>
      </CardContent>
    </Card>
  );
};

ProductCardSkeleton.displayName = 'ProductCardSkeleton';
