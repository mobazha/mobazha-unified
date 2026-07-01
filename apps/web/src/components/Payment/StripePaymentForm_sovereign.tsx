'use client';

import React from 'react';

export interface FiatPaymentSuccessResult {
  transactionID: string;
  providerID: 'stripe' | 'paypal';
  amount: number;
  currency: string;
}

export interface StripePaymentFormProps {
  publishableKey: string;
  connectedAccountId?: string;
  clientSecret: string;
  returnUrl: string;
  onSuccess: (result: FiatPaymentSuccessResult) => void;
  onError: (message: string) => void;
  disabled?: boolean;
}

export const StripePaymentForm: React.FC<StripePaymentFormProps> = () => null;
