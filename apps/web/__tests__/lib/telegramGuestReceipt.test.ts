import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildTelegramGuestReceiptPayload,
  sendGuestOrderReceiptToTelegram,
} from '@/lib/telegramGuestReceipt';

const routeToken = 'AbCdEfGhIjKlMnOpQrStUv';
const orderToken = `gst_${'a'.repeat(60)}`;
const buyerPortalToken = `bpt_${'b'.repeat(64)}`;

describe('Telegram guest receipt', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/');
  });

  it('builds a same-origin routed request without putting the private key in the endpoint', () => {
    const result = buildTelegramGuestReceiptPayload(
      `${window.location.origin}/guest-order/${orderToken}?tgWebAppStartParam=${routeToken}#buyerPortalToken=${buyerPortalToken}`,
      'signed-init-data'
    );
    expect(result).toEqual({
      endpoint: `/r/${routeToken}/v1/bridge/guest-order-receipt`,
      body: {
        initData: 'signed-init-data',
        orderToken,
        buyerPortalToken,
      },
    });
    expect(result?.endpoint).not.toContain(buyerPortalToken);
  });

  it('rejects external, unrouted, and malformed order links', () => {
    expect(
      buildTelegramGuestReceiptPayload(
        `https://evil.example/guest-order/${orderToken}?tgWebAppStartParam=${routeToken}`,
        'signed-init-data'
      )
    ).toBeNull();
    expect(
      buildTelegramGuestReceiptPayload(`/guest-order/${orderToken}`, 'signed-init-data')
    ).toBeNull();
    expect(
      buildTelegramGuestReceiptPayload(
        `/guest-order/not-an-order?tgWebAppStartParam=${routeToken}`,
        'signed-init-data'
      )
    ).toBeNull();
  });

  it('posts the receipt only to the routed same-origin endpoint', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    await sendGuestOrderReceiptToTelegram(
      `/guest-order/${orderToken}?tgWebAppStartParam=${routeToken}`,
      'signed-init-data',
      fetchImpl as unknown as typeof fetch
    );
    expect(fetchImpl).toHaveBeenCalledWith(`/r/${routeToken}/v1/bridge/guest-order-receipt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData: 'signed-init-data', orderToken }),
    });
  });
});
