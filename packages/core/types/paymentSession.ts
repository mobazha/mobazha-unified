export type PaymentSessionSettlementMode =
  | 'address_monitored'
  | 'provider_checkout'
  | 'escrow_v1'
  | 'multi_round';

export type PaymentSessionProductMode = 'cancelable' | 'moderated' | 'direct';

export type PaymentReadinessStatus = 'awaiting_seller_receipt' | 'ready_to_pay';

export interface PaymentReadinessView {
  status: PaymentReadinessStatus;
  readyAt?: string;
  retryAfterSeconds?: number;
  sellerReceiptTimeoutAt?: string;
}

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
  /** Deal payment-selection quote used to derive authoritative amounts. */
  paymentSelectionQuoteID?: string;
  paymentCoin: string;
  settlementMode: PaymentSessionSettlementMode;
  productMode: PaymentSessionProductMode;
  status: string;
  confirmationPolicy?: string;
  expectedAmount: string;
  refundAddress?: string;
  refundAddressSource?: string;
  refundRequiresInput?: boolean;
  refundResolveReason?: string;
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
  paymentReadiness?: PaymentReadinessView;
  /**
   * Non-null only when an onramp purchase is the session's selected
   * pre-observation funding source (ADR-019).
   */
  onrampFunding?: OnrampFundingSourceView | null;
}

/**
 * Onramp funding-source view (ADR-019 / RFC-0012 Proposal 5).
 *
 * An onramp purchase is a funding SOURCE feeding the frozen on-chain funding
 * target — never a settlement mode. The session's funded/verified status
 * continues to come only from the on-chain funding observation; this view is
 * descriptive progress for the pre-observation window.
 */
export interface OnrampFundingSourceView {
  providerID: string;
  onrampOrderID: string;
  /** Mirrors the provider-neutral onramp status (created/awaiting_payment/processing/delivering/delivered/failed/reversed). */
  status: string;
  deliverToBuyerWallet: boolean;
  buyerWalletAddress?: string;
  /** Provider-hosted URL where the buyer completes the fiat step while awaiting payment. */
  buyerActionURL?: string;
  disclosure?: string;
  updatedAt?: string;
}

/**
 * Pre-observation funding states contributed by an onramp funding source.
 * They refine `awaiting_funds` only; any observed on-chain funds win.
 */
export const ONRAMP_FUNDING_STATES = [
  'onramp_awaiting_payment',
  'onramp_processing',
  'onramp_delivering',
  'onramp_forwarding',
] as const;

export type OnrampFundingState = (typeof ONRAMP_FUNDING_STATES)[number];

export function isOnrampFundingState(state: string | undefined): state is OnrampFundingState {
  return !!state && (ONRAMP_FUNDING_STATES as readonly string[]).includes(state);
}
