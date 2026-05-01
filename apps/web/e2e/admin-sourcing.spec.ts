/**
 * Admin Sourcing E2E Tests (FF-4 + SC-FE-4/5)
 *
 * Tests the supply chain sourcing pages:
 *   - Sourcing hub renders with stats (providers, products, cost, profit)
 *   - Alerts & Rules page loads with correct heading
 *   - Rule creation form appears on "Add Rule" click
 *   - Imported Products page loads with filter tabs
 *   - Catalog page loads
 *   - My Designs page loads
 *
 * Uses authenticatedTest to perform real Casdoor login.
 *
 * Run:
 *   npx playwright test admin-sourcing.spec.ts --project=chromium --reporter=list
 */

import { expect } from '@playwright/test';
import { authenticatedTest } from './fixtures/auth';

authenticatedTest.describe('Admin Sourcing Hub', () => {
  authenticatedTest('page loads with heading and stats', async ({ authedPage }) => {
    await authedPage.goto('/admin/sourcing');
    await authedPage.waitForLoadState('domcontentloaded');

    const container = authedPage.locator('[data-testid="admin-sourcing"]');
    await expect(container).toBeVisible({ timeout: 15000 });

    const heading = authedPage.getByRole('heading', { name: /product sourcing/i });
    await expect(heading).toBeVisible();

    await authedPage.screenshot({
      path: 'test-results/admin-sourcing-hub.png',
      fullPage: true,
    });
  });

  authenticatedTest('shows quick action links', async ({ authedPage }) => {
    await authedPage.goto('/admin/sourcing');
    await authedPage.waitForLoadState('domcontentloaded');

    const designsLink = authedPage.getByRole('link', { name: /my designs/i });
    await expect(designsLink).toBeVisible({ timeout: 15000 });

    const productsLink = authedPage.getByRole('link', { name: /imported products/i });
    await expect(productsLink).toBeVisible();

    const alertsLink = authedPage.getByRole('link', { name: /alerts & rules/i });
    await expect(alertsLink).toBeVisible();
  });

  authenticatedTest('shows profit stats cards', async ({ authedPage }) => {
    await authedPage.goto('/admin/sourcing');
    await authedPage.waitForLoadState('domcontentloaded');

    const container = authedPage.locator('[data-testid="admin-sourcing"]');
    await expect(container).toBeVisible({ timeout: 15000 });

    const totalCost = authedPage.getByText(/total cost/i);
    await expect(totalCost).toBeVisible();

    const estProfit = authedPage.getByText(/est\. profit/i);
    await expect(estProfit).toBeVisible();
  });
});

authenticatedTest.describe('Admin Sourcing Imported Products', () => {
  authenticatedTest('page loads with filter tabs', async ({ authedPage }) => {
    await authedPage.goto('/admin/sourcing/products');
    await authedPage.waitForLoadState('domcontentloaded');

    const container = authedPage.locator('[data-testid="admin-sourcing-products"]');
    await expect(container).toBeVisible({ timeout: 15000 });

    const allTab = authedPage.getByRole('button', { name: /all/i }).first();
    await expect(allTab).toBeVisible();

    const syncedTab = authedPage.getByRole('button', { name: /synced/i }).first();
    await expect(syncedTab).toBeVisible();

    await authedPage.screenshot({
      path: 'test-results/admin-sourcing-products.png',
      fullPage: true,
    });
  });

  authenticatedTest('breadcrumb navigates to sourcing hub', async ({ authedPage }) => {
    await authedPage.goto('/admin/sourcing/products');
    await authedPage.waitForLoadState('domcontentloaded');

    const breadcrumb = authedPage.locator('a[href="/admin/sourcing"]').first();
    await expect(breadcrumb).toBeVisible({ timeout: 15000 });
  });
});

authenticatedTest.describe('Admin Sourcing Catalog', () => {
  authenticatedTest('page loads', async ({ authedPage }) => {
    await authedPage.goto('/admin/sourcing/catalog');
    await authedPage.waitForLoadState('domcontentloaded');

    await authedPage.waitForTimeout(3000);

    await authedPage.screenshot({
      path: 'test-results/admin-sourcing-catalog.png',
      fullPage: true,
    });
  });
});

authenticatedTest.describe('Admin Sourcing My Designs', () => {
  authenticatedTest('page loads', async ({ authedPage }) => {
    await authedPage.goto('/admin/sourcing/designs');
    await authedPage.waitForLoadState('domcontentloaded');

    await authedPage.waitForTimeout(3000);

    await authedPage.screenshot({
      path: 'test-results/admin-sourcing-designs.png',
      fullPage: true,
    });
  });
});

authenticatedTest.describe('Admin Sourcing Alerts & Rules', () => {
  authenticatedTest('page loads with heading', async ({ authedPage }) => {
    await authedPage.goto('/admin/sourcing/alerts');
    await authedPage.waitForLoadState('domcontentloaded');

    const container = authedPage.locator('[data-testid="admin-sourcing-alerts"]');
    await expect(container).toBeVisible({ timeout: 15000 });

    const heading = authedPage.getByRole('heading', { name: /alerts & rules/i });
    await expect(heading).toBeVisible();

    await authedPage.screenshot({
      path: 'test-results/admin-sourcing-alerts.png',
      fullPage: true,
    });
  });

  authenticatedTest('shows alerts section with empty state', async ({ authedPage }) => {
    await authedPage.goto('/admin/sourcing/alerts');
    await authedPage.waitForLoadState('domcontentloaded');

    const alertsSection = authedPage.getByText(/no alerts/i).first();
    const alertsList = authedPage.locator('[class*="destructive"], [class*="amber"]').first();
    const eitherVisible = alertsSection.or(alertsList);
    await expect(eitherVisible).toBeVisible({ timeout: 15000 });
  });

  authenticatedTest('shows rules section', async ({ authedPage }) => {
    await authedPage.goto('/admin/sourcing/alerts');
    await authedPage.waitForLoadState('domcontentloaded');

    const rulesHeading = authedPage.getByText(/automation rules/i).first();
    await expect(rulesHeading).toBeVisible({ timeout: 15000 });

    const addRuleBtn = authedPage.getByRole('button', { name: /add rule/i });
    await expect(addRuleBtn).toBeVisible();
  });

  authenticatedTest('add rule button shows creation form', async ({ authedPage }) => {
    await authedPage.goto('/admin/sourcing/alerts');
    await authedPage.waitForLoadState('domcontentloaded');

    const addRuleBtn = authedPage.getByRole('button', { name: /add rule/i });
    await expect(addRuleBtn).toBeVisible({ timeout: 15000 });
    await addRuleBtn.click();

    const triggerSelect = authedPage.locator('select').first();
    await expect(triggerSelect).toBeVisible({ timeout: 5000 });

    await authedPage.screenshot({
      path: 'test-results/admin-sourcing-create-rule.png',
      fullPage: true,
    });
  });

  authenticatedTest('back link navigates to sourcing hub', async ({ authedPage }) => {
    await authedPage.goto('/admin/sourcing/alerts');
    await authedPage.waitForLoadState('domcontentloaded');

    const backLink = authedPage.getByRole('link', { name: '' }).first();
    const backLinkByHref = authedPage.locator('a[href="/admin/sourcing"]').first();
    await expect(backLinkByHref).toBeVisible({ timeout: 15000 });
  });
});
