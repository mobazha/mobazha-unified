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
      test.info().annotations.push({
        type: 'note',
        description: 'No marketplaces available for seller apply',
      });
    }
  });
});

test.describe('Marketplace - Operator & Invitations', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!TEST_PASSWORD, 'E2E_TEST_PASSWORD env var not set');
    await performCasdoorLogin(page);
  });

  test('should access operator marketplace console', async ({ page }) => {
    await page.goto('/operator/marketplaces');
    await page.waitForLoadState('domcontentloaded');

    expect(page.url()).toContain('/operator/marketplaces');
    expect(page.url()).not.toContain('/login');
    await expect(page.getByTestId('operator-marketplaces-page')).toBeVisible();
    await page.screenshot({
      path: 'e2e-screenshots/marketplace-operator-list.png',
      fullPage: true,
    });
  });

  test('should access operator marketplace detail', async ({ page }) => {
    await page.goto('/operator/marketplaces');
    await page.waitForLoadState('domcontentloaded');

    const detailLink = page.locator('a[href*="/operator/marketplaces/"]').first();
    const hasMarketplace = await detailLink.isVisible().catch(() => false);

    if (hasMarketplace) {
      await detailLink.click();
      await page.waitForLoadState('domcontentloaded');
      expect(page.url()).toMatch(/\/operator\/marketplaces\/.+/);
      expect(page.url()).not.toContain('/login');
      await expect(page.getByTestId('operator-marketplace-detail')).toBeVisible();
      await page.screenshot({
        path: 'e2e-screenshots/marketplace-operator-detail.png',
        fullPage: true,
      });
      return;
    }

    await page.goto('/operator/marketplaces/mp1');
    await page.waitForLoadState('domcontentloaded');
    expect(page.url()).toContain('/operator/marketplaces/mp1');
    expect(page.url()).not.toContain('/login');
    await page.screenshot({
      path: 'e2e-screenshots/marketplace-operator-detail.png',
      fullPage: true,
    });
  });

  test('should access store marketplace invitation inbox', async ({ page }) => {
    await page.goto('/admin/settings/marketplace-memberships');
    await page.waitForLoadState('domcontentloaded');

    expect(page.url()).toContain('/admin/settings/marketplace-memberships');
    expect(page.url()).not.toContain('/login');
    await expect(page.getByTestId('marketplace-memberships-page')).toBeVisible();
    await page.screenshot({
      path: 'e2e-screenshots/marketplace-store-invitations.png',
      fullPage: true,
    });
  });
});
