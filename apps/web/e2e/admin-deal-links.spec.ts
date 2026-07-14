/**
 * Admin Deal Links E2E Tests
 *
 * Smoke-tests the protected-link create route. The list page and the seller
 * affiliate program (now at /admin/affiliate) are covered by unit tests; the
 * former three-tab layout was removed in the affiliate refactor.
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

  test('create link route renders form', async ({ page }) => {
    await page.goto('/admin/deal-links/new');
    await page.waitForLoadState('domcontentloaded');

    await expect(page.getByTestId('admin-deal-links-new-page')).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('create-deal-link-form')).toBeVisible();
  });
});
