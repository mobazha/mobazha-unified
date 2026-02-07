'use client';

/**
 * ServiceEditor - 配送服务编辑器
 * 支持两种计费模板：
 * - FIRST_RENEWAL_FEE: 首重 + 续重费
 * - SAME_WEIGHT_SAME_FEE: 同重同价（按重量区间）
 */

import React, { useCallback } from 'react';
import { Trash2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useI18n, type ShippingServiceConfig } from '@mobazha/core';

type ServiceType = 'FIRST_RENEWAL_FEE' | 'SAME_WEIGHT_SAME_FEE';

interface ServiceEditorProps {
  service: ShippingServiceConfig;
  serviceType: ServiceType;
  currency: string;
  index: number;
  onChange: (service: ShippingServiceConfig) => void;
  onRemove?: () => void;
  disabled?: boolean;
  canRemove?: boolean;
}

export const ServiceEditor: React.FC<ServiceEditorProps> = ({
  service,
  serviceType,
  currency,
  index,
  onChange,
  onRemove,
  disabled = false,
  canRemove = true,
}) => {
  const { t } = useI18n();

  // 更新服务字段
  const updateField = useCallback(
    <K extends keyof ShippingServiceConfig>(field: K, value: ShippingServiceConfig[K]) => {
      onChange({ ...service, [field]: value });
    },
    [service, onChange]
  );

  // 更新数字字段
  const updateNumberField = useCallback(
    (field: 'startWeight' | 'endWeight' | 'firstWeight' | 'renewalUnitWeight', value: string) => {
      const numValue = parseFloat(value) || 0;
      updateField(field, numValue);
    },
    [updateField]
  );

  // 更新价格字段（保持字符串格式）
  const updatePriceField = useCallback(
    (field: 'firstFreight' | 'renewalUnitPrice' | 'registrationFee', value: string) => {
      updateField(field, value);
    },
    [updateField]
  );

  return (
    <Card className={cn('relative bg-muted/30', disabled && 'opacity-60')}>
      <CardHeader className="py-3 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GripVertical className="w-4 h-4 text-muted-foreground cursor-move" />
            <CardTitle className="text-sm font-medium">
              {t('shipping.service')} #{index + 1}
            </CardTitle>
          </div>
          {canRemove && onRemove && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRemove}
              disabled={disabled}
              className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              {t('common.delete')}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3 px-4 pb-4 pt-0">
        {/* 服务名称和预计送达 */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor={`service-name-${index}`} className="text-xs">
              {t('shipping.serviceName')}
            </Label>
            <Input
              id={`service-name-${index}`}
              value={service.name}
              onChange={e => updateField('name', e.target.value)}
              placeholder={t('shipping.serviceNamePlaceholder')}
              disabled={disabled}
              className="h-9"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`service-delivery-${index}`} className="text-xs">
              {t('shipping.estimatedDelivery')}
            </Label>
            <Input
              id={`service-delivery-${index}`}
              value={service.estimatedDelivery}
              onChange={e => updateField('estimatedDelivery', e.target.value)}
              placeholder={t('shipping.deliveryPlaceholder')}
              disabled={disabled}
              className="h-9"
            />
          </div>
        </div>

        {/* 根据计费类型显示不同的字段 */}
        {serviceType === 'FIRST_RENEWAL_FEE' ? (
          <FirstRenewalFeeFields
            service={service}
            currency={currency}
            index={index}
            disabled={disabled}
            updateNumberField={updateNumberField}
            updatePriceField={updatePriceField}
            t={t}
          />
        ) : (
          <SameWeightSameFeeFields
            service={service}
            currency={currency}
            index={index}
            disabled={disabled}
            updateNumberField={updateNumberField}
            updatePriceField={updatePriceField}
            t={t}
          />
        )}

        {/* 挂号费（可选）- 使用半宽保持视觉一致性 */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor={`service-registration-${index}`} className="text-xs">
              {t('shipping.registrationFee')} ({currency})
              <span className="text-muted-foreground ml-1">({t('common.optional')})</span>
            </Label>
            <Input
              id={`service-registration-${index}`}
              type="number"
              min="0"
              step="0.01"
              value={service.registrationFee}
              onChange={e => updatePriceField('registrationFee', e.target.value)}
              placeholder="0.00"
              disabled={disabled}
              className="h-9"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * 首重+续重费字段
 */
interface FeeFieldsProps {
  service: ShippingServiceConfig;
  currency: string;
  index: number;
  disabled: boolean;
  updateNumberField: (
    field: 'startWeight' | 'endWeight' | 'firstWeight' | 'renewalUnitWeight',
    value: string
  ) => void;
  updatePriceField: (
    field: 'firstFreight' | 'renewalUnitPrice' | 'registrationFee',
    value: string
  ) => void;
  t: (key: string) => string;
}

const FirstRenewalFeeFields: React.FC<FeeFieldsProps> = ({
  service,
  currency,
  index,
  disabled,
  updateNumberField,
  updatePriceField,
  t,
}) => (
  <>
    {/* 首重设置 */}
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-1.5">
        <Label htmlFor={`service-first-weight-${index}`} className="text-xs">
          {t('shipping.firstWeight')} (g)
        </Label>
        <Input
          id={`service-first-weight-${index}`}
          type="number"
          min="0"
          value={service.firstWeight}
          onChange={e => updateNumberField('firstWeight', e.target.value)}
          placeholder="1000"
          disabled={disabled}
          className="h-9"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`service-first-freight-${index}`} className="text-xs">
          {t('shipping.firstFreight')} ({currency})
        </Label>
        <Input
          id={`service-first-freight-${index}`}
          type="number"
          min="0"
          step="0.01"
          value={service.firstFreight}
          onChange={e => updatePriceField('firstFreight', e.target.value)}
          placeholder="10.00"
          disabled={disabled}
          className="h-9"
        />
      </div>
    </div>

    {/* 续重设置 */}
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-1.5">
        <Label htmlFor={`service-renewal-weight-${index}`} className="text-xs">
          {t('shipping.renewalUnitWeight')} (g)
        </Label>
        <Input
          id={`service-renewal-weight-${index}`}
          type="number"
          min="0"
          value={service.renewalUnitWeight}
          onChange={e => updateNumberField('renewalUnitWeight', e.target.value)}
          placeholder="500"
          disabled={disabled}
          className="h-9"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`service-renewal-price-${index}`} className="text-xs">
          {t('shipping.renewalUnitPrice')} ({currency})
        </Label>
        <Input
          id={`service-renewal-price-${index}`}
          type="number"
          min="0"
          step="0.01"
          value={service.renewalUnitPrice}
          onChange={e => updatePriceField('renewalUnitPrice', e.target.value)}
          placeholder="2.00"
          disabled={disabled}
          className="h-9"
        />
      </div>
    </div>
  </>
);

/**
 * 同重同价字段（按重量区间定价）
 */
const SameWeightSameFeeFields: React.FC<FeeFieldsProps> = ({
  service,
  currency,
  index,
  disabled,
  updateNumberField,
  updatePriceField,
  t,
}) => (
  <>
    {/* 重量区间 */}
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-1.5">
        <Label htmlFor={`service-start-weight-${index}`} className="text-xs">
          {t('shipping.startWeight')} (g)
        </Label>
        <Input
          id={`service-start-weight-${index}`}
          type="number"
          min="0"
          value={service.startWeight}
          onChange={e => updateNumberField('startWeight', e.target.value)}
          placeholder="0"
          disabled={disabled}
          className="h-9"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`service-end-weight-${index}`} className="text-xs">
          {t('shipping.endWeight')} (g)
        </Label>
        <Input
          id={`service-end-weight-${index}`}
          type="number"
          min="0"
          value={service.endWeight}
          onChange={e => updateNumberField('endWeight', e.target.value)}
          placeholder="1000"
          disabled={disabled}
          className="h-9"
        />
      </div>
    </div>

    {/* 运费 - 使用半宽 */}
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-1.5">
        <Label htmlFor={`service-freight-${index}`} className="text-xs">
          {t('shipping.shippingFee')} ({currency})
        </Label>
        <Input
          id={`service-freight-${index}`}
          type="number"
          min="0"
          step="0.01"
          value={service.firstFreight}
          onChange={e => updatePriceField('firstFreight', e.target.value)}
          placeholder="10.00"
          disabled={disabled}
          className="h-9"
        />
      </div>
    </div>
  </>
);

export default ServiceEditor;
