'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe, type Stripe, type StripeElementsOptions } from '@stripe/stripe-js';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useI18n } from '@mobazha/core';
import type { StripeSessionData } from '@mobazha/core';

const stripePromiseCache: Record<string, Promise<Stripe | null>> = {};

function getStripePromise(
  publishableKey: string,
  connectedAccountId?: string
): Promise<Stripe | null> {
  const cacheKey = connectedAccountId ? `${publishableKey}::${connectedAccountId}` : publishableKey;
  if (!stripePromiseCache[cacheKey]) {
    stripePromiseCache[cacheKey] = loadStripe(
      publishableKey,
      connectedAccountId ? { stripeAccount: connectedAccountId } : undefined
    );
  }
  return stripePromiseCache[cacheKey];
}

export interface FiatPaymentSuccessResult {
  transactionID: string;
  providerID: 'stripe' | 'paypal';
  amount: number;
  currency: string;
}

interface StripeCheckoutFormProps {
  returnUrl: string;
  onSuccess: (result: FiatPaymentSuccessResult) => void;
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
  const [elementReady, setElementReady] = useState(false);
  const [elementError, setElementError] = useState<string>();
  const [submitError, setSubmitError] = useState<string>();

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!stripe || !elements || !elementReady || isProcessing || disabled) return;

      setSubmitError(undefined);
      setIsProcessing(true);

      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: { return_url: returnUrl },
        redirect: 'if_required',
      });

      if (error) {
        const isUserFixable = error.type === 'card_error' || error.type === 'validation_error';
        const msg = error.message || t('fiat.genericError');
        if (isUserFixable) {
          setSubmitError(msg);
        } else {
          onError(msg);
        }
        setIsProcessing(false);
      } else if (paymentIntent?.status === 'succeeded') {
        onSuccess({
          transactionID: paymentIntent.id,
          providerID: 'stripe',
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
        });
      } else if (paymentIntent?.status === 'requires_action') {
        setIsProcessing(false);
      } else {
        setIsProcessing(false);
      }
    },
    [stripe, elements, elementReady, isProcessing, disabled, returnUrl, onError, onSuccess, t]
  );

  if (elementError) {
    return <div className="py-4 text-center text-destructive text-sm">{elementError}</div>;
  }

  const notReady = !stripe || !elementReady || isProcessing || disabled;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement
        onReady={() => setElementReady(true)}
        onLoadError={e => setElementError(e.error.message || 'Failed to load payment form')}
        options={{
          layout: 'tabs',
          wallets: { applePay: 'auto', googlePay: 'auto' },
        }}
      />
      {!elementReady && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      )}
      {submitError && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
          <p className="text-sm text-destructive text-center">{submitError}</p>
        </div>
      )}
      <button
        type="submit"
        disabled={notReady}
        className={cn(
          'w-full flex items-center justify-center gap-2 h-12 rounded-xl',
          'bg-primary text-primary-foreground font-medium text-base',
          'transition-all duration-200',
          'active:scale-[0.98]',
          notReady && 'opacity-50 cursor-not-allowed'
        )}
      >
        {isProcessing && <Loader2 className="w-4 h-4 animate-spin" />}
        {isProcessing ? t('fiat.processing') : t('fiat.payNow')}
      </button>
    </form>
  );
};

export interface StripePaymentFormProps {
  sessionData: StripeSessionData;
  onSuccess: (result: FiatPaymentSuccessResult) => void;
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

  const stripePromise = getStripePromise(
    sessionData.publishableKey,
    sessionData.connectedAccountId
  );

  useEffect(() => {
    stripePromise
      .then(instance => {
        if (instance) {
          setStripeReady(true);
        } else {
          setLoadError(t('fiat.stripeLoadFailed'));
        }
      })
      .catch(() => {
        setLoadError(t('fiat.stripeLoadFailed'));
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
        colorPrimary: 'var(--color-primary)',
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
