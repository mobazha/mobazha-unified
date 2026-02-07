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
        <h2 className="text-2xl font-bold text-foreground mb-2">{t('listing.wizard.basicInfo')}</h2>
        <p className="text-muted-foreground">{t('listing.wizard.basicInfoDesc')}</p>
      </div>

      <Card className="p-6 space-y-5">
        {/* 标题 */}
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1.5">
            {t('listing.title')} <span className="text-destructive">*</span>
          </label>
          <Input
            value={formData.title}
            onChange={e => updateField('title', e.target.value)}
            maxLength={140}
            placeholder={t('listing.titlePlaceholder')}
            className={errors.title ? 'border-destructive' : ''}
          />
          {errors.title && <p className="text-destructive text-sm mt-1">{errors.title}</p>}
          <p className="text-xs text-muted-foreground mt-1">{t('listing.titleHelper')}</p>
        </div>

        {/* 价格 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">
              {t('listing.price')} <span className="text-destructive">*</span>
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
                {t('listing.condition')} <span className="text-destructive">*</span>
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
                      {t(c.labelKey)}
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
                {t('listing.weight')} (g)
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
                {t('listing.sku')}
              </label>
              <Input
                value={formData.sku}
                onChange={e => updateField('sku', e.target.value)}
                placeholder={t('listing.skuPlaceholder')}
              />
            </div>
          </div>
        )}

        {/* RWA 数量限制 */}
        {isRwaToken && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                {t('listing.minQuantity')}
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
                {t('listing.maxQuantity')}
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

        {/* RWA 交易模式 */}
        {isRwaToken && (
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              {t('listing.tradeMode')}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* 即时交易 */}
              <div
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  formData.rwaTradeMode === 'instant'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => updateField('rwaTradeMode', 'instant')}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      formData.rwaTradeMode === 'instant'
                        ? 'border-primary'
                        : 'border-muted-foreground'
                    }`}
                  >
                    {formData.rwaTradeMode === 'instant' && (
                      <div className="w-2 h-2 rounded-full bg-primary" />
                    )}
                  </div>
                  <span className="font-medium">{t('listing.instantTrade')}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                    {t('listing.recommended')}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground ml-6">
                  {t('listing.instantTradeDesc')}
                </p>
              </div>

              {/* 确认交易 */}
              <div
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  formData.rwaTradeMode === 'confirm_required'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => updateField('rwaTradeMode', 'confirm_required')}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      formData.rwaTradeMode === 'confirm_required'
                        ? 'border-primary'
                        : 'border-muted-foreground'
                    }`}
                  >
                    {formData.rwaTradeMode === 'confirm_required' && (
                      <div className="w-2 h-2 rounded-full bg-primary" />
                    )}
                  </div>
                  <span className="font-medium">{t('listing.confirmTrade')}</span>
                </div>
                <p className="text-sm text-muted-foreground ml-6">
                  {t('listing.confirmTradeDesc')}
                </p>
              </div>
            </div>

            {/* 托管时限选择 - 仅确认交易模式 */}
            {formData.rwaTradeMode === 'confirm_required' && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  {t('listing.escrowTimeout')}
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: 15, label: '15' + t('listing.min') },
                    { value: 60, label: '1' + t('listing.hour') },
                    { value: 360, label: '6' + t('listing.hours') },
                    { value: 720, label: '12' + t('listing.hours') },
                    { value: 1440, label: '1' + t('listing.day') },
                    { value: 4320, label: '3' + t('listing.days') },
                    { value: 10080, label: '7' + t('listing.days') },
                  ].map(option => (
                    <button
                      key={option.value}
                      type="button"
                      className={`px-4 py-1.5 rounded-full text-sm transition-all ${
                        formData.escrowTimeoutMinutes === option.value
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                      }`}
                      onClick={() => updateField('escrowTimeoutMinutes', option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <p className="text-sm text-warning mt-2">⚠️ {t('listing.escrowTimeoutWarning')}</p>
              </div>
            )}
          </div>
        )}

        {/* 描述 */}
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1.5">
            {t('listing.description')}
          </label>
          <textarea
            value={formData.description}
            onChange={e => updateField('description', e.target.value)}
            rows={6}
            className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
            placeholder={t('listing.descriptionPlaceholder')}
          />
        </div>
      </Card>

      {/* 导航按钮 */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onPrev}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t('common.prev')}
        </Button>
        <Button onClick={onNext} disabled={!canProceed}>
          {t('common.next')}
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}

export default StepBasicInfo;
