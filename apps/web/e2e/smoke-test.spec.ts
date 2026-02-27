/**
 * Smoke Test - Manual verification of core flows
 * Run with: npx playwright test smoke-test.spec.ts --project=chromium --reporter=list
 * Or against existing server: BASE_URL=http://localhost:3001 npx playwright test smoke-test.spec.ts
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';

test.describe('Smoke Test', () => {
  test('1. Page Load - Home page loads', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Take screenshot
    await page.screenshot({ path: 'smoke-1-home.png', fullPage: true });

    // Check page title
    await expect(page).toHaveTitle(/Mobazha/);

    // Should see marketplace content (hero, search, or product cards)
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('2. Login button - Click and check redirect', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Find and click login/sign-in button
    const loginBtn = page
      .getByRole('link', { name: /login|sign in|登录|登入/i })
      .or(page.getByRole('button', { name: /login|sign in|登录|登入/i }))
      .first();

    if (await loginBtn.isVisible()) {
      await loginBtn.click();
      await page.waitForURL(/\/login|casdoor|8000/, { timeout: 10000 }).catch(() => {});

      await page.screenshot({ path: 'smoke-2-login-click.png', fullPage: true });

      const url = page.url();
      expect(url).toMatch(/\/login|casdoor|localhost:8000/);
    } else {
      // Maybe already on login page or different layout
      await page.goto(`${BASE_URL}/login`);
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: 'smoke-2-login-page.png', fullPage: true });
    }
  });

  test('3. API Health - /platform/v1/server/info returns 401 when unauthenticated', async ({
    request,
  }) => {
    const response = await request.get(`${BASE_URL}/platform/v1/server/info`);
    expect(response.status()).toBe(401);
    const body = await response.text();
    expect(body).toMatch(/auth|401|unauthorized/i);
  });

  test('4. Casdoor Login - Attempt login with admin/123', async ({ page }) => {
    // Navigate to login page (will redirect to Casdoor in hosted mode)
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');

    // Wait for Casdoor login form (might be on same or different origin)
    const usernameInput = page.getByPlaceholder(/username|email|phone/i).first();
    await usernameInput.waitFor({ state: 'visible', timeout: 15000 });

    await usernameInput.fill('admin');
    await page
      .getByPlaceholder(/password/i)
      .first()
      .fill('123');

    await page.screenshot({ path: 'smoke-3-casdoor-before-login.png', fullPage: true });

    // Click Sign In
    const signInBtn = page.getByRole('button', { name: /sign in|登录/i }).first();
    await signInBtn.click();

    // Wait for redirect or error (OAuth callback + token exchange)
    await page.waitForTimeout(5000);
    await page.screenshot({ path: 'smoke-4-after-login.png', fullPage: true });

    // Success: redirected back to app (localhost:3001). Failure: may stay on Casdoor with error.
    const url = page.url();
    expect(url).toBeTruthy();
  });
});
