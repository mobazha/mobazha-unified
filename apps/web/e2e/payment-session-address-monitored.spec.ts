import { test, expect } from '@playwright/test';
import { mustAssetIdFromTokenId } from '@mobazha/core/data';
import { setupMockAuth } from './fixtures/mock-auth';
import { mockOrderDetailAPI, mockPaymentMethodsAPI } from './fixtures/mock-api-routes';

const VENDOR_PEER_ID = 'QmY8tRnCzUf45FnPLMvFi35R5bYjCEiCKbgEN39xnScj8P';
const MODERATOR = {
  peerID: 'QmModeratorPeer9876543210xyz',
  name: 'Trusted Moderator',
};

function paymentActionButton(page: import('@playwright/test').Page) {
  return page
    .locator('button:visible')
    .filter({ hasText: /Get Payment Address|^Pay$/ })
    .first();
}

function buildAwaitingPaymentOrder(orderId: string, slug: string, title: string) {
  const freshTimestamp = new Date(Date.now() - 2 * 60 * 1000).toISOString();

  return {
    contract: {
      OrderID: orderId,
      orderOpen: {
        listings: [
          {
            vendorID: { peerID: VENDOR_PEER_ID },
            listing: {
              slug,
              metadata: {
                contractType: 'PHYSICAL_GOOD',
                pricingCurrency: { code: 'USD', divisibility: 2 },
              },
              vendorID: { peerID: VENDOR_PEER_ID, handle: 'techstore' },
              item: {
                title,
                description: 'Test listing for payment session flow',
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

async function runAddressMonitoredPaymentSessionTest({
  page,
  orderId,
  tokenId,
  amount,
  address,
  slug,
  title,
  qrPayload,
}: {
  page: import('@playwright/test').Page;
  orderId: string;
  tokenId: 'BTC' | 'ETH';
  amount: string;
  address: string;
  slug: string;
  title: string;
  qrPayload: string;
}) {
  const sessionExpiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  let paymentSessionCalls = 0;

  await setupMockAuth(page);
  await page.addInitScript(
    ([selectedTokenId, moderator]) => {
      sessionStorage.setItem('checkout_selected_token', selectedTokenId);
      sessionStorage.setItem('checkout_selected_moderator', JSON.stringify(moderator));
    },
    [tokenId, MODERATOR] as const
  );

  await mockPaymentMethodsAPI(page, {
    crypto: [mustAssetIdFromTokenId(tokenId)],
    fiat: [],
  });
  await mockOrderDetailAPI(page, buildAwaitingPaymentOrder(orderId, slug, title));

  await page.route('**/v1/orders/**/payment-session', async route => {
    paymentSessionCalls += 1;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          sessionID: `ps_${tokenId.toLowerCase()}_001`,
          orderID: orderId,
          paymentCoin: mustAssetIdFromTokenId(tokenId),
          settlementMode: 'address_monitored',
          productMode: 'moderated',
          status: 'awaiting_funds',
          expectedAmount: amount,
          expiresAt: sessionExpiresAt,
          fundingTarget: {
            type: 'address',
            address,
            assetID: mustAssetIdFromTokenId(tokenId),
            amount,
            qrPayload,
          },
          paymentProgress: {
            observedAmount: '0',
            requiredAmount: amount,
            remainingAmount: amount,
            observationCount: 0,
            fundingState: 'awaiting_funds',
          },
        },
      }),
    });
  });

  await page.goto(`/payment?orderID=${orderId}`);
  await page.waitForLoadState('domcontentloaded');

  const payButton = paymentActionButton(page);
  await expect(payButton).toBeVisible();
  await payButton.click();

  await expect(page.getByText(address)).toBeVisible();
  await expect(page.getByText(`= ${amount} ${tokenId}`)).toBeVisible();
  await expect(
    page.getByRole('heading', { name: new RegExp(`send ${tokenId.toLowerCase()}`, 'i') })
  ).toBeVisible();

  expect(paymentSessionCalls).toBe(1);
}

test.describe('Payment Session Address Monitored Flow', () => {
  test('BTC payment page uses payment-session', async ({ page }) => {
    await runAddressMonitoredPaymentSessionTest({
      page,
      orderId: 'QmPaymentSessionBTC001',
      tokenId: 'BTC',
      amount: '0.00012345',
      address: 'bcrt1qexampleaddress0000000000000000000000000',
      slug: 'btc-wallet-item',
      title: 'BTC Wallet Test Item',
      qrPayload: 'bitcoin:bcrt1qexampleaddress0000000000000000000000000?amount=0.00012345',
    });
  });

  test('Safe ETH payment page uses payment-session', async ({ page }) => {
    await runAddressMonitoredPaymentSessionTest({
      page,
      orderId: 'QmPaymentSessionSAFE001',
      tokenId: 'ETH',
      amount: '0.011',
      address: '0x1234567890abcdef1234567890abcdef12345678',
      slug: 'safe-wallet-item',
      title: 'Safe ETH Test Item',
      qrPayload: 'ethereum:0x1234567890abcdef1234567890abcdef12345678?value=0.011',
    });
  });

  test('expired payment session can refresh to a new address', async ({ page }) => {
    let paymentSessionCalls = 0;
    const orderId = 'QmPaymentSessionRefresh001';

    await setupMockAuth(page);
    await page.addInitScript(
      ([selectedTokenId, moderator]) => {
        sessionStorage.setItem('checkout_selected_token', selectedTokenId);
        sessionStorage.setItem('checkout_selected_moderator', JSON.stringify(moderator));
      },
      ['BTC', MODERATOR] as const
    );

    await mockPaymentMethodsAPI(page, {
      crypto: [mustAssetIdFromTokenId('BTC')],
      fiat: [],
    });
    await mockOrderDetailAPI(
      page,
      buildAwaitingPaymentOrder(orderId, 'btc-refresh-item', 'BTC Refresh Test Item')
    );

    await page.route('**/v1/orders/**/payment-session', async route => {
      paymentSessionCalls += 1;
      const expired = paymentSessionCalls === 1;
      const amount = expired ? '0.00011111' : '0.00022222';
      const address = expired
        ? 'bcrt1qexpiredaddress0000000000000000000000000'
        : 'bcrt1qrefreshedaddress0000000000000000000000';
      const expiresAt = expired
        ? new Date(Date.now() - 5 * 60 * 1000).toISOString()
        : new Date(Date.now() + 30 * 60 * 1000).toISOString();

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            sessionID: 'ps_btc_refresh_001',
            orderID: orderId,
            paymentCoin: mustAssetIdFromTokenId('BTC'),
            settlementMode: 'address_monitored',
            productMode: 'moderated',
            status: 'awaiting_funds',
            expectedAmount: amount,
            expiresAt,
            fundingTarget: {
              type: 'address',
              address,
              assetID: mustAssetIdFromTokenId('BTC'),
              amount,
              qrPayload: `bitcoin:${address}?amount=${amount}`,
            },
            paymentProgress: {
              observedAmount: '0',
              requiredAmount: amount,
              remainingAmount: amount,
              observationCount: 0,
              fundingState: 'awaiting_funds',
            },
          },
        }),
      });
    });

    await page.goto(`/payment?orderID=${orderId}`);
    await page.waitForLoadState('domcontentloaded');

    await paymentActionButton(page).click();

    await expect(page.getByRole('heading', { name: /payment expired/i })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Get New Address' })).toBeVisible();
    await expect(
      page.getByText('This payment address has expired. Please request a new one to continue.')
    ).toBeVisible();

    await page.getByRole('button', { name: 'Get New Address' }).click();

    await expect(page.getByText('bcrt1qrefreshedaddress0000000000000000000000')).toBeVisible();
    await expect(page.getByText('= 0.00022222 BTC')).toBeVisible();
    await expect(page.getByRole('heading', { name: /send btc/i })).toBeVisible();

    expect(paymentSessionCalls).toBe(2);
  });
});
