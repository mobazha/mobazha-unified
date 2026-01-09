'use client';

import React from 'react';
import { Plus, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useI18n } from '@mobazha/core';
import { Button } from '@/components/ui/button';
import { VStack, HStack } from '@/components/layouts';
import type { Address } from './AddressSummary';

export interface AddressSelectorProps {
  addresses: Address[];
  selectedAddressId?: string;
  onSelect: (addressId: string) => void;
  onAddNew?: () => void;
  isLoading?: boolean;
  className?: string;
}

/**
 * AddressSelector 组件 - 地址选择列表
 *
 * 用于 Drawer/Sheet 或独立页面中显示地址列表
 */
export const AddressSelector: React.FC<AddressSelectorProps> = ({
  addresses,
  selectedAddressId,
  onSelect,
  onAddNew,
  isLoading = false,
  className,
}) => {
  const { t } = useI18n();

  if (isLoading) {
    return (
      <VStack gap="sm" className={cn('animate-pulse', className)}>
        {[1, 2, 3].map(i => (
          <div key={i} className="w-full h-24 rounded-lg bg-muted" />
        ))}
      </VStack>
    );
  }

  if (addresses.length === 0) {
    return (
      <VStack gap="md" align="center" className={cn('py-8', className)}>
        <p className="text-muted-foreground text-sm">{t('checkout.noAddresses')}</p>
        {onAddNew && (
          <Button onClick={onAddNew} variant="outline" size="sm">
            <Plus className="w-4 h-4 mr-1" />
            {t('checkout.addAddress')}
          </Button>
        )}
      </VStack>
    );
  }

  return (
    <VStack gap="sm" className={className}>
      {addresses.map(address => {
        const isSelected = selectedAddressId === address.id;

        return (
          <button
            key={address.id}
            type="button"
            onClick={() => onSelect(address.id)}
            className={cn(
              'w-full p-4 rounded-lg border-2 text-left transition-all',
              'hover:border-primary/50',
              isSelected ? 'border-primary bg-primary/5' : 'border-border bg-surface'
            )}
          >
            <HStack justify="between" align="start">
              <div className="flex-1 min-w-0">
                <HStack gap="xs" align="center" className="mb-1">
                  <span className="font-medium text-foreground text-sm">{address.name}</span>
                  {address.isDefault && (
                    <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                      {t('common.default')}
                    </span>
                  )}
                </HStack>
                <p className="text-muted-foreground text-sm">{address.street}</p>
                <p className="text-muted-foreground text-sm">
                  {address.city}, {address.state} {address.postalCode}
                </p>
                <p className="text-muted-foreground text-sm">{address.country}</p>
                <p className="text-muted-foreground text-xs mt-1">{address.phone}</p>
              </div>

              {/* 选中指示器 */}
              <div
                className={cn(
                  'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0',
                  isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/30'
                )}
              >
                {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
              </div>
            </HStack>
          </button>
        );
      })}

      {/* 添加新地址按钮 */}
      {onAddNew && (
        <Button variant="outline" size="sm" className="w-full mt-2" onClick={onAddNew}>
          <Plus className="w-4 h-4 mr-1" />
          {t('checkout.addAddress')}
        </Button>
      )}
    </VStack>
  );
};

export default AddressSelector;
