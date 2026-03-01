/**
 * Desktop Visual Regression Tests
 * 桌面端视觉回归测试 — 公开页面 + 登录态业务页面（含真实数据 + API Mock）
 */

import { test, expect, Page } from '@playwright/test';
import { loginAndSetup } from './fixtures/auth';
import {
  seedVisualTestData,
  injectCartData,
  cleanupVisualTestData,
  type SeededVisualData,
} from './fixtures/seed-visual-data';
import {
  mockOrdersAPI,
  mockOrderDetailAPI,
  mockNotificationsAPI,
  mockPreferencesAPI,
  mockSearchAPI,
  mockProductDetailAPI,
} from './fixtures/mock-api-routes';

let seededData: SeededVisualData | null = null;

async function hideDevOverlays(page: Page): Promise<void> {
  await page.addStyleTag({
    content: `
      [data-nextjs-toast], nextjs-portal, [data-nextjs-dialog-overlay], [data-nextjs-dialog],
      [class*="Compiling"], [class*="compiling"], [class*="react-devtools"],
      [id*="__next_dev"], [class*="__next"], button:has-text("issues"), [class*="Issues"] {
        display: none !important; visibility: hidden !important; opacity: 0 !important;
      }
    `,
  });
}

async function waitForPageStable(page: Page): Promise<void> {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(800);
  await hideDevOverlays(page);
  await page.waitForTimeout(200);
}

async function waitForDOMStable(page: Page): Promise<void> {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  await hideDevOverlays(page);
}

async function navigateAndVerify(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await waitForPageStable(page);
  const url = page.url();
  if (url.includes('/onboarding') || (path !== '/login' && url.includes('/login'))) {
    throw new Error(`Expected ${path} but got redirected to ${url}`);
  }
}

test.beforeEach(async ({ page: _page }, testInfo) => {
  if (testInfo.project.name.toLowerCase().includes('mobile')) {
    test.skip();
  }
});

// ─── Part 1: Public Pages (no auth) ───

const publicPages = [
  { name: 'home', path: '/' },
  { name: 'search', path: '/search' },
  { name: 'marketplace', path: '/marketplace' },
  { name: 'moderators', path: '/moderators' },
  { name: 'login', path: '/login' },
];

test.describe('Desktop Visual - Public Pages', () => {
  for (const p of publicPages) {
    test(`public: ${p.name}`, async ({ page }) => {
      await page.goto(p.path);
      await waitForPageStable(page);
      await expect(page).toHaveScreenshot(`desktop-public-${p.name}.png`, { fullPage: true });
    });
  }

  test('public: search-results (mocked)', async ({ page }) => {
    await mockSearchAPI(page);
    await page.goto('/search?q=headphones');
    await waitForDOMStable(page);
    await expect(page).toHaveScreenshot('desktop-public-search-results.png', { fullPage: true });
  });
});

// ─── Part 2: Authenticated Pages (with seeded data + mocked APIs) ───

test.describe('Desktop Visual - Authenticated Main', () => {
  test.beforeAll(async ({ request }) => {
    try {
      seededData = await seedVisualTestData(request);
      console.log(`Seeded ${seededData.listings.length} listings for desktop visual tests`);
    } catch (e) {
      console.warn('Failed to seed visual data:', e);
    }
  });

  test.afterAll(async ({ request }) => {
    if (seededData) {
      await cleanupVisualTestData(request, seededData);
      seededData = null;
    }
  });

  const simplePages = [
    { name: 'home', path: '/' },
    { name: 'profile', path: '/profile' },
    { name: 'me', path: '/me' },
    { name: 'wallet', path: '/wallet' },
    { name: 'chat', path: '/chat' },
    { name: 'listing-new', path: '/listing/new' },
    { name: 'rwa-dashboard', path: '/rwa-dashboard' },
    { name: 'marketplace', path: '/marketplace' },
  ];

  for (const p of simplePages) {
    test(`authed: ${p.name}`, async ({ page }) => {
      await loginAndSetup(page);
      await navigateAndVerify(page, p.path);
      await expect(page).toHaveScreenshot(`desktop-authed-${p.name}.png`, { fullPage: true });
    });
  }

  // ── Pages with mocked API data ──

  test('authed: orders-purchases (mocked)', async ({ page }) => {
    await loginAndSetup(page);
    await mockOrdersAPI(page);
    await page.goto('/orders');
    await waitForDOMStable(page);
    await expect(page).toHaveScreenshot('desktop-authed-orders-purchases.png', { fullPage: true });
  });

  test('authed: orders-sales (mocked)', async ({ page }) => {
    await loginAndSetup(page);
    await mockOrdersAPI(page);
    await page.goto('/orders?tab=sales');
    await waitForDOMStable(page);
    await expect(page).toHaveScreenshot('desktop-authed-orders-sales.png', { fullPage: true });
  });

  test('authed: order-detail (mocked)', async ({ page }) => {
    await loginAndSetup(page);
    await mockOrderDetailAPI(page);
    await page.goto('/orders/QmOrder001');
    await waitForDOMStable(page);
    await expect(page).toHaveScreenshot('desktop-authed-order-detail.png', { fullPage: true });
  });

  test('authed: notifications (mocked)', async ({ page }) => {
    await loginAndSetup(page);
    await mockNotificationsAPI(page);
    await page.goto('/notifications');
    await waitForDOMStable(page);
    await expect(page).toHaveScreenshot('desktop-authed-notifications.png', { fullPage: true });
  });

  test('authed: search (mocked)', async ({ page }) => {
    await loginAndSetup(page);
    await mockSearchAPI(page);
    await page.goto('/search?q=headphones');
    await waitForDOMStable(page);
    await expect(page).toHaveScreenshot('desktop-authed-search.png', { fullPage: true });
  });

  test('authed: cart (with items)', async ({ page }) => {
    await loginAndSetup(page);
    await page.goto('/');
    await waitForPageStable(page);
    if (seededData) {
      await injectCartData(page, seededData);
    }
    await page.goto('/cart');
    await waitForDOMStable(page);
    await expect(page).toHaveScreenshot('desktop-authed-cart.png', { fullPage: true });
  });

  test('authed: checkout (with items)', async ({ page }) => {
    await loginAndSetup(page);
    await mockPreferencesAPI(page);
    await mockProductDetailAPI(page);
    await page.goto('/');
    await waitForPageStable(page);
    if (seededData) {
      await injectCartData(page, seededData);
    }
    const peerID = seededData?.peerID || 'QmTestPeerID12345';
    const slugs =
      seededData?.listings.map(l => l.slug).join(',') ||
      'wireless-noise-cancelling-headphones,professional-logo-design-package';
    await page.goto(`/checkout?vendorPeerID=${peerID}&slugs=${slugs}`);
    await waitForDOMStable(page);
    await expect(page).toHaveScreenshot('desktop-authed-checkout.png', { fullPage: true });
  });

  test('authed: product-detail (mocked)', async ({ page }) => {
    await loginAndSetup(page);
    await mockProductDetailAPI(page);
    await page.goto(
      '/product/wireless-headphones?peer=QmY8tRnCzUf45FnPLMvFi35R5bYjCEiCKbgEN39xnScj8P'
    );
    await waitForDOMStable(page);
    await expect(page).toHaveScreenshot('desktop-authed-product-detail.png', { fullPage: true });
  });
});

// ─── Part 3: Authenticated Settings ───

const settingsPages = [
  { name: 'settings-main', path: '/settings' },
  { name: 'settings-general', path: '/settings/general' },
  { name: 'settings-store', path: '/settings/store' },
  { name: 'settings-store-shipping', path: '/settings/store/shipping' },
  { name: 'settings-store-policies', path: '/settings/store/policies' },
  { name: 'settings-moderator', path: '/settings/moderator' },
  { name: 'settings-privacy', path: '/settings/privacy' },
  { name: 'settings-blocked', path: '/settings/blocked' },
  { name: 'settings-advanced', path: '/settings/advanced' },
  { name: 'settings-keys', path: '/settings/keys' },
  { name: 'settings-access-requests', path: '/settings/access-requests' },
  { name: 'settings-blocked-users', path: '/settings/blocked-users' },
  { name: 'settings-user-groups', path: '/settings/user-groups' },
  { name: 'settings-product-groups', path: '/settings/product-groups' },
];

test.describe('Desktop Visual - Authenticated Settings', () => {
  for (const p of settingsPages) {
    test(`authed: ${p.name}`, async ({ page }) => {
      await loginAndSetup(page);
      await navigateAndVerify(page, p.path);
      await expect(page).toHaveScreenshot(`desktop-authed-${p.name}.png`, { fullPage: true });
    });
  }

  test('authed: settings-addresses (mocked)', async ({ page }) => {
    await loginAndSetup(page);
    await mockPreferencesAPI(page);
    await navigateAndVerify(page, '/settings/addresses');
    await expect(page).toHaveScreenshot('desktop-authed-settings-addresses.png', {
      fullPage: true,
    });
  });
});

// ─── Part 4: Admin Pages ───

test.describe('Desktop Visual - Authenticated Admin', () => {
  test('authed: moderator-cases', async ({ page }) => {
    await loginAndSetup(page);
    await navigateAndVerify(page, '/moderator/cases');
    await expect(page).toHaveScreenshot('desktop-authed-moderator-cases.png', { fullPage: true });
  });

  test('authed: admin-dashboard', async ({ page }) => {
    await loginAndSetup(page);
    await navigateAndVerify(page, '/admin');
    await expect(page).toHaveScreenshot('desktop-authed-admin-dashboard.png', { fullPage: true });
  });

  test('authed: admin-products', async ({ page }) => {
    await loginAndSetup(page);
    await navigateAndVerify(page, '/admin/products');
    await expect(page).toHaveScreenshot('desktop-authed-admin-products.png', { fullPage: true });
  });

  test('authed: admin-orders', async ({ page }) => {
    await loginAndSetup(page);
    await navigateAndVerify(page, '/admin/orders');
    await expect(page).toHaveScreenshot('desktop-authed-admin-orders.png', { fullPage: true });
  });

  test('authed: admin-analytics', async ({ page }) => {
    await loginAndSetup(page);
    await navigateAndVerify(page, '/admin/analytics');
    await expect(page).toHaveScreenshot('desktop-authed-admin-analytics.png', { fullPage: true });
  });

  test('authed: admin-settings', async ({ page }) => {
    await loginAndSetup(page);
    await navigateAndVerify(page, '/admin/settings');
    await expect(page).toHaveScreenshot('desktop-authed-admin-settings.png', { fullPage: true });
  });
});

// ─── Part 5: Footer ───

test.describe('Desktop Visual - Footer', () => {
  test('footer', async ({ page }) => {
    await page.goto('/');
    await waitForPageStable(page);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(300);
    await hideDevOverlays(page);
    const footer = page.locator('footer').first();
    await expect(footer).toHaveScreenshot('desktop-footer.png');
  });
});
