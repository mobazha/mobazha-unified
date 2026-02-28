'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe, type Stripe, type StripeElementsOptions } from '@stripe/stripe-js';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useI18n } from '@mobazha/core';
import type { StripeSessionData } from '@mobazha/core';

const stripePromiseCache: Record<string, Promise<Stripe | null>> = {};

function getStripePromise(publishableKey: string): Promise<Stripe | null> {
  if (!stripePromiseCache[publishableKey]) {
    stripePromiseCache[publishableKey] = loadStripe(publishableKey);
  }
  return stripePromiseCache[publishableKey];
}

interface StripeCheckoutFormProps {
  returnUrl: string;
  onSuccess: () => void;
  onError: (message: string) => void;
  disabled?: boolean;
}

const StripeCheckoutForm: React.FC<StripeCheckoutFormProps> = ({
  returnUrl,
  onSuccess,
  onError,
  disabled = false,
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const { t } = useI18n();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!stripe || !elements || isProcessing || disabled) return;

      setIsProcessing(true);

      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: { return_url: returnUrl },
        redirect: 'if_required',
      });

      if (error) {
        onError(error.message || t('fiat.genericError', { defaultValue: 'Payment failed' }));
        setIsProcessing(false);
      } else if (paymentIntent?.status === 'succeeded') {
        onSuccess();
      } else if (paymentIntent?.status === 'requires_action') {
        // 3DS/SCA is handled automatically by redirect: 'if_required'
        setIsProcessing(false);
      } else {
        setIsProcessing(false);
      }
    },
    [stripe, elements, isProcessing, disabled, returnUrl, onError, onSuccess, t]
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement
        options={{
          layout: 'tabs',
          wallets: { applePay: 'auto', googlePay: 'auto' },
        }}
      />
      <button
        type="submit"
        disabled={!stripe || isProcessing || disabled}
        className={cn(
          'w-full flex items-center justify-center gap-2 h-12 rounded-xl',
          'bg-primary text-primary-foreground font-medium text-base',
          'transition-all duration-200',
          'active:scale-[0.98]',
          (!stripe || isProcessing || disabled) && 'opacity-50 cursor-not-allowed'
        )}
      >
        {isProcessing && <Loader2 className="w-4 h-4 animate-spin" />}
        {isProcessing
          ? t('fiat.processing', { defaultValue: 'Processing...' })
          : t('fiat.payNow', { defaultValue: 'Pay Now' })}
      </button>
    </form>
  );
};

export interface StripePaymentFormProps {
  sessionData: StripeSessionData;
  onSuccess: () => void;
  onError: (message: string) => void;
  returnUrl: string;
  disabled?: boolean;
  className?: string;
}

export const StripePaymentForm: React.FC<StripePaymentFormProps> = ({
  sessionData,
  onSuccess,
  onError,
  returnUrl,
  disabled = false,
  className,
}) => {
  const { t } = useI18n();
  const [stripeReady, setStripeReady] = useState(false);
  const [loadError, setLoadError] = useState<string>();

  const stripePromise = getStripePromise(sessionData.publishableKey);

  useEffect(() => {
    stripePromise
      .then(instance => {
        if (instance) {
          setStripeReady(true);
        } else {
          setLoadError(t('fiat.stripeLoadFailed', { defaultValue: 'Failed to load payment form' }));
        }
      })
      .catch(() => {
        setLoadError(t('fiat.stripeLoadFailed', { defaultValue: 'Failed to load payment form' }));
      });
  }, [stripePromise, t]);

  if (loadError) {
    return (
      <div className={cn('p-4 text-center text-destructive text-sm', className)}>{loadError}</div>
    );
  }

  if (!stripeReady) {
    return (
      <div className={cn('flex items-center justify-center py-8', className)}>
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isDark =
    typeof window !== 'undefined' && document.documentElement.classList.contains('dark');

  const options: StripeElementsOptions = {
    clientSecret: sessionData.clientSecret,
    appearance: {
      theme: isDark ? 'night' : 'stripe',
      variables: {
        colorPrimary: 'hsl(var(--primary))',
        borderRadius: '8px',
      },
    },
  };

  return (
    <div className={className}>
      <Elements stripe={stripePromise} options={options}>
        <StripeCheckoutForm
          returnUrl={returnUrl}
          onSuccess={onSuccess}
          onError={onError}
          disabled={disabled}
        />
      </Elements>
    </div>
  );
};

export default StripePaymentForm;
