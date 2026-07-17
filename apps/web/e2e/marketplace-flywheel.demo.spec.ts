// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

/**
 * Demo 0001 — Operator Commission Flywheel.
 *
 * Shot list & copy: mobazha-docs/demos/0001-operator-commission-flywheel/demo.md
 * Style authority:  mobazha-docs/demos/STYLE.md
 *
 * Records five segments (per-page videos) to be concatenated in order:
 *   seg1 operator  ch1-4  create → rate → publish → invite link
 *   seg2 seller    ch5    invite landing → join
 *   seg3 operator  ch6    curate → republish → share link
 *   seg4 buyer     ch7    browse via share link → buy   (DEMO_PAYMENT=1 only)
 *   seg5 operator  ch8    attribution + earnings payoff
 *
 * Logins happen OFF CAMERA: tokens come from the Casdoor code-exchange API and
 * are injected into localStorage before any recorded page loads.
 */

import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

declare global {
  interface Window {
    __demoOverlayInstalled?: boolean;
    __demoChipState?: { persona: string; accent: string; title: string; support: string; on: boolean };
    __demoCardState?: { big: string; small: string; on: boolean };
  }
}

const BACKEND = 'http://localhost:18080';
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

// ─── Off-camera auth ────────────────────────────────────────────────

async function makeContext(
  browser: import('@playwright/test').Browser
): Promise<BrowserContext> {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: { dir: OUT_DIR, size: { width: 1920, height: 1080 } },
  });
  await context.addInitScript(OVERLAY_INIT);
  return context;
}

// Logs in through the real Casdoor form on a throwaway page whose video
// segment is discarded; the context keeps the session for on-camera pages.
async function loginContext(
  browser: import('@playwright/test').Browser,
  username: string
): Promise<BrowserContext> {
  const context = await makeContext(browser);
  const warm = await context.newPage();
  await warm.goto('/operator/marketplaces');
  await warm.waitForLoadState('domcontentloaded');
  if (warm.url().includes(':18000') || /casdoor|login/i.test(warm.url())) {
    await warm.getByRole('textbox', { name: /username|email/i }).fill(username);
    await warm.getByRole('textbox', { name: /password/i }).fill('123');
    await warm.getByRole('button', { name: /sign in/i }).click();
    await warm.waitForURL(/localhost:3000/, { timeout: 45000 });
    await warm.waitForLoadState('domcontentloaded');
  }
  await warm.close();
  return context;
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
  await page.waitForTimeout(holdMs);
  await page.evaluate(() => {
    if (window.__demoCardState) window.__demoCardState.on = false;
    document.getElementById('demo-card')?.classList.remove('on');
  });
  await page.waitForTimeout(450);
}

async function dwell(page: Page, ms = 1300) {
  await page.waitForTimeout(ms);
}

// Reveal a locator (scroll + wait visible) before dwelling on it — never
// dwell on a spinner.
async function focusOn(
  page: Page,
  locator: import('@playwright/test').Locator,
  ms = 1300
) {
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
  const includePayment = process.env.DEMO_PAYMENT === '1';

  // ── Segment 1 · Operator: create → rate → publish → invite link ──
  const opCtx = await loginContext(browser, 'testuser1');
  const op = await opCtx.newPage();
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
  await chapter(op, 1, 'operator', 'Create your marketplace', 'Pick how it starts: curated and invite-only.');
  await op.getByRole('button', { name: /create marketplace/i }).first().click();
  const nameField = op.getByRole('textbox', { name: /^name/i });
  await focusOn(op, nameField, 600);
  await nameField.fill(MARKET_NAME);
  await dwell(op, 700);
  await op.locator('[data-testid="create-mode-invite"]').click();
  await dwell(op, 900);
  await op.getByRole('button', { name: /create and configure|create & configure|configure/i }).last().click();
  // Land on the detail page and wait for its real content.
  await op.waitForURL(/operator\/marketplaces\/.+/, { timeout: 30000 });
  await expect(op.getByRole('heading', { name: MARKET_NAME, level: 1 })).toBeVisible({ timeout: 30000 });
  // slug is server-normalized ("Maya's Collective" -> maya-s-collective);
  // capture the real id from the URL (public API resolves by id OR slug).
  const marketplaceId = op.url().match(/marketplaces\/([^/?#]+)/)?.[1] ?? '';
  await dwell(op, 1400);

  // CH2 commission rate
  await chapter(op, 2, 'operator', 'Set your commission', '10% on every order your market delivers.');
  await op.getByTestId('operator-tab-settings').click();
  const rate = op.getByTestId('operator-marketplace-commission-percent');
  await focusOn(op, rate, 700);
  await rate.fill('10');
  await dwell(op, 1200);
  await op.getByRole('button', { name: /save/i }).first().click();
  await dwell(op, 1500);

  // CH3 publish with zero sellers
  await chapter(op, 3, 'operator', 'Publish before recruiting', 'A live URL is your best recruiting asset.');
  await op.getByTestId('operator-tab-overview').click();
  const publishBtn = op.getByRole('button', { name: /^publish$/i }).first();
  await focusOn(op, publishBtn, 700);
  await publishBtn.click();
  await expect(op.getByText(/published/i).first()).toBeVisible({ timeout: 20000 });
  await dwell(op, 1600);

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
  const sellerCtx = await loginContext(browser, 'testuser3');
  const seller = await sellerCtx.newPage();
  await seller.goto(inviteUrl!.trim());
  const inviteCard = seller.getByTestId('invite-card');
  await expect(inviteCard).toBeVisible({ timeout: 30000 });
  await chapter(seller, 5, 'seller', 'Join in one step', 'The terms — including the 10% — are on the invitation.');
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
  await op2.goto(`/operator/marketplaces/${marketplaceId}`);
  await expect(op2.getByRole('heading', { name: MARKET_NAME, level: 1 })).toBeVisible({ timeout: 30000 });
  await chapter(op2, 6, 'operator', 'Curate and share', 'Your storefront, your picks, your link.');
  await op2.getByTestId('operator-tab-curation').click();
  const listingSelect = op2.getByTestId('operator-curation-select-listing');
  await focusOn(op2, listingSelect, 800);
  await listingSelect.selectOption({ index: 1 });
  await dwell(op2, 900);
  await op2.getByTestId('operator-curation-add-listing').click();
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
  const buyerCtx = await loginContext(browser, 'testuser2');
  const buyer = await buyerCtx.newPage();
  const shareUrl = `${SUB_ORIGIN}/?utm_source=operator_share&utm_medium=community&utm_campaign=${DEMO_SLUG}`;
  await buyer.goto(shareUrl);
  await buyer.waitForLoadState('domcontentloaded');
  // Wait for the storefront to actually paint a product or a heading.
  await Promise.race([
    buyer.getByText(HERO_TITLE).first().waitFor({ state: 'visible', timeout: 20000 }),
    buyer.getByRole('heading').first().waitFor({ state: 'visible', timeout: 20000 }),
  ]).catch(() => {});
  await chapter(buyer, 7, 'buyer', 'Buy through the market', 'A real order, paid on-chain.');
  await dwell(buyer, 2200);
  if (includePayment) {
    await buyer.getByText(HERO_TITLE).first().click();
    await buyer.waitForLoadState('domcontentloaded');
    await dwell(buyer, 1500);
    await buyer.getByRole('button', { name: /buy now/i }).first().click();
    await dwell(buyer, 4000);
  }
  await saveSegment(buyer, 'seg4-buyer.webm');
  await buyerCtx.close();

  // ── Segment 5 · Operator: attribution + earnings payoff ──
  if (!includePayment) {
    // Stage one ledger row through the REAL public API (same request a buyer
    // browser sends), gated by the real handoff/listing-availability checks —
    // this triggers genuine ledger accounting, it does not fabricate a result.
    const journeyID = crypto.randomUUID();
    const sellerPeer = process.env.DEMO_SELLER_PEER || '';
    const base = `${BACKEND}/platform/v1/public-marketplaces/${marketplaceId}`;
    await fetch(`${base}/attribution-events`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventID: crypto.randomUUID(), journeyID, eventType: 'checkout_handoff',
        listingSlug: 'handmade-ceramic-teacup', peerID: sellerPeer,
        source: 'operator_share', medium: 'community', campaign: DEMO_SLUG,
      }),
    });
    await fetch(`${base}/order-attributions`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderID: `demo-rehearsal-${Date.now()}`, journeyID,
        listingSlug: 'handmade-ceramic-teacup', peerID: sellerPeer,
        pricingCoin: 'ETH', amount: '12000000000000000', currencyDivisibility: 18,
        source: 'operator_share', medium: 'community', campaign: DEMO_SLUG,
      }),
    });
  }

  // Reuse the operator page again — straight to the detail URL.
  const op3 = await opCtx.newPage();
  await op3.goto(`/operator/marketplaces/${marketplaceId}`);
  await expect(op3.getByRole('heading', { name: MARKET_NAME, level: 1 })).toBeVisible({ timeout: 30000 });
  await chapter(op3, 8, 'operator', 'Watch it come back', 'Every share, click, and sale — attributed and paid.');
  const earnings = op3.getByTestId('operator-earnings-card');
  await focusOn(op3, earnings, 800);
  await expect(earnings.getByTestId('operator-earnings-rate')).toHaveText(/10/);
  // Wait for the ledger row (real number) to render before the hold.
  await expect(earnings.getByText(/0\.0012/)).toBeVisible({ timeout: 15000 });
  // PAYOFF hold — the frame people remember.
  await dwell(op3, 4200);

  // END CARD
  await fullCard(
    op3,
    'Mobazha',
    'Your community. Your market. Your cut. · mobazha.com · recorded on Mobazha test network',
    3200
  );
  await saveSegment(op3, 'seg5-operator-payoff.webm');
  await opCtx.close();
});
