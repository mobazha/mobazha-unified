import { expect, test, type Page, type Route } from '@playwright/test';
import { setupMockAuth } from './fixtures/mock-auth';
import { runtimeConfigScript } from './fixtures/runtime-config';

const MARKETPLACE_ID = 'curated-market';
const APPROVED_PEER_ID = 'QmApprovedSeller';
const BLOCKED_PEER_ID = 'QmBlockedSeller';
const APPROVED_SLUG = 'approved-download';
const APPROVED_TITLE = 'Approved Download';
const BLOCKED_TITLE = 'Blocked Listing';

function json(route: Route, data: unknown, status = 200): Promise<void> {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify({ data }),
  });
}

function listing(peerID: string, slug: string, title: string) {
  return {
    listing: {
      slug,
      hash: `Qm${slug}`,
      vendorID: {
        peerID,
        name: peerID === APPROVED_PEER_ID ? 'Approved Seller' : 'Blocked Seller',
      },
      metadata: {
        version: 1,
        contractType: 'DIGITAL_GOOD',
        format: 'FIXED_PRICE',
        expiry: '',
        acceptedCurrencies: ['BTC'],
        pricingCurrency: { code: 'USD', divisibility: 2 },
        escrowTimeoutHours: 24,
      },
      item: {
        title,
        description: 'Marketplace handoff regression fixture',
        processingTime: 'instant',
        price: 2500,
        nsfw: false,
        tags: ['digital'],
        productType: 'digital',
        images: [],
        skus: [{ quantity: '-1' }],
      },
    },
  };
}

async function mockMarketplaceHandoff(page: Page) {
  const attributionEvents: Array<Record<string, unknown>> = [];
  const blockedListingRequests: string[] = [];
  const orderCreationRequests: string[] = [];

  page.on('request', request => {
    const url = new URL(request.url());
    if (request.method() === 'POST' && /\/v1\/(guest\/)?orders$/.test(url.pathname)) {
      orderCreationRequests.push(request.url());
    }
  });

  // Catch-alls are registered first because Playwright evaluates routes in reverse order.
  await page.route('**/platform/v1/**', route => json(route, {}));
  await page.route('**/v1/**', route => json(route, {}));
  await page.route('**/info/**', route => json(route, { results: [] }));

  await page.route('**/runtime-config.js', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: runtimeConfigScript({
        deployment: 'hosted',
        experience: { kind: 'marketplace', marketplaceIdentifier: MARKETPLACE_ID },
        paymentMethods: [{ id: 'BTC', kind: 'crypto', flow: 'address-transfer' }],
      }),
    })
  );

  await page.route('**/platform/v1/marketplaces/current/config**', route =>
    json(route, {
      id: MARKETPLACE_ID,
      vertical: 'general',
      buyerAccessMode: 'open',
      sellerReviewMode: 'manual',
      catalogMode: 'curated',
      discoverability: 'public',
      sellerEntryMode: 'operator_invited',
      allowedPeers: [APPROVED_PEER_ID],
      sellers: [APPROVED_PEER_ID],
      featured: [
        { type: 'listing', peerID: APPROVED_PEER_ID, slug: APPROVED_SLUG, sortOrder: 1 },
        { type: 'listing', peerID: BLOCKED_PEER_ID, slug: 'blocked-listing', sortOrder: 2 },
      ],
      brand: { name: 'Curated Market', tagline: 'Approved sellers only' },
      taxonomy: [],
      policy: {},
      attribution: { utmSource: 'curated-market', marketplaceId: MARKETPLACE_ID },
      domain: '127.0.0.1',
    })
  );

  await page.route(`**/platform/v1/public-marketplaces/${MARKETPLACE_ID}**`, (route, request) => {
    if (request.method() !== 'GET') return route.fallback();
    return json(route, {
      marketplace: {
        id: MARKETPLACE_ID,
        name: 'Curated Market',
        slug: MARKETPLACE_ID,
        description: 'Approved sellers only',
        publicURL: '',
        buyerAccessMode: 'open',
        sellerReviewMode: 'manual',
        catalogMode: 'curated',
        discoverability: 'public',
        sellerEntryMode: 'operator_invited',
        vertical: 'general',
        sellerCount: 2,
        productCount: 2,
      },
      sellers: [
        { peerID: APPROVED_PEER_ID, productGroups: [] },
        { peerID: BLOCKED_PEER_ID, productGroups: [] },
      ],
      featured: [
        { type: 'listing', peerID: APPROVED_PEER_ID, slug: APPROVED_SLUG, sortOrder: 1 },
        { type: 'listing', peerID: BLOCKED_PEER_ID, slug: 'blocked-listing', sortOrder: 2 },
      ],
      banners: [],
      listings: {
        listings: [
          { peerID: APPROVED_PEER_ID, slug: APPROVED_SLUG },
          { peerID: BLOCKED_PEER_ID, slug: 'blocked-listing' },
        ],
        total: 2,
        page: 1,
        pageSize: 24,
        totalPage: 1,
      },
    });
  });

  await page.route(
    `**/platform/v1/public-marketplaces/${MARKETPLACE_ID}/attribution-events`,
    (route, request) => {
      attributionEvents.push(request.postDataJSON() as Record<string, unknown>);
      return json(route, { accepted: true }, 201);
    }
  );

  await page.route(`**/listings/${APPROVED_PEER_ID}/${APPROVED_SLUG}**`, route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(listing(APPROVED_PEER_ID, APPROVED_SLUG, APPROVED_TITLE)),
    })
  );
  await page.route(`**/listings/${BLOCKED_PEER_ID}/**`, route => {
    blockedListingRequests.push(route.request().url());
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(listing(BLOCKED_PEER_ID, 'blocked-listing', BLOCKED_TITLE)),
    });
  });
  await page.route(`**/v1/payment-methods/${APPROVED_PEER_ID}`, route =>
    json(route, { crypto: ['BTC'], fiat: [] })
  );
  await page.route('**/v1/profiles/batch', route =>
    json(route, [
      {
        peerID: APPROVED_PEER_ID,
        name: 'Approved Seller',
        shortDescription: 'Approved seller profile',
      },
    ])
  );

  return { attributionEvents, blockedListingRequests, orderCreationRequests };
}

test('curated marketplace hands checkout to the approved seller with attribution', async ({
  page,
}) => {
  const observed = await mockMarketplaceHandoff(page);
  await setupMockAuth(page);

  await page.goto('/');
  const approvedCard = page.getByTestId('product-card').filter({ hasText: APPROVED_TITLE });
  await expect(approvedCard).toBeVisible();
  await expect(page.getByText(BLOCKED_TITLE)).toHaveCount(0);
  expect(observed.blockedListingRequests).toHaveLength(0);

  await approvedCard.click();
  await expect(page.getByRole('button', { name: /buy now/i })).toBeVisible();
  await page.getByRole('button', { name: /buy now/i }).click();

  await expect(page).toHaveURL(url => {
    return (
      url.pathname === '/checkout' &&
      url.searchParams.get('slug') === APPROVED_SLUG &&
      url.searchParams.get('peerID') === APPROVED_PEER_ID
    );
  });
  await expect
    .poll(() => observed.attributionEvents.some(event => event.eventType === 'checkout_handoff'))
    .toBe(true);

  expect(observed.attributionEvents).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        eventType: 'listing_click',
        listingSlug: APPROVED_SLUG,
        peerID: APPROVED_PEER_ID,
      }),
      expect.objectContaining({
        eventType: 'checkout_handoff',
        listingSlug: APPROVED_SLUG,
        peerID: APPROVED_PEER_ID,
      }),
    ])
  );
  expect(observed.orderCreationRequests).toHaveLength(0);
});
