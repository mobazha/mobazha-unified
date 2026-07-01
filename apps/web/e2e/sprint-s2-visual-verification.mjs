#!/usr/bin/env node
/**
 * Sprint S2 Visual Verification - localhost:3001 with mock auth
 * Run: node e2e/sprint-s2-visual-verification.mjs
 *
 * Uses addInitScript to inject localStorage + mock fetch for /v1/profiles
 * so restoreSession succeeds and onboarding is skipped.
 */
import { chromium } from '@playwright/test';
import { mkdirSync } from 'fs';
import { join } from 'path';

const BASE_URL = 'http://localhost:3001';
const OUT_DIR = join(process.cwd(), 'e2e-screenshots', 'sprint-s2');
mkdirSync(OUT_DIR, { recursive: true });

const MOCK_PROFILE = {
  peerID: 'QmTestPeerID123456789',
  name: 'Test Seller',
  handle: '@testseller',
  avatarHashes: { tiny: '', small: '', medium: '', large: '', original: '' },
  about: 'Test store for visual verification',
};

const ZUSTAND_STATE = {
  state: {
    profile: MOCK_PROFILE,
    isAuthenticated: true,
    isLoading: false,
    isSessionRestored: true,
    sessionExpired: false,
    token: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.mock',
    needsOnboarding: false,
  },
  version: 0,
};

async function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function setupMockAuth(page) {
  const profileJSON = JSON.stringify({ data: MOCK_PROFILE });
  const zustandStr = JSON.stringify(ZUSTAND_STATE);

  // Route: intercept profile API at network level (more reliable than fetch patch)
  const profileHandler = (route) => {
    if (route.request().method() === 'GET') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: profileJSON });
    }
    return route.continue();
  };
  await page.route(/\/v1\/profiles/, profileHandler);
  await page.route(/\/profiles\/me/, profileHandler);
  await page.route(/\/buyer-api\/v1\/profiles/, profileHandler);

  // addInitScript: inject localStorage before page loads
  await page.addInitScript(
    ({ zustand }) => {
      localStorage.setItem('mobazha_auth_token', 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.mock');
      localStorage.setItem('mobazha-user-storage', zustand);
    },
    { zustand: zustandStr }
  );
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    ignoreHTTPSErrors: true,
  });
  const page = await context.newPage();

  try {
    console.log('Setting up mock auth (addInitScript)...');
    await setupMockAuth(page);

    // Scene 1: Admin Products desktop 1280x800
    console.log('Scene 1: Admin Products (desktop 1280x800)...');
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`${BASE_URL}/admin/products`, { waitUntil: 'networkidle', timeout: 25000 });
    await page.waitForSelector('[data-testid="admin-products"], .border-border', { timeout: 10000 }).catch(() => {});
    await wait(2000);
    await page.screenshot({ path: join(OUT_DIR, '01-admin-products-desktop.png'), fullPage: true });
    console.log('  -> 01-admin-products-desktop.png');

    // Scene 2: Admin Products mobile 375x812
    console.log('Scene 2: Admin Products (mobile 375x812)...');
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${BASE_URL}/admin/products`, { waitUntil: 'networkidle', timeout: 20000 });
    await wait(3000);
    await page.screenshot({ path: join(OUT_DIR, '02-admin-products-mobile.png'), fullPage: true });
    console.log('  -> 02-admin-products-mobile.png');

    // Scene 3: New listing 1280x800
    console.log('Scene 3: New listing (1280x800)...');
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`${BASE_URL}/listing/new`, { waitUntil: 'networkidle', timeout: 20000 });
    await wait(3000);
    await page.screenshot({ path: join(OUT_DIR, '03-listing-new.png'), fullPage: true });
    console.log('  -> 03-listing-new.png');

    // Scene 4: Admin Discounts mobile 375x812
    console.log('Scene 4: Admin Discounts (mobile 375x812)...');
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${BASE_URL}/admin/discounts`, { waitUntil: 'networkidle', timeout: 20000 });
    await wait(3000);
    await page.screenshot({ path: join(OUT_DIR, '04-admin-discounts-mobile.png'), fullPage: true });
    console.log('  -> 04-admin-discounts-mobile.png');

    // Scene 5: Admin Collections mobile 375x812
    console.log('Scene 5: Admin Collections (mobile 375x812)...');
    await page.goto(`${BASE_URL}/admin/collections`, { waitUntil: 'networkidle', timeout: 20000 });
    await wait(3000);
    await page.screenshot({ path: join(OUT_DIR, '05-admin-collections-mobile.png'), fullPage: true });
    console.log('  -> 05-admin-collections-mobile.png');

    console.log('\nDone. Screenshots in e2e-screenshots/sprint-s2/');
  } catch (err) {
    console.error('Error:', err.message);
    await page.screenshot({ path: join(OUT_DIR, 'error.png'), fullPage: true }).catch(() => {});
  } finally {
    await browser.close();
  }
}

main();
