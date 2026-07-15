/**
 * Onramp funding demo — records the buyer's payment page while the onramp
 * funding leg runs against the LIVE local E2E stack (no mocked APIs).
 *
 * Unlike demo-buyer-journey.spec.ts this mocks nothing: a real Casdoor JWT, a
 * real order, a real frozen Safe funding target, and a real on-chain delivery.
 * The order only completes because the node's own monitor observes the ETH —
 * the mock onramp provider never funds anything.
 *
 * Prereqs (see tests/e2e/docker/scripts/onramp-demo-order.sh):
 *   - stack up in LOCAL CHAIN mode (make up / up-fast, USE_SEPOLIA unset)
 *   - hosting run with MOBAZHA_DEV_MOCK_ONRAMP_RAILS + _AUTOADVANCE
 *   - web dev server on :3000 pointed at localhost:18080
 *
 * Run:
 *   eval "$(bash tests/e2e/docker/scripts/onramp-demo-order.sh)"
 *   PLAYWRIGHT_BROWSERS_PATH="$HOME/Library/Caches/ms-playwright" \
 *     npx playwright test onramp-funding-demo --project=chromium
 */

import { test, expect, type Page } from '@playwright/test';
import { execFileSync } from 'child_process';
import * as path from 'path';

const ORDER_ID = process.env.ORDER_ID || '';
const TARGET_ADDR = process.env.TARGET_ADDR || '';
const TARGET_AMOUNT = process.env.TARGET_AMOUNT || '';
const BUYER_TOKEN = process.env.BUYER_TOKEN || '';
const DELIVER_SCRIPT =
  process.env.DELIVER_SCRIPT ||
  path.join(
    process.env.HOME || '',
    'dev/mobazha/tests/e2e/docker/scripts/pay-onramp-demo.sh',
  );

// Record every run, not just failures — the video is the deliverable here.
test.use({ video: 'on', viewport: { width: 1280, height: 900 } });

/** Read the payment session straight from the node, for timing decisions the
 *  rendered card is too coarse to drive. */
async function readSession(page: Page): Promise<any> {
  const res = await page.request.get(
    `http://localhost:18080/v1/orders/${ORDER_ID}/payment-session`,
    { headers: { Authorization: `Bearer ${BUYER_TOKEN}` } },
  );
  return (await res.json())?.data ?? {};
}

/** Inject the real buyer JWT the way userStore persists it. A token without the
 *  "basic:" prefix is treated as a buyer JWT and sent as `Bearer`. */
async function injectBuyerAuth(page: Page, token: string): Promise<void> {
  const state = JSON.stringify({
    state: {
      profile: { peerID: '', name: 'Bob', handle: '' },
      isAuthenticated: true,
      authMode: 'oauth',
      token,
      authSource: 'oauth',
    },
    version: 0,
  });
  const items = {
    mobazha_auth_token: token,
    mobazha_auth_user: JSON.stringify({ id: 'testuser2', name: 'Bob', role: 'buyer' }),
    'mobazha-user-storage': state,
  };
  await page.addInitScript(`
    const items = ${JSON.stringify(items)};
    for (const [k, v] of Object.entries(items)) localStorage.setItem(k, v);
  `);
}

test('buyer funds an order through the onramp leg', async ({ page }) => {
  test.skip(!ORDER_ID, 'ORDER_ID not set — run onramp-demo-order.sh first');
  test.setTimeout(360_000);

  await injectBuyerAuth(page, BUYER_TOKEN);

  // 1. The buyer lands on the payment page for a real order with a frozen target.
  await page.goto(`/payment?orderID=${ORDER_ID}`, {
    waitUntil: 'domcontentloaded',
    timeout: 120_000,
  });
  await expect(page.getByText(/Total to Pay|Order Summary/i).first()).toBeVisible({
    timeout: 60_000,
  });

  // 2. The onramp affordance appears only because the session is awaiting_funds
  //    against a frozen address — the button is fail-closed on exactly that.
  const fundButton = page.getByRole('button', { name: /buy crypto with card/i }).first();
  await expect(fundButton).toBeVisible({ timeout: 30_000 });
  await fundButton.click();

  // 3. The funding card appears and the provider starts working.
  await expect(page.getByText(/Buying crypto for this payment/i).first()).toBeVisible({
    timeout: 30_000,
  });

  // 4. Wait for the purchase to finish its fiat leg, then the onramp actually
  //    sends the crypto on chain. Nothing inside the node moves this money.
  //    Gate on the provider's own state rather than the rendered label: the card
  //    polls on its own interval and can skip straight past a short-lived state,
  //    which would make the demo miss its delivery window.
  //
  //    A settled purchase reads as *absent*, not as "delivered": the session
  //    projection runs SelectOnrampFundingSource, which only surfaces a source
  //    that still wants the buyer's attention — in flight, or delivered and
  //    awaiting a wallet forward. Delivered straight to the escrow target is
  //    neither, so onrampFunding drops to null. Treat that as terminal;
  //    requiring the literal string would wait out the timeout on success.
  await expect
    .poll(
      async () => {
        const session = await readSession(page);
        return session.onrampFunding ? session.onrampFunding.status : 'settled';
      },
      { timeout: 120_000, intervals: [2000] },
    )
    .toMatch(/delivering|delivered|settled/);
  try {
    const out = execFileSync('bash', [DELIVER_SCRIPT, TARGET_ADDR, TARGET_AMOUNT], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    console.log(out);
  } catch (e: any) {
    throw new Error(
      `onramp delivery failed (exit ${e?.status}):\nstdout: ${e?.stdout}\nstderr: ${e?.stderr}`,
    );
  }

  // 5. Payment completes ONLY from the node's on-chain observation.
  await expect
    .poll(async () => (await readSession(page)).status, { timeout: 120_000, intervals: [2000] })
    .toMatch(/verified|fully_funded|funded/);

  // 6. The page must notice on its own: while the onramp leg is live it polls
  //    the order status and flips to its success step once the session
  //    verifies. No reload — a real buyer never presses F5. This is the
  //    regression check for the success-detection gate that used to require
  //    externalWalletInfo (never set on the onramp path), which left the page
  //    showing the payment countdown after the money had landed.
  await expect(
    page.getByRole('heading', { name: /Order Placed Successfully/i }),
  ).toBeVisible({ timeout: 90_000 });
  await page.waitForTimeout(4000); // let the success step paint for the recording
});
