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
  /** RWA 交易模式 (0=instant, 1=confirm_required) */
  rwaTradeMode?: number | string;
  /** 托管超时时间（秒） */
  escrowTimeoutSeconds?: number;
  /** 接受的支付币种 */
  acceptedCurrencies?: string[];
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
  rwaTradeMode,
  escrowTimeoutSeconds = 86400,
  acceptedCurrencies = [],
}: RwaAssetDetailProps) {
  const { t } = useI18n();

  // 解析 RWA 资产信息
  const rwaAsset = useMemo(() => resolveRwaAsset(product), [product]);

  // 判断交易模式
  const isConfirmRequired =
    rwaTradeMode === 1 || rwaTradeMode === 'RWA_TRADE_MODE_CONFIRM_REQUIRED';

  // 格式化超时时间
  const formatEscrowTimeout = (seconds: number) => {
    if (seconds >= 86400) {
      const days = Math.floor(seconds / 86400);
      return `${days} ${t('common.days') || '天'}`;
    }
    if (seconds >= 3600) {
      const hours = Math.floor(seconds / 3600);
      return `${hours} ${t('common.hours') || '小时'}`;
    }
    const minutes = Math.floor(seconds / 60);
    return `${minutes} ${t('common.minutes') || '分钟'}`;
  };

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

        {/* 交易模式和支付方式信息 */}
        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 mb-4 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center flex-wrap gap-3 mb-2">
            <div
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold text-white text-sm',
                isConfirmRequired ? 'bg-orange-500' : 'bg-emerald-500'
              )}
            >
              <span>{isConfirmRequired ? '🔒' : '⚡'}</span>
              <span>
                {isConfirmRequired
                  ? t('listing.rwa.confirmTrade') || '确认交易'
                  : t('listing.rwa.instantTrade') || '即时交易'}
              </span>
            </div>
            {isConfirmRequired && (
              <span className="text-xs text-muted-foreground bg-background px-2 py-1 rounded border border-border">
                {t('listing.rwa.escrowTimeout') || '托管超时'}:{' '}
                {formatEscrowTimeout(escrowTimeoutSeconds)}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            {isConfirmRequired
              ? t('listing.rwa.confirmTradeHint') ||
                '付款进入托管，卖家确认后完成交易。超时未确认将自动退款。'
              : t('listing.rwa.instantTradeHint') || '付款后立即获得 RWA 份额'}
          </p>
          {acceptedCurrencies && acceptedCurrencies.length > 0 && (
            <div className="flex items-center flex-wrap gap-2">
              <span className="text-xs text-muted-foreground">
                {t('listing.rwa.acceptedPayments') || '接受的支付方式'}:
              </span>
              {acceptedCurrencies.map((coin, index) => (
                <span
                  key={index}
                  className="text-xs font-medium bg-background px-2 py-1 rounded border border-border"
                >
                  {coin}
                </span>
              ))}
            </div>
          )}
        </div>

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
      {rights && rights.length > 0 && <RightsListCard rights={rights} compact={compact} />}

      {/* 购买流程提示 */}
      {showPurchaseHint && <AtomicSwapPurchaseHint compact={compact} />}

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
