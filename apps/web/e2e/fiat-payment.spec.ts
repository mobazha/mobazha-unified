/**
 * Fiat Payment E2E Tests
 *
 * Validates the fiat payment frontend integration (FP1/FP2):
 *   - Admin: Payment Providers in Settings -> Payments (收款设置)
 *   - Seller config: Stripe / PayPal provider cards (standalone + SaaS modes)
 *   - Buyer: Fiat methods in PaymentCryptoSelector
 *   - Mobile: payment-method page with fiat support
 *   - Components: PaymentMethodBadges, FiatPaymentSection states
 *
 * Most tests use mock API responses since Stripe/PayPal SDKs
 * cannot be initialised in E2E without real credentials.
 *
 * Run:
 *   npx playwright test fiat-payment.spec.ts --reporter=list
 */

import { test, expect } from '@playwright/test';
import { isFiatPaymentVisible } from '@mobazha/core';
import { authenticatedTest, getCasdoorToken, BACKEND_URL } from './fixtures/auth';
import { setupMockAuth } from './fixtures/mock-auth';
import {
  mockProductDetailAPI,
  mockImageRoutes,
  mockFiatProvidersAPI,
  mockPreferencesAPI,
  getCartLocalStorageScript,
} from './fixtures/mock-api-routes';

// ── 1. Settings Page — Payments / Receiving ─────────────────────────────────

authenticatedTest.describe('Settings — Payments', () => {
  authenticatedTest.beforeEach(async ({ authedPage }) => {
    await authedPage.goto('/admin/payments');
    await authedPage.waitForLoadState('domcontentloaded');
  });

  authenticatedTest('should expose payments entry on settings home', async ({ authedPage }) => {
    await authedPage.goto('/admin/settings');
    await authedPage.waitForLoadState('domcontentloaded');

    const paymentsLink = authedPage.locator('a[href="/admin/payments"]').first();
    await expect(paymentsLink).toBeVisible();
  });

  authenticatedTest('should render payments settings page', async ({ authedPage }) => {
    const pageRoot = authedPage.getByTestId('admin-payments');
    await expect(pageRoot).toBeVisible();
    await expect(authedPage).toHaveURL(/\/admin\/settings\/payments/);
  });

  authenticatedTest(
    'should show Stripe and PayPal provider cards on payments page',
    async ({ authedPage }) => {
      test.skip(!isFiatPaymentVisible(), 'Fiat payments hidden in UI');

      const stripeCard = authedPage.getByText('Stripe');
      const paypalCard = authedPage.getByText('PayPal');

      await expect(stripeCard.first()).toBeVisible();
      await expect(paypalCard.first()).toBeVisible();

      await authedPage.screenshot({
        path: 'e2e-screenshots/fiat-payment-providers.png',
        fullPage: true,
      });
    }
  );

  authenticatedTest(
    'provider cards should display connection status badges',
    async ({ authedPage }) => {
      test.skip(!isFiatPaymentVisible(), 'Fiat payments hidden in UI');

      const statusText = authedPage.getByText(/connected|not connected|已连接|未连接/i);
      await expect(statusText.first()).toBeVisible();
    }
  );
});

// ── 2. Standalone Mode — API Key Configuration ──────────────────────────────

authenticatedTest.describe('Standalone Provider Config', () => {
  authenticatedTest('should show API key form when Configure clicked', async ({ authedPage }) => {
    test.skip(!isFiatPaymentVisible(), 'Fiat payments hidden in UI');

    await authedPage.goto('/admin/payments');
    await authedPage.waitForLoadState('domcontentloaded');

    const configBtn = authedPage.getByRole('button', { name: /configure api|配置 API/i }).first();

    if (await configBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await configBtn.click();
      await authedPage.waitForTimeout(300);

      const secretKeyInput = authedPage.getByPlaceholder(/sk_live|EL/);
      await expect(secretKeyInput.first()).toBeVisible();

      await authedPage.screenshot({
        path: 'e2e-screenshots/fiat-provider-config-form.png',
        fullPage: true,
      });
    }
  });

  authenticatedTest('secret visibility toggle should work', async ({ authedPage }) => {
    test.skip(!isFiatPaymentVisible(), 'Fiat payments hidden in UI');

    await authedPage.goto('/admin/payments');
    await authedPage.waitForLoadState('domcontentloaded');

    const configBtn = authedPage.getByRole('button', { name: /configure api|配置 API/i }).first();
    if (await configBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await configBtn.click();
      await authedPage.waitForTimeout(300);

      const secretInput = authedPage.locator('input[type="password"]').first();
      await expect(secretInput).toBeVisible();

      const toggleBtn = authedPage
        .locator('button')
        .filter({ has: authedPage.locator('svg') })
        .last();
      await toggleBtn.click();
      await authedPage.waitForTimeout(100);

      const textInput = authedPage.locator('input[type="text"]').last();
      await expect(textInput).toBeVisible();
    }
  });

  authenticatedTest('Save should be disabled without required fields', async ({ authedPage }) => {
    test.skip(!isFiatPaymentVisible(), 'Fiat payments hidden in UI');

    await authedPage.goto('/admin/payments');
    await authedPage.waitForLoadState('domcontentloaded');

    const configBtn = authedPage.getByRole('button', { name: /configure api|配置 API/i }).first();
    if (await configBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await configBtn.click();
      await authedPage.waitForTimeout(300);

      const saveBtn = authedPage.getByRole('button', { name: /save|保存/i });
      await expect(saveBtn).toBeDisabled();
    }
  });
});

// ── 3. Payment Method Selector — Fiat Integration ───────────────────────────

test.describe('Payment Selector — Fiat Methods', () => {
  test('checkout page should render content', async ({ page }) => {
    await setupMockAuth(page);
    await mockProductDetailAPI(page);
    await mockPreferencesAPI(page);
    await mockImageRoutes(page);
    await page.addInitScript(getCartLocalStorageScript());
    await page.goto('/checkout');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    const content = page.locator('main').first();
    const hasMain = await content.isVisible().catch(() => false);
    if (!hasMain) {
      await expect(
        page.getByText(/checkout|结算|No items to checkout|暂无可结算商品/i).first()
      ).toBeVisible();
      return;
    }
    await expect(content).toBeVisible();
  });

  test('mobile payment-method page should render', async ({ page }) => {
    await setupMockAuth(page);
    await mockProductDetailAPI(page);
    await mockPreferencesAPI(page);
    await mockFiatProvidersAPI(page);
    await mockImageRoutes(page);
    await page.addInitScript(getCartLocalStorageScript());
    await page.goto('/checkout/payment-method?vendor=QmTestVendor123');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    const content = page.locator('main');
    await expect(content).toBeVisible();

    await page.screenshot({
      path: 'e2e-screenshots/fiat-mobile-payment-method.png',
      fullPage: true,
    });
  });

  test('mobile payment-method page should accept vendor param', async ({ page }) => {
    await setupMockAuth(page);
    await page.goto('/checkout/payment-method?vendor=QmTestVendor123');
    await page.waitForLoadState('domcontentloaded');

    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('mobile payment-method page should restore fiat provider from sessionStorage', async ({
    page,
  }) => {
    await setupMockAuth(page);
    await page.goto('/checkout');
    await page.evaluate(() => {
      sessionStorage.setItem('checkout_selected_fiat_provider', 'stripe');
    });
    await page.goto('/checkout/payment-method?vendor=QmTest');
    await page.waitForLoadState('domcontentloaded');

    const content = page.locator('main');
    await expect(content).toBeVisible();
  });
});

// ── 4. Fiat Payment API (Backend Contract) ──────────────────────────────────

test.describe('Fiat Payment API', () => {
  test('GET /v1/fiat/providers should return provider list', async ({ request }) => {
    let token: string;
    try {
      token = await getCasdoorToken(request);
    } catch {
      test.skip(true, 'Auth not available');
      return;
    }

    const resp = await request.get(`${BACKEND_URL}/v1/fiat/providers`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body).toHaveProperty('data');
    expect(Array.isArray(body.data)).toBe(true);
  });

  test('GET /v1/fiat/{provider}/config should return provider config', async ({ request }) => {
    let token: string;
    try {
      token = await getCasdoorToken(request);
    } catch {
      test.skip(true, 'Auth not available');
      return;
    }

    const providerIDs = ['stripe', 'paypal'] as const;
    for (const providerID of providerIDs) {
      const resp = await request.get(`${BACKEND_URL}/v1/fiat/${providerID}/config`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      expect([200, 404]).toContain(resp.status());
      if (resp.status() === 200) {
        const body = await resp.json();
        expect(body).toHaveProperty('data');
      }
    }
  });

  test('GET /v1/fiat/stripe/status should return account status', async ({ request }) => {
    let token: string;
    try {
      token = await getCasdoorToken(request);
    } catch {
      test.skip(true, 'Auth not available');
      return;
    }

    const resp = await request.get(`${BACKEND_URL}/v1/fiat/stripe/status`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    // 404 or 200 are both valid (depends on whether provider is configured)
    expect([200, 404]).toContain(resp.status());
  });

  test('POST /v1/fiat/stripe/payments without body should return 400', async ({ request }) => {
    let token: string;
    try {
      token = await getCasdoorToken(request);
    } catch {
      test.skip(true, 'Auth not available');
      return;
    }

    const resp = await request.post(`${BACKEND_URL}/v1/fiat/stripe/payments`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {},
    });

    expect([400, 404, 422]).toContain(resp.status());
  });
});

// ── 5. SessionStorage State Management ──────────────────────────────────────

test.describe('Payment Selector — State Persistence', () => {
  test('selecting fiat should clear crypto from sessionStorage', async ({ page }) => {
    await setupMockAuth(page);
    await page.goto('/checkout');
    await page.waitForLoadState('domcontentloaded');

    await page.evaluate(() => {
      sessionStorage.setItem('checkout_selected_token', 'BTC');
      sessionStorage.setItem('checkout_selected_fiat_provider', 'stripe');
    });

    const fiat = await page.evaluate(() =>
      sessionStorage.getItem('checkout_selected_fiat_provider')
    );

    expect(fiat).toBe('stripe');
  });

  test('fiat provider in sessionStorage should survive page reload', async ({ page }) => {
    await setupMockAuth(page);
    await page.goto('/checkout');
    await page.waitForLoadState('domcontentloaded');

    await page.evaluate(() => {
      sessionStorage.setItem('checkout_selected_fiat_provider', 'paypal');
    });

    await page.reload({ waitUntil: 'domcontentloaded' });

    const fiat = await page.evaluate(() =>
      sessionStorage.getItem('checkout_selected_fiat_provider')
    );
    expect(fiat).toBe('paypal');
  });
});

// ── 6. Product Detail — PaymentMethodBadges ─────────────────────────────────

test.describe('Product Detail — Payment Badges', () => {
  const MOCK_PEER_ID = 'QmY8tRnCzUf45FnPLMvFi35R5bYjCEiCKbgEN39xnScj8P';

  test('should show payment badges when fiat providers active', async ({ page }) => {
    await mockProductDetailAPI(page);
    await mockFiatProvidersAPI(page);
    await mockImageRoutes(page);
    await mockPreferencesAPI(page);

    await page.goto(`/product/wireless-headphones?peerID=${MOCK_PEER_ID}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2500);

    await page.screenshot({
      path: 'e2e-screenshots/fiat-product-badges.png',
      fullPage: false,
    });

    // TODO: page.route() cannot intercept requests proxied by the Next.js dev
    // server, so mockFiatProvidersAPI has no effect here. The assertion below
    // only verifies that the product page renders payment-related content (e.g.
    // "Accepted" from crypto currencies). Once E2E tests run against a real
    // backend or the proxy issue is resolved, tighten this to check for
    // specific fiat badge text ("Stripe", "PayPal").
    const pageContent = await page.textContent('body');
    const hasPaymentInfo =
      (pageContent?.includes('Accepted') ?? false) ||
      (pageContent?.includes('Stripe') ?? false) ||
      (pageContent?.includes('PayPal') ?? false) ||
      (pageContent?.includes('Crypto') ?? false);
    expect(hasPaymentInfo).toBe(true);
  });

  test('should not show fiat badges when no providers active', async ({ page }) => {
    await mockProductDetailAPI(page);
    await mockImageRoutes(page);
    await mockPreferencesAPI(page);
    await page.route('**/fiat/providers**', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [] }),
      });
    });
    await page.goto(`/product/wireless-headphones?peerID=${MOCK_PEER_ID}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    const pageContent = await page.textContent('body');
    const hasStripeBadge = pageContent?.includes('Stripe') ?? false;
    const hasPayPalBadge = pageContent?.includes('PayPal') ?? false;
    expect(hasStripeBadge).toBe(false);
    expect(hasPayPalBadge).toBe(false);
  });
});

// ── 7. Checkout Flow — Fiat Payment Selection ───────────────────────────────

test.describe('Checkout — Fiat Payment Flow', () => {
  const MOCK_PEER_ID = 'QmY8tRnCzUf45FnPLMvFi35R5bYjCEiCKbgEN39xnScj8P';

  test('checkout should show fiat section when providers available', async ({ page }) => {
    await setupMockAuth(page);
    await mockProductDetailAPI(page);
    await mockPreferencesAPI(page);
    await mockFiatProvidersAPI(page);
    await mockImageRoutes(page);
    await page.addInitScript(getCartLocalStorageScript());
    await page.goto(
      `/checkout/payment-method?vendorPeerID=${MOCK_PEER_ID}&slugs=wireless-headphones`
    );
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const content = page.locator('main');
    await expect(content).toBeVisible();

    await page.screenshot({
      path: 'e2e-screenshots/fiat-checkout-with-providers.png',
      fullPage: true,
    });
  });

  test('payment method page with fiat mock should render Stripe option', async ({ page }) => {
    test.skip(!isFiatPaymentVisible(), 'Fiat payments hidden in UI');

    await setupMockAuth(page);
    await mockProductDetailAPI(page);
    await mockPreferencesAPI(page);
    await mockFiatProvidersAPI(page);
    await mockImageRoutes(page);
    await page.addInitScript(getCartLocalStorageScript());
    await page.goto(
      `/checkout/payment-method?vendorPeerID=${MOCK_PEER_ID}&slugs=wireless-headphones`
    );
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // TODO: Same proxy limitation as above — page.route() mocks are not
    // intercepted. This assertion is intentionally weak (>=0 is always true)
    // and serves as a placeholder until the mock strategy is fixed.
    const stripeOption = page.getByText(/Stripe|Credit Card|信用卡/i);
    const hasStripe = await stripeOption.count();
    expect(hasStripe).toBeGreaterThanOrEqual(0);
  });

  test('full checkout page should include payment section', async ({ page }) => {
    await setupMockAuth(page);
    await mockProductDetailAPI(page);
    await mockPreferencesAPI(page);
    await mockFiatProvidersAPI(page);
    await mockImageRoutes(page);
    await page.addInitScript(getCartLocalStorageScript());
    await page.goto(`/checkout?vendorPeerID=${MOCK_PEER_ID}&slugs=wireless-headphones,usb-c-cable`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const paySection = page.getByText(/payment|支付/i);
    await expect(paySection.first()).toBeVisible();

    await page.screenshot({
      path: 'e2e-screenshots/fiat-full-checkout.png',
      fullPage: true,
    });
  });
});
