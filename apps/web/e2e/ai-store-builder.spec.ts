/**
 * AI Store Builder E2E Tests
 *
 * Tests the Store Branding / AI Store Builder page:
 *   - Page renders without crashing (P1 fix verification)
 *   - Theme/Sections tabs present
 *   - Save button visible
 *
 * Uses authenticatedTest to perform real Casdoor login.
 *
 * Run:
 *   npx playwright test ai-store-builder.spec.ts --project=chromium --reporter=list
 */

import { expect } from '@playwright/test';
import { authenticatedTest } from './fixtures/auth';

authenticatedTest.describe('AI Store Builder', () => {
  authenticatedTest('Store Branding page renders without crashing', async ({ authedPage }) => {
    await authedPage.goto('/admin/settings/store/branding');
    await authedPage.waitForLoadState('domcontentloaded');

    const errorIndicator = authedPage.getByText(/error|crash|unexpected/i);
    const isError = await errorIndicator.isVisible({ timeout: 3000 }).catch(() => false);
    expect(isError).toBe(false);

    await authedPage.screenshot({
      path: 'test-results/ai-store-builder-page.png',
      fullPage: true,
    });
  });

  authenticatedTest('Theme or customization tabs are present', async ({ authedPage }) => {
    await authedPage.goto('/admin/settings/store/branding');
    await authedPage.waitForLoadState('domcontentloaded');
    await authedPage.waitForTimeout(2000);

    const themeTab = authedPage
      .getByRole('tab', { name: /theme/i })
      .or(authedPage.getByText(/theme/i).first());
    const sectionsTab = authedPage
      .getByRole('tab', { name: /sections/i })
      .or(authedPage.getByText(/sections/i).first());

    const hasTheme = await themeTab.isVisible({ timeout: 5000 }).catch(() => false);
    const hasSections = await sectionsTab.isVisible({ timeout: 5000 }).catch(() => false);

    expect(hasTheme || hasSections).toBe(true);
  });

  authenticatedTest('Save button is present', async ({ authedPage }) => {
    await authedPage.goto('/admin/settings/store/branding');
    await authedPage.waitForLoadState('domcontentloaded');
    await authedPage.waitForTimeout(2000);

    const saveBtn = authedPage.getByRole('button', { name: /save/i });
    const hasSave = await saveBtn.isVisible({ timeout: 5000 }).catch(() => false);

    expect(hasSave).toBe(true);
  });
});
