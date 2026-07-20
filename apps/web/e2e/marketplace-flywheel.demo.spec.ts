// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

/**
 * Demo 0001 — Operator Commission Flywheel.
 *
 * Shot list & copy: mobazha-docs/demos/0001-operator-commission-flywheel/demo.md
 * Style authority:  mobazha-docs/demos/STYLE.md
 *
 * Records seven segments (per-page videos) to be concatenated in order:
 *   seg1 operator  ch1-4  create → rate → publish → invite link
 *   seg2 seller    ch5    invite landing → join
 *   seg3 operator  ch6    curate → republish → share link
 *   seg4 buyer     ch7-10 browse → checkout → real Anvil payment
 *   seg5 seller    ch11-12 accept paid order → ship
 *   seg6 buyer     ch13   confirm receipt → complete
 *   seg7 operator  ch14   exact order attribution + estimate payoff
 *
 * Logins happen OFF CAMERA: tokens come from the Casdoor code-exchange API and
 * are injected into localStorage before any recorded page loads.
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

const BACKEND = 'http://localhost:18080';
const ANVIL = 'http://localhost:18545';
const CASDOOR = 'http://localhost:18000';
const CLIENT_ID = 'e2e-mobazha-client-id';
const APP_NAME = 'app-mobazha';
const DEMO_SLUG = 'mayas-collective';
const MARKET_NAME = "Maya's Collective";
const HERO_TITLE = 'Handmade Ceramic Teacup';
const SUB_ORIGIN = `http://${DEMO_SLUG}.localhost:3000`;
// Persist OUTSIDE Playwright's outputDir — a passing run auto-cleans that dir
// and would delete the segment videos with it.
const OUT_DIR = path.join(__dirname, '..', 'demo-output', 'marketplace-final');

const PERSONA = {
  operator: { label: 'Operator · Maya', accent: '#7c3aed' },
  seller: { label: 'Seller · Kenji', accent: '#d97706' },
  buyer: { label: 'Buyer', accent: '#059669' },
} as const;

// ─── Self-healing overlay (survives React re-renders) ───────────────
//
// The v1 demo failed because overlay nodes were appended to React's <body>
// and reconciliation removed them. This init-script mounts them on
// <html> (outside React's root), and a MutationObserver re-attaches them
// if anything ever detaches them. addInitScript runs on EVERY navigation,
// so the chip/card are present the instant a page loads — no loading gap
// with a naked spinner and no chapter card.

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

// ─── Off-camera auth ────────────────────────────────────────────────

// Opaque dark floor under the hook card from the recorded page's first
// frame — the film never flashes the raw UI while it loads. Removed by
// fullCard once the hook card has faded in above it.
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

// Logs in through the real Casdoor form on a throwaway page whose video
// segment is discarded; the context keeps the session for on-camera pages.
async function loginContext(
  browser: import('@playwright/test').Browser,
  username: string,
  interfaceScale: number = DEMO_INTERFACE_SCALE.workflow,
  warmUrl = '/operator/marketplaces'
): Promise<BrowserContext> {
  const context = await makeContext(browser, interfaceScale);
  // Derive the app origin from the requested destination before navigation.
  // An unauthenticated protected route may redirect to Casdoor before
  // DOMContentLoaded, so warm.url() is not a stable source for this value.
  const returnOrigin = new URL(warmUrl, 'http://localhost:3000').origin;
  const warm = await context.newPage();
  await warm.goto(warmUrl);
  await warm.waitForLoadState('domcontentloaded');

  // Authentication is origin-scoped in the SaaS web app. Public marketplace
  // and invite URLs can live on a subdomain, so log in on the exact origin
  // that the recorded page will use instead of assuming localhost auth carries
  // over. All of this remains on the discarded warm-up page.
  const inviteLogin = warm.getByTestId('invite-login');
  if (await inviteLogin.isVisible().catch(() => false)) {
    await inviteLogin.click();
  } else {
    const headerLogin = warm.getByTestId('header-login-btn');
    if (await headerLogin.isVisible().catch(() => false)) await headerLogin.click();
  }

  const standaloneLogin = warm.getByTestId('login-standalone-buyer');
  if (await standaloneLogin.isVisible({ timeout: 5000 }).catch(() => false)) {
    await standaloneLogin.click();
  }

  await warm.waitForTimeout(500);
  if (warm.url().includes(':18000') || /casdoor|login/i.test(warm.url())) {
    await warm.getByRole('textbox', { name: /username|email/i }).fill(username);
    await warm.getByRole('textbox', { name: /password/i }).fill('123');
    await warm.getByRole('button', { name: /sign in/i }).click();
    // Match the callback origin, not a localhost:3000 substring inside
    // Casdoor's redirect_uri query parameter. The loose regex could close the
    // warm page before the callback persisted the authenticated session.
    await warm.waitForURL(url => url.origin === returnOrigin, { timeout: 45000 });
    await warm.waitForLoadState('domcontentloaded');
    await expect
      .poll(
        () =>
          warm.evaluate(() => window.localStorage.getItem('mobazha_auth_token')).catch(() => null),
        {
          timeout: 30000,
          intervals: [250, 500, 1000],
        }
      )
      .toBeTruthy();
  }

  if (warmUrl !== '/operator/marketplaces') {
    const authenticatedOrigin = new URL(warm.url()).origin;
    const sessionEntries = await warm.evaluate(() => Object.entries(window.sessionStorage));
    await context.addInitScript(
      ({ origin, entries }) => {
        if (window.location.origin !== origin) return;
        for (const [name, value] of entries) window.sessionStorage.setItem(name, value);
      },
      { origin: authenticatedOrigin, entries: sessionEntries }
    );
  }
  await warm.close();
  return context;
}

async function mirrorMainAppAuthToLocalSubdomains(context: BrowserContext) {
  const storage = await context.storageState();
  const mainOrigin = storage.origins.find(origin => origin.origin === 'http://localhost:3000');
  const localStorage = mainOrigin?.localStorage || [];
  expect(localStorage.length, 'main-app login should persist browser auth').toBeGreaterThan(0);

  // Casdoor's local client intentionally allows localhost:3000 but cannot
  // enumerate the runtime-generated *.localhost marketplace hosts. Mirror the
  // already-issued main-app session into those local subdomains before their
  // first document loads. This is an E2E-environment bridge, not a fake user or
  // bypass: the credentials and tokens still come from the real login above.
  await context.addInitScript(entries => {
    if (!window.location.hostname.endsWith('.localhost')) return;
    for (const { name, value } of entries) window.localStorage.setItem(name, value);
  }, localStorage);
}

// ─── Chapter + card control (state persisted across navigations) ────

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
  if (payload.error) {
    throw new Error(`Anvil ${method}: ${JSON.stringify(payload.error)}`);
  }
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

// Reveal a locator (scroll + wait visible) before dwelling on it — never
// dwell on a spinner.
async function focusOn(page: Page, locator: import('@playwright/test').Locator, ms = 1300) {
  await locator.scrollIntoViewIfNeeded();
  await expect(locator).toBeVisible({ timeout: 30000 });
  await dwell(page, ms);
}

async function saveSegment(page: Page, name: string) {
  const video = page.video();
  await page.close(); // flushes this page's video file
  if (video) {
    await video.saveAs(path.join(OUT_DIR, name));
    await video.delete();
  }
}

// ─── The demo ───────────────────────────────────────────────────────

test('Demo 0001: operator commission flywheel', async ({ browser }) => {
  test.setTimeout(12 * 60 * 1000);

  // ── Segment 1 · Operator: create → rate → publish → invite link ──
  const opCtx = await loginContext(browser, 'testuser1');
  const op = await opCtx.newPage();
  await op.addInitScript(PRECOVER_INIT);
  await op.goto('/operator/marketplaces');
  // Wait for the REAL page, not a spinner, before anything is on camera.
  await expect(op.getByRole('button', { name: /create marketplace/i }).first()).toBeVisible({
    timeout: 45000,
  });

  // HOOK — full-screen pain card over a ready page.
  await fullCard(
    op,
    'Your community buys what you recommend.\nYou earn nothing.',
    'Until now — meet marketplace operator commissions.',
    3400
  );

  // CH1 create
  await chapter(
    op,
    1,
    'operator',
    'Create your marketplace',
    'Pick how it starts: curated and invite-only.'
  );
  await op
    .getByRole('button', { name: /create marketplace/i })
    .first()
    .click();
  const nameField = op.getByRole('textbox', { name: /^name/i });
  await focusOn(op, nameField, 600);
  await nameField.fill(MARKET_NAME);
  await dwell(op, 700);
  await op.locator('[data-testid="create-mode-invite"]').click();
  await dwell(op, 900);
  await op
    .getByRole('button', { name: /create and configure|create & configure|configure/i })
    .last()
    .click();
  // Land on the detail page and wait for its real content.
  await op.waitForURL(/operator\/marketplaces\/.+/, { timeout: 30000 });
  await expect(op.getByRole('heading', { name: MARKET_NAME, level: 1 })).toBeVisible({
    timeout: 30000,
  });
  // slug is server-normalized ("Maya's Collective" -> maya-s-collective);
  // capture the real id from the URL (public API resolves by id OR slug).
  const marketplaceId = op.url().match(/marketplaces\/([^/?#]+)/)?.[1] ?? '';
  await dwell(op, 1400);

  // CH2 commission rate
  await chapter(
    op,
    2,
    'operator',
    'Set your commission',
    '10% on every order your market delivers.'
  );
  await op.getByTestId('operator-tab-settings').click();
  const rate = op.getByTestId('operator-marketplace-commission-percent');
  await focusOn(op, rate, 700);
  await rate.fill('10');
  await dwell(op, 1200);
  await op.getByRole('button', { name: /save/i }).first().click();
  await dwell(op, 1500);

  // CH3 publish with zero sellers
  await chapter(
    op,
    3,
    'operator',
    'Publish before recruiting',
    'A live URL is your best recruiting asset.'
  );
  await op.getByTestId('operator-tab-overview').click();
  const publishBtn = op.getByRole('button', { name: /^publish$/i }).first();
  await focusOn(op, publishBtn, 700);
  await publishBtn.click();
  await expect(op.getByText(/published/i).first()).toBeVisible({ timeout: 20000 });
  await dwell(op, 1600);

  // Read the REAL subdomain from the public projection (slug is
  // server-normalized and can carry a -N suffix); the buyer segment needs it.
  const pubDetail = await fetch(`${BACKEND}/platform/v1/public-marketplaces/${marketplaceId}`)
    .then(r => r.json())
    .catch(() => null);
  const publicHost: string =
    pubDetail?.data?.marketplace?.publicURL || pubDetail?.data?.publicURL || '';
  const subdomain = publicHost.replace(/^https?:\/\//, '').split('.')[0] || marketplaceId;

  // CH4 invite link
  await chapter(op, 4, 'operator', 'Invite sellers with one link', 'No forms, no back-and-forth.');
  await op.getByTestId('operator-tab-sellers').click();
  const invitePanel = op.getByTestId('operator-invite-link-panel');
  await focusOn(op, invitePanel, 700);
  await invitePanel.getByTestId('invite-link-auto-approve').click();
  await dwell(op, 700);
  await invitePanel.getByTestId('invite-link-create').click();
  await expect(invitePanel.getByTestId('invite-links-list')).toBeVisible({ timeout: 15000 });
  await dwell(op, 1700);
  const inviteUrl = await invitePanel.locator('.font-mono').first().textContent();
  expect(inviteUrl).toContain('/join/marketplace/');
  await saveSegment(op, 'seg1-operator-setup.webm');

  // ── Segment 2 · Seller: invite landing → join ──
  const sellerCtx = await loginContext(
    browser,
    'testuser3',
    DEMO_INTERFACE_SCALE.workflow,
    inviteUrl!.trim()
  );
  const seller = await sellerCtx.newPage();
  await seller.addInitScript(PRECOVER_INIT);
  await seller.goto(inviteUrl!.trim());
  const inviteCard = seller.getByTestId('invite-card');
  await expect(inviteCard).toBeVisible({ timeout: 30000 });
  await reveal(seller);
  await chapter(
    seller,
    5,
    'seller',
    'Join in one step',
    'The terms — including the 10% — are on the invitation.'
  );
  await expect(seller.getByTestId('invite-commission')).toHaveText(/10%/);
  await dwell(seller, 2100);
  await seller.getByTestId('invite-accept').click();
  await expect(seller.getByTestId('invite-result')).toBeVisible({ timeout: 20000 });
  await dwell(seller, 2200);
  await saveSegment(seller, 'seg2-seller-join.webm');
  await sellerCtx.close();

  // ── Segment 3 · Operator: curate → republish → share ──
  // Reuse the same operator page — go STRAIGHT to the detail URL (skip the
  // slow list page) so there is no spinner gap.
  const op2 = await opCtx.newPage();
  await op2.addInitScript(PRECOVER_INIT);
  await op2.goto(`/operator/marketplaces/${marketplaceId}`);
  await expect(op2.getByRole('heading', { name: MARKET_NAME, level: 1 })).toBeVisible({
    timeout: 30000,
  });
  await reveal(op2);
  await chapter(op2, 6, 'operator', 'Curate and share', 'Your storefront, your picks, your link.');
  await op2.getByTestId('operator-tab-curation').click();
  // Current curation UI: eligible candidates render as click-to-feature cards.
  const candidate = op2.locator('[data-testid^="operator-curation-candidate-"]').first();
  await focusOn(op2, candidate, 900);
  await candidate.click();
  await dwell(op2, 1500);
  await op2.getByTestId('operator-tab-overview').click();
  const publishAgain = op2.getByRole('button', { name: /^publish$/i }).first();
  if (await publishAgain.isVisible().catch(() => false)) {
    await focusOn(op2, publishAgain, 600);
    await publishAgain.click();
    await dwell(op2, 1500);
  }
  const share = op2.getByTestId('operator-share-panel');
  await focusOn(op2, share, 900);
  await share.getByTestId('operator-share-copy-community').click();
  await dwell(op2, 1500);
  await saveSegment(op2, 'seg3-operator-share.webm');

  // ── Segment 4 · Buyer: arrive via share link ──
  const buyerCtx = await loginContext(browser, 'testuser2', DEMO_INTERFACE_SCALE.public);
  await mirrorMainAppAuthToLocalSubdomains(buyerCtx);
  // Authenticate the seller before the buyer segment starts. The context is
  // reused after checkout for the real order-receipt handshake, so Casdoor
  // latency never turns into dead time in the recorded buyer journey.
  const fulfillmentCtx = await loginContext(browser, 'testuser3');
  {
    // Warm the submarket home + product routes OFF CAMERA with a plain URL
    // (no utm), so no attribution event fires and the recorded pages open
    // on content instead of a cold transform.
    const warm = await buyerCtx.newPage();
    await warm.goto(`http://${subdomain}.localhost:3000/`, {
      waitUntil: 'domcontentloaded',
      timeout: 45000,
    });
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
  // The community share link — the operator's real submarket subdomain.
  const shareUrl = `http://${subdomain}.localhost:3000/?utm_source=operator_share&utm_medium=community&utm_campaign=${DEMO_SLUG}`;
  await buyer.goto(shareUrl);
  await buyer.waitForLoadState('domcontentloaded');
  // Wait for the real submarket home (branded hero + product), not a spinner
  // or the "unavailable" fallback — THEN narrate over the ready page.
  await expect(buyer.getByText(HERO_TITLE).first()).toBeVisible({ timeout: 25000 });
  await buyer
    .waitForFunction(() => Array.from(document.images).every(i => i.complete), undefined, {
      timeout: 4500,
    })
    .catch(() => {});
  await reveal(buyer);
  // CH7 — THIS is the storefront the operator built, as buyers see it.
  await chapter(
    buyer,
    7,
    'buyer',
    'This is the storefront buyers see',
    `${MARKET_NAME} — the operator's brand, the seller's product.`
  );
  await dwell(buyer, 2800);

  // CH8 — open the product: price, seller, and buyer protection.
  await chapter(
    buyer,
    8,
    'buyer',
    'One order stays traceable end to end',
    'Checkout, payment, fulfillment, and attribution share the same order.'
  );
  await armCover(buyer);
  await buyer.getByText(HERO_TITLE).first().click();
  await buyer.waitForLoadState('domcontentloaded');
  await buyer
    .getByText(/^Connecting/)
    .waitFor({ state: 'hidden', timeout: 20000 })
    .catch(() => {});
  await expect(buyer.getByRole('heading', { name: HERO_TITLE }).first()).toBeVisible({
    timeout: 25000,
  });
  await buyer
    .waitForFunction(() => Array.from(document.images).every(i => i.complete), undefined, {
      timeout: 4500,
    })
    .catch(() => {});
  await settleNoConnecting(buyer);
  await reveal(buyer);
  await dwell(buyer, 3000);
  await armCover(buyer);
  await buyer.getByTestId('product-detail-buy-now').first().click();
  await buyer.waitForURL(url => url.pathname === '/checkout', { timeout: 30000 });
  const checkout = buyer.getByTestId('checkout-page');
  await expect(checkout).toBeVisible({ timeout: 30000 });
  const submitOrder = buyer.getByTestId('checkout-submit-btn');
  await expect(submitOrder).toBeEnabled({ timeout: 30000 });
  await reveal(buyer);
  await chapter(
    buyer,
    9,
    'buyer',
    'Place one real order',
    'The 0.012 ETH item, delivery address, and shipping stay together.'
  );
  await dwell(buyer, 1800);

  await armCover(buyer);
  // A returning buyer's saved method avoids an asynchronous selector catalog
  // race on runtime-generated *.localhost hosts. The payment page restores the
  // same standard session key used by its real selector and still verifies ETH
  // in the visible summary before creating a session.
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

  // The local search service does not publish a verified moderator catalog.
  // Disable the optional moderator layer off camera so the demo exercises the
  // supported direct crypto path instead of presenting unavailable protection.
  const protectionToggle = buyer.getByTestId('payment-protection-toggle');
  await expect(protectionToggle).toBeVisible({ timeout: 45000 });
  if ((await protectionToggle.getAttribute('data-state')) === 'checked') {
    await protectionToggle.click();
  }

  // Complete the real seller-receipt handshake in a non-recorded page while
  // the buyer sees the ready payment page and chapter copy. The work is still
  // end to end and uses the same order ID; only its waiting time is off camera.
  const sellerReceiptReady = (async () => {
    const sellerWarm = await fulfillmentCtx.newPage();
    await sellerWarm.goto(`/orders/${encodeURIComponent(orderID)}?role=sale`);
    await expect(sellerWarm.getByTestId('order-status-card')).toBeVisible({ timeout: 60000 });
    await sellerWarm.close();
  })();

  await reveal(buyer);
  await chapter(
    buyer,
    10,
    'buyer',
    'Create a monitored payment',
    'The exact ETH total becomes a unique address for this order.'
  );
  await sellerReceiptReady;

  const createPaymentSession = buyer.getByTestId('payment-create-session');
  await expect(createPaymentSession).toBeEnabled({ timeout: 45000 });
  await dwell(buyer, 500);
  await createPaymentSession.click();
  const paymentCard = buyer.getByTestId('external-wallet-payment');
  if (!(await paymentCard.isVisible({ timeout: 4000 }).catch(() => false))) {
    // Selection restoration can clear the first rendered card even though the
    // backend already persisted the session. The endpoint is idempotent: a
    // second request returns that same address after the selector has settled.
    // Cover only this exceptional retry, never the normal seller handshake.
    await armCover(buyer);
    const closeError = buyer.getByRole('button', { name: /^close$/i });
    if (await closeError.isVisible().catch(() => false)) await closeError.click();
    await expect(createPaymentSession).toBeEnabled({ timeout: 30000 });
    await createPaymentSession.click();
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
  await dwell(buyer, 2200);

  const paymentTxHash = await fundAddressOnAnvil(paymentAddress, paymentAmount);
  expect(paymentTxHash).toMatch(/^0x[0-9a-f]{64}$/i);
  await buyer.waitForURL(url => url.pathname === '/checkout/confirmation', { timeout: 120000 });
  const confirmation = buyer.getByTestId('order-confirmation-page');
  await expect(confirmation).toBeVisible({ timeout: 30000 });
  await chapter(
    buyer,
    11,
    'buyer',
    'Payment verified',
    'The seller now receives this exact paid order.'
  );
  await dwell(buyer, 2600);
  await saveSegment(buyer, 'seg4-buyer-checkout-payment.webm');

  // ── Segment 5 · Seller: accept the paid order → ship ──
  const fulfillment = await fulfillmentCtx.newPage();
  await fulfillment.addInitScript(PRECOVER_INIT);
  await fulfillment.goto(`/orders/${encodeURIComponent(orderID)}?role=sale`);
  const sellerStatus = fulfillment.getByTestId('order-status-card');
  await expect(sellerStatus).toBeVisible({ timeout: 60000 });
  const acceptOrder = fulfillment.getByTestId('order-action-accept');
  await reveal(fulfillment);
  await chapter(
    fulfillment,
    12,
    'seller',
    'A paid order arrives',
    'Payment and managed settlement are already confirmed.'
  );
  if (await acceptOrder.isVisible().catch(() => false)) {
    await acceptOrder.click();
    const acceptDialog = fulfillment.getByTestId('accept-order-dialog');
    await expect(acceptDialog).toBeVisible();
    await expect(acceptDialog.getByTestId('receiving-account-select')).not.toHaveValue('');
    await dwell(fulfillment, 1200);
    await acceptDialog.getByTestId('accept-order-confirm').click();
    await expect(acceptDialog).toBeHidden({ timeout: 120000 });
  }

  const shipOrder = fulfillment.getByTestId('order-action-ship');
  await expect(shipOrder).toBeVisible({ timeout: 60000 });
  await chapter(
    fulfillment,
    13,
    'seller',
    'Fulfill the same order',
    'Tracking moves the buyer timeline forward.'
  );
  await shipOrder.click();
  const shipDialog = fulfillment.getByTestId('ship-order-dialog');
  await expect(shipDialog).toBeVisible();
  await shipDialog.getByTestId('ship-order-tracking').fill('1Z999AA10123456784');
  await shipDialog.getByTestId('ship-order-note').fill('Packed securely in recycled paper.');
  await dwell(fulfillment, 1200);
  await shipDialog.getByTestId('ship-order-confirm').click();
  await expect(shipDialog).toBeHidden({ timeout: 60000 });
  await expect(sellerStatus).toContainText(/shipped|fulfilled/i, { timeout: 60000 });
  await dwell(fulfillment, 2600);
  await saveSegment(fulfillment, 'seg5-seller-fulfillment.webm');
  await fulfillmentCtx.close();

  // ── Segment 6 · Buyer: confirm receipt → completed ──
  const completion = await buyerCtx.newPage();
  await completion.addInitScript(PRECOVER_INIT);
  await completion.goto(`/orders/${encodeURIComponent(orderID)}?role=purchase`);
  const buyerStatus = completion.getByTestId('order-status-card');
  await expect(buyerStatus).toBeVisible({ timeout: 60000 });
  const completeOrder = completion.getByTestId('order-action-complete');
  await expect(completeOrder).toBeVisible({ timeout: 60000 });
  await reveal(completion);
  await chapter(
    completion,
    14,
    'buyer',
    'Confirm receipt',
    'The shipped order reaches its completed state.'
  );
  await completeOrder.click();
  const receiptDialog = completion.getByTestId('confirm-receipt-dialog');
  await expect(receiptDialog).toBeVisible();
  await dwell(completion, 1000);
  await receiptDialog.getByTestId('confirm-receipt-submit').click();
  await expect(receiptDialog).toBeHidden({ timeout: 90000 });
  await expect(
    completion.getByTestId('rating-invite-banner').or(buyerStatus.getByText(/completed/i))
  ).toBeVisible({ timeout: 60000 });
  await focusOn(completion, buyerStatus, 3200);
  await saveSegment(completion, 'seg6-buyer-complete.webm');
  await buyerCtx.close();

  // ── Segment 7 · Operator: exact order attribution + estimate payoff ──

  // Reuse the operator page again — straight to the detail URL.
  const op3 = await opCtx.newPage();
  await op3.addInitScript(PRECOVER_INIT);
  await op3.goto(`/operator/marketplaces/${marketplaceId}`);
  await expect(op3.getByRole('heading', { name: MARKET_NAME, level: 1 })).toBeVisible({
    timeout: 30000,
  });
  await setDemoInterfaceScale(op3, DEMO_INTERFACE_SCALE.proof);
  await reveal(op3);
  await chapter(
    op3,
    15,
    'operator',
    'The completed order comes back',
    'Attributed to the share link, with an estimated 10% commission.'
  );
  const earnings = op3.getByTestId('operator-earnings-card');
  await focusOn(op3, earnings, 800);
  await expect(earnings.getByTestId('operator-earnings-rate')).toHaveText(/10/);
  // This new marketplace has exactly one on-camera order, so the total is the
  // proof for that order. Phase 1 is explicitly an estimate, not a balance.
  await expect(earnings.getByTestId('operator-earnings-totals')).toBeVisible({ timeout: 30000 });
  await expect(earnings.getByText(/0\.0020/)).toBeVisible({ timeout: 30000 });
  await expect(earnings.getByTestId('operator-earnings-estimate-note')).toContainText(
    /estimate|not a payable balance/i
  );
  // PAYOFF hold — the frame people remember.
  await dwell(op3, 4200);

  // END CARD
  await endCard(
    op3,
    'Mobazha',
    'Your community. Your market. One completed order. · mobazha.org · test network',
    3200
  );
  await saveSegment(op3, 'seg7-operator-payoff.webm');
  await opCtx.close();
});
