import {
  isFrontendFeatureEnabled as isCommerceFrontendFeatureEnabled,
  resolveFrontendComposition as resolveCommerceFrontendComposition,
  type FrontendCompositionDiagnostic,
  type FrontendCompositionDiagnosticCode,
  type FrontendCompositionStatus,
  type FrontendFeatureDefinition as CommerceFrontendFeatureDefinition,
  type ResolvedFrontendComposition as CommerceResolvedFrontendComposition,
} from '@mobazha/commerce-kit/composition';
import {
  supportsRuntimeCapability,
  type RuntimeAuthMode,
  type RuntimeCapabilityKey,
  type RuntimeConfig,
  type RuntimeConfigStatus,
  type RuntimeDeploymentMode,
  type RuntimeExperienceKind,
} from './runtimeConfig';

export type FrontendPresentationChannel = 'web' | 'embedded' | 'extension';
export type {
  FrontendCompositionDiagnostic,
  FrontendCompositionDiagnosticCode,
  FrontendCompositionStatus,
};

export interface FrontendSupportedProfile {
  deployment: RuntimeDeploymentMode;
  experiences: readonly RuntimeExperienceKind[];
  authModes: readonly RuntimeAuthMode[];
  channels: readonly FrontendPresentationChannel[];
}

export interface FrontendFeatureRequirements {
  capabilities?: readonly RuntimeCapabilityKey[];
  policies?: readonly string[];
  deployments?: readonly RuntimeDeploymentMode[];
  experiences?: readonly RuntimeExperienceKind[];
  authModes?: readonly RuntimeAuthMode[];
  channels?: readonly FrontendPresentationChannel[];
  requiresExternalResources?: boolean;
  allowInStorefrontContext?: boolean;
}

export interface FrontendFeatureDefinition extends CommerceFrontendFeatureDefinition {
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

export interface ResolvedFrontendComposition extends Omit<
  CommerceResolvedFrontendComposition,
  'profile'
> {
  profile: FrontendCompositionProfile;
}

/**
 * Adapts Unified Runtime Config to the product-neutral Commerce Kit
 * composition kernel. Application-specific capability lookup stays here;
 * profile and feature resolution are shared with other product shells.
 */
export function resolveFrontendComposition(
  input: ResolveFrontendCompositionInput
): ResolvedFrontendComposition {
  const profile: FrontendCompositionProfile = {
    deployment: input.runtimeConfig.deployment.mode,
    experience: input.runtimeConfig.experience.kind,
    authMode: input.runtimeConfig.authMode,
    channel: input.channel,
    allowExternalResources: input.runtimeConfig.deployment.allowExternalResources,
    storefrontContext: input.storefrontContext,
  };
  return resolveCommerceFrontendComposition({
    runtimeStatus: input.runtimeStatus,
    capabilitiesReady: input.runtimeConfig.capabilitiesReady,
    profile,
    supportedProfiles: input.supportedProfiles,
    featureCatalog: input.featureCatalog,
    hasCapability: capability =>
      supportsRuntimeCapability(capability as RuntimeCapabilityKey, input.runtimeConfig),
  }) as ResolvedFrontendComposition;
}

export function isFrontendFeatureEnabled(
  composition: ResolvedFrontendComposition,
  featureId: string
): boolean {
  return isCommerceFrontendFeatureEnabled(composition, featureId);
}
