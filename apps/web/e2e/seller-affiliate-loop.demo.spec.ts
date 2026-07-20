// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

/**
 * Demo 0003 — Seller Affiliate Loop.
 *
 * Shot list & copy: mobazha_hosting docs/demos/0003-seller-affiliate-loop/demo.md
 * Style authority:  mobazha_hosting docs/demos/STYLE.md
 *
 * Records five segments (per-page videos) to be concatenated in order:
 *   seg1 seller    ch1  set 5% once
 *   seg2 promoter  ch2  see the return → use one short link
 *   seg3 buyer     ch3  follow link → normal checkout → real Anvil payment
 *   seg4 seller    ch4  accept the paid order → automatic affiliate split
 *   seg5 promoter  ch5  the SAME order's Paid row + transaction hash
 *
 * Logins happen OFF CAMERA on a throwaway warm page; identifiers come from
 * tests/e2e/demos/0003-seller-affiliate-loop/seed.py via DEMO_* env vars.
 */

import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import {
  DEMO_INTERFACE_SCALE,
  installDemoInterfaceScale,
  setDemoInterfaceScale,
} from './demo-recording-scale';

declare global {
  interface Window {
    __demoOverlayInstalled?: boolean;
    __demoChipState?: {
      persona: string;
      accent: string;
      title: string;
      support: string;
      on: boolean;
    };
    __demoCardState?: { big: string; small: string; on: boolean };
    __demoPrecoverStop?: () => void;
  }
}

const SELLER_PEER = process.env.DEMO_SELLER_PEER_ID || '';
const PROGRAM_ID = process.env.DEMO_PROGRAM_ID || '';
const PROMO_TOKEN = process.env.DEMO_PROMO_TOKEN || '';
const SHORT_PATH = process.env.DEMO_SHORT_PATH || '';
const HERO_TITLE = process.env.DEMO_PRODUCT_TITLE || 'Titan Leather Hardware Wallet Case';
const OUT_DIR = path.join(__dirname, '..', 'demo-output', 'affiliate-loop');
const ANVIL = 'http://localhost:18545';
const TIMINGS_PATH = path.join(OUT_DIR, 'timings.json');

const trimSeconds: Record<string, number> = {};

const PERSONA = {
  seller: { label: 'Seller · Alice', accent: '#d97706' },
  promoter: { label: 'Promoter · Kai', accent: '#7c3aed' },
  buyer: { label: 'Buyer', accent: '#059669' },
} as const;

// ─── Self-healing overlay (same harness as demo 0001) ────────────────

const OVERLAY_INIT = `
(() => {
  if (window.__demoOverlayInstalled) return;
  window.__demoOverlayInstalled = true;
  const CSS = \`
    #demo-chip{position:fixed;left:32px;bottom:32px;z-index:2147483647;pointer-events:none;max-width:520px;background:rgba(15,23,42,.95);color:#fff;padding:14px 20px;border-radius:14px;border-left:5px solid var(--demo-accent,#7c3aed);font-family:system-ui,-apple-system,sans-serif;box-shadow:0 10px 34px rgba(0,0,0,.45);opacity:0;transition:opacity .3s ease}
    #demo-chip.on{opacity:1}
    #demo-chip .persona{font:600 12px/1 system-ui;letter-spacing:.06em;text-transform:uppercase;color:var(--demo-accent,#7c3aed);margin-bottom:6px}
    #demo-chip .title{font:700 20px/1.25 system-ui;margin-bottom:4px}
    #demo-chip .support{font:400 14px/1.45 system-ui;color:#cbd5e1}
    #demo-card{position:fixed;inset:0;z-index:2147483646;pointer-events:none;background:#0f172a;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;font-family:system-ui,-apple-system,sans-serif;opacity:0;transition:opacity .35s ease;padding:0 12vw}
    #demo-card.on{opacity:1}
    #demo-card .big{font:700 48px/1.3 system-ui;white-space:pre-line}
    #demo-card .small{font:400 20px/1.5 system-ui;color:#94a3b8;margin-top:18px}
  \`;
  function ensure() {
    const root = document.documentElement;
    if (!document.getElementById('demo-overlay-style')) {
      const s = document.createElement('style');
      s.id = 'demo-overlay-style'; s.textContent = CSS; root.appendChild(s);
    }
    if (!document.getElementById('demo-card')) {
      const card = document.createElement('div');
      card.id = 'demo-card'; card.innerHTML = '<div class="big"></div><div class="small"></div>';
      if (window.__demoCardState) { card.querySelector('.big').textContent = window.__demoCardState.big; card.querySelector('.small').textContent = window.__demoCardState.small; if (window.__demoCardState.on) card.classList.add('on'); }
      root.appendChild(card);
    }
    if (!document.getElementById('demo-chip')) {
      const chip = document.createElement('div');
      chip.id = 'demo-chip'; chip.innerHTML = '<div class="persona"></div><div class="title"></div><div class="support"></div>';
      if (window.__demoChipState) { const c = window.__demoChipState; chip.style.setProperty('--demo-accent', c.accent); chip.querySelector('.persona').textContent = c.persona; chip.querySelector('.title').textContent = c.title; chip.querySelector('.support').textContent = c.support; if (c.on) chip.classList.add('on'); }
      root.appendChild(chip);
    }
  }
  const boot = () => { ensure(); new MutationObserver(ensure).observe(document.documentElement, { childList: true, subtree: false }); };
  if (document.documentElement) boot(); else document.addEventListener('DOMContentLoaded', boot);
})();
`;

// Opaque dark floor under the hook card, present from the first frame of the
// recorded page, so the film never flashes the raw UI while it loads.
// Removed by fullCard once the hook card has faded in above it.
const PRECOVER_INIT = `
(() => {
  const put = () => {
    if (!document.documentElement || document.getElementById('demo-precover')) return;
    const d = document.createElement('div');
    d.id = 'demo-precover';
    const transition = window.sessionStorage.getItem('__mobazhaDemoTransition');
    d.style.cssText = 'position:fixed;inset:0;z-index:2147483645;background:#0f172a;color:#fff;pointer-events:none;transition:opacity .3s ease;display:flex;align-items:center;justify-content:center;text-align:center;font-family:system-ui,-apple-system,sans-serif';
    if (transition) {
      try {
        const copy = JSON.parse(transition);
        d.innerHTML = '<div style="max-width:900px;padding:0 80px"><div data-transition-title style="font-size:38px;font-weight:700;line-height:1.25"></div><div data-transition-copy style="font-size:18px;line-height:1.5;color:#94a3b8;margin-top:14px"></div></div>';
        d.querySelector('[data-transition-title]').textContent = copy.big;
        d.querySelector('[data-transition-copy]').textContent = copy.small;
      } catch {}
    }
    document.documentElement.appendChild(d);
  };
  put();
  const obs = new MutationObserver(put);
  obs.observe(document, { childList: true, subtree: true });
  window.__demoPrecoverStop = () => {
    obs.disconnect();
    const d = document.getElementById('demo-precover');
    if (d) { d.style.opacity = '0'; setTimeout(() => d.remove(), 400); }
  };
})();
`;

async function makeContext(
  browser: import('@playwright/test').Browser,
  interfaceScale: number = DEMO_INTERFACE_SCALE.public
): Promise<BrowserContext> {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: { dir: OUT_DIR, size: { width: 1920, height: 1080 } },
  });
  await context.addInitScript(OVERLAY_INIT);
  await installDemoInterfaceScale(context, interfaceScale);
  return context;
}

// Off-camera Casdoor login on a throwaway page; the context keeps the session.
async function loginContext(
  browser: import('@playwright/test').Browser,
  username: string,
  warmPath?: string,
  interfaceScale: number = DEMO_INTERFACE_SCALE.workflow
): Promise<BrowserContext> {
  const context = await makeContext(browser, interfaceScale);
  const warm = await context.newPage();
  // Deterministic OAuth entry — /login always bounces to the Casdoor form.
  await warm.goto('/login');
  await warm.waitForURL(url => url.toString().includes('login/oauth/authorize'), {
    timeout: 30000,
  });
  await warm.waitForLoadState('domcontentloaded');
  const userInput = warm.locator('input[type="text"]').first();
  await userInput.waitFor({ state: 'visible', timeout: 30000 });
  await userInput.fill(username);
  await warm.locator('input[type="password"]').first().fill('123');
  await warm.getByRole('button', { name: /sign in|log in|登录/i }).click();
  await warm.waitForURL(
    url => {
      const s = url.toString();
      return (
        s.includes('localhost:') &&
        !s.includes('login/oauth') &&
        !s.includes('code=') &&
        !s.includes('/login')
      );
    },
    { timeout: 60000 }
  );
  await warm.waitForLoadState('domcontentloaded');
  await warm.waitForTimeout(3000); // let restoreSession finish off camera
  if (warmPath) {
    // Pre-compile the first on-camera route so the recorded page opens on
    // content, not on a cold-transform spinner.
    await warm.goto(warmPath);
    await warm.waitForLoadState('domcontentloaded');
    await warm.waitForTimeout(2500);
  }
  await warm.close();
  return context;
}

async function chapter(
  page: Page,
  n: number,
  persona: keyof typeof PERSONA,
  title: string,
  support: string
) {
  await page.evaluate(
    args => {
      window.__demoChipState = {
        persona: args.personaLabel,
        accent: args.accent,
        title: `${args.n} · ${args.title}`,
        support: args.support,
        on: true,
      };
      window.sessionStorage.setItem('__mobazhaDemoChip', JSON.stringify(window.__demoChipState));
      const chip = document.getElementById('demo-chip');
      if (chip) {
        chip.style.setProperty('--demo-accent', args.accent);
        chip.querySelector('.persona')!.textContent = args.personaLabel;
        chip.querySelector('.title')!.textContent = `${args.n} · ${args.title}`;
        chip.querySelector('.support')!.textContent = args.support;
        chip.classList.add('on');
      }
    },
    { n, personaLabel: PERSONA[persona].label, accent: PERSONA[persona].accent, title, support }
  );
  await page.waitForTimeout(1900);
}

async function prepareSegment(
  page: Page,
  n: number,
  persona: keyof typeof PERSONA,
  title: string,
  support: string
) {
  const state = {
    persona: PERSONA[persona].label,
    accent: PERSONA[persona].accent,
    title: `${n} · ${title}`,
    support,
    on: true,
  };
  await page.addInitScript(PRECOVER_INIT);
  await page.addInitScript(scene => {
    window.__demoChipState = scene;
    window.sessionStorage.setItem('__mobazhaDemoChip', JSON.stringify(scene));
    const paint = () => {
      const chip = document.getElementById('demo-chip');
      if (!chip) return;
      chip.style.setProperty('--demo-accent', scene.accent);
      chip.querySelector('.persona')!.textContent = scene.persona;
      chip.querySelector('.title')!.textContent = scene.title;
      chip.querySelector('.support')!.textContent = scene.support;
      chip.classList.add('on');
    };
    paint();
    document.addEventListener('DOMContentLoaded', paint, { once: true });
  }, state);
}

function markReadyForEdit(segment: string, startedAt: number, leadSeconds = 0.8) {
  trimSeconds[segment] = Math.max(0.5, (Date.now() - startedAt) / 1000 - leadSeconds);
  fs.writeFileSync(TIMINGS_PATH, `${JSON.stringify(trimSeconds, null, 2)}\n`);
}

async function fullCard(page: Page, big: string, small: string, holdMs: number) {
  await page.evaluate(
    args => {
      window.__demoCardState = { big: args.big, small: args.small, on: true };
      const card = document.getElementById('demo-card');
      if (card) {
        card.querySelector('.big')!.textContent = args.big;
        card.querySelector('.small')!.textContent = args.small;
        card.classList.add('on');
      }
    },
    { big, small }
  );
  await page.waitForTimeout(450);
  await page.evaluate(() => {
    if (window.__demoPrecoverStop) window.__demoPrecoverStop();
    else document.getElementById('demo-precover')?.remove();
  });
  await page.waitForTimeout(Math.max(0, holdMs - 450));
  await page.evaluate(() => {
    if (window.__demoCardState) window.__demoCardState.on = false;
    document.getElementById('demo-card')?.classList.remove('on');
  });
  await page.waitForTimeout(450);
}

// End card: fades in and HOLDS — the film ends on it (no fade-out, no
// return to the UI, no black tail).
async function endCard(page: Page, big: string, small: string, holdMs: number) {
  await page.evaluate(
    args => {
      window.__demoCardState = { big: args.big, small: args.small, on: true };
      const card = document.getElementById('demo-card');
      if (card) {
        card.querySelector('.big')!.textContent = args.big;
        card.querySelector('.small')!.textContent = args.small;
        card.classList.add('on');
      }
    },
    { big, small }
  );
  await page.waitForTimeout(holdMs);
}

// Dark-floor helpers: loading states never go on camera. armCover() raises
// the floor before an on-camera navigation; reveal() fades it away once the
// destination content is ready. Segment openings get the floor from
// PRECOVER_INIT at document-start.
async function armCover(page: Page, big: string, small: string) {
  await page.evaluate(
    ({ big, small }) => {
      window.sessionStorage.setItem('__mobazhaDemoTransition', JSON.stringify({ big, small }));
      let d = document.getElementById('demo-precover') as HTMLElement | null;
      if (!d) {
        d = document.createElement('div');
        d.id = 'demo-precover';
        d.style.cssText =
          'position:fixed;inset:0;z-index:2147483645;background:#0f172a;color:#fff;pointer-events:none;opacity:0;transition:opacity .3s ease;display:flex;align-items:center;justify-content:center;text-align:center;font-family:system-ui,-apple-system,sans-serif';
        document.documentElement.appendChild(d);
      }
      d.innerHTML =
        '<div style="max-width:900px;padding:0 80px"><div data-transition-title style="font-size:38px;font-weight:700;line-height:1.25"></div><div data-transition-copy style="font-size:18px;line-height:1.5;color:#94a3b8;margin-top:14px"></div></div>';
      d.querySelector('[data-transition-title]')!.textContent = big;
      d.querySelector('[data-transition-copy]')!.textContent = small;
      requestAnimationFrame(() => {
        d!.style.opacity = '1';
      });
    },
    { big, small }
  );
  await page.waitForTimeout(400);
}

async function reveal(page: Page) {
  await page.evaluate(() => {
    window.sessionStorage.removeItem('__mobazhaDemoTransition');
    if (window.__demoPrecoverStop) {
      window.__demoPrecoverStop();
      window.__demoPrecoverStop = undefined;
    } else {
      const d = document.getElementById('demo-precover') as HTMLElement | null;
      if (d) {
        d.style.opacity = '0';
        setTimeout(() => d.remove(), 400);
      }
    }
  });
  await page.waitForTimeout(500);
}

// The p2p store-connect dialog can pop moments AFTER navigation settles;
// poll twice so it cannot photobomb the reveal.
async function settleNoConnecting(page: Page) {
  for (let i = 0; i < 2; i += 1) {
    await page
      .waitForFunction(() => !document.body.innerText.includes('Connecting'), undefined, {
        timeout: 25000,
      })
      .catch(() => {});
    await page.waitForTimeout(500);
  }
}

function asRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} is not an object`);
  }
  return value as Record<string, unknown>;
}

function decimalToSmallestUnit(amount: string, decimals: number): string {
  const parts = amount.trim().split('.');
  if (parts.length > 2 || !/^\d+$/.test(parts[0] || '') || !/^\d*$/.test(parts[1] || '')) {
    throw new Error(`invalid decimal amount: ${amount}`);
  }
  const whole = BigInt(parts[0]);
  const fraction = (parts[1] || '').padEnd(decimals, '0').slice(0, decimals);
  return (whole * BigInt(10) ** BigInt(decimals) + BigInt(fraction || '0')).toString();
}

async function anvilRPC<T>(method: string, params: unknown[]): Promise<T> {
  const response = await fetch(ANVIL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  if (!response.ok) throw new Error(`Anvil ${method}: HTTP ${response.status}`);
  const payload = asRecord((await response.json()) as unknown, `Anvil ${method} response`);
  if (payload.error) throw new Error(`Anvil ${method}: ${JSON.stringify(payload.error)}`);
  return payload.result as T;
}

async function fundAddressOnAnvil(address: string, decimalAmount: string): Promise<string> {
  const accounts = await anvilRPC<string[]>('eth_accounts', []);
  const payer = accounts[1] || accounts[0];
  if (!payer) throw new Error('Anvil returned no funded account');
  const value = `0x${BigInt(decimalToSmallestUnit(decimalAmount, 18)).toString(16)}`;
  const txHash = await anvilRPC<string>('eth_sendTransaction', [
    { from: payer, to: address, value },
  ]);
  await expect
    .poll(() => anvilRPC<unknown>('eth_getTransactionReceipt', [txHash]), {
      timeout: 30000,
      intervals: [500, 1000, 1500],
    })
    .not.toBeNull();
  return txHash;
}

async function dwell(page: Page, ms = 1300) {
  await page.waitForTimeout(ms);
}

async function focusOn(page: Page, locator: import('@playwright/test').Locator, ms = 1300) {
  await locator.scrollIntoViewIfNeeded();
  await expect(locator).toBeVisible({ timeout: 30000 });
  await dwell(page, ms);
}

async function saveSegment(page: Page, name: string) {
  const video = page.video();
  await page.close();
  if (video) {
    await video.saveAs(path.join(OUT_DIR, name));
    await video.delete();
  }
}

// ─── The demo ───────────────────────────────────────────────────────

test('Demo 0003: seller affiliate loop', async ({ browser }) => {
  test.setTimeout(600000);
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(TIMINGS_PATH, '{}\n');
  expect(SELLER_PEER, 'DEMO_SELLER_PEER_ID required (run seed.py)').toBeTruthy();
  expect(PROGRAM_ID, 'DEMO_PROGRAM_ID required').toBeTruthy();
  expect(PROMO_TOKEN, 'DEMO_PROMO_TOKEN required').toBeTruthy();

  // ── Segment 1 · Seller: set the offer once ──
  const sellerCtx = await loginContext(browser, 'testuser1', '/admin/affiliate');
  const seller = await sellerCtx.newPage();
  const sellerStartedAt = Date.now();
  await seller.addInitScript(PRECOVER_INIT);
  await seller.goto('/admin/affiliate');
  const programPanel = seller.getByTestId('seller-affiliate-program-panel');
  await expect(programPanel).toBeVisible({ timeout: 45000 });
  await expect(seller.getByTestId('affiliate-config-summary')).toBeVisible({ timeout: 30000 });

  // The edit trims cold-start time to a short dark lead, then the hook opens
  // over the ready product. No loading interval survives into the master.
  markReadyForEdit('seg1-seller-terms', sellerStartedAt, 0.45);
  await fullCard(
    seller,
    'Your followers buy the gear you review.\nThe brand keeps everything.',
    'Meet seller affiliate links — commissions paid on-chain.',
    3400
  );

  await chapter(
    seller,
    1,
    'seller',
    'Set 5% once',
    'Every attributed order uses the same storefront-wide offer.'
  );
  const configToggle = seller.getByTestId('affiliate-config-toggle');
  if (await configToggle.isVisible().catch(() => false)) {
    await configToggle.click();
  }
  await focusOn(seller, seller.getByTestId('affiliate-commission-column'), 2300);
  await saveSegment(seller, 'seg1-seller-terms.webm');

  // ── Segment 2 · Promoter: concrete return → one reusable link ──
  const promoCtx = await loginContext(
    browser,
    'testuser3',
    `/promote/${SELLER_PEER}/${PROGRAM_ID}`,
    DEMO_INTERFACE_SCALE.public
  );
  const promo = await promoCtx.newPage();
  const promoStartedAt = Date.now();
  await prepareSegment(
    promo,
    2,
    'promoter',
    'Use one link everywhere',
    'See the 5% return, then copy one wallet-bound link.'
  );
  await promo.goto(`/promote/${SELLER_PEER}/${PROGRAM_ID}`);
  await expect(promo.getByTestId('promote-program-page')).toBeVisible({ timeout: 45000 });
  const shortLink = promo.getByTestId('promote-share-href');
  if (!(await shortLink.isVisible({ timeout: 1500 }).catch(() => false))) {
    const createLink = promo.getByRole('button', { name: /create.*link|generate.*link/i });
    await expect(createLink).toBeVisible({ timeout: 30000 });
    await createLink.click();
  }
  await expect(shortLink).toContainText(/\/a\//, { timeout: 30000 });
  markReadyForEdit('seg2-promoter-link', promoStartedAt);
  await reveal(promo);
  await focusOn(promo, shortLink, 2200);
  await focusOn(promo, promo.getByTestId('promote-storefront-earn').first(), 2300);
  await saveSegment(promo, 'seg2-promoter-link.webm');

  // ── Segment 3 · Buyer: referral → ordinary checkout → real payment ──
  const buyerCtx = await loginContext(
    browser,
    'testuser2',
    `/store/${SELLER_PEER}`,
    DEMO_INTERFACE_SCALE.public
  );
  const buyer = await buyerCtx.newPage();
  const buyerStartedAt = Date.now();
  await prepareSegment(
    buyer,
    3,
    'buyer',
    'Shop normally from the link',
    'Referral, checkout, and crypto payment stay in one real order.'
  );
  const entryPath = SHORT_PATH || `/promo/${SELLER_PEER}/${PROMO_TOKEN}`;
  await buyer.goto(entryPath);
  await expect(buyer.getByTestId('seller-affiliate-entry-ready')).toBeVisible({ timeout: 45000 });
  markReadyForEdit('seg3-buyer-purchase', buyerStartedAt);
  await reveal(buyer);
  await dwell(buyer, 1300);

  const storeLink = buyer.locator('a[href*="/store/"]').first();
  await armCover(
    buyer,
    'The referral travels with the buyer.',
    'Jordan lands in Alice’s normal storefront — no affiliate-only funnel.'
  );
  await storeLink.click();
  await buyer.waitForLoadState('domcontentloaded');
  await expect(buyer.getByText(HERO_TITLE).first()).toBeVisible({ timeout: 30000 });
  // Let hero banner / product images finish before the camera lingers.
  await buyer
    .waitForFunction(() => Array.from(document.images).every(i => i.complete), undefined, {
      timeout: 4500,
    })
    .catch(() => {});
  await reveal(buyer);
  await dwell(buyer, 1700);

  await armCover(
    buyer,
    'One link. A normal product page.',
    'The customer experience stays focused on the product, not the tracking.'
  );
  await buyer.getByText(HERO_TITLE).first().click();
  await buyer.waitForLoadState('domcontentloaded');
  // The store-connect dialog ("Connecting…") must be gone before dwelling.
  await buyer
    .getByText(/^Connecting/)
    .waitFor({ state: 'hidden', timeout: 20000 })
    .catch(() => {});
  await expect(buyer.getByRole('button', { name: /add to cart|buy now/i }).first()).toBeVisible({
    timeout: 30000,
  });
  await buyer
    .waitForFunction(() => Array.from(document.images).every(i => i.complete), undefined, {
      timeout: 4500,
    })
    .catch(() => {});
  await settleNoConnecting(buyer);
  await reveal(buyer);
  await dwell(buyer, 1800);

  await armCover(
    buyer,
    'No special affiliate checkout.',
    'Address, shipping, and the attributed order stay together.'
  );
  await buyer.getByTestId('product-detail-buy-now').first().click();
  await buyer.waitForURL(url => url.pathname === '/checkout', { timeout: 30000 });
  const checkout = buyer.getByTestId('checkout-page');
  const submitOrder = buyer.getByTestId('checkout-submit-btn');
  await expect(checkout).toBeVisible({ timeout: 30000 });
  await expect(submitOrder).toBeEnabled({ timeout: 30000 });
  await reveal(buyer);
  await dwell(buyer, 1900);

  await armCover(
    buyer,
    'One real crypto payment.',
    'The same order will fund Alice and Kai automatically.'
  );
  await buyer.evaluate(() => window.sessionStorage.setItem('checkout_selected_token', 'ETH'));
  await submitOrder.click();
  await buyer.waitForURL(url => url.pathname === '/payment' && url.searchParams.has('orderID'), {
    timeout: 60000,
  });
  const orderID = new URL(buyer.url()).searchParams.get('orderID') || '';
  expect(orderID, 'checkout must create a real order').toBeTruthy();
  await expect(buyer.getByTestId('payment-method-summary')).toContainText(/ETH/, {
    timeout: 45000,
  });
  const protectionToggle = buyer.getByTestId('payment-protection-toggle');
  await expect(protectionToggle).toBeVisible({ timeout: 45000 });
  if ((await protectionToggle.getAttribute('data-state')) === 'checked') {
    await protectionToggle.click();
  }
  await reveal(buyer);

  const createPaymentSession = buyer.getByTestId('payment-create-session');
  await expect(createPaymentSession).toBeEnabled({ timeout: 45000 });
  await createPaymentSession.click();
  const paymentCard = buyer.getByTestId('external-wallet-payment');
  if (!(await paymentCard.isVisible({ timeout: 4000 }).catch(() => false))) {
    await armCover(
      buyer,
      'Reconnecting payment…',
      'The order and affiliate attribution remain intact.'
    );
    const closeError = buyer.getByRole('button', { name: /^close$/i });
    for (let attempt = 0; attempt < 4; attempt += 1) {
      if (await paymentCard.isVisible({ timeout: 1500 }).catch(() => false)) break;
      if (await closeError.isVisible().catch(() => false)) await closeError.click();
      await buyer.waitForTimeout(1200);
      await expect(createPaymentSession).toBeEnabled({ timeout: 30000 });
      await createPaymentSession.click();
    }
    await expect(paymentCard).toBeVisible({ timeout: 45000 });
    await reveal(buyer);
  }
  await expect(paymentCard).toBeVisible({ timeout: 45000 });
  const paymentAddress = (
    (await buyer.getByTestId('external-wallet-payment-address').textContent()) || ''
  ).trim();
  const paymentAmount = (
    (await buyer.getByTestId('external-wallet-payment-amount').textContent()) || ''
  ).trim();
  expect(paymentAddress).toMatch(/^0x[0-9a-f]{40}$/i);
  expect(paymentAmount).toMatch(/^\d+(?:\.\d+)?$/);
  await dwell(buyer, 1800);

  const fundingTxHash = await fundAddressOnAnvil(paymentAddress, paymentAmount);
  expect(fundingTxHash).toMatch(/^0x[0-9a-f]{64}$/i);
  await buyer.waitForURL(url => url.pathname === '/checkout/confirmation', { timeout: 120000 });
  await expect(buyer.getByTestId('order-confirmation-page')).toBeVisible({ timeout: 30000 });
  await dwell(buyer, 2200);
  await saveSegment(buyer, 'seg3-buyer-purchase.webm');

  // ── Segment 4 · Seller: paid order settles without a second workflow ──
  const seller2 = await sellerCtx.newPage();
  const settlementStartedAt = Date.now();
  await prepareSegment(
    seller2,
    4,
    'seller',
    'Settle automatically',
    'One payment releases the seller payout and 5% affiliate leg together.'
  );
  await seller2.goto(`/orders/${encodeURIComponent(orderID)}?role=sale`);
  const sellerStatus = seller2.getByTestId('order-status-card');
  const acceptOrder = seller2.getByTestId('order-action-accept');
  await expect(sellerStatus).toBeVisible({ timeout: 60000 });
  // Payment policy may already have accepted and settled the order by the time
  // Alice opens it. If a manual accept is still offered, perform it; otherwise
  // show the stronger real outcome: the on-chain settlement is already confirmed.
  if (await acceptOrder.isVisible({ timeout: 1500 }).catch(() => false)) {
    await acceptOrder.click();
    const acceptDialog = seller2.getByTestId('accept-order-dialog');
    await expect(acceptDialog).toBeVisible();
    await expect(acceptDialog.getByTestId('receiving-account-select')).not.toHaveValue('');
    await dwell(seller2, 900);
    await acceptDialog.getByTestId('accept-order-confirm').click();
    await expect(acceptDialog).toBeHidden({ timeout: 120000 });
  }
  await expect(seller2.getByRole('button', { name: /ship order/i })).toBeVisible({
    timeout: 60000,
  });
  const settlementTitle = seller2.getByText('On-chain settlement', { exact: true });
  let settlementCard = settlementTitle.locator(
    'xpath=ancestor::div[contains(@class, "border-border")][1]'
  );
  for (let attempt = 0; attempt < 12; attempt += 1) {
    if (/confirmed/i.test((await settlementCard.textContent().catch(() => '')) || '')) break;
    await seller2.waitForTimeout(1500);
    await seller2.reload({ waitUntil: 'domcontentloaded' });
    await expect(sellerStatus).toBeVisible({ timeout: 30000 });
    settlementCard = seller2
      .getByText('On-chain settlement', { exact: true })
      .locator('xpath=ancestor::div[contains(@class, "border-border")][1]');
  }
  await expect(settlementCard).toContainText(/confirmed/i, { timeout: 60000 });
  markReadyForEdit('seg4-auto-settlement', settlementStartedAt);
  await reveal(seller2);
  await focusOn(seller2, seller2.getByText('On-chain settlement', { exact: true }), 1800);
  await dwell(seller2, 2600);
  await saveSegment(seller2, 'seg4-auto-settlement.webm');
  await sellerCtx.close();

  // ── Segment 5 · Promoter: exact-order, on-chain proof ──
  const promo2 = await promoCtx.newPage();
  const payoffStartedAt = Date.now();
  await prepareSegment(
    promo2,
    5,
    'promoter',
    'Get paid on-chain',
    'This order is Paid, with its settlement transaction attached.'
  );
  await promo2.goto(`/promote/${SELLER_PEER}/${PROGRAM_ID}/commissions`);
  await expect(promo2.getByTestId('promote-commissions-page')).toBeVisible({ timeout: 45000 });
  const exactRow = promo2.getByTestId(`seller-affiliate-statement-row-${orderID}`);
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const rowText = (await exactRow.textContent().catch(() => '')) || '';
    if (/paid/i.test(rowText)) break;
    await promo2.waitForTimeout(2500);
    await promo2.reload({ waitUntil: 'domcontentloaded' });
  }
  await expect(exactRow).toBeVisible({ timeout: 60000 });
  await expect(exactRow).toContainText(/paid/i, { timeout: 60000 });
  await setDemoInterfaceScale(promo2, DEMO_INTERFACE_SCALE.proof);
  markReadyForEdit('seg5-promoter-payoff', payoffStartedAt);
  await reveal(promo2);
  const rollup = promo2.getByTestId('seller-affiliate-earnings-summary-promoter');
  await focusOn(promo2, rollup, 2200);
  await focusOn(promo2, exactRow, 1300);
  await exactRow.click();
  const exactDetail = exactRow.locator('xpath=following-sibling::tr[1]');
  await expect(exactDetail.getByRole('button', { name: /copy transaction hash/i })).toBeVisible({
    timeout: 60000,
  });
  await dwell(promo2, 4200);

  await promo2.evaluate(() => {
    if (window.__demoChipState) window.__demoChipState.on = false;
    window.sessionStorage.removeItem('__mobazhaDemoChip');
    document.getElementById('demo-chip')?.classList.remove('on');
  });
  await promo2.waitForTimeout(400);
  await endCard(
    promo2,
    'Mobazha',
    'Recommend. Link. Get paid on-chain. · mobazha.org · recorded on Mobazha test network',
    3200
  );
  await saveSegment(promo2, 'seg5-promoter-payoff.webm');
  await promoCtx.close();
  await buyerCtx.close();
});
