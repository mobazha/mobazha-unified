#!/usr/bin/env node
/**
 * One-off visual verification for /admin/products
 * Run: node e2e/admin-products-visual.mjs
 * With login: E2E_TEST_USERNAME=xxx E2E_TEST_PASSWORD=xxx node e2e/admin-products-visual.mjs
 */
import { chromium } from '@playwright/test';
import { mkdirSync } from 'fs';
import { join } from 'path';

const BASE_URL = 'http://localhost:3001';
const OUT_DIR = join(process.cwd(), 'e2e', 'screenshots');
const TEST_USER = process.env.E2E_TEST_USERNAME || 'testuser1';
const TEST_PASS = process.env.E2E_TEST_PASSWORD || '123';
mkdirSync(OUT_DIR, { recursive: true });

async function performLogin(page) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle', timeout: 20000 });
  await page.waitForURL((url) => url.toString().includes('oauth/authorize') || url.toString().includes('/login'), {
    timeout: 15000,
  });
  const usernameInput = page.locator('input[type="text"]').first();
  await usernameInput.waitFor({ state: 'visible', timeout: 10000 });
  await usernameInput.fill(TEST_USER);
  await page.locator('input[type="password"]').first().fill(TEST_PASS);
  await page.getByRole('button', { name: /sign in|登录|log in/i }).first().click();
  await page.waitForURL(
    (url) => {
      const s = url.toString();
      return s.includes('localhost') && !s.includes('oauth') && !s.includes('/login');
    },
    { timeout: 60000 }
  );
  await page.waitForTimeout(2000);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    ignoreHTTPSErrors: true,
  });
  const page = await context.newPage();

  try {
    // Navigate to admin products (will redirect to login if not authenticated)
    let res = await page.goto(`${BASE_URL}/admin/products`, {
      waitUntil: 'networkidle',
      timeout: 15000,
    });
    await page.waitForTimeout(2000);

    let finalUrl = page.url();
    const isRedirected = !finalUrl.includes('/admin/products');

    if (isRedirected) {
      await page.screenshot({
        path: join(OUT_DIR, 'admin-products-redirected.png'),
        fullPage: true,
      });
      console.log('REDIRECTED to login. Screenshot: e2e/screenshots/admin-products-redirected.png');

      // Try login and retry
      if (TEST_PASS && TEST_PASS !== '') {
        console.log('Attempting login...');
        try {
          await performLogin(page);
          await page.goto(`${BASE_URL}/admin/products`, { waitUntil: 'networkidle', timeout: 15000 });
          await page.waitForTimeout(2000);
          finalUrl = page.url();
          if (finalUrl.includes('/admin/products')) {
            await page.screenshot({
              path: join(OUT_DIR, 'admin-products-page.png'),
              fullPage: true,
            });
            console.log('OK: Logged in, admin products page loaded.');
            console.log('Screenshot: e2e/screenshots/admin-products-page.png');
          }
        } catch (loginErr) {
          console.error('Login failed:', loginErr.message);
        }
      }
    } else {
      await page.screenshot({
        path: join(OUT_DIR, 'admin-products-page.png'),
        fullPage: true,
      });
      console.log('OK: admin products page loaded (already authenticated).');
      console.log('Screenshot: e2e/screenshots/admin-products-page.png');
    }

    console.log('Final status:', res?.status());
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await browser.close();
  }
}

main();
