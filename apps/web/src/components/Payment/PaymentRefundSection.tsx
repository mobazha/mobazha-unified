'use client';

import { useState } from 'react';
import { useI18n, truncateAddress } from '@mobazha/core';
import { RefundAddressField } from '@/components/Checkout/RefundAddressField';
import { Card, CardContent } from '@/components/ui/card';

interface PaymentRefundSectionProps {
  resolvedAddress?: string;
  refundAddress: string;
  onRefundAddressChange: (value: string) => void;
  payFromCustodial: boolean;
  onPayFromCustodialChange: (value: boolean) => void;
  /** True when refundAddress was pre-filled from account default or saved order snapshot. */
  refundAddressPrefilled?: boolean;
  saveAsDefault?: boolean;
  onSaveAsDefaultChange?: (value: boolean) => void;
  compact?: boolean;
}

export function PaymentRefundSection({
  resolvedAddress,
  refundAddress,
  onRefundAddressChange,
  payFromCustodial,
  onPayFromCustodialChange,
  refundAddressPrefilled = false,
  saveAsDefault = false,
  onSaveAsDefaultChange,
  compact = false,
}: PaymentRefundSectionProps) {
  const { t } = useI18n();
  const padding = compact ? 'p-4' : 'p-6';
  const trimmedResolved = resolvedAddress?.trim();
  const trimmedRefund = refundAddress.trim();
  const showResolvedDestination = Boolean(trimmedResolved) && !payFromCustodial;

  const [userEditingRefund, setUserEditingRefund] = useState(false);

  const isEditingRefund =
    payFromCustodial && (userEditingRefund || !(refundAddressPrefilled && trimmedRefund));

  const showConfirmNotice =
    payFromCustodial && trimmedRefund.length > 0 && refundAddressPrefilled && !isEditingRefund;

  const showRefundInput = payFromCustodial && !showConfirmNotice;

  return (
    <div className="space-y-4" data-testid="payment-refund-section">
      {showResolvedDestination && (
        <Card data-testid="payment-refund-destination">
          <CardContent className={padding}>
            <div className="space-y-2">
              <h2 className="text-base font-semibold text-foreground">
                {t('payment.refundDestination.title')}
              </h2>
              <p className="text-xs text-muted-foreground">{t('payment.refundDestination.desc')}</p>
              <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 font-mono text-sm text-foreground">
                {truncateAddress(trimmedResolved ?? '', 8, 6)}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card data-testid="payment-custodial-option">
        <CardContent className={padding}>
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary"
              checked={payFromCustodial}
              onChange={event => onPayFromCustodialChange(event.target.checked)}
              data-testid="payment-custodial-checkbox"
            />
            <span className="space-y-1">
              <span className="block text-sm font-medium text-foreground">
                {t('payment.custodialPayment.label')}
              </span>
              <span className="block text-xs text-muted-foreground">
                {t('payment.custodialPayment.desc')}
              </span>
            </span>
          </label>

          {showConfirmNotice && (
            <div
              className="mt-4 space-y-2 border-t border-border pt-4"
              data-testid="payment-custodial-refund-confirm"
            >
              <div className="rounded-lg border border-border bg-muted/30 px-3 py-3 space-y-2">
                <p className="text-sm text-foreground">
                  {t('payment.custodialPayment.confirmNotice', {
                    address: truncateAddress(trimmedRefund, 8, 6),
                  })}
                </p>
                <button
                  type="button"
                  className="text-xs font-medium text-primary hover:underline"
                  onClick={() => setUserEditingRefund(true)}
                  data-testid="payment-custodial-refund-change"
                >
                  {t('payment.custodialPayment.changeForOrder')}
                </button>
              </div>
            </div>
          )}

          {showRefundInput && (
            <div className="mt-4 border-t border-border pt-4 space-y-3">
              <RefundAddressField
                value={refundAddress}
                onChange={onRefundAddressChange}
                label={t('payment.custodialPayment.refundAddressLabel')}
                placeholder={t('payment.custodialPayment.refundAddressPlaceholder')}
                warning={
                  trimmedRefund ? undefined : t('payment.custodialPayment.refundAddressWarning')
                }
                warningVariant={trimmedRefund ? 'inline' : 'callout'}
                testId="payment-custodial-refund-address"
              />
              {trimmedRefund && onSaveAsDefaultChange && (
                <label className="flex cursor-pointer items-start gap-2">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary"
                    checked={saveAsDefault}
                    onChange={event => onSaveAsDefaultChange(event.target.checked)}
                    data-testid="payment-refund-save-as-default"
                  />
                  <span className="text-xs text-muted-foreground">
                    {t('payment.custodialPayment.saveAsDefault')}
                  </span>
                </label>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
