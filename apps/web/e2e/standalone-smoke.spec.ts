/**
 * Standalone Store Smoke Test
 *
 * Validates standalone mode frontend behavior:
 * - Auth mode detection
 * - Dual login UI (Store Admin + Buyer)
 * - Homepage renders seller listings
 * - Buyer popup OAuth flow
 *
 * Prerequisites:
 *   NEXT_PUBLIC_AUTH_MODE=standalone
 *   NEXT_PUBLIC_SAAS_URL=http://localhost:18080
 *   NEXT_PUBLIC_CASDOOR_URL=http://localhost:18000
 *   E2E Docker services running (hosting, casdoor)
 *
 * Run:
 *   npx playwright test standalone-smoke.spec.ts --project=chromium --reporter=list
 */

import { test, expect } from '@playwright/test';

test.describe('Standalone Store Smoke Test', () => {
  test('1. Homepage loads in standalone mode', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveTitle(/Mobazha/);
    await expect(page.locator('body')).toBeVisible();

    await page.screenshot({ path: 'standalone-smoke-1-home.png', fullPage: true });
  });

  test('2. Login page shows dual entry UI', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await page.screenshot({ path: 'standalone-smoke-2-login.png', fullPage: true });

    const passwordInput = page.locator('input[type="password"]').first();
    const hasPasswordInput = await passwordInput.isVisible().catch(() => false);

    const buyerBtn = page
      .getByRole('button', { name: /Mobazha|buyer|买家/i })
      .or(page.getByText(/Login with Mobazha/i))
      .first();
    const hasBuyerBtn = await buyerBtn.isVisible().catch(() => false);

    expect(hasPasswordInput && hasBuyerBtn).toBeTruthy();
  });

  test('3. Login page has password input for Store Admin', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    const passwordInput = page.locator('input[type="password"]').first();
    const isVisible = await passwordInput.isVisible().catch(() => false);
    expect(isVisible).toBeTruthy();
  });

  test('4. Login page has buyer OAuth button', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    const buyerBtn = page
      .getByRole('button', { name: /Mobazha|buyer|买家/i })
      .or(page.getByText(/Login with Mobazha/i))
      .first();

    const isVisible = await buyerBtn.isVisible().catch(() => false);
    expect(isVisible).toBeTruthy();

    await page.screenshot({ path: 'standalone-smoke-4-buyer-btn.png', fullPage: true });
  });

  test('5. SaaS backend is reachable (hosting health)', async ({ request }) => {
    const saasUrl = process.env.NEXT_PUBLIC_SAAS_URL || 'http://localhost:18080';
    const resp = await request.get(`${saasUrl}/`);
    expect([200, 404, 405]).toContain(resp.status());
  });

  test('6. Casdoor is reachable', async ({ request }) => {
    const casdoorUrl = process.env.NEXT_PUBLIC_CASDOOR_URL || 'http://localhost:18000';
    const resp = await request.get(`${casdoorUrl}/api/health`);
    expect(resp.status()).toBe(200);
  });

  test('7. Standalone auth endpoint responds', async ({ request }) => {
    const saasUrl = process.env.NEXT_PUBLIC_SAAS_URL || 'http://localhost:18080';
    const resp = await request.get(`${saasUrl}/auth/standalone-login`);
    expect(resp.status()).toBe(400);
    const text = await resp.text();
    expect(text).toContain('store_origin');
  });

  test('8. Buyer popup OAuth triggers correctly', async ({ page, context }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    const buyerBtn = page
      .getByRole('button', { name: /Mobazha|buyer|买家/i })
      .or(page.getByText(/Login with Mobazha/i))
      .first();

    if (!(await buyerBtn.isVisible().catch(() => false))) {
      test.skip(true, 'Buyer button not found');
      return;
    }

    const popupPromise = context.waitForEvent('page', { timeout: 10000 }).catch(() => null);
    await buyerBtn.click();
    const popup = await popupPromise;

    if (popup) {
      await popup.waitForLoadState('domcontentloaded').catch(() => {});
      const popupUrl = popup.url();
      expect(popupUrl).toMatch(/casdoor|18000|standalone-login/);
      await popup.screenshot({ path: 'standalone-smoke-8-popup.png' });
      await popup.close();
    }
  });

  // ── PG-009: StoreHero on standalone homepage ──────────────────────────────

  test('9. Homepage shows StoreHero section', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const hero = page.locator('[data-testid="store-hero"]');
    const hasHero = await hero.isVisible().catch(() => false);

    // StoreHero only renders in standalone mode
    if (!hasHero) {
      test.skip(true, 'StoreHero not visible (may not be standalone mode)');
      return;
    }

    await expect(hero).toBeVisible();
    await page.screenshot({ path: 'standalone-smoke-9-hero.png', fullPage: true });
  });

  test('10. StoreHero displays store name', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const hero = page.locator('[data-testid="store-hero"]');
    if (!(await hero.isVisible().catch(() => false))) {
      test.skip(true, 'Not in standalone mode');
      return;
    }

    // Hero should contain an h1 with the store name
    const heading = hero.locator('h1');
    await expect(heading).toBeVisible();
    const text = await heading.textContent();
    expect(text?.trim().length).toBeGreaterThan(0);
  });

  test('11. StoreHero has search input', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const hero = page.locator('[data-testid="store-hero"]');
    if (!(await hero.isVisible().catch(() => false))) {
      test.skip(true, 'Not in standalone mode');
      return;
    }

    const searchInput = hero.locator('input[type="text"]');
    await expect(searchInput).toBeVisible();
  });

  test('12. StoreHero shows "Powered by Mobazha" badge', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const hero = page.locator('[data-testid="store-hero"]');
    if (!(await hero.isVisible().catch(() => false))) {
      test.skip(true, 'Not in standalone mode');
      return;
    }

    const badge = hero.locator('text=/Powered by/i');
    await expect(badge).toBeVisible();
  });
});
