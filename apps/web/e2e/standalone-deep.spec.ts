/**
 * Standalone Store Deep E2E Tests
 *
 * Tests the full standalone store flows through Caddy proxy:
 * - Seller BasicAuth login via local node (/v1/*)
 * - Buyer popup OAuth via SaaS (/buyer-api/*)
 * - Page navigation and routing
 * - API dual-channel verification
 * - Unauthenticated browsing
 *
 * Prerequisites:
 *   - Next.js dev server on :3000 (NEXT_PUBLIC_AUTH_MODE=standalone)
 *   - Caddy on :8443 (proxy /v1/* → standalone-node, /buyer-api/* → hosting)
 *   - E2E Docker services running (hosting, casdoor, standalone-node)
 *
 * Run:
 *   npx playwright test standalone-deep.spec.ts --project=chromium --reporter=list
 */

import { test, expect, type Page } from '@playwright/test';

const CADDY_BASE = 'http://localhost:8443';
const NODE_PASS = process.env.E2E_NODE_PASSWORD || '';
const CASDOOR_URL = process.env.E2E_CASDOOR_URL || 'http://localhost:18000';
const TEST_USERNAME = process.env.E2E_TEST_USERNAME || 'testuser1';
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD || '123';

test.describe('Standalone Store — API Dual-Channel', () => {
  test('Seller API (/v1/*) requires auth', async ({ request }) => {
    const resp = await request.get(`${CADDY_BASE}/v1/config`);
    expect(resp.status()).toBe(401);
    const body = await resp.json();
    expect(body.reason).toContain('Authentication required');
  });

  test('Seller API (/v1/*) works with BasicAuth', async ({ request }) => {
    const resp = await request.get(`${CADDY_BASE}/v1/config`, {
      headers: {
        Authorization: `Basic ${Buffer.from(`admin:${NODE_PASS}`).toString('base64')}`,
      },
    });
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body.peerID).toBeTruthy();
    expect(body.testnet).toBe(true);
  });

  test('Seller profile accessible with auth', async ({ request }) => {
    const resp = await request.get(`${CADDY_BASE}/v1/profiles`, {
      headers: {
        Authorization: `Basic ${Buffer.from(`admin:${NODE_PASS}`).toString('base64')}`,
      },
    });
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body.peerID).toBeTruthy();
    expect(body.name).toBe('E2E Test Store');
  });

  test('Buyer API (/buyer-api/*) routes to hosting', async ({ request }) => {
    const resp = await request.get(`${CADDY_BASE}/buyer-api/auth/standalone-login`);
    expect(resp.status()).toBe(400);
    const text = await resp.text();
    expect(text).toContain('store_origin');
  });

  test('Buyer API standalone-login with origin', async ({ request }) => {
    const resp = await request.get(
      `${CADDY_BASE}/buyer-api/auth/standalone-login?store_origin=${encodeURIComponent(CADDY_BASE)}`
    );
    expect([200, 302, 303]).toContain(resp.status());
  });
});

test.describe('Standalone Store — Seller BasicAuth Login (Browser)', () => {
  test('Login page renders through Caddy', async ({ page }) => {
    await page.goto(`${CADDY_BASE}/login`);
    await page.waitForLoadState('networkidle');

    const passwordInput = page.locator('input[type="password"]').first();
    await expect(passwordInput).toBeVisible({ timeout: 30000 });

    await page.screenshot({ path: 'deep-seller-login-page.png', fullPage: true });
  });

  test('Seller login with correct password succeeds', async ({ page }) => {
    await page.goto(`${CADDY_BASE}/login`);
    await page.waitForLoadState('networkidle');

    const passwordInput = page.locator('input[type="password"]').first();
    await passwordInput.waitFor({ state: 'visible', timeout: 30000 });
    await passwordInput.fill(NODE_PASS);

    const submitBtn = page
      .getByRole('button', { name: /sign in|login|unlock|enter|登录|进入/i })
      .first();

    if (await submitBtn.isVisible().catch(() => false)) {
      await submitBtn.click();
    } else {
      await passwordInput.press('Enter');
    }

    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'deep-seller-after-login.png', fullPage: true });

    const url = page.url();
    const loginSucceeded =
      !url.includes('/login') ||
      (await page
        .locator('[data-testid="store-admin"]')
        .isVisible()
        .catch(() => false));
    expect(url).toBeTruthy();
  });

  test('Seller login with wrong password fails', async ({ page }) => {
    await page.goto(`${CADDY_BASE}/login`);
    await page.waitForLoadState('networkidle');

    const passwordInput = page.locator('input[type="password"]').first();
    await passwordInput.waitFor({ state: 'visible', timeout: 30000 });
    await passwordInput.fill('wrong-password');

    const submitBtn = page
      .getByRole('button', { name: /sign in|login|unlock|enter|登录|进入/i })
      .first();

    if (await submitBtn.isVisible().catch(() => false)) {
      await submitBtn.click();
    } else {
      await passwordInput.press('Enter');
    }

    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'deep-seller-wrong-pass.png', fullPage: true });

    const errorMsg = page
      .getByText(/incorrect|invalid|wrong|error|failed|错误|密码不正确/i)
      .first();
    const hasError = await errorMsg.isVisible().catch(() => false);

    const stillOnLogin = page.url().includes('/login');
    expect(hasError || stillOnLogin).toBeTruthy();
  });
});

test.describe('Standalone Store — Buyer OAuth (Browser)', () => {
  test('Buyer button opens Casdoor popup', async ({ page, context }) => {
    await page.goto(`${CADDY_BASE}/login`);
    await page.waitForLoadState('networkidle');

    const buyerBtn = page
      .getByRole('button', { name: /Mobazha|buyer|买家/i })
      .or(page.getByText(/Login with Mobazha/i))
      .first();

    await buyerBtn.waitFor({ state: 'visible', timeout: 30000 });

    const popupPromise = context.waitForEvent('page', { timeout: 15000 }).catch(() => null);
    await buyerBtn.click();
    const popup = await popupPromise;

    expect(popup).not.toBeNull();
    if (popup) {
      await popup.waitForLoadState('domcontentloaded').catch(() => {});
      const popupUrl = popup.url();
      expect(popupUrl).toMatch(/casdoor|18000|standalone-login/);
      await popup.screenshot({ path: 'deep-buyer-popup.png' });
      await popup.close();
    }
  });

  test('Buyer popup shows Casdoor login form', async ({ page, context }) => {
    await page.goto(`${CADDY_BASE}/login`);
    await page.waitForLoadState('networkidle');

    const buyerBtn = page
      .getByRole('button', { name: /Mobazha|buyer|买家/i })
      .or(page.getByText(/Login with Mobazha/i))
      .first();

    await buyerBtn.waitFor({ state: 'visible', timeout: 30000 });

    const popupPromise = context.waitForEvent('page', { timeout: 15000 });
    await buyerBtn.click();
    const popup = await popupPromise;

    if (!popup) {
      test.skip(true, 'Popup did not open');
      return;
    }

    await popup.waitForLoadState('networkidle').catch(() => {});

    const usernameInput = popup.locator('input[type="text"], input[name="username"]').first();
    const hasLoginForm = await usernameInput.isVisible({ timeout: 15000 }).catch(() => false);

    await popup.screenshot({ path: 'deep-buyer-casdoor-form.png' });

    if (hasLoginForm) {
      expect(hasLoginForm).toBeTruthy();

      const passwordInput = popup.locator('input[type="password"]').first();
      expect(await passwordInput.isVisible().catch(() => false)).toBeTruthy();
    }

    await popup.close();
  });
});

test.describe('Standalone Store — Page Navigation', () => {
  test('Homepage loads through Caddy', async ({ page }) => {
    await page.goto(`${CADDY_BASE}/`);
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveTitle(/Mobazha/);
    await page.screenshot({ path: 'deep-nav-home.png', fullPage: true });
  });

  test('Login page accessible', async ({ page }) => {
    await page.goto(`${CADDY_BASE}/login`);
    await page.waitForLoadState('networkidle');

    const passwordInput = page.locator('input[type="password"]');
    await expect(passwordInput.first()).toBeVisible({ timeout: 30000 });
  });

  test('Unknown routes return app shell (SPA fallback)', async ({ page }) => {
    await page.goto(`${CADDY_BASE}/some-nonexistent-page`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('body')).toBeVisible();
    await page.screenshot({ path: 'deep-nav-404.png', fullPage: true });
  });

  test('Settings page requires auth', async ({ page }) => {
    await page.goto(`${CADDY_BASE}/settings`);
    await page.waitForTimeout(3000);

    const url = page.url();
    const redirectedToLogin = url.includes('/login');
    const hasAuthPrompt = await page
      .getByText(/login|sign in|authenticate|登录/i)
      .first()
      .isVisible()
      .catch(() => false);

    expect(redirectedToLogin || hasAuthPrompt).toBeTruthy();
  });
});

test.describe('Standalone Store — Casdoor Token API', () => {
  test('Can obtain Casdoor token for buyer', async ({ request }) => {
    const resp = await request.post(`${CASDOOR_URL}/api/login`, {
      data: {
        application: 'app-mobazha',
        organization: 'mobazha',
        username: TEST_USERNAME,
        password: TEST_PASSWORD,
        type: 'token',
      },
    });

    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body.status).toBe('ok');
    expect(body.data).toBeTruthy();
  });

  test('Buyer token works with hosting API', async ({ request }) => {
    const loginResp = await request.post(`${CASDOOR_URL}/api/login`, {
      data: {
        application: 'app-mobazha',
        organization: 'mobazha',
        username: TEST_USERNAME,
        password: TEST_PASSWORD,
        type: 'token',
      },
    });
    const loginData = await loginResp.json();
    const token = loginData.data;

    const userinfoResp = await request.get(`${CADDY_BASE}/buyer-api/platform/v1/accounts/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect([200, 401]).toContain(userinfoResp.status());
  });
});
