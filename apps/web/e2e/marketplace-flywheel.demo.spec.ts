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

// ─── Off-camera auth ────────────────────────────────────────────────
//
// Each persona logs in through the REAL Casdoor form on a throwaway page
// (its video segment is simply never used). The context keeps the session
// for every on-camera page that follows.

async function loginContext(
  browser: import('@playwright/test').Browser,
  username: string
): Promise<BrowserContext> {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: { dir: OUT_DIR, size: { width: 1920, height: 1080 } },
  });
  const warm = await context.newPage();
  await warm.goto('/operator/marketplaces');
  await warm.waitForLoadState('networkidle');
  if (warm.url().includes(':18000') || /casdoor|login/i.test(warm.url())) {
    await warm.getByRole('textbox', { name: /username|email/i }).fill(username);
    await warm.getByRole('textbox', { name: /password/i }).fill('123');
    await warm.getByRole('button', { name: /sign in/i }).click();
    await warm.waitForURL(/localhost:3000/, { timeout: 45000 });
    await warm.waitForLoadState('networkidle');
  }
  await warm.close();
  return context;
}

// ─── STYLE.md overlay system ────────────────────────────────────────

async function installOverlay(page: Page) {
  await page.addStyleTag({
    content: `
      #demo-chip {
        position: fixed; left: 32px; bottom: 32px; z-index: 2147483647;
        pointer-events: none; max-width: 560px;
        background: rgba(15,23,42,.94); color: #fff;
        padding: 16px 22px; border-radius: 14px;
        border-left: 5px solid var(--demo-accent, #7c3aed);
        font-family: system-ui, -apple-system, sans-serif;
        box-shadow: 0 10px 34px rgba(0,0,0,.4);
        opacity: 0; transition: opacity .3s ease;
      }
      #demo-chip.on { opacity: 1; }
      #demo-chip .persona {
        font: 600 12px/1 system-ui; letter-spacing: .06em; text-transform: uppercase;
        color: var(--demo-accent, #7c3aed); margin-bottom: 6px;
      }
      #demo-chip .title { font: 700 19px/1.25 system-ui; margin-bottom: 4px; }
      #demo-chip .support { font: 400 14px/1.45 system-ui; color: #cbd5e1; }
      #demo-card {
        position: fixed; inset: 0; z-index: 2147483646; pointer-events: none;
        background: #0f172a; color: #fff; display: flex; flex-direction: column;
        align-items: center; justify-content: center; text-align: center;
        font-family: system-ui, -apple-system, sans-serif;
        opacity: 0; transition: opacity .35s ease; padding: 0 12vw;
      }
      #demo-card.on { opacity: 1; }
      #demo-card .big { font: 700 44px/1.3 system-ui; white-space: pre-line; }
      #demo-card .small { font: 400 20px/1.5 system-ui; color: #94a3b8; margin-top: 18px; }
    `,
  });
  await page.evaluate(() => {
    if (!document.getElementById('demo-chip')) {
      const chip = document.createElement('div');
      chip.id = 'demo-chip';
      chip.innerHTML =
        '<div class="persona"></div><div class="title"></div><div class="support"></div>';
      document.body.appendChild(chip);
      const card = document.createElement('div');
      card.id = 'demo-card';
      card.innerHTML = '<div class="big"></div><div class="small"></div>';
      document.body.appendChild(card);
    }
  });
}

async function chapter(
  page: Page,
  n: number,
  persona: keyof typeof PERSONA,
  title: string,
  support: string
) {
  await installOverlay(page);
  await page.evaluate(
    ({ n, personaLabel, accent, title, support }) => {
      const chip = document.getElementById('demo-chip')!;
      chip.style.setProperty('--demo-accent', accent);
      chip.querySelector('.persona')!.textContent = personaLabel;
      chip.querySelector('.title')!.textContent = `${n} · ${title}`;
      chip.querySelector('.support')!.textContent = support;
      chip.classList.add('on');
    },
    { n, personaLabel: PERSONA[persona].label, accent: PERSONA[persona].accent, title, support }
  );
  await page.waitForTimeout(1800);
}

async function fullCard(page: Page, big: string, small: string, holdMs: number) {
  await installOverlay(page);
  await page.evaluate(
    ({ big, small }) => {
      const card = document.getElementById('demo-card')!;
      card.querySelector('.big')!.textContent = big;
      card.querySelector('.small')!.textContent = small;
      card.classList.add('on');
    },
    { big, small }
  );
  await page.waitForTimeout(holdMs);
  await page.evaluate(() => document.getElementById('demo-card')!.classList.remove('on'));
  await page.waitForTimeout(400);
}

async function dwell(page: Page, ms = 1400) {
  await page.waitForTimeout(ms);
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
  await op.waitForLoadState('networkidle');

  // HOOK — the pain, in the viewer's words.
  await fullCard(
    op,
    'Your community buys what you recommend.\nYou earn nothing.',
    'Until now — meet marketplace operator commissions.',
    3200
  );

  // CH1 create
  await chapter(op, 1, 'operator', 'Create your marketplace', 'Pick how it starts: curated and invite-only.');
  await op.getByRole('button', { name: /create marketplace/i }).first().click();
  await dwell(op, 900);
  await op.getByRole('textbox', { name: /^name/i }).fill(MARKET_NAME);
  await dwell(op, 700);
  await op.locator('[data-testid="create-mode-invite"]').click();
  await dwell(op, 900);
  await op.getByRole('button', { name: /create and configure|create & configure|configure/i }).last().click();
  await op.waitForURL(/operator\/marketplaces\/.+/, { timeout: 30000 });
  await op.waitForLoadState('networkidle');
  await dwell(op, 1600);

  // CH2 commission rate
  await chapter(op, 2, 'operator', 'Set your commission', '10% on every order your market delivers.');
  await op.getByTestId('operator-tab-settings').click();
  await dwell(op, 900);
  const rate = op.getByTestId('operator-marketplace-commission-percent');
  await rate.scrollIntoViewIfNeeded();
  await rate.fill('10');
  await dwell(op, 1200);
  await op.getByRole('button', { name: /save/i }).first().click();
  await dwell(op, 1600);

  // CH3 publish with zero sellers
  await chapter(op, 3, 'operator', 'Publish before recruiting', 'A live URL is your best recruiting asset.');
  await op.getByTestId('operator-tab-overview').click();
  await dwell(op, 900);
  await op.getByRole('button', { name: /publish/i }).first().click();
  await dwell(op, 2200);

  // CH4 invite link
  await chapter(op, 4, 'operator', 'Invite sellers with one link', 'No forms, no back-and-forth.');
  await op.getByTestId('operator-tab-sellers').click();
  await dwell(op, 900);
  const invitePanel = op.getByTestId('operator-invite-link-panel');
  await invitePanel.scrollIntoViewIfNeeded();
  await invitePanel.getByTestId('invite-link-auto-approve').click();
  await dwell(op, 700);
  await invitePanel.getByTestId('invite-link-create').click();
  await expect(invitePanel.getByTestId('invite-links-list')).toBeVisible({ timeout: 15000 });
  await dwell(op, 1800);
  const inviteUrl = await invitePanel.locator('.font-mono').first().textContent();
  expect(inviteUrl).toContain('/join/marketplace/');
  await saveSegment(op, 'seg1-operator-setup.webm');

  // ── Segment 2 · Seller: invite landing → join ──
  const sellerCtx = await loginContext(browser, 'testuser3');
  const seller = await sellerCtx.newPage();
  await seller.goto(inviteUrl!.trim());
  await seller.waitForLoadState('networkidle');
  await chapter(seller, 5, 'seller', 'Join in one step', 'The terms — including the 10% — are on the invitation.');
  await expect(seller.getByTestId('invite-commission')).toHaveText(/10%/);
  await dwell(seller, 2000);
  await seller.getByTestId('invite-accept').click();
  await expect(seller.getByTestId('invite-result')).toBeVisible({ timeout: 20000 });
  await dwell(seller, 2200);
  await saveSegment(seller, 'seg2-seller-join.webm');
  await sellerCtx.close();

  // ── Segment 3 · Operator: curate → republish → share ──
  const op2 = await opCtx.newPage();
  await op2.goto('/operator/marketplaces');
  await op2.waitForLoadState('networkidle');
  await op2.getByText(MARKET_NAME).first().click();
  await op2.waitForURL(/operator\/marketplaces\/.+/);
  await op2.waitForLoadState('networkidle');
  await chapter(op2, 6, 'operator', 'Curate and share', 'Your storefront, your picks, your link.');
  await op2.getByTestId('operator-tab-curation').click();
  await dwell(op2, 1200);
  // Feature the seller's hero product via the curation panel.
  const curation = op2.locator('[data-testid*="curation"], [class*=Curation]').first();
  await curation.scrollIntoViewIfNeeded().catch(() => {});
  // Panel interaction differs by build; the rehearsal fixes exact selectors.
  await dwell(op2, 1500);
  // Republish + share from overview.
  await op2.getByTestId('operator-tab-overview').click();
  await dwell(op2, 800);
  const publishAgain = op2.getByRole('button', { name: /publish/i }).first();
  if (await publishAgain.isVisible().catch(() => false)) {
    await publishAgain.click();
    await dwell(op2, 1800);
  }
  const share = op2.getByTestId('operator-share-panel');
  await share.scrollIntoViewIfNeeded();
  await dwell(op2, 1000);
  await share.getByTestId('operator-share-copy-community').click();
  await dwell(op2, 1600);
  await saveSegment(op2, 'seg3-operator-share.webm');

  // ── Segment 4 · Buyer: arrive via share link (payment gated) ──
  const buyerCtx = await loginContext(browser, 'testuser2');
  const buyer = await buyerCtx.newPage();
  const shareUrl = `${SUB_ORIGIN}/?utm_source=operator_share&utm_medium=community&utm_campaign=${DEMO_SLUG}`;
  await buyer.goto(shareUrl);
  await buyer.waitForLoadState('networkidle');
  await chapter(buyer, 7, 'buyer', 'Buy through the market', 'A real order, paid on-chain.');
  await dwell(buyer, 2000);
  if (includePayment) {
    await buyer.getByText(HERO_TITLE).first().click();
    await buyer.waitForLoadState('networkidle');
    await dwell(buyer, 1500);
    await buyer.getByRole('button', { name: /buy now/i }).first().click();
    // Payment flow continues per rehearsal findings (ETH, same-currency).
    await dwell(buyer, 4000);
  }
  await saveSegment(buyer, 'seg4-buyer.webm');
  await buyerCtx.close();

  // ── Segment 5 · Operator: attribution + earnings payoff ──
  if (!includePayment) {
    // Rehearsal-only: stage one ledger row through the public API so the
    // payoff screens render. The real recording replaces this with the true
    // purchase from segment 4.
    const journeyID = crypto.randomUUID();
    const sellerPeer = process.env.DEMO_SELLER_PEER || '';
    const base = `${BACKEND}/platform/v1/public-marketplaces/${DEMO_SLUG}`;
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

  const op3 = await opCtx.newPage();
  await op3.goto('/operator/marketplaces');
  await op3.waitForLoadState('networkidle');
  await op3.getByText(MARKET_NAME).first().click();
  await op3.waitForURL(/operator\/marketplaces\/.+/);
  await op3.waitForLoadState('networkidle');
  await chapter(op3, 8, 'operator', 'Watch it come back', 'Every share, click, and sale — attributed and paid.');
  const earnings = op3.getByTestId('operator-earnings-card');
  await earnings.scrollIntoViewIfNeeded();
  await expect(earnings.getByTestId('operator-earnings-rate')).toHaveText(/10/);
  // PAYOFF hold — the frame people remember.
  await dwell(op3, 4200);

  // END CARD
  await fullCard(
    op3,
    'Mobazha',
    'Your community. Your market. Your cut. · mobazha.com · recorded on Mobazha test network',
    3000
  );
  await saveSegment(op3, 'seg5-operator-payoff.webm');
  await opCtx.close();
});
