import { test } from '@playwright/test';
import { injectMockAuth, mockSessionAPIs } from './fixtures/mock-auth';
import { mockOrdersAPI } from './fixtures/mock-api-routes';
import * as path from 'path';
import * as fs from 'fs';

const OUT = path.join(__dirname, 'demo-output', 's6-protection');
const MOCK_PEER_ID = 'QmSeller001PeerIdMockForTesting';
const MOCK_BUYER_PEER_ID = 'QmBuyer001PeerIdMockForTesting';

function mockModeratedOrderDetail(page: import('@playwright/test').Page) {
  return page.route('**/v1/orders/**', route => {
    const futureDate = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString();
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          contract: {
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
                          tiny: '/images/mock.jpg',
                          small: '/images/mock.jpg',
                          medium: '/images/mock.jpg',
                          large: '/images/mock.jpg',
                          original: '/images/mock.jpg',
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
              timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
              buyerID: { peerID: MOCK_BUYER_PEER_ID, handle: 'CryptoBuyer' },
            },
            orderConfirmation: {
              timestamp: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
            },
            orderShipments: [
              {
                timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
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
          },
          state: 'SHIPPED',
          read: true,
          funded: true,
          paymentTx: '0xabc123',
          paymentLocked: true,
          protection: {
            stage: 'PROTECTION_PERIOD',
            daysRemaining: 8,
            autoCompleteAt: futureDate,
            extendable: true,
            extended: false,
            afterSaleWindowDays: 45,
          },
        },
      }),
    });
  });
}

test.describe('S6 Final: Protection card position', () => {
  test.beforeEach(async ({ page }) => {
    await injectMockAuth(page);
    await mockSessionAPIs(page);
    await mockOrdersAPI(page);
    await mockModeratedOrderDetail(page);
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
  });

  test('desktop: protection after timeline', async ({ page }) => {
    if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('http://localhost:3001/orders/QmOrder001?type=purchase');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2500);
    await page.screenshot({ path: path.join(OUT, 't9-final-desktop.png'), fullPage: true });
  });

  test('mobile: protection after tracking', async ({ page }) => {
    if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('http://localhost:3001/orders/QmOrder001?type=purchase');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2500);
    await page.screenshot({ path: path.join(OUT, 't9-final-mobile.png'), fullPage: true });
  });
});
