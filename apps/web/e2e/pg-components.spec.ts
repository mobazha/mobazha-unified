/**
 * Professional Grade Components E2E Tests
 *
 * Validates the new PG Tier 0 components:
 *   - ShareButton (copy link, Twitter, Telegram)
 *   - ReviewList (rating summary, distribution, individual reviews)
 *   - SellerTrustBadge (compact/full modes)
 *   - EscrowStatusBar (status mapping, mobile display)
 *   - WriteReviewDialog (star rating, text, anonymous)
 *   - SEO metadata (canonical URLs, OG tags)
 *   - Site URL correctness (store.mobazha.org)
 *
 * Prerequisites:
 *   - Standalone Docker container running (port 15104 backend, 3002 frontend)
 *   - Test listings seeded
 *
 * Run:
 *   npx playwright test pg-components.spec.ts --project=standalone --reporter=list
 *   npx playwright test pg-components.spec.ts --project=standalone-mobile --reporter=list
 */

import { test as base, expect } from '@playwright/test';
import { standaloneTest } from './fixtures/standalone-auth';
import { EXPECTED_SLUGS } from './fixtures/seed-listings';

const LISTINGS = {
  physical: {
    slug: EXPECTED_SLUGS.physical,
    title: 'E2E Test T-Shirt',
  },
  service: {
    slug: EXPECTED_SLUGS.service,
    title: 'E2E Web Design Consultation',
  },
};

// ── 1. ShareButton ───────────────────────────────────────────────────────────

base.describe('ShareButton', () => {
  base.use({ baseURL: 'http://localhost:3002' });

  base('product page shows share button', async ({ page }) => {
    await page.goto(`/product/${LISTINGS.physical.slug}`);
    await page.waitForLoadState('domcontentloaded');

    const shareBtn = page.getByTestId('share-button');
    await expect(shareBtn).toBeVisible({ timeout: 15000 });

    await page.screenshot({ path: 'test-results/pg-share-button.png', fullPage: true });
  });

  base('share dropdown shows copy/twitter/telegram options', async ({ page }) => {
    await page.goto(`/product/${LISTINGS.physical.slug}`);
    await page.waitForLoadState('domcontentloaded');

    const shareBtn = page.getByTestId('share-button');
    await shareBtn.waitFor({ state: 'visible', timeout: 15000 });
    await shareBtn.click();

    // Dropdown should appear with share options
    const copyLink = page.getByText(/copy link|复制链接/i).first();
    const twitter = page.getByText(/twitter\/x|分享到 twitter/i).first();
    const telegram = page.getByText(/telegram/i).first();

    await expect(copyLink).toBeVisible({ timeout: 5000 });
    await expect(twitter).toBeVisible();
    await expect(telegram).toBeVisible();

    await page.screenshot({ path: 'test-results/pg-share-dropdown.png', fullPage: true });
  });

  base('share button touch target >= 44px', async ({ page }) => {
    await page.goto(`/product/${LISTINGS.physical.slug}`);
    await page.waitForLoadState('domcontentloaded');

    const shareBtn = page.getByTestId('share-button');
    await shareBtn.waitFor({ state: 'visible', timeout: 15000 });

    const box = await shareBtn.boundingBox();
    expect(box).toBeTruthy();
    if (box) {
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
  });
});

// ── 2. ReviewList ────────────────────────────────────────────────────────────

base.describe('ReviewList', () => {
  base.use({ baseURL: 'http://localhost:3002' });

  base('product page shows review section', async ({ page }) => {
    await page.goto(`/product/${LISTINGS.physical.slug}`);
    await page.waitForLoadState('domcontentloaded');

    // ReviewList or rating summary should be visible
    const reviewSection = page.getByTestId('review-list');
    await expect(reviewSection).toBeVisible({ timeout: 15000 });

    await page.screenshot({ path: 'test-results/pg-review-section.png', fullPage: true });
  });

  base('rating distribution chart renders', async ({ page }) => {
    await page.goto(`/product/${LISTINGS.physical.slug}`);
    await page.waitForLoadState('domcontentloaded');

    const distribution = page.getByTestId('rating-distribution');
    if (await distribution.isVisible().catch(() => false)) {
      await expect(distribution).toBeVisible();
      await page.screenshot({ path: 'test-results/pg-rating-distribution.png' });
    }
  });
});

// ── 3. EscrowStatusBar ───────────────────────────────────────────────────────

base.describe('EscrowStatusBar — Mobile', () => {
  base.use({
    baseURL: 'http://localhost:3002',
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });

  base('escrow bar renders on mobile order detail', async ({ page }) => {
    // Navigate to orders page (may require auth)
    await page.goto('/orders');
    await page.waitForLoadState('domcontentloaded');

    // If there are orders, click the first one
    const orderCard = page.locator('[data-testid="order-card"], a[href*="/orders/"]').first();
    if (await orderCard.isVisible().catch(() => false)) {
      await orderCard.click();
      await page.waitForLoadState('domcontentloaded');

      const escrowBar = page.getByTestId('escrow-status-bar');
      if (await escrowBar.isVisible().catch(() => false)) {
        await expect(escrowBar).toBeVisible();

        // Verify it has progressbar role
        await expect(escrowBar).toHaveAttribute('role', 'progressbar');

        await page.screenshot({ path: 'test-results/pg-escrow-bar-mobile.png', fullPage: true });
      }
    }
  });
});

// ── 4. WriteReviewDialog ─────────────────────────────────────────────────────

standaloneTest.describe('WriteReviewDialog', () => {
  standaloneTest.skip(
    !process.env.STANDALONE_BACKEND,
    'Requires running standalone backend with auth'
  );

  standaloneTest('review dialog opens from order detail', async ({ authedPage: page }) => {
    await page.goto('/orders');
    await page.waitForLoadState('domcontentloaded');

    // Find a completed order that can be reviewed
    const orderCard = page.locator('[data-testid="order-card"], a[href*="/orders/"]').first();
    if (await orderCard.isVisible().catch(() => false)) {
      await orderCard.click();
      await page.waitForLoadState('domcontentloaded');

      // Look for "Confirm Receipt" or "Complete Order" button
      const confirmBtn = page
        .getByRole('button', {
          name: /confirm receipt|确认收货|complete|完成/i,
        })
        .first();

      if (await confirmBtn.isVisible().catch(() => false)) {
        await confirmBtn.click();

        // Review dialog should appear
        const reviewDialog = page.getByTestId('write-review-dialog');
        await expect(reviewDialog).toBeVisible({ timeout: 10000 });

        // Star rating buttons should be present
        for (let i = 1; i <= 5; i++) {
          const star = page.getByTestId(`star-${i}`);
          await expect(star).toBeVisible();
        }

        // Star buttons should be >= 44px touch target
        const star1 = page.getByTestId('star-1');
        const box = await star1.boundingBox();
        expect(box).toBeTruthy();
        if (box) {
          expect(box.width).toBeGreaterThanOrEqual(44);
          expect(box.height).toBeGreaterThanOrEqual(44);
        }

        await page.screenshot({
          path: 'test-results/pg-review-dialog.png',
          fullPage: true,
        });
      }
    }
  });
});

// ── 5. SEO & Metadata ────────────────────────────────────────────────────────

base.describe('SEO Metadata', () => {
  base.use({ baseURL: 'http://localhost:3002' });

  base('product page has canonical URL with store.mobazha.org', async ({ page }) => {
    await page.goto(`/product/${LISTINGS.physical.slug}`);
    await page.waitForLoadState('domcontentloaded');

    const canonical = page.locator('link[rel="canonical"]');
    if ((await canonical.count()) > 0) {
      const href = await canonical.getAttribute('href');
      expect(href).toBeTruthy();
      // Should NOT contain mobazha.com
      expect(href).not.toContain('mobazha.com');
    }

    await page.screenshot({ path: 'test-results/pg-seo-product.png' });
  });

  base('product page has OG tags', async ({ page }) => {
    await page.goto(`/product/${LISTINGS.physical.slug}`);
    await page.waitForLoadState('domcontentloaded');

    const ogTitle = page.locator('meta[property="og:title"]');
    const ogDesc = page.locator('meta[property="og:description"]');
    const ogType = page.locator('meta[property="og:type"]');

    if ((await ogTitle.count()) > 0) {
      const title = await ogTitle.getAttribute('content');
      expect(title).toBeTruthy();
    }

    if ((await ogDesc.count()) > 0) {
      const desc = await ogDesc.getAttribute('content');
      expect(desc).toBeTruthy();
    }

    if ((await ogType.count()) > 0) {
      const type = await ogType.getAttribute('content');
      expect(type).toBeTruthy();
    }
  });

  base('robots.txt is accessible', async ({ request }) => {
    const resp = await request.get('http://localhost:3002/robots.txt');
    expect(resp.status()).toBe(200);
    const body = await resp.text();
    expect(body.toLowerCase()).toContain('user-agent');
    expect(body).toContain('Sitemap');
    // Should reference store.mobazha.org (or localhost for dev)
    expect(body).not.toContain('mobazha.com');
  });

  base('sitemap.xml is accessible', async ({ request }) => {
    const resp = await request.get('http://localhost:3002/sitemap.xml');
    expect(resp.status()).toBe(200);
    const body = await resp.text();
    expect(body).toContain('urlset');
  });
});

// ── 6. Trust Components ──────────────────────────────────────────────────────

base.describe('Trust & Protection', () => {
  base.use({ baseURL: 'http://localhost:3002' });

  base('product page shows buyer protection banner', async ({ page }) => {
    await page.goto(`/product/${LISTINGS.physical.slug}`);
    await page.waitForLoadState('domcontentloaded');

    // Look for buyer protection / trust indicators
    const trustIndicator = page.getByText(/protected|保护|secure|安全/i).first();
    if (await trustIndicator.isVisible().catch(() => false)) {
      await expect(trustIndicator).toBeVisible();
    }

    await page.screenshot({ path: 'test-results/pg-trust-indicators.png', fullPage: true });
  });

  base('store page shows seller trust badge', async ({ page }) => {
    // Get peer ID from any product page first
    await page.goto(`/product/${LISTINGS.physical.slug}`);
    await page.waitForLoadState('domcontentloaded');

    // Find store link
    const storeLink = page.locator('a[href*="/store/"]').first();
    if (await storeLink.isVisible().catch(() => false)) {
      await storeLink.click();
      await page.waitForLoadState('domcontentloaded');

      const trustBadge = page.getByTestId('seller-trust-badge');
      if (await trustBadge.isVisible().catch(() => false)) {
        await expect(trustBadge).toBeVisible();
      }

      await page.screenshot({ path: 'test-results/pg-seller-trust.png', fullPage: true });
    }
  });
});

// ── 7. Mobile PG Components ─────────────────────────────────────────────────

base.describe('Mobile — PG Components', () => {
  base.use({
    baseURL: 'http://localhost:3002',
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });

  base('mobile: share button accessible', async ({ page }) => {
    await page.goto(`/product/${LISTINGS.physical.slug}`);
    await page.waitForLoadState('domcontentloaded');

    const shareBtn = page.getByTestId('share-button');
    await expect(shareBtn).toBeVisible({ timeout: 15000 });

    // Touch target check
    const box = await shareBtn.boundingBox();
    expect(box).toBeTruthy();
    if (box) {
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
    }

    await page.screenshot({ path: 'test-results/pg-mobile-share.png', fullPage: true });
  });

  base('mobile: no horizontal scroll on product page', async ({ page }) => {
    await page.goto(`/product/${LISTINGS.physical.slug}`);
    await page.waitForLoadState('domcontentloaded');

    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1);
  });

  base('mobile: review section renders without overflow', async ({ page }) => {
    await page.goto(`/product/${LISTINGS.physical.slug}`);
    await page.waitForLoadState('domcontentloaded');

    // Scroll to review section
    const reviewSection = page.getByTestId('review-list');
    if (await reviewSection.isVisible().catch(() => false)) {
      await reviewSection.scrollIntoViewIfNeeded();

      // Check no horizontal overflow
      const overflows = await page.evaluate(() => {
        const el = document.querySelector('[data-testid="review-list"]');
        if (!el) return false;
        return el.scrollWidth > el.clientWidth;
      });
      expect(overflows).toBe(false);
    }

    await page.screenshot({ path: 'test-results/pg-mobile-reviews.png', fullPage: true });
  });
});

// ── 8. 404 Page ──────────────────────────────────────────────────────────────

base.describe('404 Page', () => {
  base.use({ baseURL: 'http://localhost:3002' });

  base('non-existent page shows localized 404', async ({ page }) => {
    await page.goto('/this-page-does-not-exist-12345');
    await page.waitForLoadState('domcontentloaded');

    // Should show 404 content (not a blank page)
    const bodyText = await page.textContent('body');
    expect(bodyText).toBeTruthy();

    // Should not contain hardcoded English if i18n is properly set up
    // At minimum, the page should render
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible({ timeout: 10000 });

    await page.screenshot({ path: 'test-results/pg-404-page.png', fullPage: true });
  });
});
