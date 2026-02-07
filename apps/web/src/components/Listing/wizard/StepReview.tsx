'use client';

import React from 'react';
import { ArrowLeft, Check, Package, FileDigit, Briefcase, Coins, Loader2 } from 'lucide-react';
import { useI18n } from '@mobazha/core';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SelectedAssetDetail } from '@/components/RwaToken';
import type { StepProps } from './types';

/**
 * 步骤5：确认发布
 */
export function StepReview({ formData, onPrev, onNext, isSubmitting }: StepProps) {
  const { t } = useI18n();

  const getTypeIcon = () => {
    switch (formData.contractType) {
      case 'PHYSICAL_GOOD':
        return <Package className="w-5 h-5" />;
      case 'DIGITAL_GOOD':
        return <FileDigit className="w-5 h-5" />;
      case 'SERVICE':
        return <Briefcase className="w-5 h-5" />;
      case 'RWA_TOKEN':
        return <Coins className="w-5 h-5" />;
      default:
        return null;
    }
  };

  const getTypeName = () => {
    switch (formData.contractType) {
      case 'PHYSICAL_GOOD':
        return t('listing.types.physicalGood');
      case 'DIGITAL_GOOD':
        return t('listing.types.digitalGood');
      case 'SERVICE':
        return t('listing.types.service');
      case 'RWA_TOKEN':
        return t('listing.types.rwaToken');
      default:
        return '';
    }
  };

  return (
    <div className="space-y-8">
      {/* 标题 */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground mb-2">{t('listing.wizard.review')}</h2>
        <p className="text-muted-foreground">{t('listing.wizard.reviewDesc')}</p>
      </div>

      {/* 商品预览 */}
      <Card className="p-6 space-y-6">
        {/* 商品类型 */}
        <div className="flex items-center gap-3 pb-4 border-b border-border">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">{getTypeIcon()}</div>
          <div>
            <p className="text-sm text-muted-foreground">{t('listing.productType')}</p>
            <p className="font-semibold">{getTypeName()}</p>
          </div>
        </div>

        {/* 图片预览 */}
        {formData.images.length > 0 && (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {formData.images.slice(0, 5).map((image, index) => (
              <div
                key={index}
                className="w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-muted"
              >
                <img
                  src={
                    typeof image === 'string'
                      ? image
                      : image.medium || image.small || image.large || image.original
                  }
                  alt={`Preview ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
            {formData.images.length > 5 && (
              <div className="w-24 h-24 flex-shrink-0 rounded-lg bg-muted flex items-center justify-center">
                <span className="text-muted-foreground">+{formData.images.length - 5}</span>
              </div>
            )}
          </div>
        )}

        {/* 基本信息 */}
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">{t('listing.title')}</p>
            <p className="font-semibold text-lg">{formData.title}</p>
          </div>

          <div>
            <p className="text-sm text-muted-foreground mb-1">{t('listing.price')}</p>
            <p className="font-semibold text-2xl text-primary">
              {formData.price} {formData.pricingCurrency}
            </p>
          </div>

          {formData.description && (
            <div>
              <p className="text-sm text-muted-foreground mb-1">{t('listing.description')}</p>
              <p className="text-sm line-clamp-3">{formData.description}</p>
            </div>
          )}
        </div>

        {/* RWA 资产详情 */}
        {formData.contractType === 'RWA_TOKEN' && formData.selectedAsset && (
          <SelectedAssetDetail asset={formData.selectedAsset} />
        )}

        {/* RWA 自定义资产信息 */}
        {formData.contractType === 'RWA_TOKEN' &&
          !formData.selectedAsset &&
          formData.tokenAddress && (
            <div className="p-4 bg-muted/50 rounded-lg space-y-2">
              <h4 className="font-medium">{t('listing.rwa.customAsset')}</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Token 标准:</span>
                  <span className="ml-2 font-medium">{formData.tokenStandard}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Token ID:</span>
                  <span className="ml-2 font-medium">{formData.tokenId}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">合约地址:</span>
                  <span className="ml-2 font-mono text-xs">{formData.tokenAddress}</span>
                </div>
              </div>
            </div>
          )}
      </Card>

      {/* 导航按钮 */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onPrev} disabled={isSubmitting}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t('common.prev')}
        </Button>
        <Button onClick={onNext} disabled={isSubmitting} size="lg">
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {t('common.publishing')}
            </>
          ) : (
            <>
              <Check className="w-4 h-4 mr-2" />
              {t('listing.wizard.publish')}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

export default StepReview;
