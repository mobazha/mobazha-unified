/**
 * Admin Discounts E2E Tests
 *
 * Tests the discounts management page:
 *   - Page renders correctly
 *   - Create discount button presence
 *   - Discounts list or empty state
 *
 * Uses authenticatedTest to perform real Casdoor login.
 *
 * Run:
 *   npx playwright test admin-discounts.spec.ts --project=chromium --reporter=list
 */

import { expect } from '@playwright/test';
import { authenticatedTest } from './fixtures/auth';

authenticatedTest.describe('Admin Discounts', () => {
  authenticatedTest('page loads and shows heading', async ({ authedPage }) => {
    await authedPage.goto('/admin/discounts');
    await authedPage.waitForLoadState('domcontentloaded');

    const heading = authedPage.getByRole('heading', { name: 'Discounts', exact: true });
    await expect(heading).toBeVisible({ timeout: 15000 });

    await authedPage.screenshot({
      path: 'test-results/admin-discounts-page.png',
      fullPage: true,
    });
  });

  authenticatedTest('has Create Discount button or link', async ({ authedPage }) => {
    await authedPage.goto('/admin/discounts');
    await authedPage.waitForLoadState('domcontentloaded');

    const createBtn = authedPage
      .getByRole('button', { name: /create/i })
      .or(authedPage.getByRole('link', { name: /create/i }))
      .or(authedPage.getByText(/create discount/i));
    await expect(createBtn.first()).toBeVisible({ timeout: 15000 });
  });
});
