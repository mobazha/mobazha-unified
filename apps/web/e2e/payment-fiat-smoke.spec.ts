import { test, expect } from '@playwright/test';
import { setupMockAuth } from './fixtures/mock-auth';
import { mockPaymentMethodsAPI } from './fixtures/mock-api-routes';
import { isFiatPaymentVisible } from '@mobazha/core';

const MOCK_VENDOR_PEER_ID = 'QmY8tRnCzUf45FnPLMvFi35R5bYjCEiCKbgEN39xnScj8P';
const ETH_USDT_ASSET_ID = 'crypto:eip155:1:erc20:0xF36BFeE8fd7F1950c0129714Faf6d1e1F94a66AA';

function paymentMethodURL() {
  return `/checkout/payment-method?vendor=${MOCK_VENDOR_PEER_ID}&returnUrl=%2Fcheckout`;
}

test.describe('Payment Fiat Smoke', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockAuth(page);
    await mockPaymentMethodsAPI(page, {
      crypto: [ETH_USDT_ASSET_ID],
      fiat: [{ providerID: 'stripe', status: 'active', accountID: 'acct_stage2_mock' }],
    });
  });

  test('should render and select fiat method', async ({ page }) => {
    test.skip(!isFiatPaymentVisible(), 'Fiat payments hidden in UI');

    await page.goto(paymentMethodURL());
    await page.waitForLoadState('domcontentloaded');

    const stripeButton = page.getByRole('button', { name: /credit \/ debit card/i });
    await expect(stripeButton).toBeVisible();

    await stripeButton.click();
    await page.waitForURL('**/checkout');

    const selectedFiat = await page.evaluate(() =>
      window.sessionStorage.getItem('checkout_selected_fiat_provider')
    );
    const selectedToken = await page.evaluate(() =>
      window.sessionStorage.getItem('checkout_selected_token')
    );

    expect(selectedFiat).toBe('stripe');
    expect(selectedToken).toBeNull();
  });
});
