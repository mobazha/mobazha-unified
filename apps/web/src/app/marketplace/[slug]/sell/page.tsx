'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Header, Footer } from '@/components';
import { MobilePageHeader } from '@/components/MobilePageHeader/MobilePageHeader';
import { MarketplaceLogo } from '@/components/CommunityMarketplace';
import { CollectibleCardSubmissionsWorkspace } from '@/components/CommunityMarketplace/CollectibleCardSubmissionsWorkspace';
import { Container, HStack, VStack } from '@/components/layouts';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  useNativeMarketplaceSell,
  useProductGroups,
  useUserStore,
  useI18n,
  MARKETPLACE_MEMBERSHIP_STATUS_KEYS,
  getCasdoorUserId,
  marketplaceHref,
  marketplaceBuyerAccessModeKey,
  marketplaceSellerReviewModeKey,
  marketplaceVerticalKey,
  MARKETPLACE_CATALOG_MODE_KEYS,
  resolveMarketplaceBackHref,
  resolveNativeMarketplaceSellPolicy,
  getNativeMarketplaceMembershipStatus,
  isCollectibleMarketplaceVertical,
  isHosted,
  startCasdoorLogin,
  type NativeMarketplaceSellerApplication,
  type ProductGroup,
} from '@mobazha/core';
import { useToast } from '@/components/ui/use-toast';
import { ChevronLeft, ClipboardList, Loader2, Package, Store } from 'lucide-react';

type ProductGroupSelectionKey = {
  identifier: string;
  membershipStatus: string | undefined;
  serverGroupIdsKey: string;
};

type ProductGroupSelectionDraft = {
  key: ProductGroupSelectionKey;
  selectedIds: number[];
};

function buildProductGroupSelectionKey(
  identifier: string | undefined,
  application: NativeMarketplaceSellerApplication | null | undefined
): ProductGroupSelectionKey {
  return {
    identifier: identifier ?? '',
    membershipStatus: getNativeMarketplaceMembershipStatus(application),
    serverGroupIdsKey: JSON.stringify(application?.productGroupIDs ?? []),
  };
}

function productGroupSelectionKeysMatch(
  a: ProductGroupSelectionKey,
  b: ProductGroupSelectionKey
): boolean {
  return (
    a.identifier === b.identifier &&
    a.membershipStatus === b.membershipStatus &&
    a.serverGroupIdsKey === b.serverGroupIdsKey
  );
}

function ProductGroupPicker({
  groups,
  selectedIds,
  onToggle,
  disabled,
  itemCountLabel,
}: {
  groups: ProductGroup[];
  selectedIds: number[];
  onToggle: (id: number) => void;
  disabled?: boolean;
  itemCountLabel: (count: number) => string;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {groups.map(group => {
        const selected = selectedIds.includes(group.id);
        return (
          <button
            key={group.id}
            type="button"
            disabled={disabled}
            aria-pressed={selected}
            onClick={() => onToggle(group.id)}
            className={`rounded-lg border-2 p-4 text-left transition-all ${
              selected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
            } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
          >
            <HStack gap="sm" align="start">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                  selected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}
              >
                <Package className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-foreground">{group.name}</p>
                {group.description && (
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {group.description}
                  </p>
                )}
                <p className="mt-2 text-xs text-muted-foreground">
                  {itemCountLabel(group.itemCount ?? 0)}
                </p>
              </div>
            </HStack>
          </button>
        );
      })}
    </div>
  );
}

export default function MarketplaceSellPage() {
  const params = useParams();
  const router = useRouter();
  const { t, formatDate } = useI18n();
  const { toast } = useToast();
  const { isAuthenticated } = useUserStore();

  const slugParam = params.slug;
  const identifier = Array.isArray(slugParam) ? slugParam[0] : slugParam;

  const {
    marketplace,
    application,
    reviewEvents,
    loading,
    error,
    reviewEventsLoading,
    reviewEventsError,
    readingReviewEventID,
    isSubmitting,
    isWithdrawing,
    refresh,
    refreshReviewEvents,
    submitApplication,
    withdrawApplication,
    markReviewEventRead,
  } = useNativeMarketplaceSell(identifier);

  const marketHref = marketplace
    ? marketplaceHref(marketplace.slug, marketplace.id)
    : `/marketplace/${identifier}`;
  const marketBackHref = resolveMarketplaceBackHref(marketHref);

  const casdoorUserId = getCasdoorUserId();
  const productGroupUserID = casdoorUserId || '';
  const {
    groups: productGroups,
    loading: groupsLoading,
    loadGroups,
  } = useProductGroups({ userID: productGroupUserID, autoLoad: false });

  const selectionKey = useMemo(
    () => buildProductGroupSelectionKey(identifier, application),
    [identifier, application]
  );
  const serverGroupIds = useMemo(
    () => JSON.parse(selectionKey.serverGroupIdsKey) as number[],
    [selectionKey.serverGroupIdsKey]
  );
  const [selectionDraft, setSelectionDraft] = useState<ProductGroupSelectionDraft | null>(null);

  const selectedGroupIds = useMemo(() => {
    if (selectionDraft && productGroupSelectionKeysMatch(selectionDraft.key, selectionKey)) {
      return selectionDraft.selectedIds;
    }
    return serverGroupIds;
  }, [selectionDraft, selectionKey, serverGroupIds]);

  useEffect(() => {
    if (isAuthenticated && productGroupUserID) {
      void loadGroups(productGroupUserID);
    }
  }, [isAuthenticated, productGroupUserID, loadGroups]);

  const policy = useMemo(() => {
    if (!marketplace) return null;
    return resolveNativeMarketplaceSellPolicy(marketplace, application, selectedGroupIds.length, {
      isSubmitting,
      isWithdrawing,
    });
  }, [marketplace, application, selectedGroupIds.length, isSubmitting, isWithdrawing]);

  const membershipStatus = policy?.membershipStatus;
  const hasApplication = Boolean(application?.hasApplication);
  const isApproved = membershipStatus === 'approved';
  const isRejected = membershipStatus === 'rejected';
  const isSuspended = membershipStatus === 'suspended';
  const isApplied = membershipStatus === 'applied';
  const isLeft = membershipStatus === 'left';
  const isCollectibleMarketplace = isCollectibleMarketplaceVertical(marketplace?.vertical);

  const verticalLabel = marketplace ? t(marketplaceVerticalKey(marketplace.vertical)) : '';
  const buyerAccessLabel = marketplace
    ? t(marketplaceBuyerAccessModeKey(marketplace.buyerAccessMode))
    : '';
  const sellerReviewLabel = marketplace
    ? t(marketplaceSellerReviewModeKey(marketplace.sellerReviewMode))
    : '';
  const catalogLabel = marketplace ? t(MARKETPLACE_CATALOG_MODE_KEYS[marketplace.catalogMode]) : '';

  const productGroupsDesc = policy?.requiresProductGroups
    ? t('marketplace.sell.selectProductGroupsDescCurated')
    : t('marketplace.sell.selectProductGroupsDescOpen');

  const toggleGroup = (id: number) => {
    if (policy?.isSelectionLocked) return;
    setSelectionDraft(prev => {
      const currentIds =
        prev && productGroupSelectionKeysMatch(prev.key, selectionKey)
          ? prev.selectedIds
          : serverGroupIds;
      const nextIds = currentIds.includes(id)
        ? currentIds.filter(gid => gid !== id)
        : [...currentIds, id];
      return { key: selectionKey, selectedIds: nextIds };
    });
  };

  const handleApply = async () => {
    if (!policy?.showSubmit || !policy.canSubmit) return;
    try {
      const result = await submitApplication(selectedGroupIds);
      toast({
        title: t('common.success'),
        description: result.autoApproved
          ? t('marketplace.sell.applicationSubmittedApproved')
          : t('marketplace.sell.applicationSubmittedReview'),
        variant: 'success',
      });
    } catch (err) {
      toast({
        title: t('common.error'),
        description: err instanceof Error ? err.message : t('common.error'),
        variant: 'destructive',
      });
    }
  };

  const handleWithdraw = async () => {
    try {
      await withdrawApplication();
      toast({
        title: t('common.success'),
        description: t('marketplace.sell.withdrawSuccess'),
        variant: 'success',
      });
    } catch (err) {
      toast({
        title: t('common.error'),
        description: err instanceof Error ? err.message : t('common.error'),
        variant: 'destructive',
      });
    }
  };

  const handleMarkReviewEventRead = async (eventID: number) => {
    try {
      await markReviewEventRead(eventID);
    } catch {
      toast({
        title: t('common.error'),
        description: t('marketplace.sell.reviewUpdatesMarkReadFailed'),
        variant: 'destructive',
      });
    }
  };

  const admissionPolicyMessage = marketplace
    ? marketplace.sellerEntryMode === 'operator_invited'
      ? t('marketplace.sell.operatorInvitedPolicy')
      : t('marketplace.sell.selfServeNotAvailable')
    : '';

  const decisionReason = application?.membership?.decisionReason?.trim();
  const sellerCanSelfServe = marketplace?.sellerEntryMode === 'seller_self_serve';

  const pageTitleKey = (() => {
    if (!hasApplication && sellerCanSelfServe) return 'marketplace.sell.title';
    if (isApproved) return 'marketplace.sell.pageTitleApproved';
    if (isApplied) return 'marketplace.sell.pageTitleApplied';
    if (isRejected) return 'marketplace.sell.pageTitleRejected';
    if (isSuspended) return 'marketplace.sell.pageTitleSuspended';
    if (isLeft) return 'marketplace.sell.pageTitleLeft';
    return sellerCanSelfServe
      ? 'marketplace.sell.title'
      : 'marketplace.sell.pageTitleAdmissionStatus';
  })();
  const pageTitle = t(pageTitleKey);
  const pageSubtitleKey = (() => {
    if (!hasApplication && sellerCanSelfServe) return 'marketplace.sell.subtitle';
    if (isApplied) return 'marketplace.sell.subtitleApplied';
    if (isApproved) return 'marketplace.sell.subtitleApproved';
    if (isRejected) return 'marketplace.sell.subtitleRejected';
    if (isSuspended) return 'marketplace.sell.subtitleSuspended';
    if (isLeft) return 'marketplace.sell.subtitleLeft';
    return 'marketplace.sell.subtitleAdmissionStatus';
  })();
  const pageSubtitle = t(pageSubtitleKey);
  const isInviteControlledRejected =
    isRejected && marketplace && marketplace.sellerEntryMode === 'operator_invited';
  const statusResultTitle = (() => {
    if (isApproved) return t('marketplace.sell.resultTitleApproved');
    if (isApplied) return t('marketplace.sell.resultTitleApplied');
    if (isRejected) return t('marketplace.sell.resultTitleRejected');
    if (isSuspended) return t('marketplace.sell.resultTitleSuspended');
    if (isLeft) return t('marketplace.sell.resultTitleLeft');
    return t('marketplace.sell.resultTitlePending');
  })();
  const statusNextStep = (() => {
    if (isInviteControlledRejected) return t('marketplace.sell.nextStepInviteOnlyRejected');
    if (isSuspended) return t('marketplace.sell.nextStepSuspended');
    if (isRejected && policy?.showSubmit) return t('marketplace.sell.reapplyHint');
    return null;
  })();
  const collectibleStatusNextStep = (() => {
    if (!isCollectibleMarketplace) return null;
    if (isApproved) return t('marketplace.sell.collectibles.statusNextApprovedWithSubmissions');
    if (isRejected) {
      return isInviteControlledRejected
        ? t('marketplace.sell.collectibles.statusNextRejectedInviteOnly')
        : t('marketplace.sell.collectibles.statusNextRejected');
    }
    if (isSuspended) return t('marketplace.sell.collectibles.statusNextSuspended');
    if (isApplied) return t('marketplace.sell.collectibles.statusNextPendingBlocked');
    return t('marketplace.sell.collectibles.statusNextDefault');
  })();

  const applicationRequirementsMet = policy?.requiresProductGroups
    ? selectedGroupIds.length > 0
    : true;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <MobilePageHeader title={pageTitle} />

      <main className="py-6 sm:py-8">
        <Container size="lg">
          <Link
            href={marketBackHref}
            className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
            {t('marketplace.sell.backToMarketplace')}
          </Link>

          {loading && (
            <Card className="flex items-center justify-center p-12">
              <Loader2
                className="h-8 w-8 animate-spin text-primary"
                aria-label={t('common.loading')}
              />
            </Card>
          )}

          {!loading && !marketplace && (
            <Card className="p-8 text-center">
              <Store className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {error || t('marketplace.detail.unavailableDescNative')}
              </p>
              <HStack gap="sm" className="mt-4 justify-center">
                {error && (
                  <Button
                    variant="default"
                    onClick={() => void refresh()}
                    data-testid="sell-load-retry"
                  >
                    {t('common.retry')}
                  </Button>
                )}
                <Button asChild variant="outline" className="h-11">
                  <Link href="/marketplace">{t('marketplace.title')}</Link>
                </Button>
              </HStack>
            </Card>
          )}

          {!loading && marketplace && policy && (
            <>
              <div className="mb-6">
                <h1 className="mb-2 text-2xl font-bold text-foreground sm:text-3xl">{pageTitle}</h1>
                <p className="text-sm text-muted-foreground sm:text-base">{pageSubtitle}</p>
                <p
                  className="mt-2 text-sm text-muted-foreground"
                  data-testid="sell-listing-boundary"
                >
                  {t('marketplace.sell.listingBoundaryHint', { name: marketplace.name })}
                </p>
              </div>

              {error && (
                <Card className="mb-6 border-destructive/30 bg-destructive/5 p-4 sm:p-5">
                  <p className="text-sm text-destructive">{error}</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => void refresh()}
                    data-testid="sell-load-retry"
                  >
                    {t('common.retry')}
                  </Button>
                </Card>
              )}

              <Card className="mb-6 p-4 sm:p-5" data-testid="sell-market-info-card">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <MarketplaceLogo
                    name={marketplace.name}
                    identifier={marketplace.id}
                    logoURL={marketplace.logoURL}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">
                      {isApplied
                        ? t('marketplace.sell.marketContextInReview')
                        : t('marketplace.sell.marketContextTitle')}
                    </p>
                    <h2 className="text-lg font-bold text-foreground">{marketplace.name}</h2>
                    {marketplace.description ? (
                      <p
                        className="mt-2 text-sm text-muted-foreground"
                        data-testid="sell-market-description"
                      >
                        {marketplace.description}
                      </p>
                    ) : null}
                    <dl className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                      <div className="rounded-md border border-border bg-muted/40 px-3 py-2">
                        <dt className="text-xs text-muted-foreground">
                          {t('marketplace.sell.marketVerticalLabel')}
                        </dt>
                        <dd className="mt-1 text-sm text-foreground">{verticalLabel}</dd>
                      </div>
                      <div className="rounded-md border border-border bg-muted/40 px-3 py-2">
                        <dt className="text-xs text-muted-foreground">
                          {t('marketplace.sell.marketBuyerAccessLabel')}
                        </dt>
                        <dd className="mt-1 text-sm text-foreground">{buyerAccessLabel}</dd>
                      </div>
                      <div className="rounded-md border border-border bg-muted/40 px-3 py-2">
                        <dt className="text-xs text-muted-foreground">
                          {t('marketplace.sell.marketSellerEntryLabel')}
                        </dt>
                        <dd className="mt-1 text-sm text-foreground">
                          {t(
                            marketplace.sellerEntryMode === 'seller_self_serve'
                              ? 'marketplace.enums.sellerEntryMode.sellerSelfServe'
                              : 'marketplace.enums.sellerEntryMode.operatorInvited'
                          )}
                        </dd>
                      </div>
                      <div className="rounded-md border border-border bg-muted/40 px-3 py-2">
                        <dt className="text-xs text-muted-foreground">
                          {t('marketplace.sell.marketSellerReviewLabel')}
                        </dt>
                        <dd className="mt-1 text-sm text-foreground">{sellerReviewLabel}</dd>
                      </div>
                      <div className="rounded-md border border-border bg-muted/40 px-3 py-2">
                        <dt className="text-xs text-muted-foreground">
                          {t('marketplace.sell.marketCatalogLabel')}
                        </dt>
                        <dd className="mt-1 text-sm text-foreground">{catalogLabel}</dd>
                      </div>
                    </dl>
                  </div>
                  <Button
                    asChild
                    variant="outline"
                    className="h-11 w-full sm:w-auto"
                    data-testid="sell-view-marketplace-link"
                  >
                    <Link href={marketHref}>{t('marketplace.sell.viewMarketplace')}</Link>
                  </Button>
                </div>
              </Card>

              {policy.allowsSelfServe && (
                <Card className="mb-6 border-primary/20 bg-primary/5 p-4 sm:p-5">
                  <p className="text-sm text-foreground">
                    {policy.isAutoApproval
                      ? t('marketplace.sell.autoApprovalNote')
                      : t('marketplace.sell.reviewRequiredNote')}
                  </p>
                  {!policy.requiresProductGroups && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      {t('marketplace.sell.openCatalogGroupsOptional')}
                    </p>
                  )}
                </Card>
              )}

              {!policy.allowsSelfServe && (
                <Card className="mb-6 p-4 sm:p-5">
                  <p className="text-sm text-muted-foreground">{admissionPolicyMessage}</p>
                </Card>
              )}

              {isCollectibleMarketplace && policy.allowsSelfServe ? (
                <Card className="mb-6 p-4 sm:p-5" data-testid="collectible-sell-checklist">
                  <HStack gap="sm" align="center" className="mb-3">
                    <ClipboardList className="h-5 w-5 text-primary" aria-hidden />
                    <h2 className="text-base font-semibold text-foreground">
                      {t('marketplace.sell.collectibles.checklistTitle')}
                    </h2>
                  </HStack>
                  <ol className="space-y-2 text-sm text-muted-foreground">
                    <li>1. {t('marketplace.sell.collectibles.checklistLogin')}</li>
                    <li>2. {t('marketplace.sell.collectibles.checklistProducts')}</li>
                    <li>3. {t('marketplace.sell.collectibles.checklistApply')}</li>
                    <li>4. {t('marketplace.sell.collectibles.checklistReview')}</li>
                    <li>5. {t('marketplace.sell.collectibles.checklistListed')}</li>
                  </ol>
                  <p className="mt-3 text-xs text-muted-foreground">
                    {t('marketplace.sell.collectibles.custodyProcessNote')}
                  </p>
                </Card>
              ) : null}

              {!isAuthenticated && policy.allowsSelfServe && (
                <Card className="mb-6 p-6 text-center">
                  <p className="mb-4 text-sm text-muted-foreground">
                    {t('marketplace.sell.loginRequired')}
                  </p>
                  <Button
                    onClick={() => {
                      if (isHosted()) {
                        void startCasdoorLogin();
                      } else {
                        router.push('/login');
                      }
                    }}
                  >
                    {t('login.login')}
                  </Button>
                </Card>
              )}

              {!error && isAuthenticated && application?.hasApplication && (
                <Card
                  className={`mb-6 p-4 ${
                    isRejected || isSuspended
                      ? 'border-destructive/30 bg-destructive/5'
                      : 'border-primary/20 bg-primary/5'
                  }`}
                  data-testid="sell-status-card"
                >
                  <h3 className="text-base font-semibold text-foreground">{statusResultTitle}</h3>
                  {application.autoApproved && isApproved && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      {t('marketplace.sell.autoApprovedMessage')}
                    </p>
                  )}
                  {(isRejected || isSuspended) && (
                    <div className="mt-3 rounded-md border border-destructive/30 bg-destructive/5 p-3">
                      <p className="text-xs font-medium text-destructive">
                        {t('marketplace.sell.decisionReasonTitle')}
                      </p>
                      <p className="mt-1 text-sm text-foreground">
                        {decisionReason || t('marketplace.sell.decisionReasonMissing')}
                      </p>
                    </div>
                  )}
                  {!isCollectibleMarketplace && statusNextStep ? (
                    <p className="mt-3 text-sm text-muted-foreground">{statusNextStep}</p>
                  ) : null}
                  {collectibleStatusNextStep ? (
                    <p className="mt-2 text-sm text-muted-foreground">
                      {collectibleStatusNextStep}
                    </p>
                  ) : null}
                </Card>
              )}

              {!error && isAuthenticated && application?.membership ? (
                <Card className="mb-6 p-4 sm:p-5" data-testid="sell-review-updates-card">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-foreground">
                        {t('marketplace.sell.reviewUpdatesTitle')}
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {t('marketplace.sell.reviewUpdatesSubtitle')}
                      </p>
                    </div>
                    {application.membership.unreadReviewCount > 0 ? (
                      <Badge variant="secondary" data-testid="sell-review-unread-badge">
                        {t('marketplace.sell.reviewUpdatesUnreadCount', {
                          count: application.membership.unreadReviewCount,
                        })}
                      </Badge>
                    ) : null}
                  </div>

                  {reviewEventsError ? (
                    <div
                      className="mt-4 rounded-md border border-destructive/30 bg-destructive/5 p-3"
                      data-testid="sell-review-updates-error"
                    >
                      <p className="text-sm text-destructive">
                        {t('marketplace.sell.reviewUpdatesLoadFailed')}
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-3"
                        onClick={() => void refreshReviewEvents()}
                        data-testid="sell-review-updates-retry"
                      >
                        {t('common.retry')}
                      </Button>
                    </div>
                  ) : reviewEventsLoading ? (
                    <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>{t('marketplace.sell.reviewUpdatesLoading')}</span>
                    </div>
                  ) : reviewEvents.length === 0 ? (
                    <p className="mt-4 text-sm text-muted-foreground">
                      {t('marketplace.sell.reviewUpdatesEmpty')}
                    </p>
                  ) : (
                    <div className="mt-4 space-y-3">
                      {reviewEvents.map(event => {
                        const isUnread = !event.readAt;
                        return (
                          <div
                            key={event.id}
                            className={`rounded-md border p-3 ${
                              isUnread
                                ? 'border-primary/40 bg-primary/5'
                                : 'border-border bg-background'
                            }`}
                            data-testid={`sell-review-event-${event.id}`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-sm font-medium text-foreground">
                                {t('marketplace.sell.reviewUpdatesTransition', {
                                  previous: t(
                                    MARKETPLACE_MEMBERSHIP_STATUS_KEYS[event.previousStatus]
                                  ),
                                  current: t(MARKETPLACE_MEMBERSHIP_STATUS_KEYS[event.status]),
                                })}
                              </p>
                              {isUnread ? (
                                <Badge variant="secondary">
                                  {t('marketplace.sell.reviewUpdatesUnread')}
                                </Badge>
                              ) : null}
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {formatDate(event.createdAt)}
                            </p>
                            {event.reason ? (
                              <p className="mt-2 text-sm text-muted-foreground">
                                {t('marketplace.sell.reviewUpdatesReason', {
                                  reason: event.reason,
                                })}
                              </p>
                            ) : null}
                            {isUnread ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="mt-3"
                                disabled={readingReviewEventID === String(event.id)}
                                onClick={() => void handleMarkReviewEventRead(event.id)}
                                data-testid={`sell-review-mark-read-${event.id}`}
                              >
                                {readingReviewEventID === String(event.id) ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    {t('marketplace.sell.reviewUpdatesMarking')}
                                  </>
                                ) : (
                                  t('marketplace.sell.reviewUpdatesMarkRead')
                                )}
                              </Button>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>
              ) : null}

              {!error && isAuthenticated && isCollectibleMarketplace && isApproved && (
                <CollectibleCardSubmissionsWorkspace enabled={isAuthenticated && isApproved} />
              )}

              {!error && isAuthenticated && policy.showApplicationForm && (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                  <div className="space-y-6 lg:col-span-2">
                    <Card className="p-4 sm:p-6">
                      <h2 className="mb-2 text-lg font-semibold text-foreground">
                        {t('marketplace.sell.selectProductGroups')}
                      </h2>
                      <p className="mb-4 text-sm text-muted-foreground">{productGroupsDesc}</p>

                      {groupsLoading ? (
                        <div className="flex justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        </div>
                      ) : productGroups.length > 0 ? (
                        <ProductGroupPicker
                          groups={productGroups}
                          selectedIds={selectedGroupIds}
                          onToggle={toggleGroup}
                          disabled={policy.isSelectionLocked}
                          itemCountLabel={count => `${count} ${t('marketplace.products')}`}
                        />
                      ) : (
                        <VStack gap="md" align="center" className="py-8 text-center">
                          <Package className="h-10 w-10 text-muted-foreground" />
                          <div>
                            <h3 className="font-semibold text-foreground">
                              {t('marketplace.sell.emptyGroupsTitle')}
                            </h3>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {policy.requiresProductGroups
                                ? t('marketplace.sell.emptyGroupsDesc')
                                : t('marketplace.sell.emptyGroupsDescOpen')}
                            </p>
                          </div>
                          <HStack gap="sm" className="flex-wrap justify-center">
                            <Button asChild className="h-11 w-full sm:w-auto">
                              <Link href="/settings/product-groups">
                                {t('marketplace.sell.manageProductGroups')}
                              </Link>
                            </Button>
                            <Button asChild variant="outline" className="h-11 w-full sm:w-auto">
                              <Link href="/listing/new">
                                {t('marketplace.sell.createFirstProduct')}
                              </Link>
                            </Button>
                          </HStack>
                        </VStack>
                      )}
                    </Card>
                  </div>

                  <div className="space-y-6">
                    <Card className="sticky top-4 p-4 sm:p-5">
                      <h3 className="mb-4 font-semibold text-foreground">
                        {t('marketplace.sell.applicationSummary')}
                      </h3>
                      <VStack gap="md" className="mb-4">
                        <HStack justify="between">
                          <span className="text-sm text-muted-foreground">
                            {t('marketplace.sell.productGroupsSelected')}
                          </span>
                          <span className="font-medium text-foreground">
                            {selectedGroupIds.length}
                          </span>
                        </HStack>
                        <HStack justify="between">
                          <span className="text-sm text-muted-foreground">
                            {t('marketplace.sell.applicationRequirementsMet')}
                          </span>
                          <span
                            className={`font-medium ${
                              applicationRequirementsMet ? 'text-primary' : 'text-warning'
                            }`}
                          >
                            {applicationRequirementsMet ? t('common.yes') : t('common.no')}
                          </span>
                        </HStack>
                      </VStack>

                      {policy.showGroupsValidation && (
                        <p className="mb-3 text-xs text-muted-foreground">
                          {t('marketplace.sell.groupsRequiredCurated')}
                        </p>
                      )}

                      {!policy.showSubmit &&
                        !isApproved &&
                        !policy.requiresProductGroups &&
                        selectedGroupIds.length === 0 &&
                        !isApplied && (
                          <p className="mb-3 text-xs text-muted-foreground">
                            {t('marketplace.sell.completeHintOpen')}
                          </p>
                        )}

                      {policy.showSubmit && (
                        <Button
                          className="w-full"
                          disabled={!policy.canSubmit}
                          onClick={handleApply}
                          data-testid="sell-submit-application"
                        >
                          {isSubmitting ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              {t('common.submitting')}
                            </>
                          ) : (
                            t('marketplace.sell.submitApplication')
                          )}
                        </Button>
                      )}

                      {policy.showWithdraw && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              className="mt-3 w-full"
                              disabled={!policy.canWithdraw}
                              data-testid="sell-withdraw-application"
                            >
                              {isWithdrawing ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  {t('common.submitting')}
                                </>
                              ) : (
                                t('marketplace.sell.withdrawApplication')
                              )}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                {t('marketplace.sell.withdrawConfirmTitle')}
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                {t('marketplace.sell.withdrawConfirmDesc')}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                              <AlertDialogAction onClick={handleWithdraw}>
                                {t('marketplace.sell.withdrawApplication')}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}

                      <p className="mt-4 text-center text-xs text-muted-foreground">
                        {t('marketplace.sell.termsAgreement')}
                      </p>
                    </Card>

                    <Card className="p-4 sm:p-5">
                      <h3 className="mb-4 font-semibold text-foreground">
                        {t('marketplace.sell.whatHappensNext')}
                      </h3>
                      <VStack gap="md" className="text-sm text-muted-foreground">
                        {policy.isAutoApproval ? (
                          <>
                            <p>1. {t('marketplace.sell.step1Open')}</p>
                            <p>2. {t('marketplace.sell.step2Open')}</p>
                            <p>3. {t('marketplace.sell.step3Open')}</p>
                          </>
                        ) : (
                          <>
                            <p>1. {t('marketplace.sell.step1Approval')}</p>
                            <p>2. {t('marketplace.sell.step2Approval')}</p>
                            <p>3. {t('marketplace.sell.step3Approval')}</p>
                          </>
                        )}
                      </VStack>
                    </Card>
                  </div>
                </div>
              )}
            </>
          )}
        </Container>
      </main>

      <Footer />
    </div>
  );
}
