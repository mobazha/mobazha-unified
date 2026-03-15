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
  fromMinimalUnit,
  getCountryName,
  POPULAR_COUNTRIES,
  isSpecialRegion,
  isValidShippingRegion,
} from '@mobazha/core';
import type { ShippingOption, ShippingProfile } from '@mobazha/core';
import { getAllZones } from '@mobazha/core';
import { cn } from '@/lib/utils';

export interface ShippingOptionsSectionProps {
  /** @deprecated 旧版配送选项数据 */
  shippingOptions?: ShippingOption[];
  /** 新版配送档案数据（优先使用） */
  shippingProfile?: ShippingProfile;
  /** 商品定价货币代码 */
  pricingCurrency?: string;
  /** 自定义样式 */
  className?: string;
}

// ─── 新版 Profile 渲染 ───────────────────────────────────────────────

interface ProfileViewProps {
  profile: ShippingProfile;
  pricingCurrency: string;
  className?: string;
}

/**
 * 基于新版 ShippingProfile (Profile → Zone → Rate) 渲染配送选项
 */
const ProfileShippingView = memo(function ProfileShippingView({
  profile,
  pricingCurrency,
  className,
}: ProfileViewProps) {
  const { t, locale } = useI18n();
  const { formatPrice } = useCurrency();

  const zones = useMemo(() => getAllZones(profile), [profile]);

  /** 获取地区本地化名称 */
  const getRegionDisplayName = useCallback(
    (region: string): string => {
      if (region === 'ALL' || region === 'WORLDWIDE') {
        return t('product.worldwide');
      }
      return getCountryName(region, locale);
    },
    [locale, t]
  );

  /** 所有可用地区（去重、过滤、排序） */
  const allRegions = useMemo(() => {
    const regionSet = new Set<string>();
    zones.forEach(zone => {
      zone.regions.forEach(r => regionSet.add(r));
    });

    const regions = Array.from(regionSet).filter(r => isValidShippingRegion(r));

    return regions.sort((a, b) => {
      const aU = a.toUpperCase();
      const bU = b.toUpperCase();
      const aSpec = isSpecialRegion(aU);
      const bSpec = isSpecialRegion(bU);
      if (aSpec && !bSpec) return -1;
      if (!aSpec && bSpec) return 1;
      if (aU === 'ALL' || aU === 'WORLDWIDE') return -1;
      if (bU === 'ALL' || bU === 'WORLDWIDE') return 1;
      const aPop = POPULAR_COUNTRIES.includes(aU);
      const bPop = POPULAR_COUNTRIES.includes(bU);
      if (aPop && !bPop) return -1;
      if (!aPop && bPop) return 1;
      if (aPop && bPop) return POPULAR_COUNTRIES.indexOf(aU) - POPULAR_COUNTRIES.indexOf(bU);
      return getRegionDisplayName(a).localeCompare(getRegionDisplayName(b), locale);
    });
  }, [zones, locale, getRegionDisplayName]);

  const [selectedRegion, setSelectedRegion] = useState<string>(allRegions[0] || 'ALL');

  /** 根据选中地区筛选匹配的 rates */
  const matchedRates = useMemo(() => {
    const result: { rate: (typeof zones)[0]['rates'][0]; zoneName: string }[] = [];
    zones.forEach(zone => {
      if (!zone.rates || zone.rates.length === 0) return;
      const regionMatch =
        zone.regions.includes(selectedRegion) ||
        zone.regions.includes('ALL') ||
        zone.regions.includes('WORLDWIDE');
      if (regionMatch) {
        zone.rates.forEach(rate => {
          result.push({ rate, zoneName: zone.name });
        });
      }
    });
    return result;
  }, [zones, selectedRegion]);

  if (zones.length === 0) return null;

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
          <SearchableSelect
            value={selectedRegion}
            onValueChange={setSelectedRegion}
            options={allRegions.map(region => ({
              value: region,
              label: getRegionDisplayName(region),
            }))}
            placeholder={t('product.selectDestination')}
            searchPlaceholder={t('common.search')}
            emptyText={t('common.noResults')}
            className="w-[200px]"
          />
        </div>
      )}

      {/* 桌面端表格 - 无"续件费"列，无 type 标签 */}
      <div className="hidden sm:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">{t('product.shippingService')}</TableHead>
              <TableHead>{t('product.estimatedDelivery')}</TableHead>
              <TableHead className="text-right">{t('product.shippingFee')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {matchedRates.map(({ rate }) => {
              const currency = rate.currency || pricingCurrency || 'USD';
              const price =
                rate.price != null ? fromMinimalUnit(Number(rate.price) || 0, currency) : 0;

              return (
                <TableRow key={rate.id} className="hover:bg-muted/50 transition-colors">
                  <TableCell className="font-medium">{rate.name}</TableCell>
                  <TableCell>
                    <span className="text-muted-foreground">{rate.estimatedDelivery || '-'}</span>
                  </TableCell>
                  <TableCell className="text-right min-w-[80px]">
                    {price === 0 ? (
                      <span className="text-primary font-medium">{t('product.freeShipping')}</span>
                    ) : (
                      <span className="font-medium">{formatPrice(price, currency)}</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* 移动端卡片 */}
      <div className="sm:hidden space-y-3">
        {matchedRates.map(({ rate }) => {
          const currency = rate.currency || pricingCurrency || 'USD';
          const price = rate.price != null ? fromMinimalUnit(Number(rate.price) || 0, currency) : 0;

          return (
            <div key={rate.id} className="p-3 rounded-lg bg-muted/30 space-y-2">
              <div className="flex items-center justify-between">
                <div className="font-medium text-sm">{rate.name}</div>
              </div>
              {rate.estimatedDelivery && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t('product.estimatedDelivery')}</span>
                  <span>{rate.estimatedDelivery}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t('product.shippingFee')}</span>
                {price === 0 ? (
                  <span className="text-primary font-medium">{t('product.freeShipping')}</span>
                ) : (
                  <span className="font-medium">{formatPrice(price, currency)}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 无匹配 */}
      {matchedRates.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Truck className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">{t('product.noShippingOptions')}</p>
        </div>
      )}
    </Card>
  );
});

// ─── 旧版 ShippingOption 渲染（向后兼容） ─────────────────────────────

interface LegacyViewProps {
  shippingOptions: ShippingOption[];
  pricingCurrency: string;
  className?: string;
}

/**
 * 基于旧版 ShippingOption 渲染（向后兼容）
 */
const LegacyShippingView = memo(function LegacyShippingView({
  shippingOptions,
  pricingCurrency,
  className,
}: LegacyViewProps) {
  const { t, locale } = useI18n();
  const { formatPrice, fromMinimalUnit: fromMinUnit } = useCurrency();

  const getRegionDisplayName = useCallback(
    (region: string): string => {
      if (region === 'ALL' || region === 'WORLDWIDE') {
        return t('product.worldwide');
      }
      return getCountryName(region, locale);
    },
    [locale, t]
  );

  const allRegions = useMemo(() => {
    const regionSet = new Set<string>();
    shippingOptions.forEach(option => {
      option.regions.forEach(region => regionSet.add(region));
    });

    const regions = Array.from(regionSet).filter(region => isValidShippingRegion(region));

    return regions.sort((a, b) => {
      const aU = a.toUpperCase();
      const bU = b.toUpperCase();
      const aSpec = isSpecialRegion(aU);
      const bSpec = isSpecialRegion(bU);
      if (aSpec && !bSpec) return -1;
      if (!aSpec && bSpec) return 1;
      if (aU === 'ALL' || aU === 'WORLDWIDE') return -1;
      if (bU === 'ALL' || bU === 'WORLDWIDE') return 1;
      const aPop = POPULAR_COUNTRIES.includes(aU);
      const bPop = POPULAR_COUNTRIES.includes(bU);
      if (aPop && !bPop) return -1;
      if (!aPop && bPop) return 1;
      if (aPop && bPop) return POPULAR_COUNTRIES.indexOf(aU) - POPULAR_COUNTRIES.indexOf(bU);
      return getRegionDisplayName(a).localeCompare(getRegionDisplayName(b), locale);
    });
  }, [shippingOptions, locale, getRegionDisplayName]);

  const [selectedRegion, setSelectedRegion] = useState<string>(allRegions[0] || 'ALL');

  const filteredOptions = useMemo(() => {
    return shippingOptions.filter(
      option => option.regions.includes(selectedRegion) || option.regions.includes('ALL')
    );
  }, [shippingOptions, selectedRegion]);

  const getShippingPrice = (
    service: ShippingOption['services'][0],
    option: ShippingOption
  ): number | undefined => {
    if (option.type === 'LOCAL_PICKUP') return 0;
    if (service.firstFreight !== undefined && service.firstFreight !== null)
      return service.firstFreight;
    if (service.price !== undefined && service.price !== null) return service.price;
    return undefined;
  };

  const getAdditionalItemPrice = (service: ShippingOption['services'][0]): number | undefined => {
    if (service.renewalUnitPrice !== undefined && service.renewalUnitPrice > 0)
      return service.renewalUnitPrice;
    if (service.additionalItemPrice !== undefined && service.additionalItemPrice > 0)
      return service.additionalItemPrice;
    return undefined;
  };

  const getServiceCurrency = (option: ShippingOption): string => {
    return option.currency || pricingCurrency;
  };

  const getShippingTypeDisplay = (type: string): React.ReactNode => {
    if (type === 'LOCAL_PICKUP') {
      return (
        <span className="inline-flex items-center gap-1 text-warning">
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
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2">
          <Package className="w-5 h-5 text-muted-foreground" />
          {t('product.shippingOptions')}
        </h2>
      </div>

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
            searchPlaceholder={t('common.search')}
            emptyText={t('common.noResults')}
            className="w-[200px]"
          />
        </div>
      )}

      {/* 桌面端 */}
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
                const shippingPrice =
                  shippingPriceRaw !== undefined
                    ? fromMinUnit(shippingPriceRaw, currency)
                    : undefined;
                const additionalPrice =
                  additionalPriceRaw !== undefined
                    ? fromMinUnit(additionalPriceRaw, currency)
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
                          {t('product.priceToBeCalculated')}
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

      {/* 移动端 */}
      <div className="sm:hidden space-y-3">
        {filteredOptions.map((option, optionIndex) =>
          option.services.map((service, serviceIndex) => {
            const shippingPriceRaw = getShippingPrice(service, option);
            const additionalPriceRaw = getAdditionalItemPrice(service);
            const currency = getServiceCurrency(option);
            const shippingPrice =
              shippingPriceRaw !== undefined ? fromMinUnit(shippingPriceRaw, currency) : undefined;
            const additionalPrice =
              additionalPriceRaw !== undefined
                ? fromMinUnit(additionalPriceRaw, currency)
                : undefined;

            return (
              <div
                key={`mobile-${optionIndex}-${serviceIndex}`}
                className="p-3 rounded-lg bg-muted/30 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="font-medium text-sm">{service.name || option.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {getShippingTypeDisplay(option.type)}
                  </div>
                </div>
                {service.estimatedDelivery && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{t('product.estimatedDelivery')}</span>
                    <span>{service.estimatedDelivery}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t('product.shippingFee')}</span>
                  {shippingPrice === 0 ? (
                    <span className="text-primary font-medium">{t('product.freeShipping')}</span>
                  ) : shippingPrice === undefined ? (
                    <span className="text-muted-foreground">
                      {t('product.priceToBeCalculated')}
                    </span>
                  ) : (
                    <span className="font-medium">{formatPrice(shippingPrice, currency)}</span>
                  )}
                </div>
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

      {filteredOptions.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Truck className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">{t('product.noShippingOptions')}</p>
        </div>
      )}
    </Card>
  );
});

// ─── 主组件：自动选择新/旧渲染器 ─────────────────────────────────────

/**
 * 配送选项区块组件
 *
 * 优先使用新版 ShippingProfile (Profile → Zone → Rate)；
 * 如果没有 profile，降级使用旧版 ShippingOption（向后兼容）。
 *
 * @example
 * <ShippingOptionsSection
 *   shippingProfile={product.shippingProfile}
 *   shippingOptions={product.shippingOptions}
 *   pricingCurrency="USD"
 * />
 */
export const ShippingOptionsSection = memo(function ShippingOptionsSection({
  shippingProfile,
  shippingOptions,
  pricingCurrency = 'USD',
  className,
}: ShippingOptionsSectionProps) {
  const { t } = useI18n();

  // 优先使用新版 ShippingProfile（支持直接 zones 和 LocationGroups 两种模式）
  const hasProfile = shippingProfile && getAllZones(shippingProfile).length > 0;

  if (hasProfile) {
    return (
      <ProfileShippingView
        profile={shippingProfile}
        pricingCurrency={pricingCurrency}
        className={className}
      />
    );
  }

  // 降级使用旧版 ShippingOption
  if (shippingOptions && shippingOptions.length > 0) {
    return (
      <LegacyShippingView
        shippingOptions={shippingOptions}
        pricingCurrency={pricingCurrency}
        className={className}
      />
    );
  }

  return (
    <Card className={cn('p-4 sm:p-6', className)} data-testid="shipping-contact-seller">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
          <Truck className="w-5 h-5 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">
            {t('product.contactSellerForShipping')}
          </p>
          <p className="text-xs text-muted-foreground">
            {t('product.contactSellerForShippingDesc')}
          </p>
        </div>
      </div>
    </Card>
  );
});

export default ShippingOptionsSection;
