'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useI18n, useFiatPayment } from '@mobazha/core';
import type { FiatProviderID, CreateFiatPaymentParams } from '@mobazha/core';
import { StripePaymentForm } from './StripePaymentForm';
import type { FiatPaymentSuccessResult } from './StripePaymentForm';
import { PayPalPaymentForm } from './PayPalPaymentForm';

export interface FiatPaymentSectionProps {
  providerID: string;
  vendorPeerID: string;
  orderID: string;
  amount: number;
  currency: string;
  description?: string;
  returnUrl: string;
  cancelUrl?: string;
  onPaymentSuccess: (result: FiatPaymentSuccessResult) => void;
  onPaymentError?: (message: string) => void;
  /** When false, defers provider session creation until seller receipt is ready. */
  canCreateSession?: boolean;
  disabled?: boolean;
  className?: string;
}

export const FiatPaymentSection: React.FC<FiatPaymentSectionProps> = ({
  providerID,
  vendorPeerID,
  orderID,
  amount,
  currency,
  description,
  returnUrl,
  cancelUrl,
  onPaymentSuccess,
  onPaymentError,
  canCreateSession = true,
  disabled = false,
  className,
}) => {
  const { t } = useI18n();
  const { createSession, session, status, error, reset } = useFiatPayment();
  const [paymentDone, setPaymentDone] = useState(false);
  const [paymentError, setPaymentError] = useState<string>();
  const createdRef = useRef(false);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (createdRef.current || !canCreateSession || !orderID || !providerID || !vendorPeerID) {
      return;
    }
    createdRef.current = true;
    createSession(vendorPeerID, providerID as FiatProviderID, {
      providerID,
      orderID,
      amount,
      currency,
      description: description || '',
      returnURL: returnUrl,
      cancelURL: cancelUrl || returnUrl,
    } satisfies CreateFiatPaymentParams);
  }, [
    orderID,
    providerID,
    vendorPeerID,
    amount,
    currency,
    description,
    returnUrl,
    cancelUrl,
    createSession,
    canCreateSession,
    retryKey,
  ]);

  const handleSuccess = useCallback(
    (result: FiatPaymentSuccessResult) => {
      setPaymentDone(true);
      onPaymentSuccess(result);
    },
    [onPaymentSuccess]
  );

  const handleError = useCallback(
    (msg: string) => {
      setPaymentError(msg);
      onPaymentError?.(msg);
    },
    [onPaymentError]
  );

  const handleRetry = useCallback(() => {
    reset();
    createdRef.current = false;
    setPaymentDone(false);
    setPaymentError(undefined);
    setRetryKey(k => k + 1);
  }, [reset]);

  if (paymentDone) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-8 gap-3', className)}>
        <CheckCircle className="w-12 h-12 text-success" />
        <span className="text-base font-medium text-foreground">{t('fiat.success')}</span>
        <span className="text-sm text-muted-foreground">{t('fiat.paymentBeingConfirmed')}</span>
      </div>
    );
  }

  const displayError = paymentError || error;
  if (displayError || status === 'failed') {
    return (
      <div className={cn('flex flex-col items-center justify-center py-6 gap-3', className)}>
        <AlertCircle className="w-10 h-10 text-destructive" />
        <span className="text-sm text-destructive text-center px-4">
          {displayError || t('fiat.failed')}
        </span>
        <button
          type="button"
          onClick={handleRetry}
          className={cn(
            'px-6 py-2.5 rounded-xl text-sm font-medium',
            'bg-primary text-primary-foreground',
            'active:scale-[0.98] transition-all'
          )}
        >
          {t('fiat.retry')}
        </button>
      </div>
    );
  }

  if (status === 'pending' && session) {
    return (
      <div className={className}>
        {providerID === 'stripe' && session.stripe && (
          <StripePaymentForm
            sessionData={session.stripe}
            returnUrl={returnUrl}
            onSuccess={handleSuccess}
            onError={handleError}
            disabled={disabled}
          />
        )}
        {providerID === 'paypal' && session.paypal && (
          <PayPalPaymentForm
            sessionData={session.paypal}
            vendorPeerID={vendorPeerID}
            amount={amount}
            currency={currency}
            onSuccess={handleSuccess}
            onError={handleError}
            disabled={disabled}
          />
        )}
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col items-center justify-center py-8 gap-3', className)}>
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
      <span className="text-sm text-muted-foreground">{t('fiat.processing')}</span>
    </div>
  );
};

export default FiatPaymentSection;
