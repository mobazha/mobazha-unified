/**
 * Capture dispute evidence flow screenshots with full auth mock.
 * Run: cd apps/web && node e2e/capture-dispute-screenshots.mjs
 */

import { chromium } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, 'demo-output', 'dispute-evidence');
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';

const FAKE_TOKEN = 'basic:dGVzdHVzZXIxOjEyMw==';
const FAKE_PEER_ID = 'QmY8Mzg1LzU2NzgvOTAxMjM0NTY3ODkwMTIzNDU2Nzg5MA';
const THREE_DAYS_AGO = new Date(Date.now() - 3 * 86400000).toISOString();
const WEEK_AGO = new Date(Date.now() - 7 * 86400000).toISOString();
const TWO_WEEKS_AGO = new Date(Date.now() - 14 * 86400000).toISOString();

function img(id) {
  const url = `https://picsum.photos/id/${id}/300/300`;
  return { tiny: url, small: url, medium: url, large: url, original: url };
}

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

function wrapData(d) { return JSON.stringify({ data: d }); }

async function injectAuthAndMockAPIs(page) {
  const zustandState = JSON.stringify({
    state: { profile: FAKE_PROFILE, isAuthenticated: true, authMode: 'basic', token: FAKE_TOKEN, authSource: 'basic' },
    version: 0,
  });
  const authItems = {
    mobazha_auth_token: FAKE_TOKEN,
    mobazha_auth_user: JSON.stringify({ id: 'testuser1', name: 'TechStore Premium', displayName: 'TechStore Premium', avatar: '', role: 'seller', casdoorId: 'testuser1' }),
    'mobazha-user-storage': zustandState,
  };
  const escaped = JSON.stringify(authItems);
  await page.addInitScript(`
    const items = ${escaped};
    for (const [key, value] of Object.entries(items)) { localStorage.setItem(key, value); }
  `);

  await page.route('**/v1/profiles/me', r => r.fulfill({ status: 200, contentType: 'application/json', body: wrapData(FAKE_PROFILE) }));
  await page.route('**/v1/profiles', r => r.fulfill({ status: 200, contentType: 'application/json', body: wrapData(FAKE_PROFILE) }));
  await page.route('**/v1/settings', r => r.fulfill({ status: 200, contentType: 'application/json', body: wrapData({ paymentDataInQR: true, showNotifications: true, showNsfw: false, shippingAddresses: [], localCurrency: 'USD', country: 'US', termsAndConditions: '', refundPolicy: '', blockedNodes: [], storeModerators: [], mispaymentBuffer: 1, version: '', preferredCurrencies: ['BTC','ETH','BNB'] }) }));
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
  await page.route('**/ws', r => r.abort());
  await page.route('**/ws/', r => r.abort());

  await page.route('**/v1/media/images/**', r => r.fulfill({ status: 302, headers: { Location: 'https://picsum.photos/id/237/300/300' } }));
  await page.route('**/search/v1/profiles/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: wrapData({ peerID: 'QmVendor123', name: 'TechStore', handle: 'techstore', avatarHashes: img(64) }) }));
}

const DISPUTED_ORDER = {
  contract: {
    OrderID: 'QmDispute001',
    orderOpen: {
      listings: [{ vendorID: { peerID: 'QmVendor123' }, listing: {
        slug: 'smart-watch',
        metadata: { contractType: 'PHYSICAL_GOOD', pricingCurrency: { code: 'USD', divisibility: 2 } },
        vendorID: { peerID: 'QmVendor123', handle: 'TechStore' },
        item: { title: 'Smart Watch Pro 2025', description: 'Premium smart watch', price: '29999',
          images: [{ ...img(160), filename: 'watch.png' }], skus: [{ productID: '1', quantity: '100' }] },
        shippingProfile: {
          profileId: 'sp-standard',
          name: 'Default Shipping',
          isDefault: true,
          locationGroups: [{
            id: 'lg-default',
            locationIds: [],
            zones: [{
              id: 'zone-standard',
              name: 'Standard',
              regions: ['ALL'],
              rates: [{ id: 'rate-standard', name: 'Standard', price: '499', currency: 'USD', estimatedDelivery: '5-7 days' }],
            }],
          }],
        },
      }}],
      payment: { coin: 'ETH', chaincode: '', amount: 29999, method: 'MODERATED' },
      pricingCoin: 'USD', amount: 29999,
      shipping: { shipTo: 'John Smith', address: '123 Blockchain Ave', city: 'San Francisco', state: 'CA', postalCode: '94105', country: 'US' },
      items: [{ listingHash: '', quantity: 1, memo: '', shippingOption: { name: 'Standard', service: 'Standard' } }],
      timestamp: TWO_WEEKS_AGO,
      buyerID: { peerID: 'QmBuyer456', handle: 'CryptoBuyer' },
    },
    vendorListings: [{ slug: 'smart-watch', metadata: { contractType: 'PHYSICAL_GOOD', pricingCurrency: { code: 'USD', divisibility: 2 } }, item: { title: 'Smart Watch Pro 2025', images: [img(160)] } }],
    orderConfirmation: { timestamp: TWO_WEEKS_AGO },
    orderFulfillments: [{ timestamp: WEEK_AGO, physicalDelivery: [{ shipper: 'UPS', trackingNumber: 'UPS1234567890' }] }],
    disputeOpen: {
      timestamp: THREE_DAYS_AGO,
      evidenceHashes: ['QmT5NvUtoM5nWFfrQdVrFtvGfKFmG7AHE8P34isapyhCxX', 'QmWATWQ7fVPP2EFGu71UkfnqhYXDYH566qy47CnJDgvs8u'],
    },
    dispute: { timestamp: THREE_DAYS_AGO, claim: 'Item received damaged — screen has a crack on arrival.', payoutAddress: '0xBuyerPayoutAddr123' },
  },
  state: 'DISPUTED', read: true, funded: true,
  paymentAddressTransactions: [{ txid: '0xabc123def456', value: 29999, confirmations: 12, timestamp: TWO_WEEKS_AGO }],
};

const SHIPPED_ORDER = {
  contract: {
    OrderID: 'QmFulfilled001',
    orderOpen: {
      listings: [{ vendorID: { peerID: 'QmVendor123' }, listing: {
        slug: 'wireless-headphones',
        metadata: { contractType: 'PHYSICAL_GOOD', pricingCurrency: { code: 'USD', divisibility: 2 } },
        vendorID: { peerID: 'QmVendor123', handle: 'TechStore' },
        item: { title: 'Wireless Noise-Cancelling Headphones', description: 'Premium headphones', price: '8999',
          images: [{ ...img(3), filename: 'headphones.png' }], skus: [{ productID: '1', quantity: '100' }] },
        shippingProfile: {
          profileId: 'sp-standard',
          name: 'Default Shipping',
          isDefault: true,
          locationGroups: [{
            id: 'lg-default',
            locationIds: [],
            zones: [{
              id: 'zone-standard',
              name: 'Standard',
              regions: ['ALL'],
              rates: [{ id: 'rate-standard', name: 'Standard', price: '499', currency: 'USD', estimatedDelivery: '5-7 days' }],
            }],
          }],
        },
      }}],
      payment: { coin: 'ETH', chaincode: '', amount: 8999, method: 'MODERATED' },
      pricingCoin: 'USD', amount: 8999,
      shipping: { shipTo: 'John Smith', address: '123 Blockchain Ave', city: 'San Francisco', state: 'CA', postalCode: '94105', country: 'US' },
      items: [{ listingHash: '', quantity: 1, memo: '', shippingOption: { name: 'Standard', service: 'Standard' } }],
      timestamp: WEEK_AGO,
      buyerID: { peerID: 'QmBuyer456', handle: 'CryptoBuyer' },
    },
    vendorListings: [{ slug: 'wireless-headphones', metadata: { contractType: 'PHYSICAL_GOOD', pricingCurrency: { code: 'USD', divisibility: 2 } }, item: { title: 'Wireless Noise-Cancelling Headphones', images: [img(3)] } }],
    orderConfirmation: { timestamp: WEEK_AGO },
    orderShipments: [{ timestamp: THREE_DAYS_AGO, shipments: [{ physicalDelivery: { shipper: 'FedEx', trackingNumber: 'FX9876543210' } }] }],
  },
  state: 'SHIPPED', read: true, funded: true,
  paymentAddressTransactions: [{ txid: '0xdef789', value: 8999, confirmations: 24, timestamp: WEEK_AGO }],
};

(async () => {
  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: true });
  const screenshots = [];

  async function capture(name, viewport, orderData, url, postAction) {
    const ctx = await browser.newContext({ viewport });
    const page = await ctx.newPage();
    await injectAuthAndMockAPIs(page);
    await page.route('**/v1/orders/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: wrapData(orderData) }));
    await page.route('**/v1/profiles/**', r => {
      if (r.request().url().includes('/batch') || r.request().url().includes('/me')) return r.fallback();
      r.fulfill({ status: 200, contentType: 'application/json', body: wrapData({ peerID: 'QmVendor123', name: 'TechStore', handle: 'techstore', avatarHashes: img(64) }) });
    });
    await page.goto(url);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(4000);
    if (postAction) await postAction(page);
    const file = path.join(OUTPUT_DIR, `${name}.png`);
    await page.screenshot({ path: file, fullPage: true });
    screenshots.push(file);
    console.log(`✓ ${name}.png`);
    await ctx.close();
  }

  // 1. Disputed order — Desktop (with evidence images in banner + detail)
  await capture('01-disputed-desktop', { width: 1280, height: 800 }, DISPUTED_ORDER,
    `${BASE_URL}/orders/QmDispute001?type=purchase`);

  // 2. Disputed order — Mobile
  await capture('02-disputed-mobile', { width: 390, height: 844 }, DISPUTED_ORDER,
    `${BASE_URL}/orders/QmDispute001?type=purchase`);

  // 3. Fulfilled order (can open dispute) — Desktop
  await capture('03-shipped-desktop', { width: 1280, height: 800 }, SHIPPED_ORDER,
    `${BASE_URL}/orders/QmFulfilled001?type=purchase`);

  // 4. Try opening dispute modal on fulfilled order
  await capture('04-dispute-modal', { width: 1280, height: 800 }, SHIPPED_ORDER,
    `${BASE_URL}/orders/QmFulfilled001?type=purchase`, async (page) => {
      const btn = page.locator('button:has-text("Open Dispute"), button:has-text("Dispute"), [data-testid="open-dispute-btn"]').first();
      const visible = await btn.isVisible().catch(() => false);
      if (visible) {
        await btn.click();
        await page.waitForTimeout(1500);
      } else {
        console.log('  ⚠ Dispute button not visible (may need MODERATED payment)');
      }
    });

  await browser.close();
  console.log(`\nDone! ${screenshots.length} screenshots in ${OUTPUT_DIR}`);
  for (const f of screenshots) {
    const sz = fs.statSync(f).size;
    console.log(`  ${path.basename(f)} (${(sz/1024).toFixed(1)}KB)`);
  }
})();
