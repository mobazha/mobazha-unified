/**
 * Guest Checkout API service
 *
 * Guest endpoints are public (no auth required for buyers).
 * Guest checkout reads are public; writes require seller authentication.
 */

import { NODE_API } from '../../config/apiPaths';
import { publicGet, publicPost, authGet, authPut, authPost, authDel } from './helpers';

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
  expiresAt: string;
  txHash?: string;
  trackingNumber?: string;
  carrier?: string;
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
   * Coins without the required sidecar (e.g. XMR without monero-wallet-rpc)
   * are excluded. Buyer-facing payment selectors MUST use this field.
   * Falls back to acceptedCoins when the server is an older build that
   * does not yet return this field.
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
  // Prefer the server-computed availableCoins when present; fall back to
  // acceptedCoins for backward-compatibility with older node builds.
  const availableCoins =
    res.availableCoins !== undefined
      ? (res.availableCoins || '')
          .split(',')
          .map(coin => coin.trim())
          .filter(Boolean)
      : acceptedCoins;
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
  /** Computed by the node at query time; absent on older builds. */
  availableCoins?: string;
  maxOrderAmount?: string;
  paymentTimeout: number;
}

export interface GuestOrderSummary {
  orderToken: string;
  state: string;
  paymentCoin: string;
  paymentAmount: string;
  priceCurrency: string;
  /** Listing/payment atomic-unit scale (e.g. XMR = 12); optional on older nodes. */
  priceDivisibility?: number;
  items: GuestOrderItemResponse[];
  contactEmail?: string;
  createdAt: string;
  updatedAt: string;
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

// ========== Buyer-facing APIs (public, no auth) ==========

export function buyerPortalTokenStorageKey(orderToken: string): string {
  return `mobazha:guest-order:${orderToken}:buyerPortalToken`;
}

export function createGuestOrder(data: CreateGuestOrderRequest): Promise<GuestOrderResponse> {
  return publicPost(NODE_API.GUEST_ORDERS, data);
}

export function getGuestOrderStatus(token: string): Promise<GuestOrderStatus> {
  return publicGet(NODE_API.GUEST_ORDER(token));
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
  const payload: GuestCheckoutSettingsDTO = {
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

// PM-3a: PGP key management APIs (Outpost/seller-side).

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

export function shipGuestOrder(
  token: string,
  data: { trackingNumber?: string; carrier?: string }
): Promise<GuestOrderStatus> {
  return authPut(NODE_API.GUEST_ORDER_SHIP(token), data);
}

export function completeGuestOrder(token: string): Promise<GuestOrderStatus> {
  return authPost(NODE_API.GUEST_ORDER_COMPLETE(token), {});
}
