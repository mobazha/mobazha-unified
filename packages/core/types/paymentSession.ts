export type PaymentSessionSettlementMode =
  | 'address_monitored'
  | 'provider_checkout'
  | 'escrow_v1'
  | 'multi_round';

export type PaymentSessionProductMode = 'cancelable' | 'moderated' | 'direct';

export interface PaymentSessionFundingTarget {
  type: 'address' | 'provider_session';
  address?: string;
  assetID: string;
  amount: string;
  memoOrTag?: string;
  qrPayload?: string;
}

export interface PaymentSessionProgress {
  observedAmount: string;
  requiredAmount: string;
  remainingAmount: string;
  observationCount: number;
  fundingState: string;
  lastObservedAt?: string;
}

export interface PaymentSession {
  sessionID: string;
  orderID: string;
  paymentCoin: string;
  settlementMode: PaymentSessionSettlementMode;
  productMode: PaymentSessionProductMode;
  status: string;
  expectedAmount: string;
  refundAddress?: string;
  expiresAt: string;
  fundingTarget: PaymentSessionFundingTarget;
  paymentProgress: PaymentSessionProgress;
}
