'use client';

import type { FC } from 'react';
import type { CreateQuotedFiatPaymentSessionParams } from '@mobazha/core';
import type { FiatPaymentSuccessResult } from './StripePaymentForm_sovereign';

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
  canCreateSession?: boolean;
  dealPaymentSessionRequest?: Omit<
    CreateQuotedFiatPaymentSessionParams,
    'orderId' | 'vendorPeerID'
  >;
  disabled?: boolean;
  className?: string;
}

/** Fiat providers are intentionally unavailable in the Sovereign runtime. */
export const FiatPaymentSection: FC<FiatPaymentSectionProps> = () => null;

export default FiatPaymentSection;
