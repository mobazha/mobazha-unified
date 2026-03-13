'use client';

import React, { useState, useCallback } from 'react';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useI18n, fiatApi } from '@mobazha/core';
import type { PayPalSessionData, FiatProviderID } from '@mobazha/core';

export interface PayPalPaymentFormProps {
  sessionData: PayPalSessionData;
  vendorPeerID: string;
  currency?: string;
  onSuccess: () => void;
  onError: (message: string) => void;
  onCancel?: () => void;
  disabled?: boolean;
  className?: string;
}

export const PayPalPaymentForm: React.FC<PayPalPaymentFormProps> = ({
  sessionData,
  vendorPeerID,
  currency = 'USD',
  onSuccess,
  onError,
  onCancel,
  disabled = false,
  className,
}) => {
  const { t } = useI18n();
  const [sdkReady, setSdkReady] = useState(!!sessionData.clientID);
  const [isCapturing, setIsCapturing] = useState(false);

  const handleCreateOrder = useCallback(async (): Promise<string> => {
    return sessionData.orderID;
  }, [sessionData.orderID]);

  const handleApprove = useCallback(async () => {
    setIsCapturing(true);
    try {
      const result = await fiatApi.capturePayment(
        vendorPeerID,
        'paypal' as FiatProviderID,
        sessionData.orderID
      );
      if (result.status === 'succeeded') {
        onSuccess();
      } else {
        onError(
          t('fiat.captureFailed', {
            defaultValue: 'Payment capture failed. Please contact support.',
          })
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('fiat.genericError');
      onError(msg);
    } finally {
      setIsCapturing(false);
    }
  }, [sessionData.orderID, vendorPeerID, onSuccess, onError, t]);

  const handleError = useCallback(
    (err: Record<string, unknown>) => {
      const message = typeof err?.message === 'string' ? err.message : t('fiat.genericError');
      onError(message);
    },
    [onError, t]
  );

  const handleCancel = useCallback(() => {
    onCancel?.();
  }, [onCancel]);

  if (!sdkReady || isCapturing) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-8 gap-2', className)}>
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        {isCapturing && (
          <span className="text-sm text-muted-foreground">{t('fiat.processing')}</span>
        )}
      </div>
    );
  }

  return (
    <div className={className}>
      <PayPalScriptProvider
        options={{
          clientId: sessionData.clientID,
          currency,
          intent: 'capture',
        }}
        deferLoading={false}
      >
        <PayPalButtons
          style={{
            layout: 'vertical',
            color: 'blue',
            shape: 'rect',
            label: 'pay',
            height: 48,
          }}
          disabled={disabled || isCapturing}
          createOrder={handleCreateOrder}
          onApprove={handleApprove}
          onError={handleError}
          onCancel={handleCancel}
          onInit={() => setSdkReady(true)}
        />
      </PayPalScriptProvider>
    </div>
  );
};

export default PayPalPaymentForm;
