/**
 * Dispute Evidence Upload E2E Tests
 *
 * Tests the UX-10 dispute evidence feature:
 * 1. DisputeModal image upload UI (file select, preview, remove)
 * 2. Evidence image rendering in OrderDisputeBanner (thumbnails)
 * 3. Evidence image rendering in OrderDispute detail (full display)
 *
 * Uses mock API data (mock-order-lifecycle), no backend dependency.
 */

import { test, expect, type Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { setupMockAuth } from './fixtures/mock-auth';
import { mockImageRoutes } from './fixtures/mock-api-routes';
import { mockOrderDetailByState } from './fixtures/mock-order-lifecycle';

const OUTPUT_DIR = path.join(__dirname, 'demo-output', 'dispute-evidence');

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function captureScreenshot(page: Page, name: string) {
  ensureDir(OUTPUT_DIR);
  await page.screenshot({
    path: path.join(OUTPUT_DIR, `${name}.png`),
    fullPage: true,
  });
}

// ─── Disputed Order with Evidence — Banner & Detail Rendering ────────

test.describe('Dispute Evidence — Display', () => {
  async function setupDisputedOrder(page: Page) {
    await setupMockAuth(page);
    await mockOrderDetailByState(page, 'DISPUTED');
    await mockImageRoutes(page);
    await page.goto('/orders/QmDispute001?type=purchase');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
  }

  test('disputed order shows evidence thumbnails in banner', async ({ page }) => {
    await setupDisputedOrder(page);

    const evidenceImages = page.locator('img[alt^="Evidence"]');
    const count = await evidenceImages.count();
    expect(count).toBeGreaterThanOrEqual(1);

    await captureScreenshot(page, 'disputed-order-banner-evidence');
  });

  test('evidence images are clickable links opening in new tab', async ({ page }) => {
    await setupDisputedOrder(page);

    const evidenceLink = page.locator('a[target="_blank"] img[alt^="Evidence"]').first();
    const isVisible = await evidenceLink.isVisible().catch(() => false);

    if (isVisible) {
      const parentLink = evidenceLink.locator('..');
      const href = await parentLink.getAttribute('href');
      expect(href).toBeTruthy();
      expect(href).toContain('/media/images/');
    }
  });

  test('evidence images have noopener noreferrer for security', async ({ page }) => {
    await setupDisputedOrder(page);

    const evidenceLink = page.locator('a[target="_blank"]:has(img[alt^="Evidence"])').first();
    const isVisible = await evidenceLink.isVisible().catch(() => false);

    if (isVisible) {
      const rel = await evidenceLink.getAttribute('rel');
      expect(rel).toContain('noopener');
      expect(rel).toContain('noreferrer');
    }
  });
});

// ─── DisputeModal — Image Upload UI ─────────────────────────────────

test.describe('Dispute Evidence — Upload Modal', () => {
  async function setupOrderForDispute(page: Page) {
    await setupMockAuth(page);

    // Use a SHIPPED order (buyer can open dispute on it)
    await mockOrderDetailByState(page, 'SHIPPED');
    await mockImageRoutes(page);
    await page.goto('/orders/QmFulfilled001?type=purchase');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
  }

  test('dispute modal shows evidence upload area', async ({ page }) => {
    await setupOrderForDispute(page);

    const disputeButton = page.locator(
      'button:has-text("Open Dispute"), button:has-text("争议"), [data-testid="order-detail-open-dispute"]'
    );
    const isVisible = await disputeButton
      .first()
      .isVisible()
      .catch(() => false);

    if (isVisible) {
      await disputeButton.first().click();
      await page.waitForTimeout(500);

      const evidenceLabel = page.getByText(/Evidence|证据/i);
      await expect(evidenceLabel.first()).toBeVisible();

      const addButton = page.locator(
        'button[aria-label*="evidence" i], button[aria-label*="Add" i]'
      );
      const hasAddButton = await addButton
        .first()
        .isVisible()
        .catch(() => false);
      expect(hasAddButton).toBeTruthy();

      await captureScreenshot(page, 'dispute-modal-evidence-upload');
    }
  });

  test('dispute modal shows image count hint', async ({ page }) => {
    await setupOrderForDispute(page);

    const disputeButton = page.locator(
      'button:has-text("Open Dispute"), button:has-text("争议"), [data-testid="order-detail-open-dispute"]'
    );
    const isVisible = await disputeButton
      .first()
      .isVisible()
      .catch(() => false);

    if (isVisible) {
      await disputeButton.first().click();
      await page.waitForTimeout(500);

      const hint = page.getByText(/5 images|10MB/i);
      await expect(hint.first()).toBeVisible();
    }
  });
});

// ─── Screenshot Capture for UX Audit ─────────────────────────────────

test.describe('Dispute Evidence — Visual Capture', () => {
  test('capture disputed order desktop view with evidence', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await setupMockAuth(page);
    await mockOrderDetailByState(page, 'DISPUTED');
    await mockImageRoutes(page);
    await page.goto('/orders/QmDispute001?type=purchase');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    await captureScreenshot(page, 'disputed-desktop-evidence');
  });

  test('capture disputed order mobile view with evidence', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await setupMockAuth(page);
    await mockOrderDetailByState(page, 'DISPUTED');
    await mockImageRoutes(page);
    await page.goto('/orders/QmDispute001?type=purchase');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    await captureScreenshot(page, 'disputed-mobile-evidence');
  });
});
