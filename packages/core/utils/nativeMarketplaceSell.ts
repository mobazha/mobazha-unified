import type {
  MarketplaceStoreStatus,
  NativeMarketplaceSellerApplication,
  PublicNativeMarketplace,
} from '../types/marketplace';

export interface NativeMarketplaceSellPolicy {
  allowsSelfServe: boolean;
  requiresProductGroups: boolean;
  isAutoApproval: boolean;
  membershipStatus?: MarketplaceStoreStatus | string;
  /** Whether the submit control should stay mounted. */
  showSubmit: boolean;
  /** Whether submit is enabled (eligibility + not busy). */
  canSubmit: boolean;
  /** Whether the withdraw control should stay mounted. */
  showWithdraw: boolean;
  /** Whether withdraw is enabled (not busy). */
  canWithdraw: boolean;
  /** Show curated group validation only while the user can prepare an application. */
  showGroupsValidation: boolean;
  isSelectionLocked: boolean;
  showApplicationForm: boolean;
}

export function isNativeMarketplaceSelfServeEligible(
  marketplace: Pick<PublicNativeMarketplace, 'sellerEntryMode'>
): boolean {
  return marketplace.sellerEntryMode === 'seller_self_serve';
}

export function getNativeMarketplaceMembershipStatus(
  application: NativeMarketplaceSellerApplication | null | undefined
): MarketplaceStoreStatus | string | undefined {
  return application?.membership?.status;
}

export function resolveNativeMarketplaceSellPolicy(
  marketplace: Pick<
    PublicNativeMarketplace,
    'sellerEntryMode' | 'sellerReviewMode' | 'catalogMode'
  >,
  application: NativeMarketplaceSellerApplication | null,
  selectedGroupCount: number,
  options: { isSubmitting?: boolean; isWithdrawing?: boolean } = {}
): NativeMarketplaceSellPolicy {
  const allowsSelfServe = isNativeMarketplaceSelfServeEligible(marketplace);
  const requiresProductGroups = marketplace.catalogMode === 'curated';
  const isAutoApproval = marketplace.sellerReviewMode === 'auto';
  const membershipStatus = getNativeMarketplaceMembershipStatus(application);

  const isApproved = membershipStatus === 'approved';
  const isSuspended = membershipStatus === 'suspended';
  const isApplied = membershipStatus === 'applied';
  const canReapply =
    !application?.hasApplication || membershipStatus === 'rejected' || membershipStatus === 'left';

  const isSelectionLocked = isApproved || isApplied || isSuspended;
  const groupsValid = !requiresProductGroups || selectedGroupCount > 0;
  const isBusy = Boolean(options.isSubmitting || options.isWithdrawing);

  const showSubmit = allowsSelfServe && canReapply && !isApproved && !isSuspended && !isApplied;
  const canSubmit = showSubmit && groupsValid && !isBusy;

  const showWithdraw = allowsSelfServe && isApplied;
  const canWithdraw = showWithdraw && !isBusy;

  const showGroupsValidation = showSubmit && requiresProductGroups && !groupsValid;
  const showApplicationForm = allowsSelfServe && !isSuspended;

  return {
    allowsSelfServe,
    requiresProductGroups,
    isAutoApproval,
    membershipStatus,
    showSubmit,
    canSubmit,
    showWithdraw,
    canWithdraw,
    showGroupsValidation,
    isSelectionLocked,
    showApplicationForm,
  };
}

export function nativeMarketplaceSellStatusKey(status?: MarketplaceStoreStatus | string): string {
  switch (status) {
    case 'approved':
      return 'marketplace.sell.statusApproved';
    case 'rejected':
      return 'marketplace.sell.statusRejected';
    case 'suspended':
      return 'marketplace.sell.statusSuspended';
    case 'left':
      return 'marketplace.sell.statusLeft';
    case 'applied':
      return 'marketplace.sell.statusApplied';
    default:
      return 'marketplace.sell.statusPending';
  }
}
