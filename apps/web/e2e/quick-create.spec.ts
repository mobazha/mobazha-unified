/**
 * Quick Create Wizard E2E Tests
 *
 * Validates the Quick Create listing flow (#7):
 *   - Auth guard: /listing/quick requires login
 *   - Wizard renders with step indicator and header
 *   - Photo step: media upload area, product type selector, navigation
 *   - Step navigation: Next/Back buttons, disabled state without images
 *   - Full Editor link navigation
 *   - Dashboard entry point: Quick Create card
 *
 * Prerequisites:
 *   - Running dev server
 *   - For authenticated tests: E2E_TEST_PASSWORD set
 *
 * Run:
 *   npx playwright test quick-create.spec.ts --project=chromium --reporter=list
 */

import { test, expect } from '@playwright/test';
import { authenticatedTest } from './fixtures/auth';

// ── 1. Auth Guard — Quick Create requires login ─────────────────────────────

test.describe('Quick Create Auth Guard', () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
    await context.addInitScript(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });
  });

  test('should redirect to login when not authenticated', async ({ page }) => {
    await page.goto('/listing/quick');
    await page.waitForURL(/\/login/, { timeout: 15000 });
    expect(page.url()).toMatch(/\/login/);
  });
});

// ── 2. Wizard UI Rendering ──────────────────────────────────────────────────

authenticatedTest.describe('Quick Create Wizard', () => {
  authenticatedTest('should render wizard header with title', async ({ authedPage }) => {
    await authedPage.goto('/listing/quick');
    await authedPage.waitForLoadState('domcontentloaded');
    await authedPage.waitForTimeout(2000);

    const wizard = authedPage.locator('[data-testid="quick-create-wizard"]');
    await expect(wizard).toBeVisible({ timeout: 10000 });

    const title = authedPage.locator('[data-testid="wizard-title"]');
    await expect(title).toBeVisible();

    await authedPage.screenshot({
      path: 'e2e-screenshots/quick-create-wizard.png',
      fullPage: true,
    });
  });

  authenticatedTest('should show step indicator with 3 steps', async ({ authedPage }) => {
    await authedPage.goto('/listing/quick');
    await authedPage.waitForLoadState('domcontentloaded');
    await authedPage.waitForTimeout(2000);

    for (const step of ['photos', 'review', 'publish']) {
      const stepEl = authedPage.locator(`[data-testid="step-${step}"]`);
      await expect(stepEl).toBeVisible();
    }
  });

  authenticatedTest('should show Full Editor link', async ({ authedPage }) => {
    await authedPage.goto('/listing/quick');
    await authedPage.waitForLoadState('domcontentloaded');
    await authedPage.waitForTimeout(2000);

    const fullEditorLink = authedPage.locator('[data-testid="full-editor-link"]');
    await expect(fullEditorLink).toBeVisible();

    const href = await fullEditorLink.getAttribute('href');
    expect(href).toContain('/listing/new');
  });
});

// ── 3. Photo Step ───────────────────────────────────────────────────────────

authenticatedTest.describe('Quick Create - Photo Step', () => {
  authenticatedTest('should start on photo step with upload area', async ({ authedPage }) => {
    await authedPage.goto('/listing/quick');
    await authedPage.waitForLoadState('domcontentloaded');
    await authedPage.waitForTimeout(2000);

    const uploadText = authedPage.getByText(/Upload Product Photos|upload|drag/i).first();
    await expect(uploadText).toBeVisible({ timeout: 10000 });

    await authedPage.screenshot({
      path: 'e2e-screenshots/quick-create-photo-step.png',
      fullPage: true,
    });
  });

  authenticatedTest('should show product type selector', async ({ authedPage }) => {
    await authedPage.goto('/listing/quick');
    await authedPage.waitForLoadState('domcontentloaded');
    await authedPage.waitForTimeout(2000);

    const typeText = authedPage.getByText(/Product Type|Physical|Digital|Service/i).first();
    await expect(typeText).toBeVisible({ timeout: 10000 });
  });

  authenticatedTest('should disable Next button without images', async ({ authedPage }) => {
    await authedPage.goto('/listing/quick');
    await authedPage.waitForLoadState('domcontentloaded');
    await authedPage.waitForTimeout(2000);

    const nextButton = authedPage.getByRole('button', { name: /Next/i });
    await expect(nextButton).toBeVisible();
    await expect(nextButton).toBeDisabled();
  });

  authenticatedTest('should show helper text when no images', async ({ authedPage }) => {
    await authedPage.goto('/listing/quick');
    await authedPage.waitForLoadState('domcontentloaded');
    await authedPage.waitForTimeout(2000);

    const noImagesText = authedPage.getByText(/Add at least one photo|至少上传一张/i);
    await expect(noImagesText).toBeVisible({ timeout: 10000 });
  });
});

// ── 4. Dashboard Entry Point ────────────────────────────────────────────────

authenticatedTest.describe('Quick Create - Dashboard Entry', () => {
  authenticatedTest('should have Quick Create card on admin dashboard', async ({ authedPage }) => {
    await authedPage.goto('/admin');
    await authedPage.waitForLoadState('domcontentloaded');
    await authedPage.waitForTimeout(2000);

    const quickCreateLink = authedPage.locator('a[href="/listing/quick"]');
    await expect(quickCreateLink).toBeVisible({ timeout: 10000 });

    await authedPage.screenshot({
      path: 'e2e-screenshots/quick-create-dashboard-entry.png',
      fullPage: true,
    });
  });

  authenticatedTest('should navigate to Quick Create from dashboard', async ({ authedPage }) => {
    await authedPage.goto('/admin');
    await authedPage.waitForLoadState('domcontentloaded');
    await authedPage.waitForTimeout(2000);

    const quickCreateLink = authedPage.locator('a[href="/listing/quick"]');
    await quickCreateLink.click();

    await authedPage.waitForURL(/\/listing\/quick/, { timeout: 15000 });
    expect(authedPage.url()).toContain('/listing/quick');

    const wizard = authedPage.locator('[data-testid="quick-create-wizard"]');
    await expect(wizard).toBeVisible({ timeout: 10000 });
  });
});

// ── 5. Navigation Flow (no actual image upload) ─────────────────────────────

authenticatedTest.describe('Quick Create - Navigation', () => {
  authenticatedTest('should have Back button disabled on first step', async ({ authedPage }) => {
    await authedPage.goto('/listing/quick');
    await authedPage.waitForLoadState('domcontentloaded');
    await authedPage.waitForTimeout(2000);

    const backButton = authedPage.getByRole('button', { name: /Back/i });
    await expect(backButton).toBeVisible();
    await expect(backButton).toBeDisabled();
  });
});
