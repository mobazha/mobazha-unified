/**
 * Mock Order Lifecycle — comprehensive mock data for all order states,
 * reviews, chat messages, wallet transactions, and multi-variant products.
 *
 * All responses use Phase G envelope: { data: T }
 *
 * Usage:
 *   import { mockFullLifecycleAPIs, getOrderByState } from './mock-order-lifecycle';
 *   await mockFullLifecycleAPIs(page);
 */

import type { Page } from '@playwright/test';

function wrapData<T>(data: T): string {
  return JSON.stringify({ data });
}

const MOCK_PEER_ID = 'QmY8tRnCzUf45FnPLMvFi35R5bYjCEiCKbgEN39xnScj8P';
const MOCK_BUYER_PEER_ID = 'QmBuyerPeer1234567890abcdefghijk';
const MOCK_MODERATOR_PEER_ID = 'QmModeratorPeer9876543210xyz';

const NOW = new Date().toISOString();
const HOUR_AGO = new Date(Date.now() - 3600000).toISOString();
const DAY_AGO = new Date(Date.now() - 86400000).toISOString();
const THREE_DAYS_AGO = new Date(Date.now() - 3 * 86400000).toISOString();
const WEEK_AGO = new Date(Date.now() - 7 * 86400000).toISOString();
const TWO_WEEKS_AGO = new Date(Date.now() - 14 * 86400000).toISOString();
const MONTH_AGO = new Date(Date.now() - 30 * 86400000).toISOString();

function mockThumbnail(id: number, size = 300) {
  const url = `https://picsum.photos/id/${id}/${size}/${size}`;
  return { tiny: url, small: url, medium: url, large: url, original: url };
}

// ─── Order Templates ────────────────────────────────────────────────

function makeBaseOrder(
  orderID: string,
  slug: string,
  title: string,
  price: number,
  imageId: number,
  state: string,
  timestamp: string,
  overrides?: Record<string, unknown>
) {
  return {
    contract: {
      OrderID: orderID,
      orderOpen: {
        listings: [
          {
            vendorID: { peerID: MOCK_PEER_ID },
            listing: {
              slug,
              metadata: {
                contractType: 'PHYSICAL_GOOD',
                pricingCurrency: { code: 'USD', divisibility: 2 },
              },
              vendorID: { peerID: MOCK_PEER_ID, handle: 'TechStore' },
              item: {
                title,
                description: `High-quality ${title.toLowerCase()}.`,
                price: String(price),
                images: [{ ...mockThumbnail(imageId), filename: `${slug}.png` }],
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
        payment: { coin: 'ETH', chaincode: '', amount: price, method: 'DIRECT' },
        pricingCoin: 'USD',
        amount: price,
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
        timestamp,
        buyerID: { peerID: MOCK_BUYER_PEER_ID, handle: 'CryptoBuyer' },
      },
      vendorListings: [
        {
          slug,
          metadata: {
            contractType: 'PHYSICAL_GOOD',
            pricingCurrency: { code: 'USD', divisibility: 2 },
          },
          item: { title, images: [mockThumbnail(imageId)] },
        },
      ],
      ...(overrides || {}),
    },
    state,
    read: state !== 'PENDING',
    funded: state !== 'PENDING',
    paymentAddressTransactions:
      state === 'PENDING'
        ? []
        : [{ txid: `0x${orderID.slice(2, 18)}abcdef`, value: price, confirmations: 12, timestamp }],
  };
}

export const LIFECYCLE_ORDERS = {
  PENDING: makeBaseOrder(
    'QmPending001',
    'wireless-headphones',
    'Wireless Noise-Cancelling Headphones',
    8999,
    3,
    'PENDING',
    HOUR_AGO
  ),

  AWAITING_SHIPMENT: makeBaseOrder(
    'QmAwait001',
    'leather-backpack',
    'Handcrafted Leather Backpack',
    17500,
    119,
    'AWAITING_SHIPMENT',
    DAY_AGO,
    { orderConfirmation: { timestamp: HOUR_AGO } }
  ),

  SHIPPED: makeBaseOrder(
    'QmFulfill001',
    'organic-coffee',
    'Organic Coffee Beans — Ethiopia',
    2200,
    63,
    'SHIPPED',
    THREE_DAYS_AGO,
    {
      orderConfirmation: { timestamp: THREE_DAYS_AGO },
      orderShipments: [
        {
          timestamp: DAY_AGO,
          shipments: [
            {
              physicalDelivery: { shipper: 'FedEx', trackingNumber: 'FX9876543210' },
            },
          ],
        },
      ],
    }
  ),

  COMPLETED: makeBaseOrder(
    'QmComplete001',
    'design-kit',
    'UI/UX Design Kit — 500+ Components',
    4900,
    24,
    'COMPLETED',
    TWO_WEEKS_AGO,
    {
      orderConfirmation: { timestamp: TWO_WEEKS_AGO },
      orderFulfillments: [{ timestamp: WEEK_AGO }],
      orderCompletion: { timestamp: WEEK_AGO },
      buyerRating: {
        overall: 5,
        review: 'Excellent design kit! Saved me weeks of work. Highly recommend.',
        timestamp: WEEK_AGO,
      },
      vendorRating: {
        overall: 5,
        review: 'Great buyer, smooth transaction.',
        timestamp: WEEK_AGO,
      },
    }
  ),

  DISPUTED: makeBaseOrder(
    'QmDispute001',
    'smart-watch',
    'Smart Watch Pro 2025',
    29999,
    160,
    'DISPUTED',
    TWO_WEEKS_AGO,
    {
      orderConfirmation: { timestamp: TWO_WEEKS_AGO },
      orderFulfillments: [
        {
          timestamp: WEEK_AGO,
          physicalDelivery: [{ shipper: 'UPS', trackingNumber: 'UPS1234567890' }],
        },
      ],
      disputeOpen: {
        timestamp: THREE_DAYS_AGO,
        evidenceHashes: [
          'QmT5NvUtoM5nWFfrQdVrFtvGfKFmG7AHE8P34isapyhCxX',
          'QmWATWQ7fVPP2EFGu71UkfnqhYXDYH566qy47CnJDgvs8u',
        ],
      },
      dispute: {
        timestamp: THREE_DAYS_AGO,
        claim: 'Item received damaged — screen has a crack on arrival.',
        payoutAddress: '0xBuyerPayoutAddr123',
      },
    }
  ),

  REFUNDED: makeBaseOrder(
    'QmRefund001',
    'ebook-web3',
    'E-Book: Mastering Web3 Commerce',
    1499,
    42,
    'REFUNDED',
    MONTH_AGO,
    {
      orderConfirmation: { timestamp: MONTH_AGO },
      refund: { timestamp: TWO_WEEKS_AGO, memo: 'Wrong file delivered, full refund issued.' },
    }
  ),

  CANCELLED: makeBaseOrder(
    'QmCancel001',
    'contract-audit',
    'Smart Contract Audit — Basic Package',
    29900,
    84,
    'CANCELLED',
    WEEK_AGO,
    {
      orderCancel: {
        timestamp: THREE_DAYS_AGO,
        reason: 'Seller requested cancellation — schedule conflict.',
      },
    }
  ),
};

export function getOrderByState(state: keyof typeof LIFECYCLE_ORDERS) {
  return LIFECYCLE_ORDERS[state];
}

// ─── Product Reviews ────────────────────────────────────────────────

export const MOCK_REVIEWS = [
  {
    slug: 'wireless-headphones',
    buyerName: 'Alex Chen',
    buyerAvatar: mockThumbnail(177),
    overall: 5,
    review:
      "Best headphones I've ever owned. The noise cancellation is incredible, and the battery lasts forever.",
    timestamp: WEEK_AGO,
  },
  {
    slug: 'wireless-headphones',
    buyerName: 'Sarah Johnson',
    buyerAvatar: mockThumbnail(64),
    overall: 4,
    review:
      'Great sound quality. Shipping took a bit longer than expected but the seller was very communicative.',
    timestamp: TWO_WEEKS_AGO,
  },
  {
    slug: 'wireless-headphones',
    buyerName: 'Mike Rodriguez',
    buyerAvatar: mockThumbnail(91),
    overall: 5,
    review:
      'Crystal clear audio and super comfortable. Using them daily for 8+ hours without any issues.',
    timestamp: MONTH_AGO,
  },
  {
    slug: 'wireless-headphones',
    buyerName: 'Emma Wilson',
    buyerAvatar: mockThumbnail(25),
    overall: 4,
    quality: 4,
    description: 4,
    deliverySpeed: 5,
    customerService: 5,
    review: 'Solid headphones for the price. Paid with ETH, transaction was seamless!',
    timestamp: MONTH_AGO,
  },
  {
    slug: 'wireless-headphones',
    buyerName: 'David Park',
    buyerAvatar: mockThumbnail(53),
    overall: 5,
    quality: 5,
    description: 5,
    deliverySpeed: 4,
    customerService: 5,
    review: 'Amazing quality. The buyer protection gave me confidence to purchase. Will buy again!',
    timestamp: MONTH_AGO,
  },
];

// ─── Chat Messages ──────────────────────────────────────────────────

export const MOCK_CHAT_MESSAGES = [
  {
    messageId: 'msg-001',
    peerId: MOCK_BUYER_PEER_ID,
    subject: '',
    message: 'Hi! I just placed an order for the headphones. When do you expect to ship?',
    timestamp: DAY_AGO,
    read: true,
    outgoing: false,
  },
  {
    messageId: 'msg-002',
    peerId: MOCK_BUYER_PEER_ID,
    subject: '',
    message: "Thanks for your order! I'll ship tomorrow morning and send you the tracking number.",
    timestamp: DAY_AGO,
    read: true,
    outgoing: true,
  },
  {
    messageId: 'msg-003',
    peerId: MOCK_BUYER_PEER_ID,
    subject: '',
    message: 'Great, looking forward to it! 🎧',
    timestamp: HOUR_AGO,
    read: true,
    outgoing: false,
  },
  {
    messageId: 'msg-004',
    peerId: MOCK_BUYER_PEER_ID,
    subject: '',
    message: 'Shipped! FedEx tracking: FX9876543210. Should arrive in 3-5 days.',
    timestamp: HOUR_AGO,
    read: true,
    outgoing: true,
  },
  {
    messageId: 'msg-005',
    peerId: MOCK_BUYER_PEER_ID,
    subject: '',
    message: 'Awesome, thank you! Will leave a review once it arrives.',
    timestamp: NOW,
    read: false,
    outgoing: false,
  },
];

// ─── Wallet Transactions ────────────────────────────────────────────

export const MOCK_WALLET_TRANSACTIONS = [
  {
    txid: '0xabc123def456',
    value: 8999,
    address: '0xSellerWallet123',
    status: 'CONFIRMED',
    confirmations: 24,
    timestamp: DAY_AGO,
    memo: 'Payment: Wireless Headphones',
    orderID: 'QmOrder001',
  },
  {
    txid: '0xdef789abc012',
    value: 17500,
    address: '0xSellerWallet123',
    status: 'CONFIRMED',
    confirmations: 18,
    timestamp: THREE_DAYS_AGO,
    memo: 'Payment: Leather Backpack',
    orderID: 'QmAwait001',
  },
  {
    txid: '0x456abc789def',
    value: 4900,
    address: '0xSellerWallet123',
    status: 'CONFIRMED',
    confirmations: 100,
    timestamp: TWO_WEEKS_AGO,
    memo: 'Payment: Design Kit',
    orderID: 'QmComplete001',
  },
  {
    txid: '0x111222333aaa',
    value: -599,
    address: '0xGasFee',
    status: 'CONFIRMED',
    confirmations: 24,
    timestamp: DAY_AGO,
    memo: 'Network fee',
  },
  {
    txid: '0x222333444bbb',
    value: -12500,
    address: '0xWithdrawal123',
    status: 'CONFIRMED',
    confirmations: 12,
    timestamp: WEEK_AGO,
    memo: 'Withdrawal to external wallet',
  },
  {
    txid: '0x333444555ccc',
    value: 2200,
    address: '0xSellerWallet123',
    status: 'PENDING',
    confirmations: 2,
    timestamp: HOUR_AGO,
    memo: 'Payment: Organic Coffee',
    orderID: 'QmFulfill001',
  },
  {
    txid: '0x444555666ddd',
    value: 29999,
    address: '0xEscrowContract',
    status: 'PENDING',
    confirmations: 1,
    timestamp: NOW,
    memo: 'Disputed: Smart Watch',
    orderID: 'QmDispute001',
  },
  {
    txid: '0x555666777eee',
    value: -1499,
    address: '0xBuyerRefund',
    status: 'CONFIRMED',
    confirmations: 50,
    timestamp: TWO_WEEKS_AGO,
    memo: 'Refund: E-Book',
    orderID: 'QmRefund001',
  },
];

// ─── Route Mocking Functions ────────────────────────────────────────

const mockVendorProfile = {
  peerID: MOCK_PEER_ID,
  name: 'TechStore Premium',
  handle: 'techstore',
  location: 'San Francisco, CA',
  avatarHashes: mockThumbnail(64),
  headerHashes: mockThumbnail(110),
  about: 'Premium electronics and handcrafted goods.',
  stats: {
    followerCount: 128,
    followingCount: 24,
    listingCount: 7,
    ratingCount: 89,
    averageRating: 4.8,
  },
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
 * Mock a specific order state for order detail pages.
 */
export async function mockOrderDetailByState(
  page: Page,
  state: keyof typeof LIFECYCLE_ORDERS
): Promise<void> {
  const order = LIFECYCLE_ORDERS[state];

  await page.route('**/v1/orders/**', route => {
    route.fulfill({ status: 200, contentType: 'application/json', body: wrapData(order) });
  });

  await page.route('**/search/v1/profiles/raw/**', route => {
    const url = route.request().url();
    const profile = url.includes(MOCK_PEER_ID) ? mockVendorProfile : mockBuyerProfile;
    route.fulfill({ status: 200, contentType: 'application/json', body: wrapData(profile) });
  });

  await page.route('**/v1/profiles/**', route => {
    const url = route.request().url();
    if (url.includes('/profiles/batch')) return route.fallback();
    const profile = url.includes(MOCK_PEER_ID) ? mockVendorProfile : mockBuyerProfile;
    route.fulfill({ status: 200, contentType: 'application/json', body: wrapData(profile) });
  });
}

/**
 * Mock reviews API for a product.
 */
export async function mockReviewsAPI(page: Page): Promise<void> {
  await page.route('**/v1/ratings/**', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: wrapData({ ratings: MOCK_REVIEWS, count: MOCK_REVIEWS.length, average: 4.6 }),
    });
  });
}

/**
 * Mock chat messages API.
 */
export async function mockChatAPI(page: Page): Promise<void> {
  await page.route('**/v1/chat/rooms', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: wrapData([
        {
          roomId: '!mock-room:matrix.local',
          roomType: 'direct',
          isDirect: true,
          unreadCount: 1,
          members: [{ peerID: MOCK_BUYER_PEER_ID }],
          lastMessage: {
            id: '$mock-last-event',
            content: MOCK_CHAT_MESSAGES[MOCK_CHAT_MESSAGES.length - 1].message,
            sender: '@mock_buyer:matrix.local',
            timestamp: NOW,
          },
        },
      ]),
    });
  });

  await page.route('**/v1/chat/rooms/*/messages*', route => {
    const messages = MOCK_CHAT_MESSAGES.map(msg => ({
      id: msg.messageId,
      sender: msg.outgoing ? '@mock_seller:matrix.local' : '@mock_buyer:matrix.local',
      content: msg.message,
      timestamp: msg.timestamp,
      type: 'message',
    }));
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: wrapData({ messages }),
    });
  });

  await page.route('**/v1/chat/**', route => route.fallback());
}

/**
 * Mock wallet API (balance + transactions).
 */
export async function mockWalletAPI(page: Page): Promise<void> {
  await page.route('**/v1/wallet/balance', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: wrapData({
        confirmed: '124500',
        unconfirmed: '32199',
        coin: 'ETH',
        height: 19850000,
      }),
    });
  });

  await page.route('**/v1/wallet/transactions*', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: wrapData({ transactions: MOCK_WALLET_TRANSACTIONS }),
    });
  });

  await page.route('**/v1/wallet/receiving-accounts*', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: wrapData({
        accounts: [
          { coin: 'ETH', address: '0xSellerWallet123456789abcdef', purpose: 'GENERAL' },
          { coin: 'BTC', address: 'bc1qSellerBTC123456789', purpose: 'GENERAL' },
        ],
      }),
    });
  });
}

/**
 * Mock multi-variant product detail.
 */
export async function mockVariantProductAPI(page: Page): Promise<void> {
  await page.route('**/v1/listings/**/leather-backpack*', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: wrapData({
        slug: 'leather-backpack',
        metadata: {
          version: 1,
          contractType: 'PHYSICAL_GOOD',
          format: 'FIXED_PRICE',
          pricingCurrency: { code: 'USD', divisibility: 2 },
          acceptedCurrencies: ['ETH', 'BTC'],
        },
        item: {
          title: 'Handcrafted Leather Backpack',
          description: 'Full-grain Italian leather backpack with padded 15" laptop compartment.',
          processingTime: '3-5 business days',
          price: '17500',
          nsfw: false,
          tags: ['fashion', 'leather', 'backpack'],
          categories: ['Fashion'],
          grams: 1200,
          condition: 'New',
          images: [
            { ...mockThumbnail(119), filename: 'backpack-1.png' },
            { ...mockThumbnail(120), filename: 'backpack-2.png' },
            { ...mockThumbnail(121), filename: 'backpack-3.png' },
          ],
          skus: [
            {
              productID: 'bp-cognac',
              quantity: '25',
              price: '17500',
              variantCombo: [{ name: 'Color', value: 'Cognac' }],
            },
            {
              productID: 'bp-black',
              quantity: '30',
              price: '17500',
              variantCombo: [{ name: 'Color', value: 'Black' }],
            },
          ],
          options: [
            {
              name: 'Color',
              description: 'Leather color',
              variants: [{ name: 'Cognac' }, { name: 'Black' }],
            },
          ],
        },
        shippingProfile: {
          profileId: 'sp-physical',
          name: 'Physical Goods Shipping',
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
                {
                  id: 'zone-express',
                  name: 'Express',
                  regions: ['US', 'CA', 'GB'],
                  rates: [
                    {
                      id: 'rate-express',
                      name: 'Express',
                      price: '1299',
                      currency: 'USD',
                      estimatedDelivery: '2-3 days',
                    },
                  ],
                },
              ],
            },
          ],
        },
        averageRating: 4.7,
        ratingCount: 31,
        vendorID: { peerID: MOCK_PEER_ID },
      }),
    });
  });
}

/**
 * Set up all lifecycle mocks at once.
 */
export async function mockFullLifecycleAPIs(page: Page): Promise<void> {
  // Orders list with all states
  const allPurchases = Object.values(LIFECYCLE_ORDERS).map(o => ({
    orderID: o.contract.OrderID,
    slug: o.contract.vendorListings[0].slug,
    title: o.contract.vendorListings[0].item.title,
    thumbnail: o.contract.vendorListings[0].item.images[0],
    total: { amount: o.contract.orderOpen.amount, currency: { code: 'USD', divisibility: 2 } },
    quantity: 1,
    timestamp: o.contract.orderOpen.timestamp,
    state: o.state,
    vendorID: MOCK_PEER_ID,
    buyerID: MOCK_BUYER_PEER_ID,
    paymentCoin: 'ETH',
    read: o.read,
    moderated: false,
    unreadChatMessages: 0,
  }));

  await page.route('**/v1/purchases*', (route, request) => {
    if (request.method() !== 'GET') return route.fallback();
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: wrapData({ purchases: allPurchases }),
    });
  });

  await page.route('**/v1/sales*', (route, request) => {
    if (request.method() !== 'GET') return route.fallback();
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: wrapData({ sales: allPurchases.slice(0, 4) }),
    });
  });

  await page.route('**/v1/profiles/batch*', (route, request) => {
    if (request.method() !== 'GET') return route.fallback();
    route.fulfill({ status: 200, contentType: 'application/json', body: wrapData({}) });
  });

  await mockReviewsAPI(page);
  await mockChatAPI(page);
  await mockWalletAPI(page);
}
