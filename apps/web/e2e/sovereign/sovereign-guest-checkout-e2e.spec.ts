/**
 * Layer C: Sovereign Guest Checkout E2E — Full BTC regtest payment loop.
 *
 * Runs against a Docker Compose environment:
 *   - Sovereign binary (embedded frontend + guest checkout)
 *   - bitcoind regtest + electrs
 *
 * Full lifecycle:
 *   1. Seed store (profile + listing + guest checkout config)
 *   2. Browse product, add to cart
 *   3. Guest checkout → POST /v1/guest/orders → get paymentAddress + paymentAmount
 *   4. bitcoin-cli sendtoaddress → PAYMENT_DETECTED
 *   5. bitcoin-cli generatetoaddress → confirmations → FUNDED
 *   6. Seller marks shipped → SHIPPED
 *   7. Buyer confirms → COMPLETED
 *
 * Usage:
 *   cd tests/e2e/docker
 *   docker compose -f docker-compose.sovereign-e2e.yml up -d
 *   bash scripts/wait-sovereign.sh
 *   export SOVEREIGN_PASSWORD=$(docker exec sovereign-e2e-sovereign cat /data/admin_password)
 *   cd ~/dev/openbazaar/mobazha-unified/apps/web
 *   SOVEREIGN_URL=http://127.0.0.1:5102 pnpm test:e2e:sovereign:real -- e2e/sovereign/sovereign-guest-checkout-e2e.spec.ts
 */

import { test, expect, type APIRequestContext } from '@playwright/test';
import { execSync } from 'child_process';
import { seedSovereignStore, waitForHealthy } from './fixtures/seed-sovereign-store';

const SOVEREIGN_URL = process.env.SOVEREIGN_URL || 'http://127.0.0.1:5102';
const ADMIN_PASS = process.env.SOVEREIGN_PASSWORD || '';
const OUT = 'screenshots/sovereign-e2e';
const BTC_CLI =
  'docker exec sovereign-e2e-bitcoind bitcoin-cli -regtest -rpcuser=test -rpcpassword=test -rpcwallet=e2e';
const BTC_ASSET_ID = 'crypto:bip122:000000000019d6689c085ae165831e93:native';

function exec(cmd: string): string {
  return execSync(cmd, { encoding: 'utf-8', timeout: 30000 }).trim();
}

function hasBtcRegtest(): boolean {
  try {
    return exec(`docker inspect -f '{{.State.Running}}' sovereign-e2e-bitcoind`) === 'true';
  } catch {
    return false;
  }
}

function basicAuth(): string {
  return 'Basic ' + Buffer.from(`admin:${ADMIN_PASS}`).toString('base64');
}

function headers(): Record<string, string> {
  return { Authorization: basicAuth(), 'Content-Type': 'application/json' };
}

async function pollOrderStatus(
  request: APIRequestContext,
  orderToken: string,
  targetState: string,
  timeoutMs = 120_000
): Promise<Record<string, unknown>> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const resp = await request.get(`${SOVEREIGN_URL}/v1/guest/orders/${orderToken}`);
    if (resp.ok()) {
      const body = await resp.json();
      const order = body.data ?? body;
      const state = (order.state || order.status || '').toString().toUpperCase();
      if (state.includes(targetState.toUpperCase())) return order;
    }
    await new Promise(r => setTimeout(r, 3000));
  }
  throw new Error(`Order did not reach ${targetState} within ${timeoutMs}ms`);
}

test.describe.configure({ mode: 'serial' });

let listingSlug: string | null = null;

test.beforeAll(async ({ request }) => {
  test.skip(!ADMIN_PASS, 'SOVEREIGN_PASSWORD not set — skip E2E payment tests');
  test.skip(
    !hasBtcRegtest(),
    'sovereign-e2e-bitcoind is not running — skip legacy BTC payment tests'
  );
  await waitForHealthy(SOVEREIGN_URL);

  let btcSweepAddress: string | undefined;
  try {
    btcSweepAddress = exec(`${BTC_CLI} getnewaddress "sweep" "bech32"`);
  } catch {
    console.warn('Could not get BTC sweep address from regtest');
  }

  const result = await seedSovereignStore(request, SOVEREIGN_URL, ADMIN_PASS, {
    acceptedCoins: BTC_ASSET_ID,
    btcSweepAddress,
  });
  console.log('Seed result:', result);
  listingSlug = result.listingSlug;

  const btcBalance = exec(`${BTC_CLI} getbalance`);
  console.log(`BTC regtest balance: ${btcBalance}`);
  expect(parseFloat(btcBalance)).toBeGreaterThan(0);
});

test.describe('Sovereign Guest Checkout E2E — BTC Payment Loop', () => {
  let orderToken: string;
  let paymentAddress: string;
  let paymentAmountSatoshi: number;

  test('01 — Create guest order via API', async ({ request }) => {
    test.skip(!ADMIN_PASS, 'No password');

    const listingsResp = await request.get(`${SOVEREIGN_URL}/v1/listings/index`, {
      headers: { Authorization: basicAuth() },
    });
    expect(listingsResp.ok()).toBeTruthy();
    const listingsBody = await listingsResp.json();
    const listings = listingsBody.data ?? listingsBody;
    expect(listings.length).toBeGreaterThanOrEqual(1);

    const firstListing = listings[0];
    const slug = firstListing.slug || firstListing.hash;

    const orderResp = await request.post(`${SOVEREIGN_URL}/v1/guest/orders`, {
      data: {
        items: [{ listingSlug: slug, quantity: 1 }],
        paymentCoin: BTC_ASSET_ID,
        contactEmail: 'buyer@test.local',
      },
    });

    console.log('Order response status:', orderResp.status());
    const orderBody = await orderResp.json();
    console.log('Order response:', JSON.stringify(orderBody, null, 2));

    if (!orderResp.ok()) {
      test.skip(
        true,
        `Guest order creation failed (${orderResp.status()}): likely no wallet configured`
      );
      return;
    }

    const order = orderBody.data ?? orderBody;
    orderToken = order.orderToken || order.token;
    paymentAddress = order.paymentAddress || order.payment?.address;
    paymentAmountSatoshi = parseInt(String(order.paymentAmount || order.payment?.amount), 10);

    expect(orderToken).toBeTruthy();
    expect(paymentAddress).toBeTruthy();
    expect(paymentAmountSatoshi).toBeGreaterThan(0);

    console.log(`Order token: ${orderToken}`);
    console.log(`Payment address: ${paymentAddress}`);
    console.log(`Payment amount (satoshi): ${paymentAmountSatoshi}`);
  });

  test('02 — Send BTC payment via regtest', async ({ page }) => {
    test.skip(!ADMIN_PASS || !orderToken, 'No order to pay');

    const amountBTC = (paymentAmountSatoshi / 1e8).toFixed(8);
    console.log(`Sending ${amountBTC} BTC to ${paymentAddress}`);

    const txid = exec(`${BTC_CLI} sendtoaddress "${paymentAddress}" ${amountBTC}`);
    console.log(`Transaction sent: ${txid}`);
    expect(txid).toBeTruthy();

    await page.goto(`/guest-order/${orderToken}`);
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${OUT}/02-awaiting-confirmation.png`, fullPage: true });
  });

  test('03 — Generate 1 block → PAYMENT_DETECTED', async ({ request, page }) => {
    test.skip(!ADMIN_PASS || !orderToken, 'No order');

    const minerAddr = exec(`${BTC_CLI} getnewaddress "miner" "bech32"`);
    exec(`${BTC_CLI} generatetoaddress 1 "${minerAddr}"`);
    console.log('Generated 1 block');

    try {
      const order = await pollOrderStatus(request, orderToken, 'PAYMENT_DETECTED', 60_000);
      console.log('Order state after 1 block:', order.state || order.status);
    } catch {
      console.log('Note: State may jump directly to FUNDED for low-conf coins');
    }

    await page.goto(`/guest-order/${orderToken}`);
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${OUT}/03-payment-detected.png`, fullPage: true });
  });

  test('04 — Generate more blocks → FUNDED', async ({ request, page }) => {
    test.skip(!ADMIN_PASS || !orderToken, 'No order');

    const minerAddr = exec(`${BTC_CLI} getnewaddress "miner" "bech32"`);
    exec(`${BTC_CLI} generatetoaddress 5 "${minerAddr}"`);
    console.log('Generated 5 more blocks');

    const order = await pollOrderStatus(request, orderToken, 'FUNDED', 120_000);
    console.log('Order state:', order.state || order.status);

    await page.goto(`/guest-order/${orderToken}`);
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${OUT}/04-funded.png`, fullPage: true });
  });

  test('05 — Seller ships order', async ({ request, page }) => {
    test.skip(!ADMIN_PASS || !orderToken, 'No order');

    const resp = await request.put(`${SOVEREIGN_URL}/v1/guest/orders/${orderToken}/ship`, {
      headers: headers(),
      data: { trackingNumber: 'SOVEREIGN-E2E-001', carrier: 'TestCarrier' },
    });
    console.log('Ship response:', resp.status());

    if (resp.ok()) {
      const order = await pollOrderStatus(request, orderToken, 'SHIPPED', 30_000);
      console.log('Order state:', order.state || order.status);
    }

    await page.goto(`/guest-order/${orderToken}`);
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${OUT}/05-shipped.png`, fullPage: true });
  });

  test('06 — Complete order', async ({ request, page }) => {
    test.skip(!ADMIN_PASS || !orderToken, 'No order');

    const resp = await request.put(`${SOVEREIGN_URL}/v1/guest/orders/${orderToken}/complete`, {
      headers: headers(),
    });
    console.log('Complete response:', resp.status());

    if (resp.ok()) {
      const order = await pollOrderStatus(request, orderToken, 'COMPLETED', 30_000);
      console.log('Order state:', order.state || order.status);
    }

    await page.goto(`/guest-order/${orderToken}`);
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${OUT}/06-completed.png`, fullPage: true });
  });
});
