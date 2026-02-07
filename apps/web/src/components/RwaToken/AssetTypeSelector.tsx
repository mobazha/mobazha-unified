'use client';

import React, { useCallback } from 'react';
import { CheckCircle } from 'lucide-react';
import type { AssetType, AssetTypeCode } from '@mobazha/core';
import { useI18n, getAllAssetTypes } from '@mobazha/core';
import { cn } from '@/lib/utils';

export interface AssetTypeSelectorProps {
  value: AssetTypeCode | null;
  onChange: (type: AssetTypeCode) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * 资产类型选择器
 * 用于选择 RWA 资产类型（创作者权益、百老汇票房、自定义资产）
 */
export function AssetTypeSelector({
  value,
  onChange,
  disabled = false,
  className = '',
}: AssetTypeSelectorProps) {
  const { t } = useI18n();
  const assetTypes = getAllAssetTypes();

  const handleSelect = useCallback(
    (type: AssetTypeCode) => {
      if (!disabled && type !== value) {
        onChange(type);
      }
    },
    [disabled, value, onChange]
  );

  // 获取翻译后的资产类型名称
  const getAssetTypeName = (type: AssetType) => {
    const translations: Record<string, string> = {
      CREATOR: t('listing.rwa.assetTypes.creator'),
      BROADWAY: t('listing.rwa.assetTypes.broadway'),
      CUSTOM: t('listing.rwa.assetTypes.custom'),
    };
    return translations[type.code] || type.name;
  };

  // 获取翻译后的资产类型描述
  const getAssetTypeDesc = (type: AssetType) => {
    const translations: Record<string, string> = {
      CREATOR: t('listing.rwa.assetTypesDesc.creator'),
      BROADWAY: t('listing.rwa.assetTypesDesc.broadway'),
      CUSTOM: t('listing.rwa.assetTypesDesc.custom'),
    };
    return translations[type.code] || type.description;
  };

  return (
    <div className={cn('space-y-3', className)}>
      <label className="block text-sm font-medium text-muted-foreground mb-2">
        {t('listing.rwa.selectAssetType')}
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {assetTypes.map(type => {
          const isSelected = value === type.code;
          return (
            <button
              key={type.code}
              type="button"
              onClick={() => handleSelect(type.code)}
              disabled={disabled}
              className={cn(
                'relative p-5 rounded-xl border-2 text-left transition-all duration-200',
                isSelected
                  ? 'border-primary bg-primary/5 shadow-md'
                  : 'border-border hover:border-primary/50 hover:bg-muted/50',
                disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
              )}
            >
              {/* 选中指示器 */}
              {isSelected && (
                <div className="absolute top-3 right-3">
                  <CheckCircle className="w-5 h-5 text-primary" />
                </div>
              )}

              {/* 图标 */}
              <div className={cn('text-4xl mb-3', isSelected ? 'opacity-100' : 'opacity-80')}>
                {type.icon}
              </div>

              {/* 标题 */}
              <h3
                className={cn(
                  'font-semibold text-base mb-1',
                  isSelected ? 'text-primary' : 'text-foreground'
                )}
              >
                {getAssetTypeName(type)}
              </h3>

              {/* Token 标准标签 */}
              {type.tokenStandard && (
                <span
                  className="inline-block px-2 py-0.5 text-xs font-medium rounded-full mb-2"
                  style={{
                    backgroundColor: `${type.color}20`,
                    color: type.color,
                  }}
                >
                  {type.tokenStandard}
                </span>
              )}

              {/* 描述 */}
              <p className="text-xs text-muted-foreground line-clamp-2">{getAssetTypeDesc(type)}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default AssetTypeSelector;
