'use client';

import React, { useCallback } from 'react';
import { Package, FileDigit, Briefcase, Coins, ArrowRight } from 'lucide-react';
import type { ContractType } from '@mobazha/core';
import { useI18n } from '@mobazha/core';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { AssetTypeSelector } from '@/components/RwaToken';
import type { StepProps } from './types';

interface ProductTypeOption {
  value: ContractType;
  labelKey: string;
  descriptionKey: string;
  icon: React.ReactNode;
  color: string;
}

const productTypeOptions: ProductTypeOption[] = [
  {
    value: 'PHYSICAL_GOOD',
    labelKey: 'listing.types.physicalGood',
    descriptionKey: 'listing.types.physicalGoodDesc',
    icon: <Package className="w-8 h-8" />,
    color: '#3b82f6',
  },
  {
    value: 'DIGITAL_GOOD',
    labelKey: 'listing.types.digitalGood',
    descriptionKey: 'listing.types.digitalGoodDesc',
    icon: <FileDigit className="w-8 h-8" />,
    color: '#8b5cf6',
  },
  {
    value: 'SERVICE',
    labelKey: 'listing.types.service',
    descriptionKey: 'listing.types.serviceDesc',
    icon: <Briefcase className="w-8 h-8" />,
    color: '#10b981',
  },
  {
    value: 'RWA_TOKEN',
    labelKey: 'listing.types.rwaToken',
    descriptionKey: 'listing.types.rwaTokenDesc',
    icon: <Coins className="w-8 h-8" />,
    color: '#f59e0b',
  },
];

/**
 * 步骤1：商品类型选择
 */
export function StepProductType({ formData, updateField, updateFields, onNext }: StepProps) {
  const { t } = useI18n();

  const handleTypeSelect = useCallback(
    (type: ContractType) => {
      // 重置 RWA 相关字段
      if (type !== 'RWA_TOKEN') {
        updateFields({
          contractType: type,
          rwaAssetType: null,
          selectedAsset: null,
          tokenStandard: null,
          tokenAddress: '',
          tokenId: '',
          slotId: '',
        });
      } else {
        updateField('contractType', type);
      }
    },
    [updateField, updateFields]
  );

  const canProceed = formData.contractType !== 'RWA_TOKEN' || formData.rwaAssetType !== null;

  return (
    <div className="space-y-8">
      {/* 标题 */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground mb-2">
          {t('listing.wizard.selectType')}
        </h2>
        <p className="text-muted-foreground">{t('listing.wizard.selectTypeDesc')}</p>
      </div>

      {/* 商品类型选择 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {productTypeOptions.map(option => {
          const isSelected = formData.contractType === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => handleTypeSelect(option.value)}
              className={cn(
                'relative p-6 rounded-2xl border-2 text-left transition-all duration-200',
                isSelected
                  ? 'border-primary bg-primary/5 shadow-lg'
                  : 'border-border hover:border-primary/50 hover:bg-muted/50'
              )}
            >
              {/* 选中指示器 */}
              {isSelected && (
                <div
                  className="absolute top-3 right-3 w-3 h-3 rounded-full"
                  style={{ backgroundColor: option.color }}
                />
              )}

              {/* 图标 */}
              <div
                className={cn(
                  'mb-4 p-3 rounded-xl w-fit transition-colors',
                  isSelected ? 'text-primary' : 'text-muted-foreground'
                )}
                style={{
                  backgroundColor: isSelected ? `${option.color}20` : undefined,
                  color: isSelected ? option.color : undefined,
                }}
              >
                {option.icon}
              </div>

              {/* 标题 */}
              <h3
                className={cn(
                  'font-semibold text-base mb-1',
                  isSelected ? 'text-primary' : 'text-foreground'
                )}
              >
                {t(option.labelKey)}
              </h3>

              {/* 描述 */}
              <p className="text-xs text-muted-foreground line-clamp-2">
                {t(option.descriptionKey)}
              </p>
            </button>
          );
        })}
      </div>

      {/* RWA 资产类型选择 */}
      {formData.contractType === 'RWA_TOKEN' && (
        <div className="pt-4 border-t border-border">
          <AssetTypeSelector
            value={formData.rwaAssetType}
            onChange={type => updateField('rwaAssetType', type)}
          />
        </div>
      )}

      {/* 下一步按钮 */}
      <div className="flex justify-end pt-4">
        <Button onClick={onNext} disabled={!canProceed} size="lg">
          {t('common.next')}
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}

export default StepProductType;
