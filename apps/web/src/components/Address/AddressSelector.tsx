'use client';

import React from 'react';
import { Plus, Check, Pencil, Trash2, MoreVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useI18n } from '@mobazha/core';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { VStack, HStack } from '@/components/layouts';
import type { Address } from './AddressSummary';

export interface AddressSelectorProps {
  addresses: Address[];
  selectedAddressId?: string;
  onSelect: (addressId: string) => void;
  onAddNew?: () => void;
  onEdit?: (address: Address) => void;
  onDelete?: (addressId: string) => void;
  onSetDefault?: (addressId: string) => void;
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
  onEdit,
  onDelete,
  onSetDefault,
  isLoading = false,
  className,
}) => {
  const { t } = useI18n();

  // 是否显示操作菜单
  const showActions = onEdit || onDelete || onSetDefault;

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
          <div
            key={address.id}
            className={cn(
              'w-full p-4 rounded-lg border-2 text-left transition-all relative',
              'hover:border-primary/50',
              isSelected ? 'border-primary bg-primary/5' : 'border-border bg-surface'
            )}
          >
            <button type="button" onClick={() => onSelect(address.id)} className="w-full text-left">
              <HStack justify="between" align="start">
                <div className="flex-1 min-w-0 pr-8">
                  <HStack gap="xs" align="center" className="mb-1">
                    <span className="font-medium text-foreground text-sm">{address.name}</span>
                    {address.isDefault && (
                      <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                        {t('common.default') || 'Default'}
                      </span>
                    )}
                  </HStack>
                  <p className="text-muted-foreground text-sm">{address.street}</p>
                  <p className="text-muted-foreground text-sm">
                    {address.city}, {address.state} {address.postalCode}
                  </p>
                  <p className="text-muted-foreground text-sm">{address.country}</p>
                  {address.phone && (
                    <p className="text-muted-foreground text-xs mt-1">{address.phone}</p>
                  )}
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

            {/* 操作菜单 */}
            {showActions && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="absolute top-2 right-2 p-1.5 rounded-md hover:bg-muted transition-colors"
                    onClick={e => e.stopPropagation()}
                  >
                    <MoreVertical className="w-4 h-4 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onEdit && (
                    <DropdownMenuItem onClick={() => onEdit(address)}>
                      <Pencil className="w-4 h-4 mr-2" />
                      {t('common.edit') || 'Edit'}
                    </DropdownMenuItem>
                  )}
                  {onSetDefault && !address.isDefault && (
                    <DropdownMenuItem onClick={() => onSetDefault(address.id)}>
                      <Check className="w-4 h-4 mr-2" />
                      {t('address.setDefault') || 'Set as Default'}
                    </DropdownMenuItem>
                  )}
                  {onDelete && (
                    <DropdownMenuItem
                      onClick={() => onDelete(address.id)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      {t('common.delete') || 'Delete'}
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        );
      })}

      {/* 添加新地址按钮 */}
      {onAddNew && (
        <Button variant="outline" size="sm" className="w-full mt-2" onClick={onAddNew}>
          <Plus className="w-4 h-4 mr-1" />
          {t('checkout.addAddress') || 'Add Address'}
        </Button>
      )}
    </VStack>
  );
};

export default AddressSelector;
