// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import { describe, expect, it, vi } from 'vitest';
import { isPaymentCoinEnabled } from '@mobazha/core/data/tokens';
import { getAvailablePaymentTokens } from '@/components/Payment/config';

import { defaultWantedCoin, getWantedCoins, wantedCoinLabel } from '../wantedCoins';

/**
 * The board's currency list is the payment selector's list, so these tests are
 * about the two never drifting apart: a currency a seller cannot be paid in must
 * not be offered, and a currency this node can take must not be missing.
 */
describe('wanted board currencies', () => {
  it('offers the same tokens the payment selector does', () => {
    const payable = getAvailablePaymentTokens().map(token => token.id);
    const ids = getWantedCoins().map(coin => coin.id);
    if (payable.length > 0) {
      expect(ids).toEqual(payable);
      return;
    }
    // No runtime answer — a test environment, or a node that has not said what
    // it takes. The registry's enabled tokens stand in, and the next test holds
    // the line that nothing retired sneaks in with them.
    expect(ids.length).toBeGreaterThan(0);
  });

  it('is never empty, even before the runtime has said what it can take', () => {
    // The payment selector answers this from runtime state; if that is missing
    // the form still needs currencies in it.
    expect(getWantedCoins().length).toBeGreaterThan(0);
  });

  it('covers the currencies this platform is paid in', () => {
    const ids = getWantedCoins().map(coin => coin.id);
    const registryFallback = getAvailablePaymentTokens().length === 0;
    // The registry's own list is described as "the currencies the code ships
    // with"; what must hold either way is that nothing offered is retired.
    for (const id of ids) {
      expect(isPaymentCoinEnabled(id), `${id} is retired`).toBe(true);
    }
    if (!registryFallback) {
      for (const id of ['ETHUSDT', 'BSCUSDT', 'SOLUSDT', 'BTC', 'BCH', 'BNB', 'MATIC', 'SOL', 'ETH']) {
        expect(ids, `${id} is missing from the board`).toContain(id);
      }
    }
  });

  it('labels every currency, once each', () => {
    const coins = getWantedCoins();
    expect(new Set(coins.map(coin => coin.id)).size).toBe(coins.length);
    for (const coin of coins) {
      expect(coin.label.trim().length, `${coin.id} has no label`).toBeGreaterThan(0);
    }
    // A stablecoin is named with the chain it lands on.
    expect(wantedCoinLabel('BSCUSDT')).toContain('BNB');
  });

  it('opens the form on a currency it offers', () => {
    const coins = getWantedCoins();
    expect(coins.map(coin => coin.id)).toContain(defaultWantedCoin(coins));
  });

  it('derives from the payment selector when the runtime does answer', () => {
    // A permissive visibility policy stands in for a node that can take
    // everything the registry ships.
    vi.resetModules();
    vi.doMock('@mobazha/core/config/paymentMethodVisibility', async () => {
      const actual = await vi.importActual<typeof import('@mobazha/core/config/paymentMethodVisibility')>(
        '@mobazha/core/config/paymentMethodVisibility'
      );
      return { ...actual, filterVisiblePaymentTokens: (tokens: unknown[]) => tokens };
    });
    return import('../wantedCoins').then(({ getWantedCoins: derive }) => {
      const ids = derive().map(coin => coin.id);
      expect(ids).toContain('ETHUSDT');
      expect(ids).toContain('BTC');
      expect(ids.length).toBeGreaterThan(6);
      vi.doUnmock('@mobazha/core/config/paymentMethodVisibility');
    });
  });
});
