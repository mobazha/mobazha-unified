'use client';

import React from 'react';
import { MapPin, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useI18n } from '@mobazha/core';

export interface Address {
  id: string;
  name: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string;
  isDefault?: boolean;
}

export interface AddressSummaryProps {
  address?: Address;
  onEdit: () => void;
  disabled?: boolean;
  className?: string;
}

/**
 * AddressSummary 组件 - 显示选中地址摘要
 *
 * 只显示一行地址信息 + 更改按钮，节省空间
 */
export const AddressSummary: React.FC<AddressSummaryProps> = ({
  address,
  onEdit,
  disabled = false,
  className,
}) => {
  const { t } = useI18n();

  // 格式化地址为一行
  const formatAddressLine = (addr: Address) => {
    return `${addr.name}, ${addr.street}, ${addr.city}, ${addr.state} ${addr.postalCode}`;
  };

  return (
    <button
      type="button"
      onClick={onEdit}
      disabled={disabled}
      className={cn(
        'flex items-center justify-between w-full p-3 rounded-lg',
        'border border-border bg-surface',
        'hover:bg-muted/50 transition-colors',
        'text-left',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* 图标 */}
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
          <MapPin className="w-4 h-4 text-primary" />
        </div>

        {/* 地址信息 */}
        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-xs text-muted-foreground">{t('checkout.shippingAddress')}</span>
          {address ? (
            <span className="font-medium text-foreground text-sm truncate">
              {formatAddressLine(address)}
            </span>
          ) : (
            <span className="text-muted-foreground text-sm">{t('checkout.selectAddress')}</span>
          )}
        </div>
      </div>

      {/* 更改按钮 */}
      <div className="flex items-center gap-1 text-primary flex-shrink-0 ml-2">
        <Pencil className="w-3.5 h-3.5" />
        <span className="text-sm">{t('common.edit')}</span>
      </div>
    </button>
  );
};

export default AddressSummary;
