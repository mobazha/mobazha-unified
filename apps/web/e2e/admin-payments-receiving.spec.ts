import { test, expect, type Page } from '@playwright/test';
import { setupMockAuth } from './fixtures/mock-auth';

const ROW_SELECTOR = '[data-testid^="receiving-account-row-"]';
const NOW = new Date().toISOString();

function isMobileProject(projectName: string): boolean {
  return projectName.toLowerCase().includes('mobile');
}

function createMockAccounts() {
  return [
    {
      id: 101,
      name: 'E2E ETH Wallet',
      chainType: 'ETH',
      address: '0x1111111111111111111111111111111111111111',
      activeTokens: ['NATIVE', 'USDT'],
      inactiveTokens: ['USDC'],
      isActive: true,
      createdAt: NOW,
      updatedAt: NOW,
    },
    {
      id: 102,
      name: 'E2E LTC Wallet',
      chainType: 'LTC',
      address: 'tltc1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq',
      activeTokens: ['NATIVE'],
      inactiveTokens: [],
      isActive: false,
      createdAt: NOW,
      updatedAt: NOW,
    },
  ];
}

async function mockReceivingAccountsAPI(page: Page): Promise<void> {
  const accounts = createMockAccounts();

  await page.route('**/v1/wallet/receiving-accounts**', async route => {
    const req = route.request();
    const method = req.method();

    if (method === 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: accounts }),
      });
    }

    if (method === 'PUT') {
      const input = req.postDataJSON() as {
        id: number;
        name: string;
        chainType: string;
        address: string;
        activeTokens: string[];
        inactiveTokens: string[];
        isActive: boolean;
      };
      const index = accounts.findIndex(acc => acc.id === Number(input.id));
      if (index >= 0) {
        accounts[index] = {
          ...accounts[index],
          ...input,
          updatedAt: NOW,
        };
      }
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { success: true, account: accounts[index] } }),
      });
    }

    if (method === 'DELETE') {
      const match = req.url().match(/\/receiving-accounts\/(\d+)/);
      if (match) {
        const id = Number(match[1]);
        const index = accounts.findIndex(acc => acc.id === id);
        if (index >= 0) accounts.splice(index, 1);
      }
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { success: true } }),
      });
    }

    return route.fallback();
  });
}

test.describe('Admin Payments - Receiving Accounts', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockAuth(page);
    await mockReceivingAccountsAPI(page);

    await page.goto('/admin/settings/payments');
    await page.waitForLoadState('domcontentloaded');

    await expect(page.getByTestId('admin-payments')).toBeVisible();
    await expect(page.getByTestId('receiving-accounts-section')).toBeVisible();
    await expect(page.locator(ROW_SELECTOR)).toHaveCount(2);
  });

  test('shows network lock banner and status filters', async ({ page }) => {
    const networkBanner = page.getByTestId('receiving-network-lock-banner');
    await expect(networkBanner).toBeVisible();
    await expect(networkBanner).toContainText(/mainnet|testnet|主网|测试网/i);

    const filters = page.getByTestId('receiving-status-filters');
    await expect(filters).toBeVisible();

    for (const filter of ['all', 'active', 'inactive'] as const) {
      const button = page.getByTestId(`receiving-filter-${filter}`);
      await button.click();
      await expect(button).toHaveClass(/border-primary/);
    }

    await page.getByTestId('receiving-filter-all').click();
    await expect(page.locator(ROW_SELECTOR)).toHaveCount(2);
  });

  test('desktop keeps inline row actions', async ({ page }, testInfo) => {
    if (isMobileProject(testInfo.project.name)) {
      test.skip();
    }

    const firstRow = page.locator(ROW_SELECTOR).first();
    await expect(firstRow).toBeVisible();
    await expect(firstRow.getByRole('switch')).toBeVisible();
    await expect(firstRow.getByTestId('receiving-account-edit')).toBeVisible();
    await expect(firstRow.getByTestId('receiving-account-delete')).toBeVisible();
    await expect(firstRow.getByTestId('receiving-account-actions')).toHaveCount(0);
  });

  test('mobile opens bottom-sheet actions', async ({ page }, testInfo) => {
    if (!isMobileProject(testInfo.project.name)) {
      test.skip();
    }

    const firstRow = page.locator(ROW_SELECTOR).first();
    const actionsButton = firstRow.getByTestId('receiving-account-actions');
    await expect(actionsButton).toBeVisible();
    await actionsButton.click();

    const sheet = page.getByRole('dialog');
    await expect(sheet).toBeVisible();
    await expect(sheet.getByRole('button', { name: /edit|编辑/i })).toBeVisible();
    await expect(sheet.getByRole('button', { name: /copy|复制/i })).toBeVisible();
    await expect(sheet.getByRole('button', { name: /delete|删除/i })).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(sheet).toBeHidden();
  });
});
