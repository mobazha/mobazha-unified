'use client';

import React, { useMemo } from 'react';
import type { Product } from '@mobazha/core';
import { resolveRwaAsset, isRwaTokenProduct, useI18n } from '@mobazha/core';
import { cn } from '@/lib/utils';
import { RwaAssetBadge } from './RwaAssetBadge';
import { MembershipInfoCard } from './MembershipInfoCard';
import { RevenueInfoCard } from './RevenueInfoCard';
import { NftMetadataCard } from './NftMetadataCard';
import { RightsListCard } from './RightsListCard';
import { BlockchainInfoCard } from './BlockchainInfoCard';
import { AtomicSwapPurchaseHint } from './AtomicSwapPurchaseHint';
import { Card } from '@/components/ui/card';

export interface RwaAssetDetailProps {
  product: Product;
  className?: string;
  showPurchaseHint?: boolean;
  compact?: boolean;
}

/**
 * RWA 资产详情展示组件
 * 用于商品详情页，展示 RWA 资产的完整信息
 * 包括徽章、会员/收益信息、权益列表、区块链信息和购买提示
 */
export function RwaAssetDetail({
  product,
  className = '',
  showPurchaseHint = true,
  compact = false,
}: RwaAssetDetailProps) {
  const { t } = useI18n();

  // 解析 RWA 资产信息
  const rwaAsset = useMemo(() => resolveRwaAsset(product), [product]);

  // 非 RWA 商品不显示
  if (!isRwaTokenProduct(product) || !rwaAsset) {
    return null;
  }

  const {
    tokenStandard,
    typeName,
    emoji,
    blockchain,
    contractAddress,
    tokenId,
    slotId,
    nftMetadata,
    membership,
    performance,
    rights,
    source,
    name,
    description,
  } = rwaAsset;

  return (
    <div className={cn('space-y-4', className)}>
      {/* 资产标识 */}
      <Card className="p-4">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex-1">
            <RwaAssetBadge
              tokenStandard={tokenStandard}
              typeName={typeName}
              emoji={emoji}
              blockchain={blockchain}
              size={compact ? 'sm' : 'md'}
            />
          </div>
          {source === 'predefined' && (
            <span className="text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30 px-2 py-1 rounded">
              {t('listing.rwa.verifiedAsset') || '已认证资产'}
            </span>
          )}
        </div>

        {/* 预定义资产显示资产名称和描述 */}
        {source === 'predefined' && (
          <div className="mb-4 pb-4 border-b border-border">
            <h4 className="font-semibold text-foreground mb-1">{name}</h4>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        )}

        {/* NFT 元数据 (ERC721) */}
        {tokenStandard === 'ERC721' && nftMetadata && (
          <NftMetadataCard metadata={nftMetadata} compact={compact} />
        )}

        {/* 会员信息 (ERC1155) */}
        {tokenStandard === 'ERC1155' && membership && (
          <MembershipInfoCard membership={membership} compact={compact} />
        )}

        {/* 收益信息 (ERC3525) */}
        {tokenStandard === 'ERC3525' && performance && (
          <RevenueInfoCard performance={performance} compact={compact} />
        )}
      </Card>

      {/* 权益列表 */}
      {rights && rights.length > 0 && (
        <RightsListCard rights={rights} compact={compact} />
      )}

      {/* 购买流程提示 */}
      {showPurchaseHint && (
        <AtomicSwapPurchaseHint compact={compact} />
      )}

      {/* 区块链信息 */}
      <BlockchainInfoCard
        blockchain={blockchain}
        contractAddress={contractAddress}
        tokenId={tokenId}
        slotId={slotId}
        tokenStandard={tokenStandard}
        compact={compact}
      />
    </div>
  );
}

export default RwaAssetDetail;
