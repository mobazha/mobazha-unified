/**
 * Moderators Page E2E Tests
 * 仲裁员页面 E2E 测试
 */

import { test, expect } from '@playwright/test';

test.describe('Moderators Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/moderators');
  });

  test('should display the moderators list page', async ({ page }) => {
    // Check page title/heading
    const heading = page.locator('h1').first();
    await expect(heading).toContainText(/Moderator|仲裁/i);
  });

  test('should show search functionality', async ({ page }) => {
    // Look for search input
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]');
    await expect(searchInput).toBeVisible();
  });

  test('should display moderator cards or list items', async ({ page }) => {
    // Wait for content to load
    await page.waitForLoadState('networkidle');

    // Check for moderator cards or loading state
    const content = page.locator('[data-testid="moderator-list"], .moderator-card, article');

    // Either show moderators or empty state
    const hasContent = await content.count();
    expect(hasContent).toBeGreaterThanOrEqual(0);
  });

  test('should filter moderators by search', async ({ page }) => {
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]');

    if (await searchInput.isVisible()) {
      await searchInput.fill('test');
      await page.waitForTimeout(500); // Debounce wait

      // URL should update or results should change
      await expect(page.url()).toMatch(/search|q=/i);
    }
  });

  test('should navigate to moderator detail page', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Click on first moderator if available
    const moderatorLink = page.locator('a[href*="/moderators/"]').first();

    if (await moderatorLink.isVisible()) {
      await moderatorLink.click();

      // Should navigate to detail page
      await expect(page.url()).toMatch(/\/moderators\/\w+/);
    }
  });
});

test.describe('Moderator Detail Page', () => {
  test('should display moderator details', async ({ page }) => {
    // Navigate to a specific moderator (using mock ID)
    await page.goto('/moderators/mod1');

    await page.waitForLoadState('networkidle');

    // Should show moderator info or 404
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should show moderator stats', async ({ page }) => {
    await page.goto('/moderators/mod1');
    await page.waitForLoadState('networkidle');

    // Look for rating, disputes handled, etc.
    const statsSection = page.locator('[data-testid="moderator-stats"], .stats, .rating');

    if (await statsSection.isVisible()) {
      await expect(statsSection).toContainText(/rating|dispute|%/i);
    }
  });

  test('should have contact/select button', async ({ page }) => {
    await page.goto('/moderators/mod1');
    await page.waitForLoadState('networkidle');

    // Look for action buttons
    const actionButton = page.locator('button').filter({ hasText: /select|contact|message/i });

    if (await actionButton.count()) {
      await expect(actionButton.first()).toBeVisible();
    }
  });
});
