/**
 * Layer B: Outpost Real Backend Smoke Tests
 *
 * Requires a running Outpost binary at OUTPOST_URL (default http://127.0.0.1:5102).
 * Tests Admin dashboard, profile/listing CRUD, buyer browsing, and guest checkout settings.
 *
 * NOTE: Outpost mode has NO /login route. Authentication is via Basic Auth token
 * injected into localStorage. The admin password is read from the Outpost data dir.
 *
 * Usage:
 *   OUTPOST_URL=http://127.0.0.1:5102 OUTPOST_PASSWORD=<admin_password> pnpm test:e2e:outpost:real
 */

import { test, expect, type Page } from '@playwright/test';
import { seedOutpostStore, waitForHealthy } from './fixtures/seed-outpost-store';

const OUTPOST_URL = process.env.OUTPOST_URL || 'http://127.0.0.1:5102';
const ADMIN_PASS = process.env.OUTPOST_PASSWORD || '';
const OUT = 'screenshots/outpost-real';

function basicAuth(): string {
  return 'Basic ' + Buffer.from(`admin:${ADMIN_PASS}`).toString('base64');
}

async function injectAuth(page: Page): Promise<void> {
  const token = `basic:${Buffer.from(`admin:${ADMIN_PASS}`).toString('base64')}`;
  await page.addInitScript((t: string) => {
    const userKey = 'mobazha-user-store';
    const existing = localStorage.getItem(userKey);
    let parsed: Record<string, unknown> = { state: {}, version: 0 };
    try {
      if (existing) parsed = JSON.parse(existing);
    } catch {
      /* empty */
    }
    const state = (parsed.state || {}) as Record<string, unknown>;
    state.token = t;
    state.isAuthenticated = true;
    state.user = {
      name: 'Outpost Admin',
      peerID: 'outpost-e2e-admin',
      role: 'admin',
    };
    parsed.state = state;
    localStorage.setItem(userKey, JSON.stringify(parsed));
  }, token);
}

test.describe.configure({ mode: 'serial' });

let seedOk = false;

test.beforeAll(async ({ request }) => {
  test.skip(!ADMIN_PASS, 'OUTPOST_PASSWORD not set — skip real backend tests');
  await waitForHealthy(OUTPOST_URL);
  const result = await seedOutpostStore(request, OUTPOST_URL, ADMIN_PASS);
  console.log('Seed result:', result);
  seedOk = result.setupOk && result.profileOk;

  const setupResp = await request.get(`${OUTPOST_URL}/v1/system/setup`);
  if (setupResp.ok()) {
    const body = await setupResp.json();
    const data = body.data ?? body;
    console.log('Setup status:', data.setupComplete ? 'COMPLETE' : 'INCOMPLETE');
  }
});

test.describe('Outpost Real Smoke — API Checks', () => {
  test('01 — Profile exists via API', async ({ request }) => {
    test.skip(!ADMIN_PASS, 'No password');
    const resp = await request.get(`${OUTPOST_URL}/v1/profiles`, {
      headers: { Authorization: basicAuth() },
    });
    expect(resp.ok()).toBeTruthy();
    const body = await resp.json();
    const profile = body.data ?? body;
    expect(profile.name).toBeTruthy();
  });

  test('02 — Guest checkout enabled via API', async ({ request }) => {
    test.skip(!ADMIN_PASS, 'No password');
    const resp = await request.get(`${OUTPOST_URL}/v1/settings/guest-checkout`, {
      headers: { Authorization: basicAuth() },
    });
    expect(resp.ok()).toBeTruthy();
    const body = await resp.json();
    const config = body.data ?? body;
    expect(config.enabled).toBe(true);
  });
});

test.describe('Outpost Real Smoke — Admin UI', () => {
  test('03 — Admin dashboard', async ({ page }) => {
    test.skip(!ADMIN_PASS, 'No password');
    await injectAuth(page);
    await page.goto('/admin');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `${OUT}/03-admin-dashboard.png`, fullPage: true });
  });

  test('04 — Admin products page', async ({ page }) => {
    test.skip(!ADMIN_PASS, 'No password');
    await injectAuth(page);
    await page.goto('/admin/products');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${OUT}/04-admin-products.png`, fullPage: true });
  });

  test('05 — Admin settings page', async ({ page }) => {
    test.skip(!ADMIN_PASS, 'No password');
    await injectAuth(page);
    await page.goto('/admin/settings');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${OUT}/05-admin-settings.png`, fullPage: true });
  });
});

test.describe('Outpost Real Smoke — Buyer Browsing', () => {
  test('06 — Store homepage (buyer view)', async ({ page }) => {
    test.skip(!ADMIN_PASS, 'No password');
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${OUT}/06-store-homepage.png`, fullPage: true });
  });

  test('07 — Cart page', async ({ page }) => {
    test.skip(!ADMIN_PASS, 'No password');
    await page.goto('/cart');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${OUT}/07-cart.png`, fullPage: true });
  });

  test('08 — Guest checkout page', async ({ page }) => {
    test.skip(!ADMIN_PASS, 'No password');
    await page.goto('/guest-checkout');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${OUT}/08-guest-checkout.png`, fullPage: true });
  });
});

test.describe('Outpost Real Smoke — Settings', () => {
  test('09 — General settings', async ({ page }) => {
    test.skip(!ADMIN_PASS, 'No password');
    await page.goto('/settings');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${OUT}/09-settings.png`, fullPage: true });
  });
});
