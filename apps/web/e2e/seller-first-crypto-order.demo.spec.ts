// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

/**
 * Demo 0007 — Seller First Crypto Order (SaaS, Anvil ETH, physical good).
 * Manifest: mobazha_hosting/docs/demos/0007-seller-first-crypto-order/demo.md
 *
 * STYLE pacing:
 * - Frame 0 = pain hook (full-screen card), never a chapter interstitial.
 * - Narration = lower-left chapter chips on live UI (not full-screen cards).
 * - Navigations + persona switches = short silent dark dip, then chip + UI.
 * - Only full-screen text cards: opening hook + end card.
 */

import { expect, test } from '@playwright/test';
import * as path from 'path';
import {
  PRECOVER_INIT,
  focusOn,
  fundAddressOnAnvil,
  loginRecordedContext,
  primeTransition,
  reveal,
  revealReady,
  saveSegment,
  settleNoConnecting,
  showCard,
  showChapter,
  showEndCard,
} from './demo-film-harness';

const OUT_DIR = path.join(__dirname, '..', 'demo-output', 'seller-first-crypto-order');
const SELLER_PEER = process.env.DEMO_SELLER_PEER_ID || '';
const LISTING_SLUG = process.env.DEMO_LISTING_SLUG || '';
const PRODUCT_TITLE = process.env.DEMO_PRODUCT_TITLE || 'Titan Leather Hardware Wallet Case';
const STORE_NAME = process.env.DEMO_STORE_NAME || 'Forge Signal Supply';

const SELLER = { label: 'Seller · Elena', accent: '#d97706' };
const BUYER = { label: 'Buyer · Jordan', accent: '#059669' };

const HOOK_BIG = 'Payment rails said no.\nYour first crypto order still ships.';
const HOOK_SMALL = 'A SaaS storefront can take a real verified crypto payment end to end.';

async function centerInViewport(
  page: import('@playwright/test').Page,
  testId: string
): Promise<void> {
  await page.evaluate(id => {
    document.querySelector(`[data-testid="${id}"]`)?.scrollIntoView({
      block: 'center',
      inline: 'nearest',
    });
  }, testId);
  await page.waitForTimeout(250);
}

async function warmRoute(
  ctx: import('@playwright/test').BrowserContext,
  url: string,
  readyText: string | RegExp
): Promise<void> {
  const warm = await ctx.newPage();
  await warm.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 }).catch(() => {});
  await warm
    .getByText(readyText)
    .first()
    .waitFor({ state: 'visible', timeout: 60000 })
    .catch(() => {});
  await warm.waitForTimeout(600);
  await warm.close();
}

test('Demo 0007: seller first crypto order', async ({ browser }) => {
  test.setTimeout(15 * 60 * 1000);
  expect(SELLER_PEER, 'DEMO_SELLER_PEER_ID is required').toBeTruthy();
  expect(LISTING_SLUG, 'DEMO_LISTING_SLUG is required').toBeTruthy();

  const sellerStoreCtx = await loginRecordedContext(
    browser,
    OUT_DIR,
    'testuser1',
    1,
    '/admin/orders'
  );
  const sellerWorkCtx = await loginRecordedContext(
    browser,
    OUT_DIR,
    'testuser1',
    1.08,
    '/admin/orders'
  );
  const buyerCtx = await loginRecordedContext(browser, OUT_DIR, 'testuser2', 1, '/orders');

  // ── Segment 1 · Seller: hook → storefront + listing ──
  await warmRoute(sellerStoreCtx, `/store/${SELLER_PEER}`, STORE_NAME);
  const sellerStore = await sellerStoreCtx.newPage();
  // First frames must be the pain hook, not a chapter interstitial.
  await primeTransition(sellerStore, HOOK_BIG, HOOK_SMALL);
  await sellerStore.addInitScript(PRECOVER_INIT);
  await sellerStore.goto(`/store/${SELLER_PEER}`, {
    waitUntil: 'domcontentloaded',
    timeout: 90000,
  });
  await expect(sellerStore.getByText(STORE_NAME).first()).toBeVisible({ timeout: 60000 });
  await showCard(sellerStore, HOOK_BIG, HOOK_SMALL, 5800);
  await showChapter(
    sellerStore,
    1,
    SELLER,
    'Open a ready storefront',
    'The store and listing are live before the first buyer arrives.',
    2200
  );
  const featuredTitle = sellerStore.getByRole('heading', { name: /featured products/i }).first();
  if (await featuredTitle.isVisible({ timeout: 8000 }).catch(() => false)) {
    await featuredTitle.scrollIntoViewIfNeeded();
  }
  const productCard = sellerStore
    .getByRole('link', { name: new RegExp(PRODUCT_TITLE, 'i') })
    .first();
  await focusOn(productCard, 3400);
  // SPA nav — no dark floor (armCover here was producing 2–3s blank pages).
  await productCard.click();
  await expect(sellerStore.getByRole('heading', { name: PRODUCT_TITLE }).first()).toBeVisible({
    timeout: 60000,
  });
  await settleNoConnecting(sellerStore);
  await showChapter(
    sellerStore,
    2,
    SELLER,
    'Publish one physical offer',
    'Price, shipping promise, and product stay buyer-visible.',
    2000
  );
  await focusOn(sellerStore.getByText(/0\.02\s*ETH/i).first(), 4000);
  await saveSegment(sellerStore, OUT_DIR, 'seg1-seller-storefront');

  // ── Segment 2 · Buyer: checkout + pay ──
  await warmRoute(buyerCtx, `/store/${SELLER_PEER}`, PRODUCT_TITLE);
  const buyer = await buyerCtx.newPage();
  // Silent floor into buyer — persona chip carries the switch (no full-screen card).
  await buyer.addInitScript(PRECOVER_INIT);
  await buyer.goto(`/store/${SELLER_PEER}`, {
    waitUntil: 'domcontentloaded',
    timeout: 90000,
  });
  await revealReady(buyer, buyer.getByText(PRODUCT_TITLE).first());
  await showChapter(
    buyer,
    3,
    BUYER,
    'Place the first order',
    'Checkout keeps item, address, and shipping together.',
    2000
  );
  const buyerProduct = buyer.getByRole('link', { name: new RegExp(PRODUCT_TITLE, 'i') }).first();
  await focusOn(buyerProduct, 2200);
  await buyerProduct.click();
  await expect(buyer.getByTestId('product-detail-buy-now').first()).toBeVisible({
    timeout: 60000,
  });
  await settleNoConnecting(buyer);
  await focusOn(buyer.getByTestId('product-detail-buy-now').first(), 1600);
  await buyer.getByTestId('product-detail-buy-now').first().click();
  await buyer.waitForURL(url => url.pathname === '/checkout', { timeout: 45000 });
  const checkout = buyer.getByTestId('checkout-page');
  await expect(checkout).toBeVisible({ timeout: 60000 });
  await settleNoConnecting(buyer);
  const submitOrder = buyer.getByTestId('checkout-submit-btn');
  await expect(submitOrder).toBeEnabled({ timeout: 45000 });
  await focusOn(checkout, 4000);
  await buyer.evaluate(() => window.sessionStorage.setItem('checkout_selected_token', 'ETH'));
  await submitOrder.click();
  await buyer.waitForURL(url => url.pathname === '/payment' && url.searchParams.has('orderID'), {
    timeout: 90000,
  });
  const orderID = new URL(buyer.url()).searchParams.get('orderID') || '';
  expect(orderID, 'checkout must create a real order').toBeTruthy();
  await expect(buyer.getByTestId('payment-method-summary')).toBeVisible({ timeout: 60000 });
  await settleNoConnecting(buyer);
  await expect(buyer.getByTestId('payment-method-summary')).toContainText(/ETH/, {
    timeout: 45000,
  });

  const protectionToggle = buyer.getByTestId('payment-protection-toggle');
  await expect(protectionToggle).toBeVisible({ timeout: 45000 });
  if ((await protectionToggle.getAttribute('data-state')) === 'checked') {
    await protectionToggle.click();
  }

  const sellerWarm = (async () => {
    const warm = await sellerWorkCtx.newPage();
    await warm.goto(`/orders/${encodeURIComponent(orderID)}?role=sale`, {
      waitUntil: 'domcontentloaded',
      timeout: 90000,
    });
    await expect(warm.getByTestId('order-status-card')).toBeVisible({ timeout: 60000 });
    await warm.close();
  })();

  await showChapter(
    buyer,
    4,
    BUYER,
    'Pay the monitored total',
    'A unique Safe address watches the exact ETH amount.',
    2000
  );
  await sellerWarm;
  const createPaymentSession = buyer.getByTestId('payment-create-session');
  await expect(createPaymentSession).toBeEnabled({ timeout: 45000 });
  await focusOn(createPaymentSession, 1400);
  await createPaymentSession.click();
  const paymentCard = buyer.getByTestId('external-wallet-payment');
  if (!(await paymentCard.isVisible({ timeout: 20000 }).catch(() => false))) {
    const closeError = buyer.getByRole('button', { name: /^close$/i });
    for (let attempt = 0; attempt < 4; attempt += 1) {
      if (await paymentCard.isVisible({ timeout: 2000 }).catch(() => false)) break;
      if (await closeError.isVisible().catch(() => false)) await closeError.click();
      if (await createPaymentSession.isEnabled().catch(() => false)) {
        await createPaymentSession.click();
      } else {
        break;
      }
      await buyer.waitForTimeout(1000);
    }
  }
  await expect(paymentCard).toBeVisible({ timeout: 60000 });
  await reveal(buyer);
  const paymentAddress = (
    (await buyer.getByTestId('external-wallet-payment-address').textContent()) || ''
  ).trim();
  const paymentAmountRaw = (
    (await buyer.getByTestId('external-wallet-payment-amount').textContent()) || ''
  ).trim();
  const paymentAmount = paymentAmountRaw.replace(/[^\d.]/g, '');
  expect(paymentAddress).toMatch(/^0x[0-9a-f]{40}$/i);
  expect(paymentAmount).toMatch(/^\d+(?:\.\d+)?$/);
  expect(Number(paymentAmount)).toBeGreaterThan(0.02);
  await focusOn(paymentCard, 7200);
  const txHash = await fundAddressOnAnvil(paymentAddress, paymentAmount);
  expect(txHash).toMatch(/^0x[0-9a-f]{64}$/i);
  await buyer.waitForURL(url => url.pathname === '/checkout/confirmation', {
    timeout: 150000,
  });
  await revealReady(buyer, buyer.getByTestId('order-confirmation-page'));
  await centerInViewport(buyer, 'order-confirmation-page');
  await showChapter(
    buyer,
    5,
    BUYER,
    'Payment verified',
    'The seller receives this same paid order.',
    2000
  );
  await buyer.waitForTimeout(6500);
  await saveSegment(buyer, OUT_DIR, 'seg2-buyer-checkout-payment');

  // ── Segment 3 · Seller: accept + ship + packing slip ──
  await warmRoute(
    sellerWorkCtx,
    `/orders/${encodeURIComponent(orderID)}?role=sale`,
    /ship|accept|complete|payment/i
  );
  const fulfillment = await sellerWorkCtx.newPage();
  await fulfillment.addInitScript(PRECOVER_INIT);
  await fulfillment.goto(`/orders/${encodeURIComponent(orderID)}?role=sale`, {
    waitUntil: 'domcontentloaded',
    timeout: 90000,
  });
  const sellerStatus = fulfillment.getByTestId('order-status-card');
  await revealReady(fulfillment, sellerStatus);
  await showChapter(
    fulfillment,
    6,
    SELLER,
    'A paid order arrives',
    'Accept settlement and prepare fulfillment.',
    2000
  );
  await focusOn(sellerStatus, 2200);
  const acceptOrder = fulfillment.getByTestId('order-action-accept');
  if (await acceptOrder.isVisible({ timeout: 8000 }).catch(() => false)) {
    await acceptOrder.click();
    const acceptDialog = fulfillment.getByTestId('accept-order-dialog');
    await expect(acceptDialog).toBeVisible();
    await expect(acceptDialog.getByTestId('receiving-account-select')).not.toHaveValue('');
    await fulfillment.waitForTimeout(1600);
    await acceptDialog.getByTestId('accept-order-confirm').click();
    await expect(acceptDialog).toBeHidden({ timeout: 120000 });
  }
  const shipOrder = fulfillment.getByTestId('order-action-ship');
  await expect(shipOrder).toBeVisible({ timeout: 60000 });
  await showChapter(
    fulfillment,
    7,
    SELLER,
    'Ship with tracking',
    'Carrier, tracking, and packing slip stay on the same order.',
    1800
  );
  await shipOrder.click();
  const shipDialog = fulfillment.getByTestId('ship-order-dialog');
  await expect(shipDialog).toBeVisible();
  await shipDialog.getByTestId('ship-order-tracking').fill('1Z999AA10123456784');
  await shipDialog
    .getByTestId('ship-order-note')
    .fill('Packed in a rigid sleeve. Signature on delivery.');
  await fulfillment.waitForTimeout(1800);
  await shipDialog.getByTestId('ship-order-confirm').click();
  await expect(shipDialog).toBeHidden({ timeout: 60000 });
  await expect(sellerStatus).toContainText(/shipped|fulfilled/i, { timeout: 60000 });
  await focusOn(sellerStatus, 2600);

  const packingSlip = fulfillment.getByTestId('order-packing-slip');
  await expect(packingSlip).toBeVisible({ timeout: 15000 });
  await packingSlip.click();
  const packingDialog = fulfillment.getByTestId('packing-slip-dialog');
  await expect(packingDialog).toBeVisible({ timeout: 15000 });
  await expect(packingDialog).toContainText(PRODUCT_TITLE);
  await fulfillment.waitForTimeout(5000);
  await fulfillment.keyboard.press('Escape');
  await expect(packingDialog).toBeHidden({ timeout: 10000 });
  await focusOn(sellerStatus, 3000);
  await saveSegment(fulfillment, OUT_DIR, 'seg3-seller-fulfillment');

  // ── Segment 4 · Buyer: confirm receipt ──
  await warmRoute(
    buyerCtx,
    `/orders/${encodeURIComponent(orderID)}?role=purchase`,
    /ship|complete|confirm/i
  );
  const completion = await buyerCtx.newPage();
  await completion.addInitScript(PRECOVER_INIT);
  await completion.goto(`/orders/${encodeURIComponent(orderID)}?role=purchase`, {
    waitUntil: 'domcontentloaded',
    timeout: 90000,
  });
  const buyerStatus = completion.getByTestId('order-status-card');
  await revealReady(completion, buyerStatus);
  const completeOrder = completion.getByTestId('order-action-complete');
  await expect(completeOrder).toBeVisible({ timeout: 60000 });
  await centerInViewport(completion, 'order-status-card');
  await showChapter(
    completion,
    8,
    BUYER,
    'Confirm receipt',
    'The shipped order reaches its completed state.',
    1800
  );
  await focusOn(completeOrder, 1600);
  await completeOrder.click();
  const confirmDialog = completion.getByTestId('confirm-receipt-dialog');
  if (await confirmDialog.isVisible({ timeout: 5000 }).catch(() => false)) {
    await completion.waitForTimeout(1100);
    await confirmDialog.getByTestId('confirm-receipt-submit').click();
    await expect(confirmDialog).toBeHidden({ timeout: 60000 });
  }
  await expect(buyerStatus).toContainText(/complete|completed|finished/i, { timeout: 90000 });
  await centerInViewport(completion, 'order-status-card');
  await focusOn(buyerStatus, 4500);
  await saveSegment(completion, OUT_DIR, 'seg4-buyer-complete');

  // ── Segment 5 · Seller payoff ──
  await warmRoute(
    sellerWorkCtx,
    `/orders/${encodeURIComponent(orderID)}?role=sale`,
    /complete|ship|fulfill/i
  );
  const payoff = await sellerWorkCtx.newPage();
  await payoff.addInitScript(PRECOVER_INIT);
  await payoff.goto(`/orders/${encodeURIComponent(orderID)}?role=sale`, {
    waitUntil: 'domcontentloaded',
    timeout: 90000,
  });
  const payoffStatus = payoff.getByTestId('order-status-card');
  await revealReady(payoff, payoffStatus);
  await expect(payoffStatus).toContainText(/complete|completed|shipped|fulfilled/i, {
    timeout: 60000,
  });
  await centerInViewport(payoff, 'order-status-card');
  await showChapter(
    payoff,
    9,
    SELLER,
    'First crypto order done',
    'Same order, paid and fulfilled, on your store.',
    2200
  );
  await focusOn(payoffStatus, 12000);
  await showEndCard(
    payoff,
    'Mobazha',
    'Sell with crypto. Keep the store yours.\nmobazha.org · recorded on Mobazha test network',
    5600
  );
  await saveSegment(payoff, OUT_DIR, 'seg5-seller-payoff');

  await sellerStoreCtx.close();
  await sellerWorkCtx.close();
  await buyerCtx.close();
});
