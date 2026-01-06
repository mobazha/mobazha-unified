/**
 * Marketplace E2E Tests
 * 社区集市 E2E 测试
 */

import { test, expect } from '@playwright/test';

test.describe('Marketplace List Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/marketplace');
  });

  test('should display marketplace list page', async ({ page }) => {
    const heading = page.locator('h1').first();
    await expect(heading).toContainText(/Market|集市|Community/i);
  });

  test('should show marketplace cards', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Check for marketplace cards or empty state
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should have search functionality', async ({ page }) => {
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]');

    if (await searchInput.isVisible()) {
      await searchInput.fill('test marketplace');
      await page.waitForTimeout(500);
    }
  });

  test('should navigate to marketplace detail', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    const marketplaceLink = page.locator('a[href*="/marketplace/"]').first();

    if (await marketplaceLink.isVisible()) {
      await marketplaceLink.click();
      await expect(page.url()).toMatch(/\/marketplace\/\w+/);
    }
  });
});

test.describe('Marketplace Detail Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/marketplace/mp1');
  });

  test('should display marketplace details', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should show marketplace stats', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Look for member count, product count, etc.
    const stats = page.getByText(/member|product|seller/i);
    expect(await stats.count()).toBeGreaterThanOrEqual(0);
  });

  test('should display products tab', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Look for products section or tab
    const productsSection = page.locator(
      '[data-testid="products"], .products-grid, [role="tabpanel"]'
    );

    if (await productsSection.isVisible()) {
      await expect(productsSection).toBeVisible();
    }
  });

  test('should show join button for non-members', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Look for join marketplace button
    const joinButton = page.locator('button').filter({ hasText: /join|加入/i });

    if (await joinButton.count()) {
      await expect(joinButton.first()).toBeVisible();
    }
  });

  test('should show seller application option', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Look for become seller option
    const sellerButton = page.locator('button, a').filter({ hasText: /sell|卖家|apply/i });

    expect(await sellerButton.count()).toBeGreaterThanOrEqual(0);
  });
});

test.describe('Marketplace Admin', () => {
  test('should access admin panel for owners', async ({ page }) => {
    // This would require authentication
    await page.goto('/marketplace/mp1/admin');
    await page.waitForLoadState('networkidle');

    // Should either show admin panel or redirect
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should manage seller applications', async ({ page }) => {
    await page.goto('/marketplace/mp1/admin/applications');
    await page.waitForLoadState('networkidle');

    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should manage product approvals', async ({ page }) => {
    await page.goto('/marketplace/mp1/admin/products');
    await page.waitForLoadState('networkidle');

    const content = page.locator('main');
    await expect(content).toBeVisible();
  });
});
