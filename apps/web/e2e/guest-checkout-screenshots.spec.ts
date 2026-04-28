/**
 * Guest Checkout — Screenshot Capture
 *
 * Walks through the full guest checkout buyer journey + seller admin
 * management and captures one screenshot per major UI state.
 *
 * Output: test-results/screenshots/guest-checkout/
 *
 * Run:
 *   npx playwright test guest-checkout-screenshots.spec.ts --project=chromium --reporter=list
 */

import { test, expect, type Page } from '@playwright/test';
import { setupMockAuth } from './fixtures/mock-auth';

const OUT = 'test-results/screenshots/guest-checkout';
const MOCK_ORDER_TOKEN = 'mock';

// ── Mock data ────────────────────────────────────────────────────────────────

// paymentAmount 与 unitPrice 均为最小单位字符串（与后端 API 一致）
// 0.0285 ETH = 0.0285 × 10^18 wei = 28500000000000000
// $99.00 USD (divisibility=2) = 9900
const MOCK_GUEST_ORDER_RESPONSE = {
  orderToken: MOCK_ORDER_TOKEN,
  paymentAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD38',
  paymentAmount: '28500000000000000',
  paymentCoin: 'ETH',
  priceCurrency: 'USD',
  priceDivisibility: 2,
  expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  items: [
    {
      listingHash: 'QmTestHash123',
      title: 'Premium Wireless Headphones',
      quantity: 1,
      unitPrice: '9900',
    },
  ],
};

const MOCK_GUEST_ORDER_STATUS = {
  ...MOCK_GUEST_ORDER_RESPONSE,
  state: 'AWAITING_PAYMENT',
  confirmations: 0,
  requiredConfirmations: 12,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const MOCK_SETTINGS = {
  enabled: true,
  acceptedCoins: ['BTC', 'ETH', 'BNB', 'USDT'],
  paymentTimeoutMinutes: 30,
};

const SEED_CART_ITEM = {
  slug: 'premium-wireless-headphones',
  title: 'Premium Wireless Headphones',
  listingHash: 'QmTestHash123',
  price: { amount: 9900, currency: 'USD', divisibility: 2 },
  thumbnail: 'https://picsum.photos/id/3/300/300',
  quantity: 1,
  vendorPeerID: 'QmY8tRnCzUf45FnPLMvFi35R5bYjCEiCKbgEN39xnScj8P',
};

// ── Mocks ────────────────────────────────────────────────────────────────────

function isV1Api(url: URL, suffix: string): boolean {
  return url.pathname.startsWith('/v1/') && url.pathname.includes(suffix);
}

async function mockAppShell(page: Page): Promise<void> {
  // Catch-all first (LIFO → evaluated last)
  await page.route(
    url => url.pathname.startsWith('/v1/'),
    route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: {} }),
      })
  );
  await page.route(
    url => url.pathname.endsWith('runtime-config.js'),
    route =>
      route.fulfill({
        status: 200,
        contentType: 'application/javascript',
        body:
          'window.__RUNTIME_CONFIG__ = { ' +
          'features: { guestCheckout: { effective: true, overridable: [] } }, ' +
          'guestCheckoutEnabled: true ' +
          '};',
      })
  );
  await page.route(
    url => isV1Api(url, '/exchange-rates'),
    route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            BTC: { last: 65000 },
            ETH: { last: 3500 },
            BNB: { last: 600 },
            USDT: { last: 1 },
          },
        }),
      })
  );
  await page.route(
    url => url.pathname === '/ws' || url.pathname === '/ws/',
    route => route.abort()
  );
}

async function mockGuestAPIs(
  page: Page,
  statusState = 'AWAITING_PAYMENT',
  statusExtras: Record<string, unknown> = {}
): Promise<void> {
  // Settings (GET + PUT)
  await page.route(
    url => isV1Api(url, '/settings/guest-checkout'),
    route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: MOCK_SETTINGS }),
      })
  );
  // Order creation (POST /v1/guest/orders)
  await page.route(
    url => url.pathname === '/v1/guest/orders',
    async (route, req) => {
      if (req.method() === 'POST') {
        return route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ data: MOCK_GUEST_ORDER_RESPONSE }),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [] }),
      });
    }
  );
  // Order status (GET /v1/guest/orders/{token})
  await page.route(
    url => isV1Api(url, '/guest/orders/'),
    route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: { ...MOCK_GUEST_ORDER_STATUS, state: statusState, ...statusExtras },
        }),
      })
  );
}

async function injectCart(page: Page, items = [SEED_CART_ITEM]): Promise<void> {
  const data = JSON.stringify({ state: { items }, version: 0 });
  await page.addInitScript(`localStorage.setItem('guest-cart-storage', ${JSON.stringify(data)});`);
}

// ── Buyer Journey (sequential steps in one test for continuity) ──────────────

test.describe('Guest Checkout Screenshots — Buyer Journey', () => {
  test.describe.configure({ mode: 'serial' });

  test('01 — Cart review (step 1)', async ({ page }) => {
    await injectCart(page);
    await mockAppShell(page);
    await mockGuestAPIs(page);

    await page.goto('/guest-checkout');
    await expect(page.getByText('Premium Wireless Headphones').first()).toBeVisible({
      timeout: 15000,
    });
    await page.waitForTimeout(500);

    await page.screenshot({ path: `${OUT}/01-cart-review.png`, fullPage: true });
  });

  test('02 — Shipping form (step 2)', async ({ page }) => {
    await injectCart(page);
    await mockAppShell(page);
    await mockGuestAPIs(page);

    await page.goto('/guest-checkout');
    await expect(page.getByText('Premium Wireless Headphones').first()).toBeVisible({
      timeout: 15000,
    });

    await page.getByRole('button', { name: /^Continue to Shipping$/i }).click();
    await page.waitForTimeout(800);

    await page.screenshot({ path: `${OUT}/02-shipping-empty.png`, fullPage: true });

    // Fill shipping form for the next screenshot
    await page.fill('#guest-name', 'John Doe');
    await page.fill('#guest-email', 'john@example.com');
    await page.fill('#guest-addressLineOne', '123 Main Street');
    await page.fill('#guest-city', 'San Francisco');
    await page.fill('#guest-state', 'CA');
    await page.fill('#guest-postalCode', '94105');
    // Country is typically a select — try fill or selectOption
    const country = page.locator('#guest-country').first();
    if (await country.count()) {
      const tag = await country.evaluate(el => el.tagName.toLowerCase());
      if (tag === 'select') {
        await country
          .selectOption({ label: 'United States' })
          .catch(() => country.selectOption('US'));
      } else {
        await country.fill('United States');
      }
    }
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${OUT}/03-shipping-filled.png`, fullPage: true });
  });

  test('03 — Coin selection (step 3)', async ({ page }) => {
    await injectCart(page);
    await mockAppShell(page);
    await mockGuestAPIs(page);

    await page.goto('/guest-checkout');
    await expect(page.getByText('Premium Wireless Headphones').first()).toBeVisible({
      timeout: 15000,
    });

    await page.getByRole('button', { name: /^Continue to Shipping$/i }).click();
    await page.waitForTimeout(500);

    // Fill shipping
    await page.fill('#guest-name', 'John Doe');
    await page.fill('#guest-email', 'john@example.com');
    await page.fill('#guest-addressLineOne', '123 Main Street');
    await page.fill('#guest-city', 'San Francisco');
    await page.fill('#guest-state', 'CA');
    await page.fill('#guest-postalCode', '94105');
    const country = page.locator('#guest-country').first();
    if (await country.count()) {
      const tag = await country.evaluate(el => el.tagName.toLowerCase());
      if (tag === 'select') {
        await country
          .selectOption({ label: 'United States' })
          .catch(() => country.selectOption('US'));
      } else {
        await country.fill('United States');
      }
    }
    await page.waitForTimeout(300);

    await page.getByRole('button', { name: /^Continue to Payment$/i }).click();
    await page.waitForTimeout(1000);

    await page.screenshot({ path: `${OUT}/04-coin-selection.png`, fullPage: true });
  });

  test('04 — Payment instructions (step 4)', async ({ page }) => {
    await injectCart(page);
    await mockAppShell(page);
    await mockGuestAPIs(page);

    await page.goto('/guest-checkout');
    await expect(page.getByText('Premium Wireless Headphones').first()).toBeVisible({
      timeout: 15000,
    });

    await page.getByRole('button', { name: /^Continue to Shipping$/i }).click();
    await page.waitForTimeout(500);

    await page.fill('#guest-name', 'John Doe');
    await page.fill('#guest-email', 'john@example.com');
    await page.fill('#guest-addressLineOne', '123 Main Street');
    await page.fill('#guest-city', 'San Francisco');
    await page.fill('#guest-state', 'CA');
    await page.fill('#guest-postalCode', '94105');
    const country = page.locator('#guest-country').first();
    if (await country.count()) {
      const tag = await country.evaluate(el => el.tagName.toLowerCase());
      if (tag === 'select') {
        await country
          .selectOption({ label: 'United States' })
          .catch(() => country.selectOption('US'));
      } else {
        await country.fill('United States');
      }
    }
    await page.getByRole('button', { name: /^Continue to Payment$/i }).click();
    await page.waitForTimeout(800);

    // Click a crypto option (ETH) to trigger order creation
    const ethBtn = page.getByText(/^ETH$/).first();
    await ethBtn.click({ timeout: 5000 }).catch(async () => {
      // Fallback: click first crypto option card
      const anyCrypto = page
        .locator('button')
        .filter({ hasText: /BTC|ETH|BNB|USDT/ })
        .first();
      await anyCrypto.click();
    });
    await page.waitForTimeout(1500);

    await page.screenshot({ path: `${OUT}/05-payment-instructions.png`, fullPage: true });
  });
});

// ── Order Status Pages ───────────────────────────────────────────────────────

test.describe('Guest Checkout Screenshots — Order Status', () => {
  test('05 — Awaiting payment', async ({ page }) => {
    await mockAppShell(page);
    await mockGuestAPIs(page, 'AWAITING_PAYMENT');

    await page.goto(`/guest-order/${MOCK_ORDER_TOKEN}`);
    await page.waitForTimeout(2500);

    await page.screenshot({ path: `${OUT}/06-order-awaiting-payment.png`, fullPage: true });
  });

  test('06 — Pending confirmation', async ({ page }) => {
    await mockAppShell(page);
    await mockGuestAPIs(page, 'PENDING_CONFIRMATION', {
      confirmations: 3,
      requiredConfirmations: 12,
      txHash: '0xabc123def456789012345678901234567890abcdef1234567890abcdef123456',
    });

    await page.goto(`/guest-order/${MOCK_ORDER_TOKEN}`);
    await page.waitForTimeout(2500);

    await page.screenshot({ path: `${OUT}/07-order-pending-confirmation.png`, fullPage: true });
  });

  test('07 — Funded', async ({ page }) => {
    await mockAppShell(page);
    await mockGuestAPIs(page, 'FUNDED', {
      confirmations: 12,
      requiredConfirmations: 12,
      txHash: '0xabc123def456789012345678901234567890abcdef1234567890abcdef123456',
    });

    await page.goto(`/guest-order/${MOCK_ORDER_TOKEN}`);
    await page.waitForTimeout(2500);

    await page.screenshot({ path: `${OUT}/08-order-funded.png`, fullPage: true });
  });

  test('08 — Fulfilled (tracking)', async ({ page }) => {
    await mockAppShell(page);
    await mockGuestAPIs(page, 'SHIPPED', {
      confirmations: 12,
      requiredConfirmations: 12,
      trackingNumber: 'UPS1234567890',
      carrier: 'UPS',
    });

    await page.goto(`/guest-order/${MOCK_ORDER_TOKEN}`);
    await page.waitForTimeout(2500);

    await page.screenshot({ path: `${OUT}/09-order-fulfilled.png`, fullPage: true });
  });

  test('09 — Expired', async ({ page }) => {
    await mockAppShell(page);
    await mockGuestAPIs(page, 'EXPIRED', { expiresAt: new Date(Date.now() - 60000).toISOString() });

    await page.goto(`/guest-order/${MOCK_ORDER_TOKEN}`);
    await page.waitForTimeout(2500);

    await page.screenshot({ path: `${OUT}/10-order-expired.png`, fullPage: true });
  });

  test('10 — Invalid token / not found', async ({ page }) => {
    await mockAppShell(page);
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
    await page.waitForTimeout(2500);

    await page.screenshot({ path: `${OUT}/11-order-invalid-token.png`, fullPage: true });
  });
});

// ── Seller Admin ─────────────────────────────────────────────────────────────

test.describe('Guest Checkout Screenshots — Seller Admin', () => {
  test('11 — Admin settings (enabled)', async ({ page }) => {
    await setupMockAuth(page);
    await mockGuestAPIs(page);

    await page.goto('/admin/settings/guest-checkout');
    await expect(page.locator('[data-testid="admin-guest-checkout"]')).toBeVisible({
      timeout: 15000,
    });
    await page.waitForTimeout(800);

    await page.screenshot({ path: `${OUT}/12-admin-settings-enabled.png`, fullPage: true });
  });

  test('12 — Admin settings (disabled after toggle)', async ({ page }) => {
    await setupMockAuth(page);
    await mockGuestAPIs(page);

    await page.goto('/admin/settings/guest-checkout');
    await expect(page.locator('[data-testid="admin-guest-checkout"]')).toBeVisible({
      timeout: 15000,
    });
    await page.waitForTimeout(500);

    await page.getByRole('switch').first().click();
    await page.waitForTimeout(300);

    await page.screenshot({ path: `${OUT}/13-admin-settings-disabled.png`, fullPage: true });
  });

  test('13 — Admin settings (saved)', async ({ page }) => {
    await setupMockAuth(page);
    await mockGuestAPIs(page);

    await page.goto('/admin/settings/guest-checkout');
    await expect(page.locator('[data-testid="admin-guest-checkout"]')).toBeVisible({
      timeout: 15000,
    });
    await page.waitForTimeout(500);

    const saveBtn = page.getByRole('button', { name: /save|保存/i }).first();
    await saveBtn.click();
    await page.waitForTimeout(800);

    await page.screenshot({ path: `${OUT}/14-admin-settings-saved.png`, fullPage: true });
  });
});

// ── Empty State ──────────────────────────────────────────────────────────────

test.describe('Guest Checkout Screenshots — Edge Cases', () => {
  test('14 — Empty cart', async ({ page }) => {
    await page.addInitScript(
      `localStorage.setItem('guest-cart-storage', JSON.stringify({ state: { items: [] }, version: 0 }));`
    );
    await mockAppShell(page);
    await mockGuestAPIs(page);

    await page.goto('/guest-checkout');
    await page.waitForTimeout(1500);

    await page.screenshot({ path: `${OUT}/15-empty-cart.png`, fullPage: true });
  });
});
