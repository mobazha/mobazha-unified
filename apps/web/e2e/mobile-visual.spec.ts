/**
 * Mobile Visual Regression Tests
 * 移动端视觉回归测试
 *
 * 用于检测移动端页面的视觉效果是否正常
 * 这些测试只在 Mobile Chrome 和 Mobile Safari 项目中运行
 */

import { test, expect, Page } from '@playwright/test';

/**
 * 隐藏开发服务器的动态提示元素
 */
async function hideDevOverlays(page: Page): Promise<void> {
  await page.addStyleTag({
    content: `
      /* 隐藏 Next.js 开发服务器提示 */
      [data-nextjs-toast],
      nextjs-portal,
      [data-nextjs-dialog-overlay],
      [data-nextjs-dialog],
      /* 隐藏编译状态提示 */
      [class*="Compiling"],
      [class*="compiling"],
      /* 隐藏 React DevTools 提示 */
      [class*="react-devtools"],
      /* 隐藏 Turbopack/Webpack 热更新提示 */
      [id*="__next_dev"],
      [class*="__next"],
      /* 隐藏问题提示 */
      button:has-text("issues"),
      [class*="Issues"] {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
      }
    `,
  });
}

/**
 * 等待页面完全加载并稳定
 */
async function waitForPageStable(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
  // 等待 React hydration 完成
  await page.waitForTimeout(800);
  // 隐藏开发环境提示
  await hideDevOverlays(page);
  // 额外等待确保样式应用
  await page.waitForTimeout(200);
}

// 只在移动端项目中运行测试（通过项目名称判断，而非浏览器名称）
test.beforeEach(async ({ page: _page }, testInfo) => {
  const isMobileProject = testInfo.project.name.toLowerCase().includes('mobile');
  if (!isMobileProject) {
    test.skip();
  }
});

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
      await waitForPageStable(page);

      // 截图对比 - 首次运行会生成基准图片
      await expect(page).toHaveScreenshot(`mobile-${pageInfo.name}.png`, {
        fullPage: true,
      });
    });
  }
});

test.describe('Mobile Visual - Admin Pages', () => {
  for (const pageInfo of adminPages) {
    test(`${pageInfo.name} page should render correctly`, async ({ page }) => {
      await page.goto(pageInfo.path);
      await waitForPageStable(page);

      await expect(page).toHaveScreenshot(`mobile-admin-${pageInfo.name}.png`, {
        fullPage: true,
      });
    });
  }
});
