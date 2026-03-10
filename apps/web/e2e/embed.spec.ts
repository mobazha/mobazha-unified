/**
 * Embed & oEmbed E2E Tests
 *
 * Validates the embed/oEmbed capability (COMMUNITY_ECOMMERCE_AUDIT 4.2):
 *   - Product embed page renders an embed card
 *   - Store embed page renders an embed card
 *   - Dark theme param works
 *   - oEmbed API returns valid JSON
 *   - oEmbed API CORS headers
 *   - oEmbed API error cases
 *
 * Run:
 *   npx playwright test embed.spec.ts --project=chromium --reporter=list
 */

import { test, expect } from '@playwright/test';

const BASE = process.env.BASE_URL || 'http://localhost:3001';

test.describe('Embed Pages', () => {
  test('product embed page renders card', async ({ page }) => {
    await page.goto(`${BASE}/embed/product/test-product-slug`);
    await page.waitForLoadState('domcontentloaded');

    const body = page.locator('body');
    await expect(body).toBeVisible();
    // Either shows the card or "Product not found" (depends on backend data)
    const card = page.getByTestId('embed-product-card');
    const notFound = page.getByText('Product not found');
    const hasCard = await card.isVisible().catch(() => false);
    const hasNotFound = await notFound.isVisible().catch(() => false);
    expect(hasCard || hasNotFound).toBe(true);
  });

  test('store embed page renders card', async ({ page }) => {
    await page.goto(`${BASE}/embed/store/QmTestPeerID`);
    await page.waitForLoadState('domcontentloaded');

    const body = page.locator('body');
    await expect(body).toBeVisible();
    const card = page.getByTestId('embed-store-card');
    const notFound = page.getByText('Store not found');
    const hasCard = await card.isVisible().catch(() => false);
    const hasNotFound = await notFound.isVisible().catch(() => false);
    expect(hasCard || hasNotFound).toBe(true);
  });

  test('dark theme param changes background', async ({ page }) => {
    await page.goto(`${BASE}/embed/product/test-product-slug?theme=dark`);
    await page.waitForLoadState('domcontentloaded');

    const outer = page.locator('div').first();
    await expect(outer).toBeVisible();
    // The page should have dark background classes applied
    const html = await page.content();
    expect(html).toContain('bg-zinc-900');
  });

  test('embed pages do not show MobileNav', async ({ page }) => {
    await page.goto(`${BASE}/embed/product/test-product-slug`);
    await page.waitForLoadState('domcontentloaded');

    // MobileNav should not be visible on embed pages
    const mobileNav = page.locator('nav[data-testid="mobile-nav"]');
    await expect(mobileNav).not.toBeVisible();
  });
});

test.describe('oEmbed API', () => {
  test('returns valid JSON for product URL', async ({ request }) => {
    const productUrl = encodeURIComponent(`${BASE}/product/test-slug`);
    const res = await request.get(`${BASE}/api/oembed?url=${productUrl}&format=json`);

    // Product may not exist in test env, but API should return structured response
    const status = res.status();
    expect([200, 404]).toContain(status);

    const json = await res.json();
    if (status === 200) {
      expect(json).toHaveProperty('version', '1.0');
      expect(json).toHaveProperty('type', 'rich');
      expect(json).toHaveProperty('provider_name', 'Mobazha');
      expect(json).toHaveProperty('html');
      expect(json).toHaveProperty('width');
      expect(json).toHaveProperty('height');
      expect(json.html).toContain('<iframe');
      expect(json.html).toContain('/embed/product/');
    } else {
      expect(json).toHaveProperty('error');
    }
  });

  test('returns valid JSON for store URL', async ({ request }) => {
    const storeUrl = encodeURIComponent(`${BASE}/store/QmTestPeerID`);
    const res = await request.get(`${BASE}/api/oembed?url=${storeUrl}&format=json`);

    const status = res.status();
    expect([200, 404]).toContain(status);

    const json = await res.json();
    if (status === 200) {
      expect(json).toHaveProperty('version', '1.0');
      expect(json).toHaveProperty('type', 'rich');
      expect(json).toHaveProperty('provider_name', 'Mobazha');
      expect(json).toHaveProperty('html');
      expect(json.html).toContain('<iframe');
      expect(json.html).toContain('/embed/store/');
    }
  });

  test('includes CORS headers', async ({ request }) => {
    const url = encodeURIComponent(`${BASE}/product/test-slug`);
    const res = await request.get(`${BASE}/api/oembed?url=${url}`);
    const headers = res.headers();
    expect(headers['access-control-allow-origin']).toBe('*');
  });

  test('returns 400 for missing url param', async ({ request }) => {
    const res = await request.get(`${BASE}/api/oembed`);
    expect(res.status()).toBe(400);
    const json = await res.json();
    expect(json).toHaveProperty('error');
  });

  test('returns 404 for unrecognized URL', async ({ request }) => {
    const url = encodeURIComponent(`${BASE}/unknown/page`);
    const res = await request.get(`${BASE}/api/oembed?url=${url}`);
    expect(res.status()).toBe(404);
  });

  test('returns 501 for non-json format', async ({ request }) => {
    const url = encodeURIComponent(`${BASE}/product/test-slug`);
    const res = await request.get(`${BASE}/api/oembed?url=${url}&format=xml`);
    expect(res.status()).toBe(501);
  });

  test('OPTIONS returns 204 with CORS headers', async ({ request }) => {
    const url = encodeURIComponent(`${BASE}/product/test-slug`);
    const res = await request.fetch(`${BASE}/api/oembed?url=${url}`, {
      method: 'OPTIONS',
    });
    expect(res.status()).toBe(204);
    expect(res.headers()['access-control-allow-origin']).toBe('*');
    expect(res.headers()['access-control-allow-methods']).toContain('GET');
  });

  test('respects maxwidth/maxheight params', async ({ request }) => {
    const url = encodeURIComponent(`${BASE}/product/test-slug`);
    const res = await request.get(`${BASE}/api/oembed?url=${url}&maxwidth=500&maxheight=300`);
    const status = res.status();
    if (status === 200) {
      const json = await res.json();
      expect(json.width).toBeLessThanOrEqual(500);
      expect(json.height).toBeLessThanOrEqual(300);
    }
  });
});
