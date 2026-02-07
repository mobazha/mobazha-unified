'use client';

import React from 'react';
import { useI18n } from '@mobazha/core';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { AddressSelector } from './AddressSelector';
import type { Address } from './AddressSummary';

export interface AddressDrawerProps {
  isOpen: boolean;
  onClose: () => void;
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
 * AddressDrawer 组件 - 地址选择抽屉
 *
 * 在桌面端使用 Sheet 组件显示地址选择列表
 */
export const AddressDrawer: React.FC<AddressDrawerProps> = ({
  isOpen,
  onClose,
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

  const handleSelect = (addressId: string) => {
    onSelect(addressId);
    onClose();
  };

  return (
    <Sheet open={isOpen} onOpenChange={open => !open && onClose()}>
      <SheetContent side="right" className={cn('w-full sm:max-w-md', className)}>
        <SheetHeader>
          <SheetTitle>{t('checkout.selectAddress')}</SheetTitle>
          <SheetDescription>{t('checkout.selectAddressDesc')}</SheetDescription>
        </SheetHeader>

        <div className="mt-6">
          <AddressSelector
            addresses={addresses}
            selectedAddressId={selectedAddressId}
            onSelect={handleSelect}
            onAddNew={onAddNew}
            onEdit={onEdit}
            onDelete={onDelete}
            onSetDefault={onSetDefault}
            isLoading={isLoading}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default AddressDrawer;
