/**
 * Buyer Experience Visual Audit (375x667 iPhone SE)
 *
 * Complete step-by-step audit of buyer flow at standalone store.
 *
 * Run: STANDALONE_BASE_URL=http://localhost:3002 \
 *      PLAYWRIGHT_BROWSERS_PATH="$HOME/Library/Caches/ms-playwright" \
 *      npx playwright test buyer-experience-audit --project=standalone --reporter=list
 */

import { test, type Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const VIEWPORT = { width: 375, height: 667 };
const OUTPUT_DIR = path.join(__dirname, 'e2e-artifacts', 'buyer-experience-audit');

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function waitForPageStable(page: Page) {
  try {
    await page.waitForLoadState('networkidle', { timeout: 15000 });
  } catch {
    /* proceed */
  }
  await page.waitForTimeout(800);
}

async function capture(page: Page, name: string, fullPage = true) {
  ensureDir(OUTPUT_DIR);
  const filepath = path.join(OUTPUT_DIR, `${name}.png`);
  await page.screenshot({ path: filepath, fullPage });
  return filepath;
}

test.describe.configure({ mode: 'serial' });

test.describe('Buyer Experience Audit (375x667)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(VIEWPORT);
  });

  test('Step 1: Homepage', async ({ page }) => {
    await page.goto('/');
    await waitForPageStable(page);
    await capture(page, '01-homepage');
  });

  test('Step 2: Scroll to products', async ({ page }) => {
    await page.goto('/');
    await waitForPageStable(page);
    await page.evaluate(() => window.scrollTo(0, 500));
    await page.waitForTimeout(500);
    await capture(page, '02-products-scroll');
  });

  test('Step 3: Product detail', async ({ page }) => {
    await page.goto('/');
    await waitForPageStable(page);
    const firstProduct = page.locator('a[href*="/product/"]').first();
    if (await firstProduct.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstProduct.click();
      await waitForPageStable(page);
    } else {
      const peerId = '12D3KooWDa4RrKQvk3RHMWfwYHarmAo7nR63KZDp3raGFh5uAiHH';
      const slug = await page
        .locator('a[href*="/product/"]')
        .first()
        .getAttribute('href')
        .then(h => h?.split('/product/')[1]?.split('?')[0])
        .catch(() => null);
      if (slug) await page.goto(`/product/${slug}?peerID=${peerId}`);
      else await page.goto('/store/12D3KooWDa4RrKQvk3RHMWfwYHarmAo7nR63KZDp3raGFh5uAiHH');
      await waitForPageStable(page);
      const link = page.locator('a[href*="/product/"]').first();
      if (await link.isVisible({ timeout: 3000 }).catch(() => false)) {
        await link.click();
        await waitForPageStable(page);
      }
    }
    await capture(page, '03-product-detail');
  });

  test('Step 4: Add to Cart feedback', async ({ page }) => {
    await page.goto('/');
    await waitForPageStable(page);
    const firstProduct = page.locator('a[href*="/product/"]').first();
    if (await firstProduct.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstProduct.click();
      await waitForPageStable(page);
    }
    const addBtn = page.getByRole('button', { name: /add to cart/i }).first();
    if (await addBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await addBtn.click();
      await page.waitForTimeout(1500);
    }
    await capture(page, '04-add-to-cart-feedback');
  });

  test('Step 5: Cart tab', async ({ page }) => {
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
    await capture(page, '05-cart-tab');
  });

  test('Step 6: Orders tab', async ({ page }) => {
    await page.goto('/');
    await waitForPageStable(page);
    const ordersTab = page
      .getByRole('link', { name: /orders/i })
      .or(page.locator('nav').getByText(/orders/i))
      .first();
    if (await ordersTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await ordersTab.click();
      await waitForPageStable(page);
    } else {
      await page.goto('/orders');
      await waitForPageStable(page);
    }
    await capture(page, '06-orders-tab');
  });

  test('Step 7: Messages tab', async ({ page }) => {
    await page.goto('/');
    await waitForPageStable(page);
    const messagesTab = page
      .getByRole('link', { name: /messages|chat/i })
      .or(page.locator('nav').getByText(/messages|chat/i))
      .first();
    if (await messagesTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await messagesTab.click();
      await waitForPageStable(page);
    } else {
      await page.goto('/messages').catch(() => page.goto('/chat'));
      await waitForPageStable(page);
    }
    await capture(page, '07-messages-tab');
  });

  test('Step 8: Me tab', async ({ page }) => {
    await page.goto('/');
    await waitForPageStable(page);
    const meTab = page
      .getByRole('link', { name: /^me$/i })
      .or(page.locator('nav').getByText(/^me$/i))
      .first();
    if (await meTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await meTab.click();
      await waitForPageStable(page);
    } else {
      await page.goto('/me');
      await waitForPageStable(page);
    }
    await capture(page, '08-me-tab');
  });

  test('Step 9: Search', async ({ page }) => {
    await page.goto('/');
    await waitForPageStable(page);
    const searchInput = page
      .locator('input[type="search"], input[placeholder*="Search" i]')
      .first();
    if (await searchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await searchInput.click();
      await searchInput.fill('vinyl');
      await page.waitForTimeout(1000);
    }
    await capture(page, '09-search-typed');
  });

  test('Step 10: Login page', async ({ page }) => {
    await page.goto('/login');
    await waitForPageStable(page);
    await capture(page, '10-login-page');
  });

  test('Step 11: Collection', async ({ page }) => {
    await page.goto('/');
    await waitForPageStable(page);
    const collectionLink = page
      .getByRole('link', { name: /collection/i })
      .or(page.locator('a[href*="/collection"]'))
      .or(page.locator('[data-testid*="collection"]'))
      .first();
    if (await collectionLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await collectionLink.click();
      await waitForPageStable(page);
    } else {
      const storePage = page.goto('/store/12D3KooWDa4RrKQvk3RHMWfwYHarmAo7nR63KZDp3raGFh5uAiHH');
      await storePage;
      await waitForPageStable(page);
      const collTab = page
        .getByRole('tab', { name: /collection/i })
        .or(page.getByText(/collection/i))
        .first();
      if (await collTab.isVisible({ timeout: 3000 }).catch(() => false)) {
        await collTab.click();
        await page.waitForTimeout(800);
      }
      const collCard = page.locator('a[href*="collection"]').first();
      if (await collCard.isVisible({ timeout: 2000 }).catch(() => false)) {
        await collCard.click();
        await waitForPageStable(page);
      }
    }
    await capture(page, '11-collection');
  });
});
