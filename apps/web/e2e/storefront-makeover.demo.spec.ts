// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

/**
 * Demo 0004 — Storefront Makeover.
 *
 * Shot list & copy: mobazha_hosting docs/demos/0004-storefront-makeover/demo.md
 * Style authority:  mobazha_hosting docs/demos/STYLE.md
 *
 * Records five short segments (per-page videos) to be concatenated in order:
 *   seg1 public  ch1    native-density generic before
 *   seg2 seller  ch2-3 template + brand → curated products/story → share link
 *   seg3 guest   ch4    exact unpublished draft at native density
 *   seg4 seller  ch5    clean publish summary → confirm
 *   seg5 public  payoff matched native-density after → end card
 *
 * Login happens OFF CAMERA on a throwaway warm page; the seller peer ID
 * comes from tests/e2e/demos/0004-storefront-makeover/seed.py via DEMO_*.
 */

import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { installDemoInterfaceScale } from './demo-recording-scale';

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
    __demoPrecoverDone?: boolean;
  }
}

const SELLER_PEER = process.env.DEMO_SELLER_PEER_ID || '';
const OUT_DIR = path.join(__dirname, '..', 'demo-output', 'storefront-makeover');
const TIMINGS_PATH = path.join(OUT_DIR, 'timings.json');

const trimSeconds: Record<string, number> = {};

const SCALE = { public: 1, editor: 1.08 } as const;

// Alice's brand, applied on camera (leather-and-steel warmth).
const BRAND = {
  bg: '#faf7f2',
  text: '#1c1917',
  cta: 'Shop cold storage', // renders as the header button on the live page
  aboutText:
    'We test every case, plate and mat against real cold-storage workflows — gear that protects keys, not just looks.',
  // Substrings, apostrophe-safe: picker rows are matched by getByText.
  featuredPicks: ['Titan Leather', 'Steel Seed', 'Desk Mat XL'],
};

const PERSONA = {
  seller: { label: 'Seller · Alice', accent: '#d97706' },
  buyer: { label: 'Guest · Preview link', accent: '#059669' },
} as const;

// ─── Self-healing overlay (same harness as demos 0001/0003) ──────────

const OVERLAY_INIT = `
(() => {
  if (window.__demoOverlayInstalled) return;
  window.__demoOverlayInstalled = true;
  const CSS = \`
    #demo-chip{position:fixed;left:32px;bottom:32px;z-index:2147483647;pointer-events:none;max-width:520px;background:rgba(15,23,42,.95);color:#fff;padding:14px 20px;border-radius:14px;border-left:5px solid var(--demo-accent,#d97706);font-family:system-ui,-apple-system,sans-serif;box-shadow:0 10px 34px rgba(0,0,0,.45);opacity:0;transition:opacity .3s ease}
    #demo-chip.on{opacity:1}
    #demo-chip .persona{font:600 12px/1 system-ui;letter-spacing:.06em;text-transform:uppercase;color:var(--demo-accent,#d97706);margin-bottom:6px}
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

// Opaque dark floor under the hook card, present from the first recorded
// frame; removed by fullCard once the hook has faded in above it.
const PRECOVER_INIT = `
(() => {
  const put = () => {
    if (window.__demoPrecoverDone) return; // removed once by fullCard — stay gone
    if (!document.documentElement || document.getElementById('demo-precover')) return;
    const d = document.createElement('div');
    d.id = 'demo-precover';
    d.style.cssText = 'position:fixed;inset:0;z-index:2147483645;background:#0f172a;pointer-events:none';
    document.documentElement.appendChild(d);
  };
  put();
  new MutationObserver(put).observe(document, { childList: true, subtree: true });
})();
`;

async function makeContext(
  browser: import('@playwright/test').Browser,
  interfaceScale: number = SCALE.public
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
  interfaceScale: number = SCALE.editor
): Promise<BrowserContext> {
  const context = await makeContext(browser, interfaceScale);
  const warm = await context.newPage();
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
    window.__demoPrecoverDone = true;
    document.getElementById('demo-precover')?.remove();
  });
  await page.waitForTimeout(Math.max(0, holdMs - 450));
  await page.evaluate(() => {
    if (window.__demoCardState) window.__demoCardState.on = false;
    document.getElementById('demo-card')?.classList.remove('on');
  });
  await page.waitForTimeout(450);
}

async function revealPage(page: Page) {
  await page.evaluate(() => {
    window.__demoPrecoverDone = true;
    document.getElementById('demo-precover')?.remove();
  });
  await page.waitForTimeout(350);
}

async function dwell(page: Page, ms = 1300) {
  await page.waitForTimeout(ms);
}

function markReadyForEdit(segment: string, startedAt: number, leadSeconds = 0.6) {
  trimSeconds[segment] = Math.max(0.5, (Date.now() - startedAt) / 1000 - leadSeconds);
  fs.writeFileSync(TIMINGS_PATH, `${JSON.stringify(trimSeconds, null, 2)}\n`);
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

test('Demo 0004: storefront makeover', async ({ browser }) => {
  test.setTimeout(600000);
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(TIMINGS_PATH, '{}\n');
  expect(SELLER_PEER, 'DEMO_SELLER_PEER_ID required (run seed.py)').toBeTruthy();

  // ── Segment 1 · The credible but generic before, at public 1.0× ──
  const beforeCtx = await makeContext(browser, SCALE.public);
  const before = await beforeCtx.newPage();
  const beforeStartedAt = Date.now();
  await before.addInitScript(PRECOVER_INIT);
  await before.goto(`/store/${SELLER_PEER}`);
  await expect(before.getByText(BRAND.featuredPicks[0]).first()).toBeVisible({ timeout: 45000 });
  // Frame the coherent catalog row before lifting the dark floor. This keeps
  // profile zero states out of shot and establishes a matched payoff frame.
  await before.getByText('Products', { exact: true }).first().scrollIntoViewIfNeeded();
  markReadyForEdit('seg1-before-store', beforeStartedAt, 0.45);
  await fullCard(
    before,
    'Your store is live.\nIt still looks like a template.',
    'Turn a catalog into a brand — without code.',
    3400
  );
  await chapter(
    before,
    1,
    'seller',
    'See the template problem',
    'Good products still look generic without a clear brand.'
  );
  await dwell(before, 3000);
  await saveSegment(before, 'seg1-before-store.webm');
  await beforeCtx.close();

  // ── Segment 2 · Seller: template + brand → curated story → private link ──
  const sellerCtx = await loginContext(browser, 'testuser1', '/admin/storefront');
  const seller = await sellerCtx.newPage();
  const sellerStartedAt = Date.now();
  await seller.addInitScript(PRECOVER_INIT);
  await seller.goto('/admin/storefront');
  const editor = seller.getByTestId('store-branding-editor');
  await expect(editor).toBeVisible({ timeout: 45000 });
  await expect(
    seller.getByTestId('section-list-editor').or(seller.getByTestId('theme-editor'))
  ).toBeVisible({ timeout: 30000 });
  markReadyForEdit('seg2-seller-studio', sellerStartedAt);

  // ch2 — one layout and a brand foundation.
  await chapter(
    seller,
    2,
    'seller',
    'Set the brand foundation',
    'One layout and palette create an identity in seconds.'
  );
  await revealPage(seller);
  await seller.getByTestId('use-template').click();
  const presetDialog = seller.getByRole('dialog');
  await expect(presetDialog).toBeVisible({ timeout: 10000 });
  await dwell(seller, 2200);
  await presetDialog.getByText('Ocean Blue', { exact: false }).first().click();
  // Replace-confirm dialog (the store already has a live layout).
  const applyBtn = seller.getByRole('button', { name: /apply|use|confirm/i }).last();
  if (await applyBtn.isVisible().catch(() => false)) {
    await dwell(seller, 600);
    await applyBtn.click();
  }
  await dwell(seller, 2000); // preview repaints with the full layout

  // Keep brand setup in the same beat: warm palette + readable page roles.
  await seller.getByRole('button', { name: /theme/i }).first().click();
  const colorsGroup = seller.getByTestId('theme-group-colors');
  const expanded = await colorsGroup.getAttribute('aria-expanded');
  if (expanded !== 'true') await colorsGroup.click();
  // The test id sits on the accordion trigger; palette buttons are siblings
  // inside the same section rather than descendants of the trigger.
  await colorsGroup.locator('..').getByRole('button', { name: /Earth/i }).click();
  await dwell(seller, 900);
  const roleBlock = seller.getByTestId('theme-role-colors');
  await roleBlock.scrollIntoViewIfNeeded();

  // Page background → warm paper.
  await seller.getByTestId('role-color-set-backgroundColor').click();
  const bgInput = roleBlock.locator('input[type="text"]').first();
  await bgInput.fill(BRAND.bg);
  await dwell(seller, 800);

  // Body text → the final accessible ink color. The warning walkthrough is
  // useful documentation, but not part of this business-value story.
  await seller.getByTestId('role-color-set-textColor').click();
  const textInput = roleBlock.locator('input[type="text"]').nth(1);
  await textInput.fill(BRAND.text);
  await expect(seller.getByTestId('contrast-warnings')).toBeHidden({ timeout: 10000 });
  await dwell(seller, 1400);

  // ch3 — make the sections hers. (Hero title/subtitle merge into the
  // profile header on the live page, so the film edits what buyers will
  // actually see: the CTA button, the featured picks, the brand story.)
  await chapter(
    seller,
    3,
    'seller',
    'Curate products and story',
    'Lead with three essentials and one reason to trust them.'
  );
  await seller
    .getByRole('button', { name: /sections/i })
    .first()
    .click();
  const sectionList = seller.getByTestId('section-list-editor');
  await expect(sectionList).toBeVisible({ timeout: 10000 });
  await dwell(seller, 1200);

  // Hero → the header's call-to-action button. TextInput labels aren't
  // for-associated, so locate by structure: the div whose direct-child
  // <label> names the field.
  await sectionList
    .locator('[data-list-section-id="ocean-hero"] button[aria-label="Expand"]')
    .click();
  const ctaInput = seller
    .locator('div:has(> label:text-is("CTA Text")) > input[type="text"]')
    .first();
  await ctaInput.waitFor({ state: 'visible', timeout: 10000 });
  await ctaInput.fill(BRAND.cta);
  await dwell(seller, 1500); // covers the 300ms debounce; preview repaints

  // Featured products → hand-picked gear instead of "newest".
  await sectionList
    .locator('[data-list-section-id="ocean-featured"] button[aria-label="Expand"]')
    .click();
  const modeSelect = seller.locator('div:has(> label:text-is("Mode")) > select').first();
  await modeSelect.waitFor({ state: 'visible', timeout: 10000 });
  await modeSelect.selectOption('manual');
  await dwell(seller, 900);
  await seller.getByTestId('open-product-picker').click();
  const picker = seller.getByTestId('resource-picker');
  await expect(picker).toBeVisible({ timeout: 15000 });
  const pickerSearch = seller.getByTestId('resource-picker-search');
  for (const pick of BRAND.featuredPicks) {
    await pickerSearch.fill(pick);
    await picker.getByText(pick, { exact: false }).first().click();
    await dwell(seller, 450);
  }
  await pickerSearch.fill('');
  await seller.getByTestId('resource-picker-confirm').click();
  await dwell(seller, 1200);

  // About → replace the template placeholder with her story.
  await sectionList
    .locator('[data-list-section-id="ocean-about"] button[aria-label="Expand"]')
    .click();
  const aboutText = seller.locator('div:has(> label:text-is("Text")) > textarea').first();
  await aboutText.waitFor({ state: 'visible', timeout: 10000 });
  await aboutText.fill(BRAND.aboutText);
  await dwell(seller, 1400);

  // Persist the draft before minting a preview link for it.
  await seller.getByTestId('save-draft').click();
  await dwell(seller, 1000);

  // End the curation beat by minting a real preview link for this draft.
  await seller.getByTestId('share-preview-open').click();
  const shareDialog = seller.getByTestId('share-preview-dialog');
  await expect(shareDialog).toBeVisible({ timeout: 15000 });
  const urlInput = seller.getByTestId('share-preview-url');
  await expect(urlInput).toBeVisible({ timeout: 15000 });
  const previewURL = await urlInput.inputValue();
  await dwell(seller, 1200);
  await seller.getByTestId('share-preview-copy').click();
  await dwell(seller, 1100);
  await seller.keyboard.press('Escape');
  await dwell(seller, 500);
  await saveSegment(seller, 'seg2-seller-studio.webm');

  expect(previewURL, 'share dialog must yield a preview URL').toContain('preview=');
  const previewPath = new URL(previewURL).pathname + new URL(previewURL).search;

  // ── Segment 3 · Guest: the exact private draft at public 1.0× ──
  const guestCtx = await makeContext(browser, SCALE.public);
  const guest = await guestCtx.newPage();
  const guestStartedAt = Date.now();
  await guest.addInitScript(PRECOVER_INIT);
  await guest.goto(previewPath);
  await expect(guest.getByTestId('draft-preview-banner')).toBeVisible({ timeout: 45000 });
  markReadyForEdit('seg3-guest-preview', guestStartedAt);
  await chapter(
    guest,
    4,
    'buyer',
    'Review the private draft',
    'The exact buyer experience, shared before it goes live.'
  );
  await revealPage(guest);
  await expect(guest.getByText(BRAND.cta).first()).toBeVisible({ timeout: 30000 });
  await dwell(guest, 1800);
  const previewFirstPick = guest.getByText(BRAND.featuredPicks[0]).first();
  await previewFirstPick.scrollIntoViewIfNeeded();
  await expect(previewFirstPick).toBeVisible({ timeout: 30000 });
  await dwell(guest, 2600);
  const previewStory = guest.getByText(BRAND.aboutText, { exact: false });
  await previewStory.scrollIntoViewIfNeeded();
  await expect(previewStory).toBeVisible();
  await dwell(guest, 2200);
  await saveSegment(guest, 'seg3-guest-preview.webm');
  await guestCtx.close();

  // ── Segment 4 · Seller: clean summary → publish ──
  const seller2 = await sellerCtx.newPage();
  const publishStartedAt = Date.now();
  await seller2.addInitScript(PRECOVER_INIT);
  await seller2.goto('/admin/storefront');
  await expect(seller2.getByTestId('store-branding-editor')).toBeVisible({ timeout: 45000 });
  markReadyForEdit('seg4-seller-publish', publishStartedAt);
  await chapter(
    seller2,
    5,
    'seller',
    'Publish one confident storefront',
    'The approved draft becomes the public store in one click.'
  );
  await revealPage(seller2);
  await seller2.getByTestId('publish').click();
  await expect(seller2.getByTestId('publish-summary')).toBeVisible({ timeout: 10000 });
  await dwell(seller2, 2500); // summary readable; no broken-reference notes
  await seller2.getByTestId('publish-confirm').click();
  await dwell(seller2, 2500); // success toast; draft badge clears
  await saveSegment(seller2, 'seg4-seller-publish.webm');
  await sellerCtx.close();

  // ── Segment 5 · Matched public after, at native 1.0× ──
  // The header CTA renders only for visitors (isOwnStore hides it), so the
  // money shot is taken from a logged-out context — which is also the honest
  // frame: this is literally what a buyer opening the store gets.
  const payoffCtx = await makeContext(browser, SCALE.public);
  const payoff = await payoffCtx.newPage();
  const payoffStartedAt = Date.now();
  await payoff.addInitScript(PRECOVER_INIT);
  await payoff.goto(`/store/${SELLER_PEER}`);
  await expect(payoff.getByText(BRAND.cta).first()).toBeVisible({ timeout: 45000 });
  await expect(payoff.getByTestId('draft-preview-banner')).toBeHidden();
  // Match chapter 1's product-row composition before revealing the page.
  const liveFirstPick = payoff.getByText(BRAND.featuredPicks[0]).first();
  await liveFirstPick.scrollIntoViewIfNeeded();
  await expect(liveFirstPick).toBeVisible({ timeout: 30000 });
  markReadyForEdit('seg5-live-payoff', payoffStartedAt, 0.45);
  await revealPage(payoff);
  await dwell(payoff, 4500);

  await fullCard(payoff, 'Mobazha', 'Your store, your brand. No code. · mobazha.org', 3200);
  await saveSegment(payoff, 'seg5-live-payoff.webm');
  await payoffCtx.close();
});
