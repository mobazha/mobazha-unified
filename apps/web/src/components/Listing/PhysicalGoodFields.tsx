'use client';

import React, { useCallback } from 'react';
import type { ShippingProfile } from '@mobazha/core';
import { ShippingProfileSelector } from '@/components/Shipping';

interface PhysicalGoodFieldsProps {
  /** 选中的配送档案 */
  shippingProfile?: ShippingProfile;
  /** 配送档案变化回调 */
  onShippingProfileChange?: (profile: ShippingProfile | null) => void;
  /** 错误信息 */
  errors?: {
    shippingProfile?: string;
  };
  /** 自定义样式 */
  className?: string;
}

/**
 * 物理商品配送字段组件
 *
 * 支持配送档案模式（Shopify 风格）
 */
export function PhysicalGoodFields({
  shippingProfile,
  onShippingProfileChange,
  errors = {},
  className = '',
}: PhysicalGoodFieldsProps) {
  // 处理配送档案选择变化
  const handleProfileChange = useCallback(
    (profile: ShippingProfile | null) => {
      onShippingProfileChange?.(profile);
    },
    [onShippingProfileChange]
  );

  return (
    <ShippingProfileSelector
      selectedProfileId={shippingProfile?.profileId}
      onProfileChange={handleProfileChange}
      error={errors.shippingProfile}
      className={className}
    />
  );
}

export default PhysicalGoodFields;
