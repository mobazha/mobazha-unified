/**
 * Desktop Visual Regression Tests
 * 桌面端视觉回归测试
 *
 * 用于检测桌面端页面的视觉效果是否正常
 * 这些测试只在桌面端项目中运行
 */

import { test, expect, Page } from '@playwright/test';

/**
 * 隐藏开发服务器的动态提示元素（如 "Compiling...", "N issues" 等）
 * 这些提示只在开发环境中出现，不应影响视觉测试结果
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

// 只在桌面端项目中运行测试
test.beforeEach(async (_, testInfo) => {
  const isMobileProject = testInfo.project.name.toLowerCase().includes('mobile');
  if (isMobileProject) {
    test.skip();
  }
});

// 定义要测试的页面
const pages = [
  { name: 'home', path: '/' },
  { name: 'search', path: '/search' },
  { name: 'search-results', path: '/search?q=test' },
  { name: 'product', path: '/product/sample-product' },
  { name: 'cart', path: '/cart' },
  { name: 'checkout', path: '/checkout' },
  { name: 'orders', path: '/orders' },
  { name: 'profile', path: '/profile' },
  { name: 'settings', path: '/settings' },
  { name: 'marketplace', path: '/marketplace' },
  { name: 'marketplace-detail', path: '/marketplace/mp1' },
  { name: 'chat', path: '/chat' },
  { name: 'wallet', path: '/wallet' },
  { name: 'moderators', path: '/moderators' },
  { name: 'notifications', path: '/notifications' },
  { name: 'listing-new', path: '/listing/new' },
];

// 设置页面
const settingsPages = [
  { name: 'settings-moderator', path: '/settings/moderator' },
  { name: 'settings-privacy', path: '/settings/privacy' },
  { name: 'settings-user-groups', path: '/settings/user-groups' },
  { name: 'settings-product-groups', path: '/settings/product-groups' },
  { name: 'settings-receiving', path: '/settings/receiving' },
  { name: 'settings-keys', path: '/settings/keys' },
  { name: 'settings-access-requests', path: '/settings/access-requests' },
  { name: 'settings-blocked-users', path: '/settings/blocked-users' },
];

// 管理页面
const adminPages = [
  { name: 'marketplace-admin', path: '/marketplace/mp1/admin' },
  { name: 'marketplace-applications', path: '/marketplace/mp1/admin/applications' },
  { name: 'marketplace-products', path: '/marketplace/mp1/admin/products' },
  { name: 'moderator-cases', path: '/moderator/cases' },
];

test.describe('Desktop Visual Regression - Main Pages', () => {
  for (const pageInfo of pages) {
    test(`${pageInfo.name} page should render correctly`, async ({ page }) => {
      await page.goto(pageInfo.path);
      await waitForPageStable(page);

      // 截图对比 - 首次运行会生成基准图片
      await expect(page).toHaveScreenshot(`desktop-${pageInfo.name}.png`, {
        fullPage: true,
      });
    });
  }
});

test.describe('Desktop Visual Regression - Settings Pages', () => {
  for (const pageInfo of settingsPages) {
    test(`${pageInfo.name} page should render correctly`, async ({ page }) => {
      await page.goto(pageInfo.path);
      await waitForPageStable(page);

      await expect(page).toHaveScreenshot(`desktop-${pageInfo.name}.png`, {
        fullPage: true,
      });
    });
  }
});

test.describe('Desktop Visual Regression - Admin Pages', () => {
  for (const pageInfo of adminPages) {
    test(`${pageInfo.name} page should render correctly`, async ({ page }) => {
      await page.goto(pageInfo.path);
      await waitForPageStable(page);

      await expect(page).toHaveScreenshot(`desktop-admin-${pageInfo.name}.png`, {
        fullPage: true,
      });
    });
  }
});

// Header 组件测试
test.describe('Desktop Visual Regression - Header', () => {
  test('Header should display correctly', async ({ page }) => {
    await page.goto('/');
    await waitForPageStable(page);

    // 只截取 Header 部分
    const header = page.locator('header').first();
    await expect(header).toHaveScreenshot('desktop-header.png');
  });

  test('Header search should be visible', async ({ page }) => {
    await page.goto('/');
    await waitForPageStable(page);

    // 验证搜索框存在
    const searchInput = page.locator('input[placeholder*="search" i], input[placeholder*="搜索"]');
    await expect(searchInput).toBeVisible();
  });
});

// Footer 组件测试
test.describe('Desktop Visual Regression - Footer', () => {
  test('Footer should display correctly', async ({ page }) => {
    await page.goto('/');
    await waitForPageStable(page);

    // 滚动到底部
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(300);
    await hideDevOverlays(page);

    // 只截取 Footer 部分
    const footer = page.locator('footer').first();
    await expect(footer).toHaveScreenshot('desktop-footer.png');
  });
});
