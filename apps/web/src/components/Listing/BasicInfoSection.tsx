'use client';

import React, { useCallback } from 'react';
import type { ContractType, ProductCondition } from '@mobazha/core';
import { useI18n } from '@mobazha/core';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card } from '@/components/ui/card';

interface BasicInfoSectionProps {
  title: string;
  description: string;
  price: string;
  pricingCurrency: string;
  contractType: ContractType;
  condition?: ProductCondition;
  grams?: number;
  sku?: string;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onPriceChange: (value: string) => void;
  onCurrencyChange: (value: string) => void;
  onConditionChange?: (value: ProductCondition) => void;
  onGramsChange?: (value: number) => void;
  onSkuChange?: (value: string) => void;
  errors?: {
    title?: string;
    price?: string;
    condition?: string;
  };
  className?: string;
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
  description,
  price,
  pricingCurrency,
  contractType,
  condition,
  grams,
  sku,
  onTitleChange,
  onDescriptionChange,
  onPriceChange,
  onCurrencyChange,
  onConditionChange,
  onGramsChange,
  onSkuChange,
  errors = {},
  className = '',
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

  return (
    <Card className={`p-6 ${className}`}>
      <h2 className="text-lg font-semibold text-foreground mb-4">
        {t('listing.basicInfo') || 'Basic Information'}
      </h2>

      <div className="space-y-4">
        {/* 标题 */}
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1.5">
            {t('listing.title') || 'Title'} <span className="text-destructive">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={e => onTitleChange(e.target.value)}
            maxLength={140}
            className={`
              w-full px-4 py-2.5 rounded-lg border bg-background text-foreground
              focus:outline-none focus:ring-2 focus:ring-primary/50
              ${errors.title ? 'border-destructive' : 'border-border'}
            `}
            placeholder={t('listing.titlePlaceholder') || 'Enter a descriptive title'}
          />
          {errors.title && <p className="text-destructive text-sm mt-1">{errors.title}</p>}
          <p className="text-xs text-muted-foreground mt-1">
            {t('listing.titleHelper') ||
              'Something descriptive that clearly explains what you are selling'}
          </p>
        </div>

        {/* 价格和币种 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">
              {t('listing.price') || 'Price'} <span className="text-destructive">*</span>
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={e => onPriceChange(e.target.value)}
                className={`
                  flex-1 px-4 py-2.5 rounded-lg border bg-background text-foreground
                  focus:outline-none focus:ring-2 focus:ring-primary/50
                  ${errors.price ? 'border-destructive' : 'border-border'}
                `}
                placeholder="0.00"
              />
              <Select value={pricingCurrency} onValueChange={onCurrencyChange}>
                <SelectTrigger className="w-28">
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
            <p className="text-xs text-muted-foreground mt-1">
              {t('listing.priceHelper') || 'Set your price in Dollars, Yuan, Bitcoin, anything'}
            </p>
          </div>

          {/* 商品状态 - 仅物理商品 */}
          {showCondition && (
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                {t('listing.condition') || 'Condition'} <span className="text-destructive">*</span>
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
                      {t(c.labelKey) || c.value.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.condition && (
                <p className="text-destructive text-sm mt-1">{errors.condition}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {t('listing.conditionHelper') || 'The overall condition of your listing'}
              </p>
            </div>
          )}
        </div>

        {/* 重量 - 仅物理商品 */}
        {showWeight && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                {t('listing.weight') || 'Weight'} (g) <span className="text-destructive">*</span>
              </label>
              <input
                type="number"
                min="0"
                value={grams || ''}
                onChange={handleGramsChange}
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="0"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {t('listing.weightHelper') || 'Item weight in grams'}
              </p>
            </div>

            {/* SKU */}
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                {t('listing.sku') || 'SKU'}
              </label>
              <input
                type="text"
                value={sku || ''}
                onChange={e => onSkuChange?.(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder={t('listing.skuPlaceholder') || 'SKU, Part Number, ID, etc'}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {t('listing.skuHelper') || 'A unique identifier for your listing'}
              </p>
            </div>
          </div>
        )}

        {/* 描述 */}
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1.5">
            {t('listing.description') || 'Description'}
          </label>
          <textarea
            value={description}
            onChange={e => onDescriptionChange(e.target.value)}
            rows={6}
            className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
            placeholder={
              t('listing.descriptionPlaceholder') ||
              'Describe your listing as best as you can... Include inline photos. Link to Youtube videos. etc'
            }
          />
        </div>
      </div>
    </Card>
  );
}

export default BasicInfoSection;
