'use client';

import React, { memo, useState, useMemo, useCallback } from 'react';
import { Truck, MapPin, Package } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { SearchableSelect } from '@/components/ui/searchable-select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  useI18n,
  useCurrency,
  getCountryName,
  POPULAR_COUNTRIES,
  isSpecialRegion,
  isValidShippingRegion,
} from '@mobazha/core';
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
  const { t, locale } = useI18n();
  const { formatPrice, fromMinimalUnit } = useCurrency();

  /**
   * 获取地区显示名称（支持多语言）
   * getCountryName 已支持多种格式（ISO代码、下划线格式等）
   */
  const getRegionDisplayName = useCallback(
    (region: string): string => {
      // 特殊处理：全球（使用翻译）
      if (region === 'ALL' || region === 'WORLDWIDE') {
        return t('product.worldwide');
      }
      // 使用 i18n-iso-countries 获取本地化名称
      return getCountryName(region, locale);
    },
    [locale, t]
  );

  // 提取所有可用地区（去重），过滤无效区域，智能排序
  const allRegions = useMemo(() => {
    if (!shippingOptions || shippingOptions.length === 0) return [];

    const regionSet = new Set<string>();
    shippingOptions.forEach(option => {
      option.regions.forEach(region => regionSet.add(region));
    });

    // 过滤掉无效的区域代码（如旧数据中的 "SUCRE" 等非标准代码）
    const regions = Array.from(regionSet).filter(region => isValidShippingRegion(region));

    // 智能排序：特殊区域 > 热门国家 > 其他（按本地化名称）
    return regions.sort((a, b) => {
      const aUpper = a.toUpperCase();
      const bUpper = b.toUpperCase();

      // 1. 特殊区域（ALL/WORLDWIDE, 大洲）放最前面
      const aIsSpecial = isSpecialRegion(aUpper);
      const bIsSpecial = isSpecialRegion(bUpper);
      if (aIsSpecial && !bIsSpecial) return -1;
      if (!aIsSpecial && bIsSpecial) return 1;
      // ALL/WORLDWIDE 最优先
      if (aUpper === 'ALL' || aUpper === 'WORLDWIDE') return -1;
      if (bUpper === 'ALL' || bUpper === 'WORLDWIDE') return 1;

      // 2. 热门国家优先
      const aIsPopular = POPULAR_COUNTRIES.includes(aUpper);
      const bIsPopular = POPULAR_COUNTRIES.includes(bUpper);
      if (aIsPopular && !bIsPopular) return -1;
      if (!aIsPopular && bIsPopular) return 1;
      // 热门国家内部按热门顺序排序
      if (aIsPopular && bIsPopular) {
        return POPULAR_COUNTRIES.indexOf(aUpper) - POPULAR_COUNTRIES.indexOf(bUpper);
      }

      // 3. 其他国家按本地化名称排序
      const nameA = getRegionDisplayName(a);
      const nameB = getRegionDisplayName(b);
      return nameA.localeCompare(nameB, locale);
    });
  }, [shippingOptions, locale, getRegionDisplayName]);

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

  /**
   * 获取运费价格
   * API 返回的实际字段是 firstFreight，但某些情况下可能使用 price
   */
  const getShippingPrice = (
    service: ShippingOption['services'][0],
    option: ShippingOption
  ): number | undefined => {
    // 本地自提免运费
    if (option.type === 'LOCAL_PICKUP') {
      return 0;
    }

    // 优先使用 firstFreight（API 实际返回的字段）
    if (service.firstFreight !== undefined && service.firstFreight !== null) {
      return service.firstFreight;
    }

    // 兼容 price 字段
    if (service.price !== undefined && service.price !== null) {
      return service.price;
    }

    return undefined;
  };

  /**
   * 获取续件费
   * API 返回的实际字段可能是 renewalUnitPrice 或 additionalItemPrice
   */
  const getAdditionalItemPrice = (service: ShippingOption['services'][0]): number | undefined => {
    // 优先使用 renewalUnitPrice
    if (service.renewalUnitPrice !== undefined && service.renewalUnitPrice > 0) {
      return service.renewalUnitPrice;
    }

    // 兼容 additionalItemPrice 字段
    if (service.additionalItemPrice !== undefined && service.additionalItemPrice > 0) {
      return service.additionalItemPrice;
    }

    return undefined;
  };

  /**
   * 获取用于价格格式化的货币代码
   * 优先使用配送选项的货币，其次使用商品定价货币
   */
  const getServiceCurrency = (option: ShippingOption): string => {
    return option.currency || pricingCurrency;
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

      {/* 目的地选择器 - 支持搜索 */}
      {allRegions.length > 1 && (
        <div className="flex items-center gap-3 mb-4">
          <span className="text-sm text-muted-foreground flex items-center gap-1.5">
            <MapPin className="w-4 h-4" />
            {t('product.shipTo')}:
          </span>
          <SearchableSelect
            value={selectedRegion}
            onValueChange={setSelectedRegion}
            options={allRegions.map(region => ({
              value: region,
              label: getRegionDisplayName(region),
            }))}
            placeholder={t('product.selectDestination')}
            searchPlaceholder={t('common.search') || 'Search...'}
            emptyText={t('common.noResults') || 'No results found'}
            className="w-[200px]"
          />
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
              option.services.map((service, serviceIndex) => {
                const shippingPriceRaw = getShippingPrice(service, option);
                const additionalPriceRaw = getAdditionalItemPrice(service);
                const currency = getServiceCurrency(option);
                // 将最小单位（如 cents）转换为标准单位（如 dollars）
                const shippingPrice =
                  shippingPriceRaw !== undefined
                    ? fromMinimalUnit(shippingPriceRaw, currency)
                    : undefined;
                const additionalPrice =
                  additionalPriceRaw !== undefined
                    ? fromMinimalUnit(additionalPriceRaw, currency)
                    : undefined;

                return (
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
                    <TableCell className="text-right min-w-[80px]">
                      {shippingPrice === 0 ? (
                        <span className="text-primary font-medium">
                          {t('product.freeShipping')}
                        </span>
                      ) : shippingPrice === undefined ? (
                        <span className="text-muted-foreground text-sm">
                          {t('product.priceToBeCalculated') || '待计算'}
                        </span>
                      ) : (
                        <span className="font-medium">{formatPrice(shippingPrice, currency)}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground min-w-[80px]">
                      {additionalPrice !== undefined && additionalPrice > 0
                        ? formatPrice(additionalPrice, currency)
                        : '-'}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* 配送服务卡片 - 移动端 */}
      <div className="sm:hidden space-y-3">
        {filteredOptions.map((option, optionIndex) =>
          option.services.map((service, serviceIndex) => {
            const shippingPriceRaw = getShippingPrice(service, option);
            const additionalPriceRaw = getAdditionalItemPrice(service);
            const currency = getServiceCurrency(option);
            // 将最小单位（如 cents）转换为标准单位（如 dollars）
            const shippingPrice =
              shippingPriceRaw !== undefined
                ? fromMinimalUnit(shippingPriceRaw, currency)
                : undefined;
            const additionalPrice =
              additionalPriceRaw !== undefined
                ? fromMinimalUnit(additionalPriceRaw, currency)
                : undefined;

            return (
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
                  {shippingPrice === 0 ? (
                    <span className="text-primary font-medium">{t('product.freeShipping')}</span>
                  ) : shippingPrice === undefined ? (
                    <span className="text-muted-foreground">
                      {t('product.priceToBeCalculated') || '待计算'}
                    </span>
                  ) : (
                    <span className="font-medium">{formatPrice(shippingPrice, currency)}</span>
                  )}
                </div>

                {/* 续件费 */}
                {additionalPrice !== undefined && additionalPrice > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{t('product.additionalItemFee')}</span>
                    <span>{formatPrice(additionalPrice, currency)}</span>
                  </div>
                )}
              </div>
            );
          })
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
