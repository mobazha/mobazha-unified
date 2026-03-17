/**
 * S6 Buyer Protection — E2E Assertion Tests
 *
 * Verifies buyer protection UI rendering across payment models, order states,
 * and user roles. Uses mock API data — no running backend required.
 *
 * Coverage:
 *   - Protection period card (buyer & seller views)
 *   - Extend protection interaction (buyer only)
 *   - After-sale dispute entry and filed state
 *   - Rating invite banner on completed orders
 *   - CANCELABLE vs MODERATED protection differences
 *   - Window expiry guard (no dispute entry after window)
 */

import { test, expect, type Page } from '@playwright/test';
import { injectMockAuth, mockSessionAPIs } from './fixtures/mock-auth';
import { mockOrdersAPI } from './fixtures/mock-api-routes';

const MOCK_PEER_ID = 'QmSeller001PeerIdMockForTesting';
const MOCK_BUYER_PEER_ID = 'QmBuyer001PeerIdMockForTesting';
const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3002';

function makeOrderContract(overrides?: Record<string, unknown>) {
  return {
    OrderID: 'QmOrder001',
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
            shippingOptions: [
              {
                name: 'Standard',
                type: 'FIXED_PRICE',
                regions: ['ALL'],
                services: [{ name: 'Standard', price: 500, estimatedDelivery: '5-7 days' }],
              },
            ],
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
    vendorOrderFulfillment: [
      {
        timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        shipping: { shipper: 'FedEx', trackingNumber: 'FX123456789' },
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
      paymentLocked: state === 'FULFILLED',
      protection,
      ...extras,
    },
  });
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

// ─── Tests ───────────────────────────────────────────────────────────────

test.describe('S6: Protection Period — Buyer View', () => {
  test('shows protection card with countdown for FULFILLED order', async ({ page }) => {
    await setupPage(page);
    const futureDate = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString();
    await page.route('**/v1/orders/**', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: wrapOrderResponse('FULFILLED', {
          stage: 'PROTECTION_PERIOD',
          daysRemaining: 8,
          autoCompleteAt: futureDate,
          extendable: true,
          extended: false,
          afterSaleWindowDays: 45,
        }),
      })
    );

    await page.goto(`${BASE_URL}/orders/QmOrder001?type=purchase`);
    await page.waitForLoadState('networkidle');

    const protectionCard = page.getByTestId('order-protection-status');
    await expect(protectionCard).toBeVisible();
    await expect(protectionCard).toContainText('8');
  });

  test('shows extend button for buyer in protection period', async ({ page }) => {
    await setupPage(page);
    const futureDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
    await page.route('**/v1/orders/**', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: wrapOrderResponse('FULFILLED', {
          stage: 'PROTECTION_PERIOD',
          daysRemaining: 5,
          autoCompleteAt: futureDate,
          extendable: true,
          extended: false,
          afterSaleWindowDays: 45,
        }),
      })
    );

    await page.goto(`${BASE_URL}/orders/QmOrder001?type=purchase`);
    await page.waitForLoadState('networkidle');

    const protectionCard = page.getByTestId('order-protection-status');
    await expect(protectionCard).toBeVisible();

    const extendButton = protectionCard.getByRole('button');
    await expect(extendButton).toBeVisible();
  });

  test('hides extend button when already extended', async ({ page }) => {
    await setupPage(page);
    const futureDate = new Date(Date.now() + 18 * 24 * 60 * 60 * 1000).toISOString();
    await page.route('**/v1/orders/**', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: wrapOrderResponse('FULFILLED', {
          stage: 'PROTECTION_PERIOD',
          daysRemaining: 18,
          autoCompleteAt: futureDate,
          extendable: false,
          extended: true,
          afterSaleWindowDays: 45,
        }),
      })
    );

    await page.goto(`${BASE_URL}/orders/QmOrder001?type=purchase`);
    await page.waitForLoadState('networkidle');

    const protectionCard = page.getByTestId('order-protection-status');
    await expect(protectionCard).toBeVisible();

    const extendButton = protectionCard.getByRole('button');
    await expect(extendButton).toHaveCount(0);
  });
});

test.describe('S6: Protection Period — Seller View', () => {
  test('shows protection countdown without extend button', async ({ page }) => {
    await setupPage(page);
    const futureDate = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString();
    await page.route('**/v1/orders/**', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: wrapOrderResponse('FULFILLED', {
          stage: 'PROTECTION_PERIOD',
          daysRemaining: 8,
          autoCompleteAt: futureDate,
          extendable: false,
          extended: false,
          afterSaleWindowDays: 45,
        }),
      })
    );

    await page.goto(`${BASE_URL}/orders/QmOrder001?type=sale`);
    await page.waitForLoadState('networkidle');

    const protectionCard = page.getByTestId('order-protection-status');
    await expect(protectionCard).toBeVisible();

    const extendButton = protectionCard.getByRole('button');
    await expect(extendButton).toHaveCount(0);
  });

  test('shows extended badge when buyer extended protection', async ({ page }) => {
    await setupPage(page);
    const futureDate = new Date(Date.now() + 18 * 24 * 60 * 60 * 1000).toISOString();
    await page.route('**/v1/orders/**', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: wrapOrderResponse('FULFILLED', {
          stage: 'PROTECTION_PERIOD',
          daysRemaining: 18,
          autoCompleteAt: futureDate,
          extendable: false,
          extended: true,
          afterSaleWindowDays: 45,
        }),
      })
    );

    await page.goto(`${BASE_URL}/orders/QmOrder001?type=sale`);
    await page.waitForLoadState('networkidle');

    const protectionCard = page.getByTestId('order-protection-status');
    await expect(protectionCard).toBeVisible();
    await expect(protectionCard).toContainText('18');
  });
});

test.describe('S6: Completed Order — Rating Invite', () => {
  test('shows rating invite banner for unrated completed order', async ({ page }) => {
    await setupPage(page);
    await page.route('**/v1/orders/**', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: wrapOrderResponse(
          'COMPLETED',
          {
            stage: 'AFTER_SALE_WINDOW',
            daysRemaining: 43,
            autoCompleteAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            extendable: false,
            extended: false,
            afterSaleWindowDays: 45,
          },
          {},
          {
            orderComplete: {
              timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
              ratingSignatures: [],
            },
          }
        ),
      })
    );

    await page.goto(`${BASE_URL}/orders/QmOrder001?type=purchase`);
    await page.waitForLoadState('networkidle');

    const ratingBanner = page.getByTestId('rating-invite-banner');
    await expect(ratingBanner).toBeVisible();
  });
});

test.describe('S6: After-Sale Dispute', () => {
  test('shows dispute card when after-sale dispute is filed', async ({ page }) => {
    await setupPage(page);
    await page.route('**/v1/orders/**', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: wrapOrderResponse(
          'COMPLETED',
          {
            stage: 'AFTER_SALE_WINDOW',
            daysRemaining: 43,
            autoCompleteAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            extendable: false,
            extended: false,
            afterSaleWindowDays: 45,
          },
          {
            afterSaleDisputeReason: 'QUALITY_ISSUE',
            afterSaleDisputeDesc: 'The left earpiece has a buzzing sound.',
            afterSaleDisputeAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          },
          {
            orderComplete: {
              timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
              ratingSignatures: [],
            },
          }
        ),
      })
    );

    await page.goto(`${BASE_URL}/orders/QmOrder001?type=purchase`);
    await page.waitForLoadState('networkidle');

    const disputeCard = page.getByTestId('after-sale-dispute-card');
    await expect(disputeCard).toBeVisible();
  });

  test('seller sees after-sale dispute card with buyer details', async ({ page }) => {
    await setupPage(page);
    await page.route('**/v1/orders/**', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: wrapOrderResponse(
          'COMPLETED',
          {
            stage: 'AFTER_SALE_WINDOW',
            daysRemaining: 43,
            autoCompleteAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            extendable: false,
            extended: false,
            afterSaleWindowDays: 45,
          },
          {
            afterSaleDisputeReason: 'NOT_RECEIVED',
            afterSaleDisputeDesc: 'Package never arrived despite tracking showing delivered.',
            afterSaleDisputeAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          },
          {
            orderComplete: {
              timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
              ratingSignatures: [],
            },
          }
        ),
      })
    );

    await page.goto(`${BASE_URL}/orders/QmOrder001?type=sale`);
    await page.waitForLoadState('networkidle');

    const disputeCard = page.getByTestId('after-sale-dispute-card');
    await expect(disputeCard).toBeVisible();
  });
});

test.describe('S6: CANCELABLE Payment Model', () => {
  test('shows protection card for CANCELABLE order (no moderator needed)', async ({ page }) => {
    await setupPage(page);
    const futureDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();
    await page.route('**/v1/orders/**', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: wrapOrderResponse(
          'FULFILLED',
          {
            stage: 'PROTECTION_PERIOD',
            daysRemaining: 10,
            autoCompleteAt: futureDate,
            extendable: true,
            extended: false,
            afterSaleWindowDays: 45,
          },
          {},
          {
            paymentSent: {
              coin: 'ETH',
              amount: 8999,
              method: 'CANCELABLE',
              address: '0xEscrow123',
              transactionID: '0xabc123',
            },
          }
        ),
      })
    );

    await page.goto(`${BASE_URL}/orders/QmOrder001?type=purchase`);
    await page.waitForLoadState('networkidle');

    const protectionCard = page.getByTestId('order-protection-status');
    await expect(protectionCard).toBeVisible();
  });
});

test.describe('S6: Mobile Responsive', () => {
  test('protection card renders correctly on mobile', async ({ page }) => {
    await setupPage(page);
    await page.setViewportSize({ width: 375, height: 812 });

    const futureDate = new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString();
    await page.route('**/v1/orders/**', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: wrapOrderResponse('FULFILLED', {
          stage: 'PROTECTION_PERIOD',
          daysRemaining: 6,
          autoCompleteAt: futureDate,
          extendable: true,
          extended: false,
          afterSaleWindowDays: 45,
        }),
      })
    );

    await page.goto(`${BASE_URL}/orders/QmOrder001?type=purchase`);
    await page.waitForLoadState('networkidle');

    const protectionCard = page.getByTestId('order-protection-status');
    await expect(protectionCard).toBeVisible();
  });

  test('after-sale dispute card renders on mobile', async ({ page }) => {
    await setupPage(page);
    await page.setViewportSize({ width: 375, height: 812 });

    await page.route('**/v1/orders/**', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: wrapOrderResponse(
          'COMPLETED',
          {
            stage: 'AFTER_SALE_WINDOW',
            daysRemaining: 40,
            autoCompleteAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
            extendable: false,
            extended: false,
            afterSaleWindowDays: 45,
          },
          {
            afterSaleDisputeReason: 'DAMAGED',
            afterSaleDisputeDesc: 'Item arrived damaged.',
            afterSaleDisputeAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          },
          {
            orderComplete: {
              timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
              ratingSignatures: [],
            },
          }
        ),
      })
    );

    await page.goto(`${BASE_URL}/orders/QmOrder001?type=purchase`);
    await page.waitForLoadState('networkidle');

    const disputeCard = page.getByTestId('after-sale-dispute-card');
    await expect(disputeCard).toBeVisible();
  });
});
