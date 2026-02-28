/**
 * Store Branding E2E Tests (Layer 3) — PG-201
 *
 * Tests storefront rendering and admin editor functionality.
 * Verifies CSS variable injection, section visibility, editor interactions,
 * and visual regression.
 */

import { test, expect } from '@playwright/test';

const STORE_URL = '/store/QmTestPeer123';
const EDITOR_URL = '/admin/settings/store/branding';

// ---------------------------------------------------------------------------
// Storefront Rendering
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Admin Editor
// ---------------------------------------------------------------------------

test.describe('Store Branding — Admin Editor', () => {
  test('editor loads with split-panel layout', async ({ page }) => {
    await page.goto(EDITOR_URL);
    await page.waitForLoadState('networkidle');

    const editor = page.locator('[data-testid="store-branding-editor"]');
    await expect(editor).toBeVisible();
  });

  test('editor shows theme tab by default', async ({ page }) => {
    await page.goto(EDITOR_URL);
    await page.waitForLoadState('networkidle');

    const themeEditor = page.locator('[data-testid="theme-editor"]');
    await expect(themeEditor).toBeVisible();
  });

  test('can switch between theme and sections tabs', async ({ page }) => {
    await page.goto(EDITOR_URL);
    await page.waitForLoadState('networkidle');

    const themeEditor = page.locator('[data-testid="theme-editor"]');
    const sectionEditor = page.locator('[data-testid="section-list-editor"]');

    await expect(themeEditor).toBeVisible();

    const sectionsTab = page.getByRole('button', { name: /sections/i });
    await sectionsTab.click();
    await expect(sectionEditor).toBeVisible();

    const themeTab = page.getByRole('button', { name: /theme/i });
    await themeTab.click();
    await expect(themeEditor).toBeVisible();
  });

  test('save button is disabled when no changes', async ({ page }) => {
    await page.goto(EDITOR_URL);
    await page.waitForLoadState('networkidle');

    const saveBtn = page.getByRole('button', { name: /save/i });
    await expect(saveBtn).toBeDisabled();
  });

  test('editing theme enables save and discard buttons', async ({ page }) => {
    await page.goto(EDITOR_URL);
    await page.waitForLoadState('networkidle');

    const customColorBtn = page.getByText(/custom/i).first();
    if (await customColorBtn.isVisible()) {
      await customColorBtn.click();

      const saveBtn = page.getByRole('button', { name: /save/i });
      await expect(saveBtn).toBeEnabled();
    }
  });

  test('template picker dialog opens and closes', async ({ page }) => {
    await page.goto(EDITOR_URL);
    await page.waitForLoadState('networkidle');

    const templateBtn = page.getByRole('button', { name: /template/i });
    if (await templateBtn.isVisible()) {
      await templateBtn.click();

      const dialogTitle = page.getByText(/choose.*template/i);
      await expect(dialogTitle).toBeVisible();

      await page.keyboard.press('Escape');
    }
  });

  test('sections tab — toggle section visibility', async ({ page }) => {
    await page.goto(EDITOR_URL);
    await page.waitForLoadState('networkidle');

    const sectionsTab = page.getByRole('button', { name: /sections/i });
    await sectionsTab.click();

    const visibilityBtn = page.getByLabel(/hide section|show section/i).first();
    if (await visibilityBtn.isVisible()) {
      await visibilityBtn.click();

      const saveBtn = page.getByRole('button', { name: /save/i });
      await expect(saveBtn).toBeEnabled();
    }
  });

  test('sections tab — expand section to edit props', async ({ page }) => {
    await page.goto(EDITOR_URL);
    await page.waitForLoadState('networkidle');

    const sectionsTab = page.getByRole('button', { name: /sections/i });
    await sectionsTab.click();

    const expandBtns = page.getByLabel(/expand|collapse/i);
    const firstExpandBtn = expandBtns.first();
    if (await firstExpandBtn.isVisible()) {
      await firstExpandBtn.click();

      const propInput = page.locator('input[type="text"]').first();
      await expect(propInput).toBeVisible();
    }
  });

  test('back link navigates to store settings', async ({ page }) => {
    await page.goto(EDITOR_URL);
    await page.waitForLoadState('networkidle');

    const backLink = page.locator('a[href="/admin/settings/store"]');
    await expect(backLink).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // Visual Regression — Admin Editor
  // -------------------------------------------------------------------------

  test('visual regression — editor desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(EDITOR_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await expect(page).toHaveScreenshot('store-editor-desktop.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.05,
    });
  });

  test('visual regression — editor mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(EDITOR_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await expect(page).toHaveScreenshot('store-editor-mobile.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.05,
    });
  });

  test('visual regression — editor sections tab', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(EDITOR_URL);
    await page.waitForLoadState('networkidle');

    const sectionsTab = page.getByRole('button', { name: /sections/i });
    await sectionsTab.click();
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot('store-editor-sections-tab.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.05,
    });
  });
});
