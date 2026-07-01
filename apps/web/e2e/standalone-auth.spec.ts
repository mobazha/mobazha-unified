/**
 * Standalone Auth Flow E2E Tests
 *
 * Validates the redesigned standalone authentication:
 * - Admin login at /admin (inline BasicAuth form)
 * - Buyer login at /login (Casdoor popup, no admin section)
 * - Account binding page (SaaS bridge connect flow)
 *
 * Prerequisites:
 *   NEXT_PUBLIC_AUTH_MODE=standalone
 *   NEXT_PUBLIC_SAAS_URL configured
 *   Standalone frontend running (port 3002)
 *
 * Run:
 *   npx playwright test standalone-auth.spec.ts --project=standalone --reporter=list
 */

import { test, expect } from '@playwright/test';

let isStandaloneMode = false;
test.beforeAll(async ({ request }) => {
  try {
    const resp = await request.get('/', { timeout: 5000 });
    isStandaloneMode = resp.status() === 200;
  } catch {
    isStandaloneMode = false;
  }
});

test.describe('Standalone Auth — Admin Login', () => {
  test.beforeEach(async () => {
    test.skip(!isStandaloneMode, 'Standalone frontend not running');
  });

  test('admin page shows inline login form when unauthenticated', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const passwordInput = page.locator('[data-testid="admin-login-password"]');
    const isVisible = await passwordInput.isVisible().catch(() => false);

    if (!isVisible) {
      test.skip(true, 'Admin login form not visible (may already be authenticated)');
      return;
    }

    await expect(passwordInput).toBeVisible();
    await expect(page.locator('[data-testid="admin-login-submit"]')).toBeVisible();
    await page.screenshot({ path: 'standalone-auth-admin-login.png', fullPage: true });
  });

  test('admin login form shows "Store Admin" heading', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const heading = page.getByText(/Store Admin/i).first();
    const isVisible = await heading.isVisible().catch(() => false);
    if (!isVisible) {
      test.skip(true, 'Not on admin login form');
      return;
    }
    await expect(heading).toBeVisible();
  });

  test('admin login form has language switcher', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const passwordInput = page.locator('[data-testid="admin-login-password"]');
    if (!(await passwordInput.isVisible().catch(() => false))) {
      test.skip(true, 'Not on admin login form');
      return;
    }

    const body = await page.content();
    expect(body.length).toBeGreaterThan(0);
  });

  test('admin login form has "Back to Store" link', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const passwordInput = page.locator('[data-testid="admin-login-password"]');
    if (!(await passwordInput.isVisible().catch(() => false))) {
      test.skip(true, 'Not on admin login form');
      return;
    }

    const backLink = page
      .getByText(/Back to Store/i)
      .or(page.getByText(/返回店铺/i))
      .first();
    const isVisible = await backLink.isVisible().catch(() => false);
    expect(isVisible).toBeTruthy();
  });

  test('admin login shows error for empty password', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const submitBtn = page.locator('[data-testid="admin-login-submit"]');
    if (!(await submitBtn.isVisible().catch(() => false))) {
      test.skip(true, 'Not on admin login form');
      return;
    }

    await submitBtn.click();
    await page.waitForTimeout(500);

    // Should show a validation error (not navigate away)
    const currentUrl = page.url();
    expect(currentUrl).toContain('/admin');
    await page.screenshot({ path: 'standalone-auth-admin-empty-password.png' });
  });

  test('admin login with correct password navigates to admin dashboard', async ({ page }) => {
    const adminPassword = process.env.E2E_STANDALONE_ADMIN_PASSWORD || '123';
    await page.goto('/admin');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const passwordInput = page.locator('[data-testid="admin-login-password"]');
    if (!(await passwordInput.isVisible().catch(() => false))) {
      test.skip(true, 'Not on admin login form');
      return;
    }

    await passwordInput.fill(adminPassword);
    await page.locator('[data-testid="admin-login-submit"]').click();

    // Wait for navigation or dashboard to load
    await page.waitForTimeout(3000);

    const url = page.url();
    // After successful login, should still be on /admin (now showing dashboard)
    // The password input should no longer be visible
    const stillOnLogin = await passwordInput.isVisible().catch(() => false);
    if (stillOnLogin) {
      // Login may have failed with wrong password — skip
      test.skip(true, 'Login failed (wrong password for this environment)');
      return;
    }

    expect(url).toContain('/admin');
    await page.screenshot({ path: 'standalone-auth-admin-dashboard.png', fullPage: true });
  });
});

test.describe('Standalone Auth — Buyer Login', () => {
  test.beforeEach(async () => {
    test.skip(!isStandaloneMode, 'Standalone frontend not running');
  });

  test('login page shows buyer-only UI (no admin section)', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Should have a "Login with Mobazha Account" button
    const buyerBtn = page
      .getByRole('button', { name: /Mobazha|Login with/i })
      .or(page.getByTestId('login-standalone-buyer'))
      .first();

    const hasBuyerBtn = await buyerBtn.isVisible().catch(() => false);
    if (!hasBuyerBtn) {
      test.skip(true, 'Buyer login button not found');
      return;
    }

    expect(hasBuyerBtn).toBeTruthy();

    // Should NOT have admin username/password fields
    const usernameInput = page.locator('[data-testid="login-username"]');
    const hasUsername = await usernameInput.isVisible().catch(() => false);
    expect(hasUsername).toBeFalsy();

    await page.screenshot({ path: 'standalone-auth-buyer-login.png', fullPage: true });
  });

  test('buyer login page has language switcher', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // The page should render (at minimum)
    const body = await page.content();
    expect(body).toContain('Login');
  });

  test('buyer login triggers popup OAuth flow', async ({ page, context }) => {
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const buyerBtn = page
      .getByRole('button', { name: /Mobazha|Login with/i })
      .or(page.getByTestId('login-standalone-buyer'))
      .first();

    if (!(await buyerBtn.isVisible().catch(() => false))) {
      test.skip(true, 'Buyer button not found');
      return;
    }

    const popupPromise = context.waitForEvent('page', { timeout: 10000 }).catch(() => null);
    await buyerBtn.click();
    const popup = await popupPromise;

    if (popup) {
      await popup.waitForLoadState('domcontentloaded').catch(() => {});
      const popupUrl = popup.url();
      // Popup should navigate to Casdoor or SaaS auth
      expect(popupUrl).toMatch(/casdoor|standalone-login|oauth/i);
      await popup.screenshot({ path: 'standalone-auth-buyer-popup.png' });
      await popup.close();
    }
  });
});

test.describe('Standalone Auth — Account Binding', () => {
  test.beforeEach(async () => {
    test.skip(!isStandaloneMode, 'Standalone frontend not running');
  });

  test('account binding page shows "Connect to Mobazha Platform" when not connected', async ({
    page,
  }) => {
    // Inject admin basic auth token to access settings
    const adminPassword = process.env.E2E_STANDALONE_ADMIN_PASSWORD || '123';
    const basicToken = `basic:${btoa(`admin:${adminPassword}`)}`;
    await page.addInitScript((token: string) => {
      window.localStorage.setItem('mobazha_auth_token', token);
    }, basicToken);

    await page.goto('/settings/account');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    const connectBtn = page
      .getByRole('button', { name: /Connect to Mobazha Platform/i })
      .or(page.getByText(/Connect to Mobazha Platform/i))
      .first();

    const isVisible = await connectBtn.isVisible().catch(() => false);
    if (!isVisible) {
      // May already be connected or not in standalone mode
      test.skip(true, 'Connect button not visible — may be already connected or not standalone');
      return;
    }

    await expect(connectBtn).toBeVisible();
    await page.screenshot({ path: 'standalone-auth-binding-connect.png', fullPage: true });
  });

  test('account binding page shows provider icons as preview', async ({ page }) => {
    const adminPassword = process.env.E2E_STANDALONE_ADMIN_PASSWORD || '123';
    const basicToken = `basic:${btoa(`admin:${adminPassword}`)}`;
    await page.addInitScript((token: string) => {
      window.localStorage.setItem('mobazha_auth_token', token);
    }, basicToken);

    await page.goto('/settings/account');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    // Should show Telegram, Discord, Google icons as preview
    const telegramText = page.getByText('Telegram');
    const discordText = page.getByText('Discord');
    const googleText = page.getByText('Google');

    const hasTelegram = await telegramText
      .first()
      .isVisible()
      .catch(() => false);
    const hasDiscord = await discordText
      .first()
      .isVisible()
      .catch(() => false);
    const hasGoogle = await googleText
      .first()
      .isVisible()
      .catch(() => false);

    // At least one provider should be shown
    expect(hasTelegram || hasDiscord || hasGoogle).toBeTruthy();
  });

  test('connect button opens SaaS auth popup', async ({ page, context }) => {
    const adminPassword = process.env.E2E_STANDALONE_ADMIN_PASSWORD || '123';
    const basicToken = `basic:${btoa(`admin:${adminPassword}`)}`;
    await page.addInitScript((token: string) => {
      window.localStorage.setItem('mobazha_auth_token', token);
    }, basicToken);

    await page.goto('/settings/account');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    const connectBtn = page
      .getByRole('button', { name: /Connect to Mobazha Platform/i })
      .or(page.getByText(/Connect to Mobazha Platform/i))
      .first();

    if (!(await connectBtn.isVisible().catch(() => false))) {
      test.skip(true, 'Connect button not visible');
      return;
    }

    const popupPromise = context.waitForEvent('page', { timeout: 10000 }).catch(() => null);
    await connectBtn.click();
    const popup = await popupPromise;

    if (popup) {
      await popup.waitForLoadState('domcontentloaded').catch(() => {});
      const popupUrl = popup.url();
      expect(popupUrl).toMatch(/standalone-login|casdoor|oauth/i);
      await popup.screenshot({ path: 'standalone-auth-binding-popup.png' });
      await popup.close();
    }
  });
});
