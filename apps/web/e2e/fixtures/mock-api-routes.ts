/**
 * Mock API Routes for Visual Tests
 *
 * Uses Playwright page.route() to intercept API calls and return mock data,
 * so pages that normally need backend data can show populated states.
 *
 * All JSON responses use the Phase G envelope format:
 *   - Success (2xx): { data: T }
 *   - Error (4xx/5xx): { error: { code: string, message: string } }
 */

import path from 'node:path';
import type { Page } from '@playwright/test';
import { mustAssetIdFromTokenId } from '@mobazha/core/data';

function wrapData<T>(data: T): string {
  return JSON.stringify({ data });
}

export const MOCK_PEER_ID = 'QmY8tRnCzUf45FnPLMvFi35R5bYjCEiCKbgEN39xnScj8P';
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
    state: 'SHIPPED',
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
    state: 'AWAITING_SHIPMENT',
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
    state: 'AWAITING_SHIPMENT',
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
    type: 'order.shipped',
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
              description: 'Premium over-ear headphones with ANC',
              price: 8999,
              images: [{ ...mockThumbnail(3), filename: 'headphones.png' }],
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
                          price: '599',
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
        method: 'DIRECT',
      },
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
          memo: 'Please ship ASAP, thank you!',
          shippingOption: { name: 'Standard', service: 'Standard' },
        },
      ],
      timestamp: WEEK_AGO,
      buyerID: { peerID: MOCK_BUYER_PEER_ID, handle: 'CryptoBuyer' },
      alternateContactInfo: 'john@example.com',
    },
    orderConfirmation: {
      timestamp: DAY_AGO,
    },
    orderShipments: [
      {
        timestamp: DAY_AGO,
        shipments: [
          {
            physicalDelivery: { shipper: 'FedEx', trackingNumber: 'FX1234567890' },
          },
        ],
      },
    ],
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
  state: 'SHIPPED',
  read: true,
  funded: true,
  paymentAddressTransactions: [
    { txid: '0x1234567890abcdef', value: 8999, confirmations: 12, timestamp: WEEK_AGO },
  ],
  protection: {
    stage: 'PROTECTION_PERIOD',
    daysRemaining: 8,
    autoCompleteAt: new Date(Date.now() + 8 * 86400000).toISOString(),
    extendable: true,
    extended: false,
    afterSaleWindowDays: 7,
  },
};

const mockOperatorMarketplace = {
  id: 'mp1',
  name: 'Crypto Collectibles',
  slug: 'crypto-collectibles',
  status: 'published',
  description: 'Curated collectibles marketplace',
  ownerUserID: 'owner-1',
  buyerAccessMode: 'open',
  sellerReviewMode: 'manual',
  catalogMode: 'curated',
  discoverability: 'public',
  sellerEntryMode: 'operator_invited',
  vertical: 'collectibles',
  plan: 'free',
  domains: [
    {
      host: 'crypto.example.test',
      kind: 'subdomain',
      verificationStatus: 'verified',
      isPrimary: true,
    },
  ],
  createdAt: NOW,
  updatedAt: NOW,
};

const mockMarketplaceSellerMembership = {
  id: 1,
  tenantID: 'tenant-visual',
  marketplaceID: 'mp1',
  userID: 'user-visual',
  peerID: MOCK_PEER_ID,
  status: 'invited',
  unreadReviewCount: 0,
  isVisible: false,
  productGroupIDs: [],
  productGroups: [],
  invitedAt: DAY_AGO,
};

const mockMarketplaceMembershipEntry = {
  membership: mockMarketplaceSellerMembership,
  marketplace: {
    id: mockOperatorMarketplace.id,
    name: mockOperatorMarketplace.name,
    slug: mockOperatorMarketplace.slug,
    status: mockOperatorMarketplace.status,
    description: mockOperatorMarketplace.description,
  },
};

/**
 * Mock native marketplace operator + store invitation APIs.
 */
export async function mockMarketplaceOperatorAPI(page: Page): Promise<void> {
  await page.route('**/platform/v1/marketplaces/mine', (route, request) => {
    if (request.method() !== 'GET') return route.fallback();
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: wrapData([mockOperatorMarketplace]),
    });
  });

  await page.route('**/platform/v1/marketplaces/mp1', (route, request) => {
    if (request.method() === 'GET') {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: wrapData(mockOperatorMarketplace),
      });
      return;
    }
    return route.fallback();
  });

  await page.route('**/platform/v1/marketplaces/mp1/sellers', (route, request) => {
    if (request.method() !== 'GET') return route.fallback();
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: wrapData([
        mockMarketplaceSellerMembership,
        {
          ...mockMarketplaceSellerMembership,
          id: 2,
          peerID: 'QmApprovedSeller1',
          status: 'approved',
          isVisible: true,
          acceptedAt: DAY_AGO,
        },
      ]),
    });
  });

  await page.route('**/platform/v1/marketplace-memberships/mine', (route, request) => {
    if (request.method() !== 'GET') return route.fallback();
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: wrapData([mockMarketplaceMembershipEntry]),
    });
  });

  await page.route(
    `**/platform/v1/marketplaces/mp1/sellers/${encodeURIComponent(MOCK_PEER_ID)}/accept`,
    (route, request) => {
      if (request.method() !== 'POST') return route.fallback();
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: wrapData({
          ...mockMarketplaceSellerMembership,
          status: 'accepted',
          acceptedAt: NOW,
        }),
      });
    }
  );
}

/**
 * Set up route mocking for orders pages.
 */
export async function mockOrdersAPI(page: Page): Promise<void> {
  await page.route('**/v1/purchases*', (route, request) => {
    if (request.method() !== 'GET') return route.fallback();
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: wrapData({ purchases: mockPurchases }),
    });
  });

  await page.route('**/v1/sales*', (route, request) => {
    if (request.method() !== 'GET') return route.fallback();
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: wrapData({ sales: mockSales }),
    });
  });

  await page.route('**/v1/profiles/batch*', (route, request) => {
    if (request.method() !== 'GET') return route.fallback();
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: wrapData({}),
    });
  });
}

const mockVendorProfile = {
  peerID: MOCK_PEER_ID,
  name: 'TechStore',
  handle: 'techstore',
  location: 'San Francisco, CA',
  avatarHashes: mockThumbnail(64),
  about: 'Premium electronics store with crypto-native payments and worldwide shipping.',
};

const mockBuyerProfile = {
  peerID: MOCK_BUYER_PEER_ID,
  name: 'CryptoBuyer',
  handle: 'cryptobuyer',
  location: 'New York, NY',
  avatarHashes: mockThumbnail(177),
  about: 'Web3 enthusiast and frequent buyer.',
};

/**
 * Set up route mocking for order detail page.
 * Includes order data + profile data for counterparty card rendering.
 */
export async function mockOrderDetailAPI(
  page: Page,
  overrides?: Record<string, unknown>
): Promise<void> {
  const detail = overrides ? { ...mockOrderDetail, ...overrides } : mockOrderDetail;
  await page.route('**/v1/orders/**', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: wrapData(detail),
    });
  });

  await page.route('**/search/v1/profiles/raw/**', route => {
    const url = route.request().url();
    const profile = url.includes(MOCK_PEER_ID) ? mockVendorProfile : mockBuyerProfile;
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: wrapData(profile),
    });
  });

  await page.route('**/v1/profiles/**', route => {
    const url = route.request().url();
    if (url.includes('/profiles/batch')) return route.fallback();
    const profile = url.includes(MOCK_PEER_ID) ? mockVendorProfile : mockBuyerProfile;
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: wrapData(profile),
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
      return route.fulfill({ status: 200, contentType: 'application/json', body: wrapData({}) });
    }
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: wrapData({
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
        body: wrapData(mockPreferencesWithAddresses),
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
  await page.route('**/search/v1/listings**', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: wrapData(mockSearchResults),
    });
  });
}

const mockStoreListingItems = [
  {
    slug: 'wireless-headphones',
    title: 'Wireless Noise-Cancelling Headphones',
    contractType: 'PHYSICAL_GOOD',
    thumbnail: mockSearchThumbnail(3),
    price: { amount: 8999, currency: { code: 'USD', divisibility: 2 } },
    averageRating: 4.8,
    ratingCount: 24,
    productType: 'Electronics',
  },
  {
    slug: 'vintage-camera',
    title: 'Vintage Film Camera - Refurbished',
    contractType: 'PHYSICAL_GOOD',
    thumbnail: mockSearchThumbnail(36),
    price: { amount: 24500, currency: { code: 'USD', divisibility: 2 } },
    averageRating: 4.5,
    ratingCount: 8,
    productType: 'Electronics',
  },
  {
    slug: 'organic-coffee',
    title: 'Organic Coffee Beans - Single Origin',
    contractType: 'PHYSICAL_GOOD',
    thumbnail: mockSearchThumbnail(63),
    price: { amount: 2200, currency: { code: 'USD', divisibility: 2 } },
    averageRating: 4.9,
    ratingCount: 42,
    productType: 'Food',
  },
  {
    slug: 'logo-design',
    title: 'Professional Logo Design Package',
    contractType: 'SERVICE',
    thumbnail: mockSearchThumbnail(24),
    price: { amount: 14900, currency: { code: 'USD', divisibility: 2 } },
    averageRating: 5.0,
    ratingCount: 15,
    productType: 'Services',
  },
  {
    slug: 'leather-backpack',
    title: 'Handcrafted Leather Backpack',
    contractType: 'PHYSICAL_GOOD',
    thumbnail: mockSearchThumbnail(119),
    price: { amount: 17500, currency: { code: 'USD', divisibility: 2 } },
    averageRating: 4.7,
    ratingCount: 31,
    productType: 'Fashion',
  },
  {
    slug: 'smart-watch',
    title: 'Smart Watch Pro 2025',
    contractType: 'PHYSICAL_GOOD',
    thumbnail: mockSearchThumbnail(160),
    price: { amount: 29999, currency: { code: 'USD', divisibility: 2 } },
    averageRating: 4.6,
    ratingCount: 19,
    productType: 'Electronics',
  },
];

/**
 * Mock store listing index (list of products for a store page).
 */
export async function mockStoreListingsAPI(page: Page): Promise<void> {
  await page.route('**/v1/listings/index/**', route => {
    if (route.request().method() !== 'GET') return route.continue();
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: wrapData(mockStoreListingItems),
    });
  });

  await page.route('**/v1/listings/index', route => {
    if (route.request().method() !== 'GET') return route.continue();
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: wrapData(mockStoreListingItems),
    });
  });

  await page.route('**/v1/collections*', route => {
    if (route.request().method() !== 'GET') return route.continue();
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: wrapData({
        data: [
          { id: 'col-1', title: 'Best Sellers', products: ['a', 'b', 'c'] },
          { id: 'col-2', title: 'New Arrivals', products: ['d', 'e'] },
          { id: 'col-3', title: 'Holiday Deals', products: ['f'] },
        ],
      }),
    });
  });

  await page.route('**/platform/v1/store-access/**', route => {
    route.fulfill({ status: 200, contentType: 'application/json', body: wrapData({}) });
  });

  await page.route('**/v1/social/following/**', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: wrapData({ isFollowing: false }),
    });
  });

  await page.route('**/v1/social/blocked/**', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: wrapData({ isBlocked: false }),
    });
  });

  await page.route('**/platform/v1/integrations/storefront-config/**', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: wrapData({
        sections: [
          {
            id: 'hero',
            type: 'hero',
            visible: true,
            config: {
              headline: 'Welcome to TechStore',
              subheadline: 'Premium electronics with crypto-native payments',
              ctaText: 'Shop Now',
              ctaLink: '/search',
            },
          },
          {
            id: 'featured',
            type: 'product_grid',
            visible: true,
            config: { title: 'Featured Products', maxItems: 6 },
          },
          {
            id: 'trust',
            type: 'trust_badges',
            visible: true,
            config: {
              badges: [
                { icon: 'shield', text: 'Buyer Protection' },
                { icon: 'truck', text: 'Free Shipping' },
                { icon: 'refresh', text: '30-Day Returns' },
              ],
            },
          },
        ],
      }),
    });
  });
}

/**
 * Mock product/listing detail. Returns different products based on the slug
 * in the URL so checkout and multi-product views render distinct items.
 * Intercepts GET /v1/listings/{peerID}/{slug} and /v1/listings/{slug}.
 */
function makeMockProduct(
  slug: string,
  title: string,
  price: string,
  imageId: number,
  opts?: {
    categories?: string[];
    tags?: string[];
    grams?: number;
    ratingCount?: number;
    averageRating?: number;
    shippingOnly?: string;
  }
) {
  return {
    slug,
    metadata: {
      version: 1,
      contractType: 'PHYSICAL_GOOD',
      format: 'FIXED_PRICE',
      pricingCurrency: { code: 'USD', divisibility: 2 },
      expiry: '2030-12-31T23:59:59Z',
      acceptedCurrencies: [mustAssetIdFromTokenId('ETH'), mustAssetIdFromTokenId('BTC')],
    },
    item: {
      title,
      description: `High-quality ${title.toLowerCase()} with premium build and fast shipping.`,
      processingTime: '1-3 business days',
      price,
      nsfw: false,
      tags: opts?.tags ?? ['general'],
      categories: opts?.categories ?? ['General'],
      grams: opts?.grams ?? 200,
      condition: 'New',
      images: [{ ...mockThumbnail(imageId), filename: `${slug}.png` }],
      skus: [{ productID: slug, quantity: '100', price }],
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
              name: 'Standard Shipping',
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
    averageRating: opts?.averageRating ?? 4.7,
    ratingCount: opts?.ratingCount ?? 20,
    vendorID: { peerID: MOCK_PEER_ID },
  };
}

const mockProductCatalog: Record<string, ReturnType<typeof makeMockProduct>> = {
  'wireless-headphones': makeMockProduct(
    'wireless-headphones',
    'Wireless Noise-Cancelling Headphones',
    '8999',
    3,
    {
      categories: ['Electronics'],
      tags: ['electronics', 'headphones', 'audio'],
      grams: 280,
      averageRating: 4.8,
      ratingCount: 24,
    }
  ),
  'usb-c-cable': makeMockProduct('usb-c-cable', 'USB-C Fast Charging Cable (2m)', '1499', 80, {
    categories: ['Electronics'],
    tags: ['electronics', 'accessories', 'cable'],
    grams: 45,
    averageRating: 4.6,
    ratingCount: 87,
  }),
  'leather-wallet': makeMockProduct('leather-wallet', 'Minimalist Leather Wallet', '4500', 140, {
    categories: ['Fashion'],
    tags: ['fashion', 'accessories', 'wallet'],
    grams: 85,
    averageRating: 4.9,
    ratingCount: 53,
  }),
};

const defaultMockProduct = mockProductCatalog['wireless-headphones'];

function getProductBySlug(url: string) {
  const parts = url.split('/');
  const slug = parts[parts.length - 1]?.split('?')[0] ?? '';
  return mockProductCatalog[slug] ?? defaultMockProduct;
}

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
        body: wrapData(getProductBySlug(url)),
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
 * Inject mock cart data into localStorage for Zustand persist store.
 * Call via page.addInitScript() BEFORE page.goto().
 */
export function getCartLocalStorageScript(): string {
  const cartState = {
    state: {
      items: [
        {
          listing: {
            slug: 'wireless-headphones',
            title: 'Premium Wireless Noise-Canceling Headphones',
            thumbnail: mockSearchThumbnail(96),
            price: { amount: 14999, currency: { code: 'USD', divisibility: 2 } },
            vendorPeerID: MOCK_PEER_ID,
            vendorName: 'techstore',
          },
          quantity: 1,
          options: [{ name: 'Color', value: 'Midnight Black' }],
        },
        {
          listing: {
            slug: 'usb-c-cable',
            title: 'USB-C Fast Charging Cable 2m',
            thumbnail: mockSearchThumbnail(60),
            price: { amount: 1299, currency: { code: 'USD', divisibility: 2 } },
            vendorPeerID: MOCK_PEER_ID,
            vendorName: 'techstore',
          },
          quantity: 2,
        },
        {
          listing: {
            slug: 'leather-wallet',
            title: 'Handcrafted Genuine Leather Bifold Wallet',
            thumbnail: mockSearchThumbnail(119),
            price: { amount: 5999, currency: { code: 'USD', divisibility: 2 } },
            vendorPeerID: 'QmVendor2PeerID',
            vendorName: 'craftshop',
          },
          quantity: 1,
          options: [{ name: 'Color', value: 'Cognac Brown' }],
        },
      ],
      isLoading: false,
    },
    version: 0,
  };
  return `localStorage.setItem('mobazha-cart-storage', '${JSON.stringify(cartState).replace(/'/g, "\\'")}');`;
}

/**
 * Mock storefront configuration for branding editor page.
 * Intercepts GET /v1/settings/storefront.
 */
export async function mockStorefrontConfigAPI(page: Page): Promise<void> {
  await page.route('**/v1/settings/storefront**', route => {
    if (route.request().method() !== 'GET') return route.continue();
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: wrapData({
        sections: [
          {
            id: 'hero',
            type: 'hero',
            visible: true,
            order: 0,
            config: {
              headline: 'Welcome to TechStore',
              subheadline: 'Premium electronics with crypto-native payments',
              ctaText: 'Shop Now',
              ctaLink: '/search',
              backgroundImage: '',
            },
          },
          {
            id: 'featured',
            type: 'product_grid',
            visible: true,
            order: 1,
            config: { title: 'Featured Products', maxItems: 6 },
          },
          {
            id: 'trust',
            type: 'trust_badges',
            visible: true,
            order: 2,
            config: {
              badges: [
                { icon: 'shield', text: 'Buyer Protection' },
                { icon: 'truck', text: 'Free Shipping' },
                { icon: 'refresh', text: '30-Day Returns' },
              ],
            },
          },
          {
            id: 'about',
            type: 'about',
            visible: true,
            order: 3,
            config: {
              title: 'About Us',
              body: 'We are a premium electronics store with crypto-native payments.',
            },
          },
        ],
        theme: {
          primaryColor: '#2563eb',
          fontFamily: 'Inter',
        },
      }),
    });
  });
}

/**
 * Mock discounts API for admin discounts page.
 * Intercepts GET /v1/discounts.
 */
export async function mockDiscountsAPI(page: Page): Promise<void> {
  await page.route('**/v1/discounts**', route => {
    if (route.request().method() !== 'GET') return route.continue();
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: wrapData([
        {
          id: 'disc-001',
          title: 'Summer Sale 20%',
          type: 'percentage',
          value: 20,
          code: 'SUMMER20',
          status: 'active',
          usageCount: 15,
          usageLimit: 100,
          startsAt: WEEK_AGO,
          endsAt: '2030-12-31T23:59:59Z',
          appliesTo: 'all',
          createdAt: WEEK_AGO,
        },
        {
          id: 'disc-002',
          title: 'New Customer $10 Off',
          type: 'fixed_amount',
          value: 1000,
          code: 'WELCOME10',
          status: 'active',
          usageCount: 42,
          usageLimit: 500,
          startsAt: WEEK_AGO,
          endsAt: '2030-06-30T23:59:59Z',
          appliesTo: 'all',
          createdAt: WEEK_AGO,
        },
        {
          id: 'disc-003',
          title: 'Flash Sale 30%',
          type: 'percentage',
          value: 30,
          code: 'FLASH30',
          status: 'expired',
          usageCount: 89,
          usageLimit: 100,
          startsAt: WEEK_AGO,
          endsAt: DAY_AGO,
          appliesTo: 'specific_products',
          createdAt: WEEK_AGO,
        },
      ]),
    });
  });
}

/**
 * Mock collections admin API for admin collections page.
 * Intercepts GET /v1/collections (broader pattern than mock-auth.ts).
 */
export async function mockCollectionsAdminAPI(page: Page): Promise<void> {
  await page.route('**/v1/collections**', route => {
    if (route.request().method() !== 'GET') return route.continue();
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: wrapData([
        {
          id: 'col-1',
          title: 'Best Sellers',
          description: 'Our most popular products',
          productCount: 6,
          publishedAt: WEEK_AGO,
          createdAt: WEEK_AGO,
          updatedAt: DAY_AGO,
        },
        {
          id: 'col-2',
          title: 'New Arrivals',
          description: 'Latest additions to our store',
          productCount: 4,
          publishedAt: DAY_AGO,
          createdAt: DAY_AGO,
          updatedAt: NOW,
        },
        {
          id: 'col-3',
          title: 'Holiday Deals',
          description: 'Special holiday discounts',
          productCount: 8,
          publishedAt: WEEK_AGO,
          createdAt: WEEK_AGO,
          updatedAt: WEEK_AGO,
        },
      ]),
    });
  });
}

/**
 * Mock fiat payment providers API for visual tests.
 * Returns Stripe + PayPal as active providers.
 */
export async function mockFiatProvidersAPI(page: Page): Promise<void> {
  await page.route('**/fiat/providers**', route => {
    if (route.request().method() !== 'GET') return route.continue();
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: wrapData([
        { providerID: 'stripe', status: 'active', accountID: 'acct_stripe_mock' },
        { providerID: 'paypal', status: 'active', accountID: 'paypal_mock@example.com' },
      ]),
    });
  });

  await page.route('**/fiat/config**', route => {
    if (route.request().method() !== 'GET') return route.continue();
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: wrapData([
        { providerID: 'stripe', enabled: true, mode: 'live' },
        { providerID: 'paypal', enabled: true, mode: 'live' },
      ]),
    });
  });
}

interface MockPaymentMethodsOptions {
  crypto?: string[];
  fiat?: Array<{
    providerID: string;
    status: 'active' | 'restricted' | 'disabled' | 'inactive';
    accountID?: string;
  }>;
}

const DEFAULT_PAYMENT_METHOD_TOKEN_IDS = [
  'ETHUSDT',
  'BSCUSDT',
  'BASEUSDT',
  'SOLUSDT',
  'TRXUSDT',
] as const;

const DEFAULT_PAYMENT_METHOD_ASSET_IDS = DEFAULT_PAYMENT_METHOD_TOKEN_IDS.map(tokenID =>
  mustAssetIdFromTokenId(tokenID)
);

/**
 * Mock buyer payment methods endpoint used by usePaymentMethods().
 * Intercepts GET /v1/payment-methods/:peerID and returns crypto + fiat methods.
 */
export async function mockPaymentMethodsAPI(
  page: Page,
  opts?: MockPaymentMethodsOptions
): Promise<void> {
  const crypto = opts?.crypto ?? DEFAULT_PAYMENT_METHOD_ASSET_IDS;
  const fiat = opts?.fiat ?? [];

  await page.route('**/payment-methods/**', route => {
    if (route.request().method() !== 'GET') return route.continue();
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: wrapData({ crypto, fiat }),
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
  await mockFiatProvidersAPI(page);
}

const MOCK_PRODUCT_IMPORT_RUN_ID = 'run_visual_import_1';

const mockProductImportWorkbench = {
  skillRun: {
    id: MOCK_PRODUCT_IMPORT_RUN_ID,
    skillId: 'product.import',
    status: 'waiting_for_review',
    startedAt: DAY_AGO,
    updatedAt: NOW,
  },
  sources: [
    {
      artifactId: 'art_src_visual',
      sourceName: 'midnight-waves-cover.jpg',
      contentType: 'image/jpeg',
      status: 'ready',
      hasPreview: true,
    },
  ],
  rows: [
    {
      proposalArtifactId: 'art_prop_visual_1',
      sourceName: 'midnight-waves-cover.jpg',
      rowNumber: 1,
      status: 'needs_review',
      draft: {
        title: 'Linen Tote Bag',
        description: 'Handwoven linen tote with interior pocket.',
      },
      updatedAt: NOW,
    },
    {
      proposalArtifactId: 'art_prop_visual_2',
      sourceName: 'midnight-waves-cover.jpg',
      rowNumber: 2,
      status: 'needs_review',
      draft: {
        title: 'Ceramic Mug Set',
        price: { amountMinor: 2800, currencyCode: 'USD', divisibility: 2 },
        inventory: { quantity: 50 },
      },
      approval: {
        id: 'approval_visual_pending',
        status: 'pending',
        action: 'create_listing',
        requestHash: 'hash_visual_pending',
      },
      updatedAt: NOW,
    },
    {
      proposalArtifactId: 'art_prop_visual_3',
      sourceName: 'midnight-waves-cover.jpg',
      rowNumber: 3,
      status: 'needs_review',
      draft: {
        title: 'Wool Throw Blanket',
        price: { amountMinor: 8900, currencyCode: 'USD', divisibility: 2 },
        inventory: { quantity: 12 },
      },
      approval: {
        id: 'approval_visual_approved',
        status: 'approved',
        action: 'create_listing',
        requestHash: 'hash_visual_approved',
      },
      updatedAt: NOW,
    },
  ],
  validationReports: [
    {
      artifactId: 'art_val_visual',
      sourceName: 'midnight-waves-cover.jpg',
      status: 'ready',
      data: {
        code: 'image_review',
        message: 'Review AI-extracted image details before publishing.',
      },
    },
  ],
  counts: { source: 1, proposal: 3, validation: 1 },
  summary: {
    noApprovalCount: 1,
    pendingApprovalCount: 1,
    approvedCount: 1,
    applyingCount: 0,
    appliedCount: 0,
    rejectedCount: 0,
    applyFailedCount: 0,
    reviewableCount: 3,
    skippedCount: 0,
    actionableCount: 3,
  },
  page: { offset: 0, totalRows: 3, returnedRows: 3 },
};

/**
 * Mock product import workbench + minimal AI endpoints for visual tests.
 */
export async function mockProductImportWorkbenchAPI(page: Page): Promise<void> {
  await page.route('**/v1/agent/artifacts/art_src_visual/content', route => {
    if (route.request().method() !== 'GET') return route.fallback();
    route.fulfill({
      status: 200,
      contentType: 'image/png',
      path: path.resolve('public/icons/icon-512x512.png'),
    });
  });

  await page.route('**/v1/ai/status**', route => {
    if (route.request().method() !== 'GET') return route.fallback();
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: wrapData({ available: true, provider: 'mock', model: 'mock-model' }),
    });
  });

  await page.route('**/v1/agent/chat/sessions**', route => {
    if (route.request().method() !== 'GET') return route.fallback();
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: wrapData([]),
    });
  });

  await page.route('**/v1/agent/product-import/runs/*/workbench**', route => {
    if (route.request().method() !== 'GET') return route.fallback();
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: wrapData(mockProductImportWorkbench),
    });
  });

  await page.route('**/v1/agent/product-import/runs/*/advance**', route => {
    if (route.request().method() !== 'POST') return route.fallback();
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: wrapData({
        skillRun: mockProductImportWorkbench.skillRun,
        workbench: mockProductImportWorkbench,
        counts: {
          sourceCount: 1,
          candidateCount: 0,
          proposalCount: 3,
          validationCount: 1,
          pendingAIExtractionCount: 0,
          createdProposalCount: 0,
          createdValidationCount: 0,
        },
        nextActions: [],
        skipped: [],
      }),
    });
  });

  await page.route('**/v1/agent/product-import/runs/*/approvals**', route => {
    if (route.request().method() !== 'POST') return route.fallback();
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: wrapData({
        approvals: [
          {
            id: 'approval_visual_created',
            tenant_id: 'tenant_visual',
            tool_call_id: 'artifact:art_prop_visual_1',
            skill_id: 'product.import',
            action: 'listings_create',
            summary: 'Create listing from product import proposal',
            request_hash: 'hash_visual_created',
            status: 'pending',
          },
        ],
        created: 1,
        reused: 0,
        skipped: [],
        page: { totalProposals: 3, selected: 1 },
      }),
    });
  });

  await page.route('**/v1/agent/product-import/runs/*/approval-decisions**', route => {
    if (route.request().method() !== 'POST') return route.fallback();
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: wrapData({ processed: 1, skipped: [], items: [], page: { selected: 1 } }),
    });
  });

  await page.route('**/v1/agent/product-import/runs/*/approval-applications**', route => {
    if (route.request().method() !== 'POST') return route.fallback();
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: wrapData({ processed: 1, skipped: [], items: [], page: { selected: 1 } }),
    });
  });
}

export { MOCK_PRODUCT_IMPORT_RUN_ID };
