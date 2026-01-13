'use client';

import React from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import type { ProductCondition } from '@mobazha/core';
import { useI18n } from '@mobazha/core';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { StepProps } from './types';

const currencies = [
  { value: 'USD', label: 'USD ($)' },
  { value: 'CNY', label: 'CNY (¥)' },
  { value: 'EUR', label: 'EUR (€)' },
  { value: 'GBP', label: 'GBP (£)' },
  { value: 'JPY', label: 'JPY (¥)' },
  { value: 'USDT', label: 'USDT' },
  { value: 'USDC', label: 'USDC' },
];

const conditions: { value: ProductCondition; labelKey: string }[] = [
  { value: 'NEW', labelKey: 'listing.conditions.new' },
  { value: 'USED_EXCELLENT', labelKey: 'listing.conditions.usedExcellent' },
  { value: 'USED_GOOD', labelKey: 'listing.conditions.usedGood' },
  { value: 'USED_POOR', labelKey: 'listing.conditions.usedPoor' },
  { value: 'REFURBISHED', labelKey: 'listing.conditions.refurbished' },
];

/**
 * 步骤3：基本信息
 */
export function StepBasicInfo({ formData, updateField, errors, onNext, onPrev }: StepProps) {
  const { t } = useI18n();

  const isPhysicalGood = formData.contractType === 'PHYSICAL_GOOD';
  const isRwaToken = formData.contractType === 'RWA_TOKEN';

  const canProceed = formData.title.trim() !== '' && formData.price !== '';

  return (
    <div className="space-y-8">
      {/* 标题 */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground mb-2">
          {t('listing.wizard.basicInfo') || '基本信息'}
        </h2>
        <p className="text-muted-foreground">
          {t('listing.wizard.basicInfoDesc') || '填写商品的基本信息'}
        </p>
      </div>

      <Card className="p-6 space-y-5">
        {/* 标题 */}
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1.5">
            {t('listing.title') || '标题'} <span className="text-destructive">*</span>
          </label>
          <Input
            value={formData.title}
            onChange={e => updateField('title', e.target.value)}
            maxLength={140}
            placeholder={t('listing.titlePlaceholder') || '输入一个描述性的标题'}
            className={errors.title ? 'border-destructive' : ''}
          />
          {errors.title && <p className="text-destructive text-sm mt-1">{errors.title}</p>}
          <p className="text-xs text-muted-foreground mt-1">
            {t('listing.titleHelper') || '清楚地描述您要出售的商品'}
          </p>
        </div>

        {/* 价格 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">
              {t('listing.price') || '价格'} <span className="text-destructive">*</span>
            </label>
            <div className="flex gap-2">
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={e => updateField('price', e.target.value)}
                placeholder="0.00"
                className={`flex-1 ${errors.price ? 'border-destructive' : ''}`}
              />
              <Select
                value={formData.pricingCurrency}
                onValueChange={v => updateField('pricingCurrency', v)}
              >
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
          </div>

          {/* 商品状态 - 仅物理商品 */}
          {isPhysicalGood && (
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                {t('listing.condition') || '成色'} <span className="text-destructive">*</span>
              </label>
              <Select
                value={formData.condition}
                onValueChange={v => updateField('condition', v as ProductCondition)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {conditions.map(c => (
                    <SelectItem key={c.value} value={c.value}>
                      {t(c.labelKey) || c.value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* 重量 - 仅物理商品 */}
        {isPhysicalGood && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                {t('listing.weight') || '重量'} (g)
              </label>
              <Input
                type="number"
                min="0"
                value={formData.grams || ''}
                onChange={e => updateField('grams', parseFloat(e.target.value) || 0)}
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                {t('listing.sku') || 'SKU'}
              </label>
              <Input
                value={formData.sku}
                onChange={e => updateField('sku', e.target.value)}
                placeholder={t('listing.skuPlaceholder') || 'SKU、零件号等'}
              />
            </div>
          </div>
        )}

        {/* RWA 数量限制 */}
        {isRwaToken && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                {t('listing.minQuantity') || '最小购买数量'}
              </label>
              <Input
                type="number"
                min="1"
                value={formData.minQuantity}
                onChange={e => updateField('minQuantity', parseInt(e.target.value) || 1)}
                placeholder="1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                {t('listing.maxQuantity') || '最大购买数量'}
              </label>
              <Input
                type="number"
                min="1"
                value={formData.maxQuantity}
                onChange={e => updateField('maxQuantity', parseInt(e.target.value) || 100)}
                placeholder="100"
              />
            </div>
          </div>
        )}

        {/* 描述 */}
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1.5">
            {t('listing.description') || '描述'}
          </label>
          <textarea
            value={formData.description}
            onChange={e => updateField('description', e.target.value)}
            rows={6}
            className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
            placeholder={t('listing.descriptionPlaceholder') || '尽可能详细地描述您的商品...'}
          />
        </div>

        {/* NSFW 标记 */}
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-muted-foreground">
            {t('listing.nsfw') || '成人内容'}
          </label>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={formData.nsfw}
                onChange={() => updateField('nsfw', true)}
                className="w-4 h-4 text-primary"
              />
              <span className="text-sm">{t('common.yes') || '是'}</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={!formData.nsfw}
                onChange={() => updateField('nsfw', false)}
                className="w-4 h-4 text-primary"
              />
              <span className="text-sm">{t('common.no') || '否'}</span>
            </label>
          </div>
        </div>
      </Card>

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

export default StepBasicInfo;
