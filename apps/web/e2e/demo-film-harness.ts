// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import {
  expect,
  type Browser,
  type BrowserContext,
  type Locator,
  type Page,
} from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const ANVIL = 'http://localhost:18545';

export interface DemoPersona {
  label: string;
  accent: string;
}

declare global {
  interface Window {
    __demoFilmInstalled?: boolean;
    __demoFilmPrecoverStop?: () => void;
  }
}

const OVERLAY_INIT = `
(() => {
  if (window.__demoFilmInstalled) return;
  window.__demoFilmInstalled = true;
  const css = \`
    #demo-film-chip{position:fixed;left:32px;bottom:32px;z-index:2147483647;pointer-events:none;max-width:540px;background:rgba(15,23,42,.95);color:#fff;padding:14px 20px;border-radius:14px;border-left:5px solid var(--demo-accent,#059669);font-family:system-ui,-apple-system,sans-serif;box-shadow:0 10px 34px rgba(0,0,0,.45);opacity:0;transition:opacity .3s ease}
    #demo-film-chip.on{opacity:1} #demo-film-chip .persona{font:600 12px/1 system-ui;letter-spacing:.06em;text-transform:uppercase;color:var(--demo-accent,#059669);margin-bottom:6px} #demo-film-chip .title{font:700 20px/1.25 system-ui;margin-bottom:4px} #demo-film-chip .support{font:400 14px/1.45 system-ui;color:#cbd5e1}
    #demo-film-card{position:fixed;inset:0;z-index:2147483646;pointer-events:none;background:#0f172a;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;font-family:system-ui,-apple-system,sans-serif;opacity:0;transition:opacity .35s ease;padding:0 12vw}
    #demo-film-card.on{opacity:1} #demo-film-card .big{font:700 48px/1.3 system-ui;white-space:pre-line} #demo-film-card .small{font:400 20px/1.5 system-ui;color:#94a3b8;margin-top:18px}
  \`;
  const ensure = () => {
    const root = document.documentElement;
    if (!root) return;
    if (!document.getElementById('demo-film-style')) { const s=document.createElement('style'); s.id='demo-film-style'; s.textContent=css; root.appendChild(s); }
    if (!document.getElementById('demo-film-card')) { const d=document.createElement('div'); d.id='demo-film-card'; d.innerHTML='<div class="big"></div><div class="small"></div>'; root.appendChild(d); }
    if (!document.getElementById('demo-film-chip')) { const d=document.createElement('div'); d.id='demo-film-chip'; d.innerHTML='<div class="persona"></div><div class="title"></div><div class="support"></div>'; root.appendChild(d); }
  };
  ensure();
  new MutationObserver(ensure).observe(document, { childList:true, subtree:true });
})();
`;

export const PRECOVER_INIT = `
(() => {
  const shell = '<div data-film-transition style="max-width:920px;padding:0 72px;text-align:center;font-family:system-ui,-apple-system,sans-serif;color:#fff"><div data-film-title style="font:700 36px/1.25 system-ui;white-space:pre-line"></div><div data-film-support style="font:400 18px/1.5 system-ui;color:#94a3b8;margin-top:14px"></div></div>';
  const readTransition = () => {
    try { return JSON.parse(sessionStorage.getItem('__demoFilmTransition') || 'null'); } catch (_) { return null; }
  };
  const consumeTransition = () => {
    try {
      sessionStorage.removeItem('__demoFilmTransition');
      sessionStorage.setItem('__demoFilmTransitionConsumed', '1');
    } catch (_) {}
  };
  const paint = (d) => {
    const payload = readTransition();
    const title = payload && payload.title ? String(payload.title) : '';
    const support = payload && payload.support ? String(payload.support) : '';
    if (!d.querySelector('[data-film-transition]')) d.innerHTML = shell;
    const titleEl = d.querySelector('[data-film-title]');
    const supportEl = d.querySelector('[data-film-support]');
    if (titleEl && titleEl.textContent !== title) titleEl.textContent = title;
    if (supportEl && supportEl.textContent !== support) supportEl.textContent = support;
    // One-shot: after the labeled floor paints, never re-inject on SPA remounts.
    if (title || support) consumeTransition();
  };
  const put = () => {
    if (!document.documentElement || document.getElementById('demo-film-precover')) return;
    const payload = readTransition();
    const hasLabel = !!(payload && payload.title);
    const d = document.createElement('div');
    d.id = 'demo-film-precover';
    // Labeled floors (hook) paint immediately. Silent PRECOVER stays invisible —
    // armCover() raises it intentionally; otherwise warm navigations must not
    // become multi-second blank pages.
    d.style.cssText = 'position:fixed;inset:0;z-index:2147483645;background:#0f172a;pointer-events:none;transition:opacity .18s ease;opacity:' + (hasLabel ? '1' : '0') + ';display:flex;align-items:center;justify-content:center';
    d.innerHTML = shell;
    paint(d);
    document.documentElement.appendChild(d);
  };
  put();
  // Only recreate the floor if something removed it — never rewrite on every DOM tick.
  const observer = new MutationObserver(() => {
    if (!document.getElementById('demo-film-precover')) put();
  });
  observer.observe(document, { childList:true, subtree:true });
  window.__demoFilmPrecoverStop = () => {
    observer.disconnect();
    try {
      sessionStorage.removeItem('__demoFilmTransition');
      sessionStorage.setItem('__demoFilmTransitionConsumed', '1');
    } catch (_) {}
    const d = document.getElementById('demo-film-precover');
    if (d) { d.style.opacity = '0'; setTimeout(() => d.remove(), 400); }
  };
})();
`;

export async function createRecordedContext(
  browser: Browser,
  outDir: string,
  scale = 1.08
): Promise<BrowserContext> {
  fs.mkdirSync(outDir, { recursive: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: { dir: outDir, size: { width: 1920, height: 1080 } },
  });
  await context.addInitScript(OVERLAY_INIT);
  await context.addInitScript(value => {
    document.documentElement.style.zoom = String(value);
  }, scale);
  return context;
}

export async function loginRecordedContext(
  browser: Browser,
  outDir: string,
  username: string,
  scale = 1.08,
  warmUrl = '/'
): Promise<BrowserContext> {
  const context = await createRecordedContext(browser, outDir, scale);
  const warm = await context.newPage();
  await warm.goto(warmUrl, { waitUntil: 'domcontentloaded' });
  await warm.waitForLoadState('domcontentloaded');
  await warm.waitForTimeout(500);
  const hasToken = await warm
    .evaluate(() => Boolean(window.localStorage.getItem('mobazha_auth_token')))
    .catch(() => false);
  if (!hasToken) {
    await warm.goto('/login', { waitUntil: 'domcontentloaded' }).catch(async error => {
      if (!(error instanceof Error) || !error.message.includes('net::ERR_ABORTED')) throw error;
      await warm.waitForURL(url => url.pathname === '/login', { timeout: 30000 });
    });
    const standalone = warm.getByTestId('login-standalone-buyer');
    if (await standalone.isVisible({ timeout: 5000 }).catch(() => false)) await standalone.click();
    await warm.waitForTimeout(500);
    await warm.getByRole('textbox', { name: /username|email/i }).fill(username);
    await warm.getByRole('textbox', { name: /password/i }).fill('123');
    await warm.getByRole('button', { name: /sign in/i }).click();
    await warm.waitForURL(url => url.origin === 'http://localhost:3000', { timeout: 60000 });
  }
  await expect
    .poll(
      () =>
        warm.evaluate(() => window.localStorage.getItem('mobazha_auth_token')).catch(() => null),
      {
        timeout: 30000,
      }
    )
    .toBeTruthy();
  await warm.close();
  return context;
}

export async function showCard(
  page: Page,
  big: string,
  small: string,
  holdMs = 3200
): Promise<void> {
  // Drop precover instantly so hook text is never double-painted (precover + card).
  await page.evaluate(
    ({ bigText, smallText }) => {
      window.__demoFilmPrecoverStop?.();
      const pre = document.getElementById('demo-film-precover');
      if (pre) pre.remove();
      const card = document.getElementById('demo-film-card');
      if (!card) return;
      (card.querySelector('.big') as HTMLElement).textContent = bigText;
      (card.querySelector('.small') as HTMLElement).textContent = smallText;
      card.classList.add('on');
    },
    { bigText: big, smallText: small }
  );
  await expect(page.locator('#demo-film-card')).toBeVisible();
  await page.waitForTimeout(Math.max(450, holdMs));
  await page.evaluate(() => document.getElementById('demo-film-card')?.classList.remove('on'));
  await page.waitForTimeout(450);
}

export async function showEndCard(
  page: Page,
  big: string,
  small: string,
  holdMs = 3200
): Promise<void> {
  await page.evaluate(
    ({ bigText, smallText }) => {
      document.getElementById('demo-film-chip')?.classList.remove('on');
      const card = document.getElementById('demo-film-card');
      if (!card) return;
      (card.querySelector('.big') as HTMLElement).textContent = bigText;
      (card.querySelector('.small') as HTMLElement).textContent = smallText;
      card.classList.add('on');
    },
    { bigText: big, smallText: small }
  );
  await expect(page.locator('#demo-film-card')).toBeVisible();
  await page.waitForTimeout(holdMs);
}

export async function showChapter(
  page: Page,
  number: number,
  persona: DemoPersona,
  title: string,
  support: string,
  holdMs = 1700
): Promise<void> {
  await page.evaluate(
    ({ n, personaLabel, accent, chapterTitle, chapterSupport }) => {
      const chip = document.getElementById('demo-film-chip');
      if (!chip) return;
      chip.style.setProperty('--demo-accent', accent);
      (chip.querySelector('.persona') as HTMLElement).textContent = personaLabel;
      (chip.querySelector('.title') as HTMLElement).textContent = `${n} · ${chapterTitle}`;
      (chip.querySelector('.support') as HTMLElement).textContent = chapterSupport;
      chip.classList.add('on');
    },
    {
      n: number,
      personaLabel: persona.label,
      accent: persona.accent,
      chapterTitle: title,
      chapterSupport: support,
    }
  );
  await expect(page.locator('#demo-film-chip')).toBeVisible();
  await page.waitForTimeout(holdMs);
}

export async function reveal(page: Page): Promise<void> {
  await page.evaluate(() => {
    window.__demoFilmPrecoverStop?.();
    try {
      sessionStorage.removeItem('__demoFilmTransition');
    } catch {
      /* ignore */
    }
    const d = document.getElementById('demo-film-precover') as HTMLElement | null;
    if (d) {
      d.style.transition = 'opacity .18s ease';
      d.style.opacity = '0';
      setTimeout(() => d.remove(), 200);
    }
  });
  await page.waitForTimeout(220);
}

/**
 * Persist transition copy for the *next* document load only.
 * Must be one-shot: a permanent addInitScript would re-stamp the same
 * full-screen copy on every later navigation (e.g. product click after hook).
 */
export async function primeTransition(page: Page, title: string, support: string): Promise<void> {
  await page.addInitScript(
    ({ titleText, supportText }) => {
      try {
        if (sessionStorage.getItem('__demoFilmTransitionConsumed') === '1') return;
      } catch {
        /* ignore */
      }
      sessionStorage.setItem(
        '__demoFilmTransition',
        JSON.stringify({ title: titleText, support: supportText })
      );
    },
    { titleText: title, supportText: support }
  );
}

/**
 * Raise the dark floor before an on-camera navigation so loading UI never
 * flashes. STYLE §5: same-persona cuts are a short silent dip — keep title/
 * support empty. Full-screen labeled cards are reserved for the opening hook
 * ({@link showCard}) and rare persona switches via {@link primeTransition}.
 */
export async function armCover(page: Page, title = '', support = ''): Promise<void> {
  await page.evaluate(
    ({ titleText, supportText }) => {
      if (titleText) {
        sessionStorage.setItem(
          '__demoFilmTransition',
          JSON.stringify({ title: titleText, support: supportText })
        );
        try {
          sessionStorage.removeItem('__demoFilmTransitionConsumed');
        } catch {
          /* ignore */
        }
      } else {
        try {
          sessionStorage.removeItem('__demoFilmTransition');
        } catch {
          /* ignore */
        }
      }
      // Hide chapter chip during silent dips so the floor is not a floating chip on void.
      if (!titleText) {
        document.getElementById('demo-film-chip')?.classList.remove('on');
      }
      let d = document.getElementById('demo-film-precover') as HTMLElement | null;
      if (!d) {
        d = document.createElement('div');
        d.id = 'demo-film-precover';
        d.style.cssText =
          'position:fixed;inset:0;z-index:2147483645;background:#0f172a;pointer-events:none;opacity:0;transition:opacity .22s ease;display:flex;align-items:center;justify-content:center';
        document.documentElement.appendChild(d);
      }
      d.innerHTML =
        '<div data-film-transition style="max-width:920px;padding:0 72px;text-align:center;font-family:system-ui,-apple-system,sans-serif;color:#fff"><div data-film-title style="font:700 36px/1.25 system-ui;white-space:pre-line"></div><div data-film-support style="font:400 18px/1.5 system-ui;color:#94a3b8;margin-top:14px"></div></div>';
      d.querySelector('[data-film-title]')!.textContent = titleText;
      d.querySelector('[data-film-support]')!.textContent = supportText;
      d.style.display = 'flex';
      d.style.alignItems = 'center';
      d.style.justifyContent = 'center';
      requestAnimationFrame(() => {
        d!.style.opacity = '1';
      });
    },
    { titleText: title, supportText: support }
  );
  // STYLE §5: silent same-persona dip ≈300ms — do not linger on empty black.
  await page.waitForTimeout(title ? 300 : 180);
}

/** Store-connect "Connecting…" can appear after navigation settles — poll briefly. */
export async function settleNoConnecting(page: Page): Promise<void> {
  await page
    .getByText(/^Connecting/)
    .waitFor({ state: 'hidden', timeout: 8000 })
    .catch(() => {});
  await page.waitForTimeout(150);
}

/**
 * Wait for destination content, then lift precover.
 * Caps any visible silent floor at ~350ms so slow loads never hold blank.
 */
export async function revealReady(page: Page, ready: Locator, timeout = 60000): Promise<void> {
  const cap = page.waitForTimeout(350).then(() => reveal(page));
  await Promise.race([
    expect(ready)
      .toBeVisible({ timeout })
      .then(() => reveal(page)),
    cap,
  ]);
  await expect(ready).toBeVisible({ timeout });
  await settleNoConnecting(page);
}

export async function focusOn(locator: Locator, holdMs = 1400): Promise<void> {
  await locator.scrollIntoViewIfNeeded();
  await expect(locator).toBeVisible({ timeout: 45000 });
  await locator.page().waitForTimeout(holdMs);
}

export async function saveSegment(page: Page, outDir: string, name: string): Promise<void> {
  const video = page.video();
  await page.close();
  if (!video) return;
  await video.saveAs(path.join(outDir, `${name}.webm`));
  await video.delete();
}

function asRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error(`${label} is not an object`);
  return value as Record<string, unknown>;
}

async function anvilRPC<T>(method: string, params: unknown[]): Promise<T> {
  const response = await fetch(ANVIL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  const payload = asRecord((await response.json()) as unknown, method);
  if (payload.error) throw new Error(`${method}: ${JSON.stringify(payload.error)}`);
  return payload.result as T;
}

export async function fundAddressOnAnvil(address: string, decimalAmount: string): Promise<string> {
  const [whole, fraction = ''] = decimalAmount.trim().split('.');
  const wei =
    BigInt(whole) * BigInt(10) ** BigInt(18) + BigInt(fraction.padEnd(18, '0').slice(0, 18) || '0');
  const accounts = await anvilRPC<string[]>('eth_accounts', []);
  const from = accounts[1] ?? accounts[0];
  if (!from) throw new Error('Anvil returned no funded account');
  const txHash = await anvilRPC<string>('eth_sendTransaction', [
    { from, to: address, value: `0x${wei.toString(16)}` },
  ]);
  await expect
    .poll(() => anvilRPC<unknown>('eth_getTransactionReceipt', [txHash]), { timeout: 30000 })
    .not.toBeNull();
  return txHash;
}
