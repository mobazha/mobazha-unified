/**
 * Purchase Service Listing E2E Test
 * 买家查看和购买服务商品的端到端测试
 *
 * 前置条件: 需要先运行 create-service-listing.spec.ts 创建商品
 *
 * 流程:
 * 1. 通过 API 获取卖家 peerID
 * 2. 以卖家身份登录浏览器，通过拦截 API 响应获取商品 slug
 * 3. 以买家身份登录新浏览器上下文
 * 4. 导航到卖家商品详情页，验证商品信息
 * 5. 点击 Buy Now → Checkout → Place Order
 * 6. 验证跳转到 Payment 页面
 *
 * 注意: checkout-submit-btn 仅在 sm(640px) 及以上宽度可见，
 *       因此此测试仅适用于 Desktop 项目。
 */

import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import { performCasdoorLogin, getPeerID } from './fixtures/auth';

const SELLER_USERNAME = process.env.E2E_SELLER_USERNAME || 'testuser1';
const BUYER_USERNAME = process.env.E2E_BUYER_USERNAME || 'testuser2';
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD || '123';

test.describe('Purchase Service Listing', () => {
  test.setTimeout(300_000);

  test('buyer views and purchases a service listing from another user', async ({
    browser,
    request,
  }) => {
    test.skip(!process.env.E2E_TEST_PASSWORD && !TEST_PASSWORD, 'E2E test password not configured');

    // ══════════════════════════════════════════════════════
    // Phase 1: Get seller's peerID via API
    // ══════════════════════════════════════════════════════
    console.log('Phase 1: Get seller peerID');

    const sellerPeerID = await getPeerID(request, SELLER_USERNAME, TEST_PASSWORD);
    console.log('Seller peerID:', sellerPeerID);

    // ══════════════════════════════════════════════════════
    // Phase 2: Login as seller to discover listing slug
    // ══════════════════════════════════════════════════════
    console.log('Phase 2: Login as seller to find listing slug');

    let listingSlug = '';
    const sellerContext: BrowserContext = await browser.newContext();
    try {
      const sellerPage: Page = await sellerContext.newPage();
      sellerPage.on('console', msg => {
        if (msg.type() === 'error') {
          console.log(`[seller:${msg.type()}] ${msg.text().substring(0, 150)}`);
        }
      });

      await performCasdoorLogin(sellerPage, SELLER_USERNAME, TEST_PASSWORD);
      console.log('Seller logged in, URL:', sellerPage.url());

      // Set up response interception BEFORE navigation to capture listing index
      const listingIndexPromise = sellerPage
        .waitForResponse(resp => resp.url().includes('/listings/index') && resp.status() === 200, {
          timeout: 30000,
        })
        .catch(() => null);

      await sellerPage.goto('/listing/new');
      await sellerPage.waitForLoadState('networkidle');

      const listingIndexResp = await listingIndexPromise;
      if (listingIndexResp) {
        try {
          const listings = await listingIndexResp.json();
          if (Array.isArray(listings) && listings.length > 0) {
            const serviceListing = listings.find(
              (l: { title?: string; contractType?: string }) =>
                l.title?.includes('E2E Test Service') || l.contractType === 'SERVICE'
            );
            listingSlug = serviceListing?.slug || listings[0].slug;
            console.log('Found listing slug from API intercept:', listingSlug);
          }
        } catch {
          console.log('Could not parse listing index response');
        }
      }

      // Fallback: scan page for product links
      if (!listingSlug) {
        console.log('API intercept missed; scanning page for product links...');
        const productLinks = await sellerPage.locator('a[href*="/product/"]').all();
        for (const link of productLinks) {
          const href = await link.getAttribute('href');
          if (href) {
            const match = href.match(/\/product\/([^?]+)/);
            if (match) {
              listingSlug = match[1];
              console.log('Found listing slug from page link:', listingSlug);
              break;
            }
          }
        }
      }
    } finally {
      await sellerContext.close();
    }

    expect(
      listingSlug,
      'Listing slug must be discovered. Run create-service-listing.spec.ts first.'
    ).toBeTruthy();
    console.log('Phase 2 done. Slug:', listingSlug, 'PeerID:', sellerPeerID);

    // ══════════════════════════════════════════════════════
    // Phase 3: Login as buyer (testuser2)
    // ══════════════════════════════════════════════════════
    console.log('Phase 3: Login as buyer:', BUYER_USERNAME);

    const buyerContext: BrowserContext = await browser.newContext();
    try {
      const page: Page = await buyerContext.newPage();
      page.on('console', msg => {
        if (msg.type() === 'error' || msg.type() === 'log') {
          console.log(`[buyer:${msg.type()}] ${msg.text().substring(0, 150)}`);
        }
      });

      await performCasdoorLogin(page, BUYER_USERNAME, TEST_PASSWORD);
      console.log('Buyer logged in, URL:', page.url());

      // ══════════════════════════════════════════════════════
      // Phase 4: Navigate to the seller's product page
      // ══════════════════════════════════════════════════════
      console.log('Phase 4: Navigate to product page');

      const productUrl = `/product/${listingSlug}?peerID=${sellerPeerID}`;
      console.log('Product URL:', productUrl);
      await page.goto(productUrl);
      await page.waitForLoadState('networkidle');

      const productDetail = page.getByTestId('product-detail');
      await expect(productDetail).toBeVisible({ timeout: 60000 });
      console.log('Product detail visible');

      await page.screenshot({ path: 'e2e-screenshots/buyer-product-page.png', fullPage: true });

      const productTitle = productDetail.locator('h1').first();
      await expect(productTitle).toBeVisible({ timeout: 10000 });
      const titleText = await productTitle.textContent();
      console.log('Product title:', titleText);

      const buyNowBtn = page.getByTestId('product-detail-buy-now');
      await expect(buyNowBtn).toBeVisible({ timeout: 10000 });
      await expect(buyNowBtn).toBeEnabled();
      console.log('Buy Now button is visible and enabled');

      // ══════════════════════════════════════════════════════
      // Phase 5: Click Buy Now → Checkout
      // ══════════════════════════════════════════════════════
      console.log('Phase 5: Click Buy Now');
      await buyNowBtn.click();

      await page.waitForURL(url => url.pathname === '/checkout', { timeout: 30000 });
      await page.waitForLoadState('networkidle');
      console.log('On checkout page, URL:', page.url());

      const checkoutPage = page.getByTestId('checkout-page');
      await expect(checkoutPage).toBeVisible({ timeout: 30000 });

      await page.screenshot({ path: 'e2e-screenshots/buyer-checkout-page.png', fullPage: true });

      const submitBtn = page.getByTestId('checkout-submit-btn');
      await expect(submitBtn).toBeVisible({ timeout: 30000 });

      // SERVICE type: no shipping needed, button should be enabled
      await expect(submitBtn).toBeEnabled({ timeout: 10000 });
      console.log('Checkout form ready, placing order...');

      // ══════════════════════════════════════════════════════
      // Phase 6: Place the order
      // ══════════════════════════════════════════════════════
      console.log('Phase 6: Click Place Order');
      await submitBtn.click();

      await page.waitForURL(url => url.pathname === '/payment' && url.search.includes('orderID'), {
        timeout: 60000,
      });
      console.log('Redirected to payment page, URL:', page.url());

      await page.screenshot({ path: 'e2e-screenshots/buyer-payment-page.png', fullPage: true });

      const paymentUrl = new URL(page.url());
      const orderID = paymentUrl.searchParams.get('orderID');
      expect(orderID).toBeTruthy();
      console.log('Order created! Order ID:', orderID);

      await page.waitForLoadState('networkidle');
      const mainContent = page.locator('main');
      await expect(mainContent).toBeVisible({ timeout: 15000 });

      console.log('SUCCESS: Buyer viewed product, placed order, reached payment page.');
    } finally {
      await buyerContext.close();
    }
  });
});
