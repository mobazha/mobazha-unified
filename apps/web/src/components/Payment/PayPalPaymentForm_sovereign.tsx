'use client';

import type { FC } from 'react';
import type { PayPalSessionData } from '@mobazha/core';
import type { FiatPaymentSuccessResult } from './StripePaymentForm_sovereign';

export interface PayPalPaymentFormProps {
  sessionData: PayPalSessionData;
  vendorPeerID: string;
  amount: number;
  currency?: string;
  onSuccess: (result: FiatPaymentSuccessResult) => void;
  onError: (message: string) => void;
  onCancel?: () => void;
  disabled?: boolean;
  className?: string;
}

/** Fiat providers are intentionally unavailable in the Sovereign runtime. */
export const PayPalPaymentForm: FC<PayPalPaymentFormProps> = () => null;

export default PayPalPaymentForm;
