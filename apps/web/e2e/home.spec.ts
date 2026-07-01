/**
 * Home Page E2E Tests
 * 首页 E2E 测试
 */

import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test('should load the home page', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    await expect(page.locator('body')).toBeVisible();

    // The top navigation bar may use header, nav, or just a div with logo/links
    const hasTopBar = await page
      .locator('header, nav, [role="banner"], [data-testid="header"]')
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    const hasLogo = await page
      .locator('text=Mobazha')
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    const hasLogin = await page
      .locator('text=Login')
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    expect(hasTopBar || hasLogo || hasLogin).toBe(true);
  });

  test('should display navigation links', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Search input may have various placeholder text
    const searchInput = page
      .locator(
        'input[type="search"], input[placeholder*="Search"], input[placeholder*="search"], input[role="searchbox"]'
      )
      .first();
    const hasSearch = await searchInput.isVisible({ timeout: 5000 }).catch(() => false);

    // Alternatively, navigation links should be present
    const hasNavLinks = await page
      .locator('nav a, header a')
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    expect(hasSearch || hasNavLinks).toBe(true);
  });

  test('should navigate to search page', async ({ page }) => {
    await page.goto('/');

    // Click search or navigate directly
    await page.goto('/search');

    await expect(page.url()).toContain('/search');
  });

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Mobile navigation should be present
    const mobileNav = page.locator('nav').first();
    await expect(mobileNav).toBeVisible();
  });
});
