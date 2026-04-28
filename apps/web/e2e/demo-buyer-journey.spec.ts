/**
 * Buyer Journey — 19-step narrative screenshot capture for AI UX audit.
 *
 * Captures the complete buyer experience from discovery to post-purchase.
 * Each step captures mobile + desktop viewports.
 *
 * Run: PLAYWRIGHT_BROWSERS_PATH="$HOME/Library/Caches/ms-playwright" \
 *      npx playwright test demo-buyer-journey --project=chromium
 */

import { test, type Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { setupMockAuth } from './fixtures/mock-auth';
import {
  mockNotificationsAPI,
  mockSearchAPI,
  mockStoreListingsAPI,
  mockProductDetailAPI,
  mockImageRoutes,
  mockPreferencesAPI,
  mockFiatProvidersAPI,
  getCartLocalStorageScript,
} from './fixtures/mock-api-routes';
import {
  mockFullLifecycleAPIs,
  mockOrderDetailByState,
  mockReviewsAPI,
  mockWalletAPI,
} from './fixtures/mock-order-lifecycle';

// ─── Config ─────────────────────────────────────────────────────────

const VIEWPORTS = {
  mobile: { width: 390, height: 844 },
  desktop: { width: 1280, height: 800 },
};

const OUTPUT_DIR = path.join(__dirname, 'demo-output', 'buyer');

interface StepMeta {
  id: string;
  title: string;
  description: string;
  phase: string;
  reviewFocus: string;
}

const STEPS: StepMeta[] = [
  // Discovery
  {
    id: '01-homepage',
    title: 'Homepage',
    description: 'Homepage as an unauthenticated visitor.',
    phase: 'Discovery',
    reviewFocus: 'First impression, content richness, call-to-action guidance.',
  },
  {
    id: '02-search',
    title: 'Search Results',
    description: 'Search results after entering a keyword.',
    phase: 'Discovery',
    reviewFocus: 'Search experience, result relevance, filter options.',
  },
  {
    id: '03-marketplace',
    title: 'Marketplace',
    description: 'Marketplace / category browsing.',
    phase: 'Discovery',
    reviewFocus: 'Product discovery path diversity, category navigation.',
  },
  {
    id: '04-collection',
    title: 'Collection Page',
    description: 'Curated collection page.',
    phase: 'Discovery',
    reviewFocus: 'Curation quality, product card appeal.',
  },
  {
    id: '05-store-page',
    title: 'Store Page',
    description: 'Full branded storefront.',
    phase: 'Discovery',
    reviewFocus: 'Brand impact, professional feel, trust building.',
  },
  // Evaluation
  {
    id: '06-product-detail',
    title: 'Product Detail',
    description: 'Product detail with image carousel, description, variants, add-to-cart.',
    phase: 'Evaluation',
    reviewFocus: 'Information completeness, image quality, variant interaction.',
  },
  {
    id: '07-reviews',
    title: 'Reviews',
    description: 'Product review section (5 mock reviews + average).',
    phase: 'Evaluation',
    reviewFocus: 'Trust building, review credibility, rating display.',
  },
  {
    id: '08-wishlist',
    title: 'Wishlist',
    description: 'Wishlist / saved items page.',
    phase: 'Evaluation',
    reviewFocus: 'Favorite interaction feedback, list utility, mobile heart visibility.',
  },
  // Purchase
  {
    id: '09-cart',
    title: 'Shopping Cart',
    description: 'Cart with items + empty state.',
    phase: 'Purchase',
    reviewFocus: 'Product info display, quantity editing, delete action, empty state guidance.',
  },
  {
    id: '10-checkout-address',
    title: 'Checkout — Address',
    description: 'Checkout address selection / new address modal.',
    phase: 'Purchase',
    reviewFocus: 'Address form length, autocomplete, mobile keyboard.',
  },
  {
    id: '11-checkout-discount',
    title: 'Checkout — Discount',
    description: 'Discount code input + auto-discount application.',
    phase: 'Purchase',
    reviewFocus: 'Discount interaction feedback, amount calculation clarity.',
  },
  {
    id: '12-payment-method',
    title: 'Payment Method',
    description: 'Crypto + Fiat payment selection.',
    phase: 'Purchase',
    reviewFocus: 'Payment trust, option clarity, Stripe/PayPal branding.',
  },
  {
    id: '13-confirmation',
    title: 'Order Confirmation',
    description: 'Order confirmation page.',
    phase: 'Purchase',
    reviewFocus: 'Success feeling, order summary, next step guidance.',
  },
  // Post-purchase
  {
    id: '14-orders-list',
    title: 'Orders List',
    description: 'Order list with all states.',
    phase: 'Post-purchase',
    reviewFocus: 'Status differentiation, timeline, action discoverability.',
  },
  {
    id: '15-order-tracking',
    title: 'Order Tracking',
    description: 'Order detail with FedEx tracking.',
    phase: 'Post-purchase',
    reviewFocus: '"Where is my stuff" anxiety relief, tracking info clarity.',
  },
  {
    id: '16-confirm-receipt',
    title: 'Confirm Receipt',
    description: 'SHIPPED order → confirm receipt interaction.',
    phase: 'Post-purchase',
    reviewFocus: 'Transaction closure feeling, pre-confirm safety prompt.',
  },
  {
    id: '17-dispute',
    title: 'Dispute / Refund',
    description: 'DISPUTED + REFUNDED order views.',
    phase: 'Post-purchase',
    reviewFocus: 'After-sales protection feeling, dispute transparency, refund info.',
  },
  // Account
  {
    id: '18-notifications',
    title: 'Notifications',
    description: 'Notification center (order + social events).',
    phase: 'Account',
    reviewFocus: 'Notification timeliness, categorization, jump paths.',
  },
  {
    id: '19-wallet',
    title: 'Wallet',
    description: 'Wallet page (balance + transactions).',
    phase: 'Account',
    reviewFocus: 'Fund transparency, transaction categorization, action entries.',
  },
];

// ─── Helpers ────────────────────────────────────────────────────────

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function captureStep(page: Page, stepId: string) {
  for (const [name, viewport] of Object.entries(VIEWPORTS)) {
    const dir = path.join(OUTPUT_DIR, name);
    ensureDir(dir);
    await page.setViewportSize(viewport);
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(dir, `${stepId}.png`),
      fullPage: true,
    });
  }
}

// ─── Test Suite ─────────────────────────────────────────────────────

test.describe.configure({ mode: 'serial' });

test.describe('Buyer Journey — 19-step AI UX Audit', () => {
  test.setTimeout(180_000);

  // ── Discovery ──

  test('B01 — Homepage', async ({ page }) => {
    await mockSearchAPI(page);
    await mockImageRoutes(page);
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    await captureStep(page, '01-homepage');
  });

  test('B02 — Search Results', async ({ page }) => {
    await mockSearchAPI(page);
    await mockImageRoutes(page);
    await page.goto('/search?q=headphones');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    await captureStep(page, '02-search');
  });

  test('B03 — Marketplace', async ({ page }) => {
    await mockSearchAPI(page);
    await mockImageRoutes(page);
    await page.goto('/search?category=Electronics');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    await captureStep(page, '03-marketplace');
  });

  test('B04 — Collection Page', async ({ page }) => {
    await mockStoreListingsAPI(page);
    await mockImageRoutes(page);
    await page.goto('/search?collection=featured');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    await captureStep(page, '04-collection');
  });

  test('B05 — Store Page', async ({ page }) => {
    await mockStoreListingsAPI(page);
    await mockImageRoutes(page);
    const MOCK_PEER_ID = 'QmY8tRnCzUf45FnPLMvFi35R5bYjCEiCKbgEN39xnScj8P';
    await page.route('**/search/v1/profiles/raw/**', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            peerID: MOCK_PEER_ID,
            name: 'TechStore Premium',
            handle: 'techstore',
            location: 'San Francisco, CA',
            avatarHashes: {
              tiny: `https://picsum.photos/id/64/300/300`,
              small: `https://picsum.photos/id/64/300/300`,
              medium: `https://picsum.photos/id/64/300/300`,
            },
            about: 'Premium electronics and handcrafted goods.',
            stats: {
              followerCount: 128,
              followingCount: 24,
              listingCount: 7,
              ratingCount: 89,
              averageRating: 4.8,
            },
          },
        }),
      });
    });
    await page.goto(`/store/${MOCK_PEER_ID}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    await page.waitForTimeout(1000);
    await captureStep(page, '05-store-page');
  });

  // ── Evaluation ──

  test('B06 — Product Detail', async ({ page }) => {
    await mockProductDetailAPI(page);
    await mockImageRoutes(page);
    await mockReviewsAPI(page);
    await page.goto('/product/wireless-headphones');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    await page.waitForTimeout(1000);
    await captureStep(page, '06-product-detail');
  });

  test('B07 — Reviews', async ({ page }) => {
    await mockProductDetailAPI(page);
    await mockImageRoutes(page);
    await mockReviewsAPI(page);
    await page.goto('/product/wireless-headphones#reviews');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    await page.waitForTimeout(1000);
    await captureStep(page, '07-reviews');
  });

  test('B08 — Wishlist', async ({ page }) => {
    await setupMockAuth(page);
    await mockImageRoutes(page);
    await page.goto('/wishlist');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    await captureStep(page, '08-wishlist');
  });

  // ── Purchase ──

  test('B09 — Shopping Cart', async ({ page }) => {
    await mockProductDetailAPI(page);
    await mockImageRoutes(page);
    await page.addInitScript(getCartLocalStorageScript());
    await page.goto('/cart');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    await captureStep(page, '09-cart');
  });

  test('B10 — Checkout Address', async ({ page }) => {
    await setupMockAuth(page);
    await mockProductDetailAPI(page);
    await mockPreferencesAPI(page);
    await mockImageRoutes(page);
    await page.addInitScript(getCartLocalStorageScript());
    const MOCK_PEER_ID = 'QmY8tRnCzUf45FnPLMvFi35R5bYjCEiCKbgEN39xnScj8P';
    await page.goto(`/checkout?vendorPeerID=${MOCK_PEER_ID}&slugs=wireless-headphones,usb-c-cable`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    await page.waitForTimeout(1000);
    await captureStep(page, '10-checkout-address');
  });

  test('B11 — Checkout Discount', async ({ page }) => {
    await setupMockAuth(page);
    await mockProductDetailAPI(page);
    await mockPreferencesAPI(page);
    await mockImageRoutes(page);
    await page.addInitScript(getCartLocalStorageScript());
    const MOCK_PEER_ID = 'QmY8tRnCzUf45FnPLMvFi35R5bYjCEiCKbgEN39xnScj8P';
    await page.goto(`/checkout?vendorPeerID=${MOCK_PEER_ID}&slugs=wireless-headphones,usb-c-cable`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    await page.waitForTimeout(1000);
    await captureStep(page, '11-checkout-discount');
  });

  test('B12 — Payment Method', async ({ page }) => {
    await setupMockAuth(page);
    await mockProductDetailAPI(page);
    await mockPreferencesAPI(page);
    await mockFiatProvidersAPI(page);
    await mockImageRoutes(page);
    await page.addInitScript(getCartLocalStorageScript());
    const MOCK_PEER_ID = 'QmY8tRnCzUf45FnPLMvFi35R5bYjCEiCKbgEN39xnScj8P';
    await page.goto(
      `/checkout/payment-method?vendorPeerID=${MOCK_PEER_ID}&slugs=wireless-headphones,usb-c-cable`
    );
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    await captureStep(page, '12-payment-method');
  });

  test('B13 — Order Confirmation', async ({ page }) => {
    await setupMockAuth(page);
    await mockImageRoutes(page);
    await page.goto('/checkout/confirmation?orderId=QmComplete001');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    await captureStep(page, '13-confirmation');
  });

  // ── Post-purchase ──

  test('B14 — Orders List', async ({ page }) => {
    await setupMockAuth(page);
    await mockFullLifecycleAPIs(page);
    await mockImageRoutes(page);
    await page.goto('/orders');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    await captureStep(page, '14-orders-list');
  });

  test('B15 — Order Tracking', async ({ page }) => {
    await setupMockAuth(page);
    await mockOrderDetailByState(page, 'SHIPPED');
    await mockImageRoutes(page);
    await page.goto('/orders/QmFulfill001');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    await captureStep(page, '15-order-tracking');
  });

  test('B16 — Confirm Receipt', async ({ page }) => {
    await setupMockAuth(page);
    await mockOrderDetailByState(page, 'SHIPPED');
    await mockImageRoutes(page);
    await page.goto('/orders/QmFulfill001');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    await captureStep(page, '16-confirm-receipt');
  });

  test('B17 — Dispute / Refund', async ({ page }) => {
    await setupMockAuth(page);
    await mockOrderDetailByState(page, 'DISPUTED');
    await mockImageRoutes(page);
    await page.goto('/orders/QmDispute001');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    await captureStep(page, '17-dispute');
  });

  // ── Account ──

  test('B18 — Notifications', async ({ page }) => {
    await setupMockAuth(page);
    await mockNotificationsAPI(page);
    await page.goto('/notifications');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    await captureStep(page, '18-notifications');
  });

  test('B19 — Wallet', async ({ page }) => {
    await setupMockAuth(page);
    await mockWalletAPI(page);
    await page.goto('/wallet');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    await captureStep(page, '19-wallet');
  });
});

// ─── Manifest Generation ────────────────────────────────────────────

test.afterAll(() => {
  const manifestPath = path.join(OUTPUT_DIR, 'manifest.json');
  const manifest = STEPS.map(s => ({
    ...s,
    persona: 'buyer',
    files: {
      mobile: `buyer/mobile/${s.id}.png`,
      desktop: `buyer/desktop/${s.id}.png`,
    },
  }));
  ensureDir(OUTPUT_DIR);
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`[buyer-journey] Manifest written: ${manifestPath}`);
});
