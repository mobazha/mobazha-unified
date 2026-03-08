/**
 * Standalone Store — Complete Seller Admin Visual & UX Audit (375x667 iPhone SE)
 *
 * Full audit: Login → Admin Dashboard → Products → Orders → Settings → Wallet → Navigation
 *
 * Run: STANDALONE_ADMIN_PASS=e2e-standalone-pass \
 *      PLAYWRIGHT_BROWSERS_PATH="$HOME/Library/Caches/ms-playwright" \
 *      npx playwright test standalone-seller-admin-full-audit --project=standalone --reporter=list
 */

import { test, type Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const VIEWPORT = { width: 375, height: 667 };
const OUTPUT_DIR = path.join(__dirname, 'e2e-artifacts', 'seller-admin-full-audit');
const ADMIN_USER = 'admin';
const ADMIN_PASS = process.env.STANDALONE_ADMIN_PASS || 'e2e-standalone-pass';

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

async function login(page: Page) {
  await page.goto('/login');
  await waitForPageStable(page);
  const userInput = page.locator('input[type="text"], input[name="username"]').first();
  const passInput = page.locator('input[type="password"]').first();
  if (await userInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await userInput.fill(ADMIN_USER);
  }
  if (await passInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await passInput.fill(ADMIN_PASS);
  }
  const submitBtn = page
    .getByRole('button', { name: /login as admin|sign in|login|unlock|enter|登录|进入/i })
    .first();
  if (await submitBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await submitBtn.click();
  } else {
    await passInput.press('Enter');
  }
  await page.waitForTimeout(3000);
}

test.describe.configure({ mode: 'serial' });

test.describe('Standalone Seller Admin Full Audit (375x667)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(VIEWPORT);
  });

  // Phase 1: Login
  test('P1-1. Login page initial', async ({ page }) => {
    await page.goto('/login');
    await waitForPageStable(page);
    await capture(page, 'p1-01-login-initial');
  });

  test('P1-2. Login form filled and submit', async ({ page }) => {
    await page.goto('/login');
    await waitForPageStable(page);
    const userInput = page.locator('input[type="text"], input[name="username"]').first();
    const passInput = page.locator('input[type="password"]').first();
    if (await userInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await userInput.fill(ADMIN_USER);
    }
    if (await passInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await passInput.fill(ADMIN_PASS);
    }
    await page.waitForTimeout(300);
    await capture(page, 'p1-02-login-filled');
    const submitBtn = page
      .getByRole('button', { name: /login as admin|sign in|login|unlock|enter|登录|进入/i })
      .first();
    if (await submitBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await submitBtn.click();
    } else {
      await passInput.press('Enter');
    }
    await page.waitForTimeout(3000);
    await capture(page, 'p1-03-after-login');
  });

  // Phase 2: Admin Dashboard
  test('P2-1. Admin dashboard', async ({ page }) => {
    await login(page);
    await page.goto('/admin');
    await waitForPageStable(page);
    await capture(page, 'p2-04-admin-dashboard');
  });

  test('P2-2. Admin dashboard scroll', async ({ page }) => {
    await login(page);
    await page.goto('/admin');
    await waitForPageStable(page);
    await page.evaluate(() => window.scrollTo(0, 400));
    await page.waitForTimeout(500);
    await capture(page, 'p2-05-admin-dashboard-scroll');
  });

  test('P2-3. Admin dashboard bottom', async ({ page }) => {
    await login(page);
    await page.goto('/admin');
    await waitForPageStable(page);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    await capture(page, 'p2-06-admin-dashboard-bottom');
  });

  // Phase 3: Product Management
  test('P3-1. Admin products list', async ({ page }) => {
    await login(page);
    await page.goto('/admin/products');
    await waitForPageStable(page);
    await capture(page, 'p3-07-admin-products');
  });

  test('P3-2. Add product - open form', async ({ page }) => {
    await login(page);
    await page.goto('/admin/products');
    await waitForPageStable(page);
    const addBtn = page
      .getByRole('button', { name: /add product|add listing|new product|create/i })
      .or(page.getByRole('link', { name: /add product|add listing|new/i }))
      .or(page.locator('[data-testid="add-product"], [aria-label*="add" i]'))
      .first();
    if (await addBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await addBtn.click();
      await page.waitForTimeout(2000);
    } else {
      await page.goto('/listing/new');
      await waitForPageStable(page);
    }
    await capture(page, 'p3-08-add-product-form-top');
  });

  test('P3-3. Add product form scroll sections', async ({ page }) => {
    await login(page);
    await page.goto('/listing/new');
    await waitForPageStable(page);
    await page.evaluate(() => window.scrollTo(0, 600));
    await page.waitForTimeout(500);
    await capture(page, 'p3-09-add-product-form-mid');
    await page.evaluate(() => window.scrollTo(0, 1200));
    await page.waitForTimeout(500);
    await capture(page, 'p3-10-add-product-form-more');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    await capture(page, 'p3-11-add-product-form-bottom');
  });

  // Phase 4: Order Management
  test('P4-1. Admin orders', async ({ page }) => {
    await login(page);
    await page.goto('/admin/orders');
    await waitForPageStable(page);
    await capture(page, 'p4-12-admin-orders');
  });

  test('P4-2. Admin orders scroll', async ({ page }) => {
    await login(page);
    await page.goto('/admin/orders');
    await waitForPageStable(page);
    await page.evaluate(() => window.scrollTo(0, 400));
    await page.waitForTimeout(500);
    await capture(page, 'p4-13-admin-orders-scroll');
  });

  // Phase 5: Settings & Wallet
  test('P5-1. Admin settings', async ({ page }) => {
    await login(page);
    await page.goto('/admin/settings');
    await waitForPageStable(page);
    await capture(page, 'p5-14-admin-settings');
  });

  test('P5-2. User settings', async ({ page }) => {
    await login(page);
    await page.goto('/settings');
    await waitForPageStable(page);
    await capture(page, 'p5-15-settings');
  });

  test('P5-3. Wallet', async ({ page }) => {
    await login(page);
    await page.goto('/wallet');
    await waitForPageStable(page);
    await capture(page, 'p5-16-wallet');
  });

  // Phase 6: Admin Navigation
  test('P6-1. Admin bottom nav', async ({ page }) => {
    await login(page);
    await page.goto('/admin');
    await waitForPageStable(page);
    const nav = page.locator('nav').last();
    if (await nav.isVisible({ timeout: 2000 }).catch(() => false)) {
      ensureDir(OUTPUT_DIR);
      await nav.screenshot({ path: path.join(OUTPUT_DIR, 'p6-17-bottom-nav.png') });
    } else {
      await capture(page, 'p6-17-bottom-nav');
    }
  });

  test('P6-2. Admin products from nav', async ({ page }) => {
    await login(page);
    await page.goto('/admin');
    await waitForPageStable(page);
    const productsLink = page
      .getByRole('link', { name: /products|listings/i })
      .or(page.getByText(/products|listings/i))
      .first();
    if (await productsLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await productsLink.click();
      await page.waitForTimeout(2000);
    } else {
      await page.goto('/admin/products');
      await waitForPageStable(page);
    }
    await capture(page, 'p6-18-admin-products-via-nav');
  });

  test('P6-3. Storefront view toggle', async ({ page }) => {
    await login(page);
    await page.goto('/admin');
    await waitForPageStable(page);
    const storefrontBtn = page
      .getByRole('button', { name: /view store|storefront|buyer|shop|store/i })
      .or(page.getByRole('link', { name: /view store|storefront|buyer view/i }))
      .or(page.getByText(/view store|storefront|buyer view/i))
      .first();
    if (await storefrontBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await storefrontBtn.click();
      await page.waitForTimeout(2000);
    } else {
      await page.goto('/');
      await waitForPageStable(page);
    }
    await capture(page, 'p6-19-storefront-view');
  });

  test('P6-4. Back to admin from storefront', async ({ page }) => {
    await login(page);
    await page.goto('/');
    await waitForPageStable(page);
    const adminBtn = page
      .getByRole('button', { name: /admin|manage|dashboard/i })
      .or(page.getByRole('link', { name: /admin|manage|dashboard/i }))
      .first();
    if (await adminBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await adminBtn.click();
      await page.waitForTimeout(2000);
    } else {
      await page.goto('/admin');
      await waitForPageStable(page);
    }
    await capture(page, 'p6-20-back-to-admin');
  });
});
