import { ApiError } from '../services/api/client';
import type { TranslateFunction, TranslationKey } from '../i18n/types';
import type { GuestCartItem } from '../stores/guestCartStore';
import type {
  CheckoutSupplyQuoteItem,
  CheckoutSupplyQuoteResponse,
  QuoteCheckoutSupplyRequest,
  QuoteGuestOrderSupplyRequest,
  SupplyAvailabilityStatus,
} from '../types/supplyAvailability';

/** Backend reasons where quote is advisory-only — checkout must not be blocked. */
export const SUPPLY_QUOTE_ADVISORY_DISABLED_REASONS = new Set([
  'supply_availability_disabled',
  'supply_lines_unavailable',
  'quote_unavailable',
]);

export type SupplyQuoteResponse = CheckoutSupplyQuoteResponse;
export type SupplyQuoteItem = CheckoutSupplyQuoteItem;
export type QuoteSupplyRequest = QuoteCheckoutSupplyRequest;

export interface CheckoutSupplyQuoteLineInput {
  vendorPeerID?: string;
  listingSlug: string;
  listingHash: string;
  quantity: number;
  options?: Array<Record<string, string>>;
  shippingOption?: string;
  shippingService?: string;
}

export function buildQuoteRequestFromLines(
  items: CheckoutSupplyQuoteLineInput[]
): QuoteCheckoutSupplyRequest {
  return {
    items: items.map(i => ({
      listingSlug: i.listingSlug,
      listingHash: i.listingHash,
      quantity: i.quantity,
      options: i.options,
      shippingOption: i.shippingOption,
      shippingService: i.shippingService,
    })),
  };
}

export function buildQuoteRequestFromCartItems(
  items: GuestCartItem[]
): QuoteGuestOrderSupplyRequest {
  return buildQuoteRequestFromLines(
    items.map(i => ({
      listingSlug: i.slug,
      listingHash: i.listingHash,
      quantity: i.quantity,
      options: i.options?.map(opt => ({ [opt.name]: opt.value })),
      shippingOption: i.shipping?.name,
      shippingService: i.shipping?.service,
    }))
  );
}

export function isSupplyQuoteAdvisoryDisabled(
  quote: CheckoutSupplyQuoteResponse | null | undefined
): boolean {
  if (!quote?.reason) return false;
  return SUPPLY_QUOTE_ADVISORY_DISABLED_REASONS.has(quote.reason);
}

export function isSupplyQuoteAuthoritative(
  quote: CheckoutSupplyQuoteResponse | null | undefined
): boolean {
  return Boolean(quote && !isSupplyQuoteAdvisoryDisabled(quote));
}

/** When feature is off or quote unavailable, allow checkout (fail open). */
export function canProceedGuestCheckout(
  quote: CheckoutSupplyQuoteResponse | null | undefined
): boolean {
  if (!quote || isSupplyQuoteAdvisoryDisabled(quote)) return true;
  return quote.canSell === true;
}

export function hasSupplyAvailabilityWarning(
  quote: CheckoutSupplyQuoteResponse | null | undefined
): boolean {
  if (!quote || isSupplyQuoteAdvisoryDisabled(quote)) return false;
  return quote.manualActionRequired === true || quote.canSell === false;
}

export function supplyStatusI18nKey(status: SupplyAvailabilityStatus): TranslationKey {
  switch (status) {
    case 'available':
      return 'supplyAvailability.statusAvailable';
    case 'low_stock':
      return 'supplyAvailability.statusLowStock';
    case 'out_of_stock':
      return 'supplyAvailability.statusOutOfStock';
    case 'unlimited':
      return 'supplyAvailability.statusUnlimited';
    case 'manual_action_required':
      return 'supplyAvailability.statusManualAction';
    case 'supplier_unavailable':
      return 'supplyAvailability.statusSupplierUnavailable';
    case 'unknown':
    default:
      return 'supplyAvailability.statusUnknown';
  }
}

export function formatSupplyItemStatusLabel(
  item: CheckoutSupplyQuoteItem,
  translate: TranslateFunction
): string {
  const key = supplyStatusI18nKey(item.status);
  if (item.status === 'low_stock' && item.availableQuantity != null) {
    return translate(key, {
      defaultValue: 'Only {{count}} left',
      count: item.availableQuantity,
    });
  }
  return translate(key, { defaultValue: item.status });
}

export function resolveGuestOrderCreationError(err: unknown, translate: TranslateFunction): string {
  if (err instanceof ApiError && err.status === 409) {
    const msg = err.message.toLowerCase();
    if (msg.includes('manual action') || msg.includes('digital asset')) {
      return translate('supplyAvailability.orderConflictManual', {
        defaultValue: 'This order needs seller review before payment. Please try again later.',
      });
    }
    return translate('supplyAvailability.orderConflictStock', {
      defaultValue: 'Could not reserve inventory. Refresh availability and try again.',
    });
  }
  if (err instanceof Error && err.message) return err.message;
  return translate('supplyAvailability.orderConflictGeneric', {
    defaultValue: 'Order creation failed',
  });
}
