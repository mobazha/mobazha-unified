'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle } from 'lucide-react';
import { useI18n, productsApi } from '@mobazha/core';
import { useToast } from '@/components/ui';
import { cn } from '@/lib/utils';

import { StepProductType } from './StepProductType';
import { StepRwaAssetSelect } from './StepRwaAssetSelect';
import { StepBasicInfo } from './StepBasicInfo';
import { StepMedia } from './StepMedia';
import { StepReview } from './StepReview';
import type { WizardFormData, WizardStep, WizardStepId } from './types';
import { defaultFormData } from './types';

/**
 * 步骤定义
 */
const steps: WizardStep[] = [
  {
    id: 'type',
    title: '商品类型',
    titleKey: 'listing.wizard.steps.type',
  },
  {
    id: 'asset',
    title: '选择资产',
    titleKey: 'listing.wizard.steps.asset',
    // 仅在选择 RWA_TOKEN 且不是 CUSTOM 模式时显示
    condition: data => data.contractType === 'RWA_TOKEN' && data.rwaAssetType !== 'CUSTOM',
  },
  {
    id: 'basic',
    title: '基本信息',
    titleKey: 'listing.wizard.steps.basic',
  },
  {
    id: 'media',
    title: '图片视频',
    titleKey: 'listing.wizard.steps.media',
  },
  {
    id: 'review',
    title: '确认发布',
    titleKey: 'listing.wizard.steps.review',
  },
];

export interface CreateListingWizardProps {
  initialData?: Partial<WizardFormData>;
  onSuccess?: (slug: string) => void;
  className?: string;
}

/**
 * 向导式商品创建容器
 */
export function CreateListingWizard({
  initialData,
  onSuccess,
  className = '',
}: CreateListingWizardProps) {
  const router = useRouter();
  const { t } = useI18n();
  const { toast } = useToast();

  // 表单数据
  const [formData, setFormData] = useState<WizardFormData>({
    ...defaultFormData,
    ...initialData,
  });

  // 当前步骤索引
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // 提交状态
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 错误信息
  const [errors, setErrors] = useState<Partial<Record<keyof WizardFormData, string>>>({});

  // 根据条件过滤可见步骤
  const visibleSteps = useMemo(() => {
    return steps.filter(step => !step.condition || step.condition(formData));
  }, [formData]);

  // 当前步骤
  const currentStep = visibleSteps[currentStepIndex];

  // 更新单个字段
  const updateField = useCallback(
    <K extends keyof WizardFormData>(key: K, value: WizardFormData[K]) => {
      setFormData(prev => ({ ...prev, [key]: value }));
      // 清除该字段的错误
      setErrors(prev => ({ ...prev, [key]: undefined }));
    },
    []
  );

  // 批量更新字段
  const updateFields = useCallback((fields: Partial<WizardFormData>) => {
    setFormData(prev => ({ ...prev, ...fields }));
    // 清除相关字段的错误
    setErrors(prev => {
      const newErrors = { ...prev };
      Object.keys(fields).forEach(key => {
        delete newErrors[key as keyof WizardFormData];
      });
      return newErrors;
    });
  }, []);

  // 验证当前步骤
  const validateCurrentStep = useCallback((): boolean => {
    const newErrors: Partial<Record<keyof WizardFormData, string>> = {};

    switch (currentStep?.id) {
      case 'type':
        if (!formData.contractType) {
          newErrors.contractType = t('validation.required') || '必填';
        }
        if (formData.contractType === 'RWA_TOKEN' && !formData.rwaAssetType) {
          // 不报错，让用户选择
        }
        break;

      case 'asset':
        if (formData.rwaAssetType !== 'CUSTOM' && !formData.selectedAsset) {
          // 预定义模式需要选择资产
        }
        if (formData.rwaAssetType === 'CUSTOM') {
          if (!formData.tokenStandard) {
            newErrors.tokenStandard = t('validation.required') || 'Token 标准必填';
          }
          if (!formData.tokenAddress) {
            newErrors.tokenAddress = t('validation.required') || '合约地址必填';
          }
          if (!formData.tokenId) {
            newErrors.tokenId = t('validation.required') || 'Token ID 必填';
          }
        }
        break;

      case 'basic':
        if (!formData.title.trim()) {
          newErrors.title = t('validation.titleRequired') || '标题必填';
        }
        if (!formData.price) {
          newErrors.price = t('validation.priceRequired') || '价格必填';
        }
        break;

      case 'media':
        // 媒体是可选的
        break;

      case 'review':
        // 最终检查
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [currentStep, formData, t]);

  // 下一步
  const handleNext = useCallback(async () => {
    if (!validateCurrentStep()) {
      return;
    }

    if (currentStepIndex < visibleSteps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      // 最后一步，提交表单
      await handleSubmit();
    }
  }, [currentStepIndex, visibleSteps.length, validateCurrentStep]);

  // 上一步
  const handlePrev = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  }, [currentStepIndex]);

  // 提交表单
  const handleSubmit = useCallback(async () => {
    try {
      setIsSubmitting(true);

      // 构建商品数据 (使用 Partial<Product> 类型)
      const listingData: Record<string, unknown> = {
        metadata: {
          contractType: formData.contractType,
          pricingCurrency: { code: formData.pricingCurrency },
          acceptedCurrencies: formData.acceptedCurrencies.map(code => ({
            code,
          })),
        },
        item: {
          title: formData.title,
          description: formData.description,
          price: parseFloat(formData.price) || 0,
          images: formData.images,
          tags: formData.tags,
          categories: formData.categories,
          condition: formData.condition,
          grams: formData.grams,
          nsfw: formData.nsfw,
          // RWA 相关
          blockchain: formData.blockchain,
          tokenAddress: formData.tokenAddress,
          tokenStandard: formData.tokenStandard,
          tokenId: formData.tokenId,
          slotId: formData.slotId,
          cryptoListingCurrencyCode: formData.cryptoListingCurrencyCode,
        },
        shippingOptions: formData.shippingOptions,
        termsAndConditions: formData.termsAndConditions,
        refundPolicy: formData.refundPolicy,
      };

      // 调用 API 创建商品
      const result = await productsApi.createListing(listingData);

      // 检查返回结果
      if ('error' in result) {
        throw new Error(result.error);
      }

      toast({
        title: t('common.success') || '成功',
        description: t('listing.createSuccess') || '商品创建成功',
      });

      // 回调或跳转
      const slug = result.slug || '';
      if (onSuccess) {
        onSuccess(slug);
      } else if (slug) {
        router.push(`/product/${slug}`);
      } else {
        router.push('/settings/store');
      }
    } catch (error) {
      console.error('创建商品失败:', error);
      toast({
        title: t('common.error') || '错误',
        description:
          error instanceof Error ? error.message : t('listing.createFailed') || '创建失败',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, router, toast, t, onSuccess]);

  // 跳转到指定步骤
  const goToStep = useCallback(
    (index: number) => {
      // 只能跳转到已完成的步骤或当前步骤
      if (index <= currentStepIndex) {
        setCurrentStepIndex(index);
      }
    },
    [currentStepIndex]
  );

  // 渲染步骤内容
  const renderStepContent = () => {
    const stepProps = {
      formData,
      updateField,
      updateFields,
      errors,
      onNext: handleNext,
      onPrev: handlePrev,
      isSubmitting,
    };

    switch (currentStep?.id) {
      case 'type':
        return <StepProductType {...stepProps} />;
      case 'asset':
        return <StepRwaAssetSelect {...stepProps} />;
      case 'basic':
        return <StepBasicInfo {...stepProps} />;
      case 'media':
        return <StepMedia {...stepProps} />;
      case 'review':
        return <StepReview {...stepProps} />;
      default:
        return null;
    }
  };

  return (
    <div className={cn('max-w-4xl mx-auto', className)}>
      {/* 步骤指示器 */}
      <div className="mb-8">
        <div className="flex items-center justify-center">
          {visibleSteps.map((step, index) => {
            const isActive = index === currentStepIndex;
            const isCompleted = index < currentStepIndex;

            return (
              <React.Fragment key={step.id}>
                {/* 步骤圆点 */}
                <button
                  type="button"
                  onClick={() => goToStep(index)}
                  disabled={index > currentStepIndex}
                  className={cn(
                    'flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all',
                    isActive
                      ? 'border-primary bg-primary text-primary-foreground'
                      : isCompleted
                        ? 'border-primary bg-primary/10 text-primary cursor-pointer'
                        : 'border-muted bg-muted text-muted-foreground cursor-not-allowed'
                  )}
                >
                  {isCompleted ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <span className="text-sm font-medium">{index + 1}</span>
                  )}
                </button>

                {/* 连接线 */}
                {index < visibleSteps.length - 1 && (
                  <div
                    className={cn(
                      'w-16 h-0.5 mx-2',
                      index < currentStepIndex ? 'bg-primary' : 'bg-muted'
                    )}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* 步骤名称 */}
        <div className="flex justify-center mt-3">
          <p className="text-sm text-muted-foreground">
            {t(currentStep?.titleKey || '') || currentStep?.title}
          </p>
        </div>
      </div>

      {/* 步骤内容 */}
      <div className="bg-background rounded-2xl p-6 lg:p-8 shadow-sm border border-border">
        {renderStepContent()}
      </div>
    </div>
  );
}

export default CreateListingWizard;
