'use client';

import React, { memo, useState, useMemo } from 'react';
import { Truck, MapPin, Package } from 'lucide-react';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useI18n, useCurrency } from '@mobazha/core';
import type { ShippingOption } from '@mobazha/core';
import { cn } from '@/lib/utils';

export interface ShippingOptionsSectionProps {
  /** 配送选项数据 */
  shippingOptions?: ShippingOption[];
  /** 商品定价货币代码 */
  pricingCurrency?: string;
  /** 自定义样式 */
  className?: string;
}

/**
 * 配送选项区块组件
 *
 * 显示商品的配送选项，包括目的地选择器和配送服务表格。
 *
 * @example
 * <ShippingOptionsSection
 *   shippingOptions={product.shippingOptions}
 *   pricingCurrency="USD"
 * />
 */
export const ShippingOptionsSection = memo(function ShippingOptionsSection({
  shippingOptions,
  pricingCurrency = 'USD',
  className,
}: ShippingOptionsSectionProps) {
  const { t } = useI18n();
  const { formatPrice } = useCurrency();

  // 提取所有可用地区（去重）
  const allRegions = useMemo(() => {
    if (!shippingOptions || shippingOptions.length === 0) return [];

    const regionSet = new Set<string>();
    shippingOptions.forEach(option => {
      option.regions.forEach(region => regionSet.add(region));
    });

    // 按字母排序，但把 "ALL" 放在最前面
    return Array.from(regionSet).sort((a, b) => {
      if (a === 'ALL') return -1;
      if (b === 'ALL') return 1;
      return a.localeCompare(b);
    });
  }, [shippingOptions]);

  // 当前选中的地区
  const [selectedRegion, setSelectedRegion] = useState<string>(allRegions[0] || 'ALL');

  // 根据选中地区过滤配送选项
  const filteredOptions = useMemo(() => {
    if (!shippingOptions || shippingOptions.length === 0) return [];

    return shippingOptions.filter(
      option => option.regions.includes(selectedRegion) || option.regions.includes('ALL')
    );
  }, [shippingOptions, selectedRegion]);

  // 如果没有配送选项，不渲染
  if (!shippingOptions || shippingOptions.length === 0) {
    return null;
  }

  // 获取地区显示名称
  const getRegionDisplayName = (region: string): string => {
    if (region === 'ALL') return t('product.worldwide');
    // 可以扩展为更详细的地区名称映射
    return region;
  };

  // 获取配送类型显示
  const getShippingTypeDisplay = (type: string): React.ReactNode => {
    if (type === 'LOCAL_PICKUP') {
      return (
        <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
          <MapPin className="w-3.5 h-3.5" />
          {t('product.localPickup')}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1">
        <Truck className="w-3.5 h-3.5" />
        {type.replace('_', ' ')}
      </span>
    );
  };

  return (
    <Card className={cn('p-4 sm:p-6', className)} data-testid="shipping-options-section">
      {/* 标题 */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2">
          <Package className="w-5 h-5 text-muted-foreground" />
          {t('product.shippingOptions')}
        </h2>
      </div>

      {/* 目的地选择器 */}
      {allRegions.length > 1 && (
        <div className="flex items-center gap-3 mb-4">
          <span className="text-sm text-muted-foreground flex items-center gap-1.5">
            <MapPin className="w-4 h-4" />
            {t('product.shipTo')}:
          </span>
          <Select value={selectedRegion} onValueChange={setSelectedRegion}>
            <SelectTrigger className="w-[180px] h-9">
              <SelectValue placeholder={t('product.selectDestination')} />
            </SelectTrigger>
            <SelectContent>
              {allRegions.map(region => (
                <SelectItem key={region} value={region}>
                  {getRegionDisplayName(region)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* 配送服务表格 - 桌面端 */}
      <div className="hidden sm:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">{t('product.shippingService')}</TableHead>
              <TableHead>{t('product.estimatedDelivery')}</TableHead>
              <TableHead className="text-right">{t('product.shippingFee')}</TableHead>
              <TableHead className="text-right">{t('product.additionalItemFee')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOptions.map((option, optionIndex) =>
              option.services.map((service, serviceIndex) => (
                <TableRow
                  key={`${optionIndex}-${serviceIndex}`}
                  className="hover:bg-muted/50 transition-colors"
                >
                  <TableCell className="font-medium">
                    <div className="space-y-0.5">
                      <div>{service.name || option.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {getShippingTypeDisplay(option.type)}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-muted-foreground">
                      {service.estimatedDelivery || '-'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {service.price === 0 ? (
                      <span className="text-primary font-medium">{t('product.freeShipping')}</span>
                    ) : (
                      <span className="font-medium">
                        {formatPrice(service.price, pricingCurrency)}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {service.additionalItemPrice !== undefined && service.additionalItemPrice > 0
                      ? formatPrice(service.additionalItemPrice, pricingCurrency)
                      : '-'}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* 配送服务卡片 - 移动端 */}
      <div className="sm:hidden space-y-3">
        {filteredOptions.map((option, optionIndex) =>
          option.services.map((service, serviceIndex) => (
            <div
              key={`mobile-${optionIndex}-${serviceIndex}`}
              className="p-3 rounded-lg bg-muted/30 space-y-2"
            >
              {/* 服务名称 */}
              <div className="flex items-center justify-between">
                <div className="font-medium text-sm">{service.name || option.name}</div>
                <div className="text-xs text-muted-foreground">
                  {getShippingTypeDisplay(option.type)}
                </div>
              </div>

              {/* 预计送达 */}
              {service.estimatedDelivery && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t('product.estimatedDelivery')}</span>
                  <span>{service.estimatedDelivery}</span>
                </div>
              )}

              {/* 运费 */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t('product.shippingFee')}</span>
                {service.price === 0 ? (
                  <span className="text-primary font-medium">{t('product.freeShipping')}</span>
                ) : (
                  <span className="font-medium">{formatPrice(service.price, pricingCurrency)}</span>
                )}
              </div>

              {/* 续件费 */}
              {service.additionalItemPrice !== undefined && service.additionalItemPrice > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t('product.additionalItemFee')}</span>
                  <span>{formatPrice(service.additionalItemPrice, pricingCurrency)}</span>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* 无配送选项提示 */}
      {filteredOptions.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Truck className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">{t('product.noShippingOptions')}</p>
        </div>
      )}
    </Card>
  );
});

export default ShippingOptionsSection;
