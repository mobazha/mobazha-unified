export type FrontendCompositionStatus = 'pending' | 'ready' | 'invalid';
export type FrontendCompositionRuntimeStatus =
  | 'pending'
  | 'refreshing'
  | 'ready'
  | 'error'
  | 'invalid';

export type FrontendCompositionDiagnosticCode =
  | 'runtime.pending'
  | 'runtime.refreshing'
  | 'runtime.error'
  | 'runtime.invalid'
  | 'runtime.capabilities-pending'
  | 'profile.unsupported'
  | 'catalog.duplicate-feature-id'
  | 'feature.capability-missing'
  | 'feature.policy-missing'
  | 'feature.deployment-unsupported'
  | 'feature.experience-unsupported'
  | 'feature.auth-unsupported'
  | 'feature.channel-unsupported'
  | 'feature.external-resources-blocked'
  | 'feature.storefront-context-excluded';

export interface FrontendCompositionDiagnostic {
  code: FrontendCompositionDiagnosticCode;
  scope: 'composition' | 'feature';
  featureId?: string;
  values?: readonly string[];
  retryable?: boolean;
}

export interface FrontendSupportedProfile {
  deployment: string;
  experiences: readonly string[];
  authModes: readonly string[];
  channels: readonly string[];
}

export interface FrontendFeatureRequirements {
  capabilities?: readonly string[];
  policies?: readonly string[];
  deployments?: readonly string[];
  experiences?: readonly string[];
  authModes?: readonly string[];
  channels?: readonly string[];
  requiresExternalResources?: boolean;
  allowInStorefrontContext?: boolean;
}

export interface FrontendFeatureDefinition {
  id: string;
  requirements?: FrontendFeatureRequirements;
}

export interface FrontendCompositionProfile {
  deployment: string;
  experience: string;
  authMode: string;
  channel: string;
  allowExternalResources: boolean;
  storefrontContext: boolean;
}

export interface ResolveFrontendCompositionInput {
  runtimeStatus: FrontendCompositionRuntimeStatus;
  capabilitiesReady: boolean;
  profile: FrontendCompositionProfile;
  supportedProfiles: readonly FrontendSupportedProfile[];
  featureCatalog: readonly FrontendFeatureDefinition[];
  hasCapability(capability: string): boolean;
  hasPolicy?(policy: string): boolean;
}

export interface ResolvedFrontendComposition {
  status: FrontendCompositionStatus;
  profile: FrontendCompositionProfile;
  enabledFeatureIds: readonly string[];
  excludedFeatureIds: readonly string[];
  diagnostics: readonly FrontendCompositionDiagnostic[];
}

function unresolvedResult(
  input: ResolveFrontendCompositionInput,
  status: Exclude<FrontendCompositionStatus, 'ready'>,
  diagnostic: FrontendCompositionDiagnostic
): ResolvedFrontendComposition {
  return {
    status,
    profile: input.profile,
    enabledFeatureIds: [],
    excludedFeatureIds: [],
    diagnostics: [diagnostic],
  };
}

function matchesProfile(
  profile: FrontendCompositionProfile,
  supported: FrontendSupportedProfile
): boolean {
  return (
    profile.deployment === supported.deployment &&
    supported.experiences.includes(profile.experience) &&
    supported.authModes.includes(profile.authMode) &&
    supported.channels.includes(profile.channel)
  );
}

function featureDiagnostics(
  feature: FrontendFeatureDefinition,
  input: ResolveFrontendCompositionInput
): FrontendCompositionDiagnostic[] {
  const requirements = feature.requirements;
  if (!requirements) return [];

  const diagnostics: FrontendCompositionDiagnostic[] = [];
  const add = (code: FrontendCompositionDiagnosticCode, values?: readonly string[]): void => {
    diagnostics.push({ code, scope: 'feature', featureId: feature.id, values });
  };
  const profile = input.profile;

  const missingCapabilities = (requirements.capabilities ?? []).filter(
    capability => !input.hasCapability(capability)
  );
  if (missingCapabilities.length > 0) {
    add('feature.capability-missing', missingCapabilities);
  }
  const missingPolicies = (requirements.policies ?? []).filter(
    policy => !input.hasPolicy?.(policy)
  );
  if (missingPolicies.length > 0) {
    add('feature.policy-missing', missingPolicies);
  }
  if (requirements.deployments && !requirements.deployments.includes(profile.deployment)) {
    add('feature.deployment-unsupported', [profile.deployment]);
  }
  if (requirements.experiences && !requirements.experiences.includes(profile.experience)) {
    add('feature.experience-unsupported', [profile.experience]);
  }
  if (requirements.authModes && !requirements.authModes.includes(profile.authMode)) {
    add('feature.auth-unsupported', [profile.authMode]);
  }
  if (requirements.channels && !requirements.channels.includes(profile.channel)) {
    add('feature.channel-unsupported', [profile.channel]);
  }
  if (requirements.requiresExternalResources && !profile.allowExternalResources) {
    add('feature.external-resources-blocked');
  }
  if (requirements.allowInStorefrontContext === false && profile.storefrontContext) {
    add('feature.storefront-context-excluded');
  }
  return diagnostics;
}

/**
 * Resolves a build-included feature catalog against an application-owned
 * product profile and authoritative runtime capabilities. This entry point is
 * deliberately free of React, routing, browser globals, and API clients.
 */
export function resolveFrontendComposition(
  input: ResolveFrontendCompositionInput
): ResolvedFrontendComposition {
  if (input.runtimeStatus === 'pending') {
    return unresolvedResult(input, 'pending', {
      code: 'runtime.pending',
      scope: 'composition',
    });
  }
  if (input.runtimeStatus === 'refreshing') {
    return unresolvedResult(input, 'pending', {
      code: 'runtime.refreshing',
      scope: 'composition',
    });
  }
  if (input.runtimeStatus === 'error') {
    return unresolvedResult(input, 'invalid', {
      code: 'runtime.error',
      scope: 'composition',
      retryable: true,
    });
  }
  if (input.runtimeStatus === 'invalid') {
    return unresolvedResult(input, 'invalid', {
      code: 'runtime.invalid',
      scope: 'composition',
    });
  }
  if (!input.capabilitiesReady) {
    return unresolvedResult(input, 'pending', {
      code: 'runtime.capabilities-pending',
      scope: 'composition',
    });
  }

  if (!input.supportedProfiles.some(supported => matchesProfile(input.profile, supported))) {
    return unresolvedResult(input, 'invalid', {
      code: 'profile.unsupported',
      scope: 'composition',
      values: [
        input.profile.deployment,
        input.profile.experience,
        input.profile.authMode,
        input.profile.channel,
      ],
    });
  }

  const ids = input.featureCatalog.map(feature => feature.id);
  const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
  if (duplicateIds.length > 0) {
    return unresolvedResult(input, 'invalid', {
      code: 'catalog.duplicate-feature-id',
      scope: 'composition',
      values: [...new Set(duplicateIds)],
    });
  }

  const enabledFeatureIds: string[] = [];
  const excludedFeatureIds: string[] = [];
  const diagnostics: FrontendCompositionDiagnostic[] = [];
  for (const feature of input.featureCatalog) {
    const excluded = featureDiagnostics(feature, input);
    if (excluded.length === 0) {
      enabledFeatureIds.push(feature.id);
      continue;
    }
    excludedFeatureIds.push(feature.id);
    diagnostics.push(...excluded);
  }

  return {
    status: 'ready',
    profile: input.profile,
    enabledFeatureIds,
    excludedFeatureIds,
    diagnostics,
  };
}

export function isFrontendFeatureEnabled(
  composition: ResolvedFrontendComposition,
  featureId: string
): boolean {
  return composition.status === 'ready' && composition.enabledFeatureIds.includes(featureId);
}
