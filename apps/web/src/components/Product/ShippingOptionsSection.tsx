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
import type { ShippingProfile } from '@mobazha/core';
import { getAllZones } from '@mobazha/core';
import { cn } from '@/lib/utils';

export interface ShippingOptionsSectionProps {
  /** 新版配送档案数据 */
  shippingProfile?: ShippingProfile;
  /** 自定义样式 */
  className?: string;
}

interface ProfileViewProps {
  profile: ShippingProfile;
  className?: string;
}

/**
 * 基于新版 ShippingProfile (Profile → Zone → Rate) 渲染配送选项
 */
const ProfileShippingView = memo(function ProfileShippingView({
  profile,
  className,
}: ProfileViewProps) {
  const { t, locale } = useI18n();
  const { formatPrice } = useCurrency();

  const zones = useMemo(() => getAllZones(profile), [profile]);

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

      {/* 桌面端表格 */}
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
            {matchedRates.map(({ rate, zoneName }) => {
              const currency = rate.currency?.trim() || '';
              const hasCurrency = currency.length > 0;
              const minimalPrice = Number(rate.price) || 0;
              const price = hasCurrency ? fromMinimalUnit(minimalPrice, currency) : 0;

              return (
                <TableRow
                  key={`${zoneName}-${rate.id || rate.name}`}
                  className="hover:bg-muted/50 transition-colors"
                >
                  <TableCell className="font-medium">{rate.name}</TableCell>
                  <TableCell>
                    <span className="text-muted-foreground">{rate.estimatedDelivery || '-'}</span>
                  </TableCell>
                  <TableCell className="text-right min-w-[80px]">
                    {!hasCurrency ? (
                      <span className="text-muted-foreground">—</span>
                    ) : minimalPrice === 0 ? (
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
        {matchedRates.map(({ rate, zoneName }) => {
          const currency = rate.currency?.trim() || '';
          const hasCurrency = currency.length > 0;
          const minimalPrice = Number(rate.price) || 0;
          const price = hasCurrency ? fromMinimalUnit(minimalPrice, currency) : 0;

          return (
            <div
              key={`${zoneName}-${rate.id || rate.name}`}
              className="p-3 rounded-lg bg-muted/30 space-y-2"
            >
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
                {!hasCurrency ? (
                  <span className="text-muted-foreground">—</span>
                ) : minimalPrice === 0 ? (
                  <span className="text-primary font-medium">{t('product.freeShipping')}</span>
                ) : (
                  <span className="font-medium">{formatPrice(price, currency)}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 当前目的地下无可用费率 */}
      {matchedRates.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Truck className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">{t('product.noShippingOptions')}</p>
        </div>
      )}
    </Card>
  );
});

/**
 * 配送选项区块组件（仅支持 ShippingProfile）
 */
export const ShippingOptionsSection = memo(function ShippingOptionsSection({
  shippingProfile,
  className,
}: ShippingOptionsSectionProps) {
  const { t } = useI18n();

  const hasProfile = shippingProfile && getAllZones(shippingProfile).length > 0;

  if (hasProfile) {
    return <ProfileShippingView profile={shippingProfile} className={className} />;
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
