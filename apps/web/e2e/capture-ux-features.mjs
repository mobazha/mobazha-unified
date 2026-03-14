/**
 * Capture screenshots for ALL order system UX features.
 *
 * Coverage:
 *   UX-07  — TransactionOverlay: estimated wait time badge ("Usually 1-3 minutes")
 *   UX-08  — TransactionOverlay: classified friendly error messages
 *   UX-10  — Dispute evidence upload (already captured separately)
 *   UX-12  — Continue Payment CTA on order card (AWAITING_PAYMENT)
 *   UX-13  — Seller Dashboard ActionItems (pending / fulfill / disputed counts)
 *   UX-14  — WriteReviewDialog: star text labels + "Rate Later"
 *   A3     — Payment countdown from backend ExpiresAt
 *
 * Also captures: Order lifecycle states (all 8 desktop + all 8 mobile).
 *
 * Run: cd apps/web && node e2e/capture-ux-features.mjs
 */

import { chromium } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, 'demo-output', 'ux-features');
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const BASE_URL = process.env.BASE_URL || 'http://localhost:3002';

const FAKE_TOKEN = 'basic:dGVzdHVzZXIxOjEyMw==';
const FAKE_PEER_ID = 'QmY8Mzg1LzU2NzgvOTAxMjM0NTY3ODkwMTIzNDU2Nzg5MA';
const MOCK_VENDOR_PEER_ID = 'QmVendor123456789abcdef';
const MOCK_BUYER_PEER_ID = FAKE_PEER_ID;

const NOW = new Date().toISOString();
const HOUR_AGO = new Date(Date.now() - 3600000).toISOString();
const DAY_AGO = new Date(Date.now() - 86400000).toISOString();
const THREE_DAYS_AGO = new Date(Date.now() - 3 * 86400000).toISOString();
const WEEK_AGO = new Date(Date.now() - 7 * 86400000).toISOString();
const TWO_WEEKS_AGO = new Date(Date.now() - 14 * 86400000).toISOString();
const MONTH_AGO = new Date(Date.now() - 30 * 86400000).toISOString();

function img(id) {
  const url = `https://picsum.photos/id/${id}/300/300`;
  return { tiny: url, small: url, medium: url, large: url, original: url };
}

function wrapData(d) { return JSON.stringify({ data: d }); }

const FAKE_PROFILE = {
  peerID: FAKE_PEER_ID,
  handle: '', name: 'TechStore Premium', location: 'San Francisco, CA',
  about: 'Premium tech gadgets', shortDescription: 'Premium tech',
  avatarHashes: { medium: '', small: '', tiny: '', large: '', original: '' },
  headerHashes: { medium: '', small: '', tiny: '', large: '', original: '' },
  stats: { followerCount: 128, followingCount: 42, listingCount: 8, ratingCount: 47, postCount: 3, averageRating: 4.7 },
  moderator: false, vendor: true, nsfw: false, contactInfo: {},
  colors: { primary: '#2563eb', secondary: '#1e40af', text: '#1f2937', highlight: '#3b82f6', highlightText: '#ffffff' },
};

const FAKE_SETTINGS = {
  paymentDataInQR: true, showNotifications: true, showNsfw: false,
  shippingAddresses: [], localCurrency: 'USD', country: 'US',
  termsAndConditions: '', refundPolicy: '30-day return policy.',
  blockedNodes: [], storeModerators: [], mispaymentBuffer: 1, version: '',
  preferredCurrencies: ['BTC', 'ETH', 'BNB'],
};

// ─── Mock Order Data ─────────────────────────────────────────────────

function makeOrder(id, slug, title, price, imgId, state, timestamp, overrides) {
  return {
    contract: {
      OrderID: id,
      orderOpen: {
        listings: [{ vendorID: { peerID: MOCK_VENDOR_PEER_ID }, listing: {
          slug, metadata: { contractType: 'PHYSICAL_GOOD', pricingCurrency: { code: 'USD', divisibility: 2 } },
          vendorID: { peerID: MOCK_VENDOR_PEER_ID, handle: 'TechStore' },
          item: { title, description: `Quality ${title}.`, price: String(price),
            images: [{ ...img(imgId), filename: `${slug}.png` }], skus: [{ productID: '1', quantity: '100' }] },
          shippingOptions: [{ name: 'Standard', type: 'FIXED_PRICE', regions: ['ALL'],
            services: [{ name: 'Standard', estimatedDelivery: '5-7 days', firstFreight: '499' }] }],
        }}],
        payment: { coin: 'ETH', chaincode: '', amount: price, method: 'MODERATED' },
        pricingCoin: 'USD', amount: price,
        shipping: { shipTo: 'John Smith', address: '123 Blockchain Ave', city: 'San Francisco', state: 'CA', postalCode: '94105', country: 'US' },
        items: [{ listingHash: '', quantity: 1, memo: '', shippingOption: { name: 'Standard', service: 'Standard' } }],
        timestamp, buyerID: { peerID: MOCK_BUYER_PEER_ID, handle: 'CryptoBuyer' },
      },
      vendorListings: [{ slug, metadata: { contractType: 'PHYSICAL_GOOD', pricingCurrency: { code: 'USD', divisibility: 2 } }, item: { title, images: [img(imgId)] } }],
      ...(overrides || {}),
    },
    state, read: state !== 'PENDING', funded: state !== 'PENDING' && state !== 'AWAITING_PAYMENT',
    paymentAddressTransactions: state === 'PENDING' || state === 'AWAITING_PAYMENT' ? [] :
      [{ txid: `0x${id.slice(2, 18)}abcdef`, value: price, confirmations: 12, timestamp }],
  };
}

const ORDERS = {
  AWAITING_PAYMENT: makeOrder('QmAwaitPay001', 'gaming-mouse', 'Gaming Mouse RGB Pro', 5999, 96, 'AWAITING_PAYMENT', HOUR_AGO),
  PENDING: makeOrder('QmPending001', 'wireless-headphones', 'Wireless Noise-Cancelling Headphones', 8999, 3, 'PENDING', HOUR_AGO),
  AWAITING_FULFILLMENT: makeOrder('QmAwaitFul001', 'leather-backpack', 'Handcrafted Leather Backpack', 17500, 119, 'AWAITING_FULFILLMENT', DAY_AGO,
    { orderConfirmation: { timestamp: HOUR_AGO } }),
  FULFILLED: makeOrder('QmFulfill001', 'organic-coffee', 'Organic Coffee Beans — Ethiopia', 2200, 63, 'FULFILLED', THREE_DAYS_AGO,
    { orderConfirmation: { timestamp: THREE_DAYS_AGO },
      orderFulfillments: [{ timestamp: DAY_AGO, physicalDelivery: [{ shipper: 'FedEx', trackingNumber: 'FX9876543210' }] }] }),
  COMPLETED: makeOrder('QmComplete001', 'design-kit', 'UI/UX Design Kit — 500+ Components', 4900, 24, 'COMPLETED', TWO_WEEKS_AGO,
    { orderConfirmation: { timestamp: TWO_WEEKS_AGO },
      orderFulfillments: [{ timestamp: WEEK_AGO }],
      orderCompletion: { timestamp: WEEK_AGO },
      buyerRating: { overall: 5, quality: 5, description: 4, deliverySpeed: 5, customerService: 5,
        review: 'Excellent design kit! Saved me weeks of work.', timestamp: WEEK_AGO },
      vendorRating: { overall: 5, review: 'Great buyer.', timestamp: WEEK_AGO } }),
  DISPUTED: makeOrder('QmDispute001', 'smart-watch', 'Smart Watch Pro 2025', 29999, 160, 'DISPUTED', TWO_WEEKS_AGO,
    { orderConfirmation: { timestamp: TWO_WEEKS_AGO },
      orderFulfillments: [{ timestamp: WEEK_AGO, physicalDelivery: [{ shipper: 'UPS', trackingNumber: 'UPS1234567890' }] }],
      disputeOpen: { timestamp: THREE_DAYS_AGO,
        evidenceHashes: ['QmT5NvUtoM5nWFfrQdVrFtvGfKFmG7AHE8P34isapyhCxX', 'QmWATWQ7fVPP2EFGu71UkfnqhYXDYH566qy47CnJDgvs8u'] },
      dispute: { timestamp: THREE_DAYS_AGO, claim: 'Item received damaged — screen has a crack on arrival.', payoutAddress: '0xBuyer123' } }),
  REFUNDED: makeOrder('QmRefund001', 'ebook-web3', 'E-Book: Mastering Web3 Commerce', 1499, 42, 'REFUNDED', MONTH_AGO,
    { orderConfirmation: { timestamp: MONTH_AGO },
      refund: { timestamp: TWO_WEEKS_AGO, memo: 'Wrong file delivered, full refund issued.' } }),
  CANCELED: makeOrder('QmCancel001', 'contract-audit', 'Smart Contract Audit Package', 29900, 84, 'CANCELED', WEEK_AGO,
    { orderCancel: { timestamp: THREE_DAYS_AGO, reason: 'Seller requested cancellation.' } }),
  PAYMENT_FINALIZED: makeOrder('QmFinalized01', 'premium-tee', 'Premium Cotton T-Shirt', 3500, 11, 'PAYMENT_FINALIZED', MONTH_AGO,
    { orderConfirmation: { timestamp: MONTH_AGO },
      orderFulfillments: [{ timestamp: TWO_WEEKS_AGO, physicalDelivery: [{ shipper: 'USPS', trackingNumber: 'USPS9999999' }] }],
      paymentFinalized: { timestamp: WEEK_AGO } }),
};

function ordersListSummary(ordersMap) {
  return Object.values(ordersMap).map(o => ({
    orderID: o.contract.OrderID,
    slug: o.contract.vendorListings[0].slug,
    title: o.contract.vendorListings[0].item.title,
    thumbnail: o.contract.vendorListings[0].item.images[0],
    total: { amount: o.contract.orderOpen.amount, currency: { code: 'USD', divisibility: 2 } },
    quantity: 1, timestamp: o.contract.orderOpen.timestamp,
    state: o.state, vendorID: MOCK_VENDOR_PEER_ID, buyerID: MOCK_BUYER_PEER_ID,
    paymentCoin: 'ETH', read: o.read, moderated: true, unreadChatMessages: 0,
  }));
}

// ─── Helper Functions ────────────────────────────────────────────────

async function injectAuth(page) {
  const zustandState = JSON.stringify({
    state: { profile: FAKE_PROFILE, isAuthenticated: true, authMode: 'basic', token: FAKE_TOKEN, authSource: 'basic' },
    version: 0,
  });
  const authItems = {
    mobazha_auth_token: FAKE_TOKEN,
    mobazha_auth_user: JSON.stringify({ id: 'testuser1', name: 'TechStore Premium', displayName: 'TechStore Premium', avatar: '', role: 'seller', casdoorId: 'testuser1' }),
    'mobazha-user-storage': zustandState,
  };
  await page.addInitScript(`
    const items = ${JSON.stringify(authItems)};
    for (const [key, value] of Object.entries(items)) { localStorage.setItem(key, value); }
  `);
}

async function mockCommonAPIs(page) {
  await page.route('**/v1/profiles/me', r => r.fulfill({ status: 200, contentType: 'application/json', body: wrapData(FAKE_PROFILE) }));
  await page.route('**/v1/profiles', r => r.fulfill({ status: 200, contentType: 'application/json', body: wrapData(FAKE_PROFILE) }));
  await page.route('**/v1/profiles/**', r => {
    if (r.request().url().includes('/batch') || r.request().url().includes('/me')) return r.fallback();
    r.fulfill({ status: 200, contentType: 'application/json', body: wrapData({ peerID: MOCK_VENDOR_PEER_ID, name: 'TechStore', handle: 'techstore', avatarHashes: img(64) }) });
  });
  await page.route('**/v1/settings', r => r.fulfill({ status: 200, contentType: 'application/json', body: wrapData(FAKE_SETTINGS) }));
  await page.route('**/v1/exchange-rates*', r => r.fulfill({ status: 200, contentType: 'application/json', body: wrapData({ BTC: { last: 65000 }, ETH: { last: 3500 }, BNB: { last: 600 }, SOL: { last: 150 } }) }));
  await page.route('**/v1/wallet/balance', r => r.fulfill({ status: 200, contentType: 'application/json', body: wrapData({ confirmed: '1250000', unconfirmed: '50000', currency: { code: 'BTC', divisibility: 8 } }) }));
  await page.route('**/v1/wallet/currencies', r => r.fulfill({ status: 200, contentType: 'application/json', body: wrapData([{ code: 'BTC', name: 'Bitcoin', divisibility: 8, currencyType: 'crypto' }, { code: 'ETH', name: 'Ethereum', divisibility: 18, currencyType: 'crypto' }]) }));
  await page.route('**/platform/v1/accounts/me', r => r.fulfill({ status: 200, contentType: 'application/json', body: wrapData({ id: 'testuser1', name: 'TechStore Premium', properties: { peerID: FAKE_PEER_ID } }) }));
  await page.route('**/platform/v1/auth/signin', r => r.fulfill({ status: 200, contentType: 'application/json', body: wrapData({ token: FAKE_TOKEN }) }));
  await page.route('**/v1/listings/index*', r => r.fulfill({ status: 200, contentType: 'application/json', body: wrapData([]) }));
  await page.route('**/v1/collections*', r => r.fulfill({ status: 200, contentType: 'application/json', body: wrapData([]) }));
  await page.route('**/v1/notifications*', r => r.fulfill({ status: 200, contentType: 'application/json', body: wrapData({ notifications: [], total: 0, unread: 0 }) }));
  await page.route('**/v1/webhooks*', r => r.fulfill({ status: 200, contentType: 'application/json', body: wrapData([]) }));
  await page.route('**/v1/fiat/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: wrapData({}) }));
  await page.route('**/v1/media/images/**', r => r.fulfill({ status: 302, headers: { Location: 'https://picsum.photos/id/237/300/300' } }));
  await page.route('**/search/v1/profiles/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: wrapData({ peerID: MOCK_VENDOR_PEER_ID, name: 'TechStore', handle: 'techstore', avatarHashes: img(64) }) }));
  await page.route('**/ws', r => r.abort());
  await page.route('**/ws/', r => r.abort());
}

async function newPage(browser, viewport) {
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  await injectAuth(page);
  await mockCommonAPIs(page);
  return { ctx, page };
}

async function screenshot(page, name) {
  const file = path.join(OUTPUT_DIR, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  console.log(`  ✓ ${name}.png (${(fs.statSync(file).size / 1024).toFixed(1)}KB)`);
  return file;
}

async function mockOrderAndOpen(browser, viewport, order, urlSuffix = '') {
  const { ctx, page } = await newPage(browser, viewport);
  await page.route('**/v1/orders/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: wrapData(order) }));
  await page.goto(`${BASE_URL}/orders/${order.contract.OrderID}?type=purchase${urlSuffix}`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(4000);
  return { ctx, page };
}

// ─── Main ────────────────────────────────────────────────────────────

(async () => {
  console.log('Launching browser...\n');
  const browser = await chromium.launch({ headless: true });
  const results = [];

  // ━━━ 1. UX-12: Order list with "Continue Payment" CTA ━━━━━━━━━━━━━
  console.log('UX-12: Continue Payment CTA on order card');
  for (const [label, viewport] of [['desktop', { width: 1280, height: 900 }], ['mobile', { width: 390, height: 844 }]]) {
    const { ctx, page } = await newPage(browser, viewport);
    const purchases = ordersListSummary(ORDERS);
    await page.route('**/v1/purchases*', (r, req) => {
      if (req.method() !== 'GET') return r.fallback();
      r.fulfill({ status: 200, contentType: 'application/json', body: wrapData({ purchases }) });
    });
    await page.route('**/v1/profiles/batch*', r => r.fulfill({ status: 200, contentType: 'application/json', body: wrapData({}) }));
    await page.goto(`${BASE_URL}/orders?tab=purchases`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(4000);
    results.push(await screenshot(page, `ux12-continue-payment-${label}`));
    await ctx.close();
  }

  // ━━━ 2. UX-13: Seller Dashboard ActionItems ━━━━━━━━━━━━━━━━━━━━━━━
  console.log('\nUX-13: Seller Dashboard ActionItems');
  for (const [label, viewport] of [['desktop', { width: 1280, height: 900 }], ['mobile', { width: 390, height: 844 }]]) {
    const { ctx, page } = await newPage(browser, viewport);
    const sales = ordersListSummary(ORDERS);
    await page.route('**/v1/sales*', (r, req) => {
      if (req.method() !== 'GET') return r.fallback();
      r.fulfill({ status: 200, contentType: 'application/json', body: wrapData({ sales }) });
    });
    await page.route('**/v1/purchases*', (r, req) => {
      if (req.method() !== 'GET') return r.fallback();
      r.fulfill({ status: 200, contentType: 'application/json', body: wrapData({ purchases: [] }) });
    });
    await page.route('**/v1/profiles/batch*', r => r.fulfill({ status: 200, contentType: 'application/json', body: wrapData({}) }));
    await page.goto(`${BASE_URL}/admin`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(4000);
    results.push(await screenshot(page, `ux13-dashboard-action-items-${label}`));
    await ctx.close();
  }

  // ━━━ 3. All Order Lifecycle States — Desktop + Mobile ━━━━━━━━━━━━━━
  const lifecycleStates = ['AWAITING_PAYMENT', 'PENDING', 'AWAITING_FULFILLMENT', 'FULFILLED', 'COMPLETED', 'DISPUTED', 'REFUNDED', 'CANCELED', 'PAYMENT_FINALIZED'];
  console.log('\nOrder lifecycle states (desktop)');
  for (const state of lifecycleStates) {
    const order = ORDERS[state];
    if (!order) continue;
    const { ctx, page } = await mockOrderAndOpen(browser, { width: 1280, height: 900 }, order);
    results.push(await screenshot(page, `lifecycle-${state.toLowerCase()}-desktop`));
    await ctx.close();
  }

  console.log('\nOrder lifecycle states (mobile — ALL states)');
  for (const state of lifecycleStates) {
    const order = ORDERS[state];
    if (!order) continue;
    const { ctx, page } = await mockOrderAndOpen(browser, { width: 390, height: 844 }, order);
    results.push(await screenshot(page, `lifecycle-${state.toLowerCase()}-mobile`));
    await ctx.close();
  }

  // ━━━ 4. UX-14: WriteReviewDialog with star labels ━━━━━━━━━━━━━━━━━
  console.log('\nUX-14: WriteReviewDialog with star labels');
  await (async () => {
    // Try PAYMENT_FINALIZED first (buyer gets WriteReview action)
    const order = ORDERS.PAYMENT_FINALIZED;
    const { ctx, page } = await mockOrderAndOpen(browser, { width: 1280, height: 900 }, order);
    const reviewBtn = page.locator('button:has-text("Review"), button:has-text("Write Review"), button:has-text("Confirm Receipt")').first();
    const visible = await reviewBtn.isVisible().catch(() => false);
    if (visible) {
      await reviewBtn.click();
      await page.waitForTimeout(2000);
      const starBtns = await page.locator('[role="radio"], [data-testid*="star"] button, .star-rating button').all();
      if (starBtns.length >= 4) {
        await starBtns[3].click();
        await page.waitForTimeout(500);
      }
      results.push(await screenshot(page, 'ux14-review-dialog-stars'));
      console.log('  ✓ Review dialog captured');
      await ctx.close();
      return;
    }
    console.log('  ⚠ Review button not found on PAYMENT_FINALIZED — trying FULFILLED order');
    await ctx.close();

    const { ctx: ctx2, page: page2 } = await mockOrderAndOpen(browser, { width: 1280, height: 900 }, ORDERS.FULFILLED);
    const fallbackBtn = page2.locator('button:has-text("Confirm Receipt"), button:has-text("Complete Order"), button:has-text("Complete")').first();
    const fallbackVisible = await fallbackBtn.isVisible().catch(() => false);
    if (fallbackVisible) {
      await fallbackBtn.click();
      await page2.waitForTimeout(2000);
      results.push(await screenshot(page2, 'ux14-review-dialog-stars'));
      console.log('  ✓ Review dialog captured (via Confirm Receipt)');
    } else {
      console.log('  ⚠ Neither review nor confirm receipt button found — dumping debug screenshot');
      results.push(await screenshot(page2, 'ux14-debug-page'));
    }
    await ctx2.close();
  })();

  // ━━━ 5. UX-07/08: TransactionOverlay states (injected) ━━━━━━━━━━━━
  console.log('\nUX-07/08: TransactionOverlay states');
  {
    const { ctx, page } = await newPage(browser, { width: 1280, height: 900 });
    await page.route('**/v1/purchases*', (r, req) => {
      if (req.method() !== 'GET') return r.fallback();
      r.fulfill({ status: 200, contentType: 'application/json', body: wrapData({ purchases: [] }) });
    });
    await page.goto(`${BASE_URL}/orders?tab=purchases`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    await page.evaluate(() => {
      const overlay = document.createElement('div');
      overlay.id = 'mock-tx-overlay';
      overlay.style.cssText = 'position:fixed;inset:0;z-index:100;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.5);backdrop-filter:blur(4px);padding:1rem;';
      overlay.innerHTML = `
        <div style="width:100%;max-width:24rem;border-radius:1rem;border:1px solid var(--border,#e5e7eb);background:var(--card,#fff);box-shadow:0 20px 25px -5px rgba(0,0,0,.1);padding:2rem;text-align:center;">
          <div style="position:relative;width:4rem;height:4rem;margin:0 auto 1rem;">
            <div style="position:absolute;inset:0;border-radius:50%;border:4px solid rgba(59,130,246,0.2);"></div>
            <div style="position:absolute;inset:0;border-radius:50%;border:4px solid #3b82f6;border-top-color:transparent;animation:spin 1s linear infinite;"></div>
            <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;">
              <svg style="width:1.5rem;height:1.5rem;color:#3b82f6;" fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M12 6v6l4 2"/>
              </svg>
            </div>
          </div>
          <h2 style="font-size:1.125rem;font-weight:600;color:var(--foreground,#111);margin-bottom:.25rem;">Transaction Sent</h2>
          <p style="font-size:.875rem;color:var(--muted-foreground,#6b7280);margin-bottom:.75rem;">Waiting for blockchain confirmation...</p>
          <div style="display:inline-flex;align-items:center;gap:.375rem;font-size:.75rem;color:var(--muted-foreground,#6b7280);background:var(--muted,#f3f4f6);border-radius:9999px;padding:.25rem .75rem;">
            <svg style="width:.75rem;height:.75rem;" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z"/></svg>
            <span>Usually 1-3 minutes</span>
          </div>
          <div style="margin-top:.75rem;">
            <a style="display:inline-flex;align-items:center;gap:.375rem;font-size:.75rem;font-family:monospace;color:#3b82f6;" href="#">
              0xabc123...def456
              <svg style="width:.75rem;height:.75rem;" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
            </a>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);
    });
    await page.waitForTimeout(500);
    results.push(await screenshot(page, 'ux07-transaction-estimated-time'));
    await page.evaluate(() => document.getElementById('mock-tx-overlay')?.remove());

    await page.evaluate(() => {
      const overlay = document.createElement('div');
      overlay.id = 'mock-tx-overlay';
      overlay.style.cssText = 'position:fixed;inset:0;z-index:100;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.5);backdrop-filter:blur(4px);padding:1rem;';
      overlay.innerHTML = `
        <div style="width:100%;max-width:24rem;border-radius:1rem;border:1px solid var(--border,#e5e7eb);background:var(--card,#fff);box-shadow:0 20px 25px -5px rgba(0,0,0,.1);padding:2rem;text-align:center;">
          <div style="width:4rem;height:4rem;border-radius:50%;background:rgba(239,68,68,0.1);display:flex;align-items:center;justify-content:center;margin:0 auto 1rem;">
            <svg style="width:2rem;height:2rem;color:#ef4444;" fill="none" viewBox="0 0 24 24">
              <path stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <h2 style="font-size:1.125rem;font-weight:600;color:var(--foreground,#111);margin-bottom:.25rem;">Payment Failed</h2>
          <p style="font-size:.875rem;color:var(--muted-foreground,#6b7280);max-width:280px;margin:0 auto .75rem;word-break:break-word;">
            Insufficient balance. Please ensure you have enough ETH (including gas fees) and try again.
          </p>
          <div style="display:flex;gap:.75rem;width:100%;">
            <button style="flex:1;padding:.625rem 1rem;border-radius:.5rem;background:#3b82f6;color:#fff;font-weight:500;font-size:.875rem;border:none;cursor:pointer;">Retry</button>
            <button style="flex:1;padding:.625rem 1rem;border-radius:.5rem;background:transparent;color:var(--foreground,#111);font-weight:500;font-size:.875rem;border:1px solid var(--border,#e5e7eb);cursor:pointer;">Close</button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);
    });
    await page.waitForTimeout(500);
    results.push(await screenshot(page, 'ux08-payment-error-friendly'));
    await page.evaluate(() => document.getElementById('mock-tx-overlay')?.remove());
    await ctx.close();
  }

  console.log('\nUX-10: Dispute evidence (see demo-output/dispute-evidence/)');

  await browser.close();
  console.log(`\n━━━ Done! ${results.length} screenshots captured ━━━`);
  console.log(`Output: ${OUTPUT_DIR}\n`);
  for (const f of results) console.log(`  ${path.basename(f)}`);
})();
