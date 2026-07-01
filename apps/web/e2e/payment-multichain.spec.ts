import { test, expect } from '@playwright/test';
import { mustAssetIdFromTokenId } from '@mobazha/core/data';
import { isFiatPaymentVisible, isTronPaymentVisible } from '@mobazha/core';
import { setupMockAuth } from './fixtures/mock-auth';
import { mockPaymentMethodsAPI } from './fixtures/mock-api-routes';

const MOCK_VENDOR_PEER_ID = 'QmY8tRnCzUf45FnPLMvFi35R5bYjCEiCKbgEN39xnScj8P';

const ALL_CHAIN_CASES = [
  { tokenID: 'ETHUSDT', chainTab: 'Ethereum', chainLabel: 'Ethereum' },
  { tokenID: 'BSCUSDT', chainTab: 'BSC', chainLabel: 'BSC' },
  { tokenID: 'BASEUSDT', chainTab: 'Base', chainLabel: 'Base' },
  { tokenID: 'SOLUSDT', chainTab: 'Solana', chainLabel: 'Solana' },
  { tokenID: 'TRXUSDT', chainTab: 'TRON', chainLabel: 'TRON' },
].map(chain => ({
  ...chain,
  assetId: mustAssetIdFromTokenId(chain.tokenID),
}));

const CHAIN_CASES = ALL_CHAIN_CASES.filter(c => isTronPaymentVisible() || c.tokenID !== 'TRXUSDT');

function paymentMethodURL() {
  return `/checkout/payment-method?vendor=${MOCK_VENDOR_PEER_ID}`;
}

test.describe('Payment Method Multi-chain Smoke', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockAuth(page);
    await mockPaymentMethodsAPI(page, {
      crypto: ALL_CHAIN_CASES.map(c => c.assetId),
      fiat: isFiatPaymentVisible()
        ? [{ providerID: 'stripe', status: 'active', accountID: 'acct_stage2_mock' }]
        : [],
    });
  });

  test('should render payment method page with chain filters', async ({ page }) => {
    await page.goto(paymentMethodURL());
    await page.waitForLoadState('domcontentloaded');

    await expect(page.locator('main')).toBeVisible();
    for (const c of CHAIN_CASES) {
      await expect(page.getByRole('button', { name: c.chainTab, exact: true })).toBeVisible();
    }
    if (!isTronPaymentVisible()) {
      await expect(page.getByRole('button', { name: 'TRON', exact: true })).toHaveCount(0);
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
