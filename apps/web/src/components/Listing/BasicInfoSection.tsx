'use client';

import React, { useCallback } from 'react';
import type { ContractType, ProductCondition, WeightUnit, DimensionUnit } from '@mobazha/core';
import { useI18n, calculateDiscountPercent } from '@mobazha/core';
import { AiAssistButton } from './AiAssistant';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { RichTextEditor } from '@/components/ui/RichTextEditor';

interface BasicInfoSectionProps {
  title: string;
  shortDescription?: string;
  description: string;
  price: string;
  compareAtPrice?: string;
  pricingCurrency: string;
  contractType: ContractType;
  condition?: ProductCondition;
  grams?: number;
  weightUnit?: WeightUnit;
  sku?: string;
  barcode?: string;
  onTitleChange: (value: string) => void;
  onShortDescriptionChange?: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onPriceChange: (value: string) => void;
  onCompareAtPriceChange?: (value: string) => void;
  onCurrencyChange: (value: string) => void;
  onConditionChange?: (value: ProductCondition) => void;
  onGramsChange?: (value: number) => void;
  onWeightUnitChange?: (value: WeightUnit) => void;
  onSkuChange?: (value: string) => void;
  onBarcodeChange?: (value: string) => void;
  packageLength?: number;
  packageWidth?: number;
  packageHeight?: number;
  dimensionUnit?: DimensionUnit;
  brand?: string;
  onPackageLengthChange?: (value: number | undefined) => void;
  onPackageWidthChange?: (value: number | undefined) => void;
  onPackageHeightChange?: (value: number | undefined) => void;
  onDimensionUnitChange?: (value: DimensionUnit) => void;
  onBrandChange?: (value: string) => void;
  errors?: {
    title?: string;
    price?: string;
    compareAtPrice?: string;
    condition?: string;
  };
  className?: string;
  /** AI assist: callback to improve title */
  onAiImproveTitle?: () => void;
  /** AI assist: callback to polish description */
  onAiPolishDescription?: () => void;
  /** AI assist: loading action name */
  aiLoadingAction?: string | null;
}

const currencies = [
  { value: 'USD', label: 'USD ($)' },
  { value: 'CNY', label: 'CNY (¥)' },
  { value: 'EUR', label: 'EUR (€)' },
  { value: 'GBP', label: 'GBP (£)' },
  { value: 'JPY', label: 'JPY (¥)' },
  { value: 'BTC', label: 'BTC (₿)' },
  { value: 'ETH', label: 'ETH (Ξ)' },
  { value: 'USDT', label: 'USDT' },
];

const conditions: { value: ProductCondition; labelKey: string }[] = [
  { value: 'NEW', labelKey: 'listing.conditions.new' },
  { value: 'USED_EXCELLENT', labelKey: 'listing.conditions.usedExcellent' },
  { value: 'USED_GOOD', labelKey: 'listing.conditions.usedGood' },
  { value: 'USED_POOR', labelKey: 'listing.conditions.usedPoor' },
  { value: 'REFURBISHED', labelKey: 'listing.conditions.refurbished' },
];

export function BasicInfoSection({
  title,
  shortDescription,
  description,
  price,
  compareAtPrice,
  pricingCurrency,
  contractType,
  condition,
  grams,
  weightUnit = 'g',
  sku,
  barcode,
  onTitleChange,
  onShortDescriptionChange,
  onDescriptionChange,
  onPriceChange,
  onCompareAtPriceChange,
  onCurrencyChange,
  onConditionChange,
  onGramsChange,
  onWeightUnitChange,
  onSkuChange,
  onBarcodeChange,
  packageLength,
  packageWidth,
  packageHeight,
  dimensionUnit = 'cm',
  brand = '',
  onPackageLengthChange,
  onPackageWidthChange,
  onPackageHeightChange,
  onDimensionUnitChange,
  onBrandChange,
  errors = {},
  className = '',
  onAiImproveTitle,
  onAiPolishDescription,
  aiLoadingAction,
}: BasicInfoSectionProps) {
  const { t } = useI18n();

  const isPhysicalGood = contractType === 'PHYSICAL_GOOD';
  const showCondition = isPhysicalGood;
  const showWeight = isPhysicalGood;

  const handleGramsChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = parseFloat(e.target.value) || 0;
      onGramsChange?.(value);
    },
    [onGramsChange]
  );

  // Currency symbol for prefix display
  const currencySymbol = React.useMemo(() => {
    const symbols: Record<string, string> = {
      USD: '$',
      CNY: '¥',
      EUR: '€',
      GBP: '£',
      JPY: '¥',
      BTC: '₿',
      ETH: 'Ξ',
      USDT: '$',
    };
    return symbols[pricingCurrency] || pricingCurrency;
  }, [pricingCurrency]);

  // Calculate discount percentage (uses BigNumber internally via @mobazha/core)
  const discountPercent = React.useMemo(
    () => calculateDiscountPercent(compareAtPrice, price),
    [compareAtPrice, price]
  );

  return (
    <Card className={`p-6 ${className}`}>
      <h2 className="text-lg font-semibold text-foreground mb-4">{t('listing.basicInfo')}</h2>

      <div className="space-y-4">
        {/* 标题 */}
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <label className="text-sm font-medium text-muted-foreground">
              {t('listing.title')} <span className="text-destructive">*</span>
            </label>
            {onAiImproveTitle && title.length > 0 && (
              <AiAssistButton
                onClick={onAiImproveTitle}
                isLoading={aiLoadingAction === 'improve_title'}
                label={t('ai.improveTitle', { defaultValue: 'AI Improve' })}
              />
            )}
          </div>
          <input
            type="text"
            value={title}
            onChange={e => onTitleChange(e.target.value)}
            maxLength={255}
            className={`
              w-full px-4 py-2.5 rounded-lg border bg-background text-foreground
              focus:outline-none focus:ring-2 focus:ring-primary/50
              ${errors.title ? 'border-destructive' : 'border-border'}
            `}
            placeholder={t('listing.titlePlaceholder')}
          />
          <div className="flex justify-between mt-1">
            {errors.title ? (
              <p className="text-destructive text-sm">{errors.title}</p>
            ) : (
              <p className="text-xs text-muted-foreground">{t('listing.titleHelper')}</p>
            )}
            <span className="text-xs text-muted-foreground">{title.length}/255</span>
          </div>
        </div>

        {/* 短描述 */}
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1.5">
            {t('listing.shortDescription')}
          </label>
          <textarea
            value={shortDescription || ''}
            onChange={e => onShortDescriptionChange?.(e.target.value)}
            rows={2}
            maxLength={250}
            className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
            placeholder={t('listing.shortDescriptionPlaceholder')}
          />
          <div className="flex justify-between mt-1">
            <p className="text-xs text-muted-foreground">{t('listing.shortDescriptionHelper')}</p>
            <span className="text-xs text-muted-foreground">
              {(shortDescription || '').length}/250
            </span>
          </div>
        </div>

        {/* 价格和划线价 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">
              {t('listing.price')} <span className="text-destructive">*</span>
            </label>
            <div className="flex gap-2">
              <div
                className={`flex items-center flex-1 min-w-0 rounded-lg border bg-background focus-within:ring-2 focus-within:ring-primary/50 ${errors.price ? 'border-destructive' : 'border-border'}`}
              >
                <span className="pl-3 text-muted-foreground text-sm select-none">
                  {currencySymbol}
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={price}
                  onChange={e => onPriceChange(e.target.value)}
                  className="flex-1 min-w-0 px-2 py-2.5 bg-transparent text-foreground focus:outline-none"
                  placeholder="0.00"
                />
              </div>
              <Select value={pricingCurrency} onValueChange={onCurrencyChange}>
                <SelectTrigger className="w-28 shrink-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currencies.map(c => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {errors.price && <p className="text-destructive text-sm mt-1">{errors.price}</p>}
            <p className="text-xs text-muted-foreground mt-1">{t('listing.priceHelper')}</p>
          </div>

          {/* 划线价 */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">
              {t('listing.compareAtPrice')}
            </label>
            <div
              className={`flex items-center rounded-lg border bg-background focus-within:ring-2 focus-within:ring-primary/50 ${errors.compareAtPrice ? 'border-destructive' : 'border-border'}`}
            >
              <span className="pl-3 text-muted-foreground text-sm select-none">
                {currencySymbol}
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={compareAtPrice || ''}
                onChange={e => onCompareAtPriceChange?.(e.target.value)}
                className="flex-1 min-w-0 px-2 py-2.5 bg-transparent text-foreground focus:outline-none"
                placeholder="0.00"
              />
            </div>
            {errors.compareAtPrice && (
              <p className="text-destructive text-sm mt-1">{errors.compareAtPrice}</p>
            )}
            <div className="flex items-center gap-2 mt-1">
              <p className="text-xs text-muted-foreground">{t('listing.compareAtPriceHelper')}</p>
              {discountPercent && (
                <span className="text-xs font-medium text-primary">
                  {t('listing.discount', { percent: String(discountPercent) })}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 商品状态 - 仅物理商品 */}
        {showCondition && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                {t('listing.condition')} <span className="text-destructive">*</span>
              </label>
              <Select
                value={condition || 'NEW'}
                onValueChange={v => onConditionChange?.(v as ProductCondition)}
              >
                <SelectTrigger className={errors.condition ? 'border-destructive' : ''}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {conditions.map(c => (
                    <SelectItem key={c.value} value={c.value}>
                      {t(c.labelKey)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.condition && (
                <p className="text-destructive text-sm mt-1">{errors.condition}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">{t('listing.conditionHelper')}</p>
            </div>
          </div>
        )}

        {/* 重量和 SKU/Barcode - 仅物理商品 */}
        {showWeight && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                {t('listing.weight')} <span className="text-destructive">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  value={grams || ''}
                  onChange={handleGramsChange}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="0"
                />
                <Select
                  value={weightUnit}
                  onValueChange={v => onWeightUnitChange?.(v as WeightUnit)}
                >
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="g">g</SelectItem>
                    <SelectItem value="kg">kg</SelectItem>
                    <SelectItem value="lb">lb</SelectItem>
                    <SelectItem value="oz">oz</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{t('listing.weightHelper')}</p>
            </div>

            {/* Package Dimensions */}
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                {t('listing.packageDimensions.label')}
              </label>
              <div className="flex gap-1.5 items-center">
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={packageLength || ''}
                  onChange={e =>
                    onPackageLengthChange?.(e.target.value ? Number(e.target.value) : undefined)
                  }
                  className="flex-1 min-w-0 px-2 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder={t('listing.packageDimensions.length')}
                />
                <span className="text-muted-foreground shrink-0">×</span>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={packageWidth || ''}
                  onChange={e =>
                    onPackageWidthChange?.(e.target.value ? Number(e.target.value) : undefined)
                  }
                  className="flex-1 min-w-0 px-2 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder={t('listing.packageDimensions.width')}
                />
                <span className="text-muted-foreground shrink-0">×</span>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={packageHeight || ''}
                  onChange={e =>
                    onPackageHeightChange?.(e.target.value ? Number(e.target.value) : undefined)
                  }
                  className="flex-1 min-w-0 px-2 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder={t('listing.packageDimensions.height')}
                />
                <Select
                  value={dimensionUnit}
                  onValueChange={v => onDimensionUnitChange?.(v as DimensionUnit)}
                >
                  <SelectTrigger className="w-16 shrink-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cm">cm</SelectItem>
                    <SelectItem value="in">in</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {t('listing.packageDimensions.helper')}
              </p>
            </div>

            {/* Brand */}
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                {t('listing.brand.label')}
              </label>
              <input
                type="text"
                value={brand}
                onChange={e => onBrandChange?.(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder={t('listing.brand.placeholder')}
                maxLength={100}
              />
            </div>

            {/* SKU */}
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                {t('listing.sku')}
              </label>
              <input
                type="text"
                value={sku || ''}
                onChange={e => onSkuChange?.(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder={t('listing.skuPlaceholder')}
              />
              <p className="text-xs text-muted-foreground mt-1">{t('listing.skuHelper')}</p>
            </div>
          </div>
        )}

        {/* SKU 和 Barcode - 非物理商品也显示 */}
        {!isPhysicalGood && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                {t('listing.sku')}
              </label>
              <input
                type="text"
                value={sku || ''}
                onChange={e => onSkuChange?.(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder={t('listing.skuPlaceholder')}
              />
              <p className="text-xs text-muted-foreground mt-1">{t('listing.skuHelper')}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                {t('listing.barcode')}
              </label>
              <input
                type="text"
                value={barcode || ''}
                onChange={e => onBarcodeChange?.(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder={t('listing.barcodePlaceholder')}
              />
              <p className="text-xs text-muted-foreground mt-1">{t('listing.barcodeHelper')}</p>
            </div>
          </div>
        )}

        {/* Barcode - 物理商品（和 SKU 一起在重量行下方） */}
        {isPhysicalGood && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                {t('listing.barcode')}
              </label>
              <input
                type="text"
                value={barcode || ''}
                onChange={e => onBarcodeChange?.(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder={t('listing.barcodePlaceholder')}
              />
              <p className="text-xs text-muted-foreground mt-1">{t('listing.barcodeHelper')}</p>
            </div>
          </div>
        )}

        {/* 描述 - 富文本编辑器 */}
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <label className="text-sm font-medium text-muted-foreground">
              {t('listing.description')}
            </label>
            {onAiPolishDescription && (title.length > 0 || description.length > 0) && (
              <AiAssistButton
                onClick={onAiPolishDescription}
                isLoading={aiLoadingAction === 'polish_description'}
                label={t('ai.polishDescription', { defaultValue: 'AI Polish' })}
              />
            )}
          </div>
          <RichTextEditor
            value={description}
            onChange={onDescriptionChange}
            placeholder={t('listing.descriptionPlaceholder')}
            minHeight={200}
          />
        </div>
      </div>
    </Card>
  );
}

export default BasicInfoSection;
