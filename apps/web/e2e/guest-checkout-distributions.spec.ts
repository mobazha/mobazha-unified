import { expect, test, type Page, type Request, type Route } from '@playwright/test';
import { runtimeConfigScript, type RuntimeConfigFixtureOptions } from './fixtures/runtime-config';

const STORE_PEER_ID = '12D3KooWDistributionStore';
const ORDER_TOKEN = 'guest-distribution-order';
const PAYMENT_ADDRESS = 'bc1qdistributiontestaddress';

const DIGITAL_ITEM = {
  slug: 'distribution-download',
  title: 'Distribution Download',
  listingHash: 'QmDistributionDownload',
  price: { amount: 2500, currency: 'USD', divisibility: 2 },
  thumbnail: '',
  quantity: 1,
  vendorPeerID: STORE_PEER_ID,
  contractType: 'DIGITAL_GOOD',
};

interface DistributionCase {
  name: string;
  deployment: RuntimeConfigFixtureOptions['deployment'];
  experience: RuntimeConfigFixtureOptions['experience'];
  storeContext?: string;
}

const DISTRIBUTIONS: DistributionCase[] = [
  {
    name: 'hosted SaaS store',
    deployment: 'hosted',
    experience: { kind: 'store' },
    storeContext: STORE_PEER_ID,
  },
  {
    name: 'standalone store',
    deployment: 'standalone',
    experience: { kind: 'store' },
  },
];

function json(route: Route, data: unknown, status = 200): Promise<void> {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify({ data }),
  });
}

function expectAnonymousStoreRequest(request: Request, storeContext?: string): void {
  const headers = request.headers();
  expect(headers.authorization).toBeUndefined();
  if (storeContext) {
    expect(headers['x-store-peerid']).toBe(storeContext);
  } else {
    expect(headers['x-store-peerid']).toBeUndefined();
  }
  expect(new URL(request.url()).pathname).not.toContain('/buyer-api/');
}

async function seedBrowserContext(page: Page, storeContext?: string): Promise<void> {
  await page.addInitScript(
    ({ item, peerID }) => {
      localStorage.setItem(
        'guest-cart-storage',
        JSON.stringify({ state: { items: [item] }, version: 0 })
      );
      // Simulate an existing seller/buyer session. Guest endpoints must remain anonymous.
      localStorage.setItem('mobazha_auth_token', 'basic:c2VsbGVyOnNlY3JldA==');
      if (peerID) localStorage.setItem('standalone_store_peer_id', peerID);
    },
    { item: DIGITAL_ITEM, peerID: storeContext }
  );
}

async function mockDistributionAPIs(
  page: Page,
  distribution: DistributionCase
): Promise<{ createdOrders: () => number }> {
  let createdOrders = 0;

  // Register the catch-all first because Playwright evaluates routes in reverse order.
  await page.route(
    url => url.pathname.startsWith('/v1/'),
    route => json(route, {})
  );
  await page.route(
    url => url.pathname === '/v1/guest/orders/quote',
    (route, request) => {
      expectAnonymousStoreRequest(request, distribution.storeContext);
      return json(route, {
        canSell: true,
        items: [
          {
            listingSlug: DIGITAL_ITEM.slug,
            quantity: 1,
            status: 'unlimited',
            available: true,
            unlimited: true,
          },
        ],
      });
    }
  );
  await page.route(
    url => url.pathname === '/v1/settings/guest-checkout',
    (route, request) => {
      expectAnonymousStoreRequest(request, distribution.storeContext);
      return json(route, {
        enabled: true,
        acceptedCoins: 'BTC',
        availableCoins: 'BTC',
        paymentTimeout: 30,
      });
    }
  );
  await page.route(
    url => url.pathname === '/v1/guest/orders',
    (route, request) => {
      expectAnonymousStoreRequest(request, distribution.storeContext);
      expect(request.method()).toBe('POST');
      expect(request.postDataJSON()).toMatchObject({
        items: [
          {
            listingSlug: DIGITAL_ITEM.slug,
            listingHash: DIGITAL_ITEM.listingHash,
            quantity: 1,
          },
        ],
        paymentCoin: expect.any(String),
      });
      createdOrders += 1;
      return json(route, {
        orderToken: ORDER_TOKEN,
        buyerPortalToken: 'buyer-portal-token',
        paymentAddress: PAYMENT_ADDRESS,
        paymentAmount: '1000',
        paymentCoin: 'BTC',
        priceCurrency: 'USD',
        priceDivisibility: 2,
        expiresAt: '2030-01-01T00:00:00Z',
        items: [],
      });
    }
  );
  await page.route(
    url => url.pathname === `/v1/guest/orders/${ORDER_TOKEN}`,
    (route, request) => {
      expectAnonymousStoreRequest(request, distribution.storeContext);
      return json(route, {
        orderToken: ORDER_TOKEN,
        state: 'AWAITING_PAYMENT',
        paymentAddress: PAYMENT_ADDRESS,
        paymentAmount: '1000',
        paymentCoin: 'BTC',
        priceCurrency: 'USD',
        priceDivisibility: 2,
        confirmations: 0,
        requiredConfs: 1,
        expiresAt: '2030-01-01T00:00:00Z',
        items: [],
        createdAt: '2026-07-04T00:00:00Z',
        updatedAt: '2026-07-04T00:00:00Z',
      });
    }
  );
  await page.route('**/runtime-config.js', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: runtimeConfigScript({
        deployment: distribution.deployment,
        experience: distribution.experience,
        guestCheckout: true,
        paymentMethods: [{ id: 'BTC', kind: 'crypto', flow: 'address-transfer' }],
      }),
    })
  );

  return { createdOrders: () => createdOrders };
}

test.describe('Guest Checkout distribution matrix', () => {
  for (const distribution of DISTRIBUTIONS) {
    test(`${distribution.name} creates an anonymous order against its store context`, async ({
      page,
    }) => {
      await seedBrowserContext(page, distribution.storeContext);
      const requests = await mockDistributionAPIs(page, distribution);

      await page.goto('/guest-checkout');
      await expect(page.getByText(DIGITAL_ITEM.title).first()).toBeVisible();
      await page.getByRole('button', { name: /continue to payment/i }).click();
      await expect(page.getByRole('heading', { name: /choose.*payment/i })).toBeVisible();
      await page.getByRole('button', { name: /BTC/i }).first().click();

      await expect(page.getByText(PAYMENT_ADDRESS)).toBeVisible();
      await expect(page.getByTestId('guest-checkout-save-link')).toBeVisible();
      expect(requests.createdOrders()).toBe(1);
    });
  }
});
