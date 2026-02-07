'use client';

/**
 * ShippingTemplateSelector - 运费预设模板选择器
 * 直接生成 ShippingZone 格式，用于新版配送档案系统
 */

import React from 'react';
import { Package, Globe, MapPin, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useI18n, generateId, type ShippingZone } from '@mobazha/core';

// 预设模板类型
export type ShippingTemplateType =
  | 'domestic_standard'
  | 'worldwide_flat'
  | 'express'
  | 'local_pickup';

// 预设模板数据
export interface ShippingTemplate {
  id: ShippingTemplateType;
  icon: React.ComponentType<{ className?: string }>;
  labelKey: string;
  descKey: string;
  createZone: (currency: string) => ShippingZone;
}

// 预设模板配置 — 直接生成 ShippingZone
export const SHIPPING_TEMPLATES: ShippingTemplate[] = [
  {
    id: 'domestic_standard',
    icon: Package,
    labelKey: 'shippingTemplates.domesticStandard',
    descKey: 'shippingTemplates.domesticStandardDesc',
    createZone: (currency: string): ShippingZone => ({
      id: generateId(),
      name: currency === 'CNY' ? '国内标准快递' : 'Domestic Standard',
      regions: currency === 'CNY' ? ['CN'] : ['US'],
      rates: [
        {
          id: generateId(),
          name: currency === 'CNY' ? '普通快递' : 'Standard',
          price: currency === 'CNY' ? '1000' : '500', // ¥10 or $5
          currency,
          estimatedDelivery: '3-5 days',
        },
      ],
    }),
  },
  {
    id: 'worldwide_flat',
    icon: Globe,
    labelKey: 'shippingTemplates.worldwideFlat',
    descKey: 'shippingTemplates.worldwideFlatDesc',
    createZone: (currency: string): ShippingZone => ({
      id: generateId(),
      name: currency === 'CNY' ? '全球统一运费' : 'Worldwide Flat Rate',
      regions: ['ALL'],
      rates: [
        {
          id: generateId(),
          name: currency === 'CNY' ? '国际快递' : 'International',
          price: currency === 'CNY' ? '9900' : '1500', // ¥99 or $15
          currency,
          estimatedDelivery: '7-14 days',
        },
      ],
    }),
  },
  {
    id: 'express',
    icon: Truck,
    labelKey: 'shippingTemplates.express',
    descKey: 'shippingTemplates.expressDesc',
    createZone: (currency: string): ShippingZone => ({
      id: generateId(),
      name: currency === 'CNY' ? '特快专递' : 'Express Shipping',
      regions: currency === 'CNY' ? ['CN'] : ['US'],
      rates: [
        {
          id: generateId(),
          name: currency === 'CNY' ? '次日达' : 'Express',
          price: currency === 'CNY' ? '2000' : '1500', // ¥20 or $15
          currency,
          estimatedDelivery: '1-2 days',
        },
      ],
    }),
  },
  {
    id: 'local_pickup',
    icon: MapPin,
    labelKey: 'shippingTemplates.localPickup',
    descKey: 'shippingTemplates.localPickupDesc',
    createZone: (currency: string): ShippingZone => ({
      id: generateId(),
      name: currency === 'CNY' ? '本地自提' : 'Local Pickup',
      regions: ['ALL'],
      rates: [
        {
          id: generateId(),
          name: currency === 'CNY' ? '门店自提' : 'Store Pickup',
          price: '0',
          currency,
          estimatedDelivery: currency === 'CNY' ? '即时可取' : 'Ready for pickup',
        },
      ],
    }),
  },
];

interface ShippingTemplateSelectorProps {
  currency: string;
  onSelect: (zone: ShippingZone) => void;
  className?: string;
}

export const ShippingTemplateSelector: React.FC<ShippingTemplateSelectorProps> = ({
  currency,
  onSelect,
  className,
}) => {
  const { t } = useI18n();

  return (
    <div className={className}>
      <div className="mb-3">
        <h3 className="text-sm font-medium text-foreground">
          {t('shippingTemplates.quickStart') || 'Quick Start Templates'}
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          {t('shippingTemplates.quickStartDesc') || 'Choose a template to get started quickly'}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {SHIPPING_TEMPLATES.map(template => {
          const Icon = template.icon;
          return (
            <Card
              key={template.id}
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => onSelect(template.createZone(currency))}
            >
              <CardContent className="p-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">
                      {t(template.labelKey) || template.id}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                      {t(template.descKey) || ''}
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
            // 创建一个空 zone 让用户自定义
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
          {t('shippingTemplates.createCustom') || 'Or create a custom option'}
        </Button>
      </div>
    </div>
  );
};

export default ShippingTemplateSelector;
