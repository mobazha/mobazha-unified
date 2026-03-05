/**
 * Desktop Visual Regression Tests
 * 桌面端视觉回归测试 — 公开页面 + 登录态业务页面（含真实数据 + API Mock）
 *
 * 认证优化：登录一次提取 Token，后续测试通过 addInitScript 注入，
 * 避免每个测试重复完整 OAuth 流程（~40 次 → 1 次）。
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

let cachedLocalStorage: Record<string, string> | undefined;
let cachedProfileJSON: string | undefined;

async function ensureAuthenticated(page: Page): Promise<void> {
  if (!cachedLocalStorage) {
    await loginAndSetup(page);

    // Wait for Zustand persist to write the profile to localStorage
    // (createProfile → set() → persist might be slightly delayed after navigation)
    try {
      await page.waitForFunction(
        () => {
          const stored = localStorage.getItem('mobazha-user-storage');
          if (!stored) return false;
          try {
            const parsed = JSON.parse(stored);
            return !!parsed.state?.profile;
          } catch {
            return false;
          }
        },
        { timeout: 10000 }
      );
    } catch {
      // Profile may not exist yet for brand new users; proceed anyway
    }

    cachedLocalStorage = await page.evaluate(() => {
      const items: Record<string, string> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const value = localStorage.getItem(key);
          if (value) items[key] = value;
        }
      }
      return items;
    });

    // Extract profile from Zustand persisted state
    try {
      const userStorage = JSON.parse(cachedLocalStorage['mobazha-user-storage'] || '{}');
      if (userStorage.state?.profile) {
        cachedProfileJSON = JSON.stringify({ data: userStorage.state.profile });
      }
    } catch {
      /* ignore */
    }
    return;
  }

  // Inject localStorage + intercept /v1/profiles at the fetch level.
  // page.route() doesn't reliably intercept proxied requests in dev mode,
  // so we patch window.fetch directly via addInitScript.
  const escaped = JSON.stringify(cachedLocalStorage);
  const profileJSON = cachedProfileJSON ? JSON.stringify(cachedProfileJSON) : 'null';
  await page.addInitScript(`
    const items = ${escaped};
    for (const [key, value] of Object.entries(items)) {
      window.localStorage.setItem(key, value);
    }

    // Intercept fetch for /v1/profiles to make restoreSession() instant
    const _origFetch = window.fetch;
    window.fetch = function(input, init) {
      const url = typeof input === 'string' ? input : (input instanceof Request ? input.url : '');
      const method = (init && init.method) || (input instanceof Request ? input.method : 'GET');
      if (method.toUpperCase() === 'GET' && url.includes('/v1/profiles')) {
        const profileData = ${profileJSON};
        if (profileData) {
          return Promise.resolve(new Response(profileData, {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }));
        }
      }
      return _origFetch.apply(this, arguments);
    };
  `);
}

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

async function waitForLoadingToDisappear(page: Page): Promise<void> {
  // Match both ASCII "Loading..." and Unicode "Loading…" (ellipsis)
  const indicators = [
    page.getByText('Loading...', { exact: true }),
    page.getByText('Loading\u2026', { exact: true }),
    page.locator('.animate-spin'),
  ];
  for (let attempt = 0; attempt < 20; attempt++) {
    const visible = await Promise.all(
      indicators.map(loc =>
        loc
          .first()
          .isVisible()
          .catch(() => false)
      )
    );
    if (!visible.some(Boolean)) break;
    await page.waitForTimeout(500);
  }
}

async function waitForPageStable(page: Page): Promise<void> {
  try {
    await page.waitForLoadState('networkidle', { timeout: 15000 });
  } catch {
    // networkidle may not fire if WebSocket or long-poll is active; proceed anyway
  }
  await waitForLoadingToDisappear(page);
  await page.waitForTimeout(500);
  await hideDevOverlays(page);
  await page.waitForTimeout(200);
}

async function waitForDOMStable(page: Page): Promise<void> {
  try {
    await page.waitForLoadState('networkidle', { timeout: 15000 });
  } catch {
    // proceed anyway
  }
  await waitForLoadingToDisappear(page);
  await page.waitForTimeout(1000);
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
    { name: 'listing-new', path: '/listing/new' },
    { name: 'rwa-dashboard', path: '/rwa-dashboard' },
    { name: 'marketplace', path: '/marketplace' },
  ];

  for (const p of simplePages) {
    test(`authed: ${p.name}`, async ({ page }) => {
      await ensureAuthenticated(page);
      await navigateAndVerify(page, p.path);
      await expect(page).toHaveScreenshot(`desktop-authed-${p.name}.png`, { fullPage: true });
    });
  }

  // ── Pages with mocked API data ──

  test('authed: orders-purchases (mocked)', async ({ page }) => {
    await ensureAuthenticated(page);
    await mockOrdersAPI(page);
    await page.goto('/orders');
    await waitForDOMStable(page);
    await expect(page).toHaveScreenshot('desktop-authed-orders-purchases.png', { fullPage: true });
  });

  test('authed: orders-sales (mocked)', async ({ page }) => {
    await ensureAuthenticated(page);
    await mockOrdersAPI(page);
    await page.goto('/orders?tab=sales');
    await waitForDOMStable(page);
    await expect(page).toHaveScreenshot('desktop-authed-orders-sales.png', { fullPage: true });
  });

  test('authed: order-detail (mocked)', async ({ page }) => {
    await ensureAuthenticated(page);
    await mockOrderDetailAPI(page);
    await page.goto('/orders/QmOrder001');
    await waitForDOMStable(page);
    await expect(page).toHaveScreenshot('desktop-authed-order-detail.png', { fullPage: true });
  });

  test('authed: notifications (mocked)', async ({ page }) => {
    await ensureAuthenticated(page);
    await mockNotificationsAPI(page);
    await page.goto('/notifications');
    await waitForDOMStable(page);
    await expect(page).toHaveScreenshot('desktop-authed-notifications.png', { fullPage: true });
  });

  test('authed: search (mocked)', async ({ page }) => {
    await ensureAuthenticated(page);
    await mockSearchAPI(page);
    await page.goto('/search?q=headphones');
    await waitForDOMStable(page);
    await expect(page).toHaveScreenshot('desktop-authed-search.png', { fullPage: true });
  });

  test('authed: cart (with items)', async ({ page }) => {
    await ensureAuthenticated(page);
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
    await ensureAuthenticated(page);
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
    await ensureAuthenticated(page);
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
  { name: 'settings-moderation', path: '/settings/moderation' },
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
      await ensureAuthenticated(page);
      await navigateAndVerify(page, p.path);
      await expect(page).toHaveScreenshot(`desktop-authed-${p.name}.png`, { fullPage: true });
    });
  }

  test('authed: settings-addresses (mocked)', async ({ page }) => {
    await ensureAuthenticated(page);
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
    await ensureAuthenticated(page);
    await navigateAndVerify(page, '/moderation/cases');
    await expect(page).toHaveScreenshot('desktop-authed-moderator-cases.png', { fullPage: true });
  });

  test('authed: admin-dashboard', async ({ page }) => {
    await ensureAuthenticated(page);
    await navigateAndVerify(page, '/admin');
    await expect(page).toHaveScreenshot('desktop-authed-admin-dashboard.png', { fullPage: true });
  });

  test('authed: admin-products', async ({ page }) => {
    await ensureAuthenticated(page);
    await navigateAndVerify(page, '/admin/products');
    await expect(page).toHaveScreenshot('desktop-authed-admin-products.png', { fullPage: true });
  });

  test('authed: admin-orders', async ({ page }) => {
    await ensureAuthenticated(page);
    await navigateAndVerify(page, '/admin/orders');
    await expect(page).toHaveScreenshot('desktop-authed-admin-orders.png', { fullPage: true });
  });

  test('authed: admin-analytics', async ({ page }) => {
    await ensureAuthenticated(page);
    await navigateAndVerify(page, '/admin/analytics');
    await expect(page).toHaveScreenshot('desktop-authed-admin-analytics.png', { fullPage: true });
  });

  test('authed: admin-settings', async ({ page }) => {
    await ensureAuthenticated(page);
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
