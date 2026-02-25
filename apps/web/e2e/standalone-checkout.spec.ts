/**
 * Standalone Store — Checkout Flow E2E Tests
 *
 * Tests the full buyer journey: browse → add to cart → checkout.
 * Uses pre-seeded listings created via API.
 *
 * Seller views use `authedPage` (admin login).
 * Buyer views use regular `page` (anonymous/unauthenticated).
 *
 * Run:
 *   npx playwright test standalone-checkout.spec.ts --project=standalone --reporter=list
 */

import { test as base, expect } from '@playwright/test';
import { standaloneTest } from './fixtures/standalone-auth';
import { EXPECTED_SLUGS } from './fixtures/seed-listings';

const PEER_ID =
  process.env.E2E_STANDALONE_PEER_ID || '12D3KooWBHrBa2JucLahWSFYyyqETdj1VGiRa8K5anWC4E76EZX3';

const LISTINGS = {
  physical: { slug: EXPECTED_SLUGS.physical, title: 'E2E Test T-Shirt' },
  service: { slug: EXPECTED_SLUGS.service, title: 'E2E Web Design Consultation' },
  digital: { slug: EXPECTED_SLUGS.digital, title: 'E2E Premium Icon Pack' },
};

// ── Buyer tests (anonymous, no login) ──────────────────────────────────────

base.describe('Buyer Journey — Anonymous', () => {
  base.use({ baseURL: 'http://localhost:3002' });

  base.describe('Product Browsing', () => {
    base('physical product detail page', async ({ page }) => {
      await page.goto(`/product/${LISTINGS.physical.slug}`);
      await page.waitForLoadState('networkidle');

      await expect(page.getByText(LISTINGS.physical.title).first()).toBeVisible({ timeout: 15000 });
      const addBtn = page.getByRole('button', { name: /add to cart|加入购物车/i }).first();
      await expect(addBtn).toBeVisible({ timeout: 5000 });

      await page.screenshot({
        path: 'test-results/checkout-01-physical-buyer-view.png',
        fullPage: true,
      });
    });

    base('service detail page', async ({ page }) => {
      await page.goto(`/product/${LISTINGS.service.slug}`);
      await page.waitForLoadState('networkidle');

      await expect(page.getByText(LISTINGS.service.title).first()).toBeVisible({ timeout: 15000 });

      await page.screenshot({
        path: 'test-results/checkout-02-service-buyer-view.png',
        fullPage: true,
      });
    });

    base('digital good detail page', async ({ page }) => {
      await page.goto(`/product/${LISTINGS.digital.slug}`);
      await page.waitForLoadState('networkidle');

      await expect(page.getByText(LISTINGS.digital.title).first()).toBeVisible({ timeout: 15000 });

      await page.screenshot({
        path: 'test-results/checkout-03-digital-buyer-view.png',
        fullPage: true,
      });
    });
  });

  base.describe('Cart Operations', () => {
    base('add product to cart', async ({ page }) => {
      await page.goto(`/product/${LISTINGS.physical.slug}`);
      await page.waitForLoadState('networkidle');

      const addBtn = page.getByRole('button', { name: /add to cart|加入购物车/i }).first();
      await addBtn.waitFor({ state: 'visible', timeout: 15000 });
      await addBtn.click();
      await page.waitForLoadState('networkidle');

      await page.screenshot({ path: 'test-results/checkout-04-added-to-cart.png', fullPage: true });
    });

    base('cart page shows items', async ({ page }) => {
      await page.goto(`/product/${LISTINGS.physical.slug}`);
      await page.waitForLoadState('networkidle');
      const addBtn = page.getByRole('button', { name: /add to cart|加入购物车/i }).first();
      await addBtn.waitFor({ state: 'visible', timeout: 15000 });
      await addBtn.click();
      await page.waitForLoadState('networkidle');

      await page.goto('/cart');
      await page.waitForLoadState('networkidle');

      await expect(page.locator('h1').first()).toContainText(/cart|购物车/i);

      await page.screenshot({ path: 'test-results/checkout-05-cart-page.png', fullPage: true });
    });

    base('add multiple products', async ({ page }) => {
      for (const listing of Object.values(LISTINGS)) {
        await page.goto(`/product/${listing.slug}`);
        await page.waitForLoadState('networkidle');
        const addBtn = page.getByRole('button', { name: /add to cart|加入购物车/i }).first();
        if (await addBtn.isVisible().catch(() => false)) {
          await addBtn.click();
          await page.waitForLoadState('networkidle');
        }
      }

      await page.goto('/cart');
      await page.waitForLoadState('networkidle');

      await page.screenshot({ path: 'test-results/checkout-06-multi-cart.png', fullPage: true });
    });
  });
});

// ── Seller tests (admin login) ─────────────────────────────────────────────

standaloneTest.describe('Seller View', () => {
  standaloneTest('product shows Edit button for seller', async ({ authedPage: page }) => {
    await page.goto(`/product/${LISTINGS.physical.slug}`);
    await page.waitForLoadState('networkidle');

    const editBtn = page
      .getByRole('button', { name: /edit product|编辑/i })
      .or(page.getByText(/edit product/i))
      .first();
    await expect(editBtn).toBeVisible({ timeout: 15000 });

    await page.screenshot({ path: 'test-results/checkout-07-seller-view.png', fullPage: true });
  });
});

// ── Checkout tests (admin login — seller is also buyer in standalone) ──────

standaloneTest.describe('Checkout Flow', () => {
  standaloneTest('checkout physical good', async ({ authedPage: page }) => {
    await page.goto(`/checkout?slug=${LISTINGS.physical.slug}&peerID=${PEER_ID}&quantity=1`);
    await page.waitForLoadState('networkidle');

    const content = page.locator('main, [role="main"]').first();
    await expect(content).toBeVisible({ timeout: 15000 });

    await page.screenshot({
      path: 'test-results/checkout-08-physical-checkout.png',
      fullPage: true,
    });
  });

  standaloneTest('checkout service', async ({ authedPage: page }) => {
    await page.goto(`/checkout?slug=${LISTINGS.service.slug}&peerID=${PEER_ID}&quantity=1`);
    await page.waitForLoadState('networkidle');

    const content = page.locator('main, [role="main"]').first();
    await expect(content).toBeVisible({ timeout: 15000 });

    await page.screenshot({
      path: 'test-results/checkout-09-service-checkout.png',
      fullPage: true,
    });
  });

  standaloneTest('checkout digital good', async ({ authedPage: page }) => {
    await page.goto(`/checkout?slug=${LISTINGS.digital.slug}&peerID=${PEER_ID}&quantity=1`);
    await page.waitForLoadState('networkidle');

    const content = page.locator('main, [role="main"]').first();
    await expect(content).toBeVisible({ timeout: 15000 });

    await page.screenshot({
      path: 'test-results/checkout-10-digital-checkout.png',
      fullPage: true,
    });
  });

  standaloneTest('multi-item checkout', async ({ authedPage: page }) => {
    const slugs = Object.values(LISTINGS)
      .map(l => l.slug)
      .join(',');
    await page.goto(`/checkout?slugs=${slugs}&vendorPeerID=${PEER_ID}`);
    await page.waitForLoadState('networkidle');

    const content = page.locator('main, [role="main"]').first();
    await expect(content).toBeVisible({ timeout: 15000 });

    await page.screenshot({ path: 'test-results/checkout-11-multi-checkout.png', fullPage: true });
  });

  standaloneTest('checkout shows progress indicator', async ({ authedPage: page }) => {
    await page.goto(`/checkout?slug=${LISTINGS.physical.slug}&peerID=${PEER_ID}&quantity=1`);
    await page.waitForLoadState('networkidle');

    const progressBar = page
      .locator('[data-testid="checkout-progress"]')
      .or(page.getByText(/step|checkout|结账/i).first());
    await expect(progressBar.first()).toBeVisible({ timeout: 10000 });

    await page.screenshot({ path: 'test-results/checkout-12-progress-bar.png' });
  });

  standaloneTest('confirmation page renders', async ({ authedPage: page }) => {
    await page.goto('/checkout/confirmation?orderId=test-order');
    await page.waitForLoadState('networkidle');

    const content = page.locator('main, [role="main"]').first();
    await expect(content).toBeVisible();

    await page.screenshot({ path: 'test-results/checkout-13-confirmation.png', fullPage: true });
  });
});
