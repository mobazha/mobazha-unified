import { test, expect } from '@playwright/test';
import { setupMockAuth } from './fixtures/mock-auth';
import { mockPaymentMethodsAPI } from './fixtures/mock-api-routes';

const MOCK_VENDOR_PEER_ID = 'QmY8tRnCzUf45FnPLMvFi35R5bYjCEiCKbgEN39xnScj8P';

function paymentMethodURL() {
  return `/checkout/payment-method?vendor=${MOCK_VENDOR_PEER_ID}&returnUrl=%2Fcheckout`;
}

test.describe('Payment Fiat Smoke', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockAuth(page);
    await mockPaymentMethodsAPI(page, {
      crypto: ['ETHUSDT'],
      fiat: [{ providerID: 'stripe', status: 'active', accountID: 'acct_stage2_mock' }],
    });
  });

  test('should render and select fiat method', async ({ page }) => {
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
