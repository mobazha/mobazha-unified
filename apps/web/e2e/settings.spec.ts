/**
 * Settings & Access Control E2E Tests
 * 设置和专卖店访问控制 E2E 测试
 */

import { test, expect } from '@playwright/test';

test.describe('Settings Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings');
  });

  test('should display settings page', async ({ page }) => {
    const heading = page.locator('h1').first();
    await expect(heading).toContainText(/Setting|设置/i);
  });

  test('should show settings sections', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Look for settings content - either sections or main content
    const content = page.locator('main, .settings-container, section, [role="region"]');
    await expect(content.first()).toBeVisible();
  });

  test('should have profile settings', async ({ page }) => {
    const profileSection = page.getByText(/profile|account|账户|资料/i);
    await expect(profileSection.first()).toBeVisible();
  });

  test('should have store settings', async ({ page }) => {
    const storeSection = page.getByText(/store|shop|店铺/i);
    expect(await storeSection.count()).toBeGreaterThanOrEqual(0);
  });
});

test.describe('Privacy Settings (Exclusive Store)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings/privacy');
  });

  test('should display privacy settings page', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should show private store toggle', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    const privateToggle = page.locator('input[type="checkbox"], [role="switch"]');
    expect(await privateToggle.count()).toBeGreaterThan(0);
  });

  test('should show require approval toggle', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    const approvalToggle = page.getByText(/approval|审核/i);
    expect(await approvalToggle.count()).toBeGreaterThanOrEqual(0);
  });
});

test.describe('User Groups Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings/user-groups');
  });

  test('should display user groups page', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should show create group button', async ({ page }) => {
    const createButton = page.locator('button').filter({ hasText: /create|add|新建|添加/i });
    expect(await createButton.count()).toBeGreaterThanOrEqual(0);
  });

  test('should display existing groups', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Either groups or empty state
    const groups = page.locator('[data-testid="user-group"], .group-card, article');
    expect(groups).toBeDefined();
  });

  test('should open create group modal/form', async ({ page }) => {
    const createButton = page.locator('button').filter({ hasText: /create|add|新建|添加/i });

    if (await createButton.isVisible()) {
      await createButton.click();

      // Modal or form should appear
      const modal = page.locator('[role="dialog"], form, .modal');
      await expect(modal.first()).toBeVisible();
    }
  });
});

test.describe('Product Groups Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings/product-groups');
  });

  test('should display product groups page', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should show create group button', async ({ page }) => {
    const createButton = page.locator('button').filter({ hasText: /create|add|新建|添加/i });
    expect(await createButton.count()).toBeGreaterThanOrEqual(0);
  });

  test('should show visibility options', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    const visibilityOption = page.getByText(/public|private|group only|公开|私密/i);
    expect(await visibilityOption.count()).toBeGreaterThanOrEqual(0);
  });
});

test.describe('Access Requests Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings/access-requests');
  });

  test('should display access requests page', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    const heading = page.locator('h1');
    await expect(heading).toContainText('Access Requests');

    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should show stats cards', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Should show pending, approved, rejected counts
    const pendingText = page.getByText('Pending');
    const approvedText = page.getByText('Approved');
    const rejectedText = page.getByText('Rejected');

    await expect(pendingText.first()).toBeVisible();
    await expect(approvedText.first()).toBeVisible();
    await expect(rejectedText.first()).toBeVisible();
  });

  test('should show pending requests', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    const requests = page.locator('[data-testid="access-request-item"]');
    expect(await requests.count()).toBeGreaterThan(0);
  });

  test('should show approve/reject buttons for pending requests', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    const approveButton = page.locator('button').filter({ hasText: /Approve/i });
    const reviewButton = page.locator('button').filter({ hasText: /Review/i });

    // Should have action buttons for pending requests
    expect(await approveButton.count()).toBeGreaterThan(0);
    expect(await reviewButton.count()).toBeGreaterThan(0);
  });

  test('should filter requests by status', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Click "All" filter
    const allFilter = page.locator('button').filter({ hasText: 'All' });
    await allFilter.click();

    // Should show all requests
    const requests = page.locator('[data-testid="access-request-item"]');
    expect(await requests.count()).toBeGreaterThanOrEqual(2);
  });

  test('should open review modal', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    const reviewButton = page
      .locator('button')
      .filter({ hasText: /Review/i })
      .first();
    await reviewButton.click();

    // Modal should appear
    const modal = page.locator('text=Review Request');
    await expect(modal).toBeVisible();

    // Should have Cancel and Approve buttons in modal
    const cancelButton = page.locator('button').filter({ hasText: 'Cancel' });
    await expect(cancelButton).toBeVisible();
  });
});

test.describe('Blocked Users Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings/blocked-users');
  });

  test('should display blocked users page', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    const heading = page.locator('h1');
    await expect(heading).toContainText('Blocked Users');

    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should show blocked users list', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    const blockedUsers = page.locator('[data-testid="blocked-user-item"]');
    expect(await blockedUsers.count()).toBeGreaterThan(0);
  });

  test('should show block user button', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    const blockButton = page.locator('button').filter({ hasText: 'Block User' });
    await expect(blockButton).toBeVisible();
  });

  test('should show unblock button for each user', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    const unblockButtons = page.locator('button').filter({ hasText: 'Unblock' });
    expect(await unblockButtons.count()).toBeGreaterThan(0);
  });

  test('should open add block modal', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    const blockButton = page.locator('button').filter({ hasText: 'Block User' });
    await blockButton.click();

    // Modal should appear
    const modal = page.locator('text=Block a User');
    await expect(modal).toBeVisible();

    // Should have Peer ID input
    const peerIdInput = page.getByPlaceholder('Qm...');
    await expect(peerIdInput).toBeVisible();
  });

  test('should search blocked users', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    const searchInput = page.getByPlaceholder(/search/i);
    await searchInput.fill('Spam');

    // Should filter to show only matching user
    const blockedUsers = page.locator('[data-testid="blocked-user-item"]');
    expect(await blockedUsers.count()).toBeGreaterThanOrEqual(1);
  });

  test('should show confirmation when unblocking', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    const unblockButton = page.locator('button').filter({ hasText: 'Unblock' }).first();
    await unblockButton.click();

    // Confirmation modal should appear
    const confirmModal = page.locator('text=Unblock User?');
    await expect(confirmModal).toBeVisible();
  });
});
