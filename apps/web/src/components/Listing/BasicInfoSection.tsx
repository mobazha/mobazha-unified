'use client';

import React, { useCallback } from 'react';
import type { ContractType, ProductCondition, WeightUnit, DimensionUnit } from '@mobazha/core';
import {
  useI18n,
  calculateDiscountPercent,
  STANDARD_PRODUCT_TYPES,
  useRuntimeConfig,
  useFiatPaymentVisible,
  projectRuntimeCryptoPaymentMethods,
} from '@mobazha/core';
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
  onPriceFocus?: () => void;
  onPriceBlur?: (value: string) => void;
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
  productType?: string;
  onPackageLengthChange?: (value: number | undefined) => void;
  onPackageWidthChange?: (value: number | undefined) => void;
  onPackageHeightChange?: (value: number | undefined) => void;
  onDimensionUnitChange?: (value: DimensionUnit) => void;
  onBrandChange?: (value: string) => void;
  onProductTypeChange?: (value: string) => void;
  errors?: {
    title?: string;
    price?: string;
    compareAtPrice?: string;
    condition?: string;
  };
  className?: string;
  /** Mobile-optimized: hide section title, reduce padding/spacing, trim helpers */
  compact?: boolean;
  /** AI assist: callback to improve title */
  onAiImproveTitle?: () => void;
  /** AI assist: callback to polish description */
  onAiPolishDescription?: () => void;
  /** AI assist: loading action name */
  aiLoadingAction?: string | null;
}

const FIAT_CURRENCIES = [
  { value: 'USD', label: 'USD ($)' },
  { value: 'CNY', label: 'CNY (¥)' },
  { value: 'EUR', label: 'EUR (€)' },
  { value: 'GBP', label: 'GBP (£)' },
  { value: 'JPY', label: 'JPY (¥)' },
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
  onPriceFocus,
  onPriceBlur,
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
  productType = '',
  onPackageLengthChange,
  onPackageWidthChange,
  onPackageHeightChange,
  onDimensionUnitChange,
  onBrandChange,
  onProductTypeChange,
  errors = {},
  className = '',
  compact = false,
  onAiImproveTitle,
  onAiPolishDescription,
  aiLoadingAction,
}: BasicInfoSectionProps) {
  const { t } = useI18n();
  const runtimeConfig = useRuntimeConfig();
  const fiatVisible = useFiatPaymentVisible();
  const currencies = React.useMemo(() => {
    const projected = projectRuntimeCryptoPaymentMethods(runtimeConfig).map(method => ({
      value: method.id,
      label: `${method.id} (${method.name})`,
    }));
    const available = [...(fiatVisible ? FIAT_CURRENCIES : []), ...projected];
    if (pricingCurrency && !available.some(currency => currency.value === pricingCurrency)) {
      available.push({ value: pricingCurrency, label: pricingCurrency });
    }
    return available;
  }, [fiatVisible, pricingCurrency, runtimeConfig]);

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
      LTC: 'Ł',
    };
    return symbols[pricingCurrency] || pricingCurrency;
  }, [pricingCurrency]);

  // Calculate discount percentage (uses BigNumber internally via @mobazha/core)
  const discountPercent = React.useMemo(
    () => calculateDiscountPercent(compareAtPrice, price),
    [compareAtPrice, price]
  );

  const labelClass = compact
    ? 'text-sm text-muted-foreground'
    : 'text-sm font-medium text-muted-foreground';
  const requiredLabelClass = compact
    ? 'text-sm font-medium text-muted-foreground'
    : 'text-sm font-medium text-muted-foreground';
  const inputClass = compact
    ? 'w-full px-3 py-2 rounded-lg border bg-background text-foreground text-[15px] focus:outline-none focus:ring-2 focus:ring-primary/50'
    : 'w-full px-4 py-2.5 rounded-lg border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50';
  const inputInnerClass = compact
    ? 'flex-1 min-w-0 px-2 py-2 bg-transparent text-foreground text-[15px] focus:outline-none'
    : 'flex-1 min-w-0 px-2 py-2.5 bg-transparent text-foreground focus:outline-none';

  return (
    <Card className={`${compact ? 'p-4' : 'p-6'} ${className}`}>
      {!compact && (
        <h2 className="text-lg font-semibold text-foreground mb-4">{t('listing.basicInfo')}</h2>
      )}

      <div className={compact ? 'space-y-3' : 'space-y-4'}>
        {/* 标题 */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <label className={requiredLabelClass}>
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
            className={`${inputClass} ${errors.title ? 'border-destructive' : 'border-border'}`}
            placeholder={t('listing.titlePlaceholder')}
          />
          <div className="flex justify-between mt-1">
            {errors.title ? (
              <p className="text-destructive text-xs">{errors.title}</p>
            ) : !compact ? (
              <p className="text-xs text-muted-foreground">{t('listing.titleHelper')}</p>
            ) : (
              <span />
            )}
            <span className="text-xs text-muted-foreground">{title.length}/255</span>
          </div>
        </div>

        {/* 短描述 */}
        <div>
          <label className={`block ${labelClass} mb-1`}>{t('listing.shortDescription')}</label>
          <textarea
            value={shortDescription || ''}
            onChange={e => onShortDescriptionChange?.(e.target.value)}
            rows={2}
            maxLength={250}
            className={`${inputClass} resize-none border-border`}
            placeholder={t('listing.shortDescriptionPlaceholder')}
          />
          {!compact && (
            <div className="flex justify-between mt-1">
              <p className="text-xs text-muted-foreground">{t('listing.shortDescriptionHelper')}</p>
              <span className="text-xs text-muted-foreground">
                {(shortDescription || '').length}/250
              </span>
            </div>
          )}
        </div>

        {/* 产品类型 */}
        <div>
          <label className={`block ${labelClass} mb-1`}>
            {t('listing.productType', { defaultValue: 'Product Type' })}
          </label>
          <input
            type="text"
            list="standard-product-types"
            value={productType}
            onChange={e => onProductTypeChange?.(e.target.value)}
            className={`${inputClass} border-border`}
            placeholder={t('listing.productTypePlaceholder', {
              defaultValue: 'Select or enter product type',
            })}
            maxLength={100}
          />
          <datalist id="standard-product-types">
            {STANDARD_PRODUCT_TYPES.map(pt => (
              <option key={pt} value={pt} />
            ))}
          </datalist>
          {!compact && (
            <p className="text-xs text-muted-foreground mt-1">
              {t('listing.productTypeHint', {
                defaultValue: 'Choose from suggestions or type your own',
              })}
            </p>
          )}
        </div>

        {/* 价格和划线价 */}
        <div className={`grid grid-cols-1 sm:grid-cols-2 ${compact ? 'gap-3' : 'gap-4'}`}>
          <div>
            <label className={`block ${requiredLabelClass} mb-1`}>
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
                  onFocus={onPriceFocus}
                  onBlur={e => onPriceBlur?.(e.target.value)}
                  className={inputInnerClass}
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
            {errors.price && <p className="text-destructive text-xs mt-1">{errors.price}</p>}
            <p className="text-xs text-muted-foreground mt-1">{t('listing.priceHelper')}</p>
          </div>

          {/* 划线价 */}
          <div>
            <label className={`block ${labelClass} mb-1`}>{t('listing.compareAtPrice')}</label>
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
                className={inputInnerClass}
                placeholder="0.00"
              />
            </div>
            {errors.compareAtPrice && (
              <p className="text-destructive text-xs mt-1">{errors.compareAtPrice}</p>
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
          <div className={`grid grid-cols-1 sm:grid-cols-2 ${compact ? 'gap-3' : 'gap-4'}`}>
            <div>
              <label className={`block ${requiredLabelClass} mb-1`}>
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
                <p className="text-destructive text-xs mt-1">{errors.condition}</p>
              )}
              {!compact && (
                <p className="text-xs text-muted-foreground mt-1">{t('listing.conditionHelper')}</p>
              )}
            </div>
          </div>
        )}

        {/* 重量和 SKU/Barcode - 仅物理商品 */}
        {showWeight && (
          <div className={`grid grid-cols-1 sm:grid-cols-2 ${compact ? 'gap-3' : 'gap-4'}`}>
            <div>
              <label className={`block ${requiredLabelClass} mb-1`}>
                {t('listing.weight')} <span className="text-destructive">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  value={grams || ''}
                  onChange={handleGramsChange}
                  className={`flex-1 ${compact ? 'px-3 py-2 text-[15px]' : 'px-4 py-2.5'} rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50`}
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
              {!compact && (
                <p className="text-xs text-muted-foreground mt-1">{t('listing.weightHelper')}</p>
              )}
            </div>

            {/* Package Dimensions */}
            <div>
              <label className={`block ${labelClass} mb-1`}>
                {t('listing.packageDimensions.label')}
              </label>
              {compact ? (
                <div className="space-y-1.5">
                  <div className="flex gap-1.5 items-center">
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={packageLength || ''}
                      onChange={e =>
                        onPackageLengthChange?.(e.target.value ? Number(e.target.value) : undefined)
                      }
                      className="flex-1 min-w-0 px-2 py-2 rounded-lg border border-border bg-background text-foreground text-[15px] focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="L"
                    />
                    <span className="text-muted-foreground text-xs shrink-0">×</span>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={packageWidth || ''}
                      onChange={e =>
                        onPackageWidthChange?.(e.target.value ? Number(e.target.value) : undefined)
                      }
                      className="flex-1 min-w-0 px-2 py-2 rounded-lg border border-border bg-background text-foreground text-[15px] focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="W"
                    />
                    <span className="text-muted-foreground text-xs shrink-0">×</span>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={packageHeight || ''}
                      onChange={e =>
                        onPackageHeightChange?.(e.target.value ? Number(e.target.value) : undefined)
                      }
                      className="flex-1 min-w-0 px-2 py-2 rounded-lg border border-border bg-background text-foreground text-[15px] focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="H"
                    />
                    <Select
                      value={dimensionUnit}
                      onValueChange={v => onDimensionUnitChange?.(v as DimensionUnit)}
                    >
                      <SelectTrigger className="w-14 shrink-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cm">cm</SelectItem>
                        <SelectItem value="in">in</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : (
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
              )}
              {!compact && (
                <p className="text-xs text-muted-foreground mt-1">
                  {t('listing.packageDimensions.helper')}
                </p>
              )}
            </div>

            {/* Brand */}
            <div>
              <label className={`block ${labelClass} mb-1`}>{t('listing.brand.label')}</label>
              <input
                type="text"
                value={brand}
                onChange={e => onBrandChange?.(e.target.value)}
                className={`${inputClass} border-border`}
                placeholder={t('listing.brand.placeholder')}
                maxLength={100}
              />
            </div>

            {/* SKU */}
            <div>
              <label className={`block ${labelClass} mb-1`}>{t('listing.sku')}</label>
              <input
                type="text"
                value={sku || ''}
                onChange={e => onSkuChange?.(e.target.value)}
                className={`${inputClass} border-border`}
                placeholder={t('listing.skuPlaceholder')}
              />
              {!compact && (
                <p className="text-xs text-muted-foreground mt-1">{t('listing.skuHelper')}</p>
              )}
            </div>
          </div>
        )}

        {/* SKU 和 Barcode - 非物理商品也显示 */}
        {!isPhysicalGood && (
          <div className={`grid grid-cols-1 sm:grid-cols-2 ${compact ? 'gap-3' : 'gap-4'}`}>
            <div>
              <label className={`block ${labelClass} mb-1`}>{t('listing.sku')}</label>
              <input
                type="text"
                value={sku || ''}
                onChange={e => onSkuChange?.(e.target.value)}
                className={`${inputClass} border-border`}
                placeholder={t('listing.skuPlaceholder')}
              />
              {!compact && (
                <p className="text-xs text-muted-foreground mt-1">{t('listing.skuHelper')}</p>
              )}
            </div>
            <div>
              <label className={`block ${labelClass} mb-1`}>{t('listing.barcode')}</label>
              <input
                type="text"
                value={barcode || ''}
                onChange={e => onBarcodeChange?.(e.target.value)}
                className={`${inputClass} border-border`}
                placeholder={t('listing.barcodePlaceholder')}
              />
              {!compact && (
                <p className="text-xs text-muted-foreground mt-1">{t('listing.barcodeHelper')}</p>
              )}
            </div>
          </div>
        )}

        {/* Barcode - 物理商品（和 SKU 一起在重量行下方） */}
        {isPhysicalGood && (
          <div className={`grid grid-cols-1 sm:grid-cols-2 ${compact ? 'gap-3' : 'gap-4'}`}>
            <div>
              <label className={`block ${labelClass} mb-1`}>{t('listing.barcode')}</label>
              <input
                type="text"
                value={barcode || ''}
                onChange={e => onBarcodeChange?.(e.target.value)}
                className={`${inputClass} border-border`}
                placeholder={t('listing.barcodePlaceholder')}
              />
              {!compact && (
                <p className="text-xs text-muted-foreground mt-1">{t('listing.barcodeHelper')}</p>
              )}
            </div>
          </div>
        )}

        {/* 描述 - 富文本编辑器 */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <label className={labelClass}>{t('listing.description')}</label>
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
            placeholder={
              compact
                ? t('listing.descriptionPlaceholderShort', {
                    defaultValue: 'Describe your listing...',
                  })
                : t('listing.descriptionPlaceholder')
            }
            minHeight={compact ? 120 : 200}
            compact={compact}
          />
        </div>
      </div>
    </Card>
  );
}

export default BasicInfoSection;
