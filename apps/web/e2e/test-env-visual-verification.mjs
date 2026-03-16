#!/usr/bin/env node
/**
 * Visual verification for test-new.mobazha.org
 * Run: node e2e/test-env-visual-verification.mjs
 */
import { chromium } from '@playwright/test';
import { mkdirSync } from 'fs';
import { join } from 'path';

const BASE_URL = 'https://test-new.mobazha.org';
const OUT_DIR = join(process.cwd(), 'e2e-screenshots', 'test-env-verification');
const USERNAME = 'admin';
const PASSWORD = 'mobazha2024';

mkdirSync(OUT_DIR, { recursive: true });

async function waitFor(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function performLogin(page) {
  // Wait for Casdoor redirect
  await page.waitForURL(
    (url) => url.toString().includes('oauth/authorize') || url.toString().includes('login'),
    { timeout: 15000 }
  );
  await waitFor(2000);
  await page.screenshot({ path: join(OUT_DIR, '01b-casdoor-login.png'), fullPage: true }).catch(() => {});

  // Casdoor may use input[name="username"] or input[type="text"] or placeholder
  const usernameInput =
    page.locator('input[name="username"]').first() ||
    page.locator('input[placeholder*="username" i], input[placeholder*="email" i], input[placeholder*="phone" i]').first() ||
    page.locator('input[type="text"]').first();
  await usernameInput.waitFor({ state: 'visible', timeout: 15000 });
  await usernameInput.fill(USERNAME);
  await page.locator('input[type="password"]').first().fill(PASSWORD);
  await page.getByRole('button', { name: /sign in|登录|log in/i }).first().click();

  await page.waitForURL(
    (url) => {
      const s = url.toString();
      return s.includes('test-new.mobazha.org') && !s.includes('oauth') && !s.includes('login/oauth');
    },
    { timeout: 60000 }
  );
  await waitFor(3000); // Wait for app to finish loading
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    ignoreHTTPSErrors: true,
    userAgent:
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });
  const page = await context.newPage();

  try {
    // Step 1: Homepage
    console.log('Step 1: Loading homepage...');
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await waitFor(2000);
    await page.screenshot({ path: join(OUT_DIR, '01-homepage.png'), fullPage: true });
    console.log('  -> 01-homepage.png');

    // Navigate to admin to trigger auth (will redirect to Casdoor if not logged in)
    await page.goto(`${BASE_URL}/admin/products`, { waitUntil: 'networkidle', timeout: 20000 });
    await waitFor(2000);

    const url = page.url();
    if (url.includes('oauth') || url.includes('login')) {
      console.log('Step 1b: Redirected to login, performing Casdoor login...');
      await performLogin(page);
      await page.screenshot({ path: join(OUT_DIR, '02-after-login.png'), fullPage: true });
      console.log('  -> 02-after-login.png');
    } else {
      await page.screenshot({ path: join(OUT_DIR, '02-after-login.png'), fullPage: true });
      console.log('  -> 02-after-login.png (already logged in)');
    }

    // Step 2: Admin Products (desktop 1280px)
    console.log('Step 2: Admin Products (desktop)...');
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`${BASE_URL}/admin/products`, { waitUntil: 'networkidle', timeout: 30000 });
    await waitFor(3000);
    await page.screenshot({ path: join(OUT_DIR, '03-admin-products-desktop.png'), fullPage: true });
    console.log('  -> 03-admin-products-desktop.png');

    // Step 3: Admin Products (mobile 375x812)
    console.log('Step 3: Admin Products (mobile)...');
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${BASE_URL}/admin/products`, { waitUntil: 'networkidle', timeout: 30000 });
    await waitFor(3000);
    await page.screenshot({ path: join(OUT_DIR, '04-admin-products-mobile.png'), fullPage: true });
    console.log('  -> 04-admin-products-mobile.png');

    // Step 4: New listing
    console.log('Step 4: New listing page...');
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`${BASE_URL}/listing/new`, { waitUntil: 'networkidle', timeout: 30000 });
    await waitFor(3000);
    await page.screenshot({ path: join(OUT_DIR, '05-listing-new.png'), fullPage: true });
    console.log('  -> 05-listing-new.png');

    // Step 5: Discounts
    console.log('Step 5: Discount management...');
    await page.goto(`${BASE_URL}/admin/discounts`, { waitUntil: 'networkidle', timeout: 30000 });
    await waitFor(3000);
    await page.screenshot({ path: join(OUT_DIR, '06-admin-discounts.png'), fullPage: true });
    console.log('  -> 06-admin-discounts.png');

    console.log('\nDone. Screenshots in e2e-screenshots/test-env-verification/');
  } catch (err) {
    console.error('Error:', err.message);
    await page.screenshot({ path: join(OUT_DIR, 'error.png'), fullPage: true }).catch(() => {});
  } finally {
    await browser.close();
  }
}

main();
