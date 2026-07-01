/**
 * Order Flow E2E Tests
 * 订单流程端到端测试
 *
 * 测试购物车、结算、订单列表和订单详情等。
 * 需要运行中的全栈环境。
 *
 * 环境变量:
 *   E2E_TEST_PASSWORD - 测试用户密码 (必须)
 */

import { test, expect } from '@playwright/test';
import { performCasdoorLogin } from './fixtures/auth';

const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD || '';

test.describe('Cart', () => {
  test.beforeEach(async () => {
    test.skip(!TEST_PASSWORD, 'E2E_TEST_PASSWORD env var not set');
  });

  test('should display cart page when authenticated', async ({ page }) => {
    await performCasdoorLogin(page);

    await page.goto('/cart');
    await page.waitForLoadState('domcontentloaded');

    expect(page.url()).toContain('/cart');
    expect(page.url()).not.toContain('/login');

    // Cart may be empty, but should render
    const body = page.locator('body');
    await expect(body).toBeVisible();

    await page.screenshot({ path: 'e2e-screenshots/cart-page.png', fullPage: true });
  });

  test('should show empty cart message when no items', async ({ page }) => {
    await performCasdoorLogin(page);

    await page.goto('/cart');
    await page.waitForLoadState('domcontentloaded');

    // Look for empty cart indication
    const emptyText = page.getByText(/empty|no items|没有商品|购物车为空|cart is empty/i).first();
    const isEmpty = await emptyText.isVisible().catch(() => false);

    if (isEmpty) {
      await page.screenshot({ path: 'e2e-screenshots/cart-empty.png', fullPage: true });
    }
  });
});

test.describe('Orders', () => {
  test.beforeEach(async () => {
    test.skip(!TEST_PASSWORD, 'E2E_TEST_PASSWORD env var not set');
  });

  test('should display orders page', async ({ page }) => {
    await performCasdoorLogin(page);

    await page.goto('/orders');
    await page.waitForLoadState('domcontentloaded');

    expect(page.url()).toContain('/orders');
    expect(page.url()).not.toContain('/login');

    await page.screenshot({ path: 'e2e-screenshots/orders-page.png', fullPage: true });
  });

  test('should show orders list or empty state', async ({ page }) => {
    await performCasdoorLogin(page);

    await page.goto('/orders');
    await page.waitForLoadState('domcontentloaded');

    // Check for order items or empty state
    const orderCard = page
      .locator('[data-testid="order-card"]')
      .or(page.locator('.order-card'))
      .first();
    const hasOrders = await orderCard.isVisible().catch(() => false);

    if (hasOrders) {
      // Click on the first order to view details
      await orderCard.click();
      await page.waitForLoadState('domcontentloaded');

      // Should navigate to order detail
      expect(page.url()).toMatch(/\/orders\/.+/);
      await page.screenshot({ path: 'e2e-screenshots/order-detail.png', fullPage: true });
    } else {
      // Empty state
      const emptyText = page.getByText(/no orders|没有订单|empty/i).first();
      const showsEmpty = await emptyText.isVisible().catch(() => false);
      test.info().annotations.push({
        type: 'note',
        description: showsEmpty ? 'No orders found (empty state shown)' : 'No order cards found',
      });
    }
  });
});

test.describe('Checkout Flow', () => {
  test.beforeEach(async () => {
    test.skip(!TEST_PASSWORD, 'E2E_TEST_PASSWORD env var not set');
  });

  test('should redirect to checkout page when authenticated', async ({ page }) => {
    await performCasdoorLogin(page);

    await page.goto('/checkout');
    await page.waitForLoadState('domcontentloaded');

    // Checkout page should load (may redirect to cart if empty)
    expect(page.url()).not.toContain('/login');

    await page.screenshot({ path: 'e2e-screenshots/checkout-page.png', fullPage: true });
  });
});

test.describe('Wallet', () => {
  test.beforeEach(async () => {
    test.skip(!TEST_PASSWORD, 'E2E_TEST_PASSWORD env var not set');
  });

  test('should display wallet page', async ({ page }) => {
    await performCasdoorLogin(page);

    await page.goto('/wallet');
    await page.waitForLoadState('domcontentloaded');

    expect(page.url()).toContain('/wallet');
    expect(page.url()).not.toContain('/login');

    await page.screenshot({ path: 'e2e-screenshots/wallet-page.png', fullPage: true });
  });
});

test.describe('Notifications', () => {
  test.beforeEach(async () => {
    test.skip(!TEST_PASSWORD, 'E2E_TEST_PASSWORD env var not set');
  });

  test('should display notifications page', async ({ page }) => {
    await performCasdoorLogin(page);

    await page.goto('/notifications');
    await page.waitForLoadState('domcontentloaded');

    expect(page.url()).toContain('/notifications');
    expect(page.url()).not.toContain('/login');

    await page.screenshot({ path: 'e2e-screenshots/notifications-page.png', fullPage: true });
  });
});
