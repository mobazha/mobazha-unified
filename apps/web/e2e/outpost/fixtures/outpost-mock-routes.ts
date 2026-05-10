/**
 * Outpost Mock API Routes
 *
 * Mock data and route handlers for Outpost-specific E2E tests.
 * Outpost only supports LTC + XMR (no BTC/ETH/EVM chains).
 *
 * All JSON responses use the Phase G envelope: { data: T } or { error: {...} }
 */

import type { Page } from '@playwright/test';

function wrapData<T>(data: T): string {
  return JSON.stringify({ data });
}

const MOCK_ORDER_TOKEN = 'gst_outpost_test_token_abc123def456';
const MOCK_PEER_ID = 'QmOutpostPeer1234567890abcdefghijklmnop';

function mockThumbnail(id: number, size = 300) {
  const url = `https://picsum.photos/id/${id}/${size}/${size}`;
  return { tiny: url, small: url, medium: url, large: url, original: url };
}

function mockSearchThumbnail(id: number, size = 300) {
  const url = `https://picsum.photos/id/${id}/${size}/${size}`;
  return { tiny: url, small: url, medium: url };
}

// ── Guest Checkout mock data (LTC) ──────────────────────────────────────────

const MOCK_GUEST_ORDER_LTC = {
  orderToken: MOCK_ORDER_TOKEN,
  paymentAddress: 'ltc1q5g5j0ydr85awtq5tnrcz0tvfk7m8gfeqjg87mg',
  paymentAmount: '350000',
  paymentCoin: 'LTC',
  priceCurrency: 'USD',
  priceDivisibility: 2,
  expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  items: [
    {
      listingHash: 'QmOutpostHash001',
      listingTitle: 'Privacy VPN Subscription (1 Year)',
      quantity: 1,
      unitPrice: '2800',
    },
  ],
};

const MOCK_GUEST_ORDER_STATUS_LTC = {
  ...MOCK_GUEST_ORDER_LTC,
  state: 'AWAITING_PAYMENT',
  confirmations: 0,
  requiredConfs: 6,
  chainBlockTimeSec: 150,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// ── Guest Checkout mock data (XMR) ──────────────────────────────────────────

const MOCK_GUEST_ORDER_XMR = {
  orderToken: 'gst_outpost_xmr_token_xyz789',
  paymentAddress: '4A2BtPyx2aHGY7kR1Pqx8MQXN2E9a4NXhM5cmJmSPpbLFbzaaWLQiPmS8LqX6qFNyuaKTZrHcX1',
  paymentAmount: '165000000000',
  paymentCoin: 'XMR',
  priceCurrency: 'USD',
  priceDivisibility: 2,
  expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  items: [
    {
      listingHash: 'QmOutpostHash002',
      listingTitle: 'Encrypted USB Drive (64GB)',
      quantity: 1,
      unitPrice: '2800',
    },
  ],
};

const MOCK_GUEST_ORDER_STATUS_XMR = {
  ...MOCK_GUEST_ORDER_XMR,
  state: 'AWAITING_PAYMENT',
  confirmations: 0,
  requiredConfs: 10,
  chainBlockTimeSec: 120,
  poolDetected: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const MOCK_GUEST_CHECKOUT_SETTINGS = {
  enabled: true,
  acceptedCoins: ['LTC', 'XMR'],
  paymentTimeoutMinutes: 30,
};

// ── Outpost store product data ──────────────────────────────────────────────

const OUTPOST_LISTINGS = [
  {
    slug: 'privacy-vpn-1yr',
    title: 'Privacy VPN Subscription (1 Year)',
    contractType: 'DIGITAL_GOOD',
    thumbnail: mockSearchThumbnail(20),
    price: { amount: 2800, currency: { code: 'USD', divisibility: 2 } },
    averageRating: 4.9,
    ratingCount: 12,
    productType: 'Digital',
  },
  {
    slug: 'encrypted-usb-64gb',
    title: 'Encrypted USB Drive (64GB)',
    contractType: 'PHYSICAL_GOOD',
    thumbnail: mockSearchThumbnail(60),
    price: { amount: 4500, currency: { code: 'USD', divisibility: 2 } },
    averageRating: 4.7,
    ratingCount: 8,
    productType: 'Electronics',
  },
  {
    slug: 'privacy-handbook',
    title: 'The Privacy Handbook — Digital Edition',
    contractType: 'DIGITAL_GOOD',
    thumbnail: mockSearchThumbnail(24),
    price: { amount: 1500, currency: { code: 'USD', divisibility: 2 } },
    averageRating: 5.0,
    ratingCount: 3,
    productType: 'Books',
  },
];

const OUTPOST_PRODUCT_DETAIL = {
  slug: 'encrypted-usb-64gb',
  metadata: {
    version: 1,
    contractType: 'PHYSICAL_GOOD',
    format: 'FIXED_PRICE',
    pricingCurrency: { code: 'USD', divisibility: 2 },
    expiry: '2030-12-31T23:59:59Z',
    acceptedCurrencies: ['LTC', 'XMR'],
  },
  item: {
    title: 'Encrypted USB Drive (64GB)',
    description: 'Hardware-encrypted USB drive with tamper-proof casing. AES-256 encryption.',
    processingTime: '2-4 business days',
    price: '4500',
    nsfw: false,
    tags: ['privacy', 'encryption', 'hardware'],
    categories: ['Electronics'],
    grams: 50,
    condition: 'New',
    images: [{ ...mockThumbnail(60), filename: 'usb-drive.png' }],
    skus: [{ productID: 'encrypted-usb-64gb', quantity: '50', price: '4500' }],
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
            id: 'zone-worldwide',
            name: 'Worldwide',
            regions: ['ALL'],
            rates: [
              {
                id: 'rate-standard',
                name: 'Standard',
                price: '500',
                currency: 'USD',
                estimatedDelivery: '7-14 days',
              },
            ],
          },
        ],
      },
    ],
  },
  averageRating: 4.7,
  ratingCount: 8,
  vendorID: { peerID: MOCK_PEER_ID },
};

// ── Cart seed data ──────────────────────────────────────────────────────────

const OUTPOST_CART_ITEM = {
  slug: 'encrypted-usb-64gb',
  title: 'Encrypted USB Drive (64GB)',
  listingHash: 'QmOutpostHash002',
  price: { amount: 4500, currency: 'USD', divisibility: 2 },
  thumbnail: 'https://picsum.photos/id/60/300/300',
  quantity: 1,
  vendorPeerID: MOCK_PEER_ID,
};

// ── Route handlers ──────────────────────────────────────────────────────────

function isV1Api(url: URL, suffix: string): boolean {
  return url.pathname.startsWith('/v1/') && url.pathname.includes(suffix);
}

/**
 * Mock Outpost app shell routes (runtime config, exchange rates, WS).
 */
async function mockOutpostAppShell(page: Page): Promise<void> {
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
          data: { LTC: { last: 80 }, XMR: { last: 170 }, BTC: { last: 65000 } },
        }),
      })
  );
  await page.route(
    url => url.pathname === '/ws' || url.pathname === '/ws/',
    route => route.abort()
  );
}

/**
 * Mock Guest Checkout APIs for a given coin (LTC or XMR).
 */
async function mockOutpostGuestAPIs(
  page: Page,
  coin: 'LTC' | 'XMR' = 'LTC',
  statusState = 'AWAITING_PAYMENT',
  statusExtras: Record<string, unknown> = {}
): Promise<void> {
  const orderResponse = coin === 'XMR' ? MOCK_GUEST_ORDER_XMR : MOCK_GUEST_ORDER_LTC;
  const orderStatus = coin === 'XMR' ? MOCK_GUEST_ORDER_STATUS_XMR : MOCK_GUEST_ORDER_STATUS_LTC;

  await page.route(
    url => isV1Api(url, '/settings/guest-checkout'),
    route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: MOCK_GUEST_CHECKOUT_SETTINGS }),
      })
  );

  await page.route(
    url => url.pathname === '/v1/guest/orders',
    async (route, req) => {
      if (req.method() === 'POST') {
        return route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ data: orderResponse }),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [] }),
      });
    }
  );

  await page.route(
    url => isV1Api(url, '/guest/orders/'),
    route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: { ...orderStatus, state: statusState, ...statusExtras },
        }),
      })
  );
}

/**
 * Mock Outpost product listing APIs.
 */
async function mockOutpostListingsAPI(page: Page): Promise<void> {
  await page.route('**/v1/listings/index**', route => {
    if (route.request().method() !== 'GET') return route.continue();
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: wrapData(OUTPOST_LISTINGS),
    });
  });

  await page.route('**/v1/listings/index/**', route => {
    if (route.request().method() !== 'GET') return route.continue();
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: wrapData(OUTPOST_LISTINGS),
    });
  });

  await page.route(/\/v1\/listings\/[^/]+\/[^/]+$/, route => {
    if (route.request().method() !== 'GET') return route.continue();
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: wrapData(OUTPOST_PRODUCT_DETAIL),
    });
  });
}

/**
 * Inject Outpost cart data into localStorage.
 * Must be called via page.addInitScript BEFORE page.goto().
 */
async function injectOutpostCart(page: Page, items = [OUTPOST_CART_ITEM]): Promise<void> {
  const data = JSON.stringify({ state: { items }, version: 0 });
  await page.addInitScript(`localStorage.setItem('guest-cart-storage', ${JSON.stringify(data)});`);
}

export {
  mockOutpostAppShell,
  mockOutpostGuestAPIs,
  mockOutpostListingsAPI,
  injectOutpostCart,
  MOCK_ORDER_TOKEN,
  MOCK_GUEST_ORDER_LTC,
  MOCK_GUEST_ORDER_XMR,
  MOCK_GUEST_ORDER_STATUS_LTC,
  MOCK_GUEST_ORDER_STATUS_XMR,
  MOCK_GUEST_CHECKOUT_SETTINGS,
  OUTPOST_LISTINGS,
  OUTPOST_PRODUCT_DETAIL,
  OUTPOST_CART_ITEM,
  MOCK_PEER_ID,
};
