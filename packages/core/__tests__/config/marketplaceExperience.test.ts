import { describe, expect, it } from 'vitest';
import {
  getRuntimeMarketplaceIdentifier,
  resolveMarketplaceBackHref,
  shouldRenderMarketplaceExperienceAtRoot,
} from '../../config/marketplaceExperience';
import type { RuntimeConfig } from '../../config/runtimeConfig';

function marketplaceConfig(identifier = 'm2-wilson'): RuntimeConfig {
  return {
    schemaVersion: 3,
    authMode: 'hosted',
    deployment: { mode: 'hosted', allowExternalResources: true },
    experience: { kind: 'marketplace', marketplaceIdentifier: identifier },
    capabilitiesReady: true,
    features: {},
    capabilities: {
      commerce: { storefront: true, storeAdmin: true, checkout: true },
      marketplace: {
        discovery: true,
        operator: true,
        selling: true,
        curation: true,
        sellerReview: true,
        customDomains: true,
        releasePublishing: true,
        attribution: true,
      },
      outpost: { isolatedRuntime: false, managedFleet: false },
      payments: { methods: [] },
    },
  };
}

describe('marketplace experience', () => {
  it('resolves the configured marketplace identifier', () => {
    expect(getRuntimeMarketplaceIdentifier(marketplaceConfig())).toBe('m2-wilson');
    expect(
      getRuntimeMarketplaceIdentifier({
        ...marketplaceConfig(),
        experience: { kind: 'platform' },
      })
    ).toBeNull();
  });

  it('renders a dedicated marketplace only at the eligible root', () => {
    const base = {
      pathname: '/',
      experience: marketplaceConfig().experience,
      storefrontMode: false,
      isSubMarket: false,
      needsOnboarding: false,
    };
    expect(shouldRenderMarketplaceExperienceAtRoot(base)).toBe(true);
    expect(shouldRenderMarketplaceExperienceAtRoot({ ...base, pathname: '/marketplace' })).toBe(
      false
    );
    expect(shouldRenderMarketplaceExperienceAtRoot({ ...base, storefrontMode: true })).toBe(false);
    expect(shouldRenderMarketplaceExperienceAtRoot({ ...base, isSubMarket: true })).toBe(false);
    expect(shouldRenderMarketplaceExperienceAtRoot({ ...base, needsOnboarding: true })).toBe(false);
  });

  it('maps links to the dedicated marketplace root', () => {
    const config = marketplaceConfig();
    expect(resolveMarketplaceBackHref('/marketplace/m2-wilson', config)).toBe('/');
    expect(resolveMarketplaceBackHref('/marketplace/other', config)).toBe('/marketplace/other');
  });
});
