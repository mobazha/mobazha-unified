'use client';

/**
 * ShippingComparison - 运费对比组件
 * 在结算页显示运费选项对比，标注"最快"/"最便宜"标签
 */

import React, { useMemo } from 'react';
import { Clock, DollarSign, Truck, MapPin, Tag } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useI18n, useCurrency, type ShippingOption } from '@mobazha/core';
import { cn } from '@/lib/utils';

interface ShippingComparisonProps {
  /** 运费选项列表 */
  shippingOptions: ShippingOption[];
  /** 当前选中的选项和服务 */
  selectedOption?: { optionName: string; serviceName: string };
  /** 选择回调 */
  onSelect: (optionName: string, serviceName: string) => void;
  /** 商品货币 */
  currency: string;
  /** 商品数量 */
  quantity?: number;
  /** 满额免邮剩余金额提示（可选） */
  freeShippingGap?: number;
  /** 自定义样式 */
  className?: string;
}

interface FlattenedService {
  optionName: string;
  optionType: string;
  serviceName: string;
  estimatedDelivery?: string;
  price: number; // 最小单位
  currency: string;
  isFastest?: boolean;
  isCheapest?: boolean;
}

/**
 * 解析预计送达时间，返回最小天数用于排序
 * 例如："3-5 days" -> 3, "7-14 days" -> 7
 */
function parseDeliveryDays(estimatedDelivery?: string): number {
  if (!estimatedDelivery) return Infinity;
  const match = estimatedDelivery.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : Infinity;
}

export const ShippingComparison: React.FC<ShippingComparisonProps> = ({
  shippingOptions,
  selectedOption,
  onSelect,
  currency,
  quantity = 1,
  freeShippingGap,
  className,
}) => {
  const { t } = useI18n();
  const { fromMinimalUnit, formatPrice } = useCurrency();

  // 扁平化所有服务选项并计算标签
  const flattenedServices = useMemo((): FlattenedService[] => {
    const services: FlattenedService[] = [];

    for (const option of shippingOptions) {
      const serviceCurrency = option.currency || currency;

      for (const service of option.services) {
        // 计算价格（处理本地自提免费）
        let price = 0;
        if (option.type !== 'LOCAL_PICKUP') {
          const basePrice = service.firstFreight ?? service.price ?? 0;
          const additionalPrice = service.renewalUnitPrice ?? service.additionalItemPrice ?? 0;
          const extraItems = Math.max(quantity - 1, 0);
          price = basePrice + additionalPrice * extraItems;
        }

        services.push({
          optionName: option.name,
          optionType: option.type,
          serviceName: service.name,
          estimatedDelivery: service.estimatedDelivery,
          price,
          currency: serviceCurrency,
        });
      }
    }

    if (services.length === 0) return services;

    // 找最便宜的（非零价格中最低的，或者全是零则全部标记）
    const nonZeroPrices = services.filter(s => s.price > 0);
    if (nonZeroPrices.length > 0) {
      const minPrice = Math.min(...nonZeroPrices.map(s => s.price));
      services
        .filter(s => s.price === minPrice)
        .forEach(s => {
          s.isCheapest = true;
        });
    } else {
      // 全部免费，都标记为最便宜
      services.forEach(s => {
        s.isCheapest = true;
      });
    }

    // 找最快的（排除本地自提，因为自提是即时的）
    const withDelivery = services.filter(
      s => s.optionType !== 'LOCAL_PICKUP' && s.estimatedDelivery
    );
    if (withDelivery.length > 0) {
      const minDays = Math.min(...withDelivery.map(s => parseDeliveryDays(s.estimatedDelivery)));
      withDelivery
        .filter(s => parseDeliveryDays(s.estimatedDelivery) === minDays)
        .forEach(s => {
          s.isFastest = true;
        });
    }

    return services;
  }, [shippingOptions, currency, quantity]);

  if (flattenedServices.length === 0) {
    return null;
  }

  return (
    <div className={cn('space-y-2', className)}>
      {flattenedServices.map(service => {
        const isSelected =
          selectedOption?.optionName === service.optionName &&
          selectedOption?.serviceName === service.serviceName;

        const displayPrice = fromMinimalUnit(service.price, service.currency);
        const isLocalPickup = service.optionType === 'LOCAL_PICKUP';

        return (
          <label
            key={`${service.optionName}-${service.serviceName}`}
            className={cn(
              'flex items-start justify-between p-3 sm:p-4 border rounded-lg cursor-pointer transition-all',
              isSelected
                ? 'border-primary bg-primary/5 ring-1 ring-primary'
                : 'border-border hover:border-primary/50 hover:bg-muted/30'
            )}
          >
            <div className="flex items-start gap-3 flex-1">
              <input
                type="radio"
                checked={isSelected}
                onChange={() => onSelect(service.optionName, service.serviceName)}
                className="mt-1 w-4 h-4 text-primary focus:ring-primary"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-foreground">
                    {service.optionName} - {service.serviceName}
                  </span>
                  {/* 标签 */}
                  <div className="flex gap-1">
                    {service.isCheapest && (
                      <Badge variant="secondary" className="text-xs bg-success/15 text-success">
                        <DollarSign className="w-3 h-3 mr-0.5" />
                        {t('checkout.cheapest') || 'Cheapest'}
                      </Badge>
                    )}
                    {service.isFastest && (
                      <Badge variant="secondary" className="text-xs bg-info/15 text-info">
                        <Clock className="w-3 h-3 mr-0.5" />
                        {t('checkout.fastest') || 'Fastest'}
                      </Badge>
                    )}
                  </div>
                </div>
                {/* 配送时间 */}
                {service.estimatedDelivery && (
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    {isLocalPickup ? <MapPin className="w-3 h-3" /> : <Truck className="w-3 h-3" />}
                    {service.estimatedDelivery}
                  </p>
                )}
              </div>
            </div>
            {/* 价格 */}
            <div className="text-right ml-3 flex-shrink-0">
              <span className="font-semibold text-foreground">
                {displayPrice === 0
                  ? t('checkout.free') || 'Free'
                  : formatPrice(displayPrice, service.currency)}
              </span>
            </div>
          </label>
        );
      })}

      {/* 满额免邮提示 */}
      {freeShippingGap !== undefined && freeShippingGap > 0 && (
        <div className="flex items-center gap-2 p-3 bg-warning/8 rounded-lg border border-warning/20">
          <Tag className="w-4 h-4 text-warning flex-shrink-0" />
          <p className="text-sm text-warning">
            {t('shipping.spendMoreForFreeShipping', {
              amount: formatPrice(freeShippingGap, currency),
            }) || `Spend ${formatPrice(freeShippingGap, currency)} more for free shipping`}
          </p>
        </div>
      )}
    </div>
  );
};

export default ShippingComparison;
