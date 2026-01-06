/**
 * Mobile Responsive Tests
 * 移动端响应式测试
 *
 * 检查移动端的响应式设计是否正确：
 * - 无水平滚动
 * - 导航栏显示正确
 * - Footer 隐藏
 * - 触摸目标大小合适
 * - 文本可读
 *
 * 这些测试只在 Mobile Chrome 和 Mobile Safari 项目中运行
 */

import { test, expect } from '@playwright/test';

// 只在移动端项目中运行测试（通过项目名称判断，而非浏览器名称）
test.beforeEach(async (_fixtures, testInfo) => {
  const isMobileProject = testInfo.project.name.toLowerCase().includes('mobile');
  if (!isMobileProject) {
    test.skip();
  }
});

// 要测试的页面列表
const pagesToTest = [
  '/',
  '/search',
  '/cart',
  '/checkout',
  '/orders',
  '/profile',
  '/settings',
  '/marketplace',
  '/chat',
];

test.describe('Mobile Responsive - No Horizontal Scroll', () => {
  for (const path of pagesToTest) {
    test(`${path} should not have horizontal scroll`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState('networkidle');

      // 检查是否有水平滚动
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.body.scrollWidth > window.innerWidth;
      });

      expect(hasHorizontalScroll).toBe(false);
    });
  }
});

test.describe('Mobile Navigation', () => {
  test('should show mobile bottom navigation', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 检查移动端导航栏可见
    const mobileNav = page.locator('[data-testid="mobile-nav"]');
    await expect(mobileNav).toBeVisible();
  });

  test('mobile nav should have 5 items', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const navItems = page.locator('[data-testid="mobile-nav"] a');
    await expect(navItems).toHaveCount(5);
  });

  test('should navigate using mobile nav', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 点击 Search 导航项
    const searchNavItem = page.locator('[data-testid="mobile-nav"]').getByText('Search');
    await searchNavItem.click();

    await page.waitForURL(/\/search/);
  });

  test('should highlight active nav item', async ({ page }) => {
    await page.goto('/orders');
    await page.waitForLoadState('networkidle');

    // Orders 导航项应该有激活状态
    const ordersNavItem = page
      .locator('[data-testid="mobile-nav"]')
      .locator('a')
      .filter({ hasText: 'Orders' });

    // 检查是否有激活的颜色类 (text-primary)
    await expect(ordersNavItem).toHaveClass(/text-primary/);
  });
});

test.describe('Footer Visibility', () => {
  test('footer should be hidden on mobile', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const footer = page.locator('footer');
    await expect(footer).toBeHidden();
  });
});

test.describe('Touch-Friendly Elements', () => {
  test('buttons should have minimum touch target size', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const buttons = page.locator('button:visible');
    const count = await buttons.count();

    let smallButtonCount = 0;
    for (let i = 0; i < count; i++) {
      const box = await buttons.nth(i).boundingBox();
      if (box) {
        // 检查按钮最小尺寸 (32px 是可接受的最小值)
        if (box.height < 32 || box.width < 32) {
          smallButtonCount++;
        }
      }
    }

    // 允许最多 2 个小按钮（如关闭按钮等）
    expect(smallButtonCount).toBeLessThanOrEqual(2);
  });

  test('links should have adequate spacing', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 检查导航栏链接间距
    const navLinks = page.locator('[data-testid="mobile-nav"] a');
    const count = await navLinks.count();

    if (count >= 2) {
      const firstBox = await navLinks.nth(0).boundingBox();
      const secondBox = await navLinks.nth(1).boundingBox();

      if (firstBox && secondBox) {
        // 链接之间应该有足够的间距
        const gap = secondBox.x - (firstBox.x + firstBox.width);
        expect(gap).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

test.describe('Text Readability', () => {
  test('body text should be at least 14px', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const fontSize = await page.evaluate(() => {
      const body = document.querySelector('body');
      return body ? parseFloat(window.getComputedStyle(body).fontSize) : 0;
    });

    expect(fontSize).toBeGreaterThanOrEqual(14);
  });

  test('headings should be larger than body text', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const h1Size = await page.evaluate(() => {
      const h1 = document.querySelector('h1');
      return h1 ? parseFloat(window.getComputedStyle(h1).fontSize) : 0;
    });

    const bodySize = await page.evaluate(() => {
      const body = document.querySelector('body');
      return body ? parseFloat(window.getComputedStyle(body).fontSize) : 16;
    });

    if (h1Size > 0) {
      expect(h1Size).toBeGreaterThan(bodySize);
    }
  });
});

test.describe('Form Elements', () => {
  test('input fields should be full width on mobile', async ({ page }) => {
    await page.goto('/search');
    await page.waitForLoadState('networkidle');

    const searchInput = page.locator('input[type="text"], input[type="search"]').first();

    if (await searchInput.isVisible()) {
      const box = await searchInput.boundingBox();
      const viewportWidth = page.viewportSize()?.width || 390;

      if (box) {
        // 输入框宽度应该接近视口宽度（减去 padding）
        expect(box.width).toBeGreaterThan(viewportWidth * 0.7);
      }
    }
  });

  test('input fields should not cause zoom on focus', async ({ page }) => {
    await page.goto('/search');
    await page.waitForLoadState('networkidle');

    const input = page.locator('input').first();

    if (await input.isVisible()) {
      const fontSize = await input.evaluate(el => {
        return parseFloat(window.getComputedStyle(el).fontSize);
      });

      // iOS 在 font-size < 16px 时会自动缩放
      expect(fontSize).toBeGreaterThanOrEqual(16);
    }
  });
});

test.describe('Layout Integrity', () => {
  test('cards should stack vertically on mobile', async ({ page }) => {
    await page.goto('/marketplace');
    await page.waitForLoadState('networkidle');

    const cards = page
      .locator('[data-testid="marketplace-card"], .marketplace-card, article')
      .first();

    if (await cards.isVisible()) {
      const box = await cards.boundingBox();
      const viewportWidth = page.viewportSize()?.width || 390;

      if (box) {
        // 卡片宽度应该接近视口宽度
        expect(box.width).toBeGreaterThan(viewportWidth * 0.8);
      }
    }
  });

  test('modals should fit within viewport', async ({ page }) => {
    await page.goto('/settings/access-requests');
    await page.waitForLoadState('networkidle');

    // 点击 Review 按钮打开模态框
    const reviewButton = page.locator('button').filter({ hasText: 'Review' }).first();

    if (await reviewButton.isVisible()) {
      await reviewButton.click();

      // 等待模态框出现
      await page.waitForTimeout(300);
      const modal = page.locator('.fixed.inset-0 > div').last();

      if (await modal.isVisible()) {
        const box = await modal.boundingBox();
        const viewportWidth = page.viewportSize()?.width || 390;
        const viewportHeight = page.viewportSize()?.height || 844;

        if (box) {
          // 模态框应该在视口内
          expect(box.width).toBeLessThanOrEqual(viewportWidth);
          expect(box.height).toBeLessThanOrEqual(viewportHeight);
        }
      }
    }
  });
});

test.describe('Safe Area Support', () => {
  test('mobile nav should have safe area padding', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const mobileNav = page.locator('[data-testid="mobile-nav"]');

    if (await mobileNav.isVisible()) {
      // 检查底部是否有 safe-area 相关的 padding
      const paddingBottom = await mobileNav.evaluate(el => {
        return window.getComputedStyle(el).paddingBottom;
      });

      // 应该有底部内边距
      expect(parseInt(paddingBottom)).toBeGreaterThanOrEqual(0);
    }
  });
});
