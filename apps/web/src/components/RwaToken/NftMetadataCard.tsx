'use client';

import React from 'react';
import { ImageIcon, User, Clock, Star, Layers } from 'lucide-react';
import type { NftMetadata } from '@mobazha/core';
import { useI18n } from '@mobazha/core';
import { cn } from '@/lib/utils';

export interface NftMetadataCardProps {
  metadata: NftMetadata;
  className?: string;
  compact?: boolean;
}

/**
 * NFT 元数据卡片 (ERC721)
 * 展示创作者、铸造时间、稀有度、收藏系列等信息
 */
export function NftMetadataCard({
  metadata,
  className = '',
  compact = false,
}: NftMetadataCardProps) {
  const { t } = useI18n();

  // 格式化铸造时间
  const formatMintedAt = (timestamp?: number) => {
    if (!timestamp) return null;
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // 稀有度颜色
  const getRarityColor = (rarity?: string) => {
    switch (rarity?.toLowerCase()) {
      case 'legendary':
        return 'text-warning';
      case 'epic':
        return 'text-primary';
      case 'rare':
        return 'text-info';
      default:
        return 'text-muted-foreground';
    }
  };

  if (compact) {
    return (
      <div className={cn('p-3 bg-warning/8 rounded-lg border border-warning/20', className)}>
        <div className="flex items-center justify-between gap-4 text-sm">
          <div className="flex items-center gap-2 text-warning">
            <ImageIcon className="w-4 h-4" />
            <span className="font-medium">{metadata.collection || 'NFT'}</span>
          </div>
          <div className="flex items-center gap-3 text-muted-foreground">
            {metadata.creator && <span>{metadata.creator}</span>}
            {metadata.rarity && (
              <span className={cn('font-medium', getRarityColor(metadata.rarity))}>
                {metadata.rarity}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('p-4 bg-warning/8 rounded-lg border border-warning/20', className)}>
      <h5 className="font-medium text-warning mb-3 flex items-center gap-2">
        <ImageIcon className="w-4 h-4" />
        {t('listing.rwa.nftMetadata') || 'NFT 信息'}
      </h5>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {metadata.creator && (
          <div className="text-center p-2 bg-card rounded-lg">
            <div className="text-xs text-muted-foreground mb-1 flex items-center justify-center gap-1">
              <User className="w-3 h-3" />
              {t('listing.rwa.creator') || '创作者'}
            </div>
            <div className="font-semibold text-warning truncate">{metadata.creator}</div>
          </div>
        )}
        {metadata.collection && (
          <div className="text-center p-2 bg-card rounded-lg">
            <div className="text-xs text-muted-foreground mb-1 flex items-center justify-center gap-1">
              <Layers className="w-3 h-3" />
              {t('listing.rwa.collection') || '收藏系列'}
            </div>
            <div className="font-semibold text-warning truncate">{metadata.collection}</div>
          </div>
        )}
        {metadata.rarity && (
          <div className="text-center p-2 bg-card rounded-lg">
            <div className="text-xs text-muted-foreground mb-1 flex items-center justify-center gap-1">
              <Star className="w-3 h-3" />
              {t('listing.rwa.rarity') || '稀有度'}
            </div>
            <div className={cn('font-semibold', getRarityColor(metadata.rarity))}>
              {metadata.rarity}
            </div>
          </div>
        )}
        {metadata.mintedAt && (
          <div className="text-center p-2 bg-card rounded-lg">
            <div className="text-xs text-muted-foreground mb-1 flex items-center justify-center gap-1">
              <Clock className="w-3 h-3" />
              {t('listing.rwa.mintedAt') || '铸造时间'}
            </div>
            <div className="font-semibold text-warning text-xs">
              {formatMintedAt(metadata.mintedAt)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default NftMetadataCard;
