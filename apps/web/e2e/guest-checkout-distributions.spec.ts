// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

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

async function installPendingGuestRequestFetch(
  page: Page,
  target: 'settings' | 'order'
): Promise<void> {
  await page.addInitScript(({ target }) => {
    const originalFetch = window.fetch.bind(window);
    window.fetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const request = input instanceof Request ? input : undefined;
      const rawURL = request?.url ?? (input instanceof URL ? input.href : String(input));
      const url = new URL(rawURL, window.location.origin);
      const method = init?.method ?? request?.method ?? 'GET';
      const isTarget =
        (target === 'settings' &&
          url.pathname === '/v1/settings/guest-checkout' &&
          method.toUpperCase() === 'GET') ||
        (target === 'order' &&
          url.pathname === '/v1/guest/orders' &&
          method.toUpperCase() === 'POST');
      if (isTarget) {
        const startedKey = `guest-${target}-request-started-count`;
        const abortedKey = `guest-${target}-request-aborted-count`;
        const started = Number(window.sessionStorage.getItem(startedKey) ?? '0');
        window.sessionStorage.setItem(startedKey, String(started + 1));
        return new Promise((_resolve, reject) => {
          const signal = init?.signal ?? request?.signal;
          const rejectAborted = () => {
            const aborted = Number(window.sessionStorage.getItem(abortedKey) ?? '0');
            window.sessionStorage.setItem(abortedKey, String(aborted + 1));
            reject(new DOMException('Aborted', 'AbortError'));
          };
          if (signal?.aborted) rejectAborted();
          else signal?.addEventListener('abort', rejectAborted, { once: true });
        });
      }
      return originalFetch(input, init);
    };
  }, { target });
}

async function pendingRequestCount(
  page: Page,
  target: 'settings' | 'order',
  state: 'started' | 'aborted'
): Promise<number> {
  return page.evaluate(
    ({ target, state }) =>
      Number(sessionStorage.getItem(`guest-${target}-request-${state}-count`) ?? '0'),
    { target, state }
  );
}

async function navigateHomeWithinApp(page: Page): Promise<void> {
  await page.evaluate(() => {
    window.history.pushState({}, '', '/');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  await expect(page).toHaveURL('/');
}

async function beginGuestOrder(page: Page): Promise<void> {
  await page.goto('/guest-checkout');
  await expect(page.getByText(DIGITAL_ITEM.title).first()).toBeVisible();
  await page.getByRole('button', { name: /continue to payment/i }).click();
  await expect(page.getByRole('heading', { name: /choose.*payment/i })).toBeVisible();
  await page.getByRole('button', { name: /BTC/i }).first().click();
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

      await beginGuestOrder(page);

      await expect(page.getByText(PAYMENT_ADDRESS)).toBeVisible();
      await expect(page.getByTestId('guest-checkout-save-link')).toBeVisible();
      expect(requests.createdOrders()).toBe(1);
    });

    test(`${distribution.name} aborts an in-flight order when checkout unmounts`, async ({
      page,
    }) => {
      await installPendingGuestRequestFetch(page, 'order');
      await seedBrowserContext(page, distribution.storeContext);
      const requests = await mockDistributionAPIs(page, distribution);

      await beginGuestOrder(page);
      await expect.poll(() => pendingRequestCount(page, 'order', 'started')).toBeGreaterThan(0);
      const abortedBeforeNavigation = await pendingRequestCount(page, 'order', 'aborted');

      await navigateHomeWithinApp(page);

      await expect
        .poll(() => pendingRequestCount(page, 'order', 'aborted'))
        .toBeGreaterThan(abortedBeforeNavigation);
      expect(requests.createdOrders()).toBe(0);
    });

    test(`${distribution.name} aborts settings loading when checkout unmounts`, async ({ page }) => {
      await installPendingGuestRequestFetch(page, 'settings');
      await seedBrowserContext(page, distribution.storeContext);
      await mockDistributionAPIs(page, distribution);

      await page.goto('/guest-checkout');
      await expect.poll(() => pendingRequestCount(page, 'settings', 'started')).toBeGreaterThan(0);
      const abortedBeforeNavigation = await pendingRequestCount(page, 'settings', 'aborted');

      await navigateHomeWithinApp(page);

      await expect
        .poll(() => pendingRequestCount(page, 'settings', 'aborted'))
        .toBeGreaterThan(abortedBeforeNavigation);
    });

    test(`${distribution.name} surfaces an in-flight order timeout`, async ({ page }) => {
      test.setTimeout(50_000);
      await installPendingGuestRequestFetch(page, 'order');
      await seedBrowserContext(page, distribution.storeContext);
      const requests = await mockDistributionAPIs(page, distribution);

      await beginGuestOrder(page);
      await expect.poll(() => pendingRequestCount(page, 'order', 'started')).toBeGreaterThan(0);

      await expect(page.getByRole('heading', { name: /order.*failed/i })).toBeVisible({
        timeout: 35_000,
      });
      await expect(page.getByText('Request timeout')).toBeVisible();
      expect(requests.createdOrders()).toBe(0);
    });
  }
});
