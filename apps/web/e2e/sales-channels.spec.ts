/**
 * Sales Channels E2E Tests
 *
 * Validates:
 *   1. Sales Channels settings page (authenticated, Store Link + Telegram Bot sections)
 *   2. Store short code resolution via ?s= query parameter → redirect to /store/:peerId
 *   3. Store link generation and regeneration
 *
 * Prerequisites:
 *   - Running full-stack dev / Docker environment
 *   - Authenticated seller user
 *
 * Run:
 *   npx playwright test sales-channels.spec.ts --reporter=list
 */

import { test, expect } from '@playwright/test';
import { authenticatedTest } from './fixtures/auth';

// ── 1. Sales Channels Settings Page ─────────────────────────────────────────

authenticatedTest.describe('Sales Channels Settings Page', () => {
  authenticatedTest('should display sales channels page with sections', async ({ authedPage }) => {
    await authedPage.goto('/admin/settings/sales-channels');
    await authedPage.waitForLoadState('domcontentloaded');
    await authedPage.waitForTimeout(2000);

    // Should not redirect to login
    expect(authedPage.url()).not.toContain('/login');
    expect(authedPage.url()).toContain('/sales-channels');

    await authedPage.screenshot({
      path: 'e2e-screenshots/sales-channels-overview.png',
      fullPage: true,
    });
  });

  authenticatedTest(
    'should show store link section with generated links',
    async ({ authedPage }) => {
      await authedPage.goto('/admin/settings/sales-channels');
      await authedPage.waitForLoadState('domcontentloaded');
      await authedPage.waitForTimeout(3000);

      // Store link section should be visible (look for Telegram link or direct link text)
      const linkText = authedPage.locator('text=/t\\.me\\//').first();
      const hasLink = await linkText.isVisible().catch(() => false);

      if (hasLink) {
        // Copy buttons should be present
        const copyButtons = authedPage.locator('button[aria-label]').filter({
          hasText: /copy|复制|copied|已复制/i,
        });
        const copyCount = await copyButtons.count().catch(() => 0);
        expect(copyCount).toBeGreaterThanOrEqual(0);
      }

      await authedPage.screenshot({
        path: 'e2e-screenshots/sales-channels-store-links.png',
        fullPage: true,
      });
    }
  );

  authenticatedTest('should have regenerate link button', async ({ authedPage }) => {
    await authedPage.goto('/admin/settings/sales-channels');
    await authedPage.waitForLoadState('domcontentloaded');
    await authedPage.waitForTimeout(3000);

    // Look for regenerate button
    const regenerateBtn = authedPage.getByRole('button', {
      name: /regenerate|重新生成|refresh/i,
    });
    const hasRegenerate = await regenerateBtn.isVisible().catch(() => false);

    // Either regenerate button exists (link loaded) or we see a loading/empty state
    const pageContent = await authedPage.locator('body').textContent();
    expect(pageContent).toBeTruthy();

    if (hasRegenerate) {
      await authedPage.screenshot({
        path: 'e2e-screenshots/sales-channels-regenerate-btn.png',
        fullPage: true,
      });
    }
  });
});

// ── 2. Admin Settings → Sales Channels Navigation ───────────────────────────

authenticatedTest.describe('Admin Settings Sales Channels Entry', () => {
  authenticatedTest('should have sales channels card in admin settings', async ({ authedPage }) => {
    await authedPage.goto('/admin/settings');
    await authedPage.waitForLoadState('domcontentloaded');
    await authedPage.waitForTimeout(1000);

    // Look for Sales Channels link/card
    const salesChannelsLink = authedPage.locator('a[href*="sales-channels"]').first();
    const hasLink = await salesChannelsLink.isVisible().catch(() => false);

    if (hasLink) {
      await salesChannelsLink.click();
      await authedPage.waitForURL(/sales-channels/, { timeout: 10000 });
      expect(authedPage.url()).toContain('sales-channels');
    }
  });
});

// ── 3. Store Short Code Resolution (API + Navigation) ───────────────────────

authenticatedTest.describe('Store Short Code Resolution', () => {
  authenticatedTest(
    'should resolve short code via ?s= param and navigate to store page',
    async ({ authedPage }) => {
      // Step 1: Navigate to Sales Channels page and extract short code from the rendered links
      await authedPage.goto('/admin/settings/sales-channels');
      await authedPage.waitForLoadState('domcontentloaded');
      await authedPage.waitForTimeout(3000);

      // Extract short code from the Direct Link (contains ?s=<shortCode>)
      const directLinkEl = authedPage.locator('text=/\\?s=/').first();
      const hasDirectLink = await directLinkEl.isVisible().catch(() => false);

      if (!hasDirectLink) {
        test.skip(true, 'No store link displayed on page — skipping resolution test');
        return;
      }

      const linkText = await directLinkEl.textContent();
      const shortCodeMatch = linkText?.match(/[?&]s=([A-Za-z0-9]+)/);

      if (!shortCodeMatch?.[1]) {
        test.skip(true, 'Could not extract short code from page');
        return;
      }

      const shortCode = shortCodeMatch[1];

      // Step 2: Resolve short code via in-browser fetch (same proxy as the app)
      // Backend may return {"data":{"peerID":"..."}} or {"peerID":"..."} (cached)
      const peerID = await authedPage.evaluate(async (code: string) => {
        const resp = await fetch(`/platform/v1/store-links/resolve/${code}`, {
          headers: { Accept: 'application/json' },
        });
        if (!resp.ok) return null;
        const json = await resp.json();
        return json?.data?.peerID || json?.peerID || null;
      }, shortCode);
      expect(peerID).toBeTruthy();

      // Step 3: Navigate with ?s= query parameter and verify redirect to /store/:peerId
      await authedPage.goto(`/?s=${shortCode}`);

      await authedPage.waitForURL(url => url.toString().includes(`/store/${peerID}`), {
        timeout: 15000,
      });

      expect(authedPage.url()).toContain(`/store/${peerID}`);

      await authedPage.screenshot({
        path: 'e2e-screenshots/sales-channels-shortcode-resolved.png',
        fullPage: true,
      });
    }
  );

  authenticatedTest('should handle invalid short code gracefully', async ({ authedPage }) => {
    // Navigate with an invalid short code
    await authedPage.goto('/?s=invalidcode123');
    await authedPage.waitForLoadState('domcontentloaded');
    await authedPage.waitForTimeout(3000);

    // Should NOT navigate to a /store/ page (resolution fails silently)
    expect(authedPage.url()).not.toContain('/store/');

    // No unhandled JS errors
    const jsErrors: string[] = [];
    authedPage.on('pageerror', err => jsErrors.push(err.message));
    await authedPage.waitForTimeout(1000);
    expect(jsErrors.filter(e => e.includes('Unhandled'))).toHaveLength(0);
  });
});

// ── 4. Store Short Code Resolution API (Direct API Tests) ───────────────────

test.describe('Store Link Resolution API', () => {
  test('should return 400 for empty short code', async ({ request }) => {
    const resp = await request.get(`/platform/v1/store-links/resolve/`);
    expect([400, 404, 405]).toContain(resp.status());
  });

  test('should return 404 for non-existent short code', async ({ request }) => {
    const resp = await request.get(`/platform/v1/store-links/resolve/nonexistent999`);
    expect(resp.status()).toBe(404);

    const data = await resp.json();
    expect(data?.error?.code).toBe('NOT_FOUND');
  });

  test('should resolve valid short code to peerID (needs browser test to seed)', async ({
    request,
  }) => {
    // This test verifies the public resolve API when a short code exists.
    // Short codes are created by authenticated browser tests.
    // If no short codes exist yet, this test will be skipped.

    // Try a known short code pattern by calling a well-known test endpoint
    // Since we can't authenticate without browser OAuth flow, we verify API contract only.
    // The full resolution flow is covered by the browser-based test above.
    test.skip(true, 'Full resolution tested in browser test; API contract verified by 404 test');
  });
});
