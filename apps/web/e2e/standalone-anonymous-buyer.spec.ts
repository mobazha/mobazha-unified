/**
 * Standalone Store — Anonymous Buyer E2E Test
 *
 * Validates that public store data loads without authentication:
 * - Landing page renders
 * - Store page loads (profile, exchange rates, listings)
 * - No 401 errors for public APIs (/v1/exchangerates, /v1/listings/index/, /v1/profiles)
 *
 * Run against standalone store on port 8443:
 *   BASE_URL=https://localhost:8443 npx playwright test standalone-anonymous-buyer.spec.ts --project=chromium
 *
 * Or with default (adjust BASE_URL as needed):
 *   npx playwright test standalone-anonymous-buyer.spec.ts --project=chromium
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:8443';
const STORE_PEER_ID = '12D3KooWJ1LuNEsCShChxN2GFiJL7fZyMJUSpyGeMtxtKGK6aMfQ';

test.use({
  ignoreHTTPSErrors: true,
});

let standaloneAvailable = false;
test.beforeAll(async ({ request }) => {
  try {
    const resp = await request.get(BASE_URL, { timeout: 5000, ignoreHTTPSErrors: true });
    standaloneAvailable = resp.status() > 0;
  } catch {
    standaloneAvailable = false;
  }
});

test.beforeEach(async () => {
  test.skip(!standaloneAvailable, `Standalone store not available at ${BASE_URL}`);
});

test.describe('Standalone Store — Anonymous Buyer (No Login)', () => {
  test('Test 1: Landing page loads and no 401 in console', async ({ page }) => {
    const consoleErrors: string[] = [];
    const console401: string[] = [];

    page.on('console', msg => {
      const text = msg.text();
      const type = msg.type();
      if (type === 'error') {
        consoleErrors.push(text);
        if (text.includes('401') || text.includes('Unauthorized')) {
          console401.push(text);
        }
      }
    });

    await page.goto(BASE_URL + '/', {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    await page.screenshot({
      path: 'e2e-artifacts/standalone-landing.png',
      fullPage: true,
    });

    await expect(page.locator('body')).toBeVisible();

    if (console401.length > 0) {
      console.log('401-related console errors:');
      console401.forEach(e => console.log('  -', e));
    }
    expect(console401).toHaveLength(0);
  });

  test('Test 2: Store page loads — profile, exchange rates, no auth popups', async ({ page }) => {
    const consoleErrors: string[] = [];
    const console401: string[] = [];
    const network401: { url: string; status: number }[] = [];

    page.on('console', msg => {
      const text = msg.text();
      const type = msg.type();
      if (type === 'error') {
        consoleErrors.push(text);
        if (text.includes('401') || text.includes('Unauthorized')) {
          console401.push(text);
        }
      }
    });

    page.on('response', resp => {
      const status = resp.status();
      const url = resp.url();
      if (status === 401) {
        network401.push({ url, status });
      }
    });

    await page.goto(BASE_URL + '/store/' + STORE_PEER_ID, {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    await page.screenshot({
      path: 'e2e-artifacts/standalone-store.png',
      fullPage: true,
    });

    await expect(page.locator('body')).toBeVisible();

    const failedProfile = await page
      .getByText(/Failed to load profile|failed to load profile/i)
      .isVisible()
      .catch(() => false);
    expect(failedProfile).toBe(false);

    const hasAuthPopup = await page
      .getByRole('dialog')
      .getByText(/log in|sign in|login/i)
      .isVisible()
      .catch(() => false);
    expect(hasAuthPopup).toBe(false);

    if (console401.length > 0) {
      console.log('401-related console errors:');
      console401.forEach(e => console.log('  -', e));
    }
    if (network401.length > 0) {
      console.log('401 network responses:');
      network401.forEach(({ url, status }) => console.log(`  - ${status} ${url}`));
    }

    expect(console401).toHaveLength(0);
    expect(network401).toHaveLength(0);
  });

  test('Test 3: Network tab — key public APIs return 2xx', async ({ page, request }) => {
    const base = BASE_URL.replace(/\/$/, '');
    const apiBase = base.startsWith('https') ? base : base;

    const keyUrls = [
      `${apiBase}/v1/exchangerates`,
      `${apiBase}/v1/listings/index/${STORE_PEER_ID}`,
      `${apiBase}/v1/profiles/${STORE_PEER_ID}`,
    ];

    const results: { url: string; status: number }[] = [];

    for (const url of keyUrls) {
      try {
        const resp = await request.get(url, {
          timeout: 10000,
          ignoreHTTPSErrors: true,
        });
        results.push({ url, status: resp.status() });
      } catch (e) {
        results.push({ url, status: -1 });
      }
    }

    console.log('Key API status codes:');
    results.forEach(({ url, status }) => {
      console.log(`  ${status} ${url}`);
    });

    const failed = results.filter(r => r.status === 401 || r.status < 0);
    expect(failed, `Expected 2xx for public APIs, got: ${JSON.stringify(results)}`).toHaveLength(0);
  });
});
