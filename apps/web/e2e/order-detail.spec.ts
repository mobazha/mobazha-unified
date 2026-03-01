/**
 * Order Detail Page E2E Tests
 * 订单详情页端到端测试 — 验证 Desktop/Mobile 全页面视图的 card 组件渲染
 *
 * 使用 mock API 数据（mockOrderDetailAPI），不依赖后端
 */

import { test, expect, type Page } from '@playwright/test';
import { loginAndSetup } from './fixtures/auth';
import { mockOrderDetailAPI, mockOrdersAPI } from './fixtures/mock-api-routes';

const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD || '';

async function setupOrderDetailPage(page: Page): Promise<void> {
  await loginAndSetup(page);
  await mockOrderDetailAPI(page);
  await mockOrdersAPI(page);
  await page.goto('/orders/QmOrder001?type=purchase');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);
}

test.beforeEach(async () => {
  test.skip(!TEST_PASSWORD, 'E2E_TEST_PASSWORD env var not set');
});

test.describe('Order Detail — Full Page Navigation', () => {
  test('navigates from order list to full-page detail (no modal)', async ({ page }) => {
    await loginAndSetup(page);
    await mockOrdersAPI(page);
    await mockOrderDetailAPI(page);
    await page.goto('/orders');
    await page.waitForLoadState('networkidle');

    const orderRow = page
      .locator('a[href*="/orders/"], tr[data-order-id], [data-testid="order-row"]')
      .first();
    const hasOrders = await orderRow.isVisible().catch(() => false);

    if (hasOrders) {
      await orderRow.click();
      await page.waitForLoadState('networkidle');

      expect(page.url()).toMatch(/\/orders\/\w+/);

      const modal = page.locator('[role="dialog"][data-state="open"]');
      expect(await modal.count()).toBe(0);
    }
  });
});

test.describe('Order Detail — Product Card', () => {
  test('displays product title', async ({ page }) => {
    await setupOrderDetailPage(page);

    const productTitle = page.getByText('Wireless Noise-Cancelling Headphones');
    await expect(productTitle.first()).toBeVisible();
  });
});

test.describe('Order Detail — Shipping Card', () => {
  test('displays shipping address for physical goods', async ({ page }) => {
    await setupOrderDetailPage(page);

    const address = page.getByText(/San Francisco/i);
    await expect(address.first()).toBeVisible();
  });
});

test.describe('Order Detail — Payment Card', () => {
  test('displays payment coin', async ({ page }) => {
    await setupOrderDetailPage(page);

    const ethLabel = page.getByText(/ETH/);
    await expect(ethLabel.first()).toBeVisible();
  });
});

test.describe('Order Detail — Timeline Card', () => {
  test('displays fulfillment info for fulfilled order', async ({ page }) => {
    await setupOrderDetailPage(page);

    const trackingOrFulfilled = page.getByText(/FedEx|FX1234567890|fulfilled|shipped/i);
    await expect(trackingOrFulfilled.first()).toBeVisible();
  });
});

test.describe('Order Detail — Memo Card', () => {
  test('displays buyer memo when present', async ({ page }) => {
    await setupOrderDetailPage(page);

    const memo = page.getByText(/Please ship ASAP/i);
    await expect(memo.first()).toBeVisible();
  });
});

test.describe('Order Detail — Counterparty', () => {
  test('displays vendor or buyer name', async ({ page }) => {
    await setupOrderDetailPage(page);

    const counterpartyName = page.getByText(/TechStore|CryptoBuyer/);
    await expect(counterpartyName.first()).toBeVisible();
  });
});

test.describe('Order Detail — Status', () => {
  test('displays order status indicator', async ({ page }) => {
    await setupOrderDetailPage(page);

    const statusText = page.getByText(/fulfilled|shipped|completed|processing|paid/i);
    await expect(statusText.first()).toBeVisible();
  });
});
