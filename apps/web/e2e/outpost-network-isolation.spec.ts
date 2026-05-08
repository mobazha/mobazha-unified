/**
 * Outpost Network Isolation E2E
 *
 * Validates that the Outpost build makes zero third-party network requests.
 * All requests must go to the same origin (self) or be blocked.
 *
 * This test is designed to run against an Outpost-built frontend served locally.
 * It intercepts all network requests and asserts none go to external domains.
 */
import { test, expect } from '@playwright/test';

const ALLOWED_ORIGINS = new Set<string>();

const BLOCKED_DOMAINS = [
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'cdn.jsdelivr.net',
  'telegram.org',
  'js.stripe.com',
  'discord.com',
  'app.mobazha.org',
  'reown.com',
  'walletconnect.com',
  'walletconnect.org',
  'infura.io',
  'alchemy.com',
  'ankr.com',
  'google-analytics.com',
  'googletagmanager.com',
  'facebook.net',
  'sentry.io',
];

function isThirdParty(url: string, pageOrigin: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'data:' || parsed.protocol === 'blob:') return false;
    if (parsed.origin === pageOrigin) return false;
    if (ALLOWED_ORIGINS.has(parsed.origin)) return false;
    return true;
  } catch {
    return false;
  }
}

function resolveOrigin(page: { url: () => string }, baseURL?: string): string {
  const raw = page.url();
  if (raw && raw !== 'about:blank') {
    try {
      return new URL(raw).origin;
    } catch {
      /* fall through */
    }
  }
  if (baseURL) {
    try {
      return new URL(baseURL).origin;
    } catch {
      /* fall through */
    }
  }
  return 'http://localhost:3000';
}

test.describe('Outpost Network Isolation', () => {
  test('homepage makes zero third-party requests', async ({ page, baseURL }) => {
    const thirdPartyRequests: string[] = [];

    page.on('request', request => {
      const url = request.url();
      if (isThirdParty(url, resolveOrigin(page, baseURL))) {
        thirdPartyRequests.push(url);
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    expect(thirdPartyRequests).toEqual([]);
  });

  test('admin login page makes zero third-party requests', async ({ page, baseURL }) => {
    const thirdPartyRequests: string[] = [];

    page.on('request', request => {
      const url = request.url();
      if (isThirdParty(url, resolveOrigin(page, baseURL))) {
        thirdPartyRequests.push(url);
      }
    });

    await page.goto('/admin');
    await page.waitForLoadState('networkidle');

    expect(thirdPartyRequests).toEqual([]);
  });

  test('guest checkout page makes zero third-party requests', async ({ page, baseURL }) => {
    const thirdPartyRequests: string[] = [];

    page.on('request', request => {
      const url = request.url();
      if (isThirdParty(url, resolveOrigin(page, baseURL))) {
        thirdPartyRequests.push(url);
      }
    });

    await page.goto('/guest-checkout');
    await page.waitForLoadState('networkidle');

    expect(thirdPartyRequests).toEqual([]);
  });

  test('track order page makes zero third-party requests', async ({ page, baseURL }) => {
    const thirdPartyRequests: string[] = [];

    page.on('request', request => {
      const url = request.url();
      if (isThirdParty(url, resolveOrigin(page, baseURL))) {
        thirdPartyRequests.push(url);
      }
    });

    await page.goto('/track');
    await page.waitForLoadState('networkidle');

    expect(thirdPartyRequests).toEqual([]);
  });

  test('no blocked domains appear in any page load', async ({ page }) => {
    const blockedHits: string[] = [];

    page.on('request', request => {
      const url = request.url().toLowerCase();
      for (const domain of BLOCKED_DOMAINS) {
        if (url.includes(domain)) {
          blockedHits.push(`${domain} -> ${request.url()}`);
        }
      }
    });

    const pages = ['/', '/admin', '/guest-checkout', '/track', '/cart'];
    for (const p of pages) {
      await page.goto(p);
      await page.waitForLoadState('networkidle');
    }

    expect(blockedHits).toEqual([]);
  });
});
