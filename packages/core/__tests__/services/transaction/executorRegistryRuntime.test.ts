import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { initializeRuntimeConfig } from '../../../config/runtimeConfig';
import {
  getExecutorRegistry,
  getPaymentExecutor,
  resetExecutorRegistry,
} from '../../../services/transaction/executorRegistry';

function runtimeMethods(methods: Array<Record<string, unknown>>) {
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
      outpost: { isolatedRuntime: false, managedFleet: false },
      payments: { methods },
    },
  };
}

describe('runtime-gated executor registry', () => {
  beforeEach(() => {
    initializeRuntimeConfig(
      runtimeMethods([
        { id: 'BITCOIN', kind: 'crypto', flow: 'address-transfer' },
        { id: 'BITCOINCASH', kind: 'crypto', flow: 'address-transfer' },
        { id: 'LITECOIN', kind: 'crypto', flow: 'address-transfer' },
        {
          id: 'ZCASH',
          kind: 'crypto',
          flow: 'address-transfer',
          addressMode: 'transparent',
        },
      ])
    );
  });

  afterEach(() => {
    resetExecutorRegistry();
    initializeRuntimeConfig({});
  });

  it('keeps implementations registered independently of backend availability', () => {
    expect(getExecutorRegistry().categories()).toEqual(['evm', 'solana', 'tron']);
  });

  it('does not return executors for methods absent from runtime capabilities', () => {
    expect(getPaymentExecutor('ETHEREUM', 'ETH')).toBeNull();
    expect(getPaymentExecutor('SOLANA', 'SOL')).toBeNull();
    expect(getPaymentExecutor('TRON', 'TRX')).toBeNull();
  });

  it('returns an executor when the backend advertises the payment method', () => {
    initializeRuntimeConfig(
      runtimeMethods([{ id: 'ETHEREUM', kind: 'crypto', flow: 'external-wallet' }])
    );
    expect(getPaymentExecutor('ETHEREUM', 'ETH')?.category).toBe('evm');
  });

  it('always leaves backend-monitored UTXO methods without a frontend executor', () => {
    expect(getPaymentExecutor('BITCOIN', 'BTC')).toBeNull();
    expect(getPaymentExecutor('ZCASH', 'ZEC')).toBeNull();
  });
});
