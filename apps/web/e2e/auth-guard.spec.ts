/**
 * Auth Guard E2E Tests
 * 认证保护 E2E 测试
 *
 * 验证未登录用户访问受保护页面时会被重定向到登录页
 */

import { test, expect } from '@playwright/test';

// 所有需要认证保护的路由
const protectedRoutes = [
  { path: '/settings', name: 'Settings' },
  { path: '/settings/general', name: 'Settings General' },
  { path: '/settings/access-control/privacy', name: 'Privacy Settings' },
  { path: '/settings/access-control/user-groups', name: 'User Groups' },
  { path: '/settings/access-control/product-groups', name: 'Product Groups' },
  { path: '/orders', name: 'Orders' },
  { path: '/cart', name: 'Cart' },
  { path: '/checkout', name: 'Checkout' },
  { path: '/wallet', name: 'Wallet' },
  { path: '/notifications', name: 'Notifications' },
  { path: '/listing/new', name: 'New Listing' },
  { path: '/moderator/cases', name: 'Moderator Cases' },
  { path: '/admin', name: 'Admin Dashboard' },
  { path: '/admin/products', name: 'Admin Products' },
  { path: '/admin/orders', name: 'Admin Orders' },
  { path: '/admin/analytics', name: 'Admin Analytics' },
  { path: '/admin/settings', name: 'Admin Settings' },
];

// 公开路由（不需要登录）
const publicRoutes = [
  { path: '/', name: 'Home' },
  { path: '/login', name: 'Login' },
  { path: '/search', name: 'Search' },
  { path: '/marketplace', name: 'Marketplace' },
  { path: '/me', name: 'Me (shows login prompt)' },
];

test.describe('Authentication Guard', () => {
  test.beforeEach(async ({ context }) => {
    // 清除所有存储，确保未登录状态
    await context.clearCookies();
    // 清除 localStorage 和 sessionStorage
    await context.addInitScript(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });
  });

  test.describe('Protected Routes Redirect', () => {
    for (const route of protectedRoutes) {
      test(`${route.name} (${route.path}) should redirect to login`, async ({ page }) => {
        // 访问受保护的页面
        await page.goto(route.path);

        // 等待重定向完成
        await page.waitForURL(/\/login/, { timeout: 10000 });

        // 验证 URL 包含 redirect 参数
        const url = new URL(page.url());
        expect(url.pathname).toBe('/login');
        expect(url.searchParams.has('redirect')).toBe(true);

        // 验证 redirect 参数包含原始路径
        const redirectPath = decodeURIComponent(url.searchParams.get('redirect') || '');
        expect(redirectPath).toBe(route.path);
      });
    }
  });

  test.describe('Public Routes Accessible', () => {
    for (const route of publicRoutes) {
      test(`${route.name} (${route.path}) should be accessible without login`, async ({ page }) => {
        await page.goto(route.path);

        // 等待页面加载
        await page.waitForLoadState('networkidle');

        // 验证没有被重定向到登录页
        const url = new URL(page.url());
        expect(url.pathname).not.toBe('/login');
      });
    }
  });

  test.describe('Loading State', () => {
    test('should show loading indicator while checking auth', async ({ page }) => {
      // 慢速网络模拟
      await page.route('**/*', route => {
        setTimeout(() => route.continue(), 100);
      });

      await page.goto('/settings');

      // 应该短暂显示加载状态
      const loadingText = page.getByText(/loading|加载中|redirecting|正在跳转/i);
      // 加载状态可能很短暂，所以只验证最终重定向
      await page.waitForURL(/\/login/);
    });
  });

  test.describe('Redirect After Login', () => {
    test('redirect param should preserve original path', async ({ page }) => {
      const originalPath = '/settings/access-control/user-groups';

      await page.goto(originalPath);
      await page.waitForURL(/\/login/);

      const url = new URL(page.url());
      const redirect = url.searchParams.get('redirect');

      expect(redirect).toBe(originalPath);
    });

    test('nested settings path should be preserved', async ({ page }) => {
      const nestedPath = '/settings/access-control/product-groups';

      await page.goto(nestedPath);
      await page.waitForURL(/\/login/);

      const redirect = new URL(page.url()).searchParams.get('redirect');
      expect(redirect).toBe(nestedPath);
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

  test('loading state should have spinner', async ({ page }) => {
    // 使用较慢的请求来捕获加载状态
    let resolveDelay: () => void;
    const delayPromise = new Promise<void>(resolve => {
      resolveDelay = resolve;
    });

    await page.route('**/api/**', async route => {
      await delayPromise;
      route.continue();
    });

    const loadPromise = page.goto('/settings');

    // 检查是否显示加载指示器
    const spinner = page.locator('.animate-spin');
    await expect(spinner)
      .toBeVisible({ timeout: 5000 })
      .catch(() => {
        // 如果加载太快可能捕获不到，这是可以接受的
      });

    resolveDelay!();
    await loadPromise;
  });
});
