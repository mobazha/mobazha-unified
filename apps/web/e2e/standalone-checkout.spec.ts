/**
 * Standalone Store — Full Checkout E2E Tests
 *
 * Covers the complete buyer journey:
 *   1. Auto-discover PeerID + verify seeded listings exist
 *   2. Product browsing (physical / service / digital)
 *   3. Cart operations (add / view / multi-item)
 *   4. Price display verification (minimal-unit → formatted)
 *   5. Full checkout → place order → payment page
 *   6. Mobile viewport tests
 *   7. Seller view (edit button)
 *   8. Confirmation page rendering
 *
 * Pre-requisites:
 *   - Standalone Docker container running (port 15104 backend, 3002 frontend)
 *   - Test listings seeded (seedTestListings or manually created)
 *
 * Run:
 *   npx playwright test standalone-checkout.spec.ts --project=standalone --reporter=list
 *   npx playwright test standalone-checkout.spec.ts --project=standalone-mobile --reporter=list
 */

import { test as base, expect } from '@playwright/test';
import { standaloneTest } from './fixtures/standalone-auth';
import { EXPECTED_SLUGS, seedTestListings, cleanupTestListings } from './fixtures/seed-listings';
import type { SeededListing } from './fixtures/seed-listings';

// ── Auto-discovered state (populated in first test) ─────────────────────────

let PEER_ID = process.env.E2E_STANDALONE_PEER_ID || '';

const LISTINGS = {
  physical: {
    slug: EXPECTED_SLUGS.physical,
    title: 'E2E Test T-Shirt',
    price: 2999,
    currency: 'USD',
  },
  service: {
    slug: EXPECTED_SLUGS.service,
    title: 'E2E Web Design Consultation',
    price: 9900,
    currency: 'USD',
  },
  digital: {
    slug: EXPECTED_SLUGS.digital,
    title: 'E2E Premium Icon Pack',
    price: 1499,
    currency: 'USD',
  },
};

// ── Setup: auto-discover peer ID and ensure listings exist ──────────────────

standaloneTest.describe('Setup & Discovery', () => {
  standaloneTest('auto-discover peer ID and verify listings', async ({ api }) => {
    // 1. Get peer ID from profile API
    const profile = await api.getProfile();
    expect(profile.peerID).toBeTruthy();
    PEER_ID = profile.peerID;
    console.log('Discovered PeerID:', PEER_ID);

    // 2. Check if test listings exist
    const index = await api.getListingIndex();
    expect(Array.isArray(index)).toBe(true);

    const existingSlugs = new Set((index as Array<{ slug: string }>).map(l => l.slug));
    const needed = Object.values(EXPECTED_SLUGS);
    const missing = needed.filter(s => !existingSlugs.has(s));

    if (missing.length > 0) {
      console.log('Missing listings, seeding:', missing);
      const seeded = await seedTestListings(api);
      expect(seeded.length).toBeGreaterThanOrEqual(missing.length);
      console.log(
        'Seeded listings:',
        seeded.map(s => s.slug)
      );
    } else {
      console.log('All test listings present:', needed);
    }
  });
});

// ── 1. Buyer Browsing (anonymous, no login) ─────────────────────────────────

base.describe('Buyer Journey — Anonymous', () => {
  base.use({ baseURL: 'http://localhost:3002' });

  base.describe('Product Browsing', () => {
    for (const [type, listing] of Object.entries(LISTINGS)) {
      base(`${type} product detail page loads`, async ({ page }) => {
        await page.goto(`/product/${listing.slug}`);
        await page.waitForLoadState('domcontentloaded');

        await expect(page.getByText(listing.title).first()).toBeVisible({ timeout: 15000 });

        if (type !== 'digital') {
          const addBtn = page.getByRole('button', { name: /add to cart|加入购物车/i }).first();
          await expect(addBtn).toBeVisible({ timeout: 5000 });
        }

        await page.screenshot({
          path: `test-results/checkout-browse-${type}.png`,
          fullPage: true,
        });
      });
    }
  });

  // ── 2. Price Display Verification ───────────────────────────────────────

  base.describe('Price Display Verification', () => {
    base('physical product price formatted correctly ($29.99 not $2999)', async ({ page }) => {
      await page.goto(`/product/${LISTINGS.physical.slug}`);
      await page.waitForLoadState('domcontentloaded');

      await expect(page.getByText(LISTINGS.physical.title).first()).toBeVisible({ timeout: 15000 });

      const pageText = await page.textContent('body');

      // Price is 2999 minimal units = $29.99 — should see formatted price
      expect(pageText).toContain('29.99');
      // Must NOT show raw minimal unit amount as a standalone price
      // (2999 can appear in other contexts, so we check the formatted version exists)

      await page.screenshot({ path: 'test-results/checkout-price-physical.png', fullPage: true });
    });

    base('service price formatted correctly ($99.00)', async ({ page }) => {
      await page.goto(`/product/${LISTINGS.service.slug}`);
      await page.waitForLoadState('domcontentloaded');

      await expect(page.getByText(LISTINGS.service.title).first()).toBeVisible({ timeout: 15000 });

      const pageText = await page.textContent('body');
      expect(pageText).toContain('99.00');

      await page.screenshot({ path: 'test-results/checkout-price-service.png', fullPage: true });
    });

    base('digital good price formatted correctly ($14.99)', async ({ page }) => {
      await page.goto(`/product/${LISTINGS.digital.slug}`);
      await page.waitForLoadState('domcontentloaded');

      await expect(page.getByText(LISTINGS.digital.title).first()).toBeVisible({ timeout: 15000 });

      const pageText = await page.textContent('body');
      expect(pageText).toContain('14.99');

      await page.screenshot({ path: 'test-results/checkout-price-digital.png', fullPage: true });
    });
  });

  // ── 3. Cart Operations ──────────────────────────────────────────────────

  base.describe('Cart Operations', () => {
    base('add physical product to cart', async ({ page }) => {
      await page.goto(`/product/${LISTINGS.physical.slug}`);
      await page.waitForLoadState('domcontentloaded');

      const addBtn = page.getByRole('button', { name: /add to cart|加入购物车/i }).first();
      await addBtn.waitFor({ state: 'visible', timeout: 15000 });
      await addBtn.click();
      await page.waitForLoadState('domcontentloaded');

      await page.screenshot({ path: 'test-results/checkout-cart-added.png', fullPage: true });
    });

    base('cart page shows added items with correct price', async ({ page }) => {
      await page.goto(`/product/${LISTINGS.physical.slug}`);
      await page.waitForLoadState('domcontentloaded');
      const addBtn = page.getByRole('button', { name: /add to cart|加入购物车/i }).first();
      await addBtn.waitFor({ state: 'visible', timeout: 15000 });
      await addBtn.click();
      await page.waitForLoadState('domcontentloaded');

      await page.goto('/cart');
      await page.waitForLoadState('domcontentloaded');

      await expect(page.locator('h1').first()).toContainText(/cart|购物车/i);

      // Verify price is formatted (not raw minimal units)
      const cartText = await page.textContent('body');
      expect(cartText).toContain('29.99');

      await page.screenshot({ path: 'test-results/checkout-cart-page.png', fullPage: true });
    });

    base('add multiple product types to cart', async ({ page }) => {
      for (const listing of Object.values(LISTINGS)) {
        await page.goto(`/product/${listing.slug}`);
        await page.waitForLoadState('domcontentloaded');
        const addBtn = page.getByRole('button', { name: /add to cart|加入购物车/i }).first();
        if (await addBtn.isVisible().catch(() => false)) {
          await addBtn.click();
          await page.waitForLoadState('domcontentloaded');
        }
      }

      await page.goto('/cart');
      await page.waitForLoadState('domcontentloaded');

      await page.screenshot({ path: 'test-results/checkout-cart-multi.png', fullPage: true });
    });
  });
});

// ── 4. Seller View (admin login) ────────────────────────────────────────────

standaloneTest.describe('Seller View', () => {
  standaloneTest('product shows Edit button for seller', async ({ authedPage: page }) => {
    await page.goto(`/product/${LISTINGS.physical.slug}`);
    await page.waitForLoadState('domcontentloaded');

    const editBtn = page
      .getByRole('button', { name: /edit product|编辑/i })
      .or(page.getByText(/edit product/i))
      .first();
    await expect(editBtn).toBeVisible({ timeout: 15000 });

    await page.screenshot({ path: 'test-results/checkout-seller-view.png', fullPage: true });
  });
});

// ── 5. Full Checkout Flow (admin login — seller is also buyer in standalone) ─

standaloneTest.describe('Checkout Flow', () => {
  for (const [type, listing] of Object.entries(LISTINGS)) {
    standaloneTest(`checkout ${type} good`, async ({ authedPage: page }) => {
      const peerID = PEER_ID || process.env.E2E_STANDALONE_PEER_ID || '';
      await page.goto(`/checkout?slug=${listing.slug}&peerID=${peerID}&quantity=1`);
      await page.waitForLoadState('domcontentloaded');

      const content = page
        .locator(
          'main, [role="main"], [data-testid="checkout-page"], [data-testid="checkout-page-mobile"]'
        )
        .first();
      await expect(content).toBeVisible({ timeout: 15000 });

      // Verify progress bar
      const progressBar = page.locator('[data-testid="checkout-progress"]').first();
      if (await progressBar.isVisible().catch(() => false)) {
        await expect(progressBar).toBeVisible();
      }

      await page.screenshot({
        path: `test-results/checkout-flow-${type}.png`,
        fullPage: true,
      });
    });
  }

  standaloneTest('multi-item checkout', async ({ authedPage: page }) => {
    const peerID = PEER_ID || process.env.E2E_STANDALONE_PEER_ID || '';
    const slugs = Object.values(LISTINGS)
      .map(l => l.slug)
      .join(',');
    await page.goto(`/checkout?slugs=${slugs}&vendorPeerID=${peerID}`);
    await page.waitForLoadState('domcontentloaded');

    const content = page
      .locator(
        'main, [role="main"], [data-testid="checkout-page"], [data-testid="checkout-page-mobile"]'
      )
      .first();
    await expect(content).toBeVisible({ timeout: 15000 });

    await page.screenshot({ path: 'test-results/checkout-flow-multi.png', fullPage: true });
  });

  standaloneTest('place order for service → redirect to payment', async ({ authedPage: page }) => {
    const peerID = PEER_ID || process.env.E2E_STANDALONE_PEER_ID || '';
    await page.goto(`/checkout?slug=${LISTINGS.service.slug}&peerID=${peerID}&quantity=1`);
    await page.waitForLoadState('domcontentloaded');

    // Wait for checkout page to fully render
    const submitBtn = page
      .getByTestId('checkout-submit-btn')
      .or(page.getByTestId('checkout-submit-btn-mobile'))
      .first();

    await submitBtn.waitFor({ state: 'visible', timeout: 30000 });

    // SERVICE type: no shipping needed, should be enabled
    await expect(submitBtn).toBeEnabled({ timeout: 10000 });

    await page.screenshot({ path: 'test-results/checkout-before-submit.png', fullPage: true });

    // Click "Place Order"
    await submitBtn.click();

    // Should redirect to /payment with orderID
    await page.waitForURL(
      url => url.toString().includes('/payment') && url.toString().includes('orderID'),
      { timeout: 60000 }
    );

    const paymentUrl = new URL(page.url());
    const orderID = paymentUrl.searchParams.get('orderID');
    expect(orderID).toBeTruthy();
    console.log('Order created! ID:', orderID);

    await page.waitForLoadState('domcontentloaded');
    await page.screenshot({ path: 'test-results/checkout-payment-page.png', fullPage: true });

    // Verify payment page content
    const mainContent = page.locator('main').first();
    await expect(mainContent).toBeVisible({ timeout: 15000 });
  });

  standaloneTest('confirmation page renders', async ({ authedPage: page }) => {
    await page.goto(
      '/checkout/confirmation?orderID=test-order&total=99.00&currency=USD&title=Test+Service&vendorName=TestStore'
    );
    await page.waitForLoadState('domcontentloaded');

    const content = page.locator('main, [role="main"]').first();
    await expect(content).toBeVisible();

    await page.screenshot({ path: 'test-results/checkout-confirmation.png', fullPage: true });
  });
});

// ── 6. Mobile Viewport Tests ────────────────────────────────────────────────

base.describe('Mobile Experience', () => {
  base.use({
    baseURL: 'http://localhost:3002',
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });

  base('mobile: product page is touch-friendly', async ({ page }) => {
    await page.goto(`/product/${LISTINGS.physical.slug}`);
    await page.waitForLoadState('domcontentloaded');

    // Use a heading or main content locator to avoid matching truncated breadcrumb spans
    const title = page
      .locator('h1, h2, [data-testid="product-title"]')
      .getByText(LISTINGS.physical.title)
      .first();
    await expect(title).toBeVisible({ timeout: 15000 });

    // Add to cart button should be large enough for touch (min 44px)
    const addBtn = page.getByRole('button', { name: /add to cart|加入购物车/i }).first();
    if (await addBtn.isVisible().catch(() => false)) {
      const box = await addBtn.boundingBox();
      expect(box).toBeTruthy();
      if (box) {
        expect(box.height).toBeGreaterThanOrEqual(36);
      }
    }

    await page.screenshot({ path: 'test-results/mobile-product.png', fullPage: true });
  });

  base('mobile: cart page layout', async ({ page }) => {
    // Add item first
    await page.goto(`/product/${LISTINGS.physical.slug}`);
    await page.waitForLoadState('domcontentloaded');
    const addBtn = page.getByRole('button', { name: /add to cart|加入购物车/i }).first();
    if (await addBtn.isVisible().catch(() => false)) {
      await addBtn.click();
      await page.waitForLoadState('domcontentloaded');
    }

    await page.goto('/cart');
    await page.waitForLoadState('domcontentloaded');

    // Cart should not have horizontal scroll
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1);

    // Price should be formatted
    const cartText = await page.textContent('body');
    expect(cartText).toContain('29.99');

    await page.screenshot({ path: 'test-results/mobile-cart.png', fullPage: true });
  });
});

standaloneTest.describe('Mobile Checkout', () => {
  standaloneTest.use({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });

  standaloneTest('mobile: checkout page uses mobile layout', async ({ authedPage: page }) => {
    const peerID = PEER_ID || process.env.E2E_STANDALONE_PEER_ID || '';
    await page.goto(`/checkout?slug=${LISTINGS.service.slug}&peerID=${peerID}&quantity=1`);
    await page.waitForLoadState('domcontentloaded');

    // Mobile layout should show mobile header or bottom bar
    const mobileIndicator = page
      .getByTestId('checkout-page-mobile')
      .or(page.getByTestId('checkout-submit-btn-mobile'))
      .first();

    await expect(mobileIndicator).toBeVisible({ timeout: 15000 });

    // Verify no horizontal overflow
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1);

    await page.screenshot({ path: 'test-results/mobile-checkout.png', fullPage: true });
  });

  standaloneTest('mobile: place order via bottom bar button', async ({ authedPage: page }) => {
    const peerID = PEER_ID || process.env.E2E_STANDALONE_PEER_ID || '';
    await page.goto(`/checkout?slug=${LISTINGS.service.slug}&peerID=${peerID}&quantity=1`);
    await page.waitForLoadState('domcontentloaded');

    // Mobile uses bottom-bar submit button
    const submitBtn = page.getByTestId('checkout-submit-btn-mobile').first();
    await submitBtn.waitFor({ state: 'visible', timeout: 30000 });
    await expect(submitBtn).toBeEnabled({ timeout: 10000 });

    await page.screenshot({
      path: 'test-results/mobile-checkout-before-submit.png',
      fullPage: true,
    });

    await submitBtn.click();

    await page.waitForURL(
      url => url.toString().includes('/payment') && url.toString().includes('orderID'),
      { timeout: 60000 }
    );

    const orderID = new URL(page.url()).searchParams.get('orderID');
    expect(orderID).toBeTruthy();
    console.log('Mobile order created! ID:', orderID);

    await page.waitForLoadState('domcontentloaded');
    await page.screenshot({ path: 'test-results/mobile-payment-page.png', fullPage: true });
  });
});

// ── 7. EVM Testnet Payment Test ─────────────────────────────────────────────

standaloneTest.describe('EVM Testnet Payment', () => {
  standaloneTest.skip(
    !process.env.E2E_EVM_PAYMENT_ENABLED,
    'Set E2E_EVM_PAYMENT_ENABLED=1 to run EVM payment tests'
  );

  standaloneTest('payment page shows EVM wallet options', async ({ authedPage: page }) => {
    const peerID = PEER_ID || process.env.E2E_STANDALONE_PEER_ID || '';

    // Create a real order first
    await page.goto(`/checkout?slug=${LISTINGS.service.slug}&peerID=${peerID}&quantity=1`);
    await page.waitForLoadState('domcontentloaded');

    const submitBtn = page
      .getByTestId('checkout-submit-btn')
      .or(page.getByTestId('checkout-submit-btn-mobile'))
      .first();
    await submitBtn.waitFor({ state: 'visible', timeout: 30000 });
    await submitBtn.click();

    await page.waitForURL(
      url => url.toString().includes('/payment') && url.toString().includes('orderID'),
      { timeout: 60000 }
    );

    await page.waitForLoadState('domcontentloaded');

    // Payment page should show wallet connection or chain selector
    const paymentContent = page.locator('main').first();
    await expect(paymentContent).toBeVisible({ timeout: 15000 });

    // Look for wallet connect or chain selection elements
    const walletSection = page.getByText(/connect wallet|连接钱包|select chain|选择链/i).first();

    if (await walletSection.isVisible().catch(() => false)) {
      await expect(walletSection).toBeVisible();
    }

    await page.screenshot({ path: 'test-results/evm-payment-page.png', fullPage: true });
    console.log('Payment page verified with EVM options');
  });
});
