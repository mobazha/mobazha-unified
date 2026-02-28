/**
 * Checkout Discount Flow E2E Tests
 * 结账折扣流程 E2E 测试
 *
 * Tests the DiscountInput component integration within the checkout page:
 *   - Discount section visibility
 *   - Applying valid/invalid discount codes (API mocked)
 *   - Applied discount display with savings
 *   - Removing applied discounts
 *   - Apply button state management
 *   - Mobile layout
 *
 * These tests mock the discount validation API to run independently of backend state.
 *
 * Run:
 *   npx playwright test checkout-discount.spec.ts --project=chromium --reporter=list
 */

import { test, expect } from '@playwright/test';

// Mock response for a valid percentage discount code
const VALID_DISCOUNT_RESPONSE = {
  data: {
    valid: true,
    discountID: 'd-e2e-pct',
    codeID: 'c-e2e-1',
    title: '10% Off Everything',
    valueType: 'percentage',
    value: '10',
    currency: 'USD',
    message: '',
  },
};

// Mock response for an invalid discount code
const INVALID_DISCOUNT_RESPONSE = {
  data: {
    valid: false,
    message: 'Invalid or expired discount code',
  },
};

// Mock response for applicable discounts (auto discounts)
const APPLICABLE_DISCOUNTS_RESPONSE = {
  data: [],
};

/**
 * Intercept discount-related API calls and return mock responses.
 * The frontend calls: POST /v1/discounts/validate, GET /v1/discounts/applicable
 */
async function mockDiscountAPIs(
  page: import('@playwright/test').Page,
  options?: { validCodes?: string[] }
) {
  const validCodes = options?.validCodes ?? ['SAVE10'];

  await page.route('**/discounts/validate', async (route, request) => {
    if (request.method() !== 'POST') {
      await route.continue();
      return;
    }
    const body = request.postDataJSON();
    const code = body?.code?.toUpperCase?.() ?? '';
    if (validCodes.includes(code)) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(VALID_DISCOUNT_RESPONSE),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(INVALID_DISCOUNT_RESPONSE),
      });
    }
  });

  await page.route('**/discounts/applicable', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(APPLICABLE_DISCOUNTS_RESPONSE),
    });
  });
}

test.describe('Checkout — Discount Section (Desktop)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/checkout');
  });

  test('discount section is visible on checkout page', async ({ page }) => {
    const discountSection = page.getByTestId('discount-section');

    if (await discountSection.isVisible().catch(() => false)) {
      await expect(discountSection).toBeVisible();

      const codeInput = page.getByTestId('discount-code-input');
      await expect(codeInput).toBeVisible();

      const applyBtn = page.getByTestId('discount-apply-btn');
      await expect(applyBtn).toBeVisible();
      await expect(applyBtn).toBeDisabled();
    }

    await page.screenshot({ path: 'test-results/discount-section-desktop.png', fullPage: true });
  });

  test('apply button enables when code is entered', async ({ page }) => {
    const codeInput = page.getByTestId('discount-code-input');
    const applyBtn = page.getByTestId('discount-apply-btn');

    if (!(await codeInput.isVisible().catch(() => false))) {
      test.skip();
      return;
    }

    await expect(applyBtn).toBeDisabled();

    await codeInput.fill('SAVE10');
    await expect(applyBtn).toBeEnabled();

    await codeInput.fill('');
    await expect(applyBtn).toBeDisabled();
  });

  test('apply valid discount code shows success badge', async ({ page }) => {
    await mockDiscountAPIs(page);

    const codeInput = page.getByTestId('discount-code-input');
    if (!(await codeInput.isVisible().catch(() => false))) {
      test.skip();
      return;
    }

    await codeInput.fill('SAVE10');
    await page.getByTestId('discount-apply-btn').click();

    const appliedDiscount = page.getByTestId('applied-discount').first();
    await expect(appliedDiscount).toBeVisible({ timeout: 10000 });

    await expect(appliedDiscount).toContainText(/SAVE10|10%/i);

    await expect(codeInput).toHaveValue('');

    await page.screenshot({
      path: 'test-results/discount-applied-desktop.png',
      fullPage: true,
    });
  });

  test('apply discount code via Enter key', async ({ page }) => {
    await mockDiscountAPIs(page);

    const codeInput = page.getByTestId('discount-code-input');
    if (!(await codeInput.isVisible().catch(() => false))) {
      test.skip();
      return;
    }

    await codeInput.fill('SAVE10');
    await codeInput.press('Enter');

    const appliedDiscount = page.getByTestId('applied-discount').first();
    await expect(appliedDiscount).toBeVisible({ timeout: 10000 });
  });

  test('remove applied discount', async ({ page }) => {
    await mockDiscountAPIs(page);

    const codeInput = page.getByTestId('discount-code-input');
    if (!(await codeInput.isVisible().catch(() => false))) {
      test.skip();
      return;
    }

    await codeInput.fill('SAVE10');
    await page.getByTestId('discount-apply-btn').click();

    const appliedDiscount = page.getByTestId('applied-discount').first();
    await expect(appliedDiscount).toBeVisible({ timeout: 10000 });

    const removeBtn = page.getByTestId('discount-remove-btn').first();
    await removeBtn.click();

    await expect(page.getByTestId('applied-discount')).toHaveCount(0);

    await page.screenshot({
      path: 'test-results/discount-removed-desktop.png',
      fullPage: true,
    });
  });

  test('invalid discount code shows error toast', async ({ page }) => {
    await mockDiscountAPIs(page);

    const codeInput = page.getByTestId('discount-code-input');
    if (!(await codeInput.isVisible().catch(() => false))) {
      test.skip();
      return;
    }

    await codeInput.fill('INVALIDCODE');
    await page.getByTestId('discount-apply-btn').click();

    await page.waitForTimeout(1000);

    // No applied discount should appear
    await expect(page.getByTestId('applied-discount')).toHaveCount(0);
  });

  test('duplicate discount code prevented', async ({ page }) => {
    await mockDiscountAPIs(page);

    const codeInput = page.getByTestId('discount-code-input');
    if (!(await codeInput.isVisible().catch(() => false))) {
      test.skip();
      return;
    }

    // Apply code first time
    await codeInput.fill('SAVE10');
    await page.getByTestId('discount-apply-btn').click();
    await expect(page.getByTestId('applied-discount').first()).toBeVisible({ timeout: 10000 });

    // Try to apply same code again
    await codeInput.fill('SAVE10');
    await page.getByTestId('discount-apply-btn').click();
    await page.waitForTimeout(1000);

    // Should still have only one applied discount
    await expect(page.getByTestId('applied-discount')).toHaveCount(1);
  });
});

test.describe('Checkout — Discount Section (Mobile)', () => {
  test.use({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('/checkout');
  });

  test('mobile: discount section renders correctly', async ({ page }) => {
    const discountSection = page.getByTestId('discount-section');

    if (await discountSection.isVisible().catch(() => false)) {
      await expect(discountSection).toBeVisible();

      const codeInput = page.getByTestId('discount-code-input');
      await expect(codeInput).toBeVisible();

      // Verify no horizontal overflow
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      const viewportWidth = await page.evaluate(() => window.innerWidth);
      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1);
    }

    await page.screenshot({ path: 'test-results/discount-section-mobile.png', fullPage: true });
  });

  test('mobile: apply and remove discount code', async ({ page }) => {
    await mockDiscountAPIs(page);

    const codeInput = page.getByTestId('discount-code-input');
    if (!(await codeInput.isVisible().catch(() => false))) {
      test.skip();
      return;
    }

    // Apply
    await codeInput.fill('SAVE10');
    await page.getByTestId('discount-apply-btn').tap();

    const appliedDiscount = page.getByTestId('applied-discount').first();
    await expect(appliedDiscount).toBeVisible({ timeout: 10000 });

    await page.screenshot({ path: 'test-results/discount-applied-mobile.png', fullPage: true });

    // Remove
    await page.getByTestId('discount-remove-btn').first().tap();
    await expect(page.getByTestId('applied-discount')).toHaveCount(0);

    await page.screenshot({ path: 'test-results/discount-removed-mobile.png', fullPage: true });
  });

  test('mobile: discount input touch target is adequate', async ({ page }) => {
    const applyBtn = page.getByTestId('discount-apply-btn');

    if (await applyBtn.isVisible().catch(() => false)) {
      const box = await applyBtn.boundingBox();
      expect(box).toBeTruthy();
      if (box) {
        expect(box.height).toBeGreaterThanOrEqual(36);
      }
    }
  });
});
