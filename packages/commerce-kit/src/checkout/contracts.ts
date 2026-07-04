import type { CommerceHttpClient } from '../http';

export interface CommerceGuestCheckoutSettingsWire {
  enabled: boolean;
  acceptedCoins: string;
  availableCoins: string;
  maxOrderAmount?: string;
  paymentTimeout: number;
}

export interface CommerceGuestCheckoutSettings {
  enabled: boolean;
  acceptedCoins: string[];
  availableCoins: string[];
  maxOrderAmount?: string;
  paymentTimeoutMinutes: number;
}

export interface CommerceGuestOrderItemRequest {
  listingSlug: string;
  listingHash: string;
  quantity: number;
  options?: Record<string, string>[];
  shippingOption?: string;
  shippingService?: string;
}

export interface CommerceGuestOrderRequest {
  items: CommerceGuestOrderItemRequest[];
  paymentCoin: string;
  contactEmail?: string;
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

export interface CommerceGuestOrderItemResponse {
  listingHash: string;
  listingTitle: string;
  listingSlug: string;
  contractType?: string;
  sellerPeerID: string;
  thumbnail?: string;
  quantity: number;
  unitPrice: string;
}

export interface CommerceGuestOrderResponse {
  orderToken: string;
  buyerPortalToken?: string;
  paymentAddress: string;
  paymentAmount: string;
  paymentCoin: string;
  priceCurrency: string;
  priceDivisibility: number;
  expiresAt: string;
  items: CommerceGuestOrderItemResponse[];
}

export interface CommerceGuestCheckoutOperationOptions {
  signal?: AbortSignal;
}

function splitCoins(value: string): string[] {
  return value
    .split(',')
    .map(coin => coin.trim())
    .filter(Boolean);
}

/** Normalize the public settings wire format once for every consumer. */
export function normalizeGuestCheckoutSettings(
  settings: CommerceGuestCheckoutSettingsWire
): CommerceGuestCheckoutSettings {
  const acceptedCoins = splitCoins(settings.acceptedCoins);
  return {
    enabled: settings.enabled === true,
    acceptedCoins,
    availableCoins: splitCoins(settings.availableCoins),
    maxOrderAmount: settings.maxOrderAmount,
    paymentTimeoutMinutes: settings.paymentTimeout,
  };
}

export interface CommerceGuestCheckoutPort {
  getSettings(
    options?: CommerceGuestCheckoutOperationOptions
  ): Promise<CommerceGuestCheckoutSettings>;
  createOrder(
    request: CommerceGuestOrderRequest,
    options?: CommerceGuestCheckoutOperationOptions
  ): Promise<CommerceGuestOrderResponse>;
}

/** @deprecated Use CommerceGuestCheckoutPort. */
export type CommerceGuestCheckoutAdapter = CommerceGuestCheckoutPort;

export function createGuestCheckoutPort(
  client: CommerceHttpClient,
  paths: { settingsPath?: string; ordersPath?: string } = {}
): CommerceGuestCheckoutPort {
  const settingsPath = paths.settingsPath ?? '/v1/settings/guest-checkout';
  const ordersPath = paths.ordersPath ?? '/v1/guest/orders';
  return {
    getSettings: options =>
      client
        .request<CommerceGuestCheckoutSettingsWire>(settingsPath, {
          signal: options?.signal,
        })
        .then(normalizeGuestCheckoutSettings),
    createOrder: (request, options) =>
      client.request<CommerceGuestOrderResponse>(ordersPath, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
        signal: options?.signal,
      }),
  };
}

/** @deprecated Use createGuestCheckoutPort. */
export const createGuestCheckoutAdapter = createGuestCheckoutPort;
