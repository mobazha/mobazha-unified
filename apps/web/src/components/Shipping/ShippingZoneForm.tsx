'use client';

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useI18n, generateId, fromMinimalUnit, toMinimalUnit } from '@mobazha/core';
import type { ShippingZone, ShippingRate, RateCondition, RateConditionType } from '@mobazha/core';
import { Plus, Trash2, ChevronDown, ChevronUp, Calculator } from 'lucide-react';
import { VStack, HStack } from '@/components/layouts';
import { RegionSelector } from './RegionSelector';

export interface ShippingZoneFormProps {
  zone?: ShippingZone | null;
  currency?: string;
  onSave: (zone: ShippingZone) => Promise<boolean>;
  onCancel: () => void;
  isSaving?: boolean;
  /** 隐藏内部标题（当在 Dialog 中使用时，标题由 DialogHeader 提供） */
  hideHeader?: boolean;
}

/**
 * 配送区域表单组件
 * 用于创建和编辑配送区域及其费率
 */
export function ShippingZoneForm({
  zone,
  currency = 'USD',
  onSave,
  onCancel,
  isSaving = false,
  hideHeader = false,
}: ShippingZoneFormProps) {
  const { t } = useI18n();

  // 将 API 的最小单位价格转为展示用金额（编辑时显示 0.1 而非 10）
  const initialRates: ShippingRate[] = zone?.rates?.length
    ? zone.rates.map(r => ({
        ...r,
        price: String(fromMinimalUnit(Number(r.price) || 0, r.currency || currency)),
      }))
    : [
        {
          id: generateId(),
          name: '',
          price: '0',
          currency,
          estimatedDelivery: '',
        },
      ];

  const [name, setName] = useState(zone?.name || '');
  const [regions, setRegions] = useState<string[]>(zone?.regions || []);
  const [rates, setRates] = useState<ShippingRate[]>(initialRates);
  // 跟踪展开的条件编辑区域
  const [expandedConditions, setExpandedConditions] = useState<Set<number>>(new Set());
  // 运费试算
  const [previewCountry, setPreviewCountry] = useState('');
  const [previewWeightKg, setPreviewWeightKg] = useState('');
  const [previewOrderAmount, setPreviewOrderAmount] = useState('');

  // 切换条件编辑区域展开状态
  const toggleCondition = useCallback((index: number) => {
    setExpandedConditions(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  // 添加费率
  const addRate = useCallback(() => {
    setRates(prev => [
      ...prev,
      {
        id: generateId(),
        name: '',
        price: '0',
        currency,
        estimatedDelivery: '',
      },
    ]);
  }, [currency]);

  // 更新费率
  const updateRate = useCallback((index: number, updates: Partial<ShippingRate>) => {
    setRates(prev => prev.map((rate, i) => (i === index ? { ...rate, ...updates } : rate)));
  }, []);

  // 更新费率条件
  const updateRateCondition = useCallback(
    (
      index: number,
      conditionType: 'none' | RateConditionType,
      minValue?: number,
      maxValue?: number
    ) => {
      setRates(prev =>
        prev.map((rate, i) => {
          if (i !== index) return rate;
          if (conditionType === 'none') {
            // 移除条件
            const { condition: _, ...rest } = rate;
            return rest;
          }
          // 设置或更新条件
          const condition: RateCondition = {
            type: conditionType,
            minValue: minValue ?? rate.condition?.minValue ?? 0,
            maxValue: maxValue ?? rate.condition?.maxValue ?? 0,
          };
          return { ...rate, condition };
        })
      );
    },
    []
  );

  // 删除费率
  const removeRate = useCallback((index: number) => {
    setRates(prev => prev.filter((_, i) => i !== index));
  }, []);

  // 保存
  const handleSave = useCallback(async () => {
    if (!name.trim()) return;
    if (regions.length === 0) return;
    if (rates.length === 0) return;

    const zoneData: ShippingZone = {
      id: zone?.id || generateId(),
      name: name.trim(),
      regions,
      rates: rates.map(rate => {
        const cur = rate.currency || currency;
        const priceDisplay = Number(rate.price) || 0;
        const priceMinimal = String(toMinimalUnit(priceDisplay, cur));
        return {
          ...rate,
          name: rate.name.trim() || name.trim(),
          price: priceMinimal,
        };
      }),
    };

    await onSave(zoneData);
  }, [zone, name, regions, rates, onSave, currency]);

  const isValid =
    name.trim() &&
    regions.length > 0 &&
    rates.length > 0 &&
    rates.every(r => r.price !== undefined && r.price !== '');

  // 试算：当前 zone 是否覆盖该国，以及匹配的费率和价格（价格用表单里的展示单位）
  const previewMatch = (() => {
    if (regions.length === 0 || !previewCountry) return null;
    const country = previewCountry.toUpperCase();
    const inZone = regions.some(r => r.toUpperCase() === country || r.toUpperCase() === 'ALL');
    if (!inZone) return { zoneName: name, rate: null };
    const weightG = parseFloat(previewWeightKg) * 1000 || 0;
    const orderMinimal = Number(previewOrderAmount)
      ? toMinimalUnit(Number(previewOrderAmount), currency)
      : 0;
    for (const rate of rates) {
      if (!rate.condition) return { zoneName: name, rate };
      const { type, minValue, maxValue } = rate.condition;
      if (type === 'weight') {
        const ok = weightG >= minValue && (maxValue === 0 || weightG <= maxValue);
        if (ok) return { zoneName: name, rate };
      } else {
        const ok = orderMinimal >= minValue && (maxValue === 0 || orderMinimal <= maxValue);
        if (ok) return { zoneName: name, rate };
      }
    }
    return { zoneName: name, rate: null };
  })();

  return (
    <VStack gap="lg" className={hideHeader ? '' : 'p-4'} data-testid="shipping-zone-form">
      {/* 头部 - 当在 Dialog 中使用时隐藏（由 DialogHeader 提供） */}
      {!hideHeader && (
        <h3 className="text-lg font-semibold">
          {zone ? t('shipping.editZone') : t('shipping.addZone')}
        </h3>
      )}

      {/* 区域名称 */}
      <div className="space-y-1.5">
        <Label htmlFor="zone-name">{t('shipping.zoneName')}</Label>
        <Input
          id="zone-name"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder={t('shipping.zoneNamePlaceholder')}
        />
      </div>

      {/* 地区选择 */}
      <div className="space-y-1.5">
        <Label>{t('shipping.regions')}</Label>
        <RegionSelector value={regions} onChange={setRegions} />
      </div>

      {/* 费率列表 */}
      <div className="space-y-3">
        <Label>{t('shipping.rates')}</Label>

        {rates.map((rate, index) => (
          <div key={rate.id || index} className="p-3 border rounded-lg bg-muted/30 space-y-3">
            <HStack justify="between" align="center">
              <span className="text-sm font-medium text-muted-foreground">
                {t('shipping.rate')} #{index + 1}
              </span>
              {rates.length > 1 && (
                <Button variant="ghost" size="sm" onClick={() => removeRate(index)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              )}
            </HStack>

            <div className="grid grid-cols-2 gap-3">
              {/* 费率名称 */}
              <div className="space-y-1">
                <Label className="text-xs">{t('shipping.rateName')}</Label>
                <Input
                  value={rate.name}
                  onChange={e => updateRate(index, { name: e.target.value })}
                  placeholder={t('shipping.rateNamePlaceholder')}
                />
              </div>

              {/* 价格（展示为日常金额，并标明货币） */}
              <div className="space-y-1">
                <Label className="text-xs">
                  {t('shipping.ratePrice')} ({rate.currency || currency})
                </Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={rate.price}
                  onChange={e => updateRate(index, { price: e.target.value })}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  aria-label={`${t('shipping.ratePrice')} ${rate.currency || currency}`}
                />
              </div>

              {/* 预计送达时间 */}
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">{t('shipping.estimatedDelivery')}</Label>
                <Input
                  value={rate.estimatedDelivery}
                  onChange={e => updateRate(index, { estimatedDelivery: e.target.value })}
                  placeholder={t('shipping.deliveryPlaceholder')}
                />
              </div>

              {/* 条件设置切换按钮 */}
              <div className="col-span-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full justify-between text-muted-foreground hover:text-foreground"
                  onClick={() => toggleCondition(index)}
                >
                  <span className="flex items-center gap-1.5">
                    {rate.condition ? (
                      <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                        {rate.condition.type === 'weight'
                          ? t('shipping.basedOnWeight')
                          : t('shipping.basedOnPrice')}
                      </span>
                    ) : (
                      <span className="text-xs">{t('shipping.addCondition')}</span>
                    )}
                  </span>
                  {expandedConditions.has(index) ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </Button>
              </div>

              {/* 条件编辑区域 */}
              {expandedConditions.has(index) && (
                <div className="col-span-2 p-3 bg-muted/50 rounded-md space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t('shipping.conditionType')}</Label>
                    <Select
                      value={rate.condition?.type || 'none'}
                      onValueChange={(value: 'none' | 'weight' | 'price') =>
                        updateRateCondition(index, value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('shipping.selectCondition')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">{t('shipping.noCondition')}</SelectItem>
                        <SelectItem value="weight">{t('shipping.basedOnWeight')}</SelectItem>
                        <SelectItem value="price">{t('shipping.basedOnPrice')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {rate.condition && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">
                          {rate.condition.type === 'weight'
                            ? t('shipping.minWeight')
                            : t('shipping.minOrderAmount')}
                        </Label>
                        <Input
                          type="number"
                          inputMode="decimal"
                          value={rate.condition.minValue}
                          onChange={e => {
                            if (rate.condition) {
                              updateRateCondition(
                                index,
                                rate.condition.type,
                                parseInt(e.target.value) || 0,
                                rate.condition.maxValue
                              );
                            }
                          }}
                          placeholder="0"
                          min="0"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">
                          {rate.condition.type === 'weight'
                            ? t('shipping.maxWeight')
                            : t('shipping.maxOrderAmount')}
                        </Label>
                        <Input
                          type="number"
                          inputMode="decimal"
                          value={rate.condition.maxValue}
                          onChange={e => {
                            if (rate.condition) {
                              updateRateCondition(
                                index,
                                rate.condition.type,
                                rate.condition.minValue,
                                parseInt(e.target.value) || 0
                              );
                            }
                          }}
                          placeholder={t('shipping.noLimit')}
                          min="0"
                        />
                      </div>
                      <p className="col-span-2 text-xs text-muted-foreground">
                        {rate.condition.type === 'weight'
                          ? t('shipping.weightConditionHint')
                          : t('shipping.priceConditionHint')}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* 添加费率按钮 */}
        <Button variant="outline" size="sm" onClick={addRate} className="w-full border-dashed">
          <Plus className="w-3.5 h-3.5 mr-1" />
          {t('shipping.addRate')}
        </Button>
      </div>

      {/* 运费试算 */}
      <div className="space-y-3 pt-4 border-t" data-testid="shipping-preview">
        <div className="flex items-center gap-2">
          <Calculator className="w-4 h-4 text-muted-foreground" />
          <Label className="text-sm font-medium">{t('shipping.previewTitle')}</Label>
        </div>
        {regions.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('shipping.previewAddRegionsFirst')}</p>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">{t('shipping.previewCountry')}</Label>
                <Select value={previewCountry} onValueChange={setPreviewCountry}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('shipping.previewCountry')} />
                  </SelectTrigger>
                  <SelectContent>
                    {regions.filter(r => r !== 'ALL').map(c => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                    {regions.includes('ALL') && (
                      <SelectItem value="ALL">ALL</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{t('shipping.previewWeightKg')}</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  placeholder="0"
                  min="0"
                  step="0.1"
                  value={previewWeightKg}
                  onChange={e => setPreviewWeightKg(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{t('shipping.previewOrderAmount')}</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  placeholder="0"
                  min="0"
                  step="0.01"
                  value={previewOrderAmount}
                  onChange={e => setPreviewOrderAmount(e.target.value)}
                />
              </div>
            </div>
            {previewMatch && (
              <div className="text-sm">
                <span className="text-muted-foreground">{t('shipping.previewResult')}: </span>
                {previewMatch.rate ? (
                  <span className="font-medium">
                    {previewMatch.zoneName} → {previewMatch.rate.name} ={' '}
                    {Number(previewMatch.rate.price) || 0} {currency}
                  </span>
                ) : (
                  <span className="text-muted-foreground">{t('shipping.previewNoMatch')}</span>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* 操作按钮 */}
      <HStack justify="end" gap="sm" className="pt-4 border-t">
        <Button variant="outline" onClick={onCancel} disabled={isSaving}>
          {t('common.cancel')}
        </Button>
        <Button
          onClick={handleSave}
          disabled={isSaving || !isValid}
          data-testid="shipping-form-save"
        >
          {isSaving ? t('common.saving') : t('common.save')}
        </Button>
      </HStack>
    </VStack>
  );
}

export default ShippingZoneForm;
