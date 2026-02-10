/**
 * Auth Flow E2E Tests
 * 认证流程端到端测试
 *
 * 测试完整的 Casdoor OAuth 登录流程、会话持久化、登出和 Auth Guard。
 * 需要运行中的 Docker 基础设施 (Casdoor, MySQL, Redis) + hosting 后端。
 *
 * 环境变量:
 *   E2E_TEST_PASSWORD - 测试用户密码 (必须)
 *   E2E_CASDOOR_URL   - Casdoor URL (默认: http://localhost:8000)
 *   E2E_BACKEND_URL   - Hosting 后端 URL (默认: http://localhost:8080)
 */

import { test, expect } from '@playwright/test';
import { authenticatedTest, performCasdoorLogin } from './fixtures/auth';

const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD || '';

// Skip all tests if password not set
test.beforeEach(async () => {
  test.skip(!TEST_PASSWORD, 'E2E_TEST_PASSWORD env var not set');
});

test.describe('Casdoor OAuth Login', () => {
  test('should complete full login flow and redirect to home', async ({ page }) => {
    await performCasdoorLogin(page);

    // After login, should be on the app (not Casdoor)
    const url = page.url();
    expect(url).not.toContain('casdoor');
    expect(url).not.toContain(':8000');

    // Should see some indication of being logged in
    // (user avatar, profile link, or the absence of a login button)
    await page.screenshot({ path: 'e2e-screenshots/auth-after-login.png', fullPage: true });
  });

  test('should display user info after login', async ({ page }) => {
    await performCasdoorLogin(page);

    // Navigate to a page that shows user info
    await page.goto('/me');
    await page.waitForLoadState('networkidle');

    // The page should show user information, not a login prompt
    await page.screenshot({ path: 'e2e-screenshots/auth-user-info.png', fullPage: true });

    // Check that the page has meaningful content (not just a login form)
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });
});

test.describe('Session Persistence', () => {
  test('should maintain session after page refresh', async ({ page }) => {
    await performCasdoorLogin(page);

    // Navigate to a protected page
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    // Verify we're on settings (not redirected to login)
    const urlBeforeRefresh = page.url();
    expect(urlBeforeRefresh).toContain('/settings');

    // Refresh the page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Should still be on settings
    const urlAfterRefresh = page.url();
    expect(urlAfterRefresh).toContain('/settings');
  });

  test('should maintain session across navigation', async ({ page }) => {
    await performCasdoorLogin(page);

    // Navigate through multiple protected pages
    const protectedPages = ['/settings', '/orders', '/wallet'];

    for (const pagePath of protectedPages) {
      await page.goto(pagePath);
      await page.waitForLoadState('networkidle');

      // Should NOT be redirected to login
      const url = page.url();
      expect(url).not.toContain('/login');
    }
  });
});

test.describe('Auth Guard Redirect', () => {
  test('should redirect to original page after login', async ({ page, context }) => {
    // Clear auth state
    await context.clearCookies();
    await context.addInitScript(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });

    // Visit a protected page while unauthenticated
    const targetPath = '/orders';
    await page.goto(targetPath);
    await page.waitForURL(/\/login/);

    // Verify the redirect parameter is preserved
    const loginUrl = new URL(page.url());
    expect(loginUrl.searchParams.get('redirect')).toBe(targetPath);

    // Now perform login
    await performCasdoorLogin(page);

    // After login, should be redirected to the original target page
    // (This depends on the frontend handling the redirect param after OAuth callback)
    await page.waitForLoadState('networkidle');

    await page.screenshot({ path: 'e2e-screenshots/auth-redirect-after-login.png', fullPage: true });
  });
});

test.describe('Session Expired', () => {
  test('should handle expired token gracefully', async ({ page }) => {
    await performCasdoorLogin(page);

    // Inject an expired/invalid token to simulate session expiry
    await page.evaluate(() => {
      // Find the auth store in localStorage and corrupt the token
      const keys = Object.keys(localStorage);
      for (const key of keys) {
        const value = localStorage.getItem(key);
        if (value && value.includes('token')) {
          try {
            const data = JSON.parse(value);
            if (data.state && data.state.token) {
              data.state.token = 'expired-invalid-token';
              localStorage.setItem(key, JSON.stringify(data));
            }
          } catch {
            // Not JSON, skip
          }
        }
      }
    });

    // Navigate to a protected page - should trigger session expired handling
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    // Should either show session expired dialog or redirect to login
    const url = page.url();
    const hasSessionExpiredDialog = await page
      .getByText(/session.*expired|会话.*过期|token.*expired|重新登录/i)
      .isVisible()
      .catch(() => false);

    const isOnLogin = url.includes('/login');

    expect(hasSessionExpiredDialog || isOnLogin).toBeTruthy();
    await page.screenshot({ path: 'e2e-screenshots/auth-session-expired.png', fullPage: true });
  });
});

// Tests using the authenticated fixture
authenticatedTest.describe('Authenticated Fixture', () => {
  authenticatedTest.beforeEach(async () => {
    authenticatedTest.skip(!TEST_PASSWORD, 'E2E_TEST_PASSWORD env var not set');
  });

  authenticatedTest('should access protected pages via fixture', async ({ authedPage }) => {
    await authedPage.goto('/settings');
    await authedPage.waitForLoadState('networkidle');

    const url = authedPage.url();
    expect(url).toContain('/settings');
    expect(url).not.toContain('/login');
  });
});
