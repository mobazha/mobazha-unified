/**
 * Guest Checkout API service
 *
 * Guest endpoints are public (no auth required for buyers).
 * Settings endpoints require seller authentication.
 */

import { NODE_API } from '../../config/apiPaths';
import { publicGet, publicPost, authGet, authPut, authPost } from './helpers';

// ========== Types ==========

export interface GuestCartItem {
  slug: string;
  listingHash: string;
  quantity: number;
  options?: { name: string; value: string }[];
  shipping?: { name: string; service: string };
}

export interface CreateGuestOrderRequest {
  items: GuestCartItem[];
  paymentCoin: string;
  contactEmail?: string;
  shippingAddress?: {
    name: string;
    address: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    addressNotes?: string;
  };
  memo?: string;
}

export interface GuestOrderResponse {
  orderToken: string;
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
  title: string;
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
  requiredConfirmations: number;
  expiresAt: string;
  txHash?: string;
  trackingNumber?: string;
  carrier?: string;
  items: GuestOrderItemResponse[];
  createdAt: string;
  updatedAt: string;
}

export interface GuestCheckoutSettings {
  enabled: boolean;
  acceptedCoins: string[];
  maxOrderAmount?: string;
  paymentTimeoutMinutes: number;
}

export interface GuestOrderSummary {
  orderToken: string;
  state: string;
  paymentCoin: string;
  paymentAmount: string;
  priceCurrency: string;
  items: GuestOrderItemResponse[];
  contactEmail?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GuestOrderListResponse {
  data: GuestOrderSummary[];
  meta: { total: number; limit: number; offset: number };
}

// ========== Buyer-facing APIs (public, no auth) ==========

export function createGuestOrder(
  data: CreateGuestOrderRequest,
): Promise<{ data: GuestOrderResponse }> {
  return publicPost(NODE_API.GUEST_ORDERS, data);
}

export function getGuestOrderStatus(token: string): Promise<{ data: GuestOrderStatus }> {
  return publicGet(NODE_API.GUEST_ORDER(token));
}

// ========== Seller-facing APIs (require auth) ==========

export function getGuestCheckoutSettings(): Promise<{ data: GuestCheckoutSettings }> {
  return authGet(NODE_API.GUEST_CHECKOUT_SETTINGS);
}

export function updateGuestCheckoutSettings(
  settings: GuestCheckoutSettings,
): Promise<{ data: GuestCheckoutSettings }> {
  return authPut(NODE_API.GUEST_CHECKOUT_SETTINGS, settings);
}

export function listGuestOrders(params?: {
  limit?: number;
  offset?: number;
  state?: string;
}): Promise<GuestOrderListResponse> {
  const query = new URLSearchParams();
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.offset) query.set('offset', String(params.offset));
  if (params?.state) query.set('state', params.state);
  const qs = query.toString();
  return authGet(`${NODE_API.GUEST_ORDERS}${qs ? `?${qs}` : ''}`);
}

export function fulfillGuestOrder(
  token: string,
  data: { trackingNumber?: string; carrier?: string },
): Promise<{ data: GuestOrderStatus }> {
  return authPost(NODE_API.GUEST_ORDER_FULFILL(token), data);
}

export function completeGuestOrder(token: string): Promise<{ data: GuestOrderStatus }> {
  return authPost(NODE_API.GUEST_ORDER_COMPLETE(token), {});
}
