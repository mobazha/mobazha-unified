/**
 * Admin Deal Links E2E Tests
 *
 * Covers tabbed layout, navigation, and sidebar badge with mocked hosting APIs.
 *
 * Run:
 *   pnpm --filter @mobazha/web exec playwright test admin-deal-links.spec.ts --project=chromium
 */

import { expect } from '@playwright/test';
import { test } from '@playwright/test';
import { setupMockAuth } from './fixtures/mock-auth';
import { mockDealLinksAPI } from './fixtures/mock-api-routes';

test.describe('Admin Deal Links', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockAuth(page);
    await mockDealLinksAPI(page);
  });

  test('loads tabbed home with links panel', async ({ page }) => {
    await page.goto('/admin/deal-links');
    await page.waitForLoadState('domcontentloaded');

    await expect(page.getByTestId('admin-deal-links-page')).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('deal-links-tabs')).toBeVisible();
    await expect(page.getByTestId('deal-links-tab-panel-links')).toBeVisible();
    await expect(page.getByTestId('deal-link-row-deal-visual-1')).toBeVisible();
  });

  test('switches to programs and attribution tabs', async ({ page }) => {
    await page.goto('/admin/deal-links');
    await page.waitForLoadState('domcontentloaded');

    await page.getByTestId('deal-links-tab-programs').click();
    await expect(page.getByTestId('deal-links-tab-panel-programs')).toBeVisible();
    await expect(page.getByTestId('deal-promotion-program-prog-visual-1')).toBeVisible();

    await page.getByTestId('deal-links-tab-attribution').click();
    await expect(page.getByTestId('deal-links-tab-panel-attribution')).toBeVisible();
    await expect(page.getByTestId('deal-commission-statement-stmt-visual-1')).toBeVisible();
  });

  test('shows attribution exception badge on sidebar nav and attribution tab', async ({ page }) => {
    await page.goto('/admin/deal-links');
    await page.waitForLoadState('domcontentloaded');

    const sidebarBadge = page.getByTestId('admin-nav-deal-links-badge');
    await expect(sidebarBadge).toBeVisible({ timeout: 15000 });
    await expect(sidebarBadge).toHaveText('1');

    await expect(page.getByTestId('admin-nav-deal-links')).toHaveAttribute(
      'href',
      '/admin/deal-links?tab=attribution&attributionStatus=pending_review'
    );

    await expect(page.getByTestId('deal-links-tab-attribution-badge')).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByTestId('deal-links-attention-banner')).toBeVisible({ timeout: 15000 });

    await page.getByTestId('deal-links-tab-attribution').click();
    await expect(page.getByTestId('deal-links-tab-panel-attribution')).toBeVisible();
    await expect(page.getByTestId('deal-links-tab-attribution-badge')).not.toBeVisible();
    await expect(page.getByTestId('deal-links-attention-banner')).not.toBeVisible();
    await expect(page.getByTestId('deal-links-attribution-filter-pending_review')).toHaveText(
      /Platform review \(1\)|平台复核（1）/
    );
    await expect(page.getByTestId('deal-links-attribution-filter-observed')).toHaveText(
      /In protection period \(1\)|保护期中（1）/
    );
  });

  test('create link route renders form', async ({ page }) => {
    await page.goto('/admin/deal-links/new');
    await page.waitForLoadState('domcontentloaded');

    await expect(page.getByTestId('admin-deal-links-new-page')).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('create-deal-link-form')).toBeVisible();
  });

  test('create program route renders form', async ({ page }) => {
    await page.goto('/admin/deal-links/programs/new');
    await page.waitForLoadState('domcontentloaded');

    await expect(page.getByTestId('admin-deal-links-new-program-page')).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByTestId('create-program-form')).toBeVisible();
  });

  test('persists program and attribution filters in query params', async ({ page }) => {
    await page.goto('/admin/deal-links?tab=programs');
    await page.waitForLoadState('domcontentloaded');

    await page.getByTestId('deal-links-program-filter-active').click();
    await expect(page).toHaveURL(/programStatus=active/);

    await page.getByTestId('deal-links-tab-attribution').click();
    await expect(page).toHaveURL(/tab=attribution/);
    await expect(page).toHaveURL(/programStatus=active/);

    await page.getByTestId('deal-links-attribution-filter-pending_review').click();
    await expect(page).toHaveURL(/attributionStatus=pending_review/);
    await expect(page.getByTestId('deal-commission-statement-stmt-visual-2')).toBeVisible();
  });

  test('restores attribution filter from deep link', async ({ page }) => {
    await page.goto('/admin/deal-links?tab=attribution&attributionStatus=reversed');
    await page.waitForLoadState('domcontentloaded');

    await expect(page.getByTestId('deal-links-tab-panel-attribution')).toBeVisible();
    await expect(page.getByTestId('deal-commission-statement-stmt-visual-3')).toBeVisible();
    await expect(page.getByTestId('deal-commission-statement-stmt-visual-1')).not.toBeVisible();
  });
});
