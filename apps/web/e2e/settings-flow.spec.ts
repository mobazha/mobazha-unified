/**
 * Settings / Account Flow E2E Tests
 * 设置和账户管理端到端测试
 *
 * 测试通用设置、隐私设置、访问控制、已关联账户等。
 * 需要运行中的全栈环境。
 *
 * 环境变量:
 *   E2E_TEST_PASSWORD - 测试用户密码 (必须)
 */

import { test, expect } from '@playwright/test';
import { performCasdoorLogin } from './fixtures/auth';

const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD || '';

test.describe('Settings', () => {
  test.beforeEach(async () => {
    test.skip(!TEST_PASSWORD, 'E2E_TEST_PASSWORD env var not set');
  });

  test('should display settings page', async ({ page }) => {
    await performCasdoorLogin(page);

    await page.goto('/settings');
    await page.waitForLoadState('domcontentloaded');

    expect(page.url()).toContain('/settings');
    expect(page.url()).not.toContain('/login');

    await page.screenshot({ path: 'e2e-screenshots/settings-main.png', fullPage: true });
  });

  test('should navigate to general settings', async ({ page }) => {
    await performCasdoorLogin(page);

    await page.goto('/settings/general');
    await page.waitForLoadState('domcontentloaded');

    expect(page.url()).toContain('/settings/general');

    // Should see settings form or content
    const body = page.locator('body');
    await expect(body).toBeVisible();

    await page.screenshot({ path: 'e2e-screenshots/settings-general.png', fullPage: true });
  });

  test('should navigate to account settings', async ({ page }) => {
    await performCasdoorLogin(page);

    await page.goto('/settings/account');
    await page.waitForLoadState('domcontentloaded');

    expect(page.url()).toContain('/settings/account');

    await page.screenshot({ path: 'e2e-screenshots/settings-account.png', fullPage: true });
  });
});

test.describe('Access Control Settings', () => {
  test.beforeEach(async () => {
    test.skip(!TEST_PASSWORD, 'E2E_TEST_PASSWORD env var not set');
  });

  test('should display privacy settings', async ({ page }) => {
    await performCasdoorLogin(page);

    await page.goto('/settings/access-control/privacy');
    await page.waitForLoadState('domcontentloaded');

    expect(page.url()).toContain('/privacy');

    await page.screenshot({ path: 'e2e-screenshots/settings-privacy.png', fullPage: true });
  });

  test('should display user groups', async ({ page }) => {
    await performCasdoorLogin(page);

    await page.goto('/settings/access-control/user-groups');
    await page.waitForLoadState('domcontentloaded');

    expect(page.url()).toContain('/user-groups');

    await page.screenshot({ path: 'e2e-screenshots/settings-user-groups.png', fullPage: true });
  });

  test('should display product groups', async ({ page }) => {
    await performCasdoorLogin(page);

    await page.goto('/settings/access-control/product-groups');
    await page.waitForLoadState('domcontentloaded');

    expect(page.url()).toContain('/product-groups');

    await page.screenshot({ path: 'e2e-screenshots/settings-product-groups.png', fullPage: true });
  });

  test('should display access requests', async ({ page }) => {
    await performCasdoorLogin(page);

    await page.goto('/settings/access-control/requests');
    await page.waitForLoadState('domcontentloaded');

    await page.screenshot({ path: 'e2e-screenshots/settings-access-requests.png', fullPage: true });
  });
});

test.describe('Settings - Linked Accounts', () => {
  test.beforeEach(async () => {
    test.skip(!TEST_PASSWORD, 'E2E_TEST_PASSWORD env var not set');
  });

  test('should view linked accounts on account page', async ({ page }) => {
    await performCasdoorLogin(page);

    await page.goto('/settings/account');
    await page.waitForLoadState('domcontentloaded');

    // Look for linked accounts section
    const linkedSection = page.getByText(/linked|关联|绑定|accounts|账号/i).first();
    const hasLinkedSection = await linkedSection.isVisible().catch(() => false);

    if (hasLinkedSection) {
      await page.screenshot({
        path: 'e2e-screenshots/settings-linked-accounts.png',
        fullPage: true,
      });
    }
  });
});

test.describe('Settings - Other Pages', () => {
  test.beforeEach(async () => {
    test.skip(!TEST_PASSWORD, 'E2E_TEST_PASSWORD env var not set');
  });

  const settingsPages = [
    { path: '/settings/keys', name: 'Keys' },
    { path: '/settings/refunds', name: 'Refunds' },
    { path: '/settings/advanced', name: 'Advanced' },
    { path: '/settings/blocked-users', name: 'Blocked Users' },
  ];

  for (const sp of settingsPages) {
    test(`should display ${sp.name} page`, async ({ page }) => {
      await performCasdoorLogin(page);

      await page.goto(sp.path);
      await page.waitForLoadState('domcontentloaded');

      // Should be on the settings page, not redirected to login
      expect(page.url()).not.toContain('/login');

      await page.screenshot({
        path: `e2e-screenshots/settings-${sp.name.toLowerCase().replace(/\s+/g, '-')}.png`,
        fullPage: true,
      });
    });
  }
});
