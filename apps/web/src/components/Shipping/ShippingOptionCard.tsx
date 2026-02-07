'use client';

/**
 * ShippingOptionCard - 配送选项卡片
 * 展示单个配送选项的摘要信息
 */

import React, { useMemo } from 'react';
import { Truck, MapPin, Edit, Trash2, Package, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  useI18n,
  getCountryName,
  type ShippingOptionConfig,
  fromMinimalUnit,
  formatPrice,
} from '@mobazha/core';

// 配送类型图标
const TYPE_ICONS: Record<string, React.ReactNode> = {
  FIXED_PRICE: <Truck className="w-4 h-4" />,
  LOCAL_PICKUP: <MapPin className="w-4 h-4" />,
};

interface ShippingOptionCardProps {
  option: ShippingOptionConfig;
  onEdit?: () => void;
  onDelete?: () => void;
  disabled?: boolean;
  className?: string;
}

export const ShippingOptionCard: React.FC<ShippingOptionCardProps> = ({
  option,
  onEdit,
  onDelete,
  disabled = false,
  className,
}) => {
  const { t, language } = useI18n();

  // 获取地区显示文本
  const regionsDisplay = useMemo(() => {
    if (!option.regions || option.regions.length === 0) {
      return t('shipping.noRegions');
    }
    if (option.regions.length === 1 && option.regions[0] === 'ALL') {
      return t('shipping.worldwide');
    }
    if (option.regions.length <= 3) {
      return option.regions.map(code => getCountryName(code, language) || code).join(', ');
    }
    const firstTwo = option.regions
      .slice(0, 2)
      .map(code => getCountryName(code, language) || code)
      .join(', ');
    return `${firstTwo} +${option.regions.length - 2}`;
  }, [option.regions, language, t]);

  // 计算价格范围（使用 fromMinimalUnit 处理不同货币精度）
  const priceRange = useMemo(() => {
    if (!option.services || option.services.length === 0) {
      return null;
    }
    // 使用 fromMinimalUnit 根据货币精度转换
    const prices = option.services.map(s =>
      fromMinimalUnit(s.firstFreight || '0', option.currency)
    );
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

    if (minPrice === maxPrice) {
      return formatPrice(minPrice, option.currency, { showSymbol: true, showCode: true });
    }
    const minFormatted = formatPrice(minPrice, option.currency, { showSymbol: false });
    const maxFormatted = formatPrice(maxPrice, option.currency, {
      showSymbol: true,
      showCode: true,
    });
    return `${minFormatted} - ${maxFormatted}`;
  }, [option.services, option.currency]);

  // 获取配送时间范围
  const deliveryRange = useMemo(() => {
    if (!option.services || option.services.length === 0) {
      return null;
    }
    const deliveries = option.services.map(s => s.estimatedDelivery).filter(Boolean);
    if (deliveries.length === 0) return null;
    if (deliveries.length === 1) return deliveries[0];
    return `${deliveries[0]} - ${deliveries[deliveries.length - 1]}`;
  }, [option.services]);

  // 获取配送类型图标
  const typeIcon = TYPE_ICONS[option.type] || TYPE_ICONS.FIXED_PRICE;

  // 获取服务类型标签（动态翻译）
  const serviceTypeLabel = useMemo(() => {
    if (option.serviceType === 'FIRST_RENEWAL_FEE') {
      return t('shipping.serviceTypeLabel.firstRenewal');
    }
    if (option.serviceType === 'SAME_WEIGHT_SAME_FEE') {
      return t('shipping.serviceTypeLabel.flatRate');
    }
    return option.serviceType;
  }, [option.serviceType, t]);

  return (
    <Card className={cn('relative', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {typeIcon}
            <CardTitle className="text-base">{option.name || t('shipping.unnamed')}</CardTitle>
          </div>
          <div className="flex items-center gap-1">
            {onEdit && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onEdit}
                disabled={disabled}
                className="h-8 w-8"
              >
                <Edit className="w-4 h-4" />
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onDelete}
                disabled={disabled}
                className="h-8 w-8 text-destructive hover:text-destructive"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* 配送地区 */}
        <div className="flex items-center gap-2 text-sm">
          {option.regions?.length === 1 && option.regions[0] === 'ALL' ? (
            <Globe className="w-4 h-4 text-muted-foreground" />
          ) : (
            <MapPin className="w-4 h-4 text-muted-foreground" />
          )}
          <span className="text-muted-foreground">{regionsDisplay}</span>
        </div>

        {/* 服务数量和类型 */}
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            <Package className="w-3 h-3 mr-1" />
            {option.services?.length || 0} {t('shipping.services')}
          </Badge>
          <Badge variant="secondary" className="text-xs">
            {serviceTypeLabel}
          </Badge>
        </div>

        {/* 价格和配送时间 */}
        <div className="flex items-center justify-between text-sm pt-2 border-t">
          <div>{priceRange && <span className="font-medium text-primary">{priceRange}</span>}</div>
          <div>
            {deliveryRange && (
              <span className="text-muted-foreground">
                {t('shipping.estimatedDelivery')}: {deliveryRange}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ShippingOptionCard;
