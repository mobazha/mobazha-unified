/**
 * Seller Setup Automation
 *
 * Automated seller account setup for Mobazha e-commerce platform:
 *   1. Login as testuser1 (Casdoor)
 *   2. Set up seller profile (store name, description)
 *   3. Create a listing/product
 *   4. Visit integrations page (Stripe)
 *
 * Run:
 *   E2E_TEST_PASSWORD=123 npx playwright test seller-setup-automation.spec.ts --project=chromium --reporter=list
 *
 * Screenshots saved to: e2e-screenshots/seller-setup-*.png
 */

import { test, expect } from '@playwright/test';
import { performCasdoorLogin, completeOnboardingIfNeeded, getPeerID } from './fixtures/auth';

const SCREENSHOT_DIR = 'e2e-screenshots';
const TEST_USERNAME = process.env.E2E_TEST_USERNAME || 'testuser1';

test.describe.configure({ mode: 'serial' });
test.setTimeout(180_000);

test.describe('Seller Setup Automation', () => {
  test.beforeEach(async () => {
    test.skip(!process.env.E2E_TEST_PASSWORD, 'E2E_TEST_PASSWORD env var required');
  });

  // Step 1: Login as seller (testuser1)
  test('Step 1 — Login as seller', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Click Login or Sign In
    const loginBtn = page
      .getByRole('link', { name: /login|sign in|登录/i })
      .or(page.getByRole('button', { name: /login|sign in|登录/i }))
      .first();
    await loginBtn.click();

    await performCasdoorLogin(page, TEST_USERNAME, process.env.E2E_TEST_PASSWORD);
    await completeOnboardingIfNeeded(page);

    await page.waitForTimeout(2000);
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/seller-setup-01-after-login.png`,
      fullPage: true,
    });

    expect(page.url()).not.toContain('casdoor');
    expect(page.url()).not.toContain('/login');
  });

  // Step 2: Set up seller profile
  test('Step 2 — Set up seller profile', async ({ page }) => {
    await performCasdoorLogin(page, TEST_USERNAME, process.env.E2E_TEST_PASSWORD);
    await completeOnboardingIfNeeded(page);

    // Navigate to profile/branding settings
    await page.goto('/admin/settings/store/branding');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Try to fill store name and description
    const storeNameInput = page
      .getByPlaceholder(/store name|my awesome store|店铺名称|我的店铺/i)
      .or(page.getByLabel(/store name|店铺名称/i))
      .first();
    const storeDescInput = page
      .getByPlaceholder(/short description|描述/i)
      .or(page.getByLabel(/short description|描述/i))
      .or(page.locator('textarea').first())
      .first();

    if (await storeNameInput.isVisible().catch(() => false)) {
      await storeNameInput.fill('Test Stripe Store');
    }
    if (await storeDescInput.isVisible().catch(() => false)) {
      await storeDescInput.fill('A test store for Stripe payment testing');
    }

    // Save if there's a save button
    const saveBtn = page.getByRole('button', { name: /save|保存|update|更新/i }).first();
    if (
      (await saveBtn.isVisible().catch(() => false)) &&
      (await saveBtn.isEnabled().catch(() => false))
    ) {
      await saveBtn.click();
      await page.waitForTimeout(2000);
    }

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/seller-setup-02-profile.png`,
      fullPage: true,
    });
  });

  // Step 3: Create a listing/product
  test('Step 3 — Create listing', async ({ page }) => {
    await performCasdoorLogin(page, TEST_USERNAME, process.env.E2E_TEST_PASSWORD);
    await completeOnboardingIfNeeded(page);

    await page.goto('/listing/new');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Desktop: single-page form. Mobile: wizard with steps
    const isMobileWizard = await page
      .locator('[data-testid="mobile-listing-wizard"]')
      .isVisible()
      .catch(() => false);

    if (isMobileWizard) {
      // Mobile wizard: fill step 1
      const titleInput = page.locator('input[maxlength="140"]').first();
      if (await titleInput.isVisible().catch(() => false)) {
        await titleInput.fill('Premium Wireless Headphones');
      }
      const priceInput = page.locator('input[type="number"], input[inputmode="decimal"]').first();
      if (await priceInput.isVisible().catch(() => false)) {
        await priceInput.fill('49.99');
      }
      const descInput = page.locator('textarea').first();
      if (await descInput.isVisible().catch(() => false)) {
        await descInput.fill(
          'High-quality wireless headphones with noise cancellation. Perfect for music lovers.'
        );
      }

      // Navigate through steps to Review
      for (let i = 0; i < 3; i++) {
        const nextBtn = page.getByRole('button', { name: /next/i });
        if (await nextBtn.isVisible().catch(() => false)) {
          await nextBtn.click();
          await page.waitForTimeout(500);
        }
      }

      // Publish
      const publishBtn = page.getByRole('button', { name: /publish|发布/i });
      if (await publishBtn.isVisible().catch(() => false)) {
        await publishBtn.click();
        await page.waitForTimeout(5000);
      }
    } else {
      // Desktop: single page form
      const titleInput = page
        .getByPlaceholder(/title|标题|name|名称/i)
        .or(page.getByLabel(/title|标题/i))
        .or(page.locator('input[maxlength="140"]'))
        .first();
      if (await titleInput.isVisible().catch(() => false)) {
        await titleInput.fill('Premium Wireless Headphones');
      }

      const descInput = page
        .getByPlaceholder(/description|描述/i)
        .or(page.locator('textarea').first())
        .first();
      if (await descInput.isVisible().catch(() => false)) {
        await descInput.fill(
          'High-quality wireless headphones with noise cancellation. Perfect for music lovers.'
        );
      }

      const priceInput = page
        .getByPlaceholder(/price|价格/i)
        .or(page.getByLabel(/price|价格/i))
        .or(page.locator('input[type="number"], input[inputmode="decimal"]'))
        .first();
      if (await priceInput.isVisible().catch(() => false)) {
        await priceInput.fill('49.99');
      }

      // Category if visible
      const categorySelect = page.locator('[role="combobox"]').first();
      if (await categorySelect.isVisible().catch(() => false)) {
        await categorySelect.click();
        await page.waitForTimeout(300);
        const electronicsOpt = page
          .locator('[role="option"]')
          .filter({ hasText: /electronics|电子|tech/i })
          .first();
        if (await electronicsOpt.isVisible().catch(() => false)) {
          await electronicsOpt.click();
        }
      }

      // Publish/Save
      const publishBtn = page
        .getByRole('button', { name: /publish|发布|save|保存|create|创建/i })
        .first();
      if (
        (await publishBtn.isVisible().catch(() => false)) &&
        (await publishBtn.isEnabled().catch(() => false))
      ) {
        await publishBtn.click();
        await page.waitForTimeout(5000);
      }
    }

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/seller-setup-03-listing-created.png`,
      fullPage: true,
    });

    // Log URL and slug if visible
    const url = page.url();
    if (url.includes('/product/') || url.includes('/listing/')) {
      console.log(`[seller-setup] Listing URL: ${url}`);
    }
  });

  // Step 4: Integrations page (Stripe)
  test('Step 4 — Integrations page', async ({ page }) => {
    await performCasdoorLogin(page, TEST_USERNAME, process.env.E2E_TEST_PASSWORD);
    await completeOnboardingIfNeeded(page);

    await page.goto('/admin/settings/integrations');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/seller-setup-04-integrations.png`,
      fullPage: true,
    });

    const integrationsPage = page.locator('[data-testid="admin-integrations"]');
    await expect(integrationsPage).toBeVisible();
  });

  // Optional: Extract peer ID via API
  test('Extract peer ID', async ({ request }) => {
    const peerID = await getPeerID(request, TEST_USERNAME, process.env.E2E_TEST_PASSWORD);
    console.log(`[seller-setup] Seller peer ID: ${peerID}`);
  });
});
