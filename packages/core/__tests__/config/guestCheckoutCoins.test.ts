import { beforeEach, describe, expect, it } from 'vitest';

import { initializeRuntimeConfig } from '../../config/runtimeConfig';
import {
  clearAcceptedCoins,
  getAvailableGuestCoins,
  getRuntimeGuestCheckoutCoins,
  setAcceptedCoins,
} from '../../config/guestCheckoutCoins';

function runtimeMethods(ids: string[]) {
  return {
    schemaVersion: 3,
    authMode: 'standalone',
    deployment: { mode: 'standalone', allowExternalResources: true },
    experience: { kind: 'store' },
    capabilitiesReady: true,
    features: {},
    capabilities: {
      commerce: { storefront: true, storeAdmin: true, checkout: true },
      marketplace: {
        discovery: false,
        operator: false,
        selling: false,
        curation: false,
        sellerReview: false,
        customDomains: false,
        releasePublishing: false,
        attribution: false,
      },
      sovereign: { isolatedRuntime: false, managedFleet: false },
      payments: {
        methods: ids.map(id => ({ id, kind: 'crypto', flow: 'address-transfer' })),
      },
    },
  };
}

describe('guest checkout runtime capabilities', () => {
  beforeEach(() => {
    clearAcceptedCoins();
    initializeRuntimeConfig({});
  });

  it('fails closed before a versioned backend snapshot is available', () => {
    expect(getRuntimeGuestCheckoutCoins()).toEqual([]);
    expect(getAvailableGuestCoins()).toEqual([]);
  });

  it('projects the Community backend payment set including transparent ZEC', () => {
    initializeRuntimeConfig(runtimeMethods(['BTC', 'BCH', 'LTC', 'ZEC']));
    expect(getRuntimeGuestCheckoutCoins().map(coin => coin.paymentCoin)).toEqual([
      'BTC',
      'LTC',
      'BCH',
      'ZEC',
    ]);
  });

  it('intersects seller settings with runtime capabilities', () => {
    initializeRuntimeConfig(runtimeMethods(['BTC', 'BCH', 'LTC', 'ZEC']));
    setAcceptedCoins(['BTC', 'ETH']);
    expect(getAvailableGuestCoins().map(coin => coin.paymentCoin)).toEqual(['BTC']);
  });

  it('allows a richer backend to enable another supported guest rail', () => {
    initializeRuntimeConfig(runtimeMethods(['ETH']));
    setAcceptedCoins(['ETH']);
    expect(getAvailableGuestCoins().map(coin => coin.paymentCoin)).toEqual(['ETH']);
  });
});
