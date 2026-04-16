/**
 * Guest Checkout API service
 *
 * Guest endpoints are public (no auth required for buyers).
 * Settings endpoints require seller authentication.
 */

import { NODE_API } from '../../config/apiPaths';
import { publicGet, publicPost, authGet, authPut } from './helpers';

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
  acceptedCoins: string;
  maxOrderAmount: string;
  paymentTimeout: number;
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
