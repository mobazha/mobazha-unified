'use client';

import React, { useCallback } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import type { PredefinedAsset, AssetTypeCode } from '@mobazha/core';
import { useI18n, getAssetType } from '@mobazha/core';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { PredefinedAssetList, SelectedAssetDetail } from '@/components/RwaToken';
import type { StepProps } from './types';

/**
 * 步骤2：RWA 资产选择
 */
export function StepRwaAssetSelect({
  formData,
  updateField,
  updateFields,
  errors,
  onNext,
  onPrev,
}: StepProps) {
  const { t } = useI18n();

  const isCustomMode = formData.rwaAssetType === 'CUSTOM';
  const assetType = formData.rwaAssetType ? getAssetType(formData.rwaAssetType) : null;

  const handleAssetSelect = useCallback(
    (asset: PredefinedAsset) => {
      updateFields({
        selectedAsset: asset,
        tokenStandard: asset.tokenStandard,
        tokenAddress: asset.contractAddress,
        tokenId: asset.tokenId,
        slotId: asset.slotId || '',
      });
    },
    [updateFields]
  );

  const canProceed = isCustomMode
    ? formData.tokenStandard && formData.tokenAddress && formData.tokenId
    : formData.selectedAsset !== null;

  return (
    <div className="space-y-8">
      {/* 标题 */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground mb-2">
          {isCustomMode
            ? t('listing.wizard.configureAsset') || '配置资产信息'
            : t('listing.wizard.selectAsset') || '选择要出售的资产'}
        </h2>
        <p className="text-muted-foreground">
          {isCustomMode
            ? t('listing.wizard.configureAssetDesc') || '手动输入 Token 合约地址和参数'
            : t('listing.wizard.selectAssetDesc') || '从预定义资产中选择'}
        </p>
      </div>

      {/* 自定义模式 */}
      {isCustomMode ? (
        <Card className="p-6 space-y-5">
          {/* Token 标准选择 */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">
              {t('listing.rwa.tokenStandard') || 'Token 标准'}{' '}
              <span className="text-destructive">*</span>
            </label>
            <Select
              value={formData.tokenStandard || ''}
              onValueChange={v =>
                updateField('tokenStandard', v as 'ERC721' | 'ERC1155' | 'ERC3525')
              }
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={t('listing.rwa.selectTokenStandard') || '选择 Token 标准'}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ERC721">ERC721 (NFT)</SelectItem>
                <SelectItem value="ERC1155">ERC1155 (半同质化)</SelectItem>
                <SelectItem value="ERC3525">ERC3525 (可拆分份额)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 合约地址 */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">
              {t('listing.rwa.contractAddress') || '合约地址'}{' '}
              <span className="text-destructive">*</span>
            </label>
            <Input
              value={formData.tokenAddress}
              onChange={e => updateField('tokenAddress', e.target.value)}
              placeholder="0x..."
              className="font-mono"
            />
            {errors.tokenAddress && (
              <p className="text-destructive text-sm mt-1">{errors.tokenAddress}</p>
            )}
          </div>

          {/* Token ID */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">
              Token ID <span className="text-destructive">*</span>
            </label>
            <Input
              value={formData.tokenId}
              onChange={e => updateField('tokenId', e.target.value)}
              placeholder="1"
            />
            {errors.tokenId && <p className="text-destructive text-sm mt-1">{errors.tokenId}</p>}
          </div>

          {/* Slot ID (仅 ERC3525) */}
          {formData.tokenStandard === 'ERC3525' && (
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                Slot ID <span className="text-destructive">*</span>
              </label>
              <Input
                value={formData.slotId}
                onChange={e => updateField('slotId', e.target.value)}
                placeholder="1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {t('listing.rwa.slotIdHelper') || 'ERC3525 Slot ID，表示资产类别'}
              </p>
            </div>
          )}
        </Card>
      ) : (
        /* 预定义资产模式 */
        <div className="space-y-6">
          {/* 资产类型信息 */}
          {assetType && (
            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
              <span className="text-3xl">{assetType.icon}</span>
              <div>
                <h3 className="font-semibold">{assetType.name}</h3>
                <p className="text-sm text-muted-foreground">{assetType.description}</p>
              </div>
            </div>
          )}

          {/* 资产列表 */}
          {formData.rwaAssetType && (
            <PredefinedAssetList
              assetType={formData.rwaAssetType as AssetTypeCode}
              selectedAssetId={formData.selectedAsset?.id || null}
              onSelect={handleAssetSelect}
            />
          )}

          {/* 选中资产详情 */}
          {formData.selectedAsset && <SelectedAssetDetail asset={formData.selectedAsset} />}
        </div>
      )}

      {/* 导航按钮 */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onPrev}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t('common.prev') || '上一步'}
        </Button>
        <Button onClick={onNext} disabled={!canProceed}>
          {t('common.next') || '下一步'}
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}

export default StepRwaAssetSelect;
