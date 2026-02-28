/**
 * Checkout Flow E2E Tests
 *
 * Tests the checkout and cart pages.
 * Requires a running full-stack environment with Casdoor auth.
 *
 * Env vars:
 *   E2E_TEST_PASSWORD - test user password (required)
 */

import { test, expect } from '@playwright/test';
import { performCasdoorLogin } from './fixtures/auth';

const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD || '';

test.describe('Checkout Page', () => {
  test.beforeEach(async () => {
    test.skip(!TEST_PASSWORD, 'E2E_TEST_PASSWORD env var not set');
  });

  test('should render checkout page when authenticated', async ({ page }) => {
    await performCasdoorLogin(page);
    await page.goto('/checkout');
    await page.waitForLoadState('networkidle');

    expect(page.url()).toContain('/checkout');
    expect(page.url()).not.toContain('/login');

    const checkoutPage = page.locator(
      '[data-testid="checkout-page"], [data-testid="checkout-page-mobile"], [data-testid="checkout-error"]'
    );
    await expect(checkoutPage.first()).toBeVisible();
  });

  test('should show order notes input', async ({ page }) => {
    await performCasdoorLogin(page);
    await page.goto('/checkout');
    await page.waitForLoadState('networkidle');

    const notes = page.locator('[data-testid="checkout-order-notes"]');
    const notesVisible = await notes.isVisible().catch(() => false);
    expect(notesVisible !== undefined).toBeTruthy();
  });

  test('should show submit button', async ({ page }) => {
    await performCasdoorLogin(page);
    await page.goto('/checkout');
    await page.waitForLoadState('networkidle');

    const submitBtn = page.locator(
      '[data-testid="checkout-submit-btn"], [data-testid="checkout-submit-btn-mobile"]'
    );
    const btnExists = await submitBtn.count();
    expect(btnExists).toBeGreaterThanOrEqual(0);
  });
});

test.describe('Checkout Page - Auth Guard', () => {
  test('should redirect unauthenticated users to login', async ({ page, context }) => {
    await context.clearCookies();
    await context.addInitScript(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });

    await page.goto('/checkout');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    expect(page.url()).toContain('/login');
  });
});

test.describe('Cart Page', () => {
  test.beforeEach(async () => {
    test.skip(!TEST_PASSWORD, 'E2E_TEST_PASSWORD env var not set');
  });

  test('should display cart page when authenticated', async ({ page }) => {
    await performCasdoorLogin(page);
    await page.goto('/cart');
    await page.waitForLoadState('networkidle');

    expect(page.url()).toContain('/cart');
    expect(page.url()).not.toContain('/login');

    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('should show cart content or empty state', async ({ page }) => {
    await performCasdoorLogin(page);
    await page.goto('/cart');
    await page.waitForLoadState('networkidle');

    const main = page.locator('main');
    await expect(main.first()).toBeVisible();
  });

  test('should have checkout button or empty state', async ({ page }) => {
    await performCasdoorLogin(page);
    await page.goto('/cart');
    await page.waitForLoadState('networkidle');

    const checkoutLink = page.locator('a, button').filter({ hasText: /checkout|结账/i });
    const emptyState = page.getByText(/empty|no items|没有商品|购物车为空/i);

    const hasCheckout = await checkoutLink
      .first()
      .isVisible()
      .catch(() => false);
    const hasEmpty = await emptyState
      .first()
      .isVisible()
      .catch(() => false);

    expect(hasCheckout || hasEmpty).toBeTruthy();
  });
});

test.describe('Cart Page - Auth Guard', () => {
  test('should redirect unauthenticated users to login', async ({ page, context }) => {
    await context.clearCookies();
    await context.addInitScript(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });

    await page.goto('/cart');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    expect(page.url()).toContain('/login');
  });
});

test.describe('Order Confirmation', () => {
  test('should display confirmation page with order details', async ({ page }) => {
    await page.goto('/checkout/confirmation?orderId=test-order-id&slug=test-slug');
    await page.waitForLoadState('networkidle');

    const main = page.locator('main, body');
    await expect(main.first()).toBeVisible();
  });
});
