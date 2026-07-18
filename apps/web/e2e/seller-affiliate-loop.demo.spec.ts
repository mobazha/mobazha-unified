// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

/**
 * Demo 0003 — Seller Affiliate Loop.
 *
 * Shot list & copy: mobazha_hosting docs/demos/0003-seller-affiliate-loop/demo.md
 * Style authority:  mobazha_hosting docs/demos/STYLE.md
 *
 * Records five segments (per-page videos) to be concatenated in order:
 *   seg1 seller    ch1    affiliate terms (5% / 7 days / payout methods)
 *   seg2 promoter  ch2-3  earnings shelf → short link + QR
 *   seg3 buyer     ch4-5  short link → referral saved → store → product
 *   seg4 seller    ch6    statement rollup + one expanded settlement row
 *   seg5 promoter  ch7    earnings payoff + end card
 *
 * Logins happen OFF CAMERA on a throwaway warm page; identifiers come from
 * tests/e2e/demos/0003-seller-affiliate-loop/seed.py via DEMO_* env vars.
 */

import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

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
const HERO_TITLE = 'Titan Leather Hardware Wallet Case';
const OUT_DIR = path.join(__dirname, '..', 'demo-output', 'affiliate-loop');

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
    #demo-chip{position:fixed;left:32px;bottom:32px;z-index:2147483647;pointer-events:none;max-width:600px;background:rgba(15,23,42,.95);color:#fff;padding:16px 22px;border-radius:14px;border-left:5px solid var(--demo-accent,#7c3aed);font-family:system-ui,-apple-system,sans-serif;box-shadow:0 10px 34px rgba(0,0,0,.45);opacity:0;transition:opacity .3s ease}
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

// Interface scale for embed readability (STYLE §3): render the app 25%
// larger inside the 1920×1080 frame — small players stay legible.
const ZOOM_INIT = `
(() => {
  const apply = () => { document.documentElement.style.zoom = '1.25'; };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply);
  else apply();
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
    d.style.cssText = 'position:fixed;inset:0;z-index:2147483645;background:#0f172a;pointer-events:none;transition:opacity .3s ease';
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

async function makeContext(browser: import('@playwright/test').Browser): Promise<BrowserContext> {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: { dir: OUT_DIR, size: { width: 1920, height: 1080 } },
  });
  await context.addInitScript(OVERLAY_INIT);
  await context.addInitScript(ZOOM_INIT);
  return context;
}

// Off-camera Casdoor login on a throwaway page; the context keeps the session.
async function loginContext(
  browser: import('@playwright/test').Browser,
  username: string,
  warmPath?: string
): Promise<BrowserContext> {
  const context = await makeContext(browser);
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
async function armCover(page: Page) {
  await page.evaluate(() => {
    let d = document.getElementById('demo-precover') as HTMLElement | null;
    if (!d) {
      d = document.createElement('div');
      d.id = 'demo-precover';
      d.style.cssText =
        'position:fixed;inset:0;z-index:2147483645;background:#0f172a;pointer-events:none;opacity:0;transition:opacity .3s ease';
      document.documentElement.appendChild(d);
    }
    requestAnimationFrame(() => {
      d!.style.opacity = '1';
    });
  });
  await page.waitForTimeout(400);
}

async function reveal(page: Page) {
  await page.evaluate(() => {
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
  expect(SELLER_PEER, 'DEMO_SELLER_PEER_ID required (run seed.py)').toBeTruthy();
  expect(PROGRAM_ID, 'DEMO_PROGRAM_ID required').toBeTruthy();
  expect(PROMO_TOKEN, 'DEMO_PROMO_TOKEN required').toBeTruthy();

  // ── Segment 1 · Seller: the offer ──
  const sellerCtx = await loginContext(browser, 'testuser1', '/admin/affiliate');
  const seller = await sellerCtx.newPage();
  await seller.addInitScript(PRECOVER_INIT);
  await seller.goto('/admin/affiliate');
  const programPanel = seller.getByTestId('seller-affiliate-program-panel');
  await expect(programPanel).toBeVisible({ timeout: 45000 });
  await expect(seller.getByTestId('affiliate-config-summary')).toBeVisible({ timeout: 30000 });

  // HOOK — over a ready page, never over a spinner.
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
    'Offer promoters a cut',
    '5% on every attributed order, storefront-wide.'
  );
  const configToggle = seller.getByTestId('affiliate-config-toggle');
  if (await configToggle.isVisible().catch(() => false)) {
    await configToggle.click();
  }
  await focusOn(seller, seller.getByTestId('affiliate-commission-column'), 1800);
  await focusOn(seller, seller.getByTestId('affiliate-attribution-column'), 1800);
  await dwell(seller, 900);
  await saveSegment(seller, 'seg1-seller-terms.webm');

  // ── Segment 2 · Promoter: shelf → link → QR ──
  const promoCtx = await loginContext(
    browser,
    'testuser3',
    `/promote/${SELLER_PEER}/${PROGRAM_ID}`
  );
  const promo = await promoCtx.newPage();
  await promo.addInitScript(PRECOVER_INIT);
  await promo.goto(`/promote/${SELLER_PEER}/${PROGRAM_ID}`);
  await expect(promo.getByTestId('promote-program-page')).toBeVisible({ timeout: 45000 });
  await reveal(promo);

  await chapter(
    promo,
    2,
    'promoter',
    'See what each sale pays',
    'Every item shows your cut before you commit.'
  );
  const shelf = promo.getByTestId('promote-storefront');
  await focusOn(promo, shelf, 1500);
  await focusOn(promo, promo.getByTestId('promote-storefront-earn').first(), 2600);

  await chapter(
    promo,
    3,
    'promoter',
    'Grab your link — and a QR',
    'One short link, bound to your wallet.'
  );
  // The link already exists (seed enrolled it); surface it if a create button gates it.
  const createBtn = promo.getByRole('button', { name: /create link/i }).first();
  if (await createBtn.isVisible().catch(() => false)) {
    await createBtn.click();
  }
  const shortLink = promo.getByText(/\/a\//).first();
  await focusOn(promo, shortLink, 2200);
  const qrBtn = promo.getByRole('button', { name: /qr/i }).first();
  if (await qrBtn.isVisible().catch(() => false)) {
    await qrBtn.click();
    const qrDialog = promo.getByRole('dialog');
    await expect(qrDialog).toBeVisible({ timeout: 10000 });
    await dwell(promo, 2800);
    await promo.keyboard.press('Escape');
    await dwell(promo, 700);
  }
  await focusOn(promo, promo.getByTestId('promote-earn-terms'), 2200);
  await saveSegment(promo, 'seg2-promoter-link.webm');

  // ── Segment 3 · Buyer (guest): short link → store → product ──
  const buyerCtx = await makeContext(browser);
  {
    // Warm the store + product routes OFF CAMERA (no referral entry, no
    // utm) so the recorded pages open on content, not a cold transform.
    const warm = await buyerCtx.newPage();
    await warm.goto(`/store/${SELLER_PEER}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await warm
      .getByText(HERO_TITLE)
      .first()
      .click({ timeout: 30000 })
      .catch(() => {});
    await warm.waitForLoadState('domcontentloaded');
    await warm.waitForTimeout(2500);
    await warm.close();
  }
  const buyer = await buyerCtx.newPage();
  await buyer.addInitScript(PRECOVER_INIT);
  const entryPath = SHORT_PATH || `/promo/${SELLER_PEER}/${PROMO_TOKEN}`;
  await buyer.goto(entryPath);
  await expect(buyer.getByTestId('seller-affiliate-entry-ready')).toBeVisible({ timeout: 45000 });
  await reveal(buyer);
  await chapter(
    buyer,
    4,
    'buyer',
    'One tap from a post',
    'The referral is saved — shopping stays normal.'
  );
  await dwell(buyer, 2400);

  const storeLink = buyer.locator('a[href*="/store/"]').first();
  await armCover(buyer);
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
  await dwell(buyer, 2600);

  await chapter(buyer, 5, 'buyer', 'Buy as usual', 'Escrow-protected checkout, paid in crypto.');
  await armCover(buyer);
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
  await dwell(buyer, 2800);
  await buyer.mouse.wheel(0, 420);
  await dwell(buyer, 2200);
  await saveSegment(buyer, 'seg3-buyer.webm');
  await buyerCtx.close();

  // ── Segment 4 · Seller: the ledger runs itself ──
  const seller2 = await sellerCtx.newPage();
  await seller2.addInitScript(PRECOVER_INIT);
  await seller2.goto('/admin/affiliate');
  const statements = seller2.getByTestId('seller-affiliate-statements-seller');
  await expect(statements).toBeVisible({ timeout: 45000 });
  await reveal(seller2);
  await chapter(
    seller2,
    6,
    'seller',
    'No invoices, no spreadsheets',
    'Commissions settle when funds release.'
  );
  await focusOn(seller2, seller2.getByTestId('seller-affiliate-earnings-summary-seller'), 2400);
  const firstRow = seller2.locator('[data-testid^="seller-affiliate-statement-row-"]').first();
  await focusOn(seller2, firstRow, 900);
  await firstRow.click();
  await dwell(seller2, 3000);
  await seller2.mouse.wheel(0, 320);
  await dwell(seller2, 2000);
  await saveSegment(seller2, 'seg4-seller-ledger.webm');
  await sellerCtx.close();

  // ── Segment 5 · Promoter: payoff + end card ──
  const promo2 = await promoCtx.newPage();
  await promo2.addInitScript(PRECOVER_INIT);
  await promo2.goto(`/promote/${SELLER_PEER}/${PROGRAM_ID}/commissions`);
  await expect(promo2.getByTestId('promote-commissions-page')).toBeVisible({ timeout: 45000 });
  await reveal(promo2);
  await chapter(
    promo2,
    7,
    'promoter',
    'Paid on-chain, automatically',
    'Confirmed commissions land in your wallet.'
  );
  const rollup = promo2.getByTestId('seller-affiliate-earnings-summary-promoter');
  await focusOn(promo2, rollup, 2200);
  await expect(promo2.getByText(/paid/i).first()).toBeVisible({ timeout: 20000 });
  await promo2.mouse.wheel(0, 380);
  await dwell(promo2, 2400);
  await promo2.mouse.wheel(0, -380);
  // PAYOFF hold on the rollup + paid rows.
  await dwell(promo2, 4200);

  await promo2.evaluate(() => {
    if (window.__demoChipState) window.__demoChipState.on = false;
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
});
