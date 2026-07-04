import { describe, expect, it } from 'vitest';
import {
  createUnifiedFrontendFeatureCatalog,
  isFrontendFeatureEnabled,
  resolveFrontendComposition,
  UNIFIED_FRONTEND_FEATURE,
  UNIFIED_FRONTEND_SUPPORTED_PROFILES,
  type FrontendFeatureDefinition,
} from '../../config';
import type { RuntimeConfig, RuntimeConfigStatus } from '../../config/runtimeConfig';

function runtimeConfig(overrides: Partial<RuntimeConfig> = {}): RuntimeConfig {
  return {
    schemaVersion: 3,
    authMode: 'hosted',
    deployment: { mode: 'hosted', allowExternalResources: true },
    experience: { kind: 'platform' },
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
      sovereign: { isolatedRuntime: false, managedFleet: false },
      payments: { methods: [] },
    },
    ...overrides,
  };
}

function resolve(options: {
  config?: RuntimeConfig;
  status?: RuntimeConfigStatus;
  sovereignBuild?: boolean;
  storefrontContext?: boolean;
  catalog?: readonly FrontendFeatureDefinition[];
}) {
  return resolveFrontendComposition({
    runtimeConfig: options.config ?? runtimeConfig(),
    runtimeStatus: options.status ?? 'ready',
    channel: 'web',
    storefrontContext: options.storefrontContext ?? false,
    supportedProfiles: UNIFIED_FRONTEND_SUPPORTED_PROFILES,
    featureCatalog:
      options.catalog ??
      createUnifiedFrontendFeatureCatalog({ sovereignBuild: options.sovereignBuild ?? false }),
  });
}

describe('resolveFrontendComposition', () => {
  it('keeps capability loading pending instead of treating features as disabled', () => {
    const result = resolve({
      config: runtimeConfig({ capabilitiesReady: false }),
      status: 'pending',
    });

    expect(result.status).toBe('pending');
    expect(result.excludedFeatureIds).toEqual([]);
    expect(result.diagnostics).toEqual([{ code: 'runtime.pending', scope: 'composition' }]);
  });

  it('enables build-included features after the authoritative snapshot is ready', () => {
    const result = resolve({});

    expect(result.status).toBe('ready');
    expect(result.enabledFeatureIds).toEqual([
      UNIFIED_FRONTEND_FEATURE.guestCheckout,
      UNIFIED_FRONTEND_FEATURE.marketplaceOperator,
      UNIFIED_FRONTEND_FEATURE.marketplaceSellerReview,
    ]);
    expect(result.diagnostics).toEqual([]);
  });

  it('records a deterministic reason when the backend capability is absent', () => {
    const config = runtimeConfig({
      capabilities: {
        ...runtimeConfig().capabilities,
        marketplace: {
          ...runtimeConfig().capabilities.marketplace,
          operator: false,
        },
      },
    });
    const result = resolve({ config });

    expect(isFrontendFeatureEnabled(result, UNIFIED_FRONTEND_FEATURE.marketplaceOperator)).toBe(
      false
    );
    expect(result.excludedFeatureIds).toContain(UNIFIED_FRONTEND_FEATURE.marketplaceOperator);
    expect(result.diagnostics).toContainEqual({
      code: 'feature.capability-missing',
      scope: 'feature',
      featureId: UNIFIED_FRONTEND_FEATURE.marketplaceOperator,
      values: ['marketplace.operator'],
    });
  });

  it('excludes hosted management navigation inside a storefront request context', () => {
    const result = resolve({ storefrontContext: true });

    expect(isFrontendFeatureEnabled(result, UNIFIED_FRONTEND_FEATURE.guestCheckout)).toBe(true);
    expect(isFrontendFeatureEnabled(result, UNIFIED_FRONTEND_FEATURE.marketplaceOperator)).toBe(
      false
    );
    expect(result.diagnostics).toContainEqual({
      code: 'feature.storefront-context-excluded',
      scope: 'feature',
      featureId: UNIFIED_FRONTEND_FEATURE.marketplaceOperator,
      values: undefined,
    });
  });

  it('cannot activate a feature that is physically absent from the build catalog', () => {
    const result = resolve({
      sovereignBuild: true,
      config: runtimeConfig({
        authMode: 'basic',
        deployment: { mode: 'sovereign', allowExternalResources: false },
        experience: { kind: 'store' },
      }),
    });

    expect(result.status).toBe('ready');
    expect(result.enabledFeatureIds).toEqual([UNIFIED_FRONTEND_FEATURE.guestCheckout]);
    expect(result.enabledFeatureIds).not.toContain(UNIFIED_FRONTEND_FEATURE.marketplaceOperator);
  });

  it('fails closed for an unsupported deployment and experience profile', () => {
    const result = resolve({
      config: runtimeConfig({
        authMode: 'standalone',
        deployment: { mode: 'standalone', allowExternalResources: false },
        experience: { kind: 'marketplace', marketplaceIdentifier: 'unsupported' },
      }),
    });

    expect(result.status).toBe('invalid');
    expect(result.enabledFeatureIds).toEqual([]);
    expect(result.diagnostics[0]).toMatchObject({
      code: 'profile.unsupported',
      scope: 'composition',
    });
  });

  it('rejects duplicate feature identities before projecting consumers', () => {
    const result = resolve({
      catalog: [{ id: 'feature.duplicate' }, { id: 'feature.duplicate' }],
    });

    expect(result.status).toBe('invalid');
    expect(result.diagnostics).toEqual([
      {
        code: 'catalog.duplicate-feature-id',
        scope: 'composition',
        values: ['feature.duplicate'],
      },
    ]);
  });

  it('blocks features that require external resources in restricted-egress profiles', () => {
    const result = resolve({
      config: runtimeConfig({
        authMode: 'basic',
        deployment: { mode: 'sovereign', allowExternalResources: false },
        experience: { kind: 'store' },
      }),
      catalog: [
        {
          id: 'feature.external-provider',
          requirements: { requiresExternalResources: true },
        },
      ],
    });

    expect(result.status).toBe('ready');
    expect(result.excludedFeatureIds).toEqual(['feature.external-provider']);
    expect(result.diagnostics[0]).toMatchObject({
      code: 'feature.external-resources-blocked',
      featureId: 'feature.external-provider',
    });
  });
});
