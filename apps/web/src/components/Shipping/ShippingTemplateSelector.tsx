'use client';

/**
 * ShippingTemplateSelector - 运费预设模板选择器
 * 直接生成 ShippingZone 格式，用于新版配送档案系统
 */

import React, { useMemo } from 'react';
import { Package, Globe, MapPin, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useI18n, generateId, inferCountryFromCurrency, type ShippingZone } from '@mobazha/core';

export type ShippingTemplateType =
  | 'domestic_standard'
  | 'worldwide_flat'
  | 'express'
  | 'local_pickup';

interface ShippingTemplateSelectorProps {
  currency: string;
  sellerCountry?: string;
  onSelect: (zone: ShippingZone) => void;
  className?: string;
}

export const ShippingTemplateSelector: React.FC<ShippingTemplateSelectorProps> = ({
  currency,
  sellerCountry,
  onSelect,
  className,
}) => {
  const { t } = useI18n();
  const domesticCountry = useMemo(
    () => sellerCountry || inferCountryFromCurrency(currency),
    [sellerCountry, currency],
  );

  const templates = useMemo(
    () => [
      {
        id: 'domestic_standard' as ShippingTemplateType,
        icon: Package,
        labelKey: 'shippingTemplates.domesticStandard' as const,
        descKey: 'shippingTemplates.domesticStandardDesc' as const,
        createZone: (): ShippingZone => ({
          id: generateId(),
          name: t('shippingTemplates.domesticStandard'),
          regions: [domesticCountry],
          rates: [
            {
              id: generateId(),
              name: t('shippingTemplates.tplStandard'),
              price: '500',
              currency,
              estimatedDelivery: t('shippingTemplates.tplDelivery3to5'),
            },
          ],
        }),
      },
      {
        id: 'worldwide_flat' as ShippingTemplateType,
        icon: Globe,
        labelKey: 'shippingTemplates.worldwideFlat' as const,
        descKey: 'shippingTemplates.worldwideFlatDesc' as const,
        createZone: (): ShippingZone => ({
          id: generateId(),
          name: t('shippingTemplates.worldwideFlat'),
          regions: ['ALL'],
          rates: [
            {
              id: generateId(),
              name: t('shippingTemplates.tplInternationalRate'),
              price: '1500',
              currency,
              estimatedDelivery: t('shippingTemplates.tplDelivery7to14'),
            },
          ],
        }),
      },
      {
        id: 'express' as ShippingTemplateType,
        icon: Truck,
        labelKey: 'shippingTemplates.express' as const,
        descKey: 'shippingTemplates.expressDesc' as const,
        createZone: (): ShippingZone => ({
          id: generateId(),
          name: t('shippingTemplates.express'),
          regions: [domesticCountry],
          rates: [
            {
              id: generateId(),
              name: t('shippingTemplates.tplNextDay'),
              currency,
              price: '1500',
              estimatedDelivery: t('shippingTemplates.tplDelivery1to2'),
            },
          ],
        }),
      },
      {
        id: 'local_pickup' as ShippingTemplateType,
        icon: MapPin,
        labelKey: 'shippingTemplates.localPickup' as const,
        descKey: 'shippingTemplates.localPickupDesc' as const,
        createZone: (): ShippingZone => ({
          id: generateId(),
          name: t('shippingTemplates.localPickup'),
          regions: ['ALL'],
          rates: [
            {
              id: generateId(),
              name: t('shippingTemplates.tplStorePickup'),
              price: '0',
              currency,
              estimatedDelivery: t('shippingTemplates.tplPickupReady'),
            },
          ],
        }),
      },
    ],
    [currency, domesticCountry, t]
  );

  return (
    <div className={className}>
      <div className="mb-3">
        <h3 className="text-sm font-medium text-foreground">{t('shippingTemplates.quickStart')}</h3>
        <p className="text-xs text-muted-foreground mt-1">
          {t('shippingTemplates.quickStartDesc')}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {templates.map(template => {
          const Icon = template.icon;
          return (
            <Card
              key={template.id}
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => onSelect(template.createZone())}
            >
              <CardContent className="p-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">
                      {t(template.labelKey)}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                      {t(template.descKey)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-3 pt-3 border-t text-center">
        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-muted-foreground"
          onClick={() => {
            onSelect({
              id: generateId(),
              name: '',
              regions: [],
              rates: [
                {
                  id: generateId(),
                  name: '',
                  price: '0',
                  currency,
                  estimatedDelivery: '',
                },
              ],
            });
          }}
        >
          {t('shippingTemplates.createCustom')}
        </Button>
      </div>
    </div>
  );
};

export default ShippingTemplateSelector;
