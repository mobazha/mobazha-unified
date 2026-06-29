/**
 * Collectible marketplace detail smoke test
 *
 * Mocks a public marketplace with vertical=collectibles and asserts
 * category filters, trust copy, attribution hrefs, and collectibles CTA.
 */

import { test, expect } from '@playwright/test';

function wrapData<T>(data: T): string {
  return JSON.stringify({ data });
}

const LONG_MARKETPLACE_NAME = 'E2E Collectibles Hub 1782612193265177000';
const SELLER_PEER_ID = 'QmSellerE2ECollectibles1';

const mockCollectiblesList = {
  items: [
    {
      nftMint: 'mockpnft63e66626bd4e442e77e0e953d61226dc5512',
      hubSlotID: 'source_9591a58c-4f55-4e57-a151-9b4a0558a238',
      tokenStandard: 'SPL',
      chain: 'solana',
      hubSlot: {
        hubSlotID: 'source_9591a58c-4f55-4e57-a151-9b4a0558a238',
        certNumber: 'M2-WILSON-001',
        serial: 'WILSON-001',
        hubLocation: 'source-custody',
        grade: 'PSA 10',
        status: 'in_circulation',
      },
    },
  ],
  meta: { page: 1, pageSize: 20, total: 1 },
};

const mockListingCatalog = [
  { slug: 'psa-pikachu-vmax', peerID: SELLER_PEER_ID, title: 'PSA 10 Pikachu VMAX', tags: ['pokemon'] },
  { slug: 'topps-trout-chrome', peerID: SELLER_PEER_ID, title: '2020 Topps Chrome Mike Trout', tags: ['baseball', 'sports'] },
  { slug: 'black-lotus-proxy', peerID: SELLER_PEER_ID, title: 'Magic: The Gathering Lotus', tags: ['mtg'] },
  { slug: 'yugioh-dark-magician', peerID: SELLER_PEER_ID, title: 'Yu-Gi-Oh Dark Magician', tags: ['tcg'] },
] as const;

function mockListingResponse(
  slug: string,
  title: string,
  tags: string[],
  productType?: string
) {
  return {
    listing: {
      slug,
      vendorID: { peerID: SELLER_PEER_ID, name: 'E2E Seller' },
      metadata: {
        version: 1,
        contractType: 'PHYSICAL_GOOD',
        format: 'FIXED_PRICE',
        expiry: '',
        acceptedCurrencies: ['BTC'],
        pricingCurrency: { code: 'USD', divisibility: 2 },
        escrowTimeoutHours: 24,
      },
      item: {
        title,
        description: 'E2E collectible listing',
        processingTime: '1 day',
        price: 19900,
        nsfw: false,
        tags,
        productType,
        images: [],
      },
    },
  };
}

const mockCollectibleMarketplaceDetail = {
  marketplace: {
    publicID: 'mp-collectibles-demo',
    slug: 'wilson-cards',
    platform: 'native',
    name: LONG_MARKETPLACE_NAME,
    publicDescription: 'Curated PSA-graded cards with Hub custody.',
    sellerCount: 2,
    productCount: mockListingCatalog.length,
    joinMode: 'open',
    visibility: 'active',
    isFeatured: false,
    sortOrder: 0,
    vertical: 'collectibles',
    updatedAt: new Date().toISOString(),
  },
  sellers: [],
  featured: [],
  banners: [],
  listings: {
    listings: mockListingCatalog.map(({ slug, peerID }) => ({ slug, peerID })),
    total: mockListingCatalog.length,
    page: 1,
    pageSize: 24,
    totalPage: 1,
  },
};

test.describe('Collectible marketplace detail', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/platform/v1/community-marketplaces/public/**', async route => {
      if (route.request().method() !== 'GET') {
        await route.fallback();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: wrapData(mockCollectibleMarketplaceDetail),
      });
    });

    await page.route('**/search/v1/**', async route => {
      if (route.request().method() !== 'GET') {
        await route.fallback();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: wrapData({ results: [] }),
      });
    });

    await page.route(`**/listings/${SELLER_PEER_ID}/**`, async route => {
      if (route.request().method() !== 'GET') {
        await route.fallback();
        return;
      }

      const url = route.request().url();
      const match = mockListingCatalog.find(entry =>
        url.includes(`/listings/${SELLER_PEER_ID}/${entry.slug}`)
      );
      if (!match) {
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: wrapError('NOT_FOUND', 'Listing not found'),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockListingResponse(match.slug, match.title, [...match.tags])),
      });
    });

    await page.route('**/platform/v1/server/info', async route => {
      if (route.request().method() !== 'GET') {
        await route.fallback();
        return;
      }
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: wrapError('UNAUTHORIZED', 'Authentication required'),
      });
    });

    await page.route('**/platform/v1/collectibles/nfts**', async route => {
      if (route.request().method() !== 'GET') {
        await route.fallback();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: wrapData(mockCollectiblesList),
      });
    });
  });

  test('shows collectible journey signal with buyer CTAs and no hub ops link', async ({ page }) => {
    await page.goto('/marketplace/wilson-cards');
    await page.waitForLoadState('domcontentloaded');

    const signal = page.getByTestId('collectible-marketplace-signal');
    await expect(signal).toBeVisible();
    await expect(signal.getByText(/Collectible cards|收藏卡牌/i)).toBeVisible();
    await expect(signal.getByText(/I want to buy|我要买卡/i)).toBeVisible();
    await expect(signal.getByText(/I want to sell|我要卖卡/i)).toBeVisible();

    await expect(
      signal.getByRole('button', { name: /Browse listed cards|浏览在售卡片/i })
    ).toBeVisible();
    await expect(
      signal.getByRole('link', { name: /Apply to sell|申请成为卖家/i })
    ).toHaveAttribute('href', /\/sell$/);
    await expect(signal.getByTestId('collectible-catalog-link')).toHaveAttribute(
      'href',
      '/collectibles'
    );
    await expect(signal.getByTestId('collectible-redemptions-link')).toHaveAttribute(
      'href',
      '/collectibles/redemptions'
    );
    await expect(signal.getByRole('link', { name: /Hub operations|Hub 运营/i })).toHaveCount(0);
  });

  test('shows trust copy for whitelist, disclaimer, custody, and powered by', async ({ page }) => {
    await page.goto('/marketplace/wilson-cards');
    await page.waitForLoadState('domcontentloaded');

    const trust = page.getByTestId('collectible-marketplace-trust');
    await expect(trust).toBeVisible();
    await expect(trust).toContainText(/whitelist|白名单/i);
    await expect(trust).toContainText(/grading or authenticity|评级或真伪/i);
    await expect(trust).toContainText(/source custodian|源托管方/i);
    await expect(trust).toContainText(/Powered by Mobazha/i);
  });

  test('filters enriched listings by collectible category', async ({ page }) => {
    await page.goto('/marketplace/wilson-cards');
    await page.waitForLoadState('networkidle');

    await expect(page.getByTestId('collectible-category-filters')).toBeVisible();
    await expect(page.getByRole('link', { name: /Pikachu VMAX/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Mike Trout/i })).toBeVisible();

    await page.getByTestId('collectible-category-pokemon').click();
    await expect(page.getByRole('link', { name: /Pikachu VMAX/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Mike Trout/i })).toHaveCount(0);

    await page.getByTestId('collectible-category-sports').click();
    await expect(page.getByRole('link', { name: /Mike Trout/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Pikachu VMAX/i })).toHaveCount(0);

    await page.getByTestId('collectible-category-mtg').click();
    await expect(page.getByRole('link', { name: /Magic: The Gathering Lotus/i })).toBeVisible();

    await page.getByTestId('collectible-category-tcg').click();
    await expect(page.getByRole('link', { name: /Dark Magician/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Pikachu VMAX/i })).toHaveCount(0);
  });

  test('shows empty state when category filter has no matches', async ({ page }) => {
    await page.route('**/platform/v1/community-marketplaces/public/**', async route => {
      if (route.request().method() !== 'GET') {
        await route.fallback();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: wrapData({
          ...mockCollectibleMarketplaceDetail,
          listings: {
            listings: [{ slug: 'topps-trout-chrome', peerID: SELLER_PEER_ID }],
            total: 1,
            page: 1,
            pageSize: 24,
            totalPage: 1,
          },
        }),
      });
    });

    await page.goto('/marketplace/wilson-cards');
    await page.waitForLoadState('networkidle');

    await page.getByTestId('collectible-category-pokemon').click();
    await expect(page.getByText(/No cards in this category|该分类暂无卡牌/i)).toBeVisible();
  });

  test('persists attribution params on product hrefs', async ({ page }) => {
    await page.goto(
      '/marketplace/wilson-cards?ref=card-drop&utm_source=newsletter&utm_medium=email&utm_campaign=spring&foo=bar&evil=%3Cscript%3E'
    );
    await page.waitForLoadState('networkidle');

    const productLink = page.getByRole('link', { name: /Pikachu VMAX/i });
    await expect(productLink).toBeVisible();

    const href = await productLink.getAttribute('href');
    expect(href).toContain('ref=card-drop');
    expect(href).toContain('utm_source=newsletter');
    expect(href).toContain('utm_medium=email');
    expect(href).toContain('utm_campaign=spring');
    expect(href).not.toContain('foo=');
    expect(href).not.toContain('evil=');
    expect(href).not.toContain('<script>');
  });

  test('anonymous browse collectibles CTA opens public catalog without login redirect', async ({
    page,
  }) => {
    await page.goto('/marketplace/wilson-cards');
    await page.waitForLoadState('domcontentloaded');

    const signal = page.getByTestId('collectible-marketplace-signal');
    await expect(signal).toBeVisible();

    const collectiblesLink = signal.getByTestId('collectible-catalog-link');
    await collectiblesLink.click();

    await expect(page).toHaveURL(/\/collectibles\/?$/);
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.getByTestId('collectibles-feature-disabled')).toHaveCount(0);
    await expect(
      page.getByRole('heading', { level: 1, name: /Hosted cards catalog|已托管卡片目录/i })
    ).toBeVisible();
    await expect(page.getByTestId('collectibles-catalog-grid')).toBeVisible();
    await expect(
      page.getByRole('link', { name: /View custody proof|查看托管凭证/i })
    ).toBeVisible();
    await expect(page.getByRole('link', { name: /Hub operations|Hub 运营/i })).toHaveCount(0);
  });

  test('mobile hero wraps long marketplace name without horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/marketplace/wilson-cards');
    await page.waitForLoadState('domcontentloaded');

    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(hasHorizontalOverflow).toBe(false);

    const heroTitle = page.getByRole('heading', { level: 1, name: LONG_MARKETPLACE_NAME });
    await expect(heroTitle).toBeVisible();
  });
});

function wrapError(code: string, message: string): string {
  return JSON.stringify({ error: { code, message } });
}
