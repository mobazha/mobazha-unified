import { test, expect, type Page } from '@playwright/test';
import { setupMockAuth } from './fixtures/mock-auth';

async function mockPaymentPolicyAPI(page: Page): Promise<void> {
  await page.route('**/v1/settings/payment-policy**', async route => {
    const method = route.request().method();
    if (method === 'PUT') {
      const body = route.request().postDataJSON() as { utxoConfirmationPolicy?: string };
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: { utxoConfirmationPolicy: body.utxoConfirmationPolicy ?? 'chain_confirmed' },
        }),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: { utxoConfirmationPolicy: 'chain_confirmed' } }),
    });
  });
}

test.describe('Admin Store Policies', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockAuth(page);
    await mockPaymentPolicyAPI(page);

    await page.goto('/admin/settings/policies');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.getByTestId('admin-settings-policies')).toBeVisible();
  });

  test('shows policy copy only — payment controls live on store payments', async ({ page }) => {
    await expect(page.getByTestId('payment-confirmation-policy')).toHaveCount(0);
    await expect(page.getByTestId('admin-guest-checkout')).toHaveCount(0);

    await page.goto('/admin/payments');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.getByTestId('admin-payments')).toBeVisible();

    const policySection = page.getByTestId('payment-confirmation-policy');
    await policySection.scrollIntoViewIfNeeded();
    await expect(policySection).toBeVisible();

    const guestSection = page.getByTestId('admin-guest-checkout');
    await guestSection.scrollIntoViewIfNeeded();
    await expect(guestSection).toBeVisible();
  });
});
