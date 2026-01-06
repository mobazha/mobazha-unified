/**
 * Mobile Visual Regression Tests
 * 移动端视觉回归测试
 *
 * 用于检测移动端页面的视觉效果是否正常
 * 这些测试只在 Mobile Chrome 和 Mobile Safari 项目中运行
 */

import { test, expect } from '@playwright/test';

// 跳过桌面浏览器
test.skip(({ browserName }) => !['chromium', 'webkit'].includes(browserName), 'Mobile only test');

// 定义要测试的页面
const pages = [
  { name: 'home', path: '/' },
  { name: 'search', path: '/search' },
  { name: 'product', path: '/product/sample-product' },
  { name: 'cart', path: '/cart' },
  { name: 'checkout', path: '/checkout' },
  { name: 'orders', path: '/orders' },
  { name: 'profile', path: '/profile' },
  { name: 'settings', path: '/settings' },
  { name: 'marketplace', path: '/marketplace' },
  { name: 'marketplace-detail', path: '/marketplace/mp1' },
  { name: 'chat', path: '/chat' },
  { name: 'listing-new', path: '/listing/new' },
];

// 管理页面
const adminPages = [
  { name: 'marketplace-applications', path: '/marketplace/mp1/admin/applications' },
  { name: 'marketplace-products', path: '/marketplace/mp1/admin/products' },
  { name: 'settings-access-requests', path: '/settings/access-requests' },
  { name: 'settings-blocked-users', path: '/settings/blocked-users' },
];

test.describe('Mobile Visual Regression', () => {
  for (const pageInfo of pages) {
    test(`${pageInfo.name} page should render correctly`, async ({ page }) => {
      await page.goto(pageInfo.path);
      await page.waitForLoadState('networkidle');

      // 等待内容加载
      await page.waitForTimeout(500);

      // 截图对比 - 首次运行会生成基准图片
      await expect(page).toHaveScreenshot(`mobile-${pageInfo.name}.png`, {
        fullPage: true,
        maxDiffPixels: 200, // 允许小差异（动态内容）
        timeout: 10000,
      });
    });
  }
});

test.describe('Mobile Visual - Admin Pages', () => {
  for (const pageInfo of adminPages) {
    test(`${pageInfo.name} page should render correctly`, async ({ page }) => {
      await page.goto(pageInfo.path);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot(`mobile-admin-${pageInfo.name}.png`, {
        fullPage: true,
        maxDiffPixels: 200,
        timeout: 10000,
      });
    });
  }
});
