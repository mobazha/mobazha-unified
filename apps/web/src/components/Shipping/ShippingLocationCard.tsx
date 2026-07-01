'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useI18n } from '@mobazha/core';
import type { ShippingLocation } from '@mobazha/core';
import { Pencil, Trash2, MapPin, Check } from 'lucide-react';
import { HStack, VStack } from '@/components/layouts';
import { cn } from '@/lib/utils';

export interface ShippingLocationCardProps {
  location: ShippingLocation;
  onEdit: () => void;
  onDelete: () => void;
  onSetDefault: () => void;
  disabled?: boolean;
}

/**
 * 发货地点卡片组件
 * 显示单个发货地点信息
 */
export function ShippingLocationCard({
  location,
  onEdit,
  onDelete,
  onSetDefault,
  disabled = false,
}: ShippingLocationCardProps) {
  const { t } = useI18n();

  return (
    <Card className={cn('p-4', disabled && 'opacity-60')}>
      <HStack justify="between" align="start">
        <VStack gap="sm" className="flex-1">
          {/* 地点名称和标签 */}
          <HStack gap="sm" align="center">
            <MapPin className="w-5 h-5 text-primary" />
            <h4 className="font-medium text-foreground">
              {location.name || t('shipping.unnamedLocation')}
            </h4>
            {location.isDefault && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                {t('common.default')}
              </span>
            )}
          </HStack>

          {/* 地址信息 */}
          {location.address && (
            <p className="text-sm text-muted-foreground ml-7">{location.address}</p>
          )}
        </VStack>

        {/* 操作按钮 */}
        <HStack gap="xs">
          {!location.isDefault && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onSetDefault}
              disabled={disabled}
              title={t('shipping.setAsDefaultLocation')}
            >
              <Check className="w-4 h-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onEdit}
            disabled={disabled}
            title={t('common.edit')}
          >
            <Pencil className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            disabled={disabled || location.isDefault}
            title={t('common.delete')}
            className={cn(location.isDefault && 'cursor-not-allowed')}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </HStack>
      </HStack>
    </Card>
  );
}

export default ShippingLocationCard;
