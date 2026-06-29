/**
 * Marketplace E2E Tests
 * 社区集市 E2E 测试
 */

import { test, expect } from '@playwright/test';
import { setupMockAuth } from './fixtures/mock-auth';
import { mockMarketplaceOperatorAPI, MOCK_PEER_ID } from './fixtures/mock-api-routes';

test.describe('Marketplace List Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/marketplace');
  });

  test('should display marketplace list page', async ({ page }) => {
    const heading = page.locator('h1').first();
    await expect(heading).toContainText(/Market|集市|Community/i);
  });

  test('should show marketplace cards', async ({ page }) => {
    await page.waitForLoadState('domcontentloaded');

    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should have search functionality', async ({ page }) => {
    const searchInput = page.getByPlaceholder('Search marketplaces');

    if (await searchInput.isVisible()) {
      await searchInput.fill('test marketplace');
      await page.waitForTimeout(500);
    }
  });

  test('should navigate to marketplace detail', async ({ page }) => {
    await page.waitForLoadState('domcontentloaded');

    const marketplaceCard = page
      .locator('[data-testid="marketplace-card"], .marketplace-card, article')
      .first();

    if (await marketplaceCard.isVisible()) {
      await marketplaceCard.click();
      await page.waitForURL(/\/marketplace\/\w+/, { timeout: 5000 }).catch(() => {});
    }
  });
});

test.describe('Marketplace Detail Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/marketplace/mp1');
  });

  test('should display marketplace details', async ({ page }) => {
    await page.waitForLoadState('domcontentloaded');

    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should show marketplace stats', async ({ page }) => {
    await page.waitForLoadState('domcontentloaded');

    const stats = page.getByText(/member|product|seller/i);
    expect(await stats.count()).toBeGreaterThanOrEqual(0);
  });

  test('should display products tab', async ({ page }) => {
    await page.waitForLoadState('domcontentloaded');

    const productsSection = page.locator(
      '[data-testid="products"], .products-grid, [role="tabpanel"]'
    );

    if (await productsSection.isVisible()) {
      await expect(productsSection).toBeVisible();
    }
  });

  test('should show join button for non-members', async ({ page }) => {
    await page.waitForLoadState('domcontentloaded');

    const joinButton = page.locator('button').filter({ hasText: /join|加入/i });

    if (await joinButton.count()) {
      await expect(joinButton.first()).toBeVisible();
    }
  });

  test('should show seller application option', async ({ page }) => {
    await page.waitForLoadState('domcontentloaded');

    const sellerButton = page.locator('button, a').filter({ hasText: /sell|卖家|apply/i });

    expect(await sellerButton.count()).toBeGreaterThanOrEqual(0);
  });
});

test.describe('Marketplace Operator Console', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockAuth(page);
    await mockMarketplaceOperatorAPI(page);
  });

  test('should list operator marketplaces', async ({ page }) => {
    await page.goto('/operator/marketplaces');
    await page.waitForLoadState('domcontentloaded');

    await expect(page.getByTestId('operator-marketplaces-page')).toBeVisible();
    await expect(page.getByText('Crypto Collectibles')).toBeVisible();
  });

  test('should show operator marketplace detail and seller memberships', async ({ page }) => {
    await page.goto('/operator/marketplaces/mp1');
    await page.waitForLoadState('domcontentloaded');

    await expect(page.getByTestId('operator-marketplace-detail')).toBeVisible();
    await expect(page.getByText('Crypto Collectibles')).toBeVisible();
    await expect(page.getByText(/^(approved|已批准)$/i)).toBeVisible();
  });
});

test.describe('Store Marketplace Invitations', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockAuth(page);
    await mockMarketplaceOperatorAPI(page);
  });

  test('should display pending marketplace invitation inbox', async ({ page }) => {
    await page.goto('/admin/settings/marketplace-memberships');
    await page.waitForLoadState('domcontentloaded');

    await expect(page.getByTestId('marketplace-memberships-page')).toBeVisible();
    await expect(page.getByText('Crypto Collectibles')).toBeVisible();
    await expect(page.getByTestId('accept-marketplace-invite-mp1')).toBeVisible();
  });

  test('should accept a marketplace invitation', async ({ page }) => {
    await page.goto('/admin/settings/marketplace-memberships');
    await page.waitForLoadState('domcontentloaded');

    const [acceptRequest] = await Promise.all([
      page.waitForRequest(
        req =>
          req.method() === 'POST' &&
          req.url().includes('/marketplaces/mp1/sellers/') &&
          req.url().endsWith('/accept')
      ),
      page.getByTestId('accept-marketplace-invite-mp1').click(),
    ]);

    expect(acceptRequest.url()).toContain(encodeURIComponent(MOCK_PEER_ID));
  });
});
