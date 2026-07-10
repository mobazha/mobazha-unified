import { ApiError } from '../services/api/client';
import type {
  DealLinkAcceptanceRequest,
  DealLinkAcceptanceResult,
  DealLinkFeeQuote,
  DealLinkPageErrorKind,
  DealLinkTerms,
  PublicDealLink,
  PublicDealLinkCatalog,
} from '../types/dealLink';

export function createDealLinkIdempotencyKey(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return `deal-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function buildDealLinkPaymentHref(orderID: string): string {
  return `/payment?orderID=${encodeURIComponent(orderID)}&source=deal_link`;
}

export function buildDealLinkAcceptanceRequest(
  feeQuoteID: string,
  affiliateReferralSessionID?: string
): DealLinkAcceptanceRequest {
  const payload: DealLinkAcceptanceRequest = { feeQuoteID };
  const referralSessionID = affiliateReferralSessionID?.trim();
  if (referralSessionID) payload.affiliateReferralSessionID = referralSessionID;
  return payload;
}

export function parseDealLinkTerms(raw: unknown): DealLinkTerms {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {};
  }
  const source = raw as Record<string, unknown>;
  return {
    acceptanceHours: readOptionalNumber(source.acceptanceHours),
    protectionHours: readOptionalNumber(source.protectionHours),
    deliverables: Array.isArray(source.deliverables)
      ? source.deliverables.filter(
          (value): value is string => typeof value === 'string' && value.trim() !== ''
        )
      : undefined,
    refund: readString(source.refund),
    notes: readString(source.notes),
  };
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function readRequiredString(value: unknown, fallback = ''): string {
  return readString(value) ?? fallback;
}

function readOptionalNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function readRequiredNumber(value: unknown, fallback = 0): number {
  return readOptionalNumber(value) ?? fallback;
}

function readAcceptedCurrencies(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const currencies: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string') continue;
    const trimmed = item.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    currencies.push(trimmed);
  }
  return currencies;
}

function readPublicDealLinkCatalog(raw: unknown): PublicDealLinkCatalog | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return undefined;
  }
  const source = raw as Record<string, unknown>;
  return {
    title: readString(source.title) ?? '',
    sellerName: readString(source.sellerName) ?? '',
    sellerAvatar: readString(source.sellerAvatar),
    image: readString(source.image),
    acceptedCurrencies: readAcceptedCurrencies(source.acceptedCurrencies),
    contractType: readString(source.contractType) ?? '',
  };
}

function readPurchaseTemplate(raw: unknown): PublicDealLink['purchaseTemplate'] {
  const source =
    raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const optionsRaw = Array.isArray(source.options) ? source.options : [];
  const options = optionsRaw
    .map(item => {
      if (!item || typeof item !== 'object') return null;
      const row = item as Record<string, unknown>;
      const name = readString(row.name);
      const value = readString(row.value);
      return name && value ? { name, value } : null;
    })
    .filter((item): item is { name: string; value: string } => item !== null);

  return {
    listingHash: readString(source.listingHash) ?? '',
    quantity: readString(source.quantity) ?? '1',
    options,
    optionalFeatures: Array.isArray(source.optionalFeatures)
      ? source.optionalFeatures.filter((item): item is string => typeof item === 'string')
      : [],
  };
}

/** Normalize hosting public Deal Link payload for UI consumption. */
export function normalizePublicDealLink(
  raw: Record<string, unknown>,
  token: string
): PublicDealLink {
  const catalog = readPublicDealLinkCatalog(raw.catalog);
  const deal: PublicDealLink = {
    token: readString(raw.token) ?? readString(raw.publicToken) ?? token,
    status: readString(raw.status) ?? 'unknown',
    title: readString(raw.title) ?? '',
    description: readString(raw.description),
    deliveryType: readString(raw.deliveryType) ?? 'unknown',
    priceAmount: readString(raw.priceAmount) ?? '0',
    priceCurrency: readString(raw.priceCurrency) ?? 'USD',
    sellerPeerID: readString(raw.sellerPeerID) ?? readString(raw.sellerPeerId) ?? '',
    expiresAt: readString(raw.expiresAt),
    terms: parseDealLinkTerms(raw.terms),
    purchaseTemplate: readPurchaseTemplate(raw.purchaseTemplate),
  };
  if (catalog) {
    deal.catalog = catalog;
  }
  return deal;
}

/** Normalize immutable fee quote payload (`dealFeeQuoteResponse`). */
export function normalizeDealLinkFeeQuote(raw: Record<string, unknown>): DealLinkFeeQuote {
  return {
    id: readRequiredString(raw.id),
    dealLinkID: readString(raw.dealLinkID) ?? readString(raw.dealLinkId) ?? '',
    dealRevision: readRequiredNumber(raw.dealRevision),
    termsHash: readRequiredString(raw.termsHash),
    schemaVersion: readRequiredNumber(raw.schemaVersion),
    policyVersion: readRequiredString(raw.policyVersion),
    priceCurrency: readRequiredString(raw.priceCurrency, 'USD'),
    itemOrServiceAmount: readRequiredString(raw.itemOrServiceAmount, '0'),
    buyerServiceCharge: readRequiredString(raw.buyerServiceCharge, '0'),
    paymentOrNetworkCost: readRequiredString(raw.paymentOrNetworkCost, '0'),
    taxOrExternalCost: readRequiredString(raw.taxOrExternalCost, '0'),
    buyerTotal: readRequiredString(raw.buyerTotal, '0'),
    grossOrderAmount: readRequiredString(raw.grossOrderAmount, '0'),
    discount: readRequiredString(raw.discount, '0'),
    sellerServiceCharge: readRequiredString(raw.sellerServiceCharge, '0'),
    sellerPaymentCost: readRequiredString(raw.sellerPaymentCost, '0'),
    sellerDistributionBudget: readRequiredString(raw.sellerDistributionBudget, '0'),
    estimatedSellerNet: readRequiredString(raw.estimatedSellerNet, '0'),
    expiresAt: readRequiredString(raw.expiresAt),
    createdAt: readRequiredString(raw.createdAt),
  };
}

export function normalizeDealLinkAcceptanceResult(
  raw: Record<string, unknown>
): DealLinkAcceptanceResult {
  return {
    orderID: readString(raw.orderID) ?? readString(raw.orderId) ?? '',
    paymentSessionPath: readString(raw.paymentSessionPath) ?? '',
    status: readString(raw.status) ?? '',
    amount: readString(raw.amount),
    feeQuoteID: readString(raw.feeQuoteID) ?? readString(raw.feeQuoteId) ?? '',
    replayed: raw.replayed === true,
  };
}

export function isIsoTimestampExpired(value: string | undefined, now = Date.now()): boolean {
  if (!value) return false;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && parsed <= now;
}

export function isPublicDealLinkExpired(deal: PublicDealLink, now = Date.now()): boolean {
  if (deal.status === 'expired') return true;
  return isIsoTimestampExpired(deal.expiresAt, now);
}

export function isDealLinkFeeQuoteExpired(
  quote: DealLinkFeeQuote | null | undefined,
  now = Date.now()
): boolean {
  if (!quote) return false;
  return isIsoTimestampExpired(quote.expiresAt, now);
}

export function isDealLinkActive(deal: PublicDealLink, now = Date.now()): boolean {
  return deal.status === 'active' && !isPublicDealLinkExpired(deal, now);
}

export interface DealLinkIdempotencyState {
  quoteId: string | null;
  idempotencyKey: string;
}

/** Rotate idempotency keys when quote id changes; preserve key for retries on the same quote. */
export function resolveDealLinkIdempotencyState(
  nextQuoteId: string | undefined,
  previous: DealLinkIdempotencyState,
  createKey: () => string = createDealLinkIdempotencyKey
): DealLinkIdempotencyState {
  if (!nextQuoteId) {
    return previous;
  }
  if (previous.quoteId !== nextQuoteId) {
    return { quoteId: nextQuoteId, idempotencyKey: createKey() };
  }
  return previous;
}

export function computeDealLinkCanAccept(
  deal: PublicDealLink | null,
  quote: DealLinkFeeQuote | null,
  now: number,
  acceptLoading: boolean
): boolean {
  const quoteExpired = isDealLinkFeeQuoteExpired(quote, now);
  return Boolean(deal && quote && isDealLinkActive(deal, now) && !quoteExpired) && !acceptLoading;
}

function isQuoteRelatedError(haystack: string): boolean {
  return (
    haystack.includes('fee quote') ||
    haystack.includes('feequote') ||
    (haystack.includes('quote') &&
      !haystack.includes('deal link') &&
      !haystack.includes('deal-link'))
  );
}

export function classifyDealLinkError(error: unknown): DealLinkPageErrorKind {
  if (error instanceof ApiError) {
    const haystack = `${error.code ?? ''} ${error.message} ${error.detail ?? ''}`.toLowerCase();

    if (
      isQuoteRelatedError(haystack) &&
      (haystack.includes('expired') ||
        haystack.includes('missing') ||
        haystack.includes('not found') ||
        haystack.includes('invalid'))
    ) {
      return 'quote_expired';
    }
    if (error.status === 404 && isQuoteRelatedError(haystack)) {
      return 'quote_expired';
    }
    if (error.status === 410 && isQuoteRelatedError(haystack)) {
      return 'quote_expired';
    }

    if (error.status === 404 || haystack.includes('not found')) return 'not_found';
    if (error.status === 410 || haystack.includes('expired')) return 'expired';
    if (
      haystack.includes('inactive') ||
      haystack.includes('paused') ||
      haystack.includes('not active')
    ) {
      return 'inactive';
    }
    if (error.status === 0 || haystack.includes('network') || haystack.includes('fetch'))
      return 'network';
  }
  if (error instanceof TypeError) return 'network';
  return 'unknown';
}

export function resolveDealLinkAcceptanceWindowDays(deal: PublicDealLink): number | undefined {
  const hours = deal.terms.acceptanceHours;
  if (typeof hours === 'number' && hours > 0) {
    return Math.max(1, Math.round(hours / 24));
  }
  return undefined;
}

export function resolveDealLinkProtectionWindowDays(deal: PublicDealLink): number | undefined {
  const hours = deal.terms.protectionHours;
  if (typeof hours === 'number' && hours > 0) {
    return Math.max(1, Math.round(hours / 24));
  }
  return resolveDealLinkAcceptanceWindowDays(deal);
}

export interface DealLinkCountdownParts {
  totalMs: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  expired: boolean;
}

export function getDealLinkCountdownParts(
  expiresAt: string | undefined,
  now = Date.now()
): DealLinkCountdownParts | null {
  if (!expiresAt) return null;
  const target = Date.parse(expiresAt);
  if (!Number.isFinite(target)) return null;
  const totalMs = Math.max(0, target - now);
  const expired = totalMs <= 0;
  const totalSeconds = Math.floor(totalMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { totalMs, days, hours, minutes, seconds, expired };
}

export type DealLinkBuyerFeeLineKey =
  | 'itemOrServiceAmount'
  | 'buyerServiceCharge'
  | 'paymentOrNetworkCost'
  | 'taxOrExternalCost'
  | 'discount';

export interface DealLinkFeeLineItem {
  key: DealLinkBuyerFeeLineKey;
  amount: string;
}

/** Buyer-visible fee lines from the immutable hosting quote. */
export function getDealLinkFeeLineItems(quote: DealLinkFeeQuote): DealLinkFeeLineItem[] {
  return [
    { key: 'itemOrServiceAmount', amount: quote.itemOrServiceAmount },
    { key: 'buyerServiceCharge', amount: quote.buyerServiceCharge },
    { key: 'paymentOrNetworkCost', amount: quote.paymentOrNetworkCost },
    { key: 'taxOrExternalCost', amount: quote.taxOrExternalCost },
    { key: 'discount', amount: quote.discount },
  ];
}
