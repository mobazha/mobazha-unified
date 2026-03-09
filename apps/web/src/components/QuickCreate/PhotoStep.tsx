'use client';

import React from 'react';
import { useI18n } from '@mobazha/core';
import type { ContractType, Image } from '@mobazha/core';
import { MediaSection } from '@/components/Listing/MediaSection';
import { ProductTypeSelector } from '@/components/Listing/ProductTypeSelector';

interface PhotoStepProps {
  images: Image[];
  contractType: ContractType;
  onImagesChange: (images: Image[]) => void;
  onContractTypeChange: (type: ContractType) => void;
}

export function PhotoStep({
  images,
  contractType,
  onImagesChange,
  onContractTypeChange,
}: PhotoStepProps) {
  const { t } = useI18n();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-1">
          {t('listing.quickCreate.uploadPhotos')}
        </h2>
        <p className="text-sm text-muted-foreground">{t('listing.quickCreate.uploadPhotosDesc')}</p>
      </div>

      <MediaSection images={images} onImagesChange={onImagesChange} maxImages={10} />

      <div>
        <h3 className="text-sm font-medium text-foreground mb-3">
          {t('listing.quickCreate.selectType')}
        </h3>
        <ProductTypeSelector value={contractType} onChange={onContractTypeChange} />
      </div>
    </div>
  );
}
