/**
 * Standalone Store — Seller Admin Visual Audit (375x667 iPhone SE)
 *
 * Simulates Telegram Mini App mobile seller admin experience.
 * Captures screenshots for product design review.
 *
 * Prerequisites:
 *   - Standalone frontend: pnpm dev --mode standalone --port 3002
 *   - Standalone backend running (e.g. Docker E2E)
 *
 * Run: STANDALONE_BASE_URL=http://localhost:3002 \
 *      PLAYWRIGHT_BROWSERS_PATH="$HOME/Library/Caches/ms-playwright" \
 *      npx playwright test standalone-seller-admin-audit --project=standalone --reporter=list
 */

import { test, type Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const VIEWPORT = { width: 375, height: 667 };
const OUTPUT_DIR = path.join(__dirname, 'e2e-artifacts', 'seller-admin-audit');
const ADMIN_USER = 'admin';
const ADMIN_PASS = process.env.STANDALONE_ADMIN_PASS || 'test-standalone-pass';

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

test.describe('Standalone Seller Admin Visual Audit (375x667)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(VIEWPORT);
  });

  test('1. Login page — initial', async ({ page }) => {
    await page.goto('/login');
    await waitForPageStable(page);
    await capture(page, '01-login-initial');
  });

  test('2. Login form — filled', async ({ page }) => {
    await page.goto('/login');
    await waitForPageStable(page);
    const userInput = page
      .locator('input[type="text"], input[name="username"], input[placeholder*="user" i]')
      .first();
    const passInput = page.locator('input[type="password"]').first();
    if (await userInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await userInput.fill(ADMIN_USER);
    }
    if (await passInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await passInput.fill(ADMIN_PASS);
    }
    await page.waitForTimeout(300);
    await capture(page, '02-login-filled');
  });

  test('3. After login — landing page', async ({ page }) => {
    await page.goto('/login');
    await waitForPageStable(page);
    const passInput = page.locator('input[type="password"]').first();
    const userInput = page.locator('input[type="text"], input[name="username"]').first();
    if (await userInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await userInput.fill(ADMIN_USER);
    }
    if (await passInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await passInput.fill(ADMIN_PASS);
    }
    const submitBtn = page
      .getByRole('button', { name: /sign in|login|unlock|enter|登录|进入/i })
      .first();
    if (await submitBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await submitBtn.click();
    } else {
      await passInput.press('Enter');
    }
    await page.waitForTimeout(3000);
    await capture(page, '03-after-login');
  });

  test('4. Admin dashboard', async ({ page }) => {
    await page.goto('/login');
    await waitForPageStable(page);
    const passInput = page.locator('input[type="password"]').first();
    const userInput = page.locator('input[type="text"], input[name="username"]').first();
    if (await userInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await userInput.fill(ADMIN_USER);
    }
    if (await passInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await passInput.fill(ADMIN_PASS);
    }
    const submitBtn = page
      .getByRole('button', { name: /sign in|login|unlock|enter|登录|进入/i })
      .first();
    if (await submitBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await submitBtn.click();
    } else {
      await passInput.press('Enter');
    }
    await page.waitForTimeout(2000);
    await page.goto('/admin');
    await waitForPageStable(page);
    await capture(page, '04-admin-dashboard');
  });

  test('5. Admin products', async ({ page }) => {
    await page.goto('/login');
    await waitForPageStable(page);
    const passInput = page.locator('input[type="password"]').first();
    const userInput = page.locator('input[type="text"], input[name="username"]').first();
    if (await userInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await userInput.fill(ADMIN_USER);
    }
    if (await passInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await passInput.fill(ADMIN_PASS);
    }
    const submitBtn = page
      .getByRole('button', { name: /sign in|login|unlock|enter|登录|进入/i })
      .first();
    if (await submitBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await submitBtn.click();
    } else {
      await passInput.press('Enter');
    }
    await page.waitForTimeout(2000);
    await page.goto('/admin/products');
    await waitForPageStable(page);
    await capture(page, '05-admin-products');
  });

  test('6. Admin orders', async ({ page }) => {
    await page.goto('/login');
    await waitForPageStable(page);
    const passInput = page.locator('input[type="password"]').first();
    const userInput = page.locator('input[type="text"], input[name="username"]').first();
    if (await userInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await userInput.fill(ADMIN_USER);
    }
    if (await passInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await passInput.fill(ADMIN_PASS);
    }
    const submitBtn = page
      .getByRole('button', { name: /sign in|login|unlock|enter|登录|进入/i })
      .first();
    if (await submitBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await submitBtn.click();
    } else {
      await passInput.press('Enter');
    }
    await page.waitForTimeout(2000);
    await page.goto('/admin/orders');
    await waitForPageStable(page);
    await capture(page, '06-admin-orders');
  });

  test('7. Admin settings', async ({ page }) => {
    await page.goto('/login');
    await waitForPageStable(page);
    const passInput = page.locator('input[type="password"]').first();
    const userInput = page.locator('input[type="text"], input[name="username"]').first();
    if (await userInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await userInput.fill(ADMIN_USER);
    }
    if (await passInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await passInput.fill(ADMIN_PASS);
    }
    const submitBtn = page
      .getByRole('button', { name: /sign in|login|unlock|enter|登录|进入/i })
      .first();
    if (await submitBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await submitBtn.click();
    } else {
      await passInput.press('Enter');
    }
    await page.waitForTimeout(2000);
    await page.goto('/admin/settings');
    await waitForPageStable(page);
    await capture(page, '07-admin-settings');
  });

  test('8. Settings (user settings)', async ({ page }) => {
    await page.goto('/login');
    await waitForPageStable(page);
    const passInput = page.locator('input[type="password"]').first();
    const userInput = page.locator('input[type="text"], input[name="username"]').first();
    if (await userInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await userInput.fill(ADMIN_USER);
    }
    if (await passInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await passInput.fill(ADMIN_PASS);
    }
    const submitBtn = page
      .getByRole('button', { name: /sign in|login|unlock|enter|登录|进入/i })
      .first();
    if (await submitBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await submitBtn.click();
    } else {
      await passInput.press('Enter');
    }
    await page.waitForTimeout(2000);
    await page.goto('/settings');
    await waitForPageStable(page);
    await capture(page, '08-settings');
  });

  test('9. Wallet', async ({ page }) => {
    await page.goto('/login');
    await waitForPageStable(page);
    const passInput = page.locator('input[type="password"]').first();
    const userInput = page.locator('input[type="text"], input[name="username"]').first();
    if (await userInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await userInput.fill(ADMIN_USER);
    }
    if (await passInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await passInput.fill(ADMIN_PASS);
    }
    const submitBtn = page
      .getByRole('button', { name: /sign in|login|unlock|enter|登录|进入/i })
      .first();
    if (await submitBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await submitBtn.click();
    } else {
      await passInput.press('Enter');
    }
    await page.waitForTimeout(2000);
    await page.goto('/wallet');
    await waitForPageStable(page);
    await capture(page, '09-wallet');
  });

  test('10. Add product page', async ({ page }) => {
    await page.goto('/login');
    await waitForPageStable(page);
    const passInput = page.locator('input[type="password"]').first();
    const userInput = page.locator('input[type="text"], input[name="username"]').first();
    if (await userInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await userInput.fill(ADMIN_USER);
    }
    if (await passInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await passInput.fill(ADMIN_PASS);
    }
    const submitBtn = page
      .getByRole('button', { name: /sign in|login|unlock|enter|登录|进入/i })
      .first();
    if (await submitBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await submitBtn.click();
    } else {
      await passInput.press('Enter');
    }
    await page.waitForTimeout(2000);
    await page.goto('/listing/new');
    await waitForPageStable(page);
    await capture(page, '10-add-product');
  });

  test('11. Bottom navigation in admin mode', async ({ page }) => {
    await page.goto('/login');
    await waitForPageStable(page);
    const passInput = page.locator('input[type="password"]').first();
    const userInput = page.locator('input[type="text"], input[name="username"]').first();
    if (await userInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await userInput.fill(ADMIN_USER);
    }
    if (await passInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await passInput.fill(ADMIN_PASS);
    }
    const submitBtn = page
      .getByRole('button', { name: /sign in|login|unlock|enter|登录|进入/i })
      .first();
    if (await submitBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await submitBtn.click();
    } else {
      await passInput.press('Enter');
    }
    await page.waitForTimeout(2000);
    await page.goto('/admin');
    await waitForPageStable(page);
    const nav = page.locator('nav').last();
    if (await nav.isVisible({ timeout: 2000 }).catch(() => false)) {
      await nav.screenshot({ path: path.join(OUTPUT_DIR, '11-bottom-nav.png') });
    } else {
      await capture(page, '11-bottom-nav');
    }
  });

  test('12. Storefront toggle (buyer view)', async ({ page }) => {
    await page.goto('/login');
    await waitForPageStable(page);
    const passInput = page.locator('input[type="password"]').first();
    const userInput = page.locator('input[type="text"], input[name="username"]').first();
    if (await userInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await userInput.fill(ADMIN_USER);
    }
    if (await passInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await passInput.fill(ADMIN_PASS);
    }
    const submitBtn = page
      .getByRole('button', { name: /sign in|login|unlock|enter|登录|进入/i })
      .first();
    if (await submitBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await submitBtn.click();
    } else {
      await passInput.press('Enter');
    }
    await page.waitForTimeout(2000);
    await page.goto('/admin');
    await waitForPageStable(page);
    const storefrontBtn = page
      .getByRole('button', { name: /store|storefront|view store|buyer|shop/i })
      .or(page.getByText(/view store|storefront|buyer view/i))
      .first();
    if (await storefrontBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await storefrontBtn.click();
      await page.waitForTimeout(2000);
    } else {
      await page.goto('/');
      await waitForPageStable(page);
    }
    await capture(page, '12-storefront-view');
  });
});
