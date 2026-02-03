'use client';

/**
 * ShippingOptionForm - 配送选项完整表单
 * 用于创建和编辑配送选项
 */

import React, { useState, useCallback, useMemo } from 'react';
import { Plus, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import {
  useI18n,
  useLocalCurrency,
  FIAT_CURRENCIES,
  type ShippingOptionSetting,
  type ShippingServiceSetting,
} from '@mobazha/core';
import { RegionSelector } from './RegionSelector';
import { ServiceEditor } from './ServiceEditor';

// 配送类型选项
const SHIPPING_TYPES = [
  { value: 'FIXED_PRICE', label: 'Fixed Price Shipping' },
  { value: 'LOCAL_PICKUP', label: 'Local Pickup' },
] as const;

// 服务类型选项
const SERVICE_TYPES = [
  { value: 'FIRST_RENEWAL_FEE', label: 'First Weight + Renewal Fee' },
  { value: 'SAME_WEIGHT_SAME_FEE', label: 'Flat Rate by Weight Range' },
] as const;

// 创建空服务
const createEmptyService = (): ShippingServiceSetting => ({
  name: '',
  estimatedDelivery: '',
  startWeight: 0,
  endWeight: 0,
  firstWeight: 0,
  firstFreight: '0',
  renewalUnitWeight: 0,
  renewalUnitPrice: '0',
  registrationFee: '0',
});

// 创建空配送选项
const createEmptyOption = (currency: string): ShippingOptionSetting => ({
  name: '',
  type: 'FIXED_PRICE',
  currency,
  serviceType: 'SAME_WEIGHT_SAME_FEE',
  regions: [],
  services: [createEmptyService()],
});

interface ShippingOptionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialOption?: ShippingOptionSetting;
  onSave: (option: ShippingOptionSetting) => Promise<boolean>;
  mode?: 'create' | 'edit';
}

export const ShippingOptionForm: React.FC<ShippingOptionFormProps> = ({
  open,
  onOpenChange,
  initialOption,
  onSave,
  mode = 'create',
}) => {
  const { t } = useI18n();
  const { toast } = useToast();
  const { localCurrency } = useLocalCurrency();

  // 表单状态
  const [option, setOption] = useState<ShippingOptionSetting>(
    () => initialOption || createEmptyOption(localCurrency)
  );
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 重置表单
  const resetForm = useCallback(() => {
    setOption(initialOption || createEmptyOption(localCurrency));
    setErrors({});
  }, [initialOption, localCurrency]);

  // 当对话框打开时重置表单
  React.useEffect(() => {
    if (open) {
      resetForm();
    }
  }, [open, resetForm]);

  // 更新基本字段
  const updateField = useCallback(
    <K extends keyof ShippingOptionSetting>(field: K, value: ShippingOptionSetting[K]) => {
      setOption(prev => ({ ...prev, [field]: value }));
      // 清除对应的错误
      if (errors[field]) {
        setErrors(prev => {
          const next = { ...prev };
          delete next[field];
          return next;
        });
      }
    },
    [errors]
  );

  // 更新服务
  const updateService = useCallback((index: number, service: ShippingServiceSetting) => {
    setOption(prev => ({
      ...prev,
      services: prev.services.map((s, i) => (i === index ? service : s)),
    }));
  }, []);

  // 添加服务
  const addService = useCallback(() => {
    setOption(prev => ({
      ...prev,
      services: [...prev.services, createEmptyService()],
    }));
  }, []);

  // 移除服务
  const removeService = useCallback((index: number) => {
    setOption(prev => ({
      ...prev,
      services: prev.services.filter((_, i) => i !== index),
    }));
  }, []);

  // 验证表单
  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (!option.name.trim()) {
      newErrors.name = t('validation.required') || 'Required';
    }

    if (option.regions.length === 0) {
      newErrors.regions = t('shipping.selectAtLeastOneRegion') || 'Select at least one region';
    }

    if (option.services.length === 0) {
      newErrors.services = t('shipping.addAtLeastOneService') || 'Add at least one service';
    } else {
      // 验证每个服务
      option.services.forEach((service, index) => {
        if (!service.name.trim()) {
          newErrors[`service_${index}_name`] = t('validation.required') || 'Required';
        }
        const freight = parseFloat(service.firstFreight);
        if (isNaN(freight) || freight < 0) {
          newErrors[`service_${index}_freight`] = t('validation.invalidPrice') || 'Invalid price';
        }
      });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [option, t]);

  // 提交表单
  const handleSubmit = useCallback(async () => {
    if (!validateForm()) {
      toast({
        title: t('common.error') || 'Error',
        description: t('validation.fixErrors') || 'Please fix the errors below',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      const success = await onSave(option);
      if (success) {
        toast({
          title: t('common.success') || 'Success',
          description:
            mode === 'create'
              ? t('shipping.optionCreated') || 'Shipping option created'
              : t('shipping.optionUpdated') || 'Shipping option updated',
        });
        onOpenChange(false);
      }
    } catch (err) {
      console.error('Failed to save shipping option:', err);
      toast({
        title: t('common.error') || 'Error',
        description: (err as Error).message || t('common.unknownError') || 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  }, [validateForm, option, onSave, onOpenChange, toast, t, mode]);

  // 货币选项
  const currencyOptions = useMemo(
    () =>
      FIAT_CURRENCIES.map(c => ({
        value: c.code,
        label: `${c.code} - ${c.name}`,
      })),
    []
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create'
              ? t('shipping.createOption') || 'Create Shipping Option'
              : t('shipping.editOption') || 'Edit Shipping Option'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* 基本信息 */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">
              {t('shipping.basicInfo') || 'Basic Information'}
            </h3>

            {/* 名称 */}
            <div className="space-y-2">
              <Label htmlFor="option-name" className={cn(errors.name && 'text-destructive')}>
                {t('shipping.optionName') || 'Option Name'} *
              </Label>
              <Input
                id="option-name"
                value={option.name}
                onChange={e => updateField('name', e.target.value)}
                placeholder={t('shipping.optionNamePlaceholder') || 'e.g. Standard Shipping'}
                className={cn(errors.name && 'border-destructive')}
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>

            {/* 配送类型和货币 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('shipping.shippingType') || 'Shipping Type'}</Label>
                <Select
                  value={option.type}
                  onValueChange={v => updateField('type', v as 'FIXED_PRICE' | 'LOCAL_PICKUP')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SHIPPING_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {t(`shipping.type.${type.value}`) || type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t('shipping.currency') || 'Currency'}</Label>
                <Select value={option.currency} onValueChange={v => updateField('currency', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currencyOptions.map(c => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 计费模式 */}
            <div className="space-y-2">
              <Label>{t('shipping.pricingModel') || 'Pricing Model'}</Label>
              <Select
                value={option.serviceType}
                onValueChange={v =>
                  updateField('serviceType', v as 'FIRST_RENEWAL_FEE' | 'SAME_WEIGHT_SAME_FEE')
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SERVICE_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {t(`shipping.serviceType.${type.value}`) || type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {option.serviceType === 'FIRST_RENEWAL_FEE'
                  ? t('shipping.firstRenewalFeeDesc') ||
                    'Charge first weight fee + additional fee for each unit of extra weight'
                  : t('shipping.sameWeightSameFeeDesc') ||
                    'Charge a flat rate based on weight range'}
              </p>
            </div>
          </div>

          {/* 配送地区 */}
          <div className="space-y-4">
            <h3 className={cn('text-sm font-medium', errors.regions && 'text-destructive')}>
              {t('shipping.shippingRegions') || 'Shipping Regions'} *
            </h3>
            <RegionSelector
              value={option.regions}
              onChange={regions => updateField('regions', regions)}
            />
            {errors.regions && <p className="text-xs text-destructive">{errors.regions}</p>}
          </div>

          {/* 满额免邮设置 */}
          {option.type === 'FIXED_PRICE' && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium">
                {t('shipping.freeShipping') || 'Free Shipping'}
              </h3>
              <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                <div>
                  <p className="text-sm font-medium">
                    {t('shipping.enableFreeShipping') || 'Enable Free Shipping Threshold'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t('shipping.freeShippingDesc') ||
                      'Offer free shipping when order amount reaches minimum threshold'}
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={option.freeShippingThreshold?.enabled || false}
                  onChange={e =>
                    updateField('freeShippingThreshold', {
                      enabled: e.target.checked,
                      minAmount: option.freeShippingThreshold?.minAmount || '0',
                    })
                  }
                  className="w-5 h-5 rounded"
                />
              </div>

              {option.freeShippingThreshold?.enabled && (
                <div className="space-y-2 pl-4 border-l-2 border-primary/30">
                  <Label htmlFor="free-shipping-min">
                    {t('shipping.minAmountForFreeShipping') || 'Minimum Order Amount'} (
                    {option.currency})
                  </Label>
                  <Input
                    id="free-shipping-min"
                    type="number"
                    min="0"
                    step="0.01"
                    value={
                      option.freeShippingThreshold.minAmount === '0'
                        ? ''
                        : (parseInt(option.freeShippingThreshold.minAmount) / 100).toString()
                    }
                    onChange={e => {
                      const value = parseFloat(e.target.value) || 0;
                      // 转换为最小单位（分）
                      const minAmount = Math.round(value * 100).toString();
                      updateField('freeShippingThreshold', {
                        ...option.freeShippingThreshold!,
                        minAmount,
                      });
                    }}
                    placeholder="e.g. 50"
                    className="max-w-[200px]"
                  />
                  <p className="text-xs text-muted-foreground">
                    {t('shipping.freeShippingExample') ||
                      'Example: Order over $50 gets free shipping'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* 配送服务列表 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className={cn('text-sm font-medium', errors.services && 'text-destructive')}>
                {t('shipping.shippingServices') || 'Shipping Services'} *
              </h3>
              <Button variant="outline" size="sm" onClick={addService}>
                <Plus className="w-4 h-4 mr-1" />
                {t('shipping.addService') || 'Add Service'}
              </Button>
            </div>
            {errors.services && <p className="text-xs text-destructive">{errors.services}</p>}

            <div className="space-y-4">
              {option.services.map((service, index) => (
                <ServiceEditor
                  key={index}
                  service={service}
                  serviceType={option.serviceType}
                  currency={option.currency}
                  index={index}
                  onChange={s => updateService(index, s)}
                  onRemove={() => removeService(index)}
                  canRemove={option.services.length > 1}
                />
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            <X className="w-4 h-4 mr-1" />
            {t('common.cancel') || 'Cancel'}
          </Button>
          <Button onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
            ) : (
              <Save className="w-4 h-4 mr-1" />
            )}
            {mode === 'create'
              ? t('shipping.createOption') || 'Create'
              : t('common.save') || 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ShippingOptionForm;
