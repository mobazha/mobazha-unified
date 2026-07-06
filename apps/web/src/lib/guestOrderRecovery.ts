import { resolveTokenIdForDisplay } from '@mobazha/core/data/tokens';
import { formatPrice, fromMinimalUnit } from '@mobazha/core/services/currencyService';

export const RECENT_GUEST_ORDERS_STORAGE_KEY = 'mobazha:recent-guest-orders:v1';

const MAX_RECENT_GUEST_ORDERS = 12;
const MAX_ORDER_TOKEN_LENGTH = 512;
const ORDER_TOKEN_PATTERN = /^[A-Za-z0-9_-]+$/;
const STORE_ROUTE_TOKEN_PATTERN = /^[A-Za-z0-9_-]{22}$/;

export interface RecentGuestOrder {
  orderToken: string;
  state: string;
  itemTitles: string[];
  paymentAmount?: string;
  paymentCoin?: string;
  createdAt: string;
  updatedAt: string;
  lastOpenedAt: string;
  storeRouteToken?: string;
}

export interface GuestOrderRecoveryTarget {
  orderToken: string;
  href: string;
  storeRouteToken?: string;
}

export interface GuestOrderRecoveryStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface BuildGuestOrderRecoveryHrefOptions {
  storeRouteToken?: string | null;
  buyerPortalToken?: string;
  origin?: string;
}

type RecentGuestOrderInput = Omit<RecentGuestOrder, 'lastOpenedAt'> & {
  lastOpenedAt?: string;
};

export function formatRecentGuestOrderPayment(order: {
  paymentAmount?: string;
  paymentCoin?: string;
}): string {
  if (!order.paymentAmount || !order.paymentCoin) return '';
  const paymentCoin = resolveTokenIdForDisplay(order.paymentCoin);
  const amount = fromMinimalUnit(order.paymentAmount, paymentCoin);
  if (!Number.isFinite(amount)) return '';
  return formatPrice(amount, paymentCoin, { showSymbol: false, showCode: true });
}

function defaultStorage(): GuestOrderRecoveryStorage | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

function isValidOrderToken(value: string): boolean {
  return (
    value.length >= 6 && value.length <= MAX_ORDER_TOKEN_LENGTH && ORDER_TOKEN_PATTERN.test(value)
  );
}

function safeDecodeURIComponent(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

export function buildGuestOrderRecoveryHref(
  orderToken: string,
  options: BuildGuestOrderRecoveryHrefOptions = {}
): string {
  const path = `/guest-order/${encodeURIComponent(orderToken)}`;
  const query =
    options.storeRouteToken && STORE_ROUTE_TOKEN_PATTERN.test(options.storeRouteToken)
      ? `?tgWebAppStartParam=${encodeURIComponent(options.storeRouteToken)}`
      : '';
  const fragment = options.buyerPortalToken
    ? `#buyerPortalToken=${encodeURIComponent(options.buyerPortalToken)}`
    : '';
  return `${options.origin ?? ''}${path}${query}${fragment}`;
}

/**
 * Accept a raw order token, a relative guest-order path, or a full order URL.
 * Only the local guest-order route is returned, so pasted external URLs cannot
 * become open redirects. A private buyer portal key is preserved for this
 * navigation but is never written to recent-order storage.
 */
export function parseGuestOrderRecoveryInput(input: string): GuestOrderRecoveryTarget | null {
  const candidate = input.trim();
  if (!candidate) return null;

  try {
    const url = new URL(candidate, 'https://recovery.invalid');
    const match = url.pathname.match(/\/guest-order\/([^/]+)\/?$/);
    if (match?.[1]) {
      const orderToken = safeDecodeURIComponent(match[1]);
      if (!orderToken || !isValidOrderToken(orderToken)) return null;

      const fragment = new URLSearchParams(url.hash.startsWith('#') ? url.hash.slice(1) : '');
      const buyerPortalToken =
        fragment.get('buyerPortalToken') || url.searchParams.get('buyerPortalToken');
      const requestedStoreRouteToken = url.searchParams.get('tgWebAppStartParam') || '';
      const storeRouteToken = STORE_ROUTE_TOKEN_PATTERN.test(requestedStoreRouteToken)
        ? requestedStoreRouteToken
        : undefined;
      const href = buildGuestOrderRecoveryHref(orderToken, {
        storeRouteToken,
        buyerPortalToken: buyerPortalToken || undefined,
      });
      return {
        orderToken,
        href,
        ...(storeRouteToken ? { storeRouteToken } : {}),
      };
    }
  } catch {
    // Fall through to raw-token validation.
  }

  if (!isValidOrderToken(candidate)) return null;
  return {
    orderToken: candidate,
    href: `/guest-order/${encodeURIComponent(candidate)}`,
  };
}

function normalizeRecentGuestOrder(value: unknown): RecentGuestOrder | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<RecentGuestOrder>;
  if (typeof candidate.orderToken !== 'string' || !isValidOrderToken(candidate.orderToken)) {
    return null;
  }

  const now = new Date().toISOString();
  return {
    orderToken: candidate.orderToken,
    state: typeof candidate.state === 'string' ? candidate.state : 'AWAITING_PAYMENT',
    itemTitles: Array.isArray(candidate.itemTitles)
      ? candidate.itemTitles
          .filter((title): title is string => typeof title === 'string' && title.trim().length > 0)
          .slice(0, 3)
          .map(title => title.trim().slice(0, 160))
      : [],
    paymentAmount:
      typeof candidate.paymentAmount === 'string' ? candidate.paymentAmount : undefined,
    paymentCoin: typeof candidate.paymentCoin === 'string' ? candidate.paymentCoin : undefined,
    createdAt: typeof candidate.createdAt === 'string' ? candidate.createdAt : now,
    updatedAt: typeof candidate.updatedAt === 'string' ? candidate.updatedAt : now,
    lastOpenedAt: typeof candidate.lastOpenedAt === 'string' ? candidate.lastOpenedAt : now,
    storeRouteToken:
      typeof candidate.storeRouteToken === 'string' &&
      STORE_ROUTE_TOKEN_PATTERN.test(candidate.storeRouteToken)
        ? candidate.storeRouteToken
        : undefined,
  };
}

export function loadRecentGuestOrders(
  storage: GuestOrderRecoveryStorage | undefined = defaultStorage()
): RecentGuestOrder[] {
  if (!storage) return [];
  try {
    const parsed = JSON.parse(storage.getItem(RECENT_GUEST_ORDERS_STORAGE_KEY) ?? '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(normalizeRecentGuestOrder)
      .filter((order): order is RecentGuestOrder => Boolean(order))
      .sort((a, b) => b.lastOpenedAt.localeCompare(a.lastOpenedAt))
      .slice(0, MAX_RECENT_GUEST_ORDERS);
  } catch {
    return [];
  }
}

export function rememberGuestOrder(
  input: RecentGuestOrderInput,
  storage: GuestOrderRecoveryStorage | undefined = defaultStorage()
): RecentGuestOrder[] {
  if (!storage) return [];
  const normalized = normalizeRecentGuestOrder({
    ...input,
    lastOpenedAt: input.lastOpenedAt ?? new Date().toISOString(),
  });
  if (!normalized) return loadRecentGuestOrders(storage);

  const existing = loadRecentGuestOrders(storage).find(
    order => order.orderToken === normalized.orderToken
  );
  const nextOrder: RecentGuestOrder = {
    ...existing,
    ...normalized,
    createdAt: existing?.createdAt ?? normalized.createdAt,
  };
  const next = [
    nextOrder,
    ...loadRecentGuestOrders(storage).filter(order => order.orderToken !== normalized.orderToken),
  ].slice(0, MAX_RECENT_GUEST_ORDERS);

  try {
    storage.setItem(RECENT_GUEST_ORDERS_STORAGE_KEY, JSON.stringify(next));
  } catch {
    return loadRecentGuestOrders(storage);
  }
  return next;
}

export function forgetGuestOrder(
  orderToken: string,
  storage: GuestOrderRecoveryStorage | undefined = defaultStorage()
): RecentGuestOrder[] {
  if (!storage) return [];
  const next = loadRecentGuestOrders(storage).filter(order => order.orderToken !== orderToken);
  try {
    if (next.length === 0) {
      storage.removeItem(RECENT_GUEST_ORDERS_STORAGE_KEY);
    } else {
      storage.setItem(RECENT_GUEST_ORDERS_STORAGE_KEY, JSON.stringify(next));
    }
  } catch {
    return loadRecentGuestOrders(storage);
  }
  return next;
}
