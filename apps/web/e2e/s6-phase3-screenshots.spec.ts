import { test } from '@playwright/test';
import { injectMockAuth, mockSessionAPIs } from './fixtures/mock-auth';
import { mockOrdersAPI } from './fixtures/mock-api-routes';
import * as path from 'path';
import * as fs from 'fs';

const OUT = path.join(__dirname, 'demo-output', 's6-phase3');
const MOCK_PEER_ID = 'QmSeller001PeerIdMockForTesting';
const MOCK_BUYER_PEER_ID = 'QmBuyer001PeerIdMockForTesting';

const BASE_ORDER_CONTRACT = {
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
                        price: '500',
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
        memo: 'Please ship ASAP!',
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
};

async function mockCommonRoutes(page: import('@playwright/test').Page) {
  await page.route('**/v1/profiles/**', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: { name: 'TechStore', peerID: MOCK_PEER_ID } }),
    });
  });
  await page.route('**/search/v1/profiles/**', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: { name: 'TechStore', peerID: MOCK_PEER_ID } }),
    });
  });
  await page.route('**/v1/notifications**', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '{"data":[]}' })
  );
  await page.route('**/search/**', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '{"data":[]}' })
  );
}

// T8: Buyer completed order, not rated → RatingInviteBanner + After-sale dispute button
function mockCompletedBuyerOrder(page: import('@playwright/test').Page) {
  return page.route('**/v1/orders/**', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          contract: {
            ...BASE_ORDER_CONTRACT,
            orderComplete: {
              timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
              ratingSignatures: [],
            },
          },
          state: 'COMPLETED',
          read: true,
          funded: true,
          paymentTx: '0xabc123',
          paymentLocked: false,
          protection: {
            stage: 'AFTER_SALE_WINDOW',
            daysRemaining: 43,
            autoCompleteAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            extendable: false,
            extended: false,
            afterSaleWindowDays: 45,
          },
        },
      }),
    });
  });
}

// T10: Seller SHIPPED order in protection period → seller countdown
function mockShippedSellerOrder(page: import('@playwright/test').Page) {
  const futureDate = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString();
  return page.route('**/v1/orders/**', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          contract: BASE_ORDER_CONTRACT,
          state: 'SHIPPED',
          read: true,
          funded: true,
          paymentTx: '0xabc123',
          paymentLocked: true,
          protection: {
            stage: 'PROTECTION_PERIOD',
            daysRemaining: 8,
            autoCompleteAt: futureDate,
            extendable: false,
            extended: false,
            afterSaleWindowDays: 45,
          },
        },
      }),
    });
  });
}

// T10: Seller order with buyer-extended protection
function mockExtendedSellerOrder(page: import('@playwright/test').Page) {
  const futureDate = new Date(Date.now() + 18 * 24 * 60 * 60 * 1000).toISOString();
  return page.route('**/v1/orders/**', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          contract: BASE_ORDER_CONTRACT,
          state: 'SHIPPED',
          read: true,
          funded: true,
          paymentTx: '0xabc123',
          paymentLocked: true,
          protection: {
            stage: 'PROTECTION_PERIOD',
            daysRemaining: 18,
            autoCompleteAt: futureDate,
            extendable: false,
            extended: true,
            afterSaleWindowDays: 45,
          },
        },
      }),
    });
  });
}

// T5: Buyer completed order WITH after-sale dispute filed
function mockCompletedBuyerOrderWithDispute(page: import('@playwright/test').Page) {
  return page.route('**/v1/orders/**', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          contract: {
            ...BASE_ORDER_CONTRACT,
            orderComplete: {
              timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
              ratingSignatures: [],
            },
          },
          state: 'COMPLETED',
          read: true,
          funded: true,
          paymentTx: '0xabc123',
          paymentLocked: false,
          protection: {
            stage: 'AFTER_SALE_WINDOW',
            daysRemaining: 43,
            autoCompleteAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            extendable: false,
            extended: false,
            afterSaleWindowDays: 45,
          },
          afterSaleDisputeReason: 'QUALITY_ISSUE',
          afterSaleDisputeDesc:
            'The left earpiece has a buzzing sound when Active Noise Cancellation is enabled. The issue persists across different audio sources.',
          afterSaleDisputeAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        },
      }),
    });
  });
}

// T5: Seller view of order with after-sale dispute
function mockCompletedSellerOrderWithDispute(page: import('@playwright/test').Page) {
  return page.route('**/v1/orders/**', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          contract: {
            ...BASE_ORDER_CONTRACT,
            orderComplete: {
              timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
              ratingSignatures: [],
            },
          },
          state: 'COMPLETED',
          read: true,
          funded: true,
          paymentTx: '0xabc123',
          paymentLocked: false,
          protection: {
            stage: 'AFTER_SALE_WINDOW',
            daysRemaining: 43,
            autoCompleteAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            extendable: false,
            extended: false,
            afterSaleWindowDays: 45,
          },
          afterSaleDisputeReason: 'QUALITY_ISSUE',
          afterSaleDisputeDesc:
            'The left earpiece has a buzzing sound when Active Noise Cancellation is enabled. The issue persists across different audio sources.',
          afterSaleDisputeAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        },
      }),
    });
  });
}

test.describe('S6 Phase 3: T5/T8/T10 Screenshots', () => {
  test.beforeEach(async ({ page }) => {
    if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
    await injectMockAuth(page);
    await mockSessionAPIs(page);
    await mockOrdersAPI(page);
    await mockCommonRoutes(page);
  });

  // T8 + T5 combined: Buyer completed order — Rating invite + After-sale dispute
  test('desktop: buyer completed — rating invite + after-sale dispute', async ({ page }) => {
    await mockCompletedBuyerOrder(page);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('http://localhost:3001/orders/QmOrder001?type=purchase');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2500);
    await page.screenshot({
      path: path.join(OUT, 'p3-t8-rating-invite-desktop.png'),
      fullPage: true,
    });
  });

  test('mobile: buyer completed — rating invite + after-sale dispute', async ({ page }) => {
    await mockCompletedBuyerOrder(page);
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('http://localhost:3001/orders/QmOrder001?type=purchase');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2500);
    await page.screenshot({
      path: path.join(OUT, 'p3-t8-rating-invite-mobile.png'),
      fullPage: true,
    });
  });

  // T10: Seller fulfilled — protection countdown
  test('desktop: seller fulfilled — protection countdown', async ({ page }) => {
    await mockShippedSellerOrder(page);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('http://localhost:3001/orders/QmOrder001?type=sale');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2500);
    await page.screenshot({
      path: path.join(OUT, 'p3-t10-seller-countdown-desktop.png'),
      fullPage: true,
    });
  });

  test('mobile: seller fulfilled — protection countdown', async ({ page }) => {
    await mockShippedSellerOrder(page);
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('http://localhost:3001/orders/QmOrder001?type=sale');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2500);
    await page.screenshot({
      path: path.join(OUT, 'p3-t10-seller-countdown-mobile.png'),
      fullPage: true,
    });
  });

  // T10: Seller — buyer extended protection
  test('desktop: seller — buyer extended protection', async ({ page }) => {
    await mockExtendedSellerOrder(page);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('http://localhost:3001/orders/QmOrder001?type=sale');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2500);
    await page.screenshot({
      path: path.join(OUT, 'p3-t10-seller-extended-desktop.png'),
      fullPage: true,
    });
  });

  test('mobile: seller — buyer extended protection', async ({ page }) => {
    await mockExtendedSellerOrder(page);
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('http://localhost:3001/orders/QmOrder001?type=sale');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2500);
    await page.screenshot({
      path: path.join(OUT, 'p3-t10-seller-extended-mobile.png'),
      fullPage: true,
    });
  });

  // T5: Buyer completed order WITH after-sale dispute filed
  test('desktop: buyer completed — after-sale dispute filed', async ({ page }) => {
    await mockCompletedBuyerOrderWithDispute(page);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('http://localhost:3001/orders/QmOrder001?type=purchase');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2500);
    await page.screenshot({
      path: path.join(OUT, 'p3-t5-buyer-dispute-desktop.png'),
      fullPage: true,
    });
  });

  test('mobile: buyer completed — after-sale dispute filed', async ({ page }) => {
    await mockCompletedBuyerOrderWithDispute(page);
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('http://localhost:3001/orders/QmOrder001?type=purchase');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2500);
    await page.screenshot({
      path: path.join(OUT, 'p3-t5-buyer-dispute-mobile.png'),
      fullPage: true,
    });
  });

  // T5: Seller view of after-sale dispute
  test('desktop: seller — after-sale dispute received', async ({ page }) => {
    await mockCompletedSellerOrderWithDispute(page);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('http://localhost:3001/orders/QmOrder001?type=sale');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2500);
    await page.screenshot({
      path: path.join(OUT, 'p3-t5-seller-dispute-desktop.png'),
      fullPage: true,
    });
  });

  test('mobile: seller — after-sale dispute received', async ({ page }) => {
    await mockCompletedSellerOrderWithDispute(page);
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('http://localhost:3001/orders/QmOrder001?type=sale');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2500);
    await page.screenshot({
      path: path.join(OUT, 'p3-t5-seller-dispute-mobile.png'),
      fullPage: true,
    });
  });
});
