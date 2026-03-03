/**
 * Seller Journey — 20-step narrative screenshot capture for AI UX audit.
 *
 * NOT a visual regression test. Each step captures a full-page screenshot
 * at two viewports (mobile 390x844, desktop 1280x800) and writes them
 * to demo-output/seller/{mobile,desktop}/.
 *
 * Run: PLAYWRIGHT_BROWSERS_PATH="$HOME/Library/Caches/ms-playwright" \
 *      npx playwright test demo-seller-journey --project=chromium
 */

import { test, type Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { setupMockAuth } from './fixtures/mock-auth';
import {
  mockNotificationsAPI,
  mockStoreListingsAPI,
  mockImageRoutes,
} from './fixtures/mock-api-routes';
import {
  mockFullLifecycleAPIs,
  mockOrderDetailByState,
  mockChatAPI,
  mockWalletAPI,
} from './fixtures/mock-order-lifecycle';

// ─── Config ─────────────────────────────────────────────────────────

const VIEWPORTS = {
  mobile: { width: 390, height: 844 },
  desktop: { width: 1280, height: 800 },
};

const OUTPUT_DIR = path.join(__dirname, 'demo-output', 'seller');

interface StepMeta {
  id: string;
  title: string;
  description: string;
  phase: string;
  reviewFocus: string;
}

const STEPS: StepMeta[] = [
  {
    id: '01-empty-dashboard',
    title: 'Empty Dashboard',
    description: 'New seller first login — no products, no orders. Should show EmptyState CTA.',
    phase: 'Initial Experience',
    reviewFocus:
      'Is the new-user onboarding guidance clear? Is the CTA prominent? Is the action path obvious?',
  },
  {
    id: '02-onboarding',
    title: 'Onboarding Wizard',
    description: '3-step onboarding (name/avatar/country).',
    phase: 'Initial Experience',
    reviewFocus:
      'Is the wizard concise? Are required fields excessive? Does mobile keyboard obscure inputs?',
  },
  {
    id: '03-store-welcome',
    title: 'Store Welcome Dialog',
    description: 'First visit to own store triggers StoreWelcomeDialog.',
    phase: 'Initial Experience',
    reviewFocus: 'Aha moment quality — is the popup valuable or annoying?',
  },
  {
    id: '04-ai-builder',
    title: 'AI Store Builder',
    description: 'AI Store Builder dialog for one-click brand generation.',
    phase: 'Build Store',
    reviewFocus: 'AI generation quality, waiting experience, preview effectiveness.',
  },
  {
    id: '05-branding-editor',
    title: 'Branding Editor',
    description: 'Brand editor → Sections Tab → sort/visibility.',
    phase: 'Build Store',
    reviewFocus: 'Editor intuitiveness, section management efficiency.',
  },
  {
    id: '06-create-product',
    title: 'Create Product Form',
    description: 'Product creation form (desktop: single page, mobile: wizard).',
    phase: 'Build Store',
    reviewFocus: 'Form layout, field grouping, image upload area.',
  },
  {
    id: '07-product-list',
    title: 'Product Management',
    description: 'Product management list with table/card view + search.',
    phase: 'Build Store',
    reviewFocus: 'Information density, view switching, bulk action discoverability.',
  },
  {
    id: '08-shipping',
    title: 'Shipping Settings',
    description: 'Shipping profiles and zone management.',
    phase: 'Build Store',
    reviewFocus: 'Shipping model comprehension, zone map interaction.',
  },
  {
    id: '09-discounts',
    title: 'Discount Management',
    description: 'Create + list discounts (grouped by status).',
    phase: 'Build Store',
    reviewFocus: 'Discount type comprehension, code management efficiency.',
  },
  {
    id: '10-collections',
    title: 'Collections',
    description: 'Collection creation + product assignment.',
    phase: 'Build Store',
    reviewFocus: 'Collection concept clarity, product association flow.',
  },
  {
    id: '11-integrations',
    title: 'Integrations',
    description: 'Integration settings (Payments / Notifications / AI).',
    phase: 'Build Store',
    reviewFocus: 'Tab organization, payment connection clarity.',
  },
  {
    id: '12-dashboard-data',
    title: 'Dashboard with Data',
    description: 'Dashboard with metrics, recent orders, popular products.',
    phase: 'Daily Operations',
    reviewFocus: 'Data presentation clarity, metric meaning, action guidance.',
  },
  {
    id: '13-orders-list',
    title: 'Orders List',
    description: 'Order list with filters, search, status tabs.',
    phase: 'Daily Operations',
    reviewFocus: 'Filter efficiency, status differentiation, bulk actions.',
  },
  {
    id: '14-order-ship',
    title: 'Ship Order',
    description: 'Order detail → Ship → enter tracking number.',
    phase: 'Daily Operations',
    reviewFocus: 'Shipping action efficiency (core high-frequency op), tracking input.',
  },
  {
    id: '15-dispute',
    title: 'Disputed Order',
    description: 'Disputed order detail (DISPUTED state).',
    phase: 'Daily Operations',
    reviewFocus: 'High-stress scenario info clarity, seller action options.',
  },
  {
    id: '16-wallet',
    title: 'Wallet',
    description: 'Wallet page (transactions + receiving addresses).',
    phase: 'Daily Operations',
    reviewFocus: 'Fund transparency, trust feeling, withdrawal path.',
  },
  {
    id: '17-notifications',
    title: 'Notifications',
    description: 'Notification center (order/system/social).',
    phase: 'Daily Operations',
    reviewFocus: 'Notification categorization, read/unread distinction, action paths.',
  },
  {
    id: '18-chat',
    title: 'Chat',
    description: 'Chat page with buyer conversation (mock).',
    phase: 'Daily Operations',
    reviewFocus: 'Message display, reply efficiency, mobile input experience.',
  },
  {
    id: '19-my-store',
    title: 'My Store (buyer view)',
    description: 'Visit own branded storefront as a buyer would see it.',
    phase: 'Review',
    reviewFocus: 'Brand presentation, product showcase quality, professional feel.',
  },
  {
    id: '20-settings-tour',
    title: 'Settings Tour',
    description: 'Settings page overview (General / Privacy / Advanced).',
    phase: 'Review',
    reviewFocus: 'Settings completeness, categorization, important setting discoverability.',
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

test.describe('Seller Journey — 20-step AI UX Audit', () => {
  test.setTimeout(180_000);

  // S01: Empty Dashboard
  test('S01 — Empty Dashboard', async ({ page }) => {
    await setupMockAuth(page);
    await page.goto('/admin');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    await captureStep(page, '01-empty-dashboard');
  });

  // S02: Onboarding (visit /onboarding)
  test('S02 — Onboarding', async ({ page }) => {
    await setupMockAuth(page);
    await page.goto('/onboarding');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    await captureStep(page, '02-onboarding');
  });

  // S03: Store Welcome (visit own store)
  test('S03 — Store Welcome', async ({ page }) => {
    await setupMockAuth(page);
    await mockStoreListingsAPI(page);
    await mockImageRoutes(page);
    const MOCK_PEER_ID = 'QmY8Mzg1LzU2NzgvOTAxMjM0NTY3ODkwMTIzNDU2Nzg5MA';
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
            about: 'Premium tech gadgets and accessories for the modern lifestyle.',
            avatarHashes: { tiny: '', small: '', medium: '' },
            stats: {
              followerCount: 128,
              followingCount: 42,
              listingCount: 8,
              ratingCount: 47,
              averageRating: 4.7,
            },
          },
        }),
      });
    });
    await page.goto(`/store/${MOCK_PEER_ID}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    await page.waitForTimeout(1000);
    await captureStep(page, '03-store-welcome');
  });

  // S04: AI Store Builder (Storefront editor)
  test('S04 — AI Store Builder', async ({ page }) => {
    await setupMockAuth(page);
    await page.goto('/admin/storefront');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    await captureStep(page, '04-ai-builder');
  });

  // S05: Branding Editor
  test('S05 — Branding Editor', async ({ page }) => {
    await setupMockAuth(page);
    await page.goto('/admin/settings/store/branding');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    await captureStep(page, '05-branding-editor');
  });

  // S06: Create Product
  test('S06 — Create Product', async ({ page }) => {
    await setupMockAuth(page);
    await page.goto('/listing/new');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    await captureStep(page, '06-create-product');
  });

  // S07: Product List
  test('S07 — Product Management', async ({ page }) => {
    await setupMockAuth(page);
    await page.goto('/admin/products');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    await captureStep(page, '07-product-list');
  });

  // S08: Shipping Settings
  test('S08 — Shipping Settings', async ({ page }) => {
    await setupMockAuth(page);
    await page.goto('/admin/settings/shipping');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    await captureStep(page, '08-shipping');
  });

  // S09: Discounts
  test('S09 — Discount Management', async ({ page }) => {
    await setupMockAuth(page);
    await page.goto('/admin/discounts');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    await captureStep(page, '09-discounts');
  });

  // S10: Collections
  test('S10 — Collections', async ({ page }) => {
    await setupMockAuth(page);
    await page.goto('/admin/collections');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    await captureStep(page, '10-collections');
  });

  // S11: Integrations
  test('S11 — Integrations', async ({ page }) => {
    await setupMockAuth(page);
    await page.goto('/admin/settings/integrations');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    await captureStep(page, '11-integrations');
  });

  // S12: Dashboard with Data (mock orders + wallet)
  test('S12 — Dashboard with Data', async ({ page }) => {
    await setupMockAuth(page);
    await mockFullLifecycleAPIs(page);
    await mockImageRoutes(page);
    await page.goto('/admin');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    await page.waitForTimeout(1000);
    await captureStep(page, '12-dashboard-data');
  });

  // S13: Orders List
  test('S13 — Orders List', async ({ page }) => {
    await setupMockAuth(page);
    await mockFullLifecycleAPIs(page);
    await mockImageRoutes(page);
    await page.goto('/admin/orders');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    await captureStep(page, '13-orders-list');
  });

  // S14: Ship Order (AWAITING_FULFILLMENT detail)
  test('S14 — Ship Order', async ({ page }) => {
    await setupMockAuth(page);
    await mockOrderDetailByState(page, 'AWAITING_FULFILLMENT');
    await mockImageRoutes(page);
    await page.goto('/orders/QmAwait001');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    await captureStep(page, '14-order-ship');
  });

  // S15: Disputed Order
  test('S15 — Disputed Order', async ({ page }) => {
    await setupMockAuth(page);
    await mockOrderDetailByState(page, 'DISPUTED');
    await mockImageRoutes(page);
    await page.goto('/orders/QmDispute001');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    await captureStep(page, '15-dispute');
  });

  // S16: Wallet
  test('S16 — Wallet', async ({ page }) => {
    await setupMockAuth(page);
    await mockWalletAPI(page);
    await page.goto('/wallet');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    await captureStep(page, '16-wallet');
  });

  // S17: Notifications
  test('S17 — Notifications', async ({ page }) => {
    await setupMockAuth(page);
    await mockNotificationsAPI(page);
    await page.goto('/notifications');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    await captureStep(page, '17-notifications');
  });

  // S18: Chat (drawer-based, no dedicated route — open from admin page)
  test('S18 — Chat', async ({ page }) => {
    await setupMockAuth(page);
    await mockChatAPI(page);
    await page.goto('/admin');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    await page.waitForTimeout(1000);
    const chatBtn = page
      .locator('[data-testid="chat-toggle"], [aria-label*="chat" i], [aria-label*="message" i]')
      .first();
    if (await chatBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await chatBtn.click();
      await page.waitForTimeout(1000);
    }
    await captureStep(page, '18-chat');
  });

  // S19: My Store (buyer view)
  test('S19 — My Store (buyer view)', async ({ page }) => {
    await setupMockAuth(page);
    await mockStoreListingsAPI(page);
    await mockImageRoutes(page);
    const MOCK_PEER_ID = 'QmY8Mzg1LzU2NzgvOTAxMjM0NTY3ODkwMTIzNDU2Nzg5MA';
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
            about: 'Premium tech gadgets and accessories for the modern lifestyle.',
            avatarHashes: { tiny: '', small: '', medium: '' },
            stats: {
              followerCount: 128,
              followingCount: 42,
              listingCount: 8,
              ratingCount: 47,
              averageRating: 4.7,
            },
          },
        }),
      });
    });
    await page.goto(`/store/${MOCK_PEER_ID}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    await page.waitForTimeout(1000);
    await captureStep(page, '19-my-store');
  });

  // S20: Settings Tour
  test('S20 — Settings Tour', async ({ page }) => {
    await setupMockAuth(page);
    await page.goto('/admin/settings');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    await captureStep(page, '20-settings-tour');
  });
});

// ─── Manifest Generation ────────────────────────────────────────────

test.afterAll(() => {
  const manifestPath = path.join(OUTPUT_DIR, 'manifest.json');
  const manifest = STEPS.map(s => ({
    ...s,
    persona: 'seller',
    files: {
      mobile: `seller/mobile/${s.id}.png`,
      desktop: `seller/desktop/${s.id}.png`,
    },
  }));
  ensureDir(OUTPUT_DIR);
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`[seller-journey] Manifest written: ${manifestPath}`);
});
