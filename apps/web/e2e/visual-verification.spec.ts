/**
 * Visual Verification - Capture screenshots for manual review
 *
 * Run (app must be running at localhost:3001):
 *   npx playwright test visual-verification.spec.ts --config=playwright.visual.config.ts
 *
 * Or with custom URL:
 *   SCREENSHOT_BASE_URL=http://localhost:3001 npx playwright test visual-verification.spec.ts --config=playwright.visual.config.ts
 */

import { test } from '@playwright/test';

const SCREENSHOT_DIR = 'e2e-screenshots/visual-verification';

test.describe('Visual Verification', () => {
  test('1. Landing page screenshot', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/01-landing.png`,
      fullPage: true,
    });
  });

  test('2. Admin area - try /admin/orders', async ({ page }) => {
    await page.goto('/admin/orders', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/02-admin-orders.png`,
      fullPage: true,
    });
  });

  test('3. /orders direct', async ({ page }) => {
    await page.goto('/orders', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/03-orders.png`,
      fullPage: true,
    });
  });

  // Admin Products - Status filter tabs + Status column verification
  test('4. Admin products - desktop full page', async ({ page }) => {
    await page.goto('/admin/products', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/04-admin-products-desktop.png`,
      fullPage: true,
    });
  });

  test('5. Landing page (if admin redirects)', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/05-landing-if-redirect.png`,
      fullPage: true,
    });
  });

  test('6. Admin products - mobile viewport (375x812)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/admin/products', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/06-admin-products-mobile.png`,
      fullPage: true,
    });
  });
});
