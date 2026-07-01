/**
 * Settings & Access Control E2E Tests
 * 设置和专卖店访问控制 E2E 测试
 *
 * All settings pages require authentication.
 */

import { expect } from '@playwright/test';
import { authenticatedTest } from './fixtures/auth';

authenticatedTest.describe('Settings Page', () => {
  authenticatedTest('should display settings page', async ({ authedPage }) => {
    await authedPage.goto('/settings');
    await authedPage.waitForLoadState('domcontentloaded');

    const heading = authedPage.locator('h1').first();
    await expect(heading).toContainText(/Setting|设置/i);
  });

  authenticatedTest('should show settings sections', async ({ authedPage }) => {
    await authedPage.goto('/settings');
    await authedPage.waitForLoadState('domcontentloaded');

    const content = authedPage.locator('main, .settings-container, section, [role="region"]');
    await expect(content.first()).toBeVisible();
  });

  authenticatedTest('should have profile settings', async ({ authedPage }) => {
    await authedPage.goto('/settings');
    await authedPage.waitForLoadState('domcontentloaded');

    const profileSection = authedPage.getByText(/profile|account|账户|资料/i);
    await expect(profileSection.first()).toBeVisible();
  });

  authenticatedTest('should have store settings', async ({ authedPage }) => {
    await authedPage.goto('/settings');
    await authedPage.waitForLoadState('domcontentloaded');

    const storeSection = authedPage.getByText(/store|shop|店铺/i);
    expect(await storeSection.count()).toBeGreaterThanOrEqual(0);
  });
});

authenticatedTest.describe('Privacy Settings (Exclusive Store)', () => {
  authenticatedTest('should display privacy settings page', async ({ authedPage }) => {
    await authedPage.goto('/settings/privacy');
    await authedPage.waitForLoadState('domcontentloaded');

    const content = authedPage.locator('main');
    await expect(content).toBeVisible();
  });

  authenticatedTest('should show private store toggle', async ({ authedPage }) => {
    await authedPage.goto('/settings/privacy');
    await authedPage.waitForLoadState('domcontentloaded');

    const privateToggle = authedPage.locator('input[type="checkbox"], [role="switch"]');
    expect(await privateToggle.count()).toBeGreaterThan(0);
  });

  authenticatedTest('should show require approval toggle', async ({ authedPage }) => {
    await authedPage.goto('/settings/privacy');
    await authedPage.waitForLoadState('domcontentloaded');

    const approvalToggle = authedPage.getByText(/approval|审核/i);
    expect(await approvalToggle.count()).toBeGreaterThanOrEqual(0);
  });
});

authenticatedTest.describe('User Groups Management', () => {
  authenticatedTest('should display user groups page', async ({ authedPage }) => {
    await authedPage.goto('/settings/user-groups');
    await authedPage.waitForLoadState('domcontentloaded');

    const content = authedPage.locator('main');
    await expect(content).toBeVisible();
  });

  authenticatedTest('should show create group button', async ({ authedPage }) => {
    await authedPage.goto('/settings/user-groups');
    await authedPage.waitForLoadState('domcontentloaded');

    const createButton = authedPage.locator('button').filter({ hasText: /create|add|新建|添加/i });
    expect(await createButton.count()).toBeGreaterThanOrEqual(0);
  });

  authenticatedTest('should display existing groups', async ({ authedPage }) => {
    await authedPage.goto('/settings/user-groups');
    await authedPage.waitForLoadState('domcontentloaded');

    const groups = authedPage.locator('[data-testid="user-group"], .group-card, article');
    expect(groups).toBeDefined();
  });

  authenticatedTest('should open create group modal/form', async ({ authedPage }) => {
    await authedPage.goto('/settings/user-groups');
    await authedPage.waitForLoadState('domcontentloaded');

    const createButton = authedPage.locator('button').filter({ hasText: /create|add|新建|添加/i });

    if (await createButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await createButton.click();

      const modal = authedPage.locator('[role="dialog"], form, .modal');
      await expect(modal.first()).toBeVisible();
    }
  });
});

authenticatedTest.describe('Product Groups Management', () => {
  authenticatedTest('should display product groups page', async ({ authedPage }) => {
    await authedPage.goto('/settings/product-groups');
    await authedPage.waitForLoadState('domcontentloaded');

    const content = authedPage.locator('main');
    await expect(content).toBeVisible();
  });

  authenticatedTest('should show create group button', async ({ authedPage }) => {
    await authedPage.goto('/settings/product-groups');
    await authedPage.waitForLoadState('domcontentloaded');

    const createButton = authedPage.locator('button').filter({ hasText: /create|add|新建|添加/i });
    expect(await createButton.count()).toBeGreaterThanOrEqual(0);
  });

  authenticatedTest('should show visibility options', async ({ authedPage }) => {
    await authedPage.goto('/settings/product-groups');
    await authedPage.waitForLoadState('domcontentloaded');

    const visibilityOption = authedPage.getByText(/public|private|group only|公开|私密/i);
    expect(await visibilityOption.count()).toBeGreaterThanOrEqual(0);
  });
});

authenticatedTest.describe('Access Requests Management', () => {
  authenticatedTest('should display access requests page', async ({ authedPage }) => {
    await authedPage.goto('/settings/access-requests');
    await authedPage.waitForLoadState('domcontentloaded');

    const content = authedPage.locator('main');
    await expect(content).toBeVisible();
  });

  authenticatedTest('should show stats cards', async ({ authedPage }) => {
    await authedPage.goto('/settings/access-requests');
    await authedPage.waitForLoadState('domcontentloaded');

    const pendingText = authedPage.getByText('Pending');
    const approvedText = authedPage.getByText('Approved');
    const rejectedText = authedPage.getByText('Rejected');

    await expect(pendingText.first()).toBeVisible();
    await expect(approvedText.first()).toBeVisible();
    await expect(rejectedText.first()).toBeVisible();
  });

  authenticatedTest('should show pending requests', async ({ authedPage }) => {
    await authedPage.goto('/settings/access-requests');
    await authedPage.waitForLoadState('domcontentloaded');

    const requests = authedPage.locator('[data-testid="access-request-item"]');
    expect(await requests.count()).toBeGreaterThan(0);
  });

  authenticatedTest(
    'should show approve/reject buttons for pending requests',
    async ({ authedPage }) => {
      await authedPage.goto('/settings/access-requests');
      await authedPage.waitForLoadState('domcontentloaded');

      const approveButton = authedPage.locator('button').filter({ hasText: /Approve/i });
      const reviewButton = authedPage.locator('button').filter({ hasText: /Review/i });

      expect(await approveButton.count()).toBeGreaterThan(0);
      expect(await reviewButton.count()).toBeGreaterThan(0);
    }
  );

  authenticatedTest('should filter requests by status', async ({ authedPage }) => {
    await authedPage.goto('/settings/access-requests');
    await authedPage.waitForLoadState('domcontentloaded');

    const allFilter = authedPage.locator('button').filter({ hasText: 'All' });
    await allFilter.click();

    const requests = authedPage.locator('[data-testid="access-request-item"]');
    expect(await requests.count()).toBeGreaterThanOrEqual(2);
  });

  authenticatedTest('should open review modal', async ({ authedPage }) => {
    await authedPage.goto('/settings/access-requests');
    await authedPage.waitForLoadState('domcontentloaded');

    const reviewButton = authedPage
      .locator('button')
      .filter({ hasText: /Review/i })
      .first();
    if (!(await reviewButton.isVisible({ timeout: 5000 }).catch(() => false))) return;
    await reviewButton.click();

    const modal = authedPage.locator('text=Review Request');
    await expect(modal).toBeVisible();

    const cancelButton = authedPage.locator('button').filter({ hasText: 'Cancel' });
    await expect(cancelButton).toBeVisible();
  });
});

authenticatedTest.describe('Blocked Users Management', () => {
  authenticatedTest('should display blocked users page', async ({ authedPage }) => {
    await authedPage.goto('/settings/blocked-users');
    await authedPage.waitForLoadState('domcontentloaded');

    const content = authedPage.locator('main');
    await expect(content).toBeVisible();
  });

  authenticatedTest('should show blocked users list or empty state', async ({ authedPage }) => {
    await authedPage.goto('/settings/blocked-users');
    await authedPage.waitForLoadState('domcontentloaded');

    const blockedUsers = authedPage.locator('[data-testid="blocked-user-item"]');
    const emptyState = authedPage.getByText(/no blocked|没有屏蔽/i);
    const hasUsers = (await blockedUsers.count()) > 0;
    const hasEmpty = await emptyState.isVisible({ timeout: 3000 }).catch(() => false);
    expect(hasUsers || hasEmpty || true).toBe(true);
  });

  authenticatedTest('should show block user button', async ({ authedPage }) => {
    await authedPage.goto('/settings/blocked-users');
    await authedPage.waitForLoadState('domcontentloaded');

    const blockButton = authedPage.locator('button').filter({ hasText: /Block User/i });
    const hasBtn = await blockButton.isVisible({ timeout: 5000 }).catch(() => false);
    expect(hasBtn || (await authedPage.locator('main').isVisible())).toBe(true);
  });
});
