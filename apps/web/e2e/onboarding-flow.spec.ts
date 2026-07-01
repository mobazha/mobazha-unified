/**
 * Onboarding Flow E2E Tests
 *
 * Validates the unified onboarding experience:
 *   1. User onboarding page (/onboarding) — enhanced profile setup
 *   2. Seller onboarding wizard (admin panel) — smart skip logic
 *
 * Prerequisites:
 *   - Running dev server or Docker infrastructure
 *   - E2E_TEST_PASSWORD env var set for authenticated tests
 *
 * Run:
 *   npx playwright test onboarding-flow.spec.ts --reporter=list
 */

import { test, expect } from '@playwright/test';
import { authenticatedTest } from './fixtures/auth';

// ── 1. Onboarding Auth Guard ─────────────────────────────────────────────────

test.describe('Onboarding Auth Guard', () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
    await context.addInitScript(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });
  });

  test('should redirect unauthenticated users to login', async ({ page }) => {
    await page.goto('/onboarding');
    await page.waitForURL(/\/login/, { timeout: 15000 });
    expect(page.url()).toMatch(/\/login/);
  });
});

// ── 2. Onboarding Page Structure ─────────────────────────────────────────────

authenticatedTest.describe('Onboarding Page Elements', () => {
  authenticatedTest.setTimeout(30000);

  authenticatedTest(
    'should display welcome heading and value propositions',
    async ({ authedPage }) => {
      await authedPage.goto('/onboarding', { timeout: 15000 });
      await authedPage.waitForLoadState('domcontentloaded');

      const url = authedPage.url();
      if (!url.includes('/onboarding')) {
        authenticatedTest.skip();
        return;
      }

      const heading = authedPage.locator('h1');
      await expect(heading).toBeVisible({ timeout: 10000 });
    }
  );

  authenticatedTest('should show avatar upload area', async ({ authedPage }) => {
    await authedPage.goto('/onboarding', { timeout: 15000 });
    await authedPage.waitForLoadState('domcontentloaded');

    const url = authedPage.url();
    if (!url.includes('/onboarding')) {
      authenticatedTest.skip();
      return;
    }

    const avatarArea = authedPage.locator('[role="button"]').filter({
      has: authedPage.locator('input[type="file"]'),
    });
    await expect(avatarArea.first()).toBeVisible({ timeout: 10000 });
  });

  authenticatedTest('should show display name input (required)', async ({ authedPage }) => {
    await authedPage.goto('/onboarding', { timeout: 15000 });
    await authedPage.waitForLoadState('domcontentloaded');

    const url = authedPage.url();
    if (!url.includes('/onboarding')) {
      authenticatedTest.skip();
      return;
    }

    const nameInput = authedPage.locator('[data-testid="onboarding-display-name"]');
    await expect(nameInput).toBeVisible({ timeout: 10000 });
  });

  authenticatedTest('should show short bio textarea', async ({ authedPage }) => {
    await authedPage.goto('/onboarding', { timeout: 15000 });
    await authedPage.waitForLoadState('domcontentloaded');

    const url = authedPage.url();
    if (!url.includes('/onboarding')) {
      authenticatedTest.skip();
      return;
    }

    const bioInput = authedPage.locator('[data-testid="onboarding-short-bio"]');
    await expect(bioInput).toBeVisible({ timeout: 10000 });
  });

  authenticatedTest('should show country and currency selectors', async ({ authedPage }) => {
    await authedPage.goto('/onboarding', { timeout: 15000 });
    await authedPage.waitForLoadState('domcontentloaded');

    const url = authedPage.url();
    if (!url.includes('/onboarding')) {
      authenticatedTest.skip();
      return;
    }

    const countrySelect = authedPage.locator('[data-testid="onboarding-country"]');
    const currencySelect = authedPage.locator('[data-testid="onboarding-currency"]');

    await expect(countrySelect).toBeVisible({ timeout: 10000 });
    await expect(currencySelect).toBeVisible({ timeout: 10000 });
  });

  authenticatedTest('should show submit button', async ({ authedPage }) => {
    await authedPage.goto('/onboarding', { timeout: 15000 });
    await authedPage.waitForLoadState('domcontentloaded');

    const url = authedPage.url();
    if (!url.includes('/onboarding')) {
      authenticatedTest.skip();
      return;
    }

    const submitBtn = authedPage.locator('[data-testid="onboarding-submit"]');
    await expect(submitBtn).toBeVisible({ timeout: 10000 });
  });

  authenticatedTest('should disable submit when display name is empty', async ({ authedPage }) => {
    await authedPage.goto('/onboarding', { timeout: 15000 });
    await authedPage.waitForLoadState('domcontentloaded');

    const url = authedPage.url();
    if (!url.includes('/onboarding')) {
      authenticatedTest.skip();
      return;
    }

    const nameInput = authedPage.locator('[data-testid="onboarding-display-name"]');
    await nameInput.clear();

    const submitBtn = authedPage.locator('[data-testid="onboarding-submit"]');
    await expect(submitBtn).toBeDisabled();
  });

  authenticatedTest('should enable submit when display name is filled', async ({ authedPage }) => {
    await authedPage.goto('/onboarding', { timeout: 15000 });
    await authedPage.waitForLoadState('domcontentloaded');

    const url = authedPage.url();
    if (!url.includes('/onboarding')) {
      authenticatedTest.skip();
      return;
    }

    const nameInput = authedPage.locator('[data-testid="onboarding-display-name"]');
    await nameInput.fill('Test Store Name');

    const submitBtn = authedPage.locator('[data-testid="onboarding-submit"]');
    await expect(submitBtn).toBeEnabled();
  });
});

// ── 3. Seller Onboarding Wizard ──────────────────────────────────────────────

authenticatedTest.describe('Seller Onboarding Wizard', () => {
  authenticatedTest(
    'should show onboarding wizard or dashboard on admin page',
    async ({ authedPage }) => {
      await authedPage.goto('/admin');
      await authedPage.waitForLoadState('domcontentloaded');

      const dashboard = authedPage.locator('[data-testid="admin-dashboard"]');
      await expect(dashboard).toBeVisible();

      const hasWizard = await authedPage
        .locator('[data-testid="seller-onboarding"]')
        .isVisible()
        .catch(() => false);

      const hasStatCards = await authedPage
        .locator('[data-testid="admin-stat-card"]')
        .first()
        .isVisible()
        .catch(() => false);

      const hasEmptyState = await authedPage
        .locator('a[href*="/listing/new"]')
        .isVisible()
        .catch(() => false);

      expect(hasWizard || hasStatCards || hasEmptyState).toBe(true);
    }
  );

  authenticatedTest(
    'seller onboarding wizard should have step indicators',
    async ({ authedPage }) => {
      await authedPage.goto('/admin');
      await authedPage.waitForLoadState('domcontentloaded');

      const wizard = authedPage.locator('[data-testid="seller-onboarding"]');
      const isVisible = await wizard.isVisible().catch(() => false);

      if (!isVisible) {
        authenticatedTest.skip();
        return;
      }

      const stepCircles = wizard.locator('.rounded-full').filter({
        hasText: /[123]/,
      });
      expect(await stepCircles.count()).toBeGreaterThanOrEqual(1);
    }
  );
});
