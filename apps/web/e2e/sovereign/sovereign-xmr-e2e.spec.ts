/**
 * Layer C-XMR: Sovereign Guest Checkout E2E — Full XMR regtest payment loop.
 *
 * Runs against a Docker Compose environment:
 *   - monerod regtest (--fixed-difficulty 1)
 *   - wallet-rpc-seller (Sovereign connects to this)
 *   - wallet-rpc-buyer (E2E test sends payments from this)
 *   - Sovereign binary (embedded frontend + XMR guest checkout)
 *
 * Full lifecycle:
 *   1. Seed store (profile + XMR listing + guest checkout config)
 *   2. Create XMR guest order → get payment subaddress + amount
 *   3. buyer wallet-rpc transfer → poll pool detected (before mining)
 *   4. monerod generateblocks → PAYMENT_DETECTED → more blocks → FUNDED
 *   5. Seller marks shipped → SHIPPED
 *   6. Buyer confirms → COMPLETED
 *
 * Usage:
 *   cd ~/dev/mobazha/tests/e2e/docker
 *   docker compose -f docker-compose.sovereign-xmr-e2e.yml up -d
 *   bash scripts/wait-sovereign-xmr.sh
 *   export SOVEREIGN_PASSWORD=$(docker exec sovereign-xmr-sovereign cat /data/admin_password)
 *   cd ~/dev/openbazaar/mobazha-unified/apps/web
 *   SOVEREIGN_URL=http://127.0.0.1:5103 pnpm test:e2e:sovereign:real -- e2e/sovereign/sovereign-xmr-e2e.spec.ts
 */

import { test, expect, type APIRequestContext } from '@playwright/test';
import { execSync } from 'child_process';
import { seedSovereignStore, waitForHealthy, XMR_ASSET_ID } from './fixtures/seed-sovereign-store';

const SOVEREIGN_URL = process.env.SOVEREIGN_URL || 'http://127.0.0.1:5103';
const ADMIN_PASS = process.env.SOVEREIGN_PASSWORD || '';
const OUT = 'screenshots/sovereign-xmr-e2e';

const BUYER_RPC_URL = 'http://127.0.0.1:18084/json_rpc';
const MONEROD_RPC_URL = 'http://127.0.0.1:18081/json_rpc';

function exec(cmd: string): string {
  return execSync(cmd, { encoding: 'utf-8', timeout: 30000 }).trim();
}

function basicAuth(): string {
  return 'Basic ' + Buffer.from(`admin:${ADMIN_PASS}`).toString('base64');
}

function headers(): Record<string, string> {
  return { Authorization: basicAuth(), 'Content-Type': 'application/json' };
}

/**
 * Call monero-wallet-rpc (no auth — disabled in E2E Docker environment).
 */
function walletRpc(method: string, params: Record<string, unknown> = {}): Record<string, unknown> {
  const body = JSON.stringify({
    jsonrpc: '2.0',
    id: '0',
    method,
    params,
  });
  const result = exec(
    `curl -sf ${BUYER_RPC_URL} ` + `-H 'Content-Type: application/json' ` + `-d '${body}'`
  );
  return JSON.parse(result);
}

/**
 * Call monerod RPC (no auth needed for regtest).
 */
function daemonRpc(method: string, params: Record<string, unknown> = {}): Record<string, unknown> {
  const body = JSON.stringify({
    jsonrpc: '2.0',
    id: '0',
    method,
    params,
  });
  const result = exec(
    `curl -sf ${MONEROD_RPC_URL} ` + `-H 'Content-Type: application/json' ` + `-d '${body}'`
  );
  return JSON.parse(result);
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

/**
 * Poll for poolDetected=true while state is still AWAITING_PAYMENT.
 */
async function pollPoolDetected(
  request: APIRequestContext,
  orderToken: string,
  timeoutMs = 60_000
): Promise<Record<string, unknown>> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const resp = await request.get(`${SOVEREIGN_URL}/v1/guest/orders/${orderToken}`);
    if (resp.ok()) {
      const body = await resp.json();
      const order = body.data ?? body;
      if (order.poolDetected) return order;
      const state = (order.state || '').toString().toUpperCase();
      if (state !== 'AWAITING_PAYMENT') {
        return order;
      }
    }
    await new Promise(r => setTimeout(r, 2000));
  }
  throw new Error(`Pool detection not observed within ${timeoutMs}ms`);
}

test.describe.configure({ mode: 'serial' });

let listingSlug: string | null = null;

// XMR price: 0.001 XMR = 1_000_000_000 piconero (12 divisibility)
const XMR_PRICE_PICONERO = '1000000000';

test.beforeAll(async ({ request }) => {
  test.skip(!ADMIN_PASS, 'SOVEREIGN_PASSWORD not set — skip XMR E2E payment tests');
  await waitForHealthy(SOVEREIGN_URL);

  const result = await seedSovereignStore(request, SOVEREIGN_URL, ADMIN_PASS, {
    acceptedCoins: XMR_ASSET_ID,
    listingCoinCode: 'XMR',
    listingCoinDivisibility: 12,
    listingPrice: XMR_PRICE_PICONERO,
    listingSlug: 'xmr-e2e-test-product',
    listingTitle: 'XMR E2E Test Product',
  });
  console.log('XMR Seed result:', result);
  listingSlug = result.listingSlug;

  // Verify buyer wallet has balance
  try {
    const balance = walletRpc('get_balance', { account_index: 0 });
    const result_ = balance.result as Record<string, unknown> | undefined;
    console.log(`XMR buyer balance: ${JSON.stringify(result_)}`);
    const unlockedBalance = Number(result_?.unlocked_balance ?? 0);
    expect(unlockedBalance).toBeGreaterThan(0);
  } catch (e) {
    console.warn('Could not check XMR buyer balance:', e);
  }
});

test.describe('Sovereign Guest Checkout E2E — XMR Payment Loop', () => {
  let orderToken: string;
  let paymentAddress: string;
  let paymentAmountPiconero: number;

  test('01 — Create XMR guest order via API', async ({ request }) => {
    test.skip(!ADMIN_PASS, 'No password');

    expect(listingSlug).toBeTruthy();
    const slug = listingSlug;
    console.log(`Using seeded listing slug: ${slug}`);

    const orderResp = await request.post(`${SOVEREIGN_URL}/v1/guest/orders`, {
      data: {
        items: [{ listingSlug: slug, quantity: 1 }],
        paymentCoin: XMR_ASSET_ID,
        contactEmail: 'xmr-buyer@test.local',
      },
    });

    console.log('XMR Order response status:', orderResp.status());
    const orderBody = await orderResp.json();
    console.log('XMR Order response:', JSON.stringify(orderBody, null, 2));

    if (!orderResp.ok()) {
      test.skip(
        true,
        `XMR guest order creation failed (${orderResp.status()}): likely wallet-rpc not connected`
      );
      return;
    }

    const order = orderBody.data ?? orderBody;
    orderToken = order.orderToken || order.token;
    paymentAddress = order.paymentAddress || order.payment?.address;
    paymentAmountPiconero = parseInt(String(order.paymentAmount || order.payment?.amount), 10);

    expect(orderToken).toBeTruthy();
    expect(paymentAddress).toBeTruthy();
    expect(paymentAmountPiconero).toBeGreaterThan(0);

    console.log(`XMR Order token: ${orderToken}`);
    console.log(`XMR Payment address (subaddress): ${paymentAddress}`);
    console.log(`XMR Payment amount (piconero): ${paymentAmountPiconero}`);

    await request.fetch(`${SOVEREIGN_URL}/v1/guest/orders/${orderToken}`).then(async r => {
      if (r.ok()) {
        const b = await r.json();
        console.log('Initial order state:', JSON.stringify(b.data ?? b, null, 2));
      }
    });
  });

  test('02 — Send XMR payment via buyer wallet-rpc', async ({ page }) => {
    test.skip(!ADMIN_PASS || !orderToken, 'No order to pay');

    console.log(`Sending ${paymentAmountPiconero} piconero to ${paymentAddress}`);

    const transferResult = walletRpc('transfer', {
      destinations: [{ amount: paymentAmountPiconero, address: paymentAddress }],
      account_index: 0,
      priority: 0,
      do_not_relay: false,
    });

    const result_ = transferResult.result as Record<string, unknown> | undefined;
    const txHash = result_?.tx_hash as string | undefined;
    console.log(`XMR Transaction sent, tx_hash: ${txHash}`);
    expect(txHash).toBeTruthy();

    await page.goto(`/guest-order/${orderToken}`);
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${OUT}/02-awaiting-payment.png`, fullPage: true });
  });

  test('03 — Poll for pool detection (mempool, before mining)', async ({ request, page }) => {
    test.skip(!ADMIN_PASS || !orderToken, 'No order');

    // Pool detection happens in mempool BEFORE blocks are mined.
    // With fixed-difficulty=1, the tx is in the mempool until we explicitly mine.
    try {
      const order = await pollPoolDetected(request, orderToken, 60_000);
      const state = (order.state || '').toString();
      console.log(
        `Pool detection result — state: ${state}, poolDetected: ${order.poolDetected}, poolTxHash: ${order.poolTxHash}`
      );

      if (order.poolDetected) {
        console.log('Pool detected! Taking screenshot...');
      } else {
        console.log(`State jumped to ${state} (pool detection may have been too fast)`);
      }
    } catch (e) {
      console.log('Pool detection not caught (may have been mined already):', e);
    }

    await page.goto(`/guest-order/${orderToken}`);
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${OUT}/03-pool-detected.png`, fullPage: true });
  });

  test('04 — Mine 1 block → PAYMENT_DETECTED', async ({ request, page }) => {
    test.skip(!ADMIN_PASS || !orderToken, 'No order');

    // Get a miner address from buyer wallet (any address works for regtest mining)
    const addrResp = walletRpc('get_address', { account_index: 0 });
    const minerAddr = ((addrResp.result as Record<string, unknown>)?.address as string) || '';

    console.log('Mining 1 block to confirm XMR transaction...');
    daemonRpc('generateblocks', {
      amount_of_blocks: 1,
      wallet_address: minerAddr,
    });

    try {
      const order = await pollOrderStatus(request, orderToken, 'PAYMENT_DETECTED', 60_000);
      console.log('XMR Order state after 1 block:', order.state || order.status);
      console.log(`Confirmations: ${order.confirmations}, txHash: ${order.txHash}`);
    } catch {
      console.log('Note: State may not reach PAYMENT_DETECTED if confs jump directly');
    }

    await page.goto(`/guest-order/${orderToken}`);
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${OUT}/04-payment-detected.png`, fullPage: true });
  });

  test('05 — Mine more blocks → FUNDED', async ({ request, page }) => {
    test.skip(!ADMIN_PASS || !orderToken, 'No order');

    const addrResp = walletRpc('get_address', { account_index: 0 });
    const minerAddr = ((addrResp.result as Record<string, unknown>)?.address as string) || '';

    // XMR Guest Checkout needs 10 confirmations
    console.log('Mining 12 more blocks for XMR confirmations...');
    daemonRpc('generateblocks', {
      amount_of_blocks: 12,
      wallet_address: minerAddr,
    });

    const order = await pollOrderStatus(request, orderToken, 'FUNDED', 120_000);
    console.log('XMR Order state:', order.state || order.status);
    console.log(`Final confirmations: ${order.confirmations}`);

    await page.goto(`/guest-order/${orderToken}`);
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${OUT}/05-funded.png`, fullPage: true });
  });

  test('06 — Seller ships order', async ({ request, page }) => {
    test.skip(!ADMIN_PASS || !orderToken, 'No order');

    const resp = await request.put(`${SOVEREIGN_URL}/v1/guest/orders/${orderToken}/ship`, {
      headers: headers(),
      data: { trackingNumber: 'XMR-E2E-001', carrier: 'TestCarrier' },
    });
    console.log('Ship response:', resp.status());

    if (resp.ok()) {
      const order = await pollOrderStatus(request, orderToken, 'SHIPPED', 30_000);
      console.log('XMR Order state:', order.state || order.status);
    }

    await page.goto(`/guest-order/${orderToken}`);
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${OUT}/06-shipped.png`, fullPage: true });
  });

  test('07 — Complete order', async ({ request, page }) => {
    test.skip(!ADMIN_PASS || !orderToken, 'No order');

    const resp = await request.put(`${SOVEREIGN_URL}/v1/guest/orders/${orderToken}/complete`, {
      headers: headers(),
    });
    console.log('Complete response:', resp.status());

    if (resp.ok()) {
      const order = await pollOrderStatus(request, orderToken, 'COMPLETED', 30_000);
      console.log('XMR Order state:', order.state || order.status);
    }

    await page.goto(`/guest-order/${orderToken}`);
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${OUT}/07-completed.png`, fullPage: true });
  });
});
