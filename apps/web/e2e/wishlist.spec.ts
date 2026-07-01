/**
 * Wishlist E2E Tests
 *
 * Tests the wishlist / favorites page:
 *   - Page loads and renders
 *   - Shows empty state or saved items
 *
 * Uses authenticatedTest to perform real Casdoor login.
 *
 * Run:
 *   npx playwright test wishlist.spec.ts --project=chromium --reporter=list
 */

import { expect } from '@playwright/test';
import { authenticatedTest } from './fixtures/auth';

authenticatedTest.describe('Wishlist', () => {
  authenticatedTest('page loads and renders content', async ({ authedPage }) => {
    await authedPage.goto('/wishlist');
    await authedPage.waitForLoadState('domcontentloaded');

    const heading = authedPage
      .getByRole('heading', { name: /wishlist|favorites|saved/i })
      .or(authedPage.getByText(/wishlist|favorites|saved items/i).first());
    const hasHeading = await heading.isVisible({ timeout: 10000 }).catch(() => false);

    const emptyState = authedPage.getByText(/no items|empty|nothing saved/i);
    const hasEmpty = await emptyState.isVisible({ timeout: 3000 }).catch(() => false);

    expect(hasHeading || hasEmpty).toBe(true);

    await authedPage.screenshot({
      path: 'test-results/wishlist-page.png',
      fullPage: true,
    });
  });

  authenticatedTest('page does not crash', async ({ authedPage }) => {
    await authedPage.goto('/wishlist');
    await authedPage.waitForLoadState('domcontentloaded');

    const errorIndicator = authedPage.getByText(/error|crash|unexpected/i);
    const isError = await errorIndicator.isVisible({ timeout: 3000 }).catch(() => false);
    expect(isError).toBe(false);
  });
});
