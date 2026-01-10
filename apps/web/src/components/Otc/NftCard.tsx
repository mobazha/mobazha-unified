'use client';

import { memo } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import type { UserNft } from '@mobazha/core';

interface NftCardProps {
  nft: UserNft;
  isSelected?: boolean;
  onClick?: () => void;
  className?: string;
}

/**
 * NFT 卡片组件
 * 用于展示用户的 NFT 资产
 */
export const NftCard = memo(function NftCard({
  nft,
  isSelected = false,
  onClick,
  className,
}: NftCardProps) {
  return (
    <article
      onClick={onClick}
      className={cn(
        'relative cursor-pointer overflow-hidden rounded-xl border-2 bg-card transition-all duration-200',
        'hover:shadow-lg hover:-translate-y-0.5',
        isSelected
          ? 'border-primary ring-2 ring-primary/20'
          : 'border-border hover:border-primary/50',
        className
      )}
      data-testid={`nft-card-${nft.tokenId}`}
    >
      {/* NFT 图片 */}
      <div className="relative aspect-square overflow-hidden bg-muted">
        {nft.metadata.image ? (
          <Image
            src={nft.metadata.image}
            alt={nft.metadata.name}
            fill
            className="object-cover transition-transform duration-300 hover:scale-105"
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            No Image
          </div>
        )}

        {/* 选中覆盖层 */}
        {isSelected && (
          <div className="absolute inset-0 flex items-center justify-center bg-primary/20">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Check className="h-6 w-6" />
            </div>
          </div>
        )}
      </div>

      {/* NFT 信息 */}
      <div className="p-3">
        <h3 className="truncate text-sm font-semibold text-foreground">
          {nft.metadata.name}
        </h3>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          #{nft.tokenId}
        </p>
        {nft.metadata.creator && (
          <p className="mt-1 truncate text-xs text-muted-foreground">
            创作者: {nft.metadata.creator}
          </p>
        )}
      </div>

      {/* Token ID 徽章 */}
      <div className="absolute right-2 top-2 rounded-full bg-background/80 px-2 py-0.5 text-xs font-medium backdrop-blur-sm">
        #{nft.tokenId}
      </div>
    </article>
  );
});

export default NftCard;
