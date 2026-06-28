/**
 * Order complete + rating decoupling — mock API E2E
 *
 * Covers Phase 2 flow: confirm receipt (/complete) → rating banner → optional /rate
 * Regression surface for decoupling complete from ratings.
 */

import { test, expect, type Page } from '@playwright/test';
import { injectMockAuth, mockSessionAPIs } from './fixtures/mock-auth';
import { mockOrdersAPI } from './fixtures/mock-api-routes';

const MOCK_PEER_ID = 'QmSeller001PeerIdMockForTesting';
const MOCK_BUYER_PEER_ID = 'QmBuyer001PeerIdMockForTesting';
const ORDER_ID = 'QmOrder001';
const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3002';

function makeOrderContract(overrides?: Record<string, unknown>) {
  return {
    OrderID: ORDER_ID,
    orderOpen: {
      listings: [
        {
          vendorID: { peerID: MOCK_PEER_ID },
          listing: {
            slug: 'wireless-headphones',
            metadata: {
              contractType: 'PHYSICAL_GOOD',
              pricingCurrency: { code: 'USD', divisibility: 2 },
            },
            vendorID: { peerID: MOCK_PEER_ID, handle: 'TechStore' },
            item: {
              title: 'Wireless Noise-Cancelling Headphones',
              description: 'Premium over-ear headphones',
              price: 8999,
              images: [
                {
                  tiny: 'https://picsum.photos/id/96/100/100',
                  small: 'https://picsum.photos/id/96/200/200',
                  medium: 'https://picsum.photos/id/96/300/300',
                  large: 'https://picsum.photos/id/96/500/500',
                  original: 'https://picsum.photos/id/96/800/800',
                  filename: 'headphones.png',
                },
              ],
              skus: [{ productID: '1', quantity: '100' }],
            },
          },
        },
      ],
      payment: {
        coin: 'ETH',
        chaincode: '',
        amount: 8999,
        method: 'MODERATED',
        moderator: 'QmMod001',
      },
      pricingCoin: 'USD',
      amount: 8999,
      shipping: {
        shipTo: 'John Smith',
        address: '123 Blockchain Ave',
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
      timestamp: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      buyerID: { peerID: MOCK_BUYER_PEER_ID, handle: 'CryptoBuyer' },
    },
    orderConfirmation: {
      timestamp: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
    },
    orderShipments: [
      {
        timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        shipments: [
          {
            physicalDelivery: { shipper: 'FedEx', trackingNumber: 'FX123456789' },
          },
        ],
      },
    ],
    paymentSent: {
      moderator: 'QmMod001',
      coin: 'ETH',
      amount: 8999,
      method: 'MODERATED',
      address: '0xEscrow123',
      transactionID: '0xabc123',
    },
    ...overrides,
  };
}

function wrapOrderResponse(
  state: string,
  protection: Record<string, unknown>,
  extras?: Record<string, unknown>,
  contractOverrides?: Record<string, unknown>
) {
  return JSON.stringify({
    data: {
      contract: makeOrderContract(contractOverrides),
      state,
      read: true,
      funded: true,
      paymentTx: '0xabc123',
      paymentLocked: state === 'SHIPPED',
      protection,
      ...extras,
    },
  });
}

function shippedProtection() {
  const futureDate = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString();
  return {
    stage: 'PROTECTION_PERIOD',
    daysRemaining: 8,
    autoCompleteAt: futureDate,
    extendable: true,
    extended: false,
    afterSaleWindowDays: 45,
  };
}

function completedProtection() {
  return {
    stage: 'AFTER_SALE_WINDOW',
    daysRemaining: 43,
    autoCompleteAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    extendable: false,
    extended: false,
    afterSaleWindowDays: 45,
  };
}

async function mockCommonRoutes(page: Page) {
  await page.route('**/v1/profiles/**', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: { name: 'TechStore', peerID: MOCK_PEER_ID } }),
    })
  );
  await page.route('**/search/v1/profiles/**', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: { name: 'TechStore', peerID: MOCK_PEER_ID } }),
    })
  );
  await page.route('**/v1/notifications**', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '{"data":[]}' })
  );
  await page.route('**/search/**', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '{"data":[]}' })
  );
}

async function setupPage(page: Page) {
  await injectMockAuth(page);
  await mockSessionAPIs(page);
  await mockOrdersAPI(page);
  await mockCommonRoutes(page);
}

type OrderFlowMockOptions = {
  completeDelayMs?: number;
};

function isOrderCompletePost(url: string, method: string): boolean {
  if (method !== 'POST') return false;
  try {
    const path = new URL(url).pathname;
    return /\/v1\/orders\/[^/]+\/complete$/.test(path);
  } catch {
    return false;
  }
}

async function setupOrderFlowMocks(page: Page, options: OrderFlowMockOptions = {}) {
  let orderState = 'SHIPPED';
  const completeCalls: Array<Record<string, unknown>> = [];
  const rateCalls: Array<Record<string, unknown>> = [];

  await page.route('**/v1/orders/**', async route => {
    const url = route.request().url();
    const method = route.request().method();

    if (isOrderCompletePost(url, method)) {
      const body = route.request().postDataJSON() as Record<string, unknown>;
      completeCalls.push(body);
      orderState = 'COMPLETED';
      if (options.completeDelayMs) {
        await new Promise(resolve => setTimeout(resolve, options.completeDelayMs));
      }
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: {} }),
      });
    }

    if (method === 'POST' && url.includes('/rate')) {
      const body = route.request().postDataJSON() as Record<string, unknown>;
      rateCalls.push(body);
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: {} }),
      });
    }

    const protection = orderState === 'COMPLETED' ? completedProtection() : shippedProtection();
    const contractOverrides =
      orderState === 'COMPLETED'
        ? {
            orderComplete: {
              timestamp: new Date(Date.now() - 1 * 60 * 1000).toISOString(),
              ratingSignatures: [],
            },
          }
        : undefined;

    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: wrapOrderResponse(orderState, protection, {}, contractOverrides),
    });
  });

  return { completeCalls, rateCalls };
}

async function openConfirmReceiptFromFooter(page: Page) {
  const completeBtn = page.getByRole('button', { name: /confirm receipt|确认收货/i }).first();
  await expect(completeBtn).toBeVisible();
  await completeBtn.click();
  await expect(page.getByTestId('confirm-receipt-dialog')).toBeVisible();
}

test.describe('Order complete + rating decoupling', () => {
  test('canceling confirm dialog does not call /complete', async ({ page }) => {
    await setupPage(page);
    const { completeCalls } = await setupOrderFlowMocks(page);

    await page.goto(`${BASE_URL}/orders/${ORDER_ID}?type=purchase`);
    await page.waitForLoadState('networkidle');

    await openConfirmReceiptFromFooter(page);
    await page.getByRole('button', { name: /cancel|取消/i }).click();
    await expect(page.getByTestId('confirm-receipt-dialog')).not.toBeVisible();

    expect(completeCalls).toHaveLength(0);
  });

  test('confirm receipt stays open with phase hint while /complete is in flight', async ({
    page,
  }) => {
    await setupPage(page);
    await setupOrderFlowMocks(page, { completeDelayMs: 2000 });

    await page.goto(`${BASE_URL}/orders/${ORDER_ID}?type=purchase`);
    await page.waitForLoadState('networkidle');

    await openConfirmReceiptFromFooter(page);
    await page
      .getByRole('button', { name: /confirm receipt & release funds|确认收货并释放资金/i })
      .click();

    const dialog = page.getByTestId('confirm-receipt-dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/releasing buyer protection funds|释放.*资金/i)).toBeVisible({
      timeout: 3000,
    });
  });

  test('complete → banner → skip → rate only on submit', async ({ page }) => {
    await setupPage(page);
    const { completeCalls, rateCalls } = await setupOrderFlowMocks(page);

    await page.goto(`${BASE_URL}/orders/${ORDER_ID}?type=purchase`);
    await page.waitForLoadState('networkidle');

    await openConfirmReceiptFromFooter(page);
    await page
      .getByRole('button', { name: /confirm receipt & release funds|确认收货并释放资金/i })
      .click();

    await expect(page.getByTestId('confirm-receipt-dialog')).not.toBeVisible({ timeout: 15000 });
    expect(completeCalls).toHaveLength(1);
    expect(completeCalls[0]?.ratings).toBeUndefined();

    const ratingBanner = page.getByTestId('rating-invite-banner');
    await expect(ratingBanner).toBeVisible({ timeout: 15000 });

    await ratingBanner.getByRole('button', { name: /write review|写评价/i }).click();
    const reviewDialog = page.getByTestId('write-review-dialog');
    await expect(reviewDialog).toBeVisible();

    await reviewDialog.getByRole('button', { name: /rate later|稍后评价/i }).click();
    await expect(reviewDialog).not.toBeVisible();
    expect(rateCalls).toHaveLength(0);

    await ratingBanner.getByRole('button', { name: /write review|写评价/i }).click();
    await expect(reviewDialog).toBeVisible();
    await reviewDialog.getByRole('button', { name: /submit review|提交评价/i }).click();

    await expect(reviewDialog).not.toBeVisible({ timeout: 15000 });
    expect(completeCalls).toHaveLength(1);
    expect(rateCalls).toHaveLength(1);
    expect(rateCalls[0]?.ratings).toBeTruthy();
  });
});
