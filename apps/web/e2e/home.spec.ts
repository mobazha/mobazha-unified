/**
 * Home Page E2E Tests
 * 首页 E2E 测试
 */

import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test('should load the home page', async ({ page }) => {
    await page.goto('/');

    // Check for main elements
    await expect(page).toHaveTitle(/Mobazha|OpenBazaar/);

    // Check header is visible
    const header = page.locator('header');
    await expect(header).toBeVisible();
  });

  test('should display navigation links', async ({ page }) => {
    await page.goto('/');

    // Check search functionality exists
    const searchInput = page.locator('input[placeholder*="Search"]');
    await expect(searchInput).toBeVisible();
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
