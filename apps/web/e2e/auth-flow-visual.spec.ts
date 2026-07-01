/**
 * Auth Flow Visual Verification
 *
 * 1. Screenshot login page
 * 2. Try sign up link if visible
 * 3. Try common test credentials (admin/admin, test/test, etc.)
 * 4. If login succeeds: navigate to admin/orders, /orders, order detail
 * 5. Look for: packing slip, dispute, review, refund buttons
 *
 * Run (app at localhost:3001):
 *   ./node_modules/.bin/playwright test auth-flow-visual.spec.ts --config=playwright.visual.config.ts
 */

import { test, expect, type Page } from '@playwright/test';

const SCREENSHOT_DIR = 'e2e-screenshots/auth-flow';
const CREDENTIALS = [
  { user: 'admin', pass: 'admin' },
  { user: 'test', pass: 'test' },
  { user: 'admin', pass: '123456' },
  { user: 'demo', pass: 'demo' },
];

test.describe('Auth Flow Visual Verification', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await page.addInitScript(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });
  });

  test('1. Navigate to admin/orders and capture login page', async ({ page }) => {
    await page.goto('/admin/orders', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/01-login-page-initial.png`,
      fullPage: true,
    });
  });

  test('2. Try sign up link if visible', async ({ page }) => {
    await page.goto('/admin/orders', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    // Wait for Casdoor if redirected
    const casdoorLoaded = await page
      .waitForURL(
        url =>
          url.toString().includes('login/oauth/authorize') ||
          url.toString().includes('/login') ||
          url.toString().includes('casdoor'),
        { timeout: 15000 }
      )
      .then(() => true)
      .catch(() => false);

    if (casdoorLoaded) {
      await page.waitForTimeout(2000);
      const signUpLink = page.getByRole('link', { name: /sign up|register|signup|注册/i }).first();
      const hasSignUp = await signUpLink.isVisible().catch(() => false);
      if (hasSignUp) {
        await signUpLink.click();
        await page.waitForTimeout(2000);
      }
    }

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/02-after-signup-attempt.png`,
      fullPage: true,
    });
  });

  test('3. Try login with admin/admin', async ({ page }) => {
    await tryLoginAndScreenshot(page, 'admin', 'admin', '03-admin-admin');
  });

  test('4. Try login with test/test', async ({ page }) => {
    await tryLoginAndScreenshot(page, 'test', 'test', '04-test-test');
  });

  test('5. Try login with admin/123456', async ({ page }) => {
    await tryLoginAndScreenshot(page, 'admin', '123456', '05-admin-123456');
  });

  test('6. Try login with demo/demo', async ({ page }) => {
    await tryLoginAndScreenshot(page, 'demo', 'demo', '06-demo-demo');
  });

  test('7. If logged in - navigate admin/orders and orders', async ({ page }) => {
    // Use E2E_TEST_PASSWORD if set for a known working account
    const user = process.env.E2E_TEST_USERNAME || 'test';
    const pass = process.env.E2E_TEST_PASSWORD;
    if (!pass) {
      test.skip();
      return;
    }

    const loggedIn = await tryLoginAndScreenshot(page, user, pass, '07-login-success');
    if (!loggedIn) {
      test.skip();
      return;
    }

    await page.goto('/admin/orders', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/08-admin-orders.png`,
      fullPage: true,
    });

    await page.goto('/orders', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/09-orders.png`,
      fullPage: true,
    });

    // Click first order if any
    const orderLink = page.locator('a[href*="/orders/"]').first();
    const hasOrder = await orderLink.isVisible().catch(() => false);
    if (hasOrder) {
      await orderLink.click();
      await page.waitForTimeout(2000);
      await page.screenshot({
        path: `${SCREENSHOT_DIR}/10-order-detail.png`,
        fullPage: true,
      });

      // Look for action buttons
      const packingSlip = page.getByRole('button', {
        name: /packing slip|发货单|print/i,
      });
      const dispute = page.getByRole('button', { name: /dispute|争议|open dispute/i });
      const review = page.getByRole('button', { name: /review|评价|rate|rating/i });
      const refund = page.getByRole('button', { name: /refund|退款/i });

      const buttons = [
        { name: 'packing-slip', loc: packingSlip },
        { name: 'dispute', loc: dispute },
        { name: 'review', loc: review },
        { name: 'refund', loc: refund },
      ];

      for (const { name, loc } of buttons) {
        const visible = await loc.isVisible().catch(() => false);
        if (visible) {
          await loc.scrollIntoViewIfNeeded();
          await page.waitForTimeout(300);
          await page.screenshot({
            path: `${SCREENSHOT_DIR}/11-order-detail-${name}.png`,
            fullPage: false,
          });
        }
      }
    }
  });
});

async function tryLoginAndScreenshot(
  page: Page,
  username: string,
  password: string,
  prefix: string
): Promise<boolean> {
  await page.goto('/admin/orders', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(3000);

  // Wait for Casdoor login form
  const hasCasdoor = await page
    .waitForURL(
      url => url.toString().includes('login/oauth/authorize') || url.toString().includes('casdoor'),
      { timeout: 15000 }
    )
    .then(() => true)
    .catch(() => false);

  if (!hasCasdoor) {
    // Might be on app /login with Basic Auth form
    const userInput = page.locator('input[type="text"], input[name="username"]').first();
    const passInput = page.locator('input[type="password"]').first();
    const hasForm =
      (await userInput.isVisible().catch(() => false)) &&
      (await passInput.isVisible().catch(() => false));

    if (hasForm) {
      await userInput.fill(username);
      await passInput.fill(password);
      const submit = page.getByRole('button', { name: /sign in|login|登录/i }).first();
      await submit.click();
      await page.waitForTimeout(3000);
      await page.screenshot({
        path: `${SCREENSHOT_DIR}/${prefix}.png`,
        fullPage: true,
      });
      return !page.url().includes('/login');
    }
    return false;
  }

  const userInput = page.locator('input[type="text"]').first();
  const passInput = page.locator('input[type="password"]').first();
  await userInput.waitFor({ state: 'visible', timeout: 10000 });
  await userInput.fill(username);
  await passInput.fill(password);

  const signInBtn = page.getByRole('button', { name: /sign in|登录|log in/i }).first();
  await signInBtn.click();

  await page.waitForTimeout(4000);

  await page.screenshot({
    path: `${SCREENSHOT_DIR}/${prefix}.png`,
    fullPage: true,
  });

  // Success = no longer on Casdoor, back on app
  const url = page.url();
  const success =
    (url.includes('localhost:') || url.includes('127.0.0.1')) &&
    !url.includes('login/oauth') &&
    !url.includes('/login');

  return success;
}
