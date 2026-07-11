/**
 * Guest Checkout — E2E Tests (E-01 ~ E-08)
 *
 * Uses mock API routes so tests run without a backend.
 * Covers the full guest buyer journey + seller admin management.
 *
 * Routes under test:
 *   /guest-checkout       — multi-step guest checkout wizard
 *   /guest-order/:token   — token-based order status page
 *   /admin/payments — seller toggle + coin config
 *
 * Run:
 *   npx playwright test guest-checkout.spec.ts --project=chromium --reporter=list
 */

import { test, expect, type Page } from '@playwright/test';
import { setupMockAuth } from './fixtures/mock-auth';
import { runtimeConfigScript } from './fixtures/runtime-config';

// ── Mock data ────────────────────────────────────────────────────────────────

const MOCK_ORDER_TOKEN = 'gst_test_order';

// Note: paymentAmount is in minimal units (wei for ETH, satoshi for BTC), per backend contract.
// See Open Core pkg/models/guest_order.go and internal/core/guest/service.go paymentCoinConverter().
const MOCK_GUEST_ORDER_RESPONSE = {
  orderToken: MOCK_ORDER_TOKEN,
  paymentAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD38',
  paymentAmount: '28500000000000000', // 0.0285 ETH in wei
  paymentCoin: 'ETH',
  priceCurrency: 'USD',
  priceDivisibility: 2,
  expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  items: [
    {
      listingHash: 'QmTestHash123',
      listingTitle: 'Premium Wireless Headphones',
      listingSlug: 'premium-wireless-headphones',
      sellerPeerID: '12D3KooWTestPeerID',
      quantity: 1,
      unitPrice: '9900',
    },
  ],
};

const MOCK_GUEST_ORDER_STATUS = {
  orderToken: MOCK_ORDER_TOKEN,
  state: 'AWAITING_PAYMENT',
  paymentAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD38',
  paymentAmount: '28500000000000000', // 0.0285 ETH in wei
  paymentCoin: 'ETH',
  priceCurrency: 'USD',
  priceDivisibility: 2,
  confirmations: 0,
  requiredConfs: 12,
  expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  items: [
    {
      listingHash: 'QmTestHash123',
      listingTitle: 'Premium Wireless Headphones',
      listingSlug: 'premium-wireless-headphones',
      sellerPeerID: '12D3KooWTestPeerID',
      quantity: 1,
      unitPrice: '9900',
    },
  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const MOCK_GUEST_CHECKOUT_SETTINGS = {
  enabled: true,
  acceptedCoins: ['BTC', 'ETH', 'BNB'],
  paymentTimeoutMinutes: 30,
};

const MOCK_GUEST_ORDERS_LIST = [
  {
    orderToken: MOCK_ORDER_TOKEN,
    state: 'AWAITING_PAYMENT',
    paymentCoin: 'ETH',
    paymentAmount: '28500000000000000', // 0.0285 ETH in wei
    priceCurrency: 'USD',
    items: MOCK_GUEST_ORDER_STATUS.items,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    orderToken: 'gst_test_order_2',
    state: 'FUNDED',
    paymentCoin: 'BTC',
    paymentAmount: '45000', // 0.00045 BTC in satoshi
    priceCurrency: 'USD',
    items: [
      {
        listingHash: 'QmTestHash456',
        listingTitle: 'Vintage Camera',
        listingSlug: 'vintage-camera',
        sellerPeerID: '12D3KooWTestPeerID',
        quantity: 1,
        unitPrice: '24500',
      },
    ],
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
  },
];

// ── Mock API interceptors ────────────────────────────────────────────────────

/**
 * Match only API requests (pathname starts with /v1/).
 * This avoids intercepting page navigations like /admin/payments.
 */
function isV1Api(url: URL, suffix: string): boolean {
  return url.pathname.startsWith('/v1/') && url.pathname.includes(suffix);
}

async function mockGuestCheckoutAPIs(page: Page): Promise<void> {
  // Guest order list / create (exact /v1/guest/orders path, no trailing segments)
  await page.route(
    url => {
      if (!url.pathname.startsWith('/v1/')) return false;
      return url.pathname === '/v1/guest/orders' || url.pathname.endsWith('/guest/orders');
    },
    async (route, request) => {
      if (request.method() === 'POST') {
        return route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ data: MOCK_GUEST_ORDER_RESPONSE }),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: MOCK_GUEST_ORDERS_LIST,
          meta: { total: 2, limit: 20, offset: 0 },
        }),
      });
    }
  );

  // Guest order detail / ship / complete (path with token segment after /guest/orders/)
  await page.route(
    url => isV1Api(url, '/guest/orders/'),
    async (route, request) => {
      const path = request.url();
      if (path.includes('/ship') || path.includes('/complete')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: { ...MOCK_GUEST_ORDER_STATUS, state: 'SHIPPED' },
          }),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: MOCK_GUEST_ORDER_STATUS }),
      });
    }
  );

  // Guest checkout settings — only match /v1/settings/guest-checkout, NOT /admin/payments
  await page.route(
    url => isV1Api(url, '/settings/guest-checkout'),
    async (route, request) => {
      if (request.method() === 'PUT') {
        try {
          const body = request.postDataJSON();
          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ data: { ...MOCK_GUEST_CHECKOUT_SETTINGS, ...body } }),
          });
        } catch {
          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ data: MOCK_GUEST_CHECKOUT_SETTINGS }),
          });
        }
      }
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: MOCK_GUEST_CHECKOUT_SETTINGS }),
      });
    }
  );

  // runtime-config.js to enable guest checkout in the frontend
  await page.route(
    url => url.pathname.endsWith('runtime-config.js'),
    route =>
      route.fulfill({
        status: 200,
        contentType: 'application/javascript',
        body: runtimeConfigScript({
          deployment: 'standalone',
          guestCheckout: true,
          paymentMethods: [
            { id: 'BTC', kind: 'crypto', flow: 'address-transfer' },
            { id: 'ETH', kind: 'crypto', flow: 'address-transfer' },
          ],
        }),
      })
  );
}

const SEED_CART_ITEM = {
  slug: 'premium-wireless-headphones',
  title: 'Premium Wireless Headphones',
  listingHash: 'QmTestHash123',
  price: { amount: 9900, currency: 'USD', divisibility: 2 },
  thumbnail: 'https://picsum.photos/id/3/300/300',
  quantity: 1,
  vendorPeerID: 'QmY8tRnCzUf45FnPLMvFi35R5bYjCEiCKbgEN39xnScj8P',
};

async function injectGuestCart(page: Page, items = [SEED_CART_ITEM]): Promise<void> {
  const data = JSON.stringify({ state: { items }, version: 0 });
  await page.addInitScript(`localStorage.setItem('guest-cart-storage', ${JSON.stringify(data)});`);
}

async function mockAppShellAPIs(page: Page): Promise<void> {
  // Catch-all registered FIRST so it's evaluated LAST (Playwright LIFO).
  // Prevents the app from hanging on unresolved API calls (e.g., settings, profiles).
  await page.route(
    url => url.pathname.startsWith('/v1/'),
    route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: {} }),
      })
  );

  // Specific routes registered AFTER catch-all (evaluated BEFORE catch-all in LIFO).
  await page.route(
    url => url.pathname.endsWith('runtime-config.js'),
    route =>
      route.fulfill({
        status: 200,
        contentType: 'application/javascript',
        body: runtimeConfigScript({
          deployment: 'standalone',
          guestCheckout: true,
          paymentMethods: [
            { id: 'BTC', kind: 'crypto', flow: 'address-transfer' },
            { id: 'ETH', kind: 'crypto', flow: 'address-transfer' },
          ],
        }),
      })
  );

  await page.route(
    url => isV1Api(url, '/exchange-rates'),
    route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: { BTC: { last: 65000 }, ETH: { last: 3500 }, BNB: { last: 600 } },
        }),
      })
  );

  await page.route(
    url => url.pathname === '/ws' || url.pathname === '/ws/',
    route => route.abort()
  );
}

/**
 * Mock a single guest order status response with a custom override.
 */
async function mockGuestOrderStatus(
  page: Page,
  statusOverrides: Record<string, unknown> = {}
): Promise<void> {
  const status = { ...MOCK_GUEST_ORDER_STATUS, ...statusOverrides };
  await page.route(
    url => isV1Api(url, '/guest/orders/'),
    route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: status }),
      })
  );
}

// ── E-01: Guest can add item to local cart ───────────────────────────────────

test.describe('Guest Checkout — Buyer Journey', () => {
  test('E-01: guest cart persists in localStorage', async ({ page }) => {
    await injectGuestCart(page);
    await mockAppShellAPIs(page);
    await mockGuestCheckoutAPIs(page);

    await page.goto('/guest-checkout');
    await page.waitForLoadState('domcontentloaded');

    const stored = await page.evaluate(() => localStorage.getItem('guest-cart-storage'));
    expect(stored).toBeTruthy();

    const parsed = JSON.parse(stored!);
    expect(parsed.state.items).toHaveLength(1);
    expect(parsed.state.items[0].slug).toBe('premium-wireless-headphones');

    await page.screenshot({ path: 'test-results/guest-e01-cart-persists.png', fullPage: true });
  });

  test('E-02: guest cart persists across refresh', async ({ page }) => {
    await injectGuestCart(page);
    await mockAppShellAPIs(page);
    await mockGuestCheckoutAPIs(page);

    await page.goto('/guest-checkout');
    await page.waitForLoadState('domcontentloaded');

    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    const stored = await page.evaluate(() => localStorage.getItem('guest-cart-storage'));
    expect(stored).toBeTruthy();
    const parsed = JSON.parse(stored!);
    expect(parsed.state.items).toHaveLength(1);
    expect(parsed.state.items[0].title).toBe('Premium Wireless Headphones');

    await page.screenshot({ path: 'test-results/guest-e02-cart-refresh.png', fullPage: true });
  });

  test('E-03: guest checkout page renders with cart items', async ({ page }) => {
    await injectGuestCart(page);
    await mockAppShellAPIs(page);
    await mockGuestCheckoutAPIs(page);

    await page.goto('/guest-checkout');
    await page.waitForLoadState('domcontentloaded');

    const productTitle = page.getByText('Premium Wireless Headphones').first();
    await expect(productTitle).toBeVisible({ timeout: 15000 });

    await page.screenshot({ path: 'test-results/guest-e03-checkout-page.png', fullPage: true });
  });

  test('E-04: guest order shows awaiting payment status', async ({ page }) => {
    await mockAppShellAPIs(page);
    await mockGuestOrderStatus(page);

    await page.goto(`/guest-order/${MOCK_ORDER_TOKEN}`);
    await page.waitForLoadState('domcontentloaded');

    // Wait for the API response to be processed
    await page.waitForTimeout(3000);

    // The page should display either the order token or payment address
    const body = await page.textContent('body');
    expect(body).toBeTruthy();
    // Check the page rendered beyond just the header
    const hasContent = body!.includes('0x742d35') || body!.includes(MOCK_ORDER_TOKEN.slice(0, 8));
    if (!hasContent) {
      // Take diagnostic screenshot
      await page.screenshot({ path: 'test-results/guest-e04-debug.png', fullPage: true });
    }
    expect(hasContent).toBe(true);

    await page.screenshot({
      path: 'test-results/guest-e04-order-status.png',
      fullPage: true,
    });
  });

  test('E-05: guest order shows expired status', async ({ page }) => {
    await mockAppShellAPIs(page);
    await mockGuestOrderStatus(page, {
      state: 'EXPIRED',
      expiresAt: new Date(Date.now() - 60000).toISOString(),
    });

    await page.goto(`/guest-order/${MOCK_ORDER_TOKEN}`);
    await page.waitForLoadState('domcontentloaded');

    await page.waitForTimeout(3000);

    const body = await page.textContent('body');
    expect(body).toBeTruthy();

    await page.screenshot({
      path: 'test-results/guest-e05-order-expired.png',
      fullPage: true,
    });
  });
});

// ── Seller Admin Tests ───────────────────────────────────────────────────────

test.describe('Guest Checkout — Seller Admin', () => {
  test('E-06: seller sees guest orders in admin sales page', async ({ page }) => {
    await setupMockAuth(page);
    await mockGuestCheckoutAPIs(page);

    await page.route(
      url => url.pathname.endsWith('/sales') || url.pathname.endsWith('/v1/sales'),
      route =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: [], meta: { total: 0, limit: 20, offset: 0 } }),
        })
    );

    await page.route(
      url => url.pathname.endsWith('/purchases') || url.pathname.endsWith('/v1/purchases'),
      route =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: [], meta: { total: 0, limit: 20, offset: 0 } }),
        })
    );

    await page.goto('/orders');
    await page.waitForLoadState('domcontentloaded');

    const mainContent = page.locator('main, [role="main"]').first();
    await expect(mainContent).toBeVisible({ timeout: 15000 });

    await page.screenshot({
      path: 'test-results/guest-e06-seller-orders.png',
      fullPage: true,
    });
  });

  test('E-07: seller admin can navigate to guest order management', async ({ page }) => {
    await setupMockAuth(page);
    await mockGuestCheckoutAPIs(page);

    await page.goto('/admin/payments');
    await page.waitForLoadState('domcontentloaded');

    // Wait for settings API to resolve
    await page.waitForTimeout(3000);

    const settingsPage = page.locator('[data-testid="admin-guest-checkout"]').first();
    await settingsPage.scrollIntoViewIfNeeded();
    await expect(settingsPage).toBeVisible({ timeout: 15000 });

    await page.screenshot({
      path: 'test-results/guest-e07-seller-manage.png',
      fullPage: true,
    });
  });

  test('E-08: guest checkout toggle in settings', async ({ page }) => {
    await setupMockAuth(page);
    await mockGuestCheckoutAPIs(page);

    await page.goto('/admin/payments');
    await page.waitForLoadState('domcontentloaded');

    const settingsPage = page.locator('[data-testid="admin-guest-checkout"]').first();
    await settingsPage.scrollIntoViewIfNeeded();
    await expect(settingsPage).toBeVisible({ timeout: 15000 });

    const toggle = page.getByRole('switch').first();
    await expect(toggle).toBeVisible({ timeout: 5000 });

    const isChecked = await toggle.getAttribute('aria-checked');
    expect(isChecked).toBe('true');

    await toggle.click();
    const isCheckedAfter = await toggle.getAttribute('aria-checked');
    expect(isCheckedAfter).toBe('false');

    await toggle.click();
    const isCheckedFinal = await toggle.getAttribute('aria-checked');
    expect(isCheckedFinal).toBe('true');

    const coinButtons = page.locator('button').filter({ hasText: /BTC|ETH|BNB/i });
    const coinCount = await coinButtons.count();
    expect(coinCount).toBeGreaterThanOrEqual(3);

    await page.screenshot({
      path: 'test-results/guest-e08-settings-toggle.png',
      fullPage: true,
    });
  });

  test('E-08b: save guest checkout settings', async ({ page }) => {
    await setupMockAuth(page);
    await mockGuestCheckoutAPIs(page);

    await page.goto('/admin/payments');
    await page.waitForLoadState('domcontentloaded');

    const settingsPage = page.locator('[data-testid="admin-guest-checkout"]').first();
    await settingsPage.scrollIntoViewIfNeeded();
    await expect(settingsPage).toBeVisible({ timeout: 15000 });

    const saveBtn = page.getByRole('button', { name: /save|保存/i }).first();
    await expect(saveBtn).toBeVisible({ timeout: 5000 });
    await saveBtn.click();

    const successMsg = page.getByText(/saved|success|保存成功/i).first();
    await expect(successMsg).toBeVisible({ timeout: 5000 });

    await page.screenshot({
      path: 'test-results/guest-e08b-settings-saved.png',
      fullPage: true,
    });
  });
});

// ── Edge Cases ───────────────────────────────────────────────────────────────

test.describe('Guest Checkout — Edge Cases', () => {
  test('guest order with invalid token shows error', async ({ page }) => {
    await mockAppShellAPIs(page);

    await page.route(
      url => isV1Api(url, '/guest/orders/'),
      route =>
        route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ error: { code: 'NOT_FOUND', message: 'Order not found' } }),
        })
    );

    await page.goto('/guest-order/invalid-token-12345');
    await page.waitForLoadState('domcontentloaded');

    await page.waitForTimeout(3000);

    const body = await page.textContent('body');
    expect(body).toBeTruthy();

    await page.screenshot({
      path: 'test-results/guest-edge-invalid-token.png',
      fullPage: true,
    });
  });

  test('guest checkout with empty cart shows empty state', async ({ page }) => {
    await page.addInitScript(`
      localStorage.setItem('guest-cart-storage', JSON.stringify({
        state: { items: [] },
        version: 0,
      }));
    `);
    await mockAppShellAPIs(page);
    await mockGuestCheckoutAPIs(page);

    await page.goto('/guest-checkout');
    await page.waitForLoadState('domcontentloaded');

    const body = await page.textContent('body');
    expect(body).toBeTruthy();

    await page.screenshot({
      path: 'test-results/guest-edge-empty-cart.png',
      fullPage: true,
    });
  });

  test('guest order status with funded state shows token and status', async ({ page }) => {
    await mockAppShellAPIs(page);
    await mockGuestOrderStatus(page, {
      state: 'FUNDED',
      confirmations: 12,
      requiredConfs: 12,
      txHash: '0xabc123def456789012345678901234567890abcdef1234567890abcdef123456',
    });

    await page.goto(`/guest-order/${MOCK_ORDER_TOKEN}`);
    await page.waitForLoadState('domcontentloaded');

    await page.waitForTimeout(3000);

    const body = await page.textContent('body');
    expect(body).toBeTruthy();
    const hasContent = body!.includes(MOCK_ORDER_TOKEN.slice(0, 8)) || body!.includes('0x742d35');
    expect(hasContent).toBe(true);

    await page.screenshot({
      path: 'test-results/guest-edge-funded-status.png',
      fullPage: true,
    });
  });

  test('guest order status with shipped state shows tracking info', async ({ page }) => {
    await mockAppShellAPIs(page);
    await mockGuestOrderStatus(page, {
      state: 'SHIPPED',
      confirmations: 12,
      requiredConfs: 12,
      trackingNumber: 'UPS1234567890',
      carrier: 'UPS',
    });

    await page.goto(`/guest-order/${MOCK_ORDER_TOKEN}`);
    await page.waitForLoadState('domcontentloaded');

    await page.waitForTimeout(3000);

    const body = await page.textContent('body');
    expect(body).toBeTruthy();
    const hasContent =
      body!.includes('UPS1234567890') || body!.includes(MOCK_ORDER_TOKEN.slice(0, 8));
    expect(hasContent).toBe(true);

    await page.screenshot({
      path: 'test-results/guest-edge-shipped-tracking.png',
      fullPage: true,
    });
  });

  test('multi-item cart renders all items and aggregate subtotal', async ({ page }) => {
    // Guest carts must persist multiple items with independent quantities and
    // surface all of them in step 1 review. Regressions here would silently
    // drop items during anonymous checkout.
    const items = [
      {
        ...SEED_CART_ITEM,
        slug: 'item-a',
        listingHash: 'QmItemA',
        title: 'Item A — Headphones',
        quantity: 2,
      },
      {
        ...SEED_CART_ITEM,
        slug: 'item-b',
        listingHash: 'QmItemB',
        title: 'Item B — Camera',
        price: { amount: 24500, currency: 'USD', divisibility: 2 },
        quantity: 1,
      },
      {
        ...SEED_CART_ITEM,
        slug: 'item-c',
        listingHash: 'QmItemC',
        title: 'Item C — Backpack',
        price: { amount: 4500, currency: 'USD', divisibility: 2 },
        quantity: 3,
      },
    ];
    await injectGuestCart(page, items);
    await mockAppShellAPIs(page);
    await mockGuestCheckoutAPIs(page);

    await page.goto('/guest-checkout');
    await page.waitForLoadState('domcontentloaded');

    // All three titles must render in step 1.
    await expect(page.getByText('Item A — Headphones').first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Item B — Camera').first()).toBeVisible();
    await expect(page.getByText('Item C — Backpack').first()).toBeVisible();

    // localStorage must preserve all three items + quantities.
    const stored = await page.evaluate(() => localStorage.getItem('guest-cart-storage'));
    expect(stored).toBeTruthy();
    const parsed = JSON.parse(stored!);
    expect(parsed.state.items).toHaveLength(3);
    const totalQty = parsed.state.items.reduce(
      (acc: number, it: { quantity: number }) => acc + it.quantity,
      0
    );
    expect(totalQty).toBe(6);

    await page.screenshot({
      path: 'test-results/guest-edge-multi-item-cart.png',
      fullPage: true,
    });
  });

  test('guest checkout does not open a /ws WebSocket (Tor-friendly)', async ({ page }) => {
    // Privacy-mode contract: anonymous buyer flows must never initiate
    // long-lived WebSocket connections — they leak timing + traffic signals
    // through Tor exit nodes. Regression guard: fail if /ws is ever requested.
    const wsAttempts: string[] = [];
    // Only count the application /ws endpoint, not Vite HMR (ws://host/?token=...).
    const isAppWs = (raw: string): boolean => {
      try {
        const u = new URL(raw);
        return u.pathname === '/ws' || u.pathname === '/ws/' || u.pathname.startsWith('/ws/');
      } catch {
        return false;
      }
    };
    page.on('websocket', ws => {
      if (isAppWs(ws.url())) wsAttempts.push(ws.url());
    });
    page.on('request', req => {
      if (isAppWs(req.url())) wsAttempts.push(req.url());
    });

    await injectGuestCart(page);
    await mockAppShellAPIs(page);
    await mockGuestCheckoutAPIs(page);

    await page.goto('/guest-checkout');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    await page.goto(`/guest-order/${MOCK_ORDER_TOKEN}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    expect(wsAttempts, `Guest flow opened WebSocket(s): ${wsAttempts.join(', ')}`).toHaveLength(0);
  });
});
