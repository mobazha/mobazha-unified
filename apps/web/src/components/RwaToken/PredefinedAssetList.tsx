'use client';

import React, { useCallback, useMemo } from 'react';
import { CheckCircle, Users, TrendingUp } from 'lucide-react';
import type { PredefinedAsset, AssetTypeCode } from '@mobazha/core';
import { useI18n, getAssetsByType } from '@mobazha/core';
import { cn } from '@/lib/utils';

export interface PredefinedAssetListProps {
  assetType: AssetTypeCode;
  selectedAssetId: string | null;
  onSelect: (asset: PredefinedAsset) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * 预定义资产列表
 * 根据资产类型显示可选的预定义资产
 */
export function PredefinedAssetList({
  assetType,
  selectedAssetId,
  onSelect,
  disabled = false,
  className = '',
}: PredefinedAssetListProps) {
  const { t } = useI18n();

  // 获取当前类型的资产列表
  const assets = useMemo(() => getAssetsByType(assetType), [assetType]);

  const handleSelect = useCallback(
    (asset: PredefinedAsset) => {
      if (!disabled) {
        onSelect(asset);
      }
    },
    [disabled, onSelect]
  );

  if (assets.length === 0) {
    return null;
  }

  return (
    <div className={cn('space-y-3', className)}>
      <label className="block text-sm font-medium text-muted-foreground mb-2">
        {t('listing.rwa.selectAsset') || '选择要出售的资产'}
      </label>
      <div className="space-y-3">
        {assets.map(asset => {
          const isSelected = selectedAssetId === asset.id;
          const isErc1155 = asset.tokenStandard === 'ERC1155';
          const isErc3525 = asset.tokenStandard === 'ERC3525';

          return (
            <button
              key={asset.id}
              type="button"
              onClick={() => handleSelect(asset)}
              disabled={disabled}
              className={cn(
                'w-full relative p-4 rounded-xl border-2 text-left transition-all duration-200',
                isSelected
                  ? 'border-primary bg-primary/5 shadow-md'
                  : 'border-border hover:border-primary/50 hover:bg-muted/50',
                disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
              )}
            >
              <div className="flex items-start gap-4">
                {/* Emoji 图标 */}
                <div className="text-4xl flex-shrink-0">{asset.emoji}</div>

                {/* 内容区域 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-foreground truncate pr-4">{asset.name}</h3>
                    {isSelected && <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />}
                  </div>

                  <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                    {asset.description}
                  </p>

                  {/* 标签和信息 */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-muted text-muted-foreground">
                      {asset.typeName}
                    </span>

                    <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-primary/10 text-primary">
                      {t('listing.rwa.available') || '可售'}: {asset.balance} {asset.unit}
                    </span>

                    {/* ERC1155 会员信息 */}
                    {isErc1155 && asset.membership && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
                        <Users className="w-3 h-3" />
                        {asset.membership.holderCount} {t('listing.rwa.holders') || '人持有'}
                      </span>
                    )}

                    {/* ERC3525 收益信息 */}
                    {isErc3525 && asset.performance && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400">
                        <TrendingUp className="w-3 h-3" />
                        {t('listing.rwa.dividendRate') || '年化'} {asset.performance.dividendRate}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default PredefinedAssetList;
