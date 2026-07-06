const ROUTE_TOKEN_PATTERN = /^[A-Za-z0-9_-]{22}$/;
const ORDER_TOKEN_PATTERN = /^gst_[A-Za-z0-9_-]{6,60}$/;
const BUYER_PORTAL_TOKEN_PATTERN = /^bpt_[0-9a-f]{64}$/;

export interface TelegramGuestReceiptPayload {
  endpoint: string;
  body: {
    initData: string;
    orderToken: string;
    buyerPortalToken?: string;
  };
}

export function buildTelegramGuestReceiptPayload(
  orderUrl: string,
  initData: string
): TelegramGuestReceiptPayload | null {
  if (!initData.trim()) return null;
  try {
    const parsed = new URL(orderUrl, window.location.origin);
    if (parsed.origin !== window.location.origin) return null;
    const orderMatch = parsed.pathname.match(/^\/guest-order\/([^/]+)\/?$/);
    const orderToken = orderMatch?.[1] ? decodeURIComponent(orderMatch[1]) : '';
    const routeToken = parsed.searchParams.get('tgWebAppStartParam') ?? '';
    const fragment = new URLSearchParams(parsed.hash.startsWith('#') ? parsed.hash.slice(1) : '');
    const buyerPortalToken = fragment.get('buyerPortalToken') ?? '';
    if (
      !ORDER_TOKEN_PATTERN.test(orderToken) ||
      !ROUTE_TOKEN_PATTERN.test(routeToken) ||
      (buyerPortalToken && !BUYER_PORTAL_TOKEN_PATTERN.test(buyerPortalToken))
    ) {
      return null;
    }
    return {
      endpoint: `/r/${routeToken}/v1/bridge/guest-order-receipt`,
      body: {
        initData,
        orderToken,
        ...(buyerPortalToken ? { buyerPortalToken } : {}),
      },
    };
  } catch {
    return null;
  }
}

export async function sendGuestOrderReceiptToTelegram(
  orderUrl: string,
  initData: string,
  fetchImpl: typeof fetch = fetch
): Promise<void> {
  const payload = buildTelegramGuestReceiptPayload(orderUrl, initData);
  if (!payload) throw new Error('Invalid Telegram guest receipt payload');
  const response = await fetchImpl(payload.endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload.body),
  });
  if (!response.ok) throw new Error(`Telegram receipt request failed: ${response.status}`);
}
