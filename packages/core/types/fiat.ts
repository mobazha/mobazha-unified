/**
 * Fiat payment types — mirrors backend contracts/fiat_types.go
 */

export type CaptureMode = 'automatic' | 'manual';

export interface StripeSessionData {
  clientSecret: string;
  publishableKey: string;
  connectedAccountId?: string;
}

export interface PayPalSessionData {
  orderID: string;
  clientID: string;
}

export interface FiatPaymentSession {
  sessionID: string;
  captureMode: CaptureMode;
  expiresAt: string;
  status: string;
  approveURL?: string;

  stripe?: StripeSessionData;
  paypal?: PayPalSessionData;
}

export interface PaymentMethodInfo {
  type: string;
  brand: string;
  last4: string;
}

export interface FiatPaymentResult {
  paymentID: string;
  status: string;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethodInfo;
}

export interface FiatPaymentDetail {
  paymentID: string;
  status: string;
  amount: number;
  currency: string;
  sellerAccountID: string;
  paymentMethod: PaymentMethodInfo;
  createdAt: string;
  receiptURL?: string;
}

export interface FiatProviderInfo {
  providerID: string;
  status: string;
  accountID: string;
}

export interface FiatAccountStatus {
  accountID: string;
  email?: string;
  isActive: boolean;
  status: string;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  requirements?: string[];
}

export interface FiatProviderConfigView {
  providerID: string;
  accountID?: string;
  publicKey?: string;
  maskedSecretKey?: string;
  maskedWebhookSecret?: string;
  isActive: boolean;
}

export interface FiatProviderConfigInput {
  providerID: string;
  secretKey: string;
  publishableKey: string;
  webhookSecret: string;
}

export interface CreateFiatPaymentParams {
  providerID: string;
  orderID: string;
  amount: number;
  currency: string;
  description?: string;
  returnURL?: string;
  cancelURL?: string;
}

export type FiatProviderID = 'stripe' | 'paypal';

export type FiatPaymentStatus =
  | 'idle'
  | 'creating'
  | 'pending'
  | 'processing'
  | 'succeeded'
  | 'failed'
  | 'cancelled';
