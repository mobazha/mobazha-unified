'use client';

import React, { useState, useMemo } from 'react';
import { useI18n } from '@mobazha/core';
import type { Address } from '@mobazha/core';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { VStack } from '@/components/layouts';

export interface AddressFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (address: Address) => Promise<boolean>;
  address?: Address | null;
  isSaving?: boolean;
}

/**
 * 计算初始表单数据
 */
function getInitialFormData(address?: Address | null): Address {
  return {
    name: address?.name || '',
    company: address?.company || '',
    addressLineOne: address?.addressLineOne || '',
    addressLineTwo: address?.addressLineTwo || '',
    city: address?.city || '',
    state: address?.state || '',
    postalCode: address?.postalCode || '',
    country: address?.country || '',
    addressNotes: address?.addressNotes || '',
  };
}

/**
 * 内部表单组件 - 通过 key 重新挂载来重置状态
 */
interface AddressFormContentProps {
  address?: Address | null;
  onClose: () => void;
  onSave: (address: Address) => Promise<boolean>;
  isSaving: boolean;
}

const AddressFormContent: React.FC<AddressFormContentProps> = ({
  address,
  onClose,
  onSave,
  isSaving,
}) => {
  const { t } = useI18n();

  // 表单状态 - 直接使用 address 作为初始值
  const [formData, setFormData] = useState<Address>(() => getInitialFormData(address));
  const [errors, setErrors] = useState<Partial<Record<keyof Address, string>>>({});

  // 验证表单
  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof Address, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = t('address.nameRequired') || 'Name is required';
    }
    if (!formData.addressLineOne.trim()) {
      newErrors.addressLineOne = t('address.addressRequired') || 'Address is required';
    }
    if (!formData.city.trim()) {
      newErrors.city = t('address.cityRequired') || 'City is required';
    }
    if (!formData.country.trim()) {
      newErrors.country = t('address.countryRequired') || 'Country is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 处理输入变化
  const handleChange = (field: keyof Address, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // 清除该字段的错误
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  // 提交表单
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    const success = await onSave(formData);
    if (success) {
      onClose();
    }
  };

  const isEditing = !!address;

  return (
    <form onSubmit={handleSubmit}>
      <VStack gap="md" className="py-4">
        {/* 收件人姓名 */}
        <div className="space-y-1.5">
          <Label htmlFor="name">
            {t('address.name') || 'Recipient Name'} <span className="text-destructive">*</span>
          </Label>
          <Input
            id="name"
            value={formData.name}
            onChange={e => handleChange('name', e.target.value)}
            placeholder={t('address.namePlaceholder') || 'Enter recipient name'}
            className={errors.name ? 'border-destructive' : ''}
          />
          {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
        </div>

        {/* 公司（可选） */}
        <div className="space-y-1.5">
          <Label htmlFor="company">{t('address.company') || 'Company (Optional)'}</Label>
          <Input
            id="company"
            value={formData.company}
            onChange={e => handleChange('company', e.target.value)}
            placeholder={t('address.companyPlaceholder') || 'Enter company name'}
          />
        </div>

        {/* 地址行1 */}
        <div className="space-y-1.5">
          <Label htmlFor="addressLineOne">
            {t('address.addressLineOne') || 'Address Line 1'}{' '}
            <span className="text-destructive">*</span>
          </Label>
          <Input
            id="addressLineOne"
            value={formData.addressLineOne}
            onChange={e => handleChange('addressLineOne', e.target.value)}
            placeholder={t('address.addressLinePlaceholder') || 'Street address, P.O. box'}
            className={errors.addressLineOne ? 'border-destructive' : ''}
          />
          {errors.addressLineOne && (
            <p className="text-xs text-destructive">{errors.addressLineOne}</p>
          )}
        </div>

        {/* 地址行2（可选） */}
        <div className="space-y-1.5">
          <Label htmlFor="addressLineTwo">
            {t('address.addressLineTwo') || 'Address Line 2 (Optional)'}
          </Label>
          <Input
            id="addressLineTwo"
            value={formData.addressLineTwo}
            onChange={e => handleChange('addressLineTwo', e.target.value)}
            placeholder={
              t('address.addressLineTwoPlaceholder') || 'Apartment, suite, unit, building, floor'
            }
          />
        </div>

        {/* 城市和州/省 */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="city">
              {t('address.city') || 'City'} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="city"
              value={formData.city}
              onChange={e => handleChange('city', e.target.value)}
              placeholder={t('address.cityPlaceholder') || 'Enter city'}
              className={errors.city ? 'border-destructive' : ''}
            />
            {errors.city && <p className="text-xs text-destructive">{errors.city}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="state">{t('address.state') || 'State / Province'}</Label>
            <Input
              id="state"
              value={formData.state}
              onChange={e => handleChange('state', e.target.value)}
              placeholder={t('address.statePlaceholder') || 'Enter state'}
            />
          </div>
        </div>

        {/* 邮编和国家 */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="postalCode">{t('address.postalCode') || 'Postal Code'}</Label>
            <Input
              id="postalCode"
              value={formData.postalCode}
              onChange={e => handleChange('postalCode', e.target.value)}
              placeholder={t('address.postalCodePlaceholder') || 'Enter postal code'}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="country">
              {t('address.country') || 'Country'} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="country"
              value={formData.country}
              onChange={e => handleChange('country', e.target.value)}
              placeholder={t('address.countryPlaceholder') || 'Enter country'}
              className={errors.country ? 'border-destructive' : ''}
            />
            {errors.country && <p className="text-xs text-destructive">{errors.country}</p>}
          </div>
        </div>

        {/* 地址备注（可选） */}
        <div className="space-y-1.5">
          <Label htmlFor="addressNotes">
            {t('address.addressNotes') || 'Delivery Notes (Optional)'}
          </Label>
          <Textarea
            id="addressNotes"
            value={formData.addressNotes}
            onChange={e => handleChange('addressNotes', e.target.value)}
            placeholder={t('address.addressNotesPlaceholder') || 'Special delivery instructions...'}
            rows={2}
          />
        </div>
      </VStack>

      <DialogFooter className="gap-2 sm:gap-0">
        <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
          {t('common.cancel') || 'Cancel'}
        </Button>
        <Button type="submit" disabled={isSaving}>
          {isSaving
            ? t('common.saving') || 'Saving...'
            : isEditing
              ? t('common.save') || 'Save'
              : t('address.addAddress') || 'Add Address'}
        </Button>
      </DialogFooter>
    </form>
  );
};

/**
 * 地址编辑表单 Modal
 * 使用 key 来在 address 改变时重新挂载内部表单，避免在 effect 中调用 setState
 */
export const AddressFormModal: React.FC<AddressFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  address,
  isSaving = false,
}) => {
  const { t } = useI18n();

  // 使用 address 的 name 或 'new' 作为 key，当 address 改变时重新挂载表单
  const formKey = useMemo(
    () =>
      `${address?.name || 'new'}-${address?.addressLineOne || ''}-${isOpen ? 'open' : 'closed'}`,
    [address?.name, address?.addressLineOne, isOpen]
  );

  const isEditing = !!address;

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing
              ? t('address.editAddress') || 'Edit Address'
              : t('address.addAddress') || 'Add Address'}
          </DialogTitle>
        </DialogHeader>

        <AddressFormContent
          key={formKey}
          address={address}
          onClose={onClose}
          onSave={onSave}
          isSaving={isSaving}
        />
      </DialogContent>
    </Dialog>
  );
};

export default AddressFormModal;
