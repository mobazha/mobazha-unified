// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

export interface RuntimeConfigFixtureOptions {
  deployment?: 'hosted' | 'standalone' | 'sovereign';
  experience?:
    | { kind: 'platform' | 'store' }
    | { kind: 'marketplace'; marketplaceIdentifier: string };
  guestCheckout?: boolean;
  paymentMethods?: Array<{
    id: string;
    kind: 'crypto' | 'fiat';
    flow: 'address-transfer' | 'external-wallet' | 'provider-session';
  }>;
}

export function runtimeConfigFixture(options: RuntimeConfigFixtureOptions = {}) {
  const deployment = options.deployment ?? 'hosted';
  const hosted = deployment === 'hosted';
  const sovereign = deployment === 'sovereign';
  return {
    schemaVersion: 3,
    authMode: hosted ? 'hosted' : 'standalone',
    deployment: { mode: deployment, allowExternalResources: !sovereign },
    experience: options.experience ?? { kind: hosted ? 'platform' : 'store' },
    capabilitiesReady: true,
    features: options.guestCheckout ? { guestCheckout: { effective: true, overridable: [] } } : {},
    capabilities: {
      commerce: { storefront: true, storeAdmin: true, checkout: true },
      marketplace: {
        discovery: hosted,
        operator: hosted,
        selling: hosted,
        curation: hosted,
        sellerReview: hosted,
        customDomains: hosted,
        releasePublishing: hosted,
        attribution: hosted,
      },
      sovereign: { isolatedRuntime: sovereign, managedFleet: false },
      payments: { methods: options.paymentMethods ?? [] },
    },
  };
}

export function runtimeConfigScript(options: RuntimeConfigFixtureOptions = {}): string {
  return `window.__RUNTIME_CONFIG__=${JSON.stringify(runtimeConfigFixture(options))};`;
}
