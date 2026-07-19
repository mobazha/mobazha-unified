// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import { expect, test } from '@playwright/test';
import * as path from 'path';
import {
  PRECOVER_INIT,
  focusOn,
  fundAddressOnAnvil,
  loginRecordedContext,
  reveal,
  saveSegment,
  showCard,
  showChapter,
  showEndCard,
} from './demo-film-harness';

const TOKEN = process.env.DEMO_DEAL_TOKEN || '';
const OUT_DIR = path.join(__dirname, '..', 'demo-output', 'protected-digital-sale');
const BUYER = { label: 'Buyer · Jordan', accent: '#059669' };

test('Demo 0005: protected digital sale', async ({ browser }) => {
  test.setTimeout(10 * 60 * 1000);
  expect(TOKEN, 'DEMO_DEAL_TOKEN is required').toBeTruthy();

  const context = await loginRecordedContext(browser, OUT_DIR, 'testuser2', 1, '/orders');
  const sellerContext = await loginRecordedContext(
    browser,
    OUT_DIR,
    'testuser1',
    1.08,
    '/admin/orders'
  );
  const deal = await context.newPage();
  await deal.addInitScript(PRECOVER_INIT);
  await deal.goto(`/deal/${TOKEN}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await expect(deal.getByTestId('deal-link-page')).toBeVisible({ timeout: 45000 });
  await expect(deal.getByTestId('deal-link-terms-card')).toContainText('Launch checklist');
  await showCard(
    deal,
    'You paid for a digital product.\nNow you wait for a delivery email.',
    'A protected offer can verify payment and unlock access automatically.'
  );
  await showChapter(
    deal,
    1,
    BUYER,
    'Review the exact promise',
    'Price, deliverables, protection, and delivery stay in one fixed offer.'
  );
  await focusOn(deal.getByTestId('deal-link-terms-card'), 3500);
  await showChapter(
    deal,
    2,
    BUYER,
    'Accept one protected offer',
    'The buyer sees the complete total before creating an order.'
  );
  await deal.evaluate(() => window.sessionStorage.setItem('checkout_selected_token', 'ETH'));
  await focusOn(deal.getByTestId('deal-link-fee-breakdown'), 2500);
  await deal.getByTestId('deal-link-accept-desktop').click();
  await deal.waitForURL(url => url.pathname === '/payment' && url.searchParams.has('orderID'), {
    timeout: 60000,
    waitUntil: 'domcontentloaded',
  });
  const orderID = new URL(deal.url()).searchParams.get('orderID') || '';
  expect(orderID).toBeTruthy();
  const sellerWarm = await sellerContext.newPage();
  await sellerWarm.goto(`/orders/${encodeURIComponent(orderID)}?role=sale`, {
    waitUntil: 'domcontentloaded',
    timeout: 90000,
  });
  await expect(sellerWarm.getByTestId('order-status-card')).toBeVisible({ timeout: 60000 });
  await sellerWarm.close();
  await expect(deal.getByTestId('payment-method-summary')).toContainText(/ETH/, { timeout: 45000 });
  const toggle = deal.getByTestId('payment-protection-toggle');
  if (await toggle.isVisible({ timeout: 5000 }).catch(() => false)) {
    if ((await toggle.getAttribute('data-state')) === 'checked') await toggle.click();
  }
  await showChapter(
    deal,
    3,
    BUYER,
    'Pay the monitored total',
    'A unique Safe address watches the exact 0.025 ETH payment.'
  );
  const create = deal.getByTestId('payment-create-session');
  await expect(create).toBeEnabled({ timeout: 45000 });
  await create.click();
  const payment = deal.getByTestId('external-wallet-payment');
  await expect(payment).toBeVisible({ timeout: 60000 });
  const address = (
    (await deal.getByTestId('external-wallet-payment-address').textContent()) || ''
  ).trim();
  const amount = (
    (await deal.getByTestId('external-wallet-payment-amount').textContent()) || ''
  ).trim();
  expect(address).toMatch(/^0x[0-9a-f]{40}$/i);
  expect(amount).toMatch(/^0\.0250*$/);
  await focusOn(payment, 3500);
  const txHash = await fundAddressOnAnvil(address, amount);
  expect(txHash).toMatch(/^0x[0-9a-f]{64}$/i);
  await deal.waitForURL(url => url.pathname === '/checkout/confirmation', {
    timeout: 150000,
    waitUntil: 'domcontentloaded',
  });
  await expect(deal.getByTestId('order-confirmation-page')).toBeVisible({ timeout: 30000 });
  await showChapter(
    deal,
    4,
    BUYER,
    'Verify payment automatically',
    'The same order moves forward only after the chain payment is observed.'
  );
  await deal.waitForTimeout(3500);
  await saveSegment(deal, OUT_DIR, 'seg1-offer-payment');

  const order = await context.newPage();
  await order.addInitScript(PRECOVER_INIT);
  await order.goto(`/orders/${encodeURIComponent(orderID)}?role=purchase`, {
    waitUntil: 'domcontentloaded',
    timeout: 90000,
  });
  await expect(order.getByTestId('order-status-card')).toBeVisible({ timeout: 60000 });
  await expect(order.locator('#digital-downloads')).toBeVisible({ timeout: 90000 });
  await reveal(order);
  await showChapter(
    order,
    5,
    BUYER,
    'Unlock delivery automatically',
    'Verified payment grants the real link without seller approval or email.'
  );
  const downloads = order.locator('#digital-downloads');
  await focusOn(downloads, 4500);
  const deliveryLink = downloads.getByRole('link', { name: /media\.localhost/i });
  await expect(deliveryLink).toBeVisible();
  const [artifact] = await Promise.all([context.waitForEvent('page'), deliveryLink.click()]);
  await artifact.waitForLoadState('domcontentloaded');
  await expect(artifact.getByText('Access verified')).toBeVisible({ timeout: 15000 });
  await showChapter(
    artifact,
    6,
    BUYER,
    'Open what you bought',
    'The delivered launch kit is accessible now—not an example or placeholder.'
  );
  await artifact.waitForTimeout(4500);
  await saveSegment(artifact, OUT_DIR, 'seg2-delivered-artifact');
  await saveSegment(order, OUT_DIR, 'seg3-access-proof');

  const payoff = await context.newPage();
  await payoff.addInitScript(PRECOVER_INIT);
  await payoff.goto(`/orders/${encodeURIComponent(orderID)}?role=purchase`, {
    waitUntil: 'domcontentloaded',
    timeout: 90000,
  });
  await expect(payoff.locator('#digital-downloads')).toBeVisible({ timeout: 60000 });
  await reveal(payoff);
  await showChapter(
    payoff,
    7,
    BUYER,
    'Keep protection and access together',
    'Payment verified · Access granted · Buyer protection active.'
  );
  await focusOn(payoff.locator('#digital-downloads'), 5200);
  await showEndCard(
    payoff,
    'Mobazha',
    'Protected payment. Automatic digital delivery.\nmobazha.org · recorded on Mobazha test network'
  );
  await saveSegment(payoff, OUT_DIR, 'seg4-payoff');
  await context.close();
  await sellerContext.close();
});
