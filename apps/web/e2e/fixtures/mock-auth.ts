/**
 * Mock Authentication for Demo Journey Specs
 *
 * Bypasses Casdoor OAuth by injecting a fake `basic:` token into localStorage
 * and mocking the profile/settings APIs that restoreSession calls.
 * This allows demo screenshot capture without a running Casdoor or backend.
 */

import type { Page } from '@playwright/test';
import { runtimeConfigFixture, runtimeConfigScript } from './runtime-config';

const FAKE_TOKEN = 'basic:dGVzdHVzZXIxOjEyMw=='; // base64("testuser1:123")
const FAKE_PEER_ID = 'QmY8Mzg1LzU2NzgvOTAxMjM0NTY3ODkwMTIzNDU2Nzg5MA';

const FAKE_USER = {
  id: 'testuser1',
  name: 'TechStore Premium',
  displayName: 'TechStore Premium',
  avatar: '',
  role: 'seller',
  casdoorId: 'testuser1',
};

const FAKE_PROFILE = {
  peerID: FAKE_PEER_ID,
  handle: '',
  name: 'TechStore Premium',
  location: 'San Francisco, CA',
  about: 'Premium tech gadgets and accessories for the modern lifestyle.',
  shortDescription: 'Your one-stop shop for premium tech',
  avatarHashes: { medium: '', small: '', tiny: '', large: '', original: '' },
  headerHashes: { medium: '', small: '', tiny: '', large: '', original: '' },
  stats: {
    followerCount: 128,
    followingCount: 42,
    listingCount: 8,
    ratingCount: 47,
    postCount: 3,
    averageRating: 4.7,
  },
  moderator: false,
  vendor: true,
  nsfw: false,
  contactInfo: {},
  colors: {
    primary: '#2563eb',
    secondary: '#1e40af',
    text: '#1f2937',
    highlight: '#3b82f6',
    highlightText: '#ffffff',
  },
};

const FAKE_SETTINGS = {
  paymentDataInQR: true,
  showNotifications: true,
  showNsfw: false,
  shippingAddresses: [],
  localCurrency: 'USD',
  country: 'US',
  termsAndConditions: '',
  refundPolicy: '30-day return policy for all items.',
  blockedNodes: [],
  storeModerators: [],
  mispaymentBuffer: 1,
  version: '',
  preferredCurrencies: ['BTC', 'ETH', 'BNB'],
};

const FAKE_EXCHANGE_RATES = {
  BTC: { last: 65000 },
  ETH: { last: 3500 },
  BNB: { last: 600 },
  SOL: { last: 150 },
  BCH: { last: 450 },
  LTC: { last: 80 },
  ZEC: { last: 30 },
};

/**
 * Inject fake auth state into localStorage via addInitScript.
 * Sets both legacy keys and Zustand persist store to ensure the app
 * recognizes the user as authenticated and skips onboarding.
 * Must be called BEFORE page.goto().
 */
export async function injectMockAuth(page: Page): Promise<void> {
  const zustandUserState = JSON.stringify({
    state: {
      profile: FAKE_PROFILE,
      isAuthenticated: true,
      authMode: 'basic',
      token: FAKE_TOKEN,
      authSource: 'basic',
    },
    version: 0,
  });

  const authItems = {
    mobazha_auth_token: FAKE_TOKEN,
    mobazha_auth_user: JSON.stringify(FAKE_USER),
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
 * Mock the APIs that restoreSession and authenticated pages call.
 * Must be called BEFORE page.goto().
 */
export async function mockSessionAPIs(page: Page): Promise<void> {
  await page.route('**/v1/profiles/me', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: FAKE_PROFILE }),
    })
  );

  await page.route('**/v1/profiles', route => {
    if (route.request().method() === 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: FAKE_PROFILE }),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: FAKE_PROFILE }),
    });
  });

  await page.route('**/v1/settings', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: FAKE_SETTINGS }),
    })
  );

  await page.route('**/v1/exchange-rates', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: FAKE_EXCHANGE_RATES }),
    })
  );

  await page.route('**/v1/exchange-rates/*', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: { last: 65000 } }),
    })
  );

  await page.route('**/v1/wallet/balance', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          confirmed: '1250000',
          unconfirmed: '50000',
          currency: { code: 'BTC', divisibility: 8 },
        },
      }),
    })
  );

  await page.route('**/v1/wallet/currencies', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [
          { code: 'BTC', name: 'Bitcoin', divisibility: 8, currencyType: 'crypto' },
          { code: 'ETH', name: 'Ethereum', divisibility: 18, currencyType: 'crypto' },
          { code: 'BNB', name: 'BNB', divisibility: 18, currencyType: 'crypto' },
        ],
      }),
    })
  );

  await page.route('**/platform/v1/accounts/me', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: { id: 'testuser1', name: 'TechStore Premium', properties: { peerID: FAKE_PEER_ID } },
      }),
    })
  );

  await page.route('**/platform/v1/auth/signin', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: { token: FAKE_TOKEN } }),
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

  await page.route('**/v1/webhooks', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [] }),
    })
  );

  await page.route('**/v1/webhooks/**', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [] }),
    })
  );

  await page.route('**/v1/fiat/**', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: {} }),
    })
  );

  // Background polling endpoints frequently requested by app shell.
  await page.route('**/v1/preferences*', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: {} }),
    })
  );

  await page.route('**/v1/chat/status*', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: { connected: false } }),
    })
  );

  await page.route('**/ws', route => route.abort());
  await page.route('**/ws/', route => route.abort());
}

/**
 * Mock runtime config bootstrap + refresh so admin shells do not fail when no
 * backend is running on the Vite dev proxy.
 */
export async function mockRuntimeConfig(page: Page): Promise<void> {
  const config = runtimeConfigFixture({ deployment: 'hosted' });

  await page.route('**/runtime-config.js', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: runtimeConfigScript({ deployment: 'hosted' }),
    })
  );

  await page.route('**/v1/runtime-config**', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: config }),
    })
  );
}

/**
 * Combined: inject auth + mock session APIs.
 * Call once before the first page.goto() in the test.
 */
export async function setupMockAuth(page: Page): Promise<void> {
  await injectMockAuth(page);
  await mockRuntimeConfig(page);
  await mockSessionAPIs(page);
}
