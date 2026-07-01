/**
 * Outpost Auth Fixtures
 *
 * Outpost uses password-based Basic Auth (no Casdoor OAuth).
 * Provides mock auth injection for Layer A (mock-first) tests and
 * real login helpers for Layer B/C (real backend) tests.
 */

import type { Page } from '@playwright/test';

const OUTPOST_PASSWORD = 'test123';
const FAKE_TOKEN = `basic:${Buffer.from(`admin:${OUTPOST_PASSWORD}`).toString('base64')}`;
const FAKE_PEER_ID = 'QmOutpostPeer1234567890abcdefghijklmnop';

const OUTPOST_PROFILE = {
  peerID: FAKE_PEER_ID,
  handle: '',
  name: 'Privacy Store',
  location: '',
  about: 'Anonymous marketplace powered by Mobazha Outpost.',
  shortDescription: 'Privacy-first store',
  avatarHashes: { medium: '', small: '', tiny: '', large: '', original: '' },
  headerHashes: { medium: '', small: '', tiny: '', large: '', original: '' },
  stats: {
    followerCount: 0,
    followingCount: 0,
    listingCount: 3,
    ratingCount: 5,
    postCount: 0,
    averageRating: 4.8,
  },
  moderator: false,
  vendor: true,
  nsfw: false,
  contactInfo: {},
  colors: {
    primary: '#10b981',
    secondary: '#059669',
    text: '#1f2937',
    highlight: '#34d399',
    highlightText: '#ffffff',
  },
};

const OUTPOST_SETTINGS = {
  paymentDataInQR: true,
  showNotifications: true,
  showNsfw: false,
  shippingAddresses: [],
  localCurrency: 'USD',
  country: '',
  termsAndConditions: '',
  refundPolicy: '',
  blockedNodes: [],
  storeModerators: [],
  mispaymentBuffer: 1,
  version: '',
  preferredCurrencies: ['LTC', 'XMR'],
};

const OUTPOST_EXCHANGE_RATES = {
  LTC: { last: 80 },
  XMR: { last: 170 },
  BTC: { last: 65000 },
};

/**
 * Inject mock Outpost auth state into localStorage.
 * Must be called BEFORE page.goto().
 */
export async function injectOutpostAuth(page: Page): Promise<void> {
  const zustandUserState = JSON.stringify({
    state: {
      profile: OUTPOST_PROFILE,
      isAuthenticated: true,
      authMode: 'basic',
      token: FAKE_TOKEN,
      authSource: 'basic',
    },
    version: 0,
  });

  const authItems = {
    mobazha_auth_token: FAKE_TOKEN,
    mobazha_auth_user: JSON.stringify({
      id: 'admin',
      name: 'Privacy Store',
      displayName: 'Privacy Store',
      avatar: '',
      role: 'seller',
    }),
    'mobazha-user-storage': zustandUserState,
  };

  const escaped = JSON.stringify(authItems);
  await page.addInitScript(`
    const items = ${escaped};
    for (const [key, value] of Object.entries(items)) {
      localStorage.setItem(key, value);
    }
  `);
}

/**
 * Mock the APIs that Outpost authenticated pages call.
 * Must be called BEFORE page.goto().
 */
export async function mockOutpostSessionAPIs(page: Page): Promise<void> {
  await page.route('**/v1/profiles/me', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: OUTPOST_PROFILE }),
    })
  );

  await page.route('**/v1/profiles', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: OUTPOST_PROFILE }),
    })
  );

  await page.route('**/v1/settings', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: OUTPOST_SETTINGS }),
    })
  );

  await page.route('**/v1/exchange-rates', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: OUTPOST_EXCHANGE_RATES }),
    })
  );

  await page.route('**/v1/exchange-rates/*', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: { last: 80 } }),
    })
  );

  await page.route('**/v1/wallet/balance', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: { confirmed: '0', unconfirmed: '0', currency: { code: 'LTC', divisibility: 8 } },
      }),
    })
  );

  await page.route('**/v1/wallet/currencies', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [
          { code: 'LTC', name: 'Litecoin', divisibility: 8, currencyType: 'crypto' },
          { code: 'XMR', name: 'Monero', divisibility: 12, currencyType: 'crypto' },
        ],
      }),
    })
  );

  await page.route('**/v1/listings/index', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [] }),
    })
  );

  await page.route('**/v1/collections', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [] }),
    })
  );

  await page.route('**/v1/notifications', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: { notifications: [], total: 0, unread: 0 } }),
    })
  );

  await page.route('**/v1/preferences*', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: {} }),
    })
  );

  await page.route('**/ws', route => route.abort());
  await page.route('**/ws/', route => route.abort());
}

/**
 * Combined: inject auth + mock session APIs for Outpost admin pages.
 */
export async function setupOutpostMockAuth(page: Page): Promise<void> {
  await injectOutpostAuth(page);
  await mockOutpostSessionAPIs(page);
}

export { OUTPOST_PROFILE, OUTPOST_SETTINGS, OUTPOST_EXCHANGE_RATES, FAKE_PEER_ID };
