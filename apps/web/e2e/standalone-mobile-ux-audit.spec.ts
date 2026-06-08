/**
 * Standalone Store — Mobile Buyer UX Audit (375x667 iPhone SE)
 *
 * Simulates Telegram Mini App mobile browsing experience.
 * Captures screenshots and collects issues for product design review.
 *
 * Prerequisites:
 *   - Standalone frontend: pnpm dev --mode standalone --port 3002
 *   - Standalone backend: Docker E2E (e2e-standalone on :15104) or local node
 *
 * Run: npx playwright test standalone-mobile-ux-audit --project=standalone-mobile
 *      (or with custom base: STANDALONE_BASE_URL=http://localhost:3002)
 */

import { test, expect, type Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

// iPhone SE viewport (375x667) — Telegram Mini App simulation
const VIEWPORT = { width: 375, height: 667 };

const OUTPUT_DIR = path.join(__dirname, 'e2e-artifacts', 'mobile-ux-audit');
const PEER_ID =
  process.env.STANDALONE_PEER_ID || '12D3KooWSjgKktH9R2jQMNiKrKqQiu1aJR2NnBAgZvkDQyto4p7x';

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function waitForPageStable(page: Page) {
  try {
    await page.waitForLoadState('networkidle', { timeout: 15000 });
  } catch {
    // proceed anyway
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

test.describe('Standalone Mobile UX Audit — Buyer Browsing (375x667)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(VIEWPORT);
  });

  test('1. Homepage — initial load', async ({ page }) => {
    await page.goto('/');
    await waitForPageStable(page);
    await capture(page, '01-homepage');
  });

  test('2. Store page — product grid', async ({ page }) => {
    await page.goto(`/store/${PEER_ID}`);
    await waitForPageStable(page);
    await capture(page, '02-store-top');
  });

  test('3. Store page — scroll down', async ({ page }) => {
    await page.goto(`/store/${PEER_ID}`);
    await waitForPageStable(page);
    await page.evaluate(() => window.scrollTo(0, 400));
    await page.waitForTimeout(500);
    await capture(page, '03-store-scroll-1');
  });

  test('4. Store page — scroll to bottom', async ({ page }) => {
    await page.goto(`/store/${PEER_ID}`);
    await waitForPageStable(page);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    await capture(page, '04-store-bottom');
  });

  test('5. Product detail — click first product', async ({ page }) => {
    await page.goto(`/store/${PEER_ID}`);
    await waitForPageStable(page);
    const firstCard = page.locator('[data-testid="product-card"], a[href*="/product/"]').first();
    if (await firstCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstCard.click();
      await waitForPageStable(page);
    } else {
      // Fallback: navigate directly if we know a slug
      const slug = await page
        .locator('a[href*="/product/"]')
        .first()
        .getAttribute('href')
        .then(h => h?.split('/product/')[1]?.split('?')[0])
        .catch(() => null);
      if (slug) {
        await page.goto(`/product/${slug}?peerID=${PEER_ID}`);
        await waitForPageStable(page);
      }
    }
    await capture(page, '05-product-detail');
  });

  test('6. Product detail — scroll down (description, reviews)', async ({ page }) => {
    await page.goto(`/store/${PEER_ID}`);
    await waitForPageStable(page);
    const firstLink = page.locator('a[href*="/product/"]').first();
    const href = await firstLink.getAttribute('href').catch(() => null);
    const slug = href?.split('/product/')[1]?.split('?')[0]?.split('#')[0];
    if (slug) {
      await page.goto(`/product/${slug}?peerID=${PEER_ID}`);
      await waitForPageStable(page);
      await page.evaluate(() => window.scrollTo(0, 600));
      await page.waitForTimeout(500);
    }
    await capture(page, '06-product-scroll');
  });

  test('7. Navigation — About tab', async ({ page }) => {
    await page.goto(`/store/${PEER_ID}`);
    await waitForPageStable(page);
    const aboutTab = page
      .getByRole('tab', { name: /about/i })
      .or(page.locator('[data-tab="about"]'))
      .first();
    if (await aboutTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await aboutTab.click();
      await page.waitForTimeout(800);
    }
    await capture(page, '07-about');
  });

  test('8. Navigation — Collections', async ({ page }) => {
    await page.goto(`/store/${PEER_ID}`);
    await waitForPageStable(page);
    const collectionsTab = page
      .getByRole('tab', { name: /collection/i })
      .or(page.locator('[data-tab="collections"]'))
      .first();
    if (await collectionsTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await collectionsTab.click();
      await page.waitForTimeout(800);
    }
    await capture(page, '08-collections');
  });

  test('9. Footer — policy links', async ({ page }) => {
    await page.goto(`/store/${PEER_ID}`);
    await waitForPageStable(page);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    await capture(page, '09-footer');
  });

  test('10. Search bar — if visible', async ({ page }) => {
    await page.goto(`/store/${PEER_ID}`);
    await waitForPageStable(page);
    const searchInput = page
      .locator('input[type="search"], input[placeholder*="Search" i]')
      .first();
    if (await searchInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await searchInput.focus();
      await page.waitForTimeout(300);
    }
    await capture(page, '10-search');
  });
});
