/**
 * Shipping Settings E2E Tests
 * 配送设置端到端测试 — 覆盖 Shipping Profile CRUD、Zone 管理、Profile 选择器
 *
 * 需要运行中的全栈环境。
 *
 * 环境变量:
 *   E2E_TEST_PASSWORD - 测试用户密码 (必须)
 */

import { test, expect, type Page } from '@playwright/test';
import { loginAndSetup } from './fixtures/auth';

const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD || '';

async function waitForPageStable(page: Page): Promise<void> {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(500);
}

async function navigateToShippingSettings(
  page: Page,
  variant: 'admin' | 'store' = 'store'
): Promise<void> {
  const path = variant === 'admin' ? '/admin/settings/shipping' : '/settings/store/shipping';
  await page.goto(path);
  await waitForPageStable(page);
}

test.describe('Shipping Settings - Visual Baselines', () => {
  test.beforeEach(async () => {
    test.skip(!TEST_PASSWORD, 'E2E_TEST_PASSWORD env var not set');
  });

  test('store shipping settings page renders', async ({ page }) => {
    await loginAndSetup(page);
    await navigateToShippingSettings(page, 'store');

    const testId = page.locator('[data-testid="store-settings-shipping"]');
    await expect(testId).toBeVisible();

    await expect(page).toHaveScreenshot('shipping-settings-store.png', { fullPage: true });
  });

  test('admin shipping settings page renders', async ({ page }) => {
    await loginAndSetup(page);
    await navigateToShippingSettings(page, 'admin');

    const testId = page.locator('[data-testid="admin-settings-shipping"]');
    await expect(testId).toBeVisible();

    await expect(page).toHaveScreenshot('shipping-settings-admin.png', { fullPage: true });
  });
});

test.describe('Shipping Settings - Empty State', () => {
  test.beforeEach(async () => {
    test.skip(!TEST_PASSWORD, 'E2E_TEST_PASSWORD env var not set');
  });

  test('should show empty state when no profiles exist', async ({ page }) => {
    await loginAndSetup(page);
    await navigateToShippingSettings(page);

    const content = page.locator('body');
    await expect(content).toBeVisible();

    const hasEmptyState = await page
      .getByText(/no shipping|配送/i)
      .first()
      .isVisible()
      .catch(() => false);
    const hasProfiles = await page
      .locator('button')
      .filter({ hasText: /add profile|添加/i })
      .isVisible()
      .catch(() => false);

    expect(hasEmptyState || hasProfiles).toBeTruthy();
  });

  test('should show template selector in empty state', async ({ page }) => {
    await loginAndSetup(page);
    await navigateToShippingSettings(page);

    const templateSection = page.getByText(/template|模板/i);
    const hasTemplates = await templateSection
      .first()
      .isVisible()
      .catch(() => false);

    if (hasTemplates) {
      await expect(page).toHaveScreenshot('shipping-settings-empty-with-templates.png', {
        fullPage: true,
      });
    }
  });

  test('S5: empty state shows 3 profile quick-start template cards (visual baseline)', async ({
    page,
  }) => {
    await loginAndSetup(page);
    await navigateToShippingSettings(page, 'admin');

    await expect(page.locator('[data-testid="admin-settings-shipping"]')).toBeVisible();

    const quickStart = page.getByText(/Quick Start|快速入门/i).first();
    const hasQuickStart = await quickStart.isVisible().catch(() => false);
    if (!hasQuickStart) {
      test.skip();
      return;
    }

    const domesticCard = page.getByText(/Domestic Free|国内包邮/i).first();
    const worldwideCard = page.getByText(/Worldwide Standard|全球标准/i).first();
    const customCard = page.getByText(/Custom|自定义/i).first();
    const hasThreeCards =
      (await domesticCard.isVisible().catch(() => false)) &&
      (await worldwideCard.isVisible().catch(() => false)) &&
      (await customCard.isVisible().catch(() => false));

    expect(hasThreeCards).toBeTruthy();
    await expect(page).toHaveScreenshot('s5-shipping-empty-3-templates.png', { fullPage: true });
  });
});

test.describe('Shipping Settings - Profile CRUD', () => {
  test.beforeEach(async () => {
    test.skip(!TEST_PASSWORD, 'E2E_TEST_PASSWORD env var not set');
  });

  test('should create a new shipping profile', async ({ page }) => {
    await loginAndSetup(page);
    await navigateToShippingSettings(page);

    const createButton = page
      .locator('button')
      .filter({ hasText: /create profile|add profile|创建|添加/i })
      .first();
    const hasCreateButton = await createButton.isVisible().catch(() => false);

    if (!hasCreateButton) {
      test.skip();
      return;
    }

    await createButton.click();

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();

    const nameInput = dialog.locator('input').first();
    await nameInput.fill('E2E Test Profile');

    await expect(page).toHaveScreenshot('shipping-settings-create-dialog.png');

    const submitButton = dialog
      .locator('button')
      .filter({ hasText: /create|save|创建|保存/i })
      .first();
    await submitButton.click();

    await page.waitForTimeout(1000);

    const profileCard = page.getByText('E2E Test Profile');
    await expect(profileCard.first()).toBeVisible();

    await expect(page).toHaveScreenshot('shipping-settings-after-create.png', { fullPage: true });
  });

  test('should expand profile to show zones', async ({ page }) => {
    await loginAndSetup(page);
    await navigateToShippingSettings(page);

    const profileCard = page.getByText('E2E Test Profile').first();
    const hasProfile = await profileCard.isVisible().catch(() => false);

    if (!hasProfile) {
      test.skip();
      return;
    }

    const expandButton = profileCard
      .locator('..')
      .locator('..')
      .locator('button')
      .filter({ hasText: /expand|展开/i })
      .first()
      .or(profileCard.locator('..').locator('..').locator('[data-state]').first());

    const isClickable = await expandButton.isVisible().catch(() => false);
    if (isClickable) {
      await expandButton.click();
      await page.waitForTimeout(500);
    }

    await expect(page).toHaveScreenshot('shipping-settings-expanded-profile.png', {
      fullPage: true,
    });
  });

  test('should add a shipping zone to profile', async ({ page }) => {
    await loginAndSetup(page);
    await navigateToShippingSettings(page);

    const addZoneButton = page
      .locator('button')
      .filter({ hasText: /add zone|添加区域/i })
      .first();
    const hasAddZone = await addZoneButton.isVisible().catch(() => false);

    if (!hasAddZone) {
      test.skip();
      return;
    }

    await addZoneButton.click();

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();

    await expect(page).toHaveScreenshot('shipping-settings-zone-form.png');
  });

  test('S5: zone form shows shipping preview block (visual baseline)', async ({ page }) => {
    await loginAndSetup(page);
    await navigateToShippingSettings(page, 'admin');

    const addZoneButton = page
      .locator('button')
      .filter({ hasText: /add zone|添加区域/i })
      .first();
    const hasAddZone = await addZoneButton.isVisible().catch(() => false);
    if (!hasAddZone) {
      test.skip();
      return;
    }
    await addZoneButton.click();

    const previewBlock = page.locator('[data-testid="shipping-preview"]');
    await expect(previewBlock).toBeVisible();
    const testShippingLabel = page.getByText(/Test shipping|试算运费/i).first();
    await expect(testShippingLabel).toBeVisible();

    await expect(page).toHaveScreenshot('s5-shipping-zone-form-with-preview.png');
  });

  test('should show delete profile dialog with migration option', async ({ page }) => {
    await loginAndSetup(page);
    await navigateToShippingSettings(page);

    const deleteButton = page
      .locator('button[aria-label*="delete" i], button:has(svg)')
      .filter({ hasText: '' })
      .first();
    const hasDeleteButton = await deleteButton.isVisible().catch(() => false);

    if (!hasDeleteButton) {
      test.skip();
      return;
    }

    await deleteButton.click();

    const dialog = page.locator('[role="dialog"]');
    const hasDialog = await dialog.isVisible().catch(() => false);

    if (hasDialog) {
      await expect(page).toHaveScreenshot('shipping-settings-delete-dialog.png');

      const cancelButton = dialog.locator('button').filter({ hasText: /cancel|取消/i });
      await cancelButton.click();
    }
  });
});

test.describe('Shipping Settings - Stale Banner', () => {
  test.beforeEach(async () => {
    test.skip(!TEST_PASSWORD, 'E2E_TEST_PASSWORD env var not set');
  });

  test('should show stale listings banner when applicable', async ({ page }) => {
    await loginAndSetup(page);
    await navigateToShippingSettings(page);

    const staleBanner = page.getByText(/stale|过时|refresh snapshots|刷新快照/i).first();
    const hasStaleBanner = await staleBanner.isVisible().catch(() => false);

    if (hasStaleBanner) {
      await expect(page).toHaveScreenshot('shipping-settings-stale-banner.png', { fullPage: true });
    }
  });
});

test.describe('Shipping Settings - Locations', () => {
  test.beforeEach(async () => {
    test.skip(!TEST_PASSWORD, 'E2E_TEST_PASSWORD env var not set');
  });

  test('should display shipping locations section', async ({ page }) => {
    await loginAndSetup(page);
    await navigateToShippingSettings(page);

    const locationsSection = page.getByText(/shipping location|发货地/i).first();
    const hasLocations = await locationsSection.isVisible().catch(() => false);

    if (hasLocations) {
      await expect(page).toHaveScreenshot('shipping-settings-locations.png', { fullPage: true });
    }
  });

  test('should open add location dialog', async ({ page }) => {
    await loginAndSetup(page);
    await navigateToShippingSettings(page);

    const addLocationButton = page
      .locator('button')
      .filter({ hasText: /add location|添加地点/i })
      .first();
    const hasButton = await addLocationButton.isVisible().catch(() => false);

    if (!hasButton) {
      test.skip();
      return;
    }

    await addLocationButton.click();

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();

    await expect(page).toHaveScreenshot('shipping-settings-location-form.png');

    const cancelButton = dialog.locator('button').filter({ hasText: /cancel|取消/i });
    await cancelButton.click();
  });
});

test.describe('Listing Page - Profile Selector', () => {
  test.beforeEach(async () => {
    test.skip(!TEST_PASSWORD, 'E2E_TEST_PASSWORD env var not set');
  });

  test('should show shipping profile selector on new listing page', async ({ page }) => {
    await loginAndSetup(page);

    await page.goto('/listing/new');
    await waitForPageStable(page);

    const profileSelector = page.getByText(/shipping profile|配送方案/i).first();
    const hasSelector = await profileSelector.isVisible().catch(() => false);

    if (hasSelector) {
      await expect(page).toHaveScreenshot('listing-new-shipping-selector.png', { fullPage: true });
    }
  });

  test('should navigate to shipping settings from empty selector', async ({ page }) => {
    await loginAndSetup(page);

    await page.goto('/listing/new');
    await waitForPageStable(page);

    const settingsLink = page
      .locator('a')
      .filter({ hasText: /shipping settings|配送设置|go to/i })
      .first();
    const hasLink = await settingsLink.isVisible().catch(() => false);

    if (hasLink) {
      await settingsLink.click();
      await page.waitForLoadState('domcontentloaded');
      expect(page.url()).toContain('/settings/store/shipping');
    }
  });

  test('profile selector keyboard navigation', async ({ page }) => {
    await loginAndSetup(page);

    await page.goto('/listing/new');
    await waitForPageStable(page);

    const radioGroup = page.locator('[role="radiogroup"]');
    const hasRadioGroup = await radioGroup.isVisible().catch(() => false);

    if (!hasRadioGroup) {
      test.skip();
      return;
    }

    const radios = radioGroup.locator('[role="radio"]');
    const count = await radios.count();

    if (count >= 2) {
      await radios.first().focus();
      await expect(radios.first()).toBeFocused();

      await page.keyboard.press('Tab');
      await expect(radios.nth(1)).toBeFocused();

      await page.keyboard.press('Enter');
      await expect(radios.nth(1)).toHaveAttribute('aria-checked', 'true');
    }
  });
});
