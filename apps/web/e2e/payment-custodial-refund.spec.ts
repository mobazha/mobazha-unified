import { test, expect } from '@playwright/test';
import { mustAssetIdFromTokenId } from '@mobazha/core/data';
import { setupMockAuth } from './fixtures/mock-auth';
import { mockOrderDetailAPI, mockPaymentMethodsAPI } from './fixtures/mock-api-routes';

const VENDOR_PEER_ID = 'QmY8tRnCzUf45FnPLMvFi35R5bYjCEiCKbgEN39xnScj8P';
const DEFAULT_REFUND = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e';

function buildAwaitingPaymentOrder(orderId: string) {
  const freshTimestamp = new Date(Date.now() - 2 * 60 * 1000).toISOString();
  return {
    contract: {
      OrderID: orderId,
      orderOpen: {
        listings: [
          {
            vendorID: { peerID: VENDOR_PEER_ID },
            listing: {
              slug: 'eth-item',
              metadata: {
                contractType: 'PHYSICAL_GOOD',
                pricingCurrency: { code: 'USD', divisibility: 2 },
              },
              vendorID: { peerID: VENDOR_PEER_ID, handle: 'techstore' },
              item: {
                title: 'ETH Test Item',
                description: 'custodial refund flow',
                price: 1599,
                images: [],
              },
            },
          },
        ],
        pricingCoin: 'USD',
        amount: 1599,
        shipping: {
          shipTo: 'John Smith',
          address: '123 Blockchain Avenue',
          city: 'San Francisco',
          state: 'CA',
          postalCode: '94105',
          country: 'US',
        },
        items: [{ quantity: 1, shippingOption: { name: 'Standard', service: 'Standard' } }],
        timestamp: freshTimestamp,
        buyerID: { peerID: 'QmBuyerPeer1234567890abcdefghijk', handle: 'cryptobuyer' },
      },
    },
    state: 'AWAITING_PAYMENT',
    read: false,
    funded: false,
    paymentAddressTransactions: [],
  };
}

test.describe('Payment - custodial refund UX', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockAuth(page);
    await mockPaymentMethodsAPI(page);
  });

  test('shows confirm notice when exchange is checked and default refund address exists', async ({
    page,
  }) => {
    const orderId = 'custodial-refund-prefill-order';

    await page.route('**/v1/preferences', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              refundReceivingAddresses: {
                [mustAssetIdFromTokenId('ETH')]: DEFAULT_REFUND,
              },
            },
          }),
        });
        return;
      }
      await route.continue();
    });

    await mockOrderDetailAPI(page, {
      orderId,
      order: buildAwaitingPaymentOrder(orderId),
      vendorPeerID: VENDOR_PEER_ID,
    });

    await page.goto(`/payment?orderID=${orderId}`);
    await page.waitForLoadState('domcontentloaded');

    await page.getByTestId('payment-custodial-checkbox').check();

    await expect(page.getByTestId('payment-custodial-refund-confirm')).toBeVisible();
    await expect(page.getByTestId('payment-custodial-refund-address')).toHaveCount(0);
    await expect(page.getByText(DEFAULT_REFUND.slice(0, 6))).toBeVisible();
  });

  test('requires refund address input when exchange is checked without default', async ({
    page,
  }) => {
    const orderId = 'custodial-refund-empty-order';

    await page.route('**/v1/preferences', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: {} }),
        });
        return;
      }
      await route.continue();
    });

    await mockOrderDetailAPI(page, {
      orderId,
      order: buildAwaitingPaymentOrder(orderId),
      vendorPeerID: VENDOR_PEER_ID,
    });

    await page.goto(`/payment?orderID=${orderId}`);
    await page.waitForLoadState('domcontentloaded');

    await page.getByTestId('payment-custodial-checkbox').check();

    await expect(page.getByTestId('payment-custodial-refund-address')).toBeVisible();
    await expect(page.getByTestId('payment-custodial-refund-confirm')).toHaveCount(0);
  });
});
