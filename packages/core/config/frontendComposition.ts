import {
  supportsRuntimeCapability,
  type RuntimeAuthMode,
  type RuntimeCapabilityKey,
  type RuntimeConfig,
  type RuntimeConfigStatus,
  type RuntimeDeploymentMode,
  type RuntimeExperienceKind,
} from './runtimeConfig';

export type FrontendCompositionStatus = 'pending' | 'ready' | 'invalid';
export type FrontendPresentationChannel = 'web' | 'embedded' | 'extension';

export type FrontendCompositionDiagnosticCode =
  | 'runtime.pending'
  | 'runtime.refreshing'
  | 'runtime.error'
  | 'runtime.invalid'
  | 'runtime.capabilities-pending'
  | 'profile.unsupported'
  | 'catalog.duplicate-feature-id'
  | 'feature.capability-missing'
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
  deployment: RuntimeDeploymentMode;
  experiences: readonly RuntimeExperienceKind[];
  authModes: readonly RuntimeAuthMode[];
  channels: readonly FrontendPresentationChannel[];
}

export interface FrontendFeatureRequirements {
  capabilities?: readonly RuntimeCapabilityKey[];
  deployments?: readonly RuntimeDeploymentMode[];
  experiences?: readonly RuntimeExperienceKind[];
  authModes?: readonly RuntimeAuthMode[];
  channels?: readonly FrontendPresentationChannel[];
  requiresExternalResources?: boolean;
  allowInStorefrontContext?: boolean;
}

export interface FrontendFeatureDefinition {
  id: string;
  requirements?: FrontendFeatureRequirements;
}

export interface FrontendCompositionProfile {
  deployment: RuntimeDeploymentMode;
  experience: RuntimeExperienceKind;
  authMode: RuntimeAuthMode;
  channel: FrontendPresentationChannel;
  allowExternalResources: boolean;
  storefrontContext: boolean;
}

export interface ResolveFrontendCompositionInput {
  runtimeConfig: RuntimeConfig;
  runtimeStatus: RuntimeConfigStatus;
  channel: FrontendPresentationChannel;
  storefrontContext: boolean;
  supportedProfiles: readonly FrontendSupportedProfile[];
  featureCatalog: readonly FrontendFeatureDefinition[];
}

export interface ResolvedFrontendComposition {
  status: FrontendCompositionStatus;
  profile: FrontendCompositionProfile;
  enabledFeatureIds: readonly string[];
  excludedFeatureIds: readonly string[];
  diagnostics: readonly FrontendCompositionDiagnostic[];
}

function profileFromInput(input: ResolveFrontendCompositionInput): FrontendCompositionProfile {
  return {
    deployment: input.runtimeConfig.deployment.mode,
    experience: input.runtimeConfig.experience.kind,
    authMode: input.runtimeConfig.authMode,
    channel: input.channel,
    allowExternalResources: input.runtimeConfig.deployment.allowExternalResources,
    storefrontContext: input.storefrontContext,
  };
}

function unresolvedResult(
  input: ResolveFrontendCompositionInput,
  status: Exclude<FrontendCompositionStatus, 'ready'>,
  diagnostic: FrontendCompositionDiagnostic
): ResolvedFrontendComposition {
  return {
    status,
    profile: profileFromInput(input),
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
  profile: FrontendCompositionProfile,
  runtimeConfig: RuntimeConfig
): FrontendCompositionDiagnostic[] {
  const requirements = feature.requirements;
  if (!requirements) return [];

  const diagnostics: FrontendCompositionDiagnostic[] = [];
  const add = (code: FrontendCompositionDiagnosticCode, values?: readonly string[]): void => {
    diagnostics.push({ code, scope: 'feature', featureId: feature.id, values });
  };

  const missingCapabilities = (requirements.capabilities ?? []).filter(
    capability => !supportsRuntimeCapability(capability, runtimeConfig)
  );
  if (missingCapabilities.length > 0) {
    add('feature.capability-missing', missingCapabilities);
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
 * Resolve the build-included feature catalog against the shell profile and the
 * authoritative runtime capability snapshot. The function is deliberately
 * pure so every application shell can test the same profile matrix without
 * reading React state, browser globals, or bundler flags here.
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
  if (!input.runtimeConfig.capabilitiesReady) {
    return unresolvedResult(input, 'pending', {
      code: 'runtime.capabilities-pending',
      scope: 'composition',
    });
  }

  const profile = profileFromInput(input);
  if (!input.supportedProfiles.some(supported => matchesProfile(profile, supported))) {
    return unresolvedResult(input, 'invalid', {
      code: 'profile.unsupported',
      scope: 'composition',
      values: [profile.deployment, profile.experience, profile.authMode, profile.channel],
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
    const excluded = featureDiagnostics(feature, profile, input.runtimeConfig);
    if (excluded.length === 0) {
      enabledFeatureIds.push(feature.id);
      continue;
    }
    excludedFeatureIds.push(feature.id);
    diagnostics.push(...excluded);
  }

  return {
    status: 'ready',
    profile,
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
