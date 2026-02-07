'use client';

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useI18n, generateId } from '@mobazha/core';
import type { ShippingLocation } from '@mobazha/core';
import { X } from 'lucide-react';
import { VStack, HStack } from '@/components/layouts';

export interface ShippingLocationFormProps {
  location?: ShippingLocation | null;
  onSave: (location: ShippingLocation) => Promise<boolean>;
  onCancel: () => void;
  isSaving?: boolean;
  showDefaultOption?: boolean;
}

/**
 * 发货地点表单组件
 * 用于创建和编辑发货地点
 */
export function ShippingLocationForm({
  location,
  onSave,
  onCancel,
  isSaving = false,
  showDefaultOption = true,
}: ShippingLocationFormProps) {
  const { t } = useI18n();

  // 表单状态
  const [name, setName] = useState(location?.name || '');
  const [address, setAddress] = useState(location?.address || '');
  const [isDefault, setIsDefault] = useState(location?.isDefault || false);

  // 保存
  const handleSave = useCallback(async () => {
    if (!name.trim()) return;

    const locationData: ShippingLocation = {
      id: location?.id || generateId(),
      name: name.trim(),
      address: address.trim() || undefined,
      isDefault,
    };

    await onSave(locationData);
  }, [location, name, address, isDefault, onSave]);

  const isValid = name.trim().length > 0;

  return (
    <VStack gap="lg" className="p-4">
      {/* 头部 */}
      <HStack justify="between" align="center">
        <h3 className="text-lg font-semibold">
          {location ? t('shipping.editLocation') : t('shipping.addLocation')}
        </h3>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          <X className="w-4 h-4" />
        </Button>
      </HStack>

      {/* 地点名称 */}
      <div className="space-y-1.5">
        <Label htmlFor="location-name">{t('shipping.locationName')} *</Label>
        <Input
          id="location-name"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder={t('shipping.locationNamePlaceholder')}
        />
      </div>

      {/* 地址 */}
      <div className="space-y-1.5">
        <Label htmlFor="location-address">{t('shipping.locationAddress')}</Label>
        <Textarea
          id="location-address"
          value={address}
          onChange={e => setAddress(e.target.value)}
          placeholder={t('shipping.locationAddressPlaceholder')}
          rows={3}
        />
        <p className="text-xs text-muted-foreground">{t('shipping.locationAddressHint')}</p>
      </div>

      {/* 设为默认 */}
      {showDefaultOption && !location?.isDefault && (
        <HStack gap="sm" align="center">
          <Checkbox
            id="location-default"
            checked={isDefault}
            onCheckedChange={checked => setIsDefault(checked === true)}
          />
          <Label htmlFor="location-default" className="cursor-pointer">
            {t('shipping.setAsDefaultLocation')}
          </Label>
        </HStack>
      )}

      {/* 操作按钮 */}
      <HStack justify="end" gap="sm" className="pt-4 border-t">
        <Button variant="outline" onClick={onCancel} disabled={isSaving}>
          {t('common.cancel')}
        </Button>
        <Button onClick={handleSave} disabled={isSaving || !isValid}>
          {isSaving ? t('common.saving') : t('common.save')}
        </Button>
      </HStack>
    </VStack>
  );
}

export default ShippingLocationForm;
