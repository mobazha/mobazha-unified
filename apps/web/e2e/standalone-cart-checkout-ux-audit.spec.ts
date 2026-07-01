/**
 * Cart & Checkout UX Audit — Standalone Store Mobile (375x667 iPhone SE)
 *
 * Simulates Telegram Mini App mobile mode. Captures screenshots and documents issues.
 * Run: CI= npx playwright test standalone-cart-checkout-ux-audit --project=standalone
 *
 * Prerequisites:
 * - Standalone frontend: pnpm dev --mode standalone --port 3002
 * - Docker E2E + standalone node + seed data (make demo && make seed)
 */

import { test, expect } from '@playwright/test';
import * as path from 'path';

const SCREENSHOT_DIR = 'playwright-report/cart-checkout-audit';
const VIEWPORT = { width: 375, height: 667 }; // iPhone SE

test.describe('Cart & Checkout UX Audit — Standalone Mobile', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(VIEWPORT);
    await page.addInitScript(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });
  });

  test('full flow: home → product → add to cart → cart → checkout', async ({ page }) => {
    const baseURL = process.env.STANDALONE_BASE_URL || 'http://localhost:3002';

    // 1. Homepage
    await page.goto(baseURL);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '01-homepage.png'),
      fullPage: true,
    });

    // Find first product link (store section or product card)
    const productLink = page.locator('a[href*="/product/"], a[href*="/store/"]').first();
    const hasProduct = await productLink.isVisible().catch(() => false);

    if (!hasProduct) {
      // Try marketplace or store tab
      const storeTab = page.getByRole('link', { name: /store|shop|marketplace|products/i });
      if (await storeTab.isVisible().catch(() => false)) {
        await storeTab.click();
        await page.waitForTimeout(1500);
      }
    }

    // Navigate to product (try direct slug if homepage has no products)
    const productSlug = 'vintage-vinyl-record'; // Dave's standalone seed
    const directProductUrl = `${baseURL}/product/${productSlug}`;
    await page.goto(directProductUrl);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // 2. Product detail page
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '02-product-detail.png'),
      fullPage: true,
    });

    // Check Add to Cart button visibility
    const addToCartBtn = page.getByRole('button', { name: /add to cart|加入购物车/i });
    const addToCartVisible = await addToCartBtn.isVisible().catch(() => false);

    if (addToCartVisible) {
      await addToCartBtn.click();
      await page.waitForTimeout(800);

      // 3. After add to cart (check for feedback)
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '03-after-add-to-cart.png'),
        fullPage: true,
      });

      // Check cart badge in header
      const cartBadge = page.locator(
        '[data-testid="cart-badge"], .cart-count, [aria-label*="cart"]'
      );
      const badgeVisible = await cartBadge.isVisible().catch(() => false);

      // 4. Navigate to cart
      const cartLink = page
        .getByRole('link', { name: /cart|购物车/i })
        .or(page.locator('a[href="/cart"]'));
      await cartLink
        .first()
        .click()
        .catch(() => page.goto(`${baseURL}/cart`));
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1500);

      // 5. Cart page
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '04-cart-page.png'),
        fullPage: true,
      });

      // Check for checkout button
      const checkoutBtn = page
        .getByRole('button', { name: /checkout|结账/i })
        .or(page.getByRole('link', { name: /checkout|结账/i }));
      const hasCheckout = await checkoutBtn
        .first()
        .isVisible()
        .catch(() => false);

      if (hasCheckout) {
        await checkoutBtn.first().click();
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(2000);

        // 6. Checkout page (may redirect to login for standalone)
        await page.screenshot({
          path: path.join(SCREENSHOT_DIR, '05-checkout-or-login.png'),
          fullPage: true,
        });
      }
    } else {
      // Product may show "Payment Unavailable" or "Out of Stock"
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '03-product-no-add-button.png'),
        fullPage: true,
      });
    }
  });

  test('empty cart state', async ({ page }) => {
    const baseURL = process.env.STANDALONE_BASE_URL || 'http://localhost:3002';
    await page.goto(`${baseURL}/cart`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '06-empty-cart.png'),
      fullPage: true,
    });
  });

  test('checkout without auth (standalone OAuth prompt)', async ({ page }) => {
    const baseURL = process.env.STANDALONE_BASE_URL || 'http://localhost:3002';
    // Go to checkout directly (simulate user with items in cart from localStorage)
    await page.goto(`${baseURL}/checkout?slug=vintage-vinyl-record&peerID=test&quantity=1`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '07-checkout-auth-prompt.png'),
      fullPage: true,
    });
  });
});
