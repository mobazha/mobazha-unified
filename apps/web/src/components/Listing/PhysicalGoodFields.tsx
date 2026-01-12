'use client';

import React, { useCallback, useState, useMemo } from 'react';
import { Settings, Truck } from 'lucide-react';
import type { ShippingOption } from '@mobazha/core';
import { useI18n } from '@mobazha/core';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface PhysicalGoodFieldsProps {
  shippingOptions: ShippingOption[];
  selectedShippingOptions: string[];
  onShippingOptionsChange: (options: ShippingOption[]) => void;
  onSelectedShippingOptionsChange: (selected: string[]) => void;
  errors?: {
    shippingOptions?: string;
  };
  className?: string;
}

// 模拟从店铺设置获取的物流选项
const mockStoreShippingOptions: ShippingOption[] = [
  {
    name: 'Shipping world wide',
    type: 'FIXED_PRICE',
    regions: ['ALL'],
    services: [
      {
        name: 'Standard International',
        price: 15,
        estimatedDelivery: '7-14 days',
        additionalItemPrice: 5,
      },
    ],
  },
  {
    name: 'Domestic Shipping',
    type: 'FIXED_PRICE',
    regions: ['US'],
    services: [
      {
        name: 'Standard',
        price: 5,
        estimatedDelivery: '3-5 days',
        additionalItemPrice: 2,
      },
      {
        name: 'Express',
        price: 15,
        estimatedDelivery: '1-2 days',
        additionalItemPrice: 5,
      },
    ],
  },
  {
    name: 'Local Pickup',
    type: 'LOCAL_PICKUP',
    regions: ['US'],
    services: [
      {
        name: 'Pickup',
        price: 0,
        estimatedDelivery: 'Same day',
      },
    ],
  },
];

export function PhysicalGoodFields({
  shippingOptions,
  selectedShippingOptions,
  onShippingOptionsChange,
  onSelectedShippingOptionsChange,
  errors = {},
  className = '',
}: PhysicalGoodFieldsProps) {
  const { t } = useI18n();
  const [showManageModal, setShowManageModal] = useState(false);

  // 使用 useMemo 初始化店铺物流设置（实际应从 API 获取）
  const storeShippingOptions = useMemo(() => mockStoreShippingOptions, []);

  // 切换物流选项选择状态
  const handleToggleOption = useCallback(
    (option: ShippingOption) => {
      const isSelected = selectedShippingOptions.includes(option.name);

      if (isSelected) {
        // 取消选择
        const newSelected = selectedShippingOptions.filter(name => name !== option.name);
        onSelectedShippingOptionsChange(newSelected);
        onShippingOptionsChange(shippingOptions.filter(o => newSelected.includes(o.name)));
      } else {
        // 选择
        onSelectedShippingOptionsChange([...selectedShippingOptions, option.name]);
        onShippingOptionsChange([...shippingOptions, option]);
      }
    },
    [
      selectedShippingOptions,
      shippingOptions,
      onSelectedShippingOptionsChange,
      onShippingOptionsChange,
    ]
  );

  // 获取选中的物流选项
  const selectedOptions = storeShippingOptions.filter(option =>
    selectedShippingOptions.includes(option.name)
  );

  // 获取物流类型显示
  const getShippingTypeLabel = (type: string) => {
    switch (type) {
      case 'LOCAL_PICKUP':
        return t('listing.localPickup') || 'Local Pickup';
      case 'FIXED_PRICE':
        return t('listing.fixedPrice') || 'Fixed Price';
      default:
        return type;
    }
  };

  // 获取地区显示
  const getRegionsDisplay = (regions: string[]) => {
    if (regions.includes('ALL')) {
      return t('listing.worldwide') || 'Worldwide';
    }
    return regions.join(', ');
  };

  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-foreground">
          {t('listing.shippingOptions') || 'Shipping Options'}{' '}
          <span className="text-destructive">*</span>
        </h2>
        <Button type="button" variant="outline" size="sm" onClick={() => setShowManageModal(true)}>
          <Settings className="w-4 h-4 mr-1" />
          {t('listing.manageShippingOptions') || 'Manage Shipping Options'}
        </Button>
      </div>

      {errors.shippingOptions && (
        <p className="text-destructive text-sm mb-3">{errors.shippingOptions}</p>
      )}

      <p className="text-sm text-muted-foreground mb-4">
        {t('listing.shippingOptionsHelper') ||
          'The following shipping options from your store settings will be used for this listing'}
      </p>

      {/* 已选择的物流选项列表 */}
      {selectedOptions.length === 0 ? (
        <div className="p-6 border-2 border-dashed border-border rounded-lg text-center">
          <Truck className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
          <p className="text-muted-foreground">
            {t('listing.noShippingSelected') || 'No shipping options selected'}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => setShowManageModal(true)}
          >
            {t('listing.selectShippingOptions') || 'Select Shipping Options'}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {selectedOptions.map((option, index) => (
            <div key={index} className="p-4 border border-border rounded-lg bg-muted/30">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-medium text-foreground">{option.name}</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    {getRegionsDisplay(option.regions)}
                  </p>
                </div>
                <span className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground">
                  {getShippingTypeLabel(option.type)}
                </span>
              </div>

              {/* 服务列表 */}
              {option.services.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-xs text-muted-foreground mb-2">
                    {option.services.length} {t('listing.services') || 'service(s)'}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {option.services.map((service, sIndex) => (
                      <div key={sIndex} className="text-sm p-2 bg-background rounded">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{service.name}</span>
                          <span className="text-primary">
                            {service.price === 0
                              ? t('listing.free') || 'Free'
                              : `$${service.price}`}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {service.estimatedDelivery}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 管理物流选项弹窗 */}
      <Dialog open={showManageModal} onOpenChange={setShowManageModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {t('listing.selectShippingOptions') || 'Select Shipping Options'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 mt-4">
            {storeShippingOptions.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-muted-foreground mb-3">
                  {t('listing.noShippingOptionsConfigured') ||
                    'No shipping options configured in your store settings'}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    // 导航到店铺设置
                    setShowManageModal(false);
                  }}
                >
                  {t('listing.goToSettings') || 'Go to Settings'}
                </Button>
              </div>
            ) : (
              storeShippingOptions.map((option, index) => {
                const isSelected = selectedShippingOptions.includes(option.name);
                return (
                  <div
                    key={index}
                    className={`
                      p-4 border rounded-lg cursor-pointer transition-colors
                      ${isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}
                    `}
                    onClick={() => handleToggleOption(option)}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleToggleOption(option)}
                        className="mt-0.5"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-foreground">{option.name}</h4>
                          <span className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground">
                            {getRegionsDisplay(option.regions)}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {option.services.length} {t('listing.services') || 'service(s)'} •{' '}
                          {getShippingTypeLabel(option.type)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-border">
            <Button variant="outline" onClick={() => setShowManageModal(false)}>
              {t('common.done') || 'Done'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export default PhysicalGoodFields;
