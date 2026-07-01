export interface RuntimeConfigFixtureOptions {
  deployment?: 'hosted' | 'standalone' | 'outpost';
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
  const outpost = deployment === 'outpost';
  return {
    schemaVersion: 3,
    authMode: hosted ? 'hosted' : 'standalone',
    deployment: { mode: deployment, allowExternalResources: !outpost },
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
      outpost: { isolatedRuntime: outpost, managedFleet: false },
      payments: { methods: options.paymentMethods ?? [] },
    },
  };
}

export function runtimeConfigScript(options: RuntimeConfigFixtureOptions = {}): string {
  return `window.__RUNTIME_CONFIG__=${JSON.stringify(runtimeConfigFixture(options))};`;
}
