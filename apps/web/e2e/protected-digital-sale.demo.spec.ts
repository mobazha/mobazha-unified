// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

/**
 * Demo 0005 v2 — Protected Digital Sale (Seller-led Deal Link).
 * Manifest: mobazha_hosting/docs/demos/0005-protected-digital-sale/demo.md
 *
 * A/A narrative:
 * - Primary: Seller · Mira (create + share locked Deal Link)
 * - Supporting: Buyer · Jordan (pay once → open Access verified)
 */

import { expect, test } from '@playwright/test';
import * as path from 'path';
import {
  PRECOVER_INIT,
  armCover,
  focusOn,
  fundAddressOnAnvil,
  loginRecordedContext,
  primeTransition,
  reveal,
  saveSegment,
  showCard,
  showChapter,
  showEndCard,
} from './demo-film-harness';

const OUT_DIR = path.join(__dirname, '..', 'demo-output', 'protected-digital-sale');
const LISTING_SLUG = process.env.DEMO_LISTING_SLUG || 'creator-launch-pack';
const STORE_NAME = process.env.DEMO_STORE_NAME || 'Northbound Studio';
const PRODUCT_TITLE = process.env.DEMO_PRODUCT_TITLE || 'Creator Launch Pack';
const PRICE_ETH = process.env.DEMO_PRICE_ETH || '0.025';

const SELLER = { label: 'Seller · Mira', accent: '#d97706' };
const BUYER = { label: 'Buyer · Jordan', accent: '#059669' };

const HOOK_BIG = 'You send a file link.\nPayment and delivery stay disconnected.';
const HOOK_SMALL = 'A protected Deal Link locks the offer, verifies payment, and unlocks the file.';

async function muteChromeNoise(page: import('@playwright/test').Page): Promise<void> {
  await page
    .addStyleTag({
      content: `
      [class*="notification"] .badge,
      button:has(svg) span.absolute,
      .absolute.-top-1,
      .absolute.-right-1 { display: none !important; }
    `,
    })
    .catch(() => {});
}

/** Hide non-Active rows (Closed still list via API; DB purge is preferred). */
async function hideInactiveDealLinkRows(page: import('@playwright/test').Page): Promise<void> {
  await page
    .addStyleTag({
      content: `
      [data-testid^="deal-link-row-"]:has([data-status]:not([data-status="active"])) {
        display: none !important;
      }
    `,
    })
    .catch(() => {});
  await page.evaluate(() => {
    document.querySelectorAll('[data-testid^="deal-link-row-"]').forEach(row => {
      const status = row.querySelector('[data-status]')?.getAttribute('data-status') || '';
      if (status && status !== 'active') {
        (row as HTMLElement).style.display = 'none';
      }
    });
  });
}

test('Demo 0005: protected digital sale v2', async ({ browser }) => {
  test.setTimeout(15 * 60 * 1000);

  const sellerCtx = await loginRecordedContext(
    browser,
    OUT_DIR,
    'testuser1',
    1.08,
    '/admin/deal-links'
  );
  const buyerCtx = await loginRecordedContext(browser, OUT_DIR, 'testuser2', 1, '/orders');

  // ── Segment 1 · Seller: hook → create Deal Link → shareable row ──
  const create = await sellerCtx.newPage();
  await create.addInitScript(PRECOVER_INIT);
  await primeTransition(create, HOOK_BIG, HOOK_SMALL);
  await create.goto(`/admin/deal-links/new?dealProduct=${encodeURIComponent(LISTING_SLUG)}`, {
    waitUntil: 'domcontentloaded',
    timeout: 90000,
  });
  await expect(create.getByTestId('create-deal-link-form')).toBeVisible({ timeout: 60000 });
  await muteChromeNoise(create);
  await reveal(create);
  await showCard(create, HOOK_BIG, HOOK_SMALL);
  await showChapter(
    create,
    1,
    SELLER,
    'Create a protected offer',
    'Lock price, deliverables, and buyer protection into one Deal Link.'
  );
  await expect(create.getByTestId('create-deal-link-form')).toContainText(PRODUCT_TITLE, {
    timeout: 30000,
  });
  await focusOn(create.getByTestId('deal-link-what-is'), 3200);
  const price = create.locator('#deal-price');
  await expect(price).toBeEnabled({ timeout: 30000 });
  await price.fill(PRICE_ETH);
  const note = create.locator('#deal-note');
  await note.fill(
    'Private offer: one payment unlocks the Creator Launch Pack. Terms freeze at acceptance.'
  );
  await create.waitForTimeout(1800);
  await focusOn(create.getByTestId('create-deal-link-form'), 4200);
  const createBtn = create.getByTestId('admin-deal-links-create-link');
  await expect(createBtn).toBeEnabled({ timeout: 45000 });
  await createBtn.click();
  await create.waitForURL(/\/admin\/deal-links\/?(\?|$)/, {
    timeout: 60000,
    waitUntil: 'domcontentloaded',
  });
  await expect(create.getByText(PRODUCT_TITLE).first()).toBeVisible({ timeout: 45000 });
  await reveal(create);
  await hideInactiveDealLinkRows(create);
  await showChapter(
    create,
    2,
    SELLER,
    'Share the locked link',
    'The live link is ready — terms freeze when a buyer accepts.'
  );
  // After DB purge there is a single Active row. Prefer role locators — prod SaaS
  // image may not yet ship deal-link-open-* testids.
  const activeRow = create.locator('[data-testid^="deal-link-row-"]').first();
  await expect(activeRow).toBeVisible({ timeout: 30000 });
  await activeRow.evaluate(el => el.scrollIntoView({ block: 'center', inline: 'nearest' }));
  const openLink = activeRow.getByRole('link', { name: /^open$/i });
  await expect(openLink).toBeVisible({ timeout: 30000 });
  const href = (await openLink.getAttribute('href')) || '';
  const tokenMatch = href.match(/\/deal\/([^/?#]+)/);
  expect(tokenMatch?.[1], 'public Deal Link token').toBeTruthy();
  const publicToken = tokenMatch![1];
  await focusOn(activeRow, 5200);
  const copyBtn = activeRow.getByRole('button', { name: /^copy$/i });
  if (await copyBtn.isVisible().catch(() => false)) {
    await copyBtn.click();
    await create.waitForTimeout(2200);
  }
  await create.waitForTimeout(2000);
  await saveSegment(create, OUT_DIR, 'seg1-seller-create');

  // ── Segment 2 · Buyer: review offer → pay ──
  const deal = await buyerCtx.newPage();
  await deal.addInitScript(PRECOVER_INIT);
  await deal.goto(`/deal/${publicToken}`, {
    waitUntil: 'domcontentloaded',
    timeout: 90000,
  });
  await expect(deal.getByTestId('deal-link-page')).toBeVisible({ timeout: 45000 });
  await muteChromeNoise(deal);
  await reveal(deal);
  await showChapter(
    deal,
    3,
    BUYER,
    'Review the exact promise',
    `${STORE_NAME}, ${PRICE_ETH} ETH, deliverables, and protection in one offer.`
  );
  // Live profile fallback may resolve after catalog paint.
  await expect(deal.getByTestId('deal-link-page')).toContainText(STORE_NAME, { timeout: 45000 });
  await expect(deal.getByTestId('deal-link-terms-card')).toContainText(PRODUCT_TITLE, {
    timeout: 15000,
  });
  await focusOn(deal.getByTestId('deal-link-terms-card'), 4500);
  await deal.evaluate(() => window.sessionStorage.setItem('checkout_selected_token', 'ETH'));
  await focusOn(deal.getByTestId('deal-link-fee-breakdown'), 2800);
  const acceptBtn = deal.getByTestId('deal-link-accept-desktop');
  await expect(acceptBtn).toBeEnabled({ timeout: 45000 });
  // Dip before SPA navigation so chapter-3 chip does not sit on payment skeletons.
  await armCover(deal);
  await acceptBtn.click();
  if (
    !(await deal
      .waitForURL(url => url.pathname === '/payment' && url.searchParams.has('orderID'), {
        timeout: 25000,
        waitUntil: 'domcontentloaded',
      })
      .then(() => true)
      .catch(() => false))
  ) {
    // Stale quote / transient 409 — refresh page and retry once.
    await deal.reload({ waitUntil: 'domcontentloaded' });
    await expect(deal.getByTestId('deal-link-page')).toBeVisible({ timeout: 45000 });
    await reveal(deal);
    await expect(acceptBtn).toBeEnabled({ timeout: 45000 });
    await armCover(deal);
    await acceptBtn.click();
  }
  await deal.waitForURL(url => url.pathname === '/payment' && url.searchParams.has('orderID'), {
    timeout: 60000,
    waitUntil: 'domcontentloaded',
  });
  const orderID = new URL(deal.url()).searchParams.get('orderID') || '';
  expect(orderID).toBeTruthy();
  // Warm seller order view so funding/session registration is less flaky (0007 pattern).
  const sellerWarm = await sellerCtx.newPage();
  await sellerWarm
    .goto(`/orders/${encodeURIComponent(orderID)}?role=sale`, {
      waitUntil: 'domcontentloaded',
      timeout: 90000,
    })
    .catch(() => {});
  await sellerWarm
    .getByTestId('order-status-card')
    .waitFor({ state: 'visible', timeout: 60000 })
    .catch(() => {});
  await sellerWarm.close();
  await expect(deal.getByTestId('payment-method-summary')).toContainText(/ETH/, { timeout: 45000 });
  await reveal(deal);
  const toggle = deal.getByTestId('payment-protection-toggle');
  if (await toggle.isVisible({ timeout: 5000 }).catch(() => false)) {
    if ((await toggle.getAttribute('data-state')) === 'checked') await toggle.click();
  }
  await showChapter(
    deal,
    4,
    BUYER,
    'Pay once',
    `A unique address watches the exact ${PRICE_ETH} ETH payment.`
  );
  const createSession = deal.getByTestId('payment-create-session');
  await expect(createSession).toBeEnabled({ timeout: 45000 });
  await createSession.click();
  const payment = deal.getByTestId('external-wallet-payment');
  if (!(await payment.isVisible({ timeout: 20000 }).catch(() => false))) {
    const retryError = deal.getByRole('button', { name: /^retry$/i });
    const closeError = deal.getByRole('button', { name: /^close$/i });
    for (let attempt = 0; attempt < 6; attempt += 1) {
      if (await payment.isVisible({ timeout: 2500 }).catch(() => false)) break;
      if (await retryError.isVisible().catch(() => false)) {
        await retryError.click();
        await deal.waitForTimeout(1500);
        continue;
      }
      if (await closeError.isVisible().catch(() => false)) await closeError.click();
      if (await createSession.isEnabled().catch(() => false)) {
        await createSession.click();
      } else {
        break;
      }
      await deal.waitForTimeout(1500);
    }
  }
  await expect(payment).toBeVisible({ timeout: 90000 });
  const address = (
    (await deal.getByTestId('external-wallet-payment-address').textContent()) || ''
  ).trim();
  const amount = (
    (await deal.getByTestId('external-wallet-payment-amount').textContent()) || ''
  ).trim();
  expect(address).toMatch(/^0x[0-9a-f]{40}$/i);
  expect(amount).toMatch(new RegExp(`^${PRICE_ETH.replace('.', '\\.')}0*$`));
  await focusOn(payment, 4200);
  const txHash = await fundAddressOnAnvil(address, amount);
  expect(txHash).toMatch(/^0x[0-9a-f]{64}$/i);
  await deal.waitForURL(url => url.pathname === '/checkout/confirmation', {
    timeout: 150000,
    waitUntil: 'domcontentloaded',
  });
  await expect(deal.getByTestId('order-confirmation-page')).toBeVisible({ timeout: 30000 });
  // Brief beat only — do not hang on confirmation copy.
  await deal.waitForTimeout(2200);
  await saveSegment(deal, OUT_DIR, 'seg2-buyer-pay');

  // ── Segment 3 · Buyer: unlock + open artifact ──
  const order = await buyerCtx.newPage();
  await order.addInitScript(PRECOVER_INIT);
  await order.goto(`/orders/${encodeURIComponent(orderID)}?role=purchase`, {
    waitUntil: 'domcontentloaded',
    timeout: 90000,
  });
  await expect(order.getByTestId('order-status-card')).toBeVisible({ timeout: 60000 });
  await expect(order.locator('#digital-downloads')).toBeVisible({ timeout: 90000 });
  await muteChromeNoise(order);
  await reveal(order);
  await showChapter(
    order,
    5,
    BUYER,
    'Open what you bought',
    'Verified payment grants the real pack — no email, no seller approval.'
  );
  const downloads = order.locator('#digital-downloads');
  await focusOn(downloads, 4000);
  const deliveryLink = downloads
    .getByRole('link')
    .filter({ hasText: /northbound|creator-launch|Access|http/i })
    .or(downloads.locator('a[href*="creator-launch-pack"]'))
    .first();
  await expect(deliveryLink).toBeVisible({ timeout: 20000 });
  const [artifact] = await Promise.all([buyerCtx.waitForEvent('page'), deliveryLink.click()]);
  await artifact.waitForLoadState('domcontentloaded');
  await expect(artifact.getByText('Access verified')).toBeVisible({ timeout: 15000 });
  await expect(artifact.getByText('Creator Launch Pack')).toBeVisible();
  await artifact.waitForTimeout(6500);
  await saveSegment(artifact, OUT_DIR, 'seg3-access-artifact');

  // ── Segment 4 · Payoff hold on artifact proof line + end card ──
  const payoff = await buyerCtx.newPage();
  await payoff.addInitScript(PRECOVER_INIT);
  await payoff.goto((await artifact.url()) || DELIVERY_FALLBACK(), {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  });
  await expect(payoff.getByText('Access verified')).toBeVisible({ timeout: 15000 });
  await reveal(payoff);
  await focusOn(payoff.locator('.hero, main, body').first(), 7000);
  await showEndCard(
    payoff,
    'Mobazha',
    'Protected offer. Automatic delivery.\nmobazha.org · recorded on Mobazha test network'
  );
  await saveSegment(payoff, OUT_DIR, 'seg4-payoff');

  await sellerCtx.close();
  await buyerCtx.close();
});

function DELIVERY_FALLBACK(): string {
  return 'http://kit.northbound.localhost:18777/creator-launch-pack';
}
