'use client';

import React from 'react';
import { CheckCircle, Users, Gift, Clock, TrendingUp, Calendar, Coins } from 'lucide-react';
import type { PredefinedAsset } from '@mobazha/core';
import { useI18n } from '@mobazha/core';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface SelectedAssetDetailProps {
  asset: PredefinedAsset;
  className?: string;
}

/**
 * 选中资产详情展示
 * 显示预定义资产的详细信息，包括会员信息或收益信息
 */
export function SelectedAssetDetail({ asset, className = '' }: SelectedAssetDetailProps) {
  const { t } = useI18n();

  const isErc1155 = asset.tokenStandard === 'ERC1155';
  const isErc3525 = asset.tokenStandard === 'ERC3525';

  return (
    <Card className={cn('p-5 border-2 border-success bg-success/8', className)}>
      {/* 标题 */}
      <div className="flex items-center gap-2 mb-4">
        <CheckCircle className="w-5 h-5 text-success" />
        <h4 className="font-semibold text-success">{t('listing.rwa.selectedAsset')}</h4>
      </div>

      {/* 资产基本信息 */}
      <div className="flex items-start gap-4 mb-4">
        <div className="text-4xl">{asset.emoji}</div>
        <div className="flex-1">
          <h3 className="font-semibold text-lg text-foreground mb-1">{asset.name}</h3>
          <p className="text-sm text-muted-foreground">{asset.description}</p>
        </div>
      </div>

      {/* 技术信息 */}
      <div className="grid grid-cols-2 gap-3 text-sm mb-4 p-3 bg-muted/50 rounded-lg">
        <div>
          <span className="text-muted-foreground">{t('listing.rwa.tokenStandard')}:</span>
          <span className="ml-2 font-medium text-foreground">{asset.tokenStandard}</span>
        </div>
        <div>
          <span className="text-muted-foreground">{t('listing.rwa.availableQty')}:</span>
          <span className="ml-2 font-medium text-foreground">
            {asset.balance} {asset.unit}
          </span>
        </div>
        <div className="col-span-2">
          <span className="text-muted-foreground">{t('listing.rwa.contractAddress')}:</span>
          <span className="ml-2 font-mono text-xs text-foreground">
            {asset.contractAddress.slice(0, 10)}...
            {asset.contractAddress.slice(-8)}
          </span>
        </div>
      </div>

      {/* ERC1155 会员信息 */}
      {isErc1155 && asset.membership && (
        <div className="mb-4 p-4 bg-primary/8 rounded-lg border border-primary/20">
          <h5 className="font-medium text-primary mb-3 flex items-center gap-2">
            <Users className="w-4 h-4" />
            {t('listing.rwa.membershipInfo')}
          </h5>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="text-center p-2 bg-card rounded-lg">
              <div className="text-xs text-muted-foreground mb-1">
                {t('listing.rwa.memberLevel')}
              </div>
              <div className="font-semibold text-primary">{asset.membership.level}</div>
            </div>
            <div className="text-center p-2 bg-card rounded-lg">
              <div className="text-xs text-muted-foreground mb-1">
                {t('listing.rwa.currentHolders')}
              </div>
              <div className="font-semibold text-primary">{asset.membership.holderCount}</div>
            </div>
            <div className="text-center p-2 bg-card rounded-lg">
              <div className="text-xs text-muted-foreground mb-1">
                {t('listing.rwa.exclusivePerks')}
              </div>
              <div className="font-semibold text-primary">{asset.membership.exclusivePerks}</div>
            </div>
            <div className="text-center p-2 bg-card rounded-lg">
              <div className="text-xs text-muted-foreground mb-1">{t('listing.rwa.validity')}</div>
              <div className="font-semibold text-primary">{asset.membership.validityType}</div>
            </div>
          </div>
        </div>
      )}

      {/* ERC3525 收益信息 */}
      {isErc3525 && asset.performance && (
        <div className="mb-4 p-4 bg-primary/8 rounded-lg border border-primary/20">
          <h5 className="font-medium text-primary mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            {t('listing.rwa.revenueInfo')}
          </h5>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-2 bg-card rounded-lg">
              <div className="text-xs text-muted-foreground mb-1 flex items-center justify-center gap-1">
                <Coins className="w-3 h-3" />
                {t('listing.rwa.totalShares')}
              </div>
              <div className="font-semibold text-primary">
                {asset.performance.totalShares.toLocaleString()}
              </div>
            </div>
            <div className="text-center p-2 bg-card rounded-lg">
              <div className="text-xs text-muted-foreground mb-1 flex items-center justify-center gap-1">
                <TrendingUp className="w-3 h-3" />
                {t('listing.rwa.annualRate')}
              </div>
              <div className="font-semibold text-primary">{asset.performance.dividendRate}</div>
            </div>
            <div className="text-center p-2 bg-card rounded-lg">
              <div className="text-xs text-muted-foreground mb-1 flex items-center justify-center gap-1">
                <Calendar className="w-3 h-3" />
                {t('listing.rwa.settlementPeriod')}
              </div>
              <div className="font-semibold text-primary">{asset.performance.settlementPeriod}</div>
            </div>
          </div>
        </div>
      )}

      {/* 权益列表 */}
      {asset.rights && asset.rights.length > 0 && (
        <div className="p-4 bg-muted/50 rounded-lg">
          <h5 className="font-medium text-foreground mb-3 flex items-center gap-2">
            <Gift className="w-4 h-4 text-primary" />
            {t('listing.rwa.holderRights')}
          </h5>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {asset.rights.map((right, index) => (
              <div key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="w-4 h-4 text-success flex-shrink-0" />
                <span>{right}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

export default SelectedAssetDetail;
