/**
 * Marketplace Flow E2E Tests
 * 集市业务流程端到端测试
 *
 * 测试集市浏览、卖家入驻、管理员审批等完整业务流程。
 * 需要运行中的全栈环境。
 *
 * 环境变量:
 *   E2E_TEST_PASSWORD - 测试用户密码 (必须)
 */

import { test, expect } from '@playwright/test';
import { performCasdoorLogin } from './fixtures/auth';

const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD || '';

test.describe('Marketplace - Public Access', () => {
  test('should display marketplace list page', async ({ page }) => {
    await page.goto('/marketplace');
    await page.waitForLoadState('domcontentloaded');

    // Should be accessible without login
    expect(page.url()).toContain('/marketplace');
    expect(page.url()).not.toContain('/login');

    // Should have page content
    const body = page.locator('body');
    await expect(body).toBeVisible();

    await page.screenshot({ path: 'e2e-screenshots/marketplace-list.png', fullPage: true });
  });

  test('should navigate to marketplace detail', async ({ page }) => {
    await page.goto('/marketplace');
    await page.waitForLoadState('domcontentloaded');

    // Try to find a marketplace card/link and click it
    const marketplaceLink = page.locator('a[href*="/marketplace/"]').first();
    const hasMarketplaces = await marketplaceLink.isVisible().catch(() => false);

    if (hasMarketplaces) {
      await marketplaceLink.click();
      await page.waitForLoadState('domcontentloaded');

      // Should be on a marketplace detail page
      expect(page.url()).toMatch(/\/marketplace\/.+/);
      await page.screenshot({ path: 'e2e-screenshots/marketplace-detail.png', fullPage: true });
    } else {
      // No marketplaces available - just verify the empty state
      test
        .info()
        .annotations.push({ type: 'note', description: 'No marketplaces available to browse' });
    }
  });
});

test.describe('Marketplace - Seller Apply', () => {
  test.beforeEach(async () => {
    test.skip(!TEST_PASSWORD, 'E2E_TEST_PASSWORD env var not set');
  });

  test('should navigate to sell page from marketplace', async ({ page }) => {
    await performCasdoorLogin(page);

    await page.goto('/marketplace');
    await page.waitForLoadState('domcontentloaded');

    // Find a marketplace and try to access its sell page
    const marketplaceLink = page.locator('a[href*="/marketplace/"]').first();
    const hasMarketplaces = await marketplaceLink.isVisible().catch(() => false);

    if (hasMarketplaces) {
      // Get the marketplace slug from the link
      const href = await marketplaceLink.getAttribute('href');
      if (href) {
        const slug = href.replace('/marketplace/', '').split('/')[0];
        await page.goto(`/marketplace/${slug}/sell`);
        await page.waitForLoadState('domcontentloaded');

        // Should be on the sell page (not redirected)
        expect(page.url()).toContain('/sell');
        await page.screenshot({ path: 'e2e-screenshots/marketplace-sell.png', fullPage: true });
      }
    } else {
      test
        .info()
        .annotations.push({
          type: 'note',
          description: 'No marketplaces available for seller apply',
        });
    }
  });
});

test.describe('Marketplace - Admin Management', () => {
  test.beforeEach(async () => {
    test.skip(!TEST_PASSWORD, 'E2E_TEST_PASSWORD env var not set');
  });

  test('should access admin applications page', async ({ page }) => {
    await performCasdoorLogin(page);

    await page.goto('/marketplace');
    await page.waitForLoadState('domcontentloaded');

    const marketplaceLink = page.locator('a[href*="/marketplace/"]').first();
    const hasMarketplaces = await marketplaceLink.isVisible().catch(() => false);

    if (hasMarketplaces) {
      const href = await marketplaceLink.getAttribute('href');
      if (href) {
        const slug = href.replace('/marketplace/', '').split('/')[0];

        // Navigate to admin applications page
        await page.goto(`/marketplace/${slug}/admin/applications`);
        await page.waitForLoadState('domcontentloaded');

        // May redirect to login if user is not admin, or show applications list
        await page.screenshot({
          path: 'e2e-screenshots/marketplace-admin-applications.png',
          fullPage: true,
        });
      }
    } else {
      test.info().annotations.push({
        type: 'note',
        description: 'No marketplaces available for admin management',
      });
    }
  });

  test('should access admin products page', async ({ page }) => {
    await performCasdoorLogin(page);

    await page.goto('/marketplace');
    await page.waitForLoadState('domcontentloaded');

    const marketplaceLink = page.locator('a[href*="/marketplace/"]').first();
    const hasMarketplaces = await marketplaceLink.isVisible().catch(() => false);

    if (hasMarketplaces) {
      const href = await marketplaceLink.getAttribute('href');
      if (href) {
        const slug = href.replace('/marketplace/', '').split('/')[0];

        await page.goto(`/marketplace/${slug}/admin/products`);
        await page.waitForLoadState('domcontentloaded');

        await page.screenshot({
          path: 'e2e-screenshots/marketplace-admin-products.png',
          fullPage: true,
        });
      }
    }
  });
});
