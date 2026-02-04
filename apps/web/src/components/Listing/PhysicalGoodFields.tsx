'use client';

import React, { useCallback } from 'react';
import type { ShippingOption, ShippingProfile } from '@mobazha/core';
import { ShippingProfileSelector } from '@/components/Shipping';

interface PhysicalGoodFieldsProps {
  /** 当前的配送选项（向后兼容） */
  shippingOptions: ShippingOption[];
  /** 选中的配送选项名称列表（向后兼容） */
  selectedShippingOptions: string[];
  /** 配送选项变化回调 */
  onShippingOptionsChange: (options: ShippingOption[]) => void;
  /** 选中的配送选项变化回调 */
  onSelectedShippingOptionsChange: (selected: string[]) => void;
  /** 配送档案 ID（新模式） */
  shippingProfileId?: string;
  /** 配送档案 ID 变化回调（新模式） */
  onShippingProfileIdChange?: (profileId: string) => void;
  /** 错误信息 */
  errors?: {
    shippingOptions?: string;
  };
  /** 自定义样式 */
  className?: string;
}

/**
 * 物理商品配送字段组件
 *
 * 支持两种模式：
 * 1. 配送档案模式（新）：选择预定义的配送档案
 * 2. 传统模式（向后兼容）：使用店铺全局运费选项
 */
export function PhysicalGoodFields({
  shippingOptions,
  onShippingOptionsChange,
  onSelectedShippingOptionsChange,
  shippingProfileId,
  onShippingProfileIdChange,
  errors = {},
  className = '',
}: PhysicalGoodFieldsProps) {
  // 处理配送档案选择变化
  const handleProfileChange = useCallback(
    (profile: ShippingProfile | null) => {
      if (profile) {
        // 更新配送档案 ID
        onShippingProfileIdChange?.(profile.profileId);
        // 同时更新配送选项（用于向后兼容和预览）
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const options = profile.options.map(opt => opt as any as ShippingOption);
        onShippingOptionsChange(options);
        onSelectedShippingOptionsChange(options.map(o => o.name));
      } else {
        onShippingProfileIdChange?.('');
        onShippingOptionsChange([]);
        onSelectedShippingOptionsChange([]);
      }
    },
    [onShippingProfileIdChange, onShippingOptionsChange, onSelectedShippingOptionsChange]
  );

  return (
    <ShippingProfileSelector
      selectedProfileId={shippingProfileId}
      onProfileChange={handleProfileChange}
      error={errors.shippingOptions}
      className={className}
    />
  );
}

export default PhysicalGoodFields;
