/**
 * Buyer-safe supply availability types aligned with mobazha3.0/pkg/contracts.
 * Intentionally omits provider identifiers and internal supplyKind routing.
 */

export type SupplyAvailabilityStatus =
  | 'unknown'
  | 'available'
  | 'low_stock'
  | 'out_of_stock'
  | 'unlimited'
  | 'manual_action_required'
  | 'supplier_unavailable';

export interface CheckoutSupplyQuoteItem {
  listingSlug: string;
  quantity: number;
  status: SupplyAvailabilityStatus;
  available: boolean;
  unlimited?: boolean;
  availableQuantity?: number;
  manualActionRequired?: boolean;
  reason?: string;
}

export interface CheckoutSupplyQuoteResponse {
  items: CheckoutSupplyQuoteItem[];
  canSell: boolean;
  manualActionRequired?: boolean;
  reason?: string;
}

export interface QuoteCheckoutSupplyRequest {
  items: Array<{
    listingSlug: string;
    listingHash: string;
    quantity: number;
    options?: Record<string, string>[];
    shippingOption?: string;
    shippingService?: string;
  }>;
}

/** @deprecated Use CheckoutSupplyQuoteItem */
export type GuestOrderSupplyQuoteItem = CheckoutSupplyQuoteItem;

/** @deprecated Use CheckoutSupplyQuoteResponse */
export type GuestOrderSupplyQuoteResponse = CheckoutSupplyQuoteResponse;

/** @deprecated Use QuoteCheckoutSupplyRequest */
export type QuoteGuestOrderSupplyRequest = QuoteCheckoutSupplyRequest;
