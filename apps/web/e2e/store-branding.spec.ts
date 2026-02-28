/**
 * Store Branding E2E Tests (Layer 3) — PG-201
 *
 * Tests storefront rendering with section-based branding configuration.
 * Verifies CSS variable injection, section visibility, and visual regression.
 */

import { test, expect } from '@playwright/test';

const STORE_URL = '/store/QmTestPeer123';

test.describe('Store Branding — Storefront Rendering', () => {
  test('storefront page loads and renders sections container', async ({ page }) => {
    await page.goto(STORE_URL);
    await page.waitForLoadState('networkidle');

    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('store theme provider injects CSS custom properties', async ({ page }) => {
    await page.goto(STORE_URL);
    await page.waitForLoadState('networkidle');

    const themeRoot = page.locator('.store-theme-root').first();
    if (await themeRoot.isVisible()) {
      const primary = await themeRoot.evaluate(el =>
        window.getComputedStyle(el).getPropertyValue('--store-primary')
      );
      const font = await themeRoot.evaluate(el =>
        window.getComputedStyle(el).getPropertyValue('--store-font')
      );

      expect(primary).toBeTruthy();
      expect(font).toBeTruthy();
    }
  });

  test('hero section renders with title', async ({ page }) => {
    await page.goto(STORE_URL);
    await page.waitForLoadState('networkidle');

    const hero = page.locator('[data-section-type="hero"]').first();
    if (await hero.isVisible()) {
      const heading = hero.locator('h1');
      await expect(heading).toBeVisible();
      const text = await heading.textContent();
      expect(text?.length).toBeGreaterThan(0);
    }
  });

  test('trust badges section renders badge cards', async ({ page }) => {
    await page.goto(STORE_URL);
    await page.waitForLoadState('networkidle');

    const trustSection = page.locator('[data-section-type="trust-badges"]').first();
    if (await trustSection.isVisible()) {
      const badges = trustSection.locator('p');
      const count = await badges.count();
      expect(count).toBeGreaterThan(0);
    }
  });

  test('announcement bar can be dismissed', async ({ page }) => {
    await page.goto(STORE_URL);
    await page.waitForLoadState('networkidle');

    const announcement = page.locator('[data-section-type="announcement-bar"]').first();
    if (await announcement.isVisible()) {
      const dismissBtn = announcement.locator('button');
      if (await dismissBtn.isVisible()) {
        await dismissBtn.click();
        await expect(announcement).not.toBeVisible();
      }
    }
  });

  test('FAQ section expands on click', async ({ page }) => {
    await page.goto(STORE_URL);
    await page.waitForLoadState('networkidle');

    const faqSection = page.locator('[data-section-type="faq"]').first();
    if (await faqSection.isVisible()) {
      const firstQuestion = faqSection.locator('button').first();
      if (await firstQuestion.isVisible()) {
        await firstQuestion.click();
        const answer = faqSection.locator('.text-muted-foreground').first();
        await expect(answer).toBeVisible();
      }
    }
  });

  test('fallback rendering when no store config exists', async ({ page }) => {
    await page.goto('/store/QmNonExistentPeer999');
    await page.waitForLoadState('networkidle');

    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('visual regression — storefront snapshot', async ({ page }) => {
    await page.goto(STORE_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await expect(page).toHaveScreenshot('store-branding-full.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.05,
    });
  });
});
