'use client';

import React, { useCallback, useState } from 'react';
import {
  Plus,
  X,
  Percent,
  DollarSign,
  Calendar,
  Hash,
  Tag,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useI18n } from '@mobazha/core';
import type { Coupon, CouponDiscountType } from '@mobazha/core';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

// ─── Props ────────────────────────────────────────

export interface CouponEditorProps {
  coupons: Coupon[];
  onAdd: (coupon: Coupon) => void;
  onUpdate: (index: number, coupon: Coupon) => void;
  onRemove: (index: number) => void;
  pricingCurrency?: string;
  className?: string;
}

// ─── 单个优惠券表单 ──────────────────────────────

interface CouponFormProps {
  coupon: Coupon;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  onUpdate: (coupon: Coupon) => void;
  onRemove: () => void;
  pricingCurrency: string;
}

function CouponForm({
  coupon,
  index,
  isExpanded,
  onToggle,
  onUpdate,
  onRemove,
  pricingCurrency,
}: CouponFormProps) {
  const { t } = useI18n();

  const updateField = useCallback(
    <K extends keyof Coupon>(field: K, value: Coupon[K]) => {
      onUpdate({ ...coupon, [field]: value });
    },
    [coupon, onUpdate]
  );

  const discountSummary =
    coupon.discountType === 'FIXED'
      ? `${coupon.priceDiscount || '0'} ${pricingCurrency}`
      : `${coupon.percentDiscount || 0}%`;

  return (
    <Card className="border-border/60 overflow-hidden">
      {/* 折叠头部 */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={onToggle}
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggle();
          }
        }}
      >
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary flex-shrink-0">
          {coupon.discountType === 'FIXED' ? (
            <DollarSign className="w-4 h-4" />
          ) : (
            <Percent className="w-4 h-4" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm truncate">
            {coupon.title || t('listing.coupon.untitled')}
          </div>
          {!isExpanded && (
            <div className="text-xs text-muted-foreground mt-0.5">
              {coupon.discountCode && (
                <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-xs mr-2">
                  {coupon.discountCode}
                </span>
              )}
              <span>{t('listing.coupon.off', { amount: discountSummary })}</span>
            </div>
          )}
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={e => {
            e.stopPropagation();
            onRemove();
          }}
          aria-label={t('listing.coupon.removeCoupon')}
          className="text-muted-foreground hover:text-destructive h-7 w-7 p-0"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* 展开表单 - Shopify 风格 */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-1 border-t border-border/40 space-y-4">
          {/* 第一行：标题 + 折扣码 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                {t('listing.coupon.title')}
              </label>
              <Input
                value={coupon.title}
                onChange={e => updateField('title', e.target.value)}
                placeholder={t('listing.coupon.titlePlaceholder')}
                className="h-9"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                <Hash className="w-3 h-3 inline mr-1" />
                {t('listing.coupon.discountCode')}
              </label>
              <Input
                value={coupon.discountCode || ''}
                onChange={e => updateField('discountCode', e.target.value.toUpperCase())}
                placeholder={t('listing.coupon.discountCodePlaceholder')}
                className="h-9 font-mono uppercase"
              />
            </div>
          </div>

          {/* 第二行：折扣类型 + 金额 */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-2">
              {t('listing.coupon.discountValue')}
            </label>
            <div className="flex gap-2">
              {/* 类型切换 - Shopify 风格 segmented control */}
              <div className="flex rounded-lg border border-border overflow-hidden flex-shrink-0">
                <button
                  type="button"
                  onClick={() => updateField('discountType', 'PERCENT')}
                  aria-label={t('listing.coupon.percentDiscount')}
                  aria-pressed={coupon.discountType !== 'FIXED'}
                  className={`px-3 py-1.5 text-sm font-medium transition-colors flex items-center gap-1 ${
                    coupon.discountType !== 'FIXED'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background text-muted-foreground hover:bg-muted/50'
                  }`}
                >
                  <Percent className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => updateField('discountType', 'FIXED')}
                  aria-label={t('listing.coupon.fixedDiscount')}
                  aria-pressed={coupon.discountType === 'FIXED'}
                  className={`px-3 py-1.5 text-sm font-medium transition-colors flex items-center gap-1 border-l ${
                    coupon.discountType === 'FIXED'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background text-muted-foreground hover:bg-muted/50'
                  }`}
                >
                  <DollarSign className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* 折扣值 */}
              {coupon.discountType === 'FIXED' ? (
                <div className="flex-1">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={coupon.priceDiscount || ''}
                    onChange={e => updateField('priceDiscount', e.target.value)}
                    placeholder={`0.00 ${pricingCurrency}`}
                    className="h-9"
                  />
                </div>
              ) : (
                <div className="flex-1">
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    max="99"
                    value={coupon.percentDiscount || ''}
                    onChange={e =>
                      updateField('percentDiscount', Math.min(99, Number(e.target.value)))
                    }
                    placeholder="0 %"
                    className="h-9"
                  />
                </div>
              )}
            </div>
          </div>

          {/* 第三行：最低订单金额 + 使用次数限制 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                {t('listing.coupon.minimumOrder')}
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={coupon.minimumOrderAmount || ''}
                onChange={e => updateField('minimumOrderAmount', e.target.value)}
                placeholder={t('listing.coupon.noMinimum')}
                className="h-9"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                {t('listing.coupon.usageLimit')}
              </label>
              <Input
                type="number"
                step="1"
                min="0"
                value={coupon.usageLimit || ''}
                onChange={e =>
                  updateField(
                    'usageLimit',
                    e.target.value === '' ? 0 : parseInt(e.target.value, 10)
                  )
                }
                placeholder={t('listing.coupon.unlimited')}
                className="h-9"
              />
            </div>
          </div>

          {/* 第四行：有效期 */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-2">
              <Calendar className="w-3 h-3 inline mr-1" />
              {t('listing.coupon.activeDates')}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-muted-foreground/70 mb-1">
                  {t('listing.coupon.startsAt')}
                </label>
                <Input
                  type="datetime-local"
                  value={coupon.startsAt ? coupon.startsAt.slice(0, 16) : ''}
                  onChange={e => {
                    const val = e.target.value;
                    updateField('startsAt', val ? new Date(val).toISOString() : undefined);
                  }}
                  className="h-9"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground/70 mb-1">
                  {t('listing.coupon.expiresAt')}
                </label>
                <Input
                  type="datetime-local"
                  value={coupon.expiresAt ? coupon.expiresAt.slice(0, 16) : ''}
                  onChange={e => {
                    const val = e.target.value;
                    updateField('expiresAt', val ? new Date(val).toISOString() : undefined);
                  }}
                  className="h-9"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

// ─── 主组件 ───────────────────────────────────────

export function CouponEditor({
  coupons,
  onAdd,
  onUpdate,
  onRemove,
  pricingCurrency = 'USD',
  className,
}: CouponEditorProps) {
  const { t } = useI18n();
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const handleAdd = useCallback(() => {
    const newCoupon: Coupon = {
      title: '',
      discountCode: '',
      discountType: 'PERCENT',
      percentDiscount: 0,
    };
    onAdd(newCoupon);
    setExpandedIndex(coupons.length); // 展开新添加的
  }, [coupons.length, onAdd]);

  const handleRemove = useCallback(
    (index: number) => {
      onRemove(index);
      if (expandedIndex === index) {
        setExpandedIndex(null);
      } else if (expandedIndex !== null && expandedIndex > index) {
        setExpandedIndex(expandedIndex - 1);
      }
    },
    [onRemove, expandedIndex]
  );

  return (
    <div className={className}>
      {/* 优惠券列表 */}
      {coupons.length > 0 && (
        <div className="space-y-2">
          {coupons.map((coupon, index) => (
            <CouponForm
              key={`${coupon.title || 'coupon'}-${coupon.discountCode || index}`}
              coupon={coupon}
              index={index}
              isExpanded={expandedIndex === index}
              onToggle={() => setExpandedIndex(expandedIndex === index ? null : index)}
              onUpdate={c => onUpdate(index, c)}
              onRemove={() => handleRemove(index)}
              pricingCurrency={pricingCurrency}
            />
          ))}
        </div>
      )}

      {/* 空状态 + 添加按钮 */}
      {coupons.length === 0 ? (
        <div className="text-center py-6">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-muted/50 flex items-center justify-center">
            <Tag className="w-5 h-5 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground mb-3">{t('listing.coupon.emptyState')}</p>
          <Button type="button" variant="outline" size="sm" onClick={handleAdd}>
            <Plus className="w-4 h-4 mr-1.5" />
            {t('listing.coupon.addFirst')}
          </Button>
        </div>
      ) : (
        <Button type="button" variant="outline" size="sm" onClick={handleAdd} className="mt-3">
          <Plus className="w-4 h-4 mr-1.5" />
          {t('listing.coupon.addAnother')}
        </Button>
      )}
    </div>
  );
}
