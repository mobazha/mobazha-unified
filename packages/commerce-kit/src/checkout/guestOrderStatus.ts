import type { CommerceHttpClient } from '../http';

export interface CommerceGuestOrderStatusItem {
  listingHash: string;
  listingTitle: string;
  listingSlug: string;
  contractType?: string;
  sellerPeerID: string;
  thumbnail?: string;
  quantity: number;
  unitPrice: string;
}

export interface CommerceGuestOrderStatusWire {
  orderToken: string;
  state?: string | number;
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
  items: CommerceGuestOrderStatusItem[];
  createdAt: string;
  updatedAt: string;
}

export interface CommerceGuestOrderStatus extends Omit<CommerceGuestOrderStatusWire, 'state'> {
  state: string;
}

export interface CommerceGuestOrderStatusOperationOptions {
  signal?: AbortSignal;
}

export interface CommerceGuestOrderStatusPort {
  getOrder(
    orderToken: string,
    options?: CommerceGuestOrderStatusOperationOptions
  ): Promise<CommerceGuestOrderStatus>;
}

export interface CommerceGuestOrderStatusPortPaths {
  orderPath?(orderToken: string): string;
}

const GUEST_ORDER_STATE_NAMES = [
  'AWAITING_PAYMENT',
  'PAYMENT_DETECTED',
  'FUNDED',
  'SHIPPED',
  'COMPLETED',
  'EXPIRED',
  'CANCELLED',
] as const;

export function normalizeCommerceGuestOrderState(state: string | number | undefined): string {
  if (typeof state === 'number' && Number.isFinite(state)) {
    const index = Math.trunc(state);
    return GUEST_ORDER_STATE_NAMES[index] ?? `UNKNOWN(${index})`;
  }

  const normalized = String(state ?? '')
    .trim()
    .toUpperCase();
  if (/^\d+$/.test(normalized)) {
    const index = Number(normalized);
    return GUEST_ORDER_STATE_NAMES[index] ?? `UNKNOWN(${index})`;
  }
  return normalized || 'UNKNOWN';
}

/** Normalize the public guest-order wire payload once for every product shell. */
export function normalizeCommerceGuestOrderStatus(
  raw: CommerceGuestOrderStatusWire
): CommerceGuestOrderStatus {
  const carrier = raw.carrier?.trim() || raw.shippingCarrier?.trim() || undefined;
  return {
    ...raw,
    state: normalizeCommerceGuestOrderState(raw.state),
    carrier,
    shippingCarrier: raw.shippingCarrier?.trim() || carrier,
  };
}

export function createGuestOrderStatusPort(
  client: CommerceHttpClient,
  paths: CommerceGuestOrderStatusPortPaths = {}
): CommerceGuestOrderStatusPort {
  const orderPath =
    paths.orderPath ??
    ((orderToken: string): string => `/v1/guest/orders/${encodeURIComponent(orderToken)}`);
  return {
    getOrder: (orderToken, options) =>
      client
        .request<CommerceGuestOrderStatusWire>(orderPath(orderToken), {
          signal: options?.signal,
        })
        .then(normalizeCommerceGuestOrderStatus),
  };
}
