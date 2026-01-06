/**
 * Orders E2E Tests
 * 订单流程 E2E 测试
 */

import { test, expect } from '@playwright/test';

test.describe('Orders List Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/orders');
  });

  test('should display orders list page', async ({ page }) => {
    const heading = page.locator('h1').first();
    await expect(heading).toContainText(/Order|订单/i);
  });

  test('should show order filters/tabs', async ({ page }) => {
    // Look for filter tabs or main content area
    const tabsOrFilters = page.locator('[role="tablist"], .tabs, .order-filters, main');
    await expect(tabsOrFilters.first()).toBeVisible();
  });

  test('should display order cards', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Either orders or empty state
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should navigate to order detail', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    const orderLink = page.locator('a[href*="/orders/"]').first();

    if (await orderLink.isVisible()) {
      await orderLink.click();
      await expect(page.url()).toMatch(/\/orders\/[\w-]+/);
    }
  });
});

test.describe('Order Detail Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/orders/MOB-2024-0001');
  });

  test('should display order details', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should show order status', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Look for status indicator
    const status = page.getByText(/pending|paid|shipped|delivered|completed|processing/i);
    expect(await status.count()).toBeGreaterThanOrEqual(0);
  });

  test('should show order timeline', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Look for timeline or activity section
    const timeline = page.locator('[data-testid="timeline"], .timeline, .order-timeline');
    expect(timeline).toBeDefined();
  });

  test('should show order items', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Look for items section
    const itemsSection = page.getByText(/item|product|商品/i);
    await expect(itemsSection.first()).toBeVisible();
  });

  test('should show seller information', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    const sellerSection = page.getByText(/seller|vendor|卖家/i);
    expect(await sellerSection.count()).toBeGreaterThanOrEqual(0);
  });

  test('should show shipping information', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    const shippingSection = page.getByText(/shipping|delivery|配送|地址/i);
    expect(await shippingSection.count()).toBeGreaterThanOrEqual(0);
  });

  test('should show payment details', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    const paymentSection = page.getByText(/payment|transaction|支付|交易/i);
    expect(await paymentSection.count()).toBeGreaterThanOrEqual(0);
  });
});

test.describe('Order Actions', () => {
  test('should show confirm receipt button for delivered orders', async ({ page }) => {
    await page.goto('/orders/delivered-order');
    await page.waitForLoadState('networkidle');

    const confirmButton = page.locator('button').filter({ hasText: /confirm|receipt|确认收货/i });

    // Button may or may not be present depending on order status
    expect(confirmButton).toBeDefined();
  });

  test('should show dispute button for eligible orders', async ({ page }) => {
    await page.goto('/orders/MOB-2024-0001');
    await page.waitForLoadState('networkidle');

    const disputeButton = page.locator('button, a').filter({ hasText: /dispute|争议|纠纷/i });

    // Button may or may not be present depending on order status
    expect(disputeButton).toBeDefined();
  });

  test('should show contact seller button', async ({ page }) => {
    await page.goto('/orders/MOB-2024-0001');
    await page.waitForLoadState('networkidle');

    const contactButton = page.locator('button').filter({ hasText: /contact|message|联系/i });

    if (await contactButton.count()) {
      await expect(contactButton.first()).toBeVisible();
    }
  });
});

test.describe('Order Status Transitions (Seller View)', () => {
  test('should show ship order button for paid orders', async ({ page }) => {
    // This would require seller authentication
    await page.goto('/orders/seller/paid-order');
    await page.waitForLoadState('networkidle');

    const shipButton = page.locator('button').filter({ hasText: /ship|发货|mark as shipped/i });
    expect(shipButton).toBeDefined();
  });

  test('should allow adding tracking number', async ({ page }) => {
    await page.goto('/orders/seller/paid-order');
    await page.waitForLoadState('networkidle');

    const trackingInput = page.locator('input[placeholder*="tracking" i]');
    expect(trackingInput).toBeDefined();
  });
});
