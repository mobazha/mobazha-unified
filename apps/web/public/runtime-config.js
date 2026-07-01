// Fail-closed hosted placeholder. Real deployments replace or proxy this file.
window.__RUNTIME_CONFIG__ = {
  schemaVersion: 3,
  authMode: 'hosted',
  deployment: { mode: 'hosted', allowExternalResources: true },
  experience: { kind: 'platform' },
  capabilitiesReady: false,
  features: {},
  capabilities: {
    commerce: { storefront: false, storeAdmin: false, checkout: false },
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
    payments: { methods: [] },
  },
};
