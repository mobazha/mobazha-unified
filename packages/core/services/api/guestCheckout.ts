/**
 * Guest Checkout API service
 *
 * Guest endpoints are public (no auth required for buyers).
 * Guest checkout reads are public; writes require seller authentication.
 */

import { NODE_API } from '../../config/apiPaths';
import type {
  GuestOrderSupplyQuoteResponse,
  QuoteGuestOrderSupplyRequest,
} from '../../types/supplyAvailability';
import { getImageUrl } from './config';
import { publicGet, publicPost, authGet, authPut, authPost, authDel } from './helpers';

export type {
  GuestOrderSupplyQuoteItem,
  GuestOrderSupplyQuoteResponse,
  QuoteGuestOrderSupplyRequest,
  SupplyAvailabilityStatus,
} from '../../types/supplyAvailability';

// ========== Types ==========

export interface GuestCartItem {
  slug: string;
  listingHash: string;
  quantity: number;
  options?: { name: string; value: string }[];
  shipping?: { name: string; service: string };
}

export interface CreateGuestOrderItemRequest {
  listingSlug: string;
  listingHash: string;
  quantity: number;
  options?: Record<string, string>[];
  shippingOption?: string;
  shippingService?: string;
}

export interface CreateGuestOrderRequest {
  items: CreateGuestOrderItemRequest[];
  paymentCoin: string;
  contactEmail?: string;
  /** Plaintext address object or PM-3a PGP ciphertext string. */
  shippingAddress?:
    | {
        name: string;
        address: string;
        city: string;
        state: string;
        postalCode: string;
        country: string;
        addressNotes?: string;
      }
    | string;
  memo?: string;
}

export interface GuestOrderResponse {
  orderToken: string;
  buyerPortalToken?: string;
  paymentAddress: string;
  paymentAmount: string;
  paymentCoin: string;
  priceCurrency: string;
  priceDivisibility: number;
  expiresAt: string;
  items: GuestOrderItemResponse[];
}

export interface GuestOrderItemResponse {
  listingHash: string;
  listingTitle: string;
  listingSlug: string;
  /** e.g. PHYSICAL_GOOD | DIGITAL_GOOD — persisted at order creation. */
  contractType?: string;
  sellerPeerID: string;
  thumbnail?: string;
  quantity: number;
  unitPrice: string;
}

export interface GuestOrderStatus {
  orderToken: string;
  state: string;
  paymentAddress: string;
  paymentAmount: string;
  paymentCoin: string;
  priceCurrency: string;
  priceDivisibility: number;
  confirmations: number;
  requiredConfs: number;
  chainBlockTimeSec?: number;
  sellerPeerID?: string;
  expiresAt: string;
  txHash?: string;
  trackingNumber?: string;
  /** Normalized from API `shippingCarrier` (legacy alias `carrier` also accepted). */
  carrier?: string;
  shippingCarrier?: string;
  fundedAt?: string;
  shippedAt?: string;
  completedAt?: string;
  subtotal?: number;
  shippingCost?: number;
  totalPrice?: number;
  poolDetected?: boolean;
  poolTxHash?: string;
  poolAmount?: number;
  poolDetectedAt?: string;
  items: GuestOrderItemResponse[];
  createdAt: string;
  updatedAt: string;
}

export interface GuestCheckoutSettings {
  enabled: boolean;
  /** All coins the seller has configured (used by admin settings editor). */
  acceptedCoins: string[];
  /**
   * Runtime-available subset of acceptedCoins computed by the node.
   * Coins without their required runtime capability are excluded.
   * Buyer-facing payment selectors MUST use this field.
   */
  availableCoins: string[];
  maxOrderAmount?: string;
  paymentTimeoutMinutes: number;
}

function fromGuestCheckoutSettingsDTO(res: GuestCheckoutSettingsDTO): GuestCheckoutSettings {
  const acceptedCoins = (res.acceptedCoins || '')
    .split(',')
    .map(coin => coin.trim())
    .filter(Boolean);
  const availableCoins = (res.availableCoins || '')
    .split(',')
    .map(coin => coin.trim())
    .filter(Boolean);
  return {
    enabled: !!res.enabled,
    acceptedCoins,
    availableCoins,
    maxOrderAmount: res.maxOrderAmount,
    paymentTimeoutMinutes: res.paymentTimeout,
  };
}

interface GuestCheckoutSettingsDTO {
  enabled: boolean;
  acceptedCoins: string;
  /** Computed by the node at query time. */
  availableCoins: string;
  maxOrderAmount?: string;
  paymentTimeout: number;
}

type GuestCheckoutSettingsUpdateDTO = Omit<GuestCheckoutSettingsDTO, 'availableCoins'>;

export interface GuestOrderSummary {
  orderToken: string;
  state: string;
  paymentCoin: string;
  paymentAmount: string;
  priceCurrency: string;
  /** Listing/payment atomic-unit scale; optional on older nodes. */
  priceDivisibility?: number;
  items: GuestOrderItemResponse[];
  contactEmail?: string;
  createdAt: string;
  updatedAt: string;
}

/** First line-item thumbnail as a display URL (IPFS hash or media path → gateway URL). */
export function guestOrderListThumbnailUrl(order: GuestOrderSummary): string {
  for (const it of order.items) {
    const raw = it.thumbnail?.trim();
    if (raw) {
      const url = getImageUrl(raw);
      if (url) return url;
    }
  }
  return '';
}

/** Matches pkg/models.GuestOrderState ordering on seller-list / admin-detail JSON. */
const GUEST_ORDER_STATE_NAMES = [
  'AWAITING_PAYMENT',
  'PAYMENT_DETECTED',
  'FUNDED',
  'SHIPPED',
  'COMPLETED',
  'EXPIRED',
] as const;

/**
 * Seller-facing guest-order payloads serialize state as int; buyer-facing
 * APIs use string enum labels. Normalize so UI code can treat state as string.
 */
export function normalizeGuestOrderState(state: string | number | undefined | null): string {
  if (state === undefined || state === null) return '';
  if (typeof state === 'number' && Number.isFinite(state)) {
    const idx = Math.trunc(state);
    if (idx >= 0 && idx < GUEST_ORDER_STATE_NAMES.length) {
      return GUEST_ORDER_STATE_NAMES[idx];
    }
    return `UNKNOWN(${idx})`;
  }
  return typeof state === 'string' ? state : String(state);
}

type GuestOrderStatusDTO = Omit<GuestOrderStatus, 'state' | 'carrier'> & {
  state?: string | number;
  carrier?: string;
  shippingCarrier?: string;
};

/** Map public guest-order status payload to UI-friendly shape. */
export function normalizeGuestOrderStatus(raw: GuestOrderStatusDTO): GuestOrderStatus {
  const carrier = raw.carrier?.trim() || raw.shippingCarrier?.trim() || undefined;
  return {
    ...raw,
    state: normalizeGuestOrderState(raw.state),
    carrier,
    shippingCarrier: raw.shippingCarrier?.trim() || carrier,
  };
}

// ========== Buyer-facing APIs (public, no auth) ==========

export function buyerPortalTokenStorageKey(orderToken: string): string {
  return `mobazha:guest-order:${orderToken}:buyerPortalToken`;
}

export function createGuestOrder(data: CreateGuestOrderRequest): Promise<GuestOrderResponse> {
  return publicPost(NODE_API.GUEST_ORDERS, data);
}

/** Advisory supply preflight — does not hold inventory. Buyer-safe (no provider IDs). */
export function quoteGuestOrderSupply(
  data: QuoteGuestOrderSupplyRequest
): Promise<GuestOrderSupplyQuoteResponse> {
  return publicPost<GuestOrderSupplyQuoteResponse>(NODE_API.GUEST_ORDERS_QUOTE, data);
}

export function getGuestOrderStatus(token: string): Promise<GuestOrderStatus> {
  return publicGet<GuestOrderStatusDTO>(NODE_API.GUEST_ORDER(token)).then(
    normalizeGuestOrderStatus
  );
}

// ========== Guest checkout settings / seller APIs ==========

export function getGuestCheckoutSettings(): Promise<GuestCheckoutSettings> {
  return publicGet<GuestCheckoutSettingsDTO>(NODE_API.GUEST_CHECKOUT_SETTINGS).then(
    fromGuestCheckoutSettingsDTO
  );
}

export function updateGuestCheckoutSettings(
  settings: GuestCheckoutSettings
): Promise<GuestCheckoutSettings> {
  const payload: GuestCheckoutSettingsUpdateDTO = {
    enabled: settings.enabled,
    acceptedCoins: settings.acceptedCoins.join(','),
    maxOrderAmount: settings.maxOrderAmount,
    paymentTimeout: settings.paymentTimeoutMinutes,
  };
  return authPut<GuestCheckoutSettingsDTO>(NODE_API.GUEST_CHECKOUT_SETTINGS, payload).then(
    fromGuestCheckoutSettingsDTO
  );
}

export function listGuestOrders(params?: {
  page?: number;
  pageSize?: number;
  state?: string;
}): Promise<GuestOrderSummary[]> {
  const query = new URLSearchParams();
  if (params?.page !== undefined) query.set('page', String(params.page));
  if (params?.pageSize !== undefined) query.set('pageSize', String(params.pageSize));
  if (params?.state) query.set('state', params.state);
  const qs = query.toString();
  const path = `${NODE_API.GUEST_ORDERS}${qs ? `?${qs}` : ''}`;
  return authGet<Array<Omit<GuestOrderSummary, 'state'> & { state?: string | number }>>(path).then(
    rows =>
      (rows ?? []).map(({ state, ...rest }) => ({
        ...rest,
        state: normalizeGuestOrderState(state),
      }))
  );
}

// PM-3a: Admin-only full order detail (includes encrypted shipping address).
export interface GuestOrderAdminDetail {
  orderToken: string;
  state: string;
  paymentCoin: string;
  paymentAmount: string;
  priceCurrency: string;
  priceDivisibility?: number;
  items: GuestOrderItemResponse[];
  contactEmail?: string;
  createdAt: string;
  updatedAt: string;
  fundedAt?: string;
  shippedAt?: string;
  completedAt?: string;
  trackingNumber?: string;
  shippingCarrier?: string;
  sellerNote?: string;
  // addressEncrypted=true means shippingAddressCiphertext holds PGP armor.
  // addressEncrypted=false means shippingAddress holds a parsed JSON object.
  addressEncrypted: boolean;
  shippingAddressCiphertext?: string;
  shippingAddress?: Record<string, string>;
}

export function getAdminGuestOrderDetail(token: string): Promise<GuestOrderAdminDetail> {
  return authGet<Omit<GuestOrderAdminDetail, 'state'> & { state?: string | number }>(
    NODE_API.GUEST_ORDER_ADMIN_DETAIL(token)
  ).then(detail => ({
    ...detail,
    state: normalizeGuestOrderState(detail.state),
  }));
}

// PM-3a: PGP key management APIs (Sovereign/seller-side).

/**
 * Fetches the vendor's PGP public key.
 * Returns an empty string when no key is configured (404 → "").
 */
export async function getPGPPublicKey(): Promise<string> {
  try {
    const data = await publicGet<{ publicKey: string }>(NODE_API.SETTINGS_PGP_KEY);
    return data?.publicKey ?? '';
  } catch {
    return '';
  }
}

export function updatePGPPublicKey(publicKey: string): Promise<{ publicKey: string }> {
  return authPut(NODE_API.SETTINGS_PGP_KEY, { publicKey });
}

export function deletePGPPublicKey(): Promise<void> {
  return authDel(NODE_API.SETTINGS_PGP_KEY);
}

export async function shipGuestOrder(
  token: string,
  data: { trackingNumber?: string; carrier?: string }
): Promise<GuestOrderStatus> {
  // Backend returns 204 No Content; refetch public status for normalized payload.
  await authPut(NODE_API.GUEST_ORDER_SHIP(token), data);
  return getGuestOrderStatus(token);
}

export async function completeGuestOrder(token: string): Promise<GuestOrderStatus> {
  await authPost(NODE_API.GUEST_ORDER_COMPLETE(token), {});
  return getGuestOrderStatus(token);
}
