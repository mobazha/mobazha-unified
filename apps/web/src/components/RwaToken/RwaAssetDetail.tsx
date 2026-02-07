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
  /** 链上份额数据 */
  chainData?: {
    totalAmount?: string;
    availableAmount?: string;
    status?: string;
  } | null;
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
  chainData,
}: RwaAssetDetailProps) {
  const { t } = useI18n();

  // 计算链上份额数据
  const sharesInfo = useMemo(() => {
    if (!chainData?.totalAmount || !chainData?.availableAmount) return null;
    const total = Number(chainData.totalAmount);
    const available = Number(chainData.availableAmount);
    const sold = total - available;
    const percentage = total > 0 ? Math.round((sold / total) * 100) : 0;
    return {
      total,
      available,
      sold,
      percentage,
    };
  }, [chainData]);

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
            <span className="text-xs font-medium text-success bg-success/10 px-2 py-1 rounded border border-success/20">
              {t('listing.rwa.verifiedAsset') || '已认证资产'}
            </span>
          )}
        </div>

        {/* 预定义资产显示资产名称和描述 */}
        {source === 'predefined' && (
          <div className="mb-4 pb-4 border-b border-border">
            <h4 className="font-semibold text-foreground mb-1">{name}</h4>
            <p className="text-sm text-foreground/70">{description}</p>
          </div>
        )}

        {/* 交易模式和支付方式信息 */}
        <div
          className={cn(
            'rounded-lg p-3 mb-4 border',
            isConfirmRequired ? 'bg-warning/8 border-warning/20' : 'bg-success/8 border-success/20'
          )}
        >
          <div className="flex items-center flex-wrap gap-3 mb-1.5">
            <div
              className={cn(
                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-semibold text-white text-sm',
                isConfirmRequired ? 'bg-warning' : 'bg-success'
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
              <span className="text-xs text-warning bg-warning/15 px-2 py-0.5 rounded border border-warning/25">
                {t('listing.rwa.escrowTimeout') || '托管超时'}:{' '}
                {formatEscrowTimeout(escrowTimeoutSeconds)}
              </span>
            )}
          </div>
          <p
            className={cn(
              'text-sm font-medium',
              isConfirmRequired ? 'text-warning' : 'text-success'
            )}
          >
            {isConfirmRequired
              ? t('listing.rwa.confirmTradeHint') ||
                '付款进入托管，卖家确认后完成交易。超时未确认将自动退款。'
              : t('listing.rwa.instantTradeHint') || '付款后立即获得 RWA 份额'}
          </p>
          {acceptedCurrencies && acceptedCurrencies.length > 0 && (
            <div className="flex items-center flex-wrap gap-2 mt-2">
              <span className="text-xs text-foreground/60">
                {t('listing.rwa.acceptedPayments') || '接受的支付方式'}:
              </span>
              {acceptedCurrencies.map((coin, index) => (
                <span
                  key={index}
                  className="text-xs font-medium bg-muted px-2 py-0.5 rounded border border-border"
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

        {/* 权益列表（卡片内部） */}
        {rights && rights.length > 0 && (
          <div className="pt-3 border-t border-border">
            <RightsListCard rights={rights} compact={compact} />
          </div>
        )}
      </Card>

      {/* 购买流程提示 */}
      {showPurchaseHint && <AtomicSwapPurchaseHint compact={compact} />}

      {/* 链上份额信息 */}
      {sharesInfo && (
        <Card className="p-4 bg-success/5 border-success/20">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm">📊</span>
            <h4 className="font-semibold text-success text-sm">
              {t('listing.rwa.sharesInfo') || '份额信息'}
            </h4>
            <span className="ml-auto text-xs text-success bg-success/10 px-2 py-0.5 rounded">
              🔗 {t('listing.rwa.onChainData') || '链上数据'}
            </span>
          </div>
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">
                {t('listing.rwa.totalSharesOnChain') || '出售总份额'}
              </span>
              <span className="text-sm font-bold text-success">
                {sharesInfo.total.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">
                {t('listing.rwa.availableShares') || '剩余份额'}
              </span>
              <span className="text-sm font-bold text-success">
                {sharesInfo.available.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">
                {t('listing.rwa.soldShares') || '已售份额'}
              </span>
              <span className="text-sm font-bold text-warning">
                {sharesInfo.sold.toLocaleString()}
              </span>
            </div>
          </div>
          {/* 进度条 */}
          <div className="mt-3 flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-success rounded-full transition-all"
                style={{ width: `${sharesInfo.percentage}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {t('listing.rwa.soldPercentage') || '已售'} {sharesInfo.percentage}%
            </span>
          </div>
        </Card>
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
