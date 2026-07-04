import type { FrontendFeatureDefinition, FrontendSupportedProfile } from './frontendComposition';

export const UNIFIED_FRONTEND_FEATURE = {
  guestCheckout: 'commerce.guest-checkout',
  marketplaceOperator: 'marketplace.operator',
  marketplaceSellerReview: 'marketplace.seller-review',
} as const;

export type UnifiedFrontendFeatureId =
  (typeof UNIFIED_FRONTEND_FEATURE)[keyof typeof UNIFIED_FRONTEND_FEATURE];

export const UNIFIED_FRONTEND_SUPPORTED_PROFILES: readonly FrontendSupportedProfile[] = [
  {
    deployment: 'hosted',
    experiences: ['platform', 'store', 'marketplace'],
    authModes: ['hosted'],
    channels: ['web', 'embedded'],
  },
  {
    deployment: 'standalone',
    experiences: ['store'],
    authModes: ['standalone', 'basic'],
    channels: ['web', 'embedded'],
  },
  {
    deployment: 'sovereign',
    experiences: ['store'],
    authModes: ['standalone', 'basic'],
    channels: ['web', 'embedded'],
  },
];

const GUEST_CHECKOUT_FEATURE: FrontendFeatureDefinition = {
  id: UNIFIED_FRONTEND_FEATURE.guestCheckout,
  requirements: { capabilities: ['commerce.checkout'] },
};

const HOSTED_MARKETPLACE_FEATURES: readonly FrontendFeatureDefinition[] = [
  {
    id: UNIFIED_FRONTEND_FEATURE.marketplaceOperator,
    requirements: {
      capabilities: ['marketplace.operator'],
      deployments: ['hosted'],
      authModes: ['hosted'],
      allowInStorefrontContext: false,
    },
  },
  {
    id: UNIFIED_FRONTEND_FEATURE.marketplaceSellerReview,
    requirements: {
      capabilities: ['marketplace.sellerReview'],
      deployments: ['hosted'],
      authModes: ['hosted'],
      allowInStorefrontContext: false,
    },
  },
];

/** Build inclusion is represented by catalog membership, never by runtime activation. */
export function createUnifiedFrontendFeatureCatalog(options: {
  sovereignBuild: boolean;
}): readonly FrontendFeatureDefinition[] {
  return options.sovereignBuild
    ? [GUEST_CHECKOUT_FEATURE]
    : [GUEST_CHECKOUT_FEATURE, ...HOSTED_MARKETPLACE_FEATURES];
}
