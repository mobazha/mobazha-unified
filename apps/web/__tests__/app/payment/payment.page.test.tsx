// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import React, { useEffect } from 'react';
import {
  normalizeCheckoutPaymentPolicy,
  persistCheckoutPaymentPolicy,
  readCheckoutPaymentPolicyFromSession,
  sanitizeCheckoutPaymentPolicySession,
  syncCheckoutPaymentSessionStorage,
} from '@mobazha/core';
import {
  resolvePaymentPageRestoreOptions,
  resolvePaymentRuntimeVendorPeerID,
  isActivePaymentOrderFetch,
} from '@/app/payment/paymentPolicyRestore';
import {
  resolveDealDefaultProtectionProvider,
  resolveDealDefaultTokenID,
} from '@/app/payment/dealPaymentDefaults';

function applyPaymentPageRestore(
  restoreFromSession: (options: ReturnType<typeof resolvePaymentPageRestoreOptions>) => void,
  options: Parameters<typeof resolvePaymentPageRestoreOptions>[0]
) {
  restoreFromSession(resolvePaymentPageRestoreOptions(options));
}

function PaymentRestoreHarness({
  lockedForOrderID,
  orderID,
  urlPaymentPolicy,
  onRestore,
}: {
  lockedForOrderID: string | null;
  orderID: string;
  urlPaymentPolicy: string;
  onRestore: (options: ReturnType<typeof resolvePaymentPageRestoreOptions>) => void;
}) {
  useEffect(() => {
    const restore = () => {
      onRestore(
        resolvePaymentPageRestoreOptions({
          orderPaymentPolicyLockedForOrderID: lockedForOrderID,
          orderID,
          urlPaymentPolicy,
        })
      );
    };

    restore();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        restore();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [lockedForOrderID, orderID, onRestore, urlPaymentPolicy]);

  return null;
}

describe('PaymentPage payment policy restore', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  describe('isActivePaymentOrderFetch', () => {
    it('matches only when requested and active order IDs are the same non-empty value', () => {
      expect(isActivePaymentOrderFetch('order-a', 'order-a')).toBe(true);
      expect(isActivePaymentOrderFetch('order-a', 'order-b')).toBe(false);
      expect(isActivePaymentOrderFetch('order-a', null)).toBe(false);
      expect(isActivePaymentOrderFetch(null, 'order-a')).toBe(false);
      expect(isActivePaymentOrderFetch(undefined, undefined)).toBe(false);
    });
  });

  describe('resolvePaymentRuntimeVendorPeerID', () => {
    it('routes Deal payment quotes and sessions to the accepted seller order', () => {
      expect(
        resolvePaymentRuntimeVendorPeerID({
          isDealBacked: true,
          vendorPeerID: 'seller-peer-id',
        })
      ).toBe('seller-peer-id');
    });

    it('preserves the existing store route for non-Deal orders', () => {
      expect(
        resolvePaymentRuntimeVendorPeerID({
          isDealBacked: false,
          vendorPeerID: '  seller-peer-id  ',
        })
      ).toBe('seller-peer-id');
    });
  });

  describe('Deal payment defaults', () => {
    it('preselects only one seller-supported crypto choice when no fiat choice competes', () => {
      expect(
        resolveDealDefaultTokenID({
          isDealBacked: true,
          availableCryptoTokenIds: ['SOLUSDC'],
          hasVisibleFiatMethod: false,
        })
      ).toBe('SOLUSDC');

      expect(
        resolveDealDefaultTokenID({
          isDealBacked: true,
          availableCryptoTokenIds: ['SOLUSDC', 'ETHUSDC'],
          hasVisibleFiatMethod: false,
        })
      ).toBeUndefined();

      expect(
        resolveDealDefaultTokenID({
          isDealBacked: true,
          availableCryptoTokenIds: ['SOLUSDC'],
          hasVisibleFiatMethod: true,
        })
      ).toBeUndefined();
    });

    it('replaces a stale token only when the current Deal has one valid choice', () => {
      expect(
        resolveDealDefaultTokenID({
          isDealBacked: true,
          currentTokenID: 'STALE',
          availableCryptoTokenIds: ['SOLUSDC'],
          hasVisibleFiatMethod: false,
        })
      ).toBe('SOLUSDC');
      expect(
        resolveDealDefaultTokenID({
          isDealBacked: true,
          currentTokenID: 'SOLUSDC',
          availableCryptoTokenIds: ['SOLUSDC'],
          hasVisibleFiatMethod: false,
        })
      ).toBeUndefined();
    });

    it('uses the first rating-sorted verified protection provider for a Deal', () => {
      const candidates = [
        { peerID: 'unverified', verified: false },
        { peerID: 'recommended', verifiedMod: true },
        { peerID: 'also-verified', verified: true },
      ];

      expect(
        resolveDealDefaultProtectionProvider({
          isDealBacked: true,
          protectionEnabled: true,
          isLoading: false,
          candidates,
        })
      ).toEqual(candidates[1]);
    });

    it('preserves a current seller-listed provider and never defaults while loading', () => {
      const candidates = [{ peerID: 'current', verified: false }];
      expect(
        resolveDealDefaultProtectionProvider({
          isDealBacked: true,
          protectionEnabled: true,
          isLoading: false,
          currentProviderPeerID: 'current',
          candidates,
        })
      ).toBeUndefined();
      expect(
        resolveDealDefaultProtectionProvider({
          isDealBacked: true,
          protectionEnabled: true,
          isLoading: true,
          candidates: [{ peerID: 'verified', verified: true }],
        })
      ).toBeUndefined();
    });
  });

  it('uses URL paymentPolicy as a hint only before order policy is locked', () => {
    expect(
      resolvePaymentPageRestoreOptions({
        orderPaymentPolicyLockedForOrderID: null,
        orderID: 'order-1',
        urlPaymentPolicy: 'all',
      })
    ).toEqual({
      orderID: 'order-1',
      paymentPolicy: 'all',
    });
  });

  it('ignores stale or malicious URL paymentPolicy after order policy is locked', () => {
    expect(
      resolvePaymentPageRestoreOptions({
        orderPaymentPolicyLockedForOrderID: 'order-1',
        orderID: 'order-1',
        urlPaymentPolicy: 'all',
      })
    ).toEqual({
      orderID: 'order-1',
    });
  });

  it('does not apply a stale lock from a previous order to the current order', () => {
    expect(
      resolvePaymentPageRestoreOptions({
        orderPaymentPolicyLockedForOrderID: 'order-old',
        orderID: 'order-new',
        urlPaymentPolicy: 'all',
      })
    ).toEqual({
      orderID: 'order-new',
      paymentPolicy: 'all',
    });
  });

  it('stale paymentPolicy=all cannot re-enable fiat after authoritative escrow policy persisted', () => {
    sessionStorage.setItem('checkout_selected_fiat_provider', 'stripe');
    persistCheckoutPaymentPolicy('escrow_crypto_only', 'source-order');
    sanitizeCheckoutPaymentPolicySession('escrow_crypto_only');

    applyPaymentPageRestore(
      options => {
        const checkoutPaymentPolicy = options.paymentPolicy
          ? normalizeCheckoutPaymentPolicy(options.paymentPolicy)
          : readCheckoutPaymentPolicyFromSession(options.orderID);

        if (options.orderID && options.paymentPolicy) {
          persistCheckoutPaymentPolicy(checkoutPaymentPolicy, options.orderID);
        }

        syncCheckoutPaymentSessionStorage({ paymentPolicy: checkoutPaymentPolicy });
      },
      {
        orderPaymentPolicyLockedForOrderID: 'source-order',
        orderID: 'source-order',
        urlPaymentPolicy: 'all',
      }
    );

    expect(readCheckoutPaymentPolicyFromSession('source-order')).toBe('escrow_crypto_only');
    const session = syncCheckoutPaymentSessionStorage({
      paymentPolicy: readCheckoutPaymentPolicyFromSession('source-order'),
    });
    expect(session.fiatProvider).toBeUndefined();
    expect(sessionStorage.getItem('checkout_selected_fiat_provider')).toBeNull();
  });

  describe('visibility restoration', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('does not pass malicious URL policy when tab becomes visible after policy lock', () => {
      const onRestore = vi.fn();
      persistCheckoutPaymentPolicy('escrow_crypto_only', 'source-order');
      sanitizeCheckoutPaymentPolicySession('escrow_crypto_only');

      render(
        <PaymentRestoreHarness
          lockedForOrderID="source-order"
          orderID="source-order"
          urlPaymentPolicy="all"
          onRestore={onRestore}
        />
      );

      expect(onRestore).toHaveBeenCalledWith({ orderID: 'source-order' });

      onRestore.mockClear();
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        value: 'visible',
      });

      act(() => {
        document.dispatchEvent(new Event('visibilitychange'));
      });

      expect(onRestore).toHaveBeenCalledWith({ orderID: 'source-order' });
      expect(onRestore).not.toHaveBeenCalledWith(expect.objectContaining({ paymentPolicy: 'all' }));
    });
  });
});
