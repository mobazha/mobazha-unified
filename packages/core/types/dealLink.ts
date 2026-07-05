import type { components } from './api-generated';

export type DealLinkAcceptanceRequest = components['schemas']['Platform_DealAcceptanceRequest'];

export type DealLinkStatus = 'draft' | 'active' | 'paused' | 'expired' | string;

export type DealLinkDeliveryType = 'digital_file' | 'license_key' | 'fixed_service' | string;

export interface DealLinkTerms {
  acceptanceHours?: number;
  protectionHours?: number;
  deliverables?: string[];
  refund?: string;
  notes?: string;
}

export interface DealLinkPurchaseOption {
  name: string;
  value: string;
}

export interface DealLinkPurchaseTemplate {
  listingHash: string;
  quantity: string;
  options: DealLinkPurchaseOption[] | null;
  optionalFeatures: string[] | null;
}

/** Public buyer-facing Deal Link payload from hosting `/public/deal-links/{token}`. */
export interface PublicDealLink {
  token: string;
  status: DealLinkStatus;
  title: string;
  description?: string;
  deliveryType: DealLinkDeliveryType;
  priceAmount: string;
  priceCurrency: string;
  sellerPeerID: string;
  expiresAt?: string;
  terms: DealLinkTerms;
  purchaseTemplate: DealLinkPurchaseTemplate;
}

/** Immutable server-authored fee quote (`dealFeeQuoteResponse`). */
export interface DealLinkFeeQuote {
  id: string;
  dealLinkID: string;
  dealRevision: number;
  termsHash: string;
  schemaVersion: number;
  policyVersion: string;
  priceCurrency: string;
  itemOrServiceAmount: string;
  buyerServiceCharge: string;
  paymentOrNetworkCost: string;
  taxOrExternalCost: string;
  buyerTotal: string;
  grossOrderAmount: string;
  discount: string;
  sellerServiceCharge: string;
  sellerPaymentCost: string;
  sellerDistributionBudget: string;
  estimatedSellerNet: string;
  expiresAt: string;
  createdAt: string;
}

export interface DealLinkAcceptanceResult {
  orderID: string;
  paymentSessionPath: string;
  status: string;
  amount?: string;
  feeQuoteID: string;
  replayed?: boolean;
}

export type DealLinkPageErrorKind =
  | 'not_found'
  | 'expired'
  | 'inactive'
  | 'quote_expired'
  | 'network'
  | 'unknown';
