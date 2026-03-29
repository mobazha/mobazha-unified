import { test, expect } from '@playwright/test';
import { setupMockAuth } from './fixtures/mock-auth';
import { mockPaymentMethodsAPI } from './fixtures/mock-api-routes';

const MOCK_VENDOR_PEER_ID = 'QmY8tRnCzUf45FnPLMvFi35R5bYjCEiCKbgEN39xnScj8P';

const CHAIN_CASES = [
  { tokenID: 'ETHUSDT', chainTab: 'Ethereum', chainLabel: 'Ethereum' },
  { tokenID: 'BSCUSDT', chainTab: 'BSC', chainLabel: 'BSC' },
  { tokenID: 'BASEUSDT', chainTab: 'Base', chainLabel: 'Base' },
  { tokenID: 'SOLUSDT', chainTab: 'Solana', chainLabel: 'Solana' },
  { tokenID: 'TRONUSDT', chainTab: 'TRON', chainLabel: 'TRON' },
];

function paymentMethodURL() {
  return `/checkout/payment-method?vendor=${MOCK_VENDOR_PEER_ID}`;
}

test.describe('Payment Method Multi-chain Smoke', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockAuth(page);
    await mockPaymentMethodsAPI(page, {
      crypto: CHAIN_CASES.map(c => c.tokenID),
      fiat: [{ providerID: 'stripe', status: 'active', accountID: 'acct_stage2_mock' }],
    });
  });

  test('should render payment method page with chain filters', async ({ page }) => {
    await page.goto(paymentMethodURL());
    await page.waitForLoadState('domcontentloaded');

    await expect(page.locator('main')).toBeVisible();
    for (const c of CHAIN_CASES) {
      await expect(page.getByRole('button', { name: c.chainTab, exact: true })).toBeVisible();
    }
  });

  for (const c of CHAIN_CASES) {
    test(`should show ${c.tokenID} option under ${c.chainTab}`, async ({ page }) => {
      await page.goto(paymentMethodURL());
      await page.waitForLoadState('domcontentloaded');

      await page.getByRole('button', { name: c.chainTab, exact: true }).click();
      const tokenCard = page
        .locator('button')
        .filter({ hasText: 'USDT' })
        .filter({ hasText: c.chainLabel })
        .first();
      await expect(tokenCard).toBeVisible();
    });
  }
});
