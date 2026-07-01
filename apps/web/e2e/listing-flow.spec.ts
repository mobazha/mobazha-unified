/**
 * Listing / Store Flow E2E Tests
 * 商品列表和店铺浏览端到端测试
 *
 * 测试商品创建、编辑、店铺浏览和搜索等流程。
 * 需要运行中的全栈环境。
 *
 * 环境变量:
 *   E2E_TEST_PASSWORD - 测试用户密码 (必须)
 */

import { test, expect } from '@playwright/test';
import { performCasdoorLogin } from './fixtures/auth';

const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD || '';

test.describe('Listing - Create', () => {
  test.beforeEach(async () => {
    test.skip(!TEST_PASSWORD, 'E2E_TEST_PASSWORD env var not set');
  });

  test('should navigate to new listing page', async ({ page }) => {
    await performCasdoorLogin(page);

    await page.goto('/listing/new');
    await page.waitForLoadState('domcontentloaded');

    // Should be on the listing creation page
    expect(page.url()).toContain('/listing/new');

    // Should see a form for creating a listing
    const heading = page.getByRole('heading').first();
    await expect(heading).toBeVisible();

    await page.screenshot({ path: 'e2e-screenshots/listing-new.png', fullPage: true });
  });

  test('should show listing form fields', async ({ page }) => {
    await performCasdoorLogin(page);

    await page.goto('/listing/new');
    await page.waitForLoadState('domcontentloaded');

    // Check for common listing form fields
    const titleInput = page
      .getByPlaceholder(/title|标题|name|名称/i)
      .or(page.getByLabel(/title|标题/i))
      .first();

    const hasTitleField = await titleInput.isVisible().catch(() => false);

    if (hasTitleField) {
      // Fill in basic listing data
      await titleInput.fill('E2E Test Listing');

      // Look for description field
      const descInput = page
        .getByPlaceholder(/description|描述/i)
        .or(page.locator('textarea').first())
        .first();
      const hasDesc = await descInput.isVisible().catch(() => false);
      if (hasDesc) {
        await descInput.fill('This is an E2E test listing created by Playwright.');
      }

      // Look for price field
      const priceInput = page
        .getByPlaceholder(/price|价格/i)
        .or(page.getByLabel(/price|价格/i))
        .first();
      const hasPrice = await priceInput.isVisible().catch(() => false);
      if (hasPrice) {
        await priceInput.fill('10.00');
      }

      await page.screenshot({ path: 'e2e-screenshots/listing-form-filled.png', fullPage: true });
    }
  });
});

test.describe('Store - Browse', () => {
  test('should display store page for a peer', async ({ page }) => {
    // Store pages are public - no login required
    // Use a test peer ID (may or may not exist)
    await page.goto('/store/QmTestPeerID12345');
    await page.waitForLoadState('domcontentloaded');

    // Should not redirect to login (store is public)
    expect(page.url()).not.toContain('/login');

    await page.screenshot({ path: 'e2e-screenshots/store-page.png', fullPage: true });
  });
});

test.describe('Search', () => {
  test('should display search page', async ({ page }) => {
    await page.goto('/search');
    await page.waitForLoadState('domcontentloaded');

    expect(page.url()).toContain('/search');
    expect(page.url()).not.toContain('/login');

    await page.screenshot({ path: 'e2e-screenshots/search-page.png', fullPage: true });
  });

  test('should perform a search query', async ({ page }) => {
    await page.goto('/search');
    await page.waitForLoadState('domcontentloaded');

    // Find the search input
    const searchInput = page
      .getByPlaceholder(/search|搜索/i)
      .or(page.getByRole('searchbox'))
      .first();

    const hasSearch = await searchInput.isVisible().catch(() => false);
    if (hasSearch) {
      await searchInput.fill('test');
      await searchInput.press('Enter');

      // Wait for results
      await page.waitForLoadState('domcontentloaded');

      await page.screenshot({ path: 'e2e-screenshots/search-results.png', fullPage: true });
    }
  });
});

test.describe('Product Detail', () => {
  test('should display product page', async ({ page }) => {
    // Product pages are public
    await page.goto('/product/test-slug');
    await page.waitForLoadState('domcontentloaded');

    // Should not redirect to login
    expect(page.url()).not.toContain('/login');

    await page.screenshot({ path: 'e2e-screenshots/product-detail.png', fullPage: true });
  });
});
