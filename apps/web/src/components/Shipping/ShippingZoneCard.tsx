'use client';

import React, { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useI18n, fromMinimalUnit, formatPrice } from '@mobazha/core';
import type { ShippingZone } from '@mobazha/core';
import { Pencil, Trash2, Globe, MapPin, DollarSign } from 'lucide-react';
import { HStack, VStack } from '@/components/layouts';
import { cn } from '@/lib/utils';

export interface ShippingZoneCardProps {
  zone: ShippingZone;
  onEdit: () => void;
  onDelete: () => void;
  disabled?: boolean;
}

/**
 * 配送区域卡片组件
 * 显示单个配送区域及其费率
 */
export function ShippingZoneCard({
  zone,
  onEdit,
  onDelete,
  disabled = false,
}: ShippingZoneCardProps) {
  const { t } = useI18n();

  // 计算价格范围
  const priceRange = useMemo(() => {
    if (!zone.rates || zone.rates.length === 0) return null;

    const pricesByCurrency: Record<string, number[]> = {};

    zone.rates.forEach(rate => {
      const currency = rate.currency || 'USD';
      if (!pricesByCurrency[currency]) {
        pricesByCurrency[currency] = [];
      }
      const price = fromMinimalUnit(rate.price || '0', currency);
      if (price >= 0) pricesByCurrency[currency].push(price);
    });

    const currencies = Object.keys(pricesByCurrency);
    if (currencies.length === 0) return null;

    if (currencies.length === 1) {
      const currency = currencies[0];
      const prices = pricesByCurrency[currency];
      if (prices.length === 0) return null;

      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);

      if (minPrice === maxPrice) {
        return formatPrice(minPrice, currency, { showSymbol: true, showCode: true });
      }
      return `${formatPrice(minPrice, currency, { showSymbol: false })} - ${formatPrice(maxPrice, currency, { showSymbol: true, showCode: true })}`;
    }

    return t('shipping.multipleCurrencies') || 'Multiple currencies';
  }, [zone.rates, t]);

  // 地区摘要
  const regionsSummary = useMemo(() => {
    if (!zone.regions || zone.regions.length === 0) {
      return { isWorldwide: false, display: t('shipping.noRegions') || 'No regions' };
    }

    const hasAll = zone.regions.includes('ALL');
    if (hasAll || zone.regions.length >= 240) {
      return { isWorldwide: true, display: t('shipping.worldwide') || 'Worldwide' };
    }

    const count = zone.regions.length;
    return {
      isWorldwide: false,
      display: `${count} ${count === 1 ? t('shipping.region') || 'region' : t('shipping.regions') || 'regions'}`,
    };
  }, [zone.regions, t]);

  return (
    <Card className={cn('p-4', disabled && 'opacity-60')}>
      <HStack justify="between" align="start">
        <VStack gap="sm" className="flex-1">
          {/* 区域名称 */}
          <h4 className="font-medium text-foreground">
            {zone.name || t('shipping.unnamedZone') || 'Unnamed Zone'}
          </h4>

          {/* 摘要信息 */}
          <HStack gap="md" className="flex-wrap text-sm text-muted-foreground">
            {/* 地区覆盖 */}
            <HStack gap="xs">
              {regionsSummary.isWorldwide ? (
                <Globe className="w-4 h-4 text-green-500" />
              ) : (
                <MapPin className="w-4 h-4" />
              )}
              <span className={cn(regionsSummary.isWorldwide && 'text-green-600 font-medium')}>
                {regionsSummary.display}
              </span>
            </HStack>

            {/* 费率数量 */}
            <span>
              {zone.rates?.length || 0}{' '}
              {(zone.rates?.length || 0) === 1
                ? t('shipping.rate') || 'rate'
                : t('shipping.rates') || 'rates'}
            </span>

            {/* 价格范围 */}
            {priceRange && (
              <HStack gap="xs">
                <DollarSign className="w-4 h-4" />
                <span className="font-medium text-primary">{priceRange}</span>
              </HStack>
            )}
          </HStack>

          {/* 费率列表预览 */}
          {zone.rates && zone.rates.length > 0 && (
            <div className="mt-2 text-sm text-muted-foreground">
              {zone.rates.slice(0, 3).map((rate, idx) => (
                <span key={rate.id || idx}>
                  {idx > 0 && ' • '}
                  {rate.name}:{' '}
                  {formatPrice(
                    fromMinimalUnit(rate.price || '0', rate.currency || 'USD'),
                    rate.currency || 'USD',
                    { showSymbol: true }
                  )}
                </span>
              ))}
              {zone.rates.length > 3 && ` +${zone.rates.length - 3}`}
            </div>
          )}
        </VStack>

        {/* 操作按钮 */}
        <HStack gap="xs">
          <Button variant="ghost" size="sm" onClick={onEdit} disabled={disabled}>
            <Pencil className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onDelete} disabled={disabled}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </HStack>
      </HStack>
    </Card>
  );
}

export default ShippingZoneCard;
