'use client';

import React, { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui';
import { useI18n } from '@mobazha/core';

const REFUND_REASONS = [
  { value: 'requested_by_customer', labelKey: 'order.fiatRefund.reasons.requestedByCustomer' },
  { value: 'duplicate', labelKey: 'order.fiatRefund.reasons.duplicate' },
  { value: 'fraudulent', labelKey: 'order.fiatRefund.reasons.fraudulent' },
] as const;

export interface FiatRefundParams {
  amount?: number;
  currency?: string;
  reason?: string;
}

export interface FiatRefundDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (params: FiatRefundParams) => void;
  isLoading?: boolean;
  totalAmount: string;
  currency: string;
}

export const FiatRefundDialog: React.FC<FiatRefundDialogProps> = ({
  open,
  onOpenChange,
  onConfirm,
  isLoading = false,
  totalAmount,
  currency,
}) => {
  const { t } = useI18n();
  const [isPartial, setIsPartial] = useState(false);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('requested_by_customer');

  const maxAmount = parseFloat(totalAmount) || 0;
  const enteredAmount = parseFloat(amount) || 0;
  const isAmountOverMax = isPartial && enteredAmount > maxAmount;

  const handleConfirm = () => {
    const params: FiatRefundParams = { reason };
    if (isPartial && amount) {
      const cents = Math.round(enteredAmount * 100);
      if (cents > 0) {
        params.amount = cents;
        params.currency = currency.toLowerCase();
      }
    }
    onConfirm(params);
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setIsPartial(false);
      setAmount('');
      setReason('requested_by_customer');
    }
    onOpenChange(isOpen);
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>{t('order.fiatRefund.title')}</AlertDialogTitle>
          <AlertDialogDescription>{t('order.fiatRefund.description')}</AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-2">
          {/* Full / Partial toggle */}
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={!isPartial}
                onChange={() => setIsPartial(false)}
                className="accent-primary"
              />
              <span className="text-sm">
                {t('order.fiatRefund.fullRefund')} ({totalAmount} {currency})
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={isPartial}
                onChange={() => setIsPartial(true)}
                className="accent-primary"
              />
              <span className="text-sm">{t('order.fiatRefund.partialRefund')}</span>
            </label>
          </div>

          {/* Amount input for partial */}
          {isPartial && (
            <div>
              <label className="text-sm text-muted-foreground block mb-1">
                {t('order.fiatRefund.amount')} ({currency})
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={maxAmount > 0 ? maxAmount : undefined}
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder={t('order.fiatRefund.amountPlaceholder', { defaultValue: '0.00' })}
                className={`w-full px-3 py-2 border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 ${isAmountOverMax ? 'border-error' : 'border-input'}`}
              />
              {isAmountOverMax && (
                <p className="text-xs text-error mt-1">
                  {t('order.fiatRefund.amount')} ≤ {totalAmount} {currency}
                </p>
              )}
            </div>
          )}

          {/* Reason selector */}
          <div>
            <label className="text-sm text-muted-foreground block mb-1">
              {t('order.fiatRefund.reason')}
            </label>
            <select
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {REFUND_REASONS.map(r => (
                <option key={r.value} value={r.value}>
                  {t(r.labelKey)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>{t('common.cancel')}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={
              isLoading ||
              (isPartial && (enteredAmount <= 0 || isNaN(enteredAmount))) ||
              isAmountOverMax
            }
          >
            {isLoading ? t('common.processing') : t('order.actions.refund')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default FiatRefundDialog;
