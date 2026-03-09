/**
 * Mobile Buyer Flow Audit (375x667 iPhone SE)
 *
 * Complete buyer journey with screenshot at every step.
 * Output: e2e-artifacts/mobile-buyer-audit/
 *
 * Run: STANDALONE_BASE_URL=http://localhost:3002 \
 *      PLAYWRIGHT_BROWSERS_PATH="$HOME/Library/Caches/ms-playwright" \
 *      npx playwright test standalone-mobile-buyer-audit --project=standalone --reporter=list
 */

import { test, type Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const VIEWPORT = { width: 375, height: 667 };
const OUTPUT_DIR =
  '/Users/mingfeng/dev/openbazaar/mobazha-unified/apps/web/e2e/e2e-artifacts/mobile-buyer-audit';
const BUYER_USER = process.env.BUYER_USER || 'testuser2';
const BUYER_PASS = process.env.BUYER_PASS || '123';

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function waitForPageStable(page: Page, ms = 2000) {
  try {
    await page.waitForLoadState('networkidle', { timeout: 15000 });
  } catch {
    /* proceed */
  }
  await page.waitForTimeout(ms);
}

async function capture(page: Page, filename: string, fullPage = true) {
  ensureDir(OUTPUT_DIR);
  const filepath = path.join(OUTPUT_DIR, filename);
  await page.screenshot({ path: filepath, fullPage });
  return filepath;
}

test.describe.configure({ mode: 'serial' });

test.describe('Mobile Buyer Flow Audit', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(VIEWPORT);
  });

  test('01: Homepage (anonymous)', async ({ page }) => {
    await page.goto('/');
    await waitForPageStable(page);
    await capture(page, '01-homepage-anon.png');
  });

  test('02: Browse products (scroll)', async ({ page }) => {
    await page.goto('/');
    await waitForPageStable(page);
    await page.evaluate(() => window.scrollTo(0, 500));
    await page.waitForTimeout(800);
    await capture(page, '02-products-browse.png');
  });

  test('03: Product detail', async ({ page }) => {
    await page.goto('/');
    await waitForPageStable(page);
    const link = page.locator('a[href*="/product/"]').first();
    if (await link.isVisible({ timeout: 5000 }).catch(() => false)) {
      await link.click();
      await waitForPageStable(page);
    }
    await capture(page, '03-product-detail.png');
  });

  test('04: Product detail scroll (reviews, shipping)', async ({ page }) => {
    await page.goto('/');
    await waitForPageStable(page);
    const link = page.locator('a[href*="/product/"]').first();
    if (await link.isVisible({ timeout: 5000 }).catch(() => false)) {
      await link.click();
      await waitForPageStable(page);
    }
    await page.evaluate(() => window.scrollTo(0, 800));
    await page.waitForTimeout(600);
    await capture(page, '04-product-detail-scroll.png');
  });

  test('05: Add to cart', async ({ page }) => {
    await page.goto('/');
    await waitForPageStable(page);
    const link = page.locator('a[href*="/product/"]').first();
    if (await link.isVisible({ timeout: 5000 }).catch(() => false)) {
      await link.click();
      await waitForPageStable(page);
    }
    const addBtn = page.getByRole('button', { name: /add to cart/i }).first();
    if (await addBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await addBtn.click();
      await page.waitForTimeout(2000);
    }
    await capture(page, '05-add-to-cart.png');
  });

  test('06: Cart', async ({ page }) => {
    await page.goto('/');
    await waitForPageStable(page);
    const cartTab = page
      .getByRole('link', { name: /cart/i })
      .or(page.locator('nav').getByText(/cart/i))
      .first();
    if (await cartTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await cartTab.click();
      await waitForPageStable(page);
    } else {
      await page.goto('/cart');
      await waitForPageStable(page);
    }
    await capture(page, '06-cart.png');
  });

  test('06b: Cart with item (if 06 was empty, add then retake)', async ({ page }) => {
    await page.goto('/');
    await waitForPageStable(page);
    const link = page.locator('a[href*="/product/"]').first();
    if (await link.isVisible({ timeout: 5000 }).catch(() => false)) {
      await link.click();
      await waitForPageStable(page);
    }
    const addBtn = page.getByRole('button', { name: /add to cart/i }).first();
    if (await addBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await addBtn.click();
      await page.waitForTimeout(1500);
    }
    await page.goto('/cart');
    await waitForPageStable(page);
    await capture(page, '06b-cart-with-item.png');
  });

  test('07: Checkout', async ({ page }) => {
    await page.goto('/cart');
    await waitForPageStable(page);
    const checkoutBtn = page
      .getByRole('button', { name: /checkout|proceed/i })
      .or(page.getByRole('link', { name: /checkout/i }))
      .first();
    if (await checkoutBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await checkoutBtn.click();
      await waitForPageStable(page);
    } else {
      await page.goto('/checkout');
      await waitForPageStable(page);
    }
    await capture(page, '07-checkout.png');
  });

  test('08: Login page', async ({ page }) => {
    await page.goto('/login');
    await waitForPageStable(page);
    await capture(page, '08-login-page.png');
  });

  test('09: Buyer login attempt', async ({ page, context }) => {
    await page.goto('/login');
    await waitForPageStable(page);
    const buyerBtn = page
      .getByRole('button', { name: /login with mobazha|login with mobazha account/i })
      .first();
    if (await buyerBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      const [popup] = await Promise.all([
        context.waitForEvent('page', { timeout: 15000 }).catch(() => null),
        buyerBtn.click(),
      ]);
      if (popup) {
        await popup.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(500);
        await capture(popup, '09-buyer-login-attempt.png');
        await popup.close().catch(() => {});
      } else {
        await page.waitForTimeout(3000);
        await capture(page, '09-buyer-login-attempt.png');
      }
    } else {
      await capture(page, '09-buyer-login-attempt.png');
    }
  });

  test('10: Search', async ({ page }) => {
    await page.goto('/');
    await waitForPageStable(page);
    const searchInput = page
      .locator('input[type="search"], input[placeholder*="Search" i]')
      .first();
    if (await searchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await searchInput.click();
      await page.waitForTimeout(500);
    }
    await capture(page, '10-search.png');
  });

  test('11: Search results', async ({ page }) => {
    await page.goto('/');
    await waitForPageStable(page);
    const searchInput = page
      .locator('input[type="search"], input[placeholder*="Search" i]')
      .first();
    if (await searchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await searchInput.fill('test');
      await page.waitForTimeout(1500);
    }
    await capture(page, '11-search-results.png');
  });

  test('12: Store page', async ({ page }) => {
    await page.goto('/');
    await waitForPageStable(page);
    const storeLink = page.locator('a[href*="/store/"]').first();
    let storePeerId = '12D3KooWSjgKktH9R2jQMNiKrKqQiu1aJR2NnBAgZvkDQyto4p7x';
    if (await storeLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      const href = await storeLink.getAttribute('href');
      const m = href?.match(/\/store\/([^/?#]+)/);
      if (m) storePeerId = m[1];
    }
    const url = page.url();
    if (url.includes('/store/')) {
      const m = url.match(/\/store\/([^/]+)/);
      if (m) storePeerId = m[1];
    }
    await page.goto(`/store/${storePeerId}`);
    await waitForPageStable(page);
    await capture(page, '12-store-page.png');
  });

  test('13: Bottom nav', async ({ page }) => {
    await page.goto('/');
    await waitForPageStable(page);
    const nav = page.locator('nav').getByRole('link').first();
    await nav.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    await capture(page, '13-bottom-nav.png');
  });

  test('14: Me page', async ({ page }) => {
    await page.goto('/me');
    await waitForPageStable(page);
    await capture(page, '14-me-page.png');
  });
});
