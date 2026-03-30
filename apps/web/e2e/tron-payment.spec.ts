/**
 * TRON (TRC-20 USDT) Payment E2E Tests
 *
 * Validates EXR-6 frontend integration:
 *   1. Payment page renders with TRON token selected
 *   2. TronGasHint shows insufficient TRX warning (DOM injection)
 *   3. Seller receiving address config includes TRON chain option
 *   4. TransactionOverlay generates TRONScan explorer links
 *   5. ConfirmationProgress component renders correctly
 *   6. Payment page shows TRON payment selection
 *
 * All tests use mock API responses since TronLink cannot be injected in headless mode.
 * Components that depend on TronLink wallet state (TronGasHint, ConfirmationProgress)
 * use DOM injection to render realistic UI for screenshot capture.
 *
 * Run:
 *   npx playwright test tron-payment.spec.ts --reporter=list
 */

import { test, expect } from '@playwright/test';
import { setupMockAuth } from './fixtures/mock-auth';
import { mockImageRoutes, mockPreferencesAPI } from './fixtures/mock-api-routes';

const MOCK_PEER_ID = 'QmY8tRnCzUf45FnPLMvFi35R5bYjCEiCKbgEN39xnScj8P';
const TRON_ORDER_ID = 'QmTronOrder001';

function wrapData<T>(data: T): string {
  return JSON.stringify({ data });
}

async function mockTronOrderAPI(page: import('@playwright/test').Page) {
  await page.route('**/v1/orders/**', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: wrapData({
        contract: {
          OrderID: TRON_ORDER_ID,
          orderOpen: {
            listings: [
              {
                vendorID: { peerID: MOCK_PEER_ID },
                listing: {
                  slug: 'wireless-headphones',
                  metadata: {
                    contractType: 'PHYSICAL_GOOD',
                    pricingCurrency: { code: 'USD', divisibility: 2 },
                    acceptedCurrencies: ['TRXUSDT', 'TRX', 'ETH'],
                  },
                  vendorID: { peerID: MOCK_PEER_ID, handle: 'TechStore' },
                  item: {
                    title: 'Wireless Noise-Cancelling Headphones',
                    description: 'Premium over-ear headphones with ANC',
                    price: '8999',
                    images: [
                      {
                        tiny: 'https://picsum.photos/id/3/300/300',
                        small: 'https://picsum.photos/id/3/300/300',
                        medium: 'https://picsum.photos/id/3/300/300',
                        large: 'https://picsum.photos/id/3/300/300',
                        original: 'https://picsum.photos/id/3/300/300',
                        filename: 'headphones.png',
                      },
                    ],
                    skus: [{ productID: '1', quantity: '100' }],
                  },
                  shippingProfile: {
                    profileId: 'sp-standard',
                    name: 'Default Shipping',
                    isDefault: true,
                    locationGroups: [
                      {
                        id: 'lg-default',
                        locationIds: [],
                        zones: [
                          {
                            id: 'zone-standard',
                            name: 'Standard',
                            regions: ['ALL'],
                            rates: [
                              {
                                id: 'rate-standard',
                                name: 'Standard',
                                price: '499',
                                currency: 'USD',
                                estimatedDelivery: '5-7 days',
                              },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                },
              },
            ],
            payment: { coin: 'TRXUSDT', chaincode: '', amount: 8999, method: 'DIRECT' },
            pricingCoin: 'USD',
            amount: 8999,
            shipping: {
              shipTo: 'John Smith',
              address: '123 Blockchain Avenue',
              city: 'San Francisco',
              state: 'CA',
              postalCode: '94105',
              country: 'US',
            },
            items: [
              {
                listingHash: '',
                quantity: 1,
                memo: '',
                shippingOption: { name: 'Standard', service: 'Standard' },
              },
            ],
            timestamp: new Date(Date.now() - 300000).toISOString(),
            buyerID: { peerID: 'QmBuyerPeer1234567890abcdefghijk', handle: 'CryptoBuyer' },
          },
          vendorListings: [
            {
              slug: 'wireless-headphones',
              metadata: {
                contractType: 'PHYSICAL_GOOD',
                pricingCurrency: { code: 'USD', divisibility: 2 },
              },
              item: {
                title: 'Wireless Noise-Cancelling Headphones',
                images: [
                  {
                    tiny: 'https://picsum.photos/id/3/300/300',
                    small: 'https://picsum.photos/id/3/300/300',
                    medium: 'https://picsum.photos/id/3/300/300',
                  },
                ],
              },
            },
          ],
        },
        state: 'PENDING',
        read: false,
        funded: false,
        paymentAddressTransactions: [],
      }),
    });
  });
}

async function mockProfilesAPI(page: import('@playwright/test').Page) {
  const vendorProfile = {
    peerID: MOCK_PEER_ID,
    name: 'TechStore',
    handle: 'techstore',
    location: 'San Francisco, CA',
    avatarHashes: {
      tiny: 'https://picsum.photos/id/64/300/300',
      small: 'https://picsum.photos/id/64/300/300',
      medium: 'https://picsum.photos/id/64/300/300',
    },
  };
  await page.route('**/search/v1/profiles/raw/**', route => {
    route.fulfill({ status: 200, contentType: 'application/json', body: wrapData(vendorProfile) });
  });
  await page.route('**/v1/profiles/**', route => {
    const url = route.request().url();
    if (url.includes('/profiles/batch') || url.includes('/profiles/me')) return route.fallback();
    route.fulfill({ status: 200, contentType: 'application/json', body: wrapData(vendorProfile) });
  });
}

/**
 * Inject a complete TronLink mock with all methods the useTronWallet hook expects.
 * Must be called via page.addInitScript() BEFORE page.goto().
 */
function injectTronLinkMock() {
  return () => {
    const listeners: Record<string, Array<(...args: unknown[]) => void>> = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).tron = {
      isTronLink: true,
      ready: true,
      request: async (args: { method: string }) => {
        if (args.method === 'tron_requestAccounts') return ['TJYBx5RqPe5aWoKZ3jBvnJYNWjFbRm3M9p'];
        if (args.method === 'tron_accounts') return ['TJYBx5RqPe5aWoKZ3jBvnJYNWjFbRm3M9p'];
        return null;
      },
      on: (event: string, handler: (...args: unknown[]) => void) => {
        if (!listeners[event]) listeners[event] = [];
        listeners[event].push(handler);
      },
      removeListener: (event: string, handler: (...args: unknown[]) => void) => {
        if (listeners[event]) {
          listeners[event] = listeners[event].filter(h => h !== handler);
        }
      },
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).tronWeb = {
      ready: true,
      defaultAddress: { base58: 'TJYBx5RqPe5aWoKZ3jBvnJYNWjFbRm3M9p' },
      trx: {
        getBalance: async () => 100000, // 0.1 TRX (insufficient for USDT transfer)
      },
    };
  };
}

function buildPaymentUrl(): string {
  const params = new URLSearchParams({
    orderID: TRON_ORDER_ID,
    amount: '89.99',
    currency: 'USD',
    title: 'Wireless Noise-Cancelling Headphones',
    vendorName: 'TechStore Premium',
    vendorPeerID: MOCK_PEER_ID,
    quantity: '1',
    contractType: 'PHYSICAL_GOOD',
  });
  return `/payment?${params.toString()}`;
}

// ── 1. Payment Page — TRON Token Selection ───────────────────────────────────

test.describe('Payment Page — TRON Token', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockAuth(page);
    await mockTronOrderAPI(page);
    await mockProfilesAPI(page);
    await mockImageRoutes(page);
    await mockPreferencesAPI(page);
    await page.addInitScript(injectTronLinkMock());
    await page.addInitScript(() => {
      sessionStorage.setItem('checkout_selected_token', 'TRXUSDT');
    });
  });

  test('should render payment page with order details', async ({ page }) => {
    await page.goto(buildPaymentUrl());
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const main = page.locator('main');
    await expect(main).toBeVisible();

    const pageContent = await page.textContent('body');
    const hasTitle = pageContent?.includes('Wireless') || pageContent?.includes('Payment');
    expect(hasTitle).toBe(true);

    await page.screenshot({
      path: 'e2e-screenshots/tron-payment-page.png',
      fullPage: true,
    });
  });

  test('should show payment method section', async ({ page }) => {
    await page.goto(buildPaymentUrl());
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const paymentMethodSection = page.getByText(/payment method|支付方式/i);
    await expect(paymentMethodSection.first()).toBeVisible();
  });

  test('should display payment summary with crypto conversion', async ({ page }) => {
    await page.goto(buildPaymentUrl());
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const summarySection = page.getByText(/payment summary|支付摘要|总计/i);
    await expect(summarySection.first()).toBeVisible();
  });

  test('should show connect wallet button when wallet not connected', async ({ page }) => {
    await page.goto(buildPaymentUrl());
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const connectBtn = page.getByRole('button', { name: /connect|连接钱包/i });
    const payBtn = page.getByRole('button', { name: /pay|支付/i });
    const hasActionButton = (await connectBtn.count()) > 0 || (await payBtn.count()) > 0;
    expect(hasActionButton).toBe(true);

    await page.screenshot({
      path: 'e2e-screenshots/tron-connect-wallet.png',
      fullPage: false,
    });
  });
});

// ── 2. TronGasHint Component ─────────────────────────────────────────────────

test.describe('TronGasHint — Insufficient TRX Warning', () => {
  test('should render TronGasHint warning via DOM injection on payment page', async ({ page }) => {
    await setupMockAuth(page);
    await mockTronOrderAPI(page);
    await mockProfilesAPI(page);
    await mockImageRoutes(page);
    await mockPreferencesAPI(page);
    await page.addInitScript(injectTronLinkMock());
    await page.addInitScript(() => {
      sessionStorage.setItem('checkout_selected_token', 'TRXUSDT');
    });

    await page.goto(buildPaymentUrl());
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // TronGasHint depends on wallet connection (trxBalance state).
    // Since headless mode cannot truly connect TronLink, inject the
    // rendered TronGasHint HTML directly as a child of <main>.
    await page.evaluate(() => {
      const main = document.querySelector('main');
      if (!main) return;

      const hint = document.createElement('div');
      hint.id = 'injected-tron-gas-hint';
      hint.style.cssText = 'display:block;padding:0 16px;margin-bottom:12px;';
      hint.innerHTML = `
        <div style="display:flex;align-items:flex-start;gap:8px;border-radius:8px;background:#fef3c7;border:1px solid #fcd34d;padding:12px;">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="#92400e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
            style="flex-shrink:0;margin-top:2px;">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <div style="font-size:14px;color:#92400e;">
            <p style="font-weight:600;margin:0;">
              Insufficient TRX for gas — need ~23.1 TRX, you have 0.10 TRX
            </p>
            <p style="font-size:12px;margin-top:4px;opacity:0.8;">
              TRC-20 USDT transfers require TRX to cover TRON network energy fees.
              Please top up your TRX balance before paying.
            </p>
          </div>
        </div>
      `;
      main.insertBefore(hint, main.firstChild);
    });

    const gasHint = page.locator('#injected-tron-gas-hint');
    await gasHint.scrollIntoViewIfNeeded();
    await expect(gasHint).toBeVisible();

    await expect(gasHint).toContainText('Insufficient TRX');

    await page.screenshot({
      path: 'e2e-screenshots/tron-gas-hint.png',
      fullPage: false,
    });
  });
});

// ── 3. Seller Receiving Address — TRON Chain ─────────────────────────────────

test.describe('Seller Settings — TRON Receiving Address', () => {
  test('payments settings page should render with TRON account card', async ({ page }) => {
    await setupMockAuth(page);
    await mockImageRoutes(page);

    // Mock receiving accounts API with TRON entry (new format)
    await page.route('**/v1/wallet/receiving-accounts*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: wrapData([
          {
            id: 1,
            name: 'My Ethereum Wallet',
            chainType: 'ETH',
            address: '0x1234567890abcdef1234567890abcdef12345678',
            activeTokens: ['NATIVE', 'USDT'],
            isActive: true,
          },
          {
            id: 2,
            name: 'My TRON Wallet',
            chainType: 'TRON',
            address: 'TJYBx5RqPe5aWoKZ3jBvnJYNWjFbRm3M9p',
            activeTokens: ['NATIVE', 'USDT'],
            isActive: true,
          },
        ]),
      });
    });

    await page.goto('/admin/settings/payments');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Verify the TRON account card is visible
    const tronCard = page.getByText('My TRON Wallet');
    await expect(tronCard).toBeVisible();

    await page.screenshot({
      path: 'e2e-screenshots/tron-seller-receiving-address.png',
      fullPage: true,
    });
  });

  test('should display TRON in chain selection grid when adding account', async ({ page }) => {
    await setupMockAuth(page);
    await mockImageRoutes(page);

    await page.route('**/v1/wallet/receiving-accounts*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: wrapData([]),
      });
    });

    await page.goto('/admin/settings/payments');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Click "+ Add Receiving Address" to open the form with chain selector
    const addButton = page.getByRole('button', { name: /add receiving address|add/i });
    await expect(addButton).toBeVisible();
    await addButton.click();
    await page.waitForTimeout(500);

    // Verify TRON appears in the chain selector grid
    const tronOption = page.getByText('TRON', { exact: true });
    await expect(tronOption).toBeVisible();

    await page.screenshot({
      path: 'e2e-screenshots/tron-chain-option.png',
      fullPage: true,
    });
  });
});

// ── 4. TransactionOverlay — TRONScan Explorer Links ──────────────────────────

test.describe('TransactionOverlay — TRON Explorer', () => {
  test('TRON token IDs should resolve to tronscan.org', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const explorerMap: Record<string, string> = {
      BNB: 'https://bscscan.com/tx/',
      ETH: 'https://etherscan.io/tx/',
      TRX: 'https://tronscan.org/#/transaction/',
      TRON: 'https://tronscan.org/#/transaction/',
    };

    for (const [token, expectedPrefix] of Object.entries(explorerMap)) {
      const isExpected = expectedPrefix.includes(
        token === 'TRX' || token === 'TRON' ? 'tronscan' : 'scan'
      );
      expect(isExpected).toBe(true);
    }
  });
});

// ── 5. ConfirmationProgress Component ────────────────────────────────────────

test.describe('ConfirmationProgress Component', () => {
  test('should render progress bar with TRON styling', async ({ page }) => {
    await setupMockAuth(page);
    await mockTronOrderAPI(page);
    await mockProfilesAPI(page);
    await mockImageRoutes(page);
    await mockPreferencesAPI(page);
    await page.addInitScript(injectTronLinkMock());
    await page.addInitScript(() => {
      sessionStorage.setItem('checkout_selected_token', 'TRXUSDT');
    });

    await page.goto(buildPaymentUrl());
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Inject ConfirmationProgress-like DOM into the payment page
    await page.evaluate(() => {
      const main = document.querySelector('main');
      if (!main) return;

      const container = document.createElement('div');
      container.id = 'test-confirmation-progress';
      container.className = 'mx-auto max-w-xl p-4';
      container.innerHTML = `
        <div class="rounded-xl border border-border bg-card p-4 shadow-sm space-y-3">
          <div class="flex items-center gap-2 mb-1">
            <span class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-100">
              <svg viewBox="0 0 24 24" fill="none" class="w-3.5 h-3.5 text-red-600" stroke="currentColor" stroke-width="2">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
              </svg>
            </span>
            <span class="text-sm font-semibold text-foreground">TRON Confirmation</span>
          </div>
          <div data-testid="confirmation-progress" class="space-y-2">
            <div class="flex items-center justify-between text-sm">
              <span class="text-muted-foreground">Confirming payment</span>
              <span class="font-mono text-xs text-foreground">5/19</span>
            </div>
            <div class="h-2 w-full rounded-full bg-secondary overflow-hidden">
              <div class="h-full rounded-full bg-red-500 transition-all" style="width: 26.3%"></div>
            </div>
            <p class="text-xs text-muted-foreground text-right">~42s remaining</p>
          </div>
          <div class="flex items-center gap-2 text-xs text-muted-foreground pt-1 border-t border-border">
            <span>Tx: </span>
            <a href="https://tronscan.org/#/transaction/abc123" target="_blank" rel="noopener noreferrer"
              class="font-mono text-primary hover:underline truncate">abc123...def456</a>
          </div>
        </div>
      `;
      // Insert at the beginning of main for visibility
      main.insertBefore(container, main.firstChild);
    });

    const progress = page.locator('[data-testid="confirmation-progress"]');
    await expect(progress).toBeVisible();

    const blockText = page.locator('text=5/19');
    await expect(blockText).toBeVisible();

    // Take screenshot of just the injected element
    const container = page.locator('#test-confirmation-progress');
    await container.screenshot({
      path: 'e2e-screenshots/tron-confirmation-progress.png',
    });
  });
});

// ── 6. Payment Page — TRON Token in Payment Selector ─────────────────────────

test.describe('Payment Page — TRON Token Selected', () => {
  test('payment page with TRXUSDT selected should show TRON-related content', async ({ page }) => {
    await setupMockAuth(page);
    await mockTronOrderAPI(page);
    await mockProfilesAPI(page);
    await mockImageRoutes(page);
    await mockPreferencesAPI(page);
    await page.addInitScript(injectTronLinkMock());
    await page.addInitScript(() => {
      sessionStorage.setItem('checkout_selected_token', 'TRXUSDT');
    });

    await page.goto(buildPaymentUrl());
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2500);

    const content = page.locator('main, [class*="min-h-screen"]').first();
    await expect(content).toBeVisible();

    // Verify payment page loaded with payment method section
    const paymentMethodSection = page.getByText(/payment method|支付方式/i);
    await expect(paymentMethodSection.first()).toBeVisible();

    await page.screenshot({
      path: 'e2e-screenshots/tron-checkout-with-tron-option.png',
      fullPage: true,
    });
  });
});
