'use client';

/**
 * ShippingTemplateSelector - 运费预设模板选择器
 * 提供快速预设模板帮助卖家快速配置常见运费方案
 */

import React from 'react';
import { Package, Globe, MapPin, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useI18n, type ShippingOptionSetting } from '@mobazha/core';

// 预设模板类型
export type ShippingTemplateType =
  | 'domestic_standard'
  | 'worldwide_flat'
  | 'local_pickup'
  | 'express';

// 预设模板数据
export interface ShippingTemplate {
  id: ShippingTemplateType;
  icon: React.ComponentType<{ className?: string }>;
  labelKey: string;
  descKey: string;
  createOption: (currency: string) => ShippingOptionSetting;
}

// 预设模板配置
export const SHIPPING_TEMPLATES: ShippingTemplate[] = [
  {
    id: 'domestic_standard',
    icon: Package,
    labelKey: 'shippingTemplates.domesticStandard',
    descKey: 'shippingTemplates.domesticStandardDesc',
    createOption: (currency: string): ShippingOptionSetting => ({
      name: currency === 'CNY' ? '国内标准快递' : 'Domestic Standard',
      type: 'FIXED_PRICE',
      currency,
      serviceType: 'FIRST_RENEWAL_FEE',
      regions: currency === 'CNY' ? ['CN'] : ['US'],
      services: [
        {
          name: currency === 'CNY' ? '普通快递' : 'Standard',
          estimatedDelivery: '3-5 days',
          startWeight: 0,
          endWeight: 0,
          firstWeight: 1000, // 1kg
          firstFreight: currency === 'CNY' ? '1000' : '500', // ¥10 or $5
          renewalUnitWeight: 1000, // 1kg
          renewalUnitPrice: currency === 'CNY' ? '300' : '200', // ¥3 or $2 per kg
          registrationFee: '0',
        },
      ],
    }),
  },
  {
    id: 'worldwide_flat',
    icon: Globe,
    labelKey: 'shippingTemplates.worldwideFlat',
    descKey: 'shippingTemplates.worldwideFlatDesc',
    createOption: (currency: string): ShippingOptionSetting => ({
      name: currency === 'CNY' ? '全球统一运费' : 'Worldwide Flat Rate',
      type: 'FIXED_PRICE',
      currency,
      serviceType: 'SAME_WEIGHT_SAME_FEE',
      regions: ['ALL'],
      services: [
        {
          name: currency === 'CNY' ? '国际快递' : 'International',
          estimatedDelivery: '7-14 days',
          startWeight: 0,
          endWeight: 10000, // up to 10kg
          firstWeight: 0,
          firstFreight: currency === 'CNY' ? '9900' : '1500', // ¥99 or $15
          renewalUnitWeight: 0,
          renewalUnitPrice: '0',
          registrationFee: '0',
        },
      ],
    }),
  },
  {
    id: 'express',
    icon: Truck,
    labelKey: 'shippingTemplates.express',
    descKey: 'shippingTemplates.expressDesc',
    createOption: (currency: string): ShippingOptionSetting => ({
      name: currency === 'CNY' ? '特快专递' : 'Express Shipping',
      type: 'FIXED_PRICE',
      currency,
      serviceType: 'FIRST_RENEWAL_FEE',
      regions: currency === 'CNY' ? ['CN'] : ['US'],
      services: [
        {
          name: currency === 'CNY' ? '次日达' : 'Express',
          estimatedDelivery: '1-2 days',
          startWeight: 0,
          endWeight: 0,
          firstWeight: 1000,
          firstFreight: currency === 'CNY' ? '2000' : '1500', // ¥20 or $15
          renewalUnitWeight: 1000,
          renewalUnitPrice: currency === 'CNY' ? '500' : '500', // ¥5 or $5 per kg
          registrationFee: '0',
        },
      ],
    }),
  },
  {
    id: 'local_pickup',
    icon: MapPin,
    labelKey: 'shippingTemplates.localPickup',
    descKey: 'shippingTemplates.localPickupDesc',
    createOption: (currency: string): ShippingOptionSetting => ({
      name: currency === 'CNY' ? '本地自提' : 'Local Pickup',
      type: 'LOCAL_PICKUP',
      currency,
      serviceType: 'SAME_WEIGHT_SAME_FEE',
      regions: ['ALL'],
      services: [
        {
          name: currency === 'CNY' ? '门店自提' : 'Store Pickup',
          estimatedDelivery: currency === 'CNY' ? '即时可取' : 'Ready for pickup',
          startWeight: 0,
          endWeight: 0,
          firstWeight: 0,
          firstFreight: '0',
          renewalUnitWeight: 0,
          renewalUnitPrice: '0',
          registrationFee: '0',
        },
      ],
    }),
  },
];

interface ShippingTemplateSelectorProps {
  currency: string;
  onSelect: (option: ShippingOptionSetting) => void;
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
              onClick={() => onSelect(template.createOption(currency))}
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
            // 创建一个空模板让用户自定义
            onSelect({
              name: '',
              type: 'FIXED_PRICE',
              currency,
              serviceType: 'SAME_WEIGHT_SAME_FEE',
              regions: [],
              services: [
                {
                  name: '',
                  estimatedDelivery: '',
                  startWeight: 0,
                  endWeight: 0,
                  firstWeight: 0,
                  firstFreight: '0',
                  renewalUnitWeight: 0,
                  renewalUnitPrice: '0',
                  registrationFee: '0',
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
