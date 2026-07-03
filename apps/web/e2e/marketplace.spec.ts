/**
 * Marketplace E2E Tests
 * 社区集市 E2E 测试
 */

import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { setupMockAuth } from './fixtures/mock-auth';
import { mockMarketplaceOperatorAPI, MOCK_PEER_ID } from './fixtures/mock-api-routes';

const NOW = new Date().toISOString();

const PUBLIC_MARKETPLACE = {
  id: 'mp1',
  name: 'Crypto Collectibles',
  slug: 'mp1',
  description: 'Curated collectibles marketplace',
  logoURL: '',
  bannerURL: '',
  publicURL: '',
  buyerAccessMode: 'open',
  sellerReviewMode: 'manual',
  catalogMode: 'curated',
  discoverability: 'public',
  sellerEntryMode: 'seller_self_serve',
  vertical: 'collectibles',
  sellerCount: 1,
  productCount: 2,
  updatedAt: NOW,
};

function wrapData<T>(data: T): string {
  return JSON.stringify({ data });
}

async function mockPublicMarketplacePages(page: Page) {
  await page.route('**/platform/v1/public-marketplaces/mp1**', route => {
    if (route.request().method() !== 'GET') return route.fallback();
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: wrapData({
        marketplace: PUBLIC_MARKETPLACE,
        sellers: [{ peerID: MOCK_PEER_ID, productGroups: [], updatedAt: NOW }],
        featured: [],
        banners: [],
        listings: { listings: [], total: 0, page: 1, pageSize: 24, totalPage: 0 },
      }),
    });
  });

  await page.route('**/platform/v1/public-marketplaces**', route => {
    if (route.request().method() !== 'GET') return route.fallback();
    if (route.request().url().includes('/platform/v1/public-marketplaces/')) {
      return route.fallback();
    }
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: wrapData({
        marketplaces: [PUBLIC_MARKETPLACE],
        total: 1,
        page: 1,
        pageSize: 100,
        totalPage: 1,
      }),
    });
  });
}

test.describe('Marketplace List Page', () => {
  test.beforeEach(async ({ page }) => {
    await mockPublicMarketplacePages(page);
    await page.goto('/marketplace');
  });

  test('should display marketplace list page', async ({ page }) => {
    const heading = page.locator('h1').first();
    await expect(heading).toContainText(/Market|集市|Community/i);
  });

  test('should show marketplace cards', async ({ page }) => {
    await page.waitForLoadState('domcontentloaded');
    await expect(page.getByRole('link', { name: 'Crypto Collectibles' })).toBeVisible();
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
    await page.getByRole('link', { name: 'Crypto Collectibles' }).click();
    await expect(page).toHaveURL(/\/marketplace\/mp1$/);
    await expect(page.getByRole('heading', { name: 'Crypto Collectibles' })).toBeVisible();
  });
});

test.describe('Marketplace Detail Page', () => {
  test.beforeEach(async ({ page }) => {
    await mockPublicMarketplacePages(page);
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
    await expect(stats.first()).toBeVisible();
  });

  test('should display products tab', async ({ page }) => {
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('#collectible-marketplace-listings')).toBeVisible();
  });

  test('should show join button for non-members', async ({ page }) => {
    await page.waitForLoadState('domcontentloaded');
    await expect(page.getByTestId('marketplace-apply-to-sell')).toBeVisible();
  });

  test('should show seller application option', async ({ page }) => {
    await page.waitForLoadState('domcontentloaded');

    const sellerButton = page.locator('button, a').filter({ hasText: /sell|卖家|apply/i });

    await expect(sellerButton.first()).toBeVisible();
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
    await expect(
      page
        .getByTestId('operator-membership-row')
        .filter({ has: page.getByText(/^(approved|已批准)$/i) })
    ).toBeVisible();
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
