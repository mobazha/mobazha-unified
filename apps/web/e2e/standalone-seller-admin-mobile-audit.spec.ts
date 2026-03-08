/**
 * Seller Admin Mobile UX Audit — 375x667 (iPhone SE) Telegram Mini App simulation
 *
 * Tests the standalone store seller admin experience on mobile:
 * - Login flow
 * - Admin dashboard, products, orders, settings
 * - Mobile layout, navigation, forms
 *
 * Run: E2E_STANDALONE_URL=http://localhost:3002 E2E_STANDALONE_PASS=test-standalone-pass \
 *      npx playwright test seller-admin-mobile-audit --project=standalone
 *
 * Or with default (reads password from docker): npx playwright test seller-admin-mobile-audit --project=standalone
 */

import { test, expect, type Page } from '@playwright/test';
import { performStandaloneLogin } from './fixtures/standalone-auth';

const BASE = process.env.E2E_STANDALONE_URL || 'http://localhost:3002';
const VIEWPORT = { width: 375, height: 667 }; // iPhone SE

let standaloneAvailable = false;
let adminPassword = '';

test.beforeAll(async ({ request }) => {
  adminPassword = process.env.E2E_STANDALONE_PASS || 'test-standalone-pass';
  try {
    const resp = await request.get(BASE, { timeout: 5000 });
    standaloneAvailable = resp.status() > 0;
  } catch {
    standaloneAvailable = false;
  }
});

test.beforeEach(async ({ page }) => {
  test.skip(!standaloneAvailable, `Standalone store not available at ${BASE}`);
  await page.setViewportSize(VIEWPORT);
});

test.describe('Seller Admin Mobile Audit — Homepage & Access', () => {
  test('01-homepage loads', async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState('domcontentloaded');
    await page.screenshot({ path: 'audit-output/01-homepage.png', fullPage: true });
    await expect(page.locator('body')).toBeVisible();
  });

  test('02-admin-link or login entry', async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState('domcontentloaded');

    // Look for admin/login/seller entry points
    const adminLink = page.getByRole('link', { name: /admin|dashboard|manage|管理/i });
    const loginLink = page.getByRole('link', { name: /login|sign in|登录/i });
    const sellerBtn = page.getByRole('button', { name: /seller|store admin|店铺管理/i });

    const hasAdmin = await adminLink
      .first()
      .isVisible()
      .catch(() => false);
    const hasLogin = await loginLink
      .first()
      .isVisible()
      .catch(() => false);
    const hasSeller = await sellerBtn
      .first()
      .isVisible()
      .catch(() => false);

    await page.screenshot({ path: 'audit-output/02-homepage-nav.png', fullPage: true });

    // Try direct navigation to admin
    await page.goto(`${BASE}/admin`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'audit-output/02-admin-direct.png', fullPage: true });
  });

  test('03-login-page', async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'audit-output/03-login-page.png', fullPage: true });

    const passwordInput = page.locator('input[type="password"]').first();
    await expect(passwordInput).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Seller Admin Mobile Audit — Login & Dashboard', () => {
  test('04-seller-login', async ({ page }) => {
    await performStandaloneLogin(page, adminPassword);
    await page.screenshot({ path: 'audit-output/04-after-login.png', fullPage: true });
  });

  test('05-admin-dashboard', async ({ page }) => {
    await performStandaloneLogin(page, adminPassword);
    await page.goto(`${BASE}/admin`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'audit-output/05-admin-dashboard.png', fullPage: true });
  });

  test('06-admin-products-list', async ({ page }) => {
    await performStandaloneLogin(page, adminPassword);
    await page.goto(`${BASE}/admin/products`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'audit-output/06-admin-products.png', fullPage: true });
  });

  test('07-admin-products-add', async ({ page }) => {
    await performStandaloneLogin(page, adminPassword);
    await page.goto(`${BASE}/listing/new?from=admin`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'audit-output/07-admin-product-add.png', fullPage: true });
  });

  test('08-admin-orders', async ({ page }) => {
    await performStandaloneLogin(page, adminPassword);
    await page.goto(`${BASE}/admin/orders`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'audit-output/08-admin-orders.png', fullPage: true });
  });

  test('09-admin-settings', async ({ page }) => {
    await performStandaloneLogin(page, adminPassword);
    await page.goto(`${BASE}/admin/settings`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'audit-output/09-admin-settings.png', fullPage: true });
  });

  test('10-admin-settings-profile', async ({ page }) => {
    await performStandaloneLogin(page, adminPassword);
    await page.goto(`${BASE}/admin/settings/profile`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'audit-output/10-admin-settings-profile.png', fullPage: true });
  });

  test('11-admin-mobile-bottom-tabs', async ({ page }) => {
    await performStandaloneLogin(page, adminPassword);
    await page.goto(`${BASE}/admin`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
    // Bottom tabs should be visible on mobile
    const bottomNav = page
      .locator('nav[aria-label*="navigation"], [data-testid*="mobile-tab"]')
      .first();
    await page.screenshot({ path: 'audit-output/11-admin-bottom-tabs.png', fullPage: true });
  });
});
