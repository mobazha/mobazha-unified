'use client';

import React, { useCallback } from 'react';
import { Package, FileDigit, Briefcase } from 'lucide-react';
import type { ContractType } from '@mobazha/core';
import { useI18n } from '@mobazha/core';

interface ProductTypeOption {
  value: ContractType;
  labelKey: string;
  descriptionKey: string;
  icon: React.ReactNode;
}

const productTypeOptions: ProductTypeOption[] = [
  {
    value: 'PHYSICAL_GOOD',
    labelKey: 'listing.types.physicalGood',
    descriptionKey: 'listing.types.physicalGoodDesc',
    icon: <Package className="w-6 h-6" />,
  },
  {
    value: 'DIGITAL_GOOD',
    labelKey: 'listing.types.digitalGood',
    descriptionKey: 'listing.types.digitalGoodDesc',
    icon: <FileDigit className="w-6 h-6" />,
  },
  {
    value: 'SERVICE',
    labelKey: 'listing.types.service',
    descriptionKey: 'listing.types.serviceDesc',
    icon: <Briefcase className="w-6 h-6" />,
  },
];

export interface ProductTypeSelectorProps {
  value: ContractType;
  onChange: (type: ContractType) => void;
  disabled?: boolean;
  className?: string;
}

export function ProductTypeSelector({
  value,
  onChange,
  disabled = false,
  className = '',
}: ProductTypeSelectorProps) {
  const { t } = useI18n();

  const handleSelect = useCallback(
    (type: ContractType) => {
      if (!disabled && type !== value) {
        onChange(type);
      }
    },
    [disabled, value, onChange]
  );

  return (
    <div className={`grid grid-cols-3 gap-3 ${className}`}>
      {productTypeOptions.map(option => {
        const isSelected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => handleSelect(option.value)}
            disabled={disabled}
            className={`
              relative p-4 rounded-xl border-2 text-left transition-all duration-200
              ${
                isSelected
                  ? 'border-primary bg-primary/5 shadow-sm'
                  : 'border-border hover:border-primary/50 hover:bg-muted/50'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            {/* 选中指示器 */}
            {isSelected && (
              <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary" />
            )}

            {/* 图标 */}
            <div
              className={`
              mb-3 p-2 rounded-lg w-fit
              ${isSelected ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}
            `}
            >
              {option.icon}
            </div>

            {/* 标题 */}
            <h3
              className={`
              font-semibold text-sm mb-1
              ${isSelected ? 'text-primary' : 'text-foreground'}
            `}
            >
              {t(option.labelKey) || option.value.replace('_', ' ')}
            </h3>

            {/* 描述 */}
            <p className="text-xs text-muted-foreground line-clamp-2">
              {t(option.descriptionKey) || getDefaultDescription(option.value)}
            </p>
          </button>
        );
      })}
    </div>
  );
}

function getDefaultDescription(type: ContractType): string {
  switch (type) {
    case 'PHYSICAL_GOOD':
      return 'Tangible items that need shipping';
    case 'DIGITAL_GOOD':
      return 'Downloadable files or digital content';
    case 'SERVICE':
      return 'Professional services or consulting';
    case 'RWA_TOKEN':
      return 'Real World Asset tokenized on blockchain';
    case 'CRYPTOCURRENCY':
      return 'Cryptocurrency trading';
    default:
      return '';
  }
}

export default ProductTypeSelector;
