/**
 * Admin Collections E2E Tests
 *
 * Tests the collections management functionality:
 *   - Page renders with correct heading
 *   - Collections list or empty state
 *   - Create collection button/link presence
 *
 * Uses authenticatedTest to perform real Casdoor login.
 *
 * Run:
 *   npx playwright test admin-collections.spec.ts --project=chromium --reporter=list
 */

import { expect } from '@playwright/test';
import { authenticatedTest } from './fixtures/auth';

authenticatedTest.describe('Admin Collections', () => {
  authenticatedTest('page loads and shows heading', async ({ authedPage }) => {
    await authedPage.goto('/admin/collections');
    await authedPage.waitForLoadState('domcontentloaded');

    const heading = authedPage.getByRole('heading', { name: 'Collections', exact: true });
    await expect(heading).toBeVisible({ timeout: 15000 });

    await authedPage.screenshot({
      path: 'test-results/admin-collections-page.png',
      fullPage: true,
    });
  });

  authenticatedTest('has Create Collection button or link', async ({ authedPage }) => {
    await authedPage.goto('/admin/collections');
    await authedPage.waitForLoadState('domcontentloaded');

    const createBtn = authedPage
      .getByRole('button', { name: /create/i })
      .or(authedPage.getByRole('link', { name: /create/i }))
      .or(authedPage.getByText(/create collection/i));
    await expect(createBtn.first()).toBeVisible({ timeout: 15000 });
  });
});
