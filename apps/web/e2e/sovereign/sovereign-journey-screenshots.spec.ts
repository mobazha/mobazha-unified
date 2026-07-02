/**
 * Sovereign Journey Screenshots — Mock-First (Layer A)
 *
 * Captures screenshots of the full Sovereign buyer + seller journey
 * using mocked API routes. No backend dependency.
 *
 * Covers:
 *  1. Admin password login page
 *  2. Dashboard (empty + with products)
 *  3. Guest Checkout flow: cart → shipping → runtime coin selection → payment
 *  4. Order status pages (LTC): awaiting → detected → funded → shipped → completed → expired
 *  5. Buyer product browsing
 *  6. Settings → Guest Checkout config
 *
 * Output: test-results/screenshots/sovereign/
 *
 * Run:
 *   pnpm test:e2e:sovereign:dev   # fast iteration
 *   pnpm test:e2e:sovereign        # prod build
 */

import { test, expect } from '@playwright/test';
import { setupSovereignMockAuth } from './fixtures/sovereign-auth';
import {
  mockSovereignAppShell,
  mockSovereignGuestAPIs,
  mockSovereignListingsAPI,
  injectSovereignCart,
  MOCK_ORDER_TOKEN,
} from './fixtures/sovereign-mock-routes';

const OUT = 'test-results/screenshots/sovereign';

// ── 1. Admin Login Page ─────────────────────────────────────────────────────

test.describe('Sovereign Screenshots — Admin Login', () => {
  test('01 — Password login page', async ({ page }) => {
    await mockSovereignAppShell(page);

    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    await page.screenshot({ path: `${OUT}/01-admin-login.png`, fullPage: true });
  });
});

// ── 2. Dashboard ────────────────────────────────────────────────────────────

test.describe('Sovereign Screenshots — Dashboard', () => {
  test('02 — Dashboard empty store', async ({ page }) => {
    await setupSovereignMockAuth(page);

    await page.goto('/admin');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    await page.screenshot({ path: `${OUT}/02-dashboard-empty.png`, fullPage: true });
  });

  test('03 — Dashboard with products', async ({ page }) => {
    await setupSovereignMockAuth(page);
    await mockSovereignListingsAPI(page);

    await page.goto('/admin');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    await page.screenshot({ path: `${OUT}/03-dashboard-products.png`, fullPage: true });
  });
});

// ── 3. Guest Checkout Buyer Journey (LTC) ───────────────────────────────────

test.describe('Sovereign Screenshots — Guest Checkout LTC Journey', () => {
  test.describe.configure({ mode: 'serial' });

  test('04 — Cart review', async ({ page }) => {
    await injectSovereignCart(page);
    await mockSovereignAppShell(page);
    await mockSovereignGuestAPIs(page, 'LTC');

    await page.goto('/guest-checkout');
    await expect(page.getByText('Encrypted USB Drive').first()).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(500);

    await page.screenshot({ path: `${OUT}/04-gc-cart-review.png`, fullPage: true });
  });

  test('05 — Shipping form', async ({ page }) => {
    await injectSovereignCart(page);
    await mockSovereignAppShell(page);
    await mockSovereignGuestAPIs(page, 'LTC');

    await page.goto('/guest-checkout');
    await expect(page.getByText('Encrypted USB Drive').first()).toBeVisible({ timeout: 15000 });

    await page.getByRole('button', { name: /Continue to Shipping/i }).click();
    await page.waitForTimeout(800);

    await page.fill('#guest-name', 'Anonymous Buyer');
    await page.fill('#guest-email', 'buyer@protonmail.com');
    await page.fill('#guest-addressLineOne', '456 Hidden Lane');
    await page.fill('#guest-city', 'Portland');
    await page.fill('#guest-state', 'OR');
    await page.fill('#guest-postalCode', '97201');
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

    await page.screenshot({ path: `${OUT}/05-gc-shipping-filled.png`, fullPage: true });
  });

  test('06 — Coin selection from runtime capabilities', async ({ page }) => {
    await injectSovereignCart(page);
    await mockSovereignAppShell(page);
    await mockSovereignGuestAPIs(page, 'LTC');

    await page.goto('/guest-checkout');
    await expect(page.getByText('Encrypted USB Drive').first()).toBeVisible({ timeout: 15000 });

    await page.getByRole('button', { name: /Continue to Shipping/i }).click();
    await page.waitForTimeout(500);

    await page.fill('#guest-name', 'Anonymous Buyer');
    await page.fill('#guest-email', 'buyer@protonmail.com');
    await page.fill('#guest-addressLineOne', '456 Hidden Lane');
    await page.fill('#guest-city', 'Portland');
    await page.fill('#guest-state', 'OR');
    await page.fill('#guest-postalCode', '97201');
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

    await page.getByRole('button', { name: /Continue to Payment/i }).click();
    await page.waitForTimeout(1000);

    await page.screenshot({ path: `${OUT}/06-gc-coin-selection.png`, fullPage: true });
  });

  test('07 — LTC payment instructions (via order page)', async ({ page }) => {
    await mockSovereignAppShell(page);
    await mockSovereignGuestAPIs(page, 'LTC', 'AWAITING_PAYMENT');

    await page.goto(`/guest-order/${MOCK_ORDER_TOKEN}`);
    await page.waitForTimeout(2500);

    await page.screenshot({ path: `${OUT}/07-gc-ltc-payment-instructions.png`, fullPage: true });
  });
});

// ── 4. LTC Order Status Pages ───────────────────────────────────────────────

test.describe('Sovereign Screenshots — LTC Order Status', () => {
  test('08 — Awaiting payment (LTC)', async ({ page }) => {
    await mockSovereignAppShell(page);
    await mockSovereignGuestAPIs(page, 'LTC', 'AWAITING_PAYMENT');

    await page.goto(`/guest-order/${MOCK_ORDER_TOKEN}`);
    await page.waitForTimeout(2500);

    await page.screenshot({ path: `${OUT}/08-ltc-awaiting-payment.png`, fullPage: true });
  });

  test('09 — Payment detected (LTC)', async ({ page }) => {
    await mockSovereignAppShell(page);
    await mockSovereignGuestAPIs(page, 'LTC', 'PAYMENT_DETECTED', {
      confirmations: 2,
      requiredConfs: 6,
      chainBlockTimeSec: 150,
    });

    await page.goto(`/guest-order/${MOCK_ORDER_TOKEN}`);
    await page.waitForTimeout(2500);

    await page.screenshot({ path: `${OUT}/09-ltc-payment-detected.png`, fullPage: true });
  });

  test('10 — Funded (LTC)', async ({ page }) => {
    await mockSovereignAppShell(page);
    await mockSovereignGuestAPIs(page, 'LTC', 'FUNDED', {
      confirmations: 6,
      requiredConfs: 6,
      chainBlockTimeSec: 150,
    });

    await page.goto(`/guest-order/${MOCK_ORDER_TOKEN}`);
    await page.waitForTimeout(2500);

    await page.screenshot({ path: `${OUT}/10-ltc-funded.png`, fullPage: true });
  });

  test('11 — Shipped (LTC)', async ({ page }) => {
    await mockSovereignAppShell(page);
    await mockSovereignGuestAPIs(page, 'LTC', 'SHIPPED', {
      confirmations: 6,
      requiredConfs: 6,
      trackingNumber: 'PRIVSHIP123456',
    });

    await page.goto(`/guest-order/${MOCK_ORDER_TOKEN}`);
    await page.waitForTimeout(2500);

    await page.screenshot({ path: `${OUT}/11-ltc-shipped.png`, fullPage: true });
  });

  test('12 — Completed (LTC)', async ({ page }) => {
    await mockSovereignAppShell(page);
    await mockSovereignGuestAPIs(page, 'LTC', 'COMPLETED', {
      confirmations: 6,
      requiredConfs: 6,
    });

    await page.goto(`/guest-order/${MOCK_ORDER_TOKEN}`);
    await page.waitForTimeout(2500);

    await page.screenshot({ path: `${OUT}/12-ltc-completed.png`, fullPage: true });
  });

  test('13 — Expired (LTC)', async ({ page }) => {
    await mockSovereignAppShell(page);
    await mockSovereignGuestAPIs(page, 'LTC', 'EXPIRED', {
      expiresAt: new Date(Date.now() - 60000).toISOString(),
    });

    await page.goto(`/guest-order/${MOCK_ORDER_TOKEN}`);
    await page.waitForTimeout(2500);

    await page.screenshot({ path: `${OUT}/13-ltc-expired.png`, fullPage: true });
  });
});

// ── 6. Buyer Product Browsing ───────────────────────────────────────────────

test.describe('Sovereign Screenshots — Buyer Browsing', () => {
  test('19 — Store homepage (buyer view)', async ({ page }) => {
    await mockSovereignAppShell(page);
    await mockSovereignListingsAPI(page);

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    await page.screenshot({ path: `${OUT}/19-buyer-store-homepage.png`, fullPage: true });
  });

  test('20 — Product detail (buyer view)', async ({ page }) => {
    await mockSovereignAppShell(page);
    await mockSovereignListingsAPI(page);

    await page.goto(`/store/${MOCK_ORDER_TOKEN}/encrypted-usb-64gb`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    await page.screenshot({ path: `${OUT}/20-buyer-product-detail.png`, fullPage: true });
  });
});

// ── 7. Settings — Guest Checkout ────────────────────────────────────────────

test.describe('Sovereign Screenshots — Settings', () => {
  test('21 — Guest Checkout settings (enabled)', async ({ page }) => {
    await setupSovereignMockAuth(page);
    await mockSovereignGuestAPIs(page, 'LTC');

    await page.goto('/admin/settings/policies');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    await page.screenshot({ path: `${OUT}/21-settings-guest-checkout.png`, fullPage: true });
  });

  test('22 — General settings', async ({ page }) => {
    await setupSovereignMockAuth(page);

    await page.goto('/admin/settings');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    await page.screenshot({ path: `${OUT}/22-settings-general.png`, fullPage: true });
  });
});
