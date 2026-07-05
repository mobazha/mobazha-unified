import { describe, expect, it } from 'vitest';
import { resolveFrontendComposition, type ResolveFrontendCompositionInput } from './composition';

function input(
  overrides: Partial<ResolveFrontendCompositionInput> = {}
): ResolveFrontendCompositionInput {
  return {
    runtimeStatus: 'ready',
    capabilitiesReady: true,
    profile: {
      deployment: 'sovereign',
      experience: 'store',
      authMode: 'standalone',
      channel: 'web',
      allowExternalResources: false,
      storefrontContext: false,
    },
    supportedProfiles: [
      {
        deployment: 'sovereign',
        experiences: ['store'],
        authModes: ['standalone'],
        channels: ['web'],
      },
    ],
    featureCatalog: [
      {
        id: 'checkout',
        requirements: { capabilities: ['commerce.checkout'] },
      },
    ],
    hasCapability: capability => capability === 'commerce.checkout',
    ...overrides,
  };
}

describe('resolveFrontendComposition', () => {
  it('keeps capability readiness pending', () => {
    const result = resolveFrontendComposition(input({ capabilitiesReady: false }));
    expect(result.status).toBe('pending');
    expect(result.diagnostics).toEqual([
      { code: 'runtime.capabilities-pending', scope: 'composition' },
    ]);
  });

  it('applies backend capabilities and host policies in one result', () => {
    const result = resolveFrontendComposition(
      input({
        featureCatalog: [
          {
            id: 'nodes',
            requirements: {
              capabilities: ['commerce.storeAdmin', 'sovereign.isolatedRuntime'],
              policies: ['brand.showNodePool'],
            },
          },
        ],
        hasCapability: () => true,
        hasPolicy: () => false,
      })
    );

    expect(result.enabledFeatureIds).toEqual([]);
    expect(result.excludedFeatureIds).toEqual(['nodes']);
    expect(result.diagnostics).toEqual([
      {
        code: 'feature.policy-missing',
        scope: 'feature',
        featureId: 'nodes',
        values: ['brand.showNodePool'],
      },
    ]);
  });

  it('fails closed for unsupported profiles and duplicate features', () => {
    const unsupported = resolveFrontendComposition(
      input({ profile: { ...input().profile, experience: 'marketplace' } })
    );
    expect(unsupported.status).toBe('invalid');
    expect(unsupported.diagnostics[0]?.code).toBe('profile.unsupported');

    const duplicate = resolveFrontendComposition(
      input({ featureCatalog: [{ id: 'same' }, { id: 'same' }] })
    );
    expect(duplicate.status).toBe('invalid');
    expect(duplicate.diagnostics[0]).toMatchObject({
      code: 'catalog.duplicate-feature-id',
      values: ['same'],
    });
  });
});
