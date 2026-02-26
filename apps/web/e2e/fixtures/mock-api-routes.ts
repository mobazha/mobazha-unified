/**
 * Mock API Routes for Visual Tests
 *
 * Uses Playwright page.route() to intercept API calls and return mock data,
 * so pages that normally need backend data can show populated states.
 */

import type { Page } from '@playwright/test';

const MOCK_PEER_ID = 'QmY8tRnCzUf45FnPLMvFi35R5bYjCEiCKbgEN39xnScj8P';
const MOCK_BUYER_PEER_ID = 'QmBuyerPeer1234567890abcdefghijk';
const NOW = new Date().toISOString();
const DAY_AGO = new Date(Date.now() - 86400000).toISOString();
const WEEK_AGO = new Date(Date.now() - 7 * 86400000).toISOString();

function mockThumbnail(id: number, size = 300) {
  const url = `https://picsum.photos/id/${id}/${size}/${size}`;
  return { tiny: url, small: url, medium: url, large: url, original: url };
}

function mockSearchThumbnail(id: number, size = 300) {
  const url = `https://picsum.photos/id/${id}/${size}/${size}`;
  return { tiny: url, small: url, medium: url };
}

const mockPurchases = [
  {
    orderID: 'QmOrder001',
    slug: 'wireless-headphones',
    title: 'Wireless Noise-Cancelling Headphones',
    thumbnail: mockThumbnail(3),
    total: { amount: 8999, currency: { code: 'USD', divisibility: 2 } },
    quantity: 1,
    timestamp: DAY_AGO,
    state: 'FULFILLED',
    vendorID: MOCK_PEER_ID,
    buyerID: MOCK_BUYER_PEER_ID,
    paymentCoin: 'ETH',
    read: true,
    moderated: false,
    unreadChatMessages: 0,
  },
  {
    orderID: 'QmOrder002',
    slug: 'logo-design-package',
    title: 'Professional Logo Design Package',
    thumbnail: mockThumbnail(24),
    total: { amount: 14900, currency: { code: 'USD', divisibility: 2 } },
    quantity: 1,
    timestamp: WEEK_AGO,
    state: 'COMPLETED',
    vendorID: MOCK_PEER_ID,
    buyerID: MOCK_BUYER_PEER_ID,
    paymentCoin: 'ETH',
    read: true,
    moderated: false,
    unreadChatMessages: 0,
  },
  {
    orderID: 'QmOrder003',
    slug: 'vintage-camera',
    title: 'Vintage Film Camera - Refurbished',
    thumbnail: mockThumbnail(36),
    total: { amount: 24500, currency: { code: 'USD', divisibility: 2 } },
    quantity: 1,
    timestamp: NOW,
    state: 'AWAITING_FULFILLMENT',
    vendorID: MOCK_PEER_ID,
    buyerID: MOCK_BUYER_PEER_ID,
    paymentCoin: 'ETH',
    read: false,
    moderated: true,
    unreadChatMessages: 2,
  },
];

const mockSales = [
  {
    orderID: 'QmSale001',
    slug: 'handmade-leather-wallet',
    title: 'Handmade Leather Wallet',
    thumbnail: mockThumbnail(92),
    total: { amount: 5500, currency: { code: 'USD', divisibility: 2 } },
    quantity: 2,
    timestamp: DAY_AGO,
    state: 'AWAITING_FULFILLMENT',
    vendorID: MOCK_PEER_ID,
    buyerID: MOCK_BUYER_PEER_ID,
    paymentCoin: 'ETH',
    read: false,
    moderated: false,
    unreadChatMessages: 1,
  },
  {
    orderID: 'QmSale002',
    slug: 'organic-coffee-beans',
    title: 'Organic Coffee Beans - 1kg',
    thumbnail: mockThumbnail(63),
    total: { amount: 2200, currency: { code: 'USD', divisibility: 2 } },
    quantity: 3,
    timestamp: WEEK_AGO,
    state: 'COMPLETED',
    vendorID: MOCK_PEER_ID,
    buyerID: MOCK_BUYER_PEER_ID,
    paymentCoin: 'ETH',
    read: true,
    moderated: false,
    unreadChatMessages: 0,
  },
];

const mockNotifications = [
  {
    timestamp: NOW,
    read: false,
    type: 'order.created',
    notification: {
      notificationId: 'notif-001',
      orderId: 'QmSale001',
      title: 'Handmade Leather Wallet',
      thumbnail: mockSearchThumbnail(92),
    },
  },
  {
    timestamp: DAY_AGO,
    read: false,
    type: 'order.funded',
    notification: {
      notificationId: 'notif-002',
      orderId: 'QmOrder003',
      title: 'Vintage Film Camera - Refurbished',
    },
  },
  {
    timestamp: DAY_AGO,
    read: true,
    type: 'social.follow',
    notification: {
      notificationId: 'notif-003',
      peerId: MOCK_BUYER_PEER_ID,
    },
  },
  {
    timestamp: WEEK_AGO,
    read: true,
    type: 'order.fulfilled',
    notification: {
      notificationId: 'notif-004',
      orderId: 'QmOrder001',
      title: 'Wireless Noise-Cancelling Headphones',
    },
  },
  {
    timestamp: WEEK_AGO,
    read: true,
    type: 'order.completed',
    notification: {
      notificationId: 'notif-005',
      orderId: 'QmOrder002',
      title: 'Professional Logo Design Package',
    },
  },
];

const mockPreferencesWithAddresses = {
  shippingAddresses: [
    {
      name: 'John Smith',
      company: 'Mobazha Inc.',
      addressLineOne: '123 Blockchain Avenue',
      addressLineTwo: 'Suite 456',
      city: 'San Francisco',
      state: 'CA',
      postalCode: '94105',
      country: 'US',
      addressNotes: 'Main office',
    },
    {
      name: 'John Smith',
      addressLineOne: '789 Crypto Lane',
      city: 'Austin',
      state: 'TX',
      postalCode: '73301',
      country: 'US',
      addressNotes: 'Home address',
    },
  ],
};

const mockSearchResults = {
  results: {
    total: 6,
    morePages: false,
    results: [
      {
        type: 'listing',
        relationships: {},
        data: {
          slug: 'wireless-headphones',
          title: 'Wireless Noise-Cancelling Headphones',
          tags: ['electronics', 'headphones'],
          categories: ['Electronics'],
          contractType: 'PHYSICAL_GOOD',
          description: 'Premium over-ear headphones with ANC and 40hr battery',
          thumbnail: mockSearchThumbnail(3),
          price: { amount: 8999, currency: { code: 'USD', divisibility: 2 } },
          averageRating: 4.8,
          ratingCount: 24,
          hash: '',
          vendor: { peerID: MOCK_PEER_ID, handle: 'TechStore', name: 'Tech Store' },
        },
      },
      {
        type: 'listing',
        relationships: {},
        data: {
          slug: 'vintage-camera',
          title: 'Vintage Film Camera - Refurbished',
          tags: ['camera', 'vintage'],
          categories: ['Electronics'],
          contractType: 'PHYSICAL_GOOD',
          description: 'Classic 35mm film camera, fully refurbished and tested',
          thumbnail: mockSearchThumbnail(36),
          price: { amount: 24500, currency: { code: 'USD', divisibility: 2 } },
          averageRating: 4.5,
          ratingCount: 8,
          hash: '',
          vendor: { peerID: MOCK_PEER_ID, handle: 'VintageGoods', name: 'Vintage Goods' },
        },
      },
      {
        type: 'listing',
        relationships: {},
        data: {
          slug: 'organic-coffee',
          title: 'Organic Coffee Beans - Single Origin',
          tags: ['coffee', 'organic'],
          categories: ['Food'],
          contractType: 'PHYSICAL_GOOD',
          description: 'Premium single-origin coffee beans from Ethiopia',
          thumbnail: mockSearchThumbnail(63),
          price: { amount: 2200, currency: { code: 'USD', divisibility: 2 } },
          averageRating: 4.9,
          ratingCount: 42,
          hash: '',
          vendor: { peerID: MOCK_PEER_ID, handle: 'CoffeeHouse', name: 'Coffee House' },
        },
      },
      {
        type: 'listing',
        relationships: {},
        data: {
          slug: 'logo-design',
          title: 'Professional Logo Design Package',
          tags: ['design', 'logo'],
          categories: ['Services'],
          contractType: 'SERVICE',
          description: '3 unique logo concepts with unlimited revisions',
          thumbnail: mockSearchThumbnail(24),
          price: { amount: 14900, currency: { code: 'USD', divisibility: 2 } },
          averageRating: 5.0,
          ratingCount: 15,
          hash: '',
          vendor: { peerID: MOCK_PEER_ID, handle: 'DesignPro', name: 'Design Pro Studio' },
        },
      },
    ],
  },
};

const mockOrderDetail = {
  contract: {
    orderOpen: {
      listings: [
        {
          listing: {
            slug: 'wireless-headphones',
            metadata: { contractType: 'PHYSICAL_GOOD' },
            item: {
              title: 'Wireless Noise-Cancelling Headphones',
              description: 'Premium over-ear headphones with ANC',
              price: '8999',
              images: [{ ...mockThumbnail(3), filename: 'headphones.png' }],
              skus: [{ productID: '1', quantity: '100' }],
            },
            shippingOptions: [
              {
                name: 'Standard',
                type: 'FIXED_PRICE',
                regions: ['ALL'],
                services: [
                  { name: 'Standard', estimatedDelivery: '5-7 days', firstFreight: '599' },
                ],
              },
            ],
          },
        },
      ],
      payment: {
        coin: 'ETH',
        chaincode: '',
        amount: '8999',
        method: 'DIRECT',
      },
      shipping: {
        shipTo: 'John Smith',
        address: '123 Blockchain Avenue',
        city: 'San Francisco',
        state: 'CA',
        postalCode: '94105',
        country: 'US',
      },
      items: [{ listingHash: '', quantity: '1' }],
      timestamp: WEEK_AGO,
      buyerID: { peerID: MOCK_BUYER_PEER_ID },
    },
    orderConfirmation: {
      timestamp: DAY_AGO,
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
          images: [mockThumbnail(3)],
        },
      },
    ],
  },
  state: 'FULFILLED',
  read: true,
  funded: true,
  paymentAddressTransactions: [
    { txid: '0x1234567890abcdef', value: '8999', confirmations: 12, timestamp: WEEK_AGO },
  ],
};

/**
 * Set up route mocking for orders pages.
 */
export async function mockOrdersAPI(page: Page): Promise<void> {
  await page.route('**/v1/purchases*', (route, request) => {
    if (request.method() !== 'GET') return route.fallback();
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ purchases: mockPurchases }),
    });
  });

  await page.route('**/v1/sales*', (route, request) => {
    if (request.method() !== 'GET') return route.fallback();
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ sales: mockSales }),
    });
  });

  await page.route('**/v1/profiles/batch*', (route, request) => {
    if (request.method() !== 'GET') return route.fallback();
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({}),
    });
  });
}

/**
 * Set up route mocking for order detail page.
 */
export async function mockOrderDetailAPI(page: Page): Promise<void> {
  await page.route('**/v1/orders/**', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockOrderDetail),
    });
  });
}

/**
 * Set up route mocking for notifications page.
 */
export async function mockNotificationsAPI(page: Page): Promise<void> {
  await page.route('**/v1/notifications*', route => {
    const url = route.request().url();
    if (url.includes('/read')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    }
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        unread: mockNotifications.filter(n => !n.read).length,
        total: mockNotifications.length,
        notifications: mockNotifications,
      }),
    });
  });
}

/**
 * Set up route mocking for preferences (addresses) page.
 */
export async function mockPreferencesAPI(page: Page): Promise<void> {
  await page.route('**/v1/preferences*', route => {
    if (route.request().method() === 'GET') {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockPreferencesWithAddresses),
      });
    } else {
      route.continue();
    }
  });
}

/**
 * Set up route mocking for search results page.
 */
export async function mockSearchAPI(page: Page): Promise<void> {
  await page.route('**/api/search?**', route => {
    const url = route.request().url();
    if (url.includes('profile_m') || url.includes('search/profile')) {
      return route.continue();
    }
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockSearchResults),
    });
  });
}

/**
 * Mock a single product/listing detail for product detail page.
 * Intercepts GET /v1/listings/{peerID}/{slug} and /v1/listings/{slug}.
 */
const mockProductListing = {
  slug: 'wireless-headphones',
  metadata: {
    version: 1,
    contractType: 'PHYSICAL_GOOD',
    format: 'FIXED_PRICE',
    pricingCurrency: { code: 'USD', divisibility: 2 },
    expiry: '2030-12-31T23:59:59Z',
    acceptedCurrencies: ['ETH', 'BTC'],
  },
  item: {
    title: 'Wireless Noise-Cancelling Headphones',
    description:
      'Premium over-ear headphones with active noise cancellation, 40hr battery life, and Bluetooth 5.3. Features include multipoint connection, wear detection, and customizable EQ.',
    processingTime: '1-3 business days',
    price: '8999',
    nsfw: false,
    tags: ['electronics', 'headphones', 'audio'],
    categories: ['Electronics'],
    grams: 280,
    condition: 'New',
    images: [{ ...mockThumbnail(3), filename: 'headphones.png' }],
    skus: [{ productID: '1', quantity: '100', price: '8999' }],
  },
  shippingOptions: [
    {
      name: 'Standard Shipping',
      type: 'FIXED_PRICE',
      regions: ['ALL'],
      services: [{ name: 'Standard', estimatedDelivery: '5-7 days', firstFreight: '599' }],
    },
    {
      name: 'Express Shipping',
      type: 'FIXED_PRICE',
      regions: ['US'],
      services: [{ name: 'Express', estimatedDelivery: '2-3 days', firstFreight: '1299' }],
    },
  ],
  averageRating: 4.8,
  ratingCount: 24,
  vendorID: { peerID: MOCK_PEER_ID },
};

export async function mockProductDetailAPI(page: Page): Promise<void> {
  await page.route('**/v1/listings/**', route => {
    const url = route.request().url();
    if (route.request().method() !== 'GET') {
      return route.continue();
    }
    if (url.includes('/v1/listings/') && !url.includes('/v1/listings?')) {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockProductListing),
      });
    } else {
      route.continue();
    }
  });
}

/**
 * Intercept image requests from the backend (/v1/media/images/*)
 * and redirect to picsum.photos so images always display in visual tests.
 */
export async function mockImageRoutes(page: Page): Promise<void> {
  await page.route('**/v1/media/images/**', route => {
    route.fulfill({
      status: 302,
      headers: { Location: 'https://picsum.photos/id/237/300/300' },
    });
  });
}

/**
 * Set up all mocks for a comprehensive visual test run.
 */
export async function mockAllAPIs(page: Page): Promise<void> {
  await mockOrdersAPI(page);
  await mockNotificationsAPI(page);
  await mockSearchAPI(page);
  await mockImageRoutes(page);
}
