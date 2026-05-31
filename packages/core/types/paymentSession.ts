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
  displayInstructions?: string[];
  networkFeeHints?: {
    feePayer: string;
    asset: string;
  };
  providerData?: Record<string, unknown>;
}

export interface PaymentSessionProgress {
  observedAmount: string;
  requiredAmount: string;
  remainingAmount: string;
  observationCount: number;
  fundingState: string;
  lastObservedAt?: string;
  observations?: PaymentSessionObservation[];
}

export interface PaymentSessionObservation {
  id: string;
  txHash?: string;
  txHashSource?: string;
  hasChainTxHash: boolean;
  eventIndex: number;
  eventType: string;
  amount: string;
  rawAmount: string;
  chainNamespace: string;
  chainReference: string;
  fromAddress?: string;
  toAddress: string;
  tokenAddress?: string;
  blockNumber: number;
  confirmations: number;
  status: string;
  source: string;
  observedAt?: string;
}

export interface PaymentSession {
  sessionID: string;
  orderID: string;
  paymentCoin: string;
  settlementMode: PaymentSessionSettlementMode;
  productMode: PaymentSessionProductMode;
  status: string;
  confirmationPolicy?: string;
  expectedAmount: string;
  refundAddress?: string;
  expiresAt: string;
  fundingTarget: PaymentSessionFundingTarget;
  paymentProgress: PaymentSessionProgress;
  capabilities?: {
    canRefresh?: boolean;
    canCancel?: boolean;
    canConfirm?: boolean;
    canRefund?: boolean;
    canComplete?: boolean;
  };
  userActionRequest?: {
    type: string;
    title: string;
    description?: string;
    walletHints?: Record<string, unknown>;
    payload?: Record<string, unknown>;
    expiresAt?: string;
  } | null;
}
