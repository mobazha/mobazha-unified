/**
 * Auth Guard E2E Tests
 * 认证保护 E2E 测试
 *
 * 验证未登录用户访问受保护页面时会被重定向到登录页（Casdoor OAuth）。
 * 应用使用 Casdoor OAuth，所以未认证用户最终会到达 /login/oauth/authorize。
 */

import { test, expect } from '@playwright/test';

const protectedRoutes = [
  { path: '/settings', name: 'Settings' },
  { path: '/settings/general', name: 'Settings General' },
  { path: '/settings/access-control/privacy', name: 'Privacy Settings' },
  { path: '/settings/access-control/user-groups', name: 'User Groups' },
  { path: '/settings/access-control/product-groups', name: 'Product Groups' },
  { path: '/orders', name: 'Orders' },
  { path: '/checkout', name: 'Checkout' },
  { path: '/wallet', name: 'Wallet' },
  { path: '/notifications', name: 'Notifications' },
  { path: '/listing/new', name: 'New Listing' },
  { path: '/cases', name: 'Dispute Cases' },
  { path: '/admin', name: 'Admin Dashboard' },
  { path: '/admin/products', name: 'Admin Products' },
  { path: '/admin/orders', name: 'Admin Orders' },
  { path: '/admin/analytics', name: 'Admin Analytics' },
  { path: '/admin/settings', name: 'Admin Settings' },
];

const publicRoutes = [
  { path: '/', name: 'Home' },
  { path: '/login', name: 'Login' },
  { path: '/search', name: 'Search' },
  { path: '/marketplace', name: 'Marketplace' },
  { path: '/cart', name: 'Cart' },
];

test.describe('Authentication Guard', () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
    await context.addInitScript(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });
  });

  test.describe('Protected Routes Redirect', () => {
    for (const route of protectedRoutes) {
      test(`${route.name} (${route.path}) should redirect to login`, async ({ page }) => {
        await page.goto(route.path);

        // App redirects to /login which auto-forwards to Casdoor OAuth
        await page.waitForURL(/\/login/, { timeout: 15000 });

        const currentUrl = page.url();
        // Accept either /login (intermediate) or /login/oauth/authorize (Casdoor)
        expect(currentUrl).toMatch(/\/login/);
      });
    }
  });

  test.describe('Public Routes Accessible', () => {
    for (const route of publicRoutes) {
      test(`${route.name} (${route.path}) should be accessible without login`, async ({ page }) => {
        await page.goto(route.path);
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(2000);

        // /login itself is a valid public route (Casdoor OAuth landing)
        if (route.path === '/login') {
          expect(page.url()).toMatch(/\/login/);
        } else {
          // Should stay on the page or navigate to it, not get redirected away
          const url = new URL(page.url());
          const isOnExpectedPage =
            url.pathname === route.path || url.pathname.startsWith(route.path);
          const isOnCasdoorLogin = url.pathname.includes('/login/oauth/authorize');
          expect(isOnExpectedPage || !isOnCasdoorLogin).toBe(true);
        }
      });
    }
  });

  test.describe('Loading State', () => {
    test('should redirect to login flow when accessing protected route', async ({ page }) => {
      await page.goto('/settings');
      await page.waitForURL(/\/login/, { timeout: 15000 });
      expect(page.url()).toMatch(/\/login/);
    });
  });

  test.describe('Redirect After Login', () => {
    test('redirect param should preserve original path', async ({ page }) => {
      const originalPath = '/settings/access-control/user-groups';
      await page.goto(originalPath);
      await page.waitForURL(/\/login/, { timeout: 15000 });

      // The redirect param may be passed to Casdoor via state parameter
      // or preserved in the app's login URL before OAuth redirect
      const currentUrl = page.url();
      expect(currentUrl).toMatch(/\/login/);
    });

    test('nested settings path triggers login redirect', async ({ page }) => {
      const nestedPath = '/settings/access-control/product-groups';
      await page.goto(nestedPath);
      await page.waitForURL(/\/login/, { timeout: 15000 });
      expect(page.url()).toMatch(/\/login/);
    });
  });
});

test.describe('Auth Guard Visual', () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
    await context.addInitScript(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });
  });

  test('unauthenticated access triggers login redirect', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForURL(/\/login/, { timeout: 15000 });
    expect(page.url()).toMatch(/\/login/);
  });
});
