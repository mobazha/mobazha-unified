'use client';

import React from 'react';
import type { Address } from '@mobazha/core';
import { useI18n } from '@mobazha/core';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { VStack } from '@/components/layouts';

export interface AddressFormFieldsProps {
  values: Address;
  onChange: (field: keyof Address, value: string) => void;
  errors?: Partial<Record<keyof Address, string>>;
  /** Extra fields rendered after "name" and before "addressLineOne" */
  extraFieldsAfterName?: React.ReactNode;
  /** Prefix for field id attributes to avoid collisions */
  idPrefix?: string;
  /** Show company field (default true) */
  showCompany?: boolean;
  /** Show addressLineTwo field (default true) */
  showAddressLineTwo?: boolean;
}

export function AddressFormFields({
  values,
  onChange,
  errors = {},
  extraFieldsAfterName,
  idPrefix = '',
  showCompany = true,
  showAddressLineTwo = true,
}: AddressFormFieldsProps) {
  const { t } = useI18n();
  const id = (field: string) => `${idPrefix}${field}`;

  return (
    <VStack gap="md">
      <div className="space-y-1.5">
        <Label htmlFor={id('name')}>
          {t('address.name')} <span className="text-destructive">*</span>
        </Label>
        <Input
          id={id('name')}
          value={values.name}
          onChange={e => onChange('name', e.target.value)}
          placeholder={t('address.namePlaceholder')}
          className={errors.name ? 'border-destructive' : ''}
        />
        {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
      </div>

      {extraFieldsAfterName}

      {showCompany && (
        <div className="space-y-1.5">
          <Label htmlFor={id('company')}>{t('address.company')}</Label>
          <Input
            id={id('company')}
            value={values.company || ''}
            onChange={e => onChange('company', e.target.value)}
            placeholder={t('address.companyPlaceholder')}
          />
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor={id('addressLineOne')}>
          {t('address.addressLineOne')} <span className="text-destructive">*</span>
        </Label>
        <Input
          id={id('addressLineOne')}
          value={values.addressLineOne}
          onChange={e => onChange('addressLineOne', e.target.value)}
          placeholder={t('address.addressLinePlaceholder')}
          className={errors.addressLineOne ? 'border-destructive' : ''}
        />
        {errors.addressLineOne && (
          <p className="text-xs text-destructive">{errors.addressLineOne}</p>
        )}
      </div>

      {showAddressLineTwo && (
        <div className="space-y-1.5">
          <Label htmlFor={id('addressLineTwo')}>{t('address.addressLineTwo')}</Label>
          <Input
            id={id('addressLineTwo')}
            value={values.addressLineTwo || ''}
            onChange={e => onChange('addressLineTwo', e.target.value)}
            placeholder={t('address.addressLineTwoPlaceholder')}
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor={id('city')}>
            {t('address.city')} <span className="text-destructive">*</span>
          </Label>
          <Input
            id={id('city')}
            value={values.city}
            onChange={e => onChange('city', e.target.value)}
            placeholder={t('address.cityPlaceholder')}
            className={errors.city ? 'border-destructive' : ''}
          />
          {errors.city && <p className="text-xs text-destructive">{errors.city}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={id('state')}>{t('address.state')}</Label>
          <Input
            id={id('state')}
            value={values.state}
            onChange={e => onChange('state', e.target.value)}
            placeholder={t('address.statePlaceholder')}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor={id('postalCode')}>{t('address.postalCode')}</Label>
          <Input
            id={id('postalCode')}
            value={values.postalCode}
            onChange={e => onChange('postalCode', e.target.value)}
            placeholder={t('address.postalCodePlaceholder')}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={id('country')}>
            {t('address.country')} <span className="text-destructive">*</span>
          </Label>
          <Input
            id={id('country')}
            value={values.country}
            onChange={e => onChange('country', e.target.value)}
            placeholder={t('address.countryPlaceholder')}
            className={errors.country ? 'border-destructive' : ''}
          />
          {errors.country && <p className="text-xs text-destructive">{errors.country}</p>}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={id('addressNotes')}>{t('address.addressNotes')}</Label>
        <Textarea
          id={id('addressNotes')}
          value={values.addressNotes || ''}
          onChange={e => onChange('addressNotes', e.target.value)}
          placeholder={t('address.addressNotesPlaceholder')}
          rows={2}
        />
      </div>
    </VStack>
  );
}
