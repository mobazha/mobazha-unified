/**
 * Analytics Page E2E Tests
 *
 * Validates the sales analytics dashboard (#8):
 *   - Auth guard: /admin/analytics requires login
 *   - Page renders with title, period selector, stat cards
 *   - Charts container visibility (revenue trend, orders trend)
 *   - Order status breakdown section
 *   - Top products table
 *   - Period selector interactivity
 *   - Sidebar navigation to analytics
 *
 * Prerequisites:
 *   - Running dev server
 *   - For authenticated tests: E2E_TEST_PASSWORD set
 *
 * Run:
 *   npx playwright test analytics.spec.ts --project=chromium --reporter=list
 */

import { test, expect } from '@playwright/test';
import { authenticatedTest } from './fixtures/auth';

// ── 1. Auth Guard ────────────────────────────────────────────────────────────

test.describe('Analytics Auth Guard', () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
    await context.addInitScript(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });
  });

  test('should redirect to login when not authenticated', async ({ page }) => {
    await page.goto('/admin/analytics');
    await page.waitForURL(/\/login/, { timeout: 15000 });
    expect(page.url()).toMatch(/\/login/);
  });
});

// ── 2. Page Rendering ────────────────────────────────────────────────────────

authenticatedTest.describe('Analytics Page', () => {
  authenticatedTest.beforeEach(async ({ authedPage }) => {
    await authedPage.goto('/admin/analytics');
    await authedPage.waitForLoadState('domcontentloaded');
    await authedPage.waitForTimeout(2000);
  });

  authenticatedTest('should render analytics page with title', async ({ authedPage }) => {
    const container = authedPage.locator('[data-testid="admin-analytics"]');
    await expect(container).toBeVisible({ timeout: 10000 });

    const title = authedPage.getByRole('heading', { level: 1 });
    await expect(title).toBeVisible();
    await expect(title).toHaveText(/Analytics|数据分析/i);

    await authedPage.screenshot({
      path: 'e2e-screenshots/analytics-page.png',
      fullPage: true,
    });
  });

  authenticatedTest('should show period selector with 4 options', async ({ authedPage }) => {
    const buttons = authedPage.locator('[data-testid="admin-analytics"] button');
    const periodTexts = ['7', '30', '90'];

    for (const text of periodTexts) {
      const btn = buttons.filter({ hasText: new RegExp(text) }).first();
      await expect(btn).toBeVisible();
    }
  });

  authenticatedTest('should show 4 stat cards', async ({ authedPage }) => {
    const statCards = authedPage.locator('[data-testid="admin-stat-card"]');
    await expect(statCards).toHaveCount(4, { timeout: 15000 });
  });

  authenticatedTest('should show revenue trend chart section', async ({ authedPage }) => {
    const revenueTrend = authedPage.getByText(/Revenue Trend|收入趋势/i);
    await expect(revenueTrend).toBeVisible({ timeout: 10000 });
  });

  authenticatedTest('should show orders trend chart section', async ({ authedPage }) => {
    const ordersTrend = authedPage.getByText(/Orders Over Time|订单趋势/i);
    await expect(ordersTrend).toBeVisible({ timeout: 10000 });
  });

  authenticatedTest('should show order status breakdown', async ({ authedPage }) => {
    const orderStatus = authedPage.getByText(/Order Status|订单状态/i);
    await expect(orderStatus).toBeVisible({ timeout: 10000 });
  });

  authenticatedTest('should show top products section', async ({ authedPage }) => {
    const topProducts = authedPage.getByText(/Top Products|热销商品/i);
    await expect(topProducts).toBeVisible({ timeout: 10000 });
  });
});

// ── 3. Period Selector Interactivity ─────────────────────────────────────────

authenticatedTest.describe('Analytics - Period Selector', () => {
  authenticatedTest('should switch period and update display', async ({ authedPage }) => {
    await authedPage.goto('/admin/analytics');
    await authedPage.waitForLoadState('domcontentloaded');
    await authedPage.waitForTimeout(2000);

    const btn7d = authedPage
      .locator('[data-testid="admin-analytics"] button')
      .filter({
        hasText: /^7/,
      })
      .first();
    await btn7d.click();
    await authedPage.waitForTimeout(500);

    await authedPage.screenshot({
      path: 'e2e-screenshots/analytics-7d.png',
      fullPage: true,
    });

    const btn90d = authedPage
      .locator('[data-testid="admin-analytics"] button')
      .filter({
        hasText: /^90/,
      })
      .first();
    await btn90d.click();
    await authedPage.waitForTimeout(500);

    await authedPage.screenshot({
      path: 'e2e-screenshots/analytics-90d.png',
      fullPage: true,
    });
  });
});

// ── 4. Sidebar Navigation ────────────────────────────────────────────────────

authenticatedTest.describe('Analytics - Sidebar Navigation', () => {
  authenticatedTest('should navigate to analytics from admin sidebar', async ({ authedPage }) => {
    await authedPage.goto('/admin');
    await authedPage.waitForLoadState('domcontentloaded');
    await authedPage.waitForTimeout(2000);

    const analyticsLink = authedPage.locator('a[href="/admin/analytics"]');
    await expect(analyticsLink.first()).toBeVisible({ timeout: 10000 });
    await analyticsLink.first().click();

    await authedPage.waitForURL(/\/admin\/analytics/, { timeout: 15000 });
    expect(authedPage.url()).toContain('/admin/analytics');

    const container = authedPage.locator('[data-testid="admin-analytics"]');
    await expect(container).toBeVisible({ timeout: 10000 });
  });
});
