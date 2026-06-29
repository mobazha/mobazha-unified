import type {
  MarketplaceCatalogMode,
  MarketplaceDiscoverability,
  MarketplaceDomain,
  MarketplaceLifecycleStatus,
  MarketplaceSellerEntryMode,
  MarketplaceStoreStatus,
} from '../types/marketplace';

export type MarketplaceLifecycleStatusKey =
  | 'marketplace.enums.lifecycle.draft'
  | 'marketplace.enums.lifecycle.published'
  | 'marketplace.enums.lifecycle.suspended'
  | 'marketplace.enums.lifecycle.archived';

export type MarketplaceDiscoverabilityKey =
  | 'marketplace.enums.discoverability.public'
  | 'marketplace.enums.discoverability.unlisted';

export type MarketplaceCatalogModeKey =
  | 'marketplace.enums.catalogMode.open'
  | 'marketplace.enums.catalogMode.curated';

export type MarketplaceSellerEntryModeKey =
  | 'marketplace.enums.sellerEntryMode.operatorInvited'
  | 'marketplace.enums.sellerEntryMode.sellerSelfServe';

export type MarketplaceDomainKindKey =
  | 'marketplace.enums.domainKind.subdomain'
  | 'marketplace.enums.domainKind.custom';

export type MarketplaceDomainVerificationKey =
  | 'marketplace.enums.domainVerification.pending'
  | 'marketplace.enums.domainVerification.verified';

export type MarketplaceMembershipStatusKey =
  | 'marketplace.memberships.statusInvited'
  | 'marketplace.memberships.statusAccepted'
  | 'marketplace.memberships.statusApplied'
  | 'marketplace.memberships.statusApproved'
  | 'marketplace.memberships.statusRejected'
  | 'marketplace.memberships.statusSuspended'
  | 'marketplace.memberships.statusLeft';

export const MARKETPLACE_LIFECYCLE_STATUS_KEYS: Record<
  MarketplaceLifecycleStatus,
  MarketplaceLifecycleStatusKey
> = {
  draft: 'marketplace.enums.lifecycle.draft',
  published: 'marketplace.enums.lifecycle.published',
  suspended: 'marketplace.enums.lifecycle.suspended',
  archived: 'marketplace.enums.lifecycle.archived',
};

export const MARKETPLACE_DISCOVERABILITY_KEYS: Record<
  MarketplaceDiscoverability,
  MarketplaceDiscoverabilityKey
> = {
  public: 'marketplace.enums.discoverability.public',
  unlisted: 'marketplace.enums.discoverability.unlisted',
};

export const MARKETPLACE_CATALOG_MODE_KEYS: Record<
  MarketplaceCatalogMode,
  MarketplaceCatalogModeKey
> = {
  open: 'marketplace.enums.catalogMode.open',
  curated: 'marketplace.enums.catalogMode.curated',
};

export const MARKETPLACE_SELLER_ENTRY_MODE_KEYS: Record<
  MarketplaceSellerEntryMode,
  MarketplaceSellerEntryModeKey
> = {
  operator_invited: 'marketplace.enums.sellerEntryMode.operatorInvited',
  seller_self_serve: 'marketplace.enums.sellerEntryMode.sellerSelfServe',
};

export const MARKETPLACE_DOMAIN_KIND_KEYS: Record<
  MarketplaceDomain['kind'],
  MarketplaceDomainKindKey
> = {
  subdomain: 'marketplace.enums.domainKind.subdomain',
  custom: 'marketplace.enums.domainKind.custom',
};

export const MARKETPLACE_DOMAIN_VERIFICATION_KEYS: Record<
  MarketplaceDomain['verificationStatus'],
  MarketplaceDomainVerificationKey
> = {
  pending: 'marketplace.enums.domainVerification.pending',
  verified: 'marketplace.enums.domainVerification.verified',
};

export const MARKETPLACE_MEMBERSHIP_STATUS_KEYS: Record<
  MarketplaceStoreStatus,
  MarketplaceMembershipStatusKey
> = {
  invited: 'marketplace.memberships.statusInvited',
  accepted: 'marketplace.memberships.statusAccepted',
  applied: 'marketplace.memberships.statusApplied',
  approved: 'marketplace.memberships.statusApproved',
  rejected: 'marketplace.memberships.statusRejected',
  suspended: 'marketplace.memberships.statusSuspended',
  left: 'marketplace.memberships.statusLeft',
};
