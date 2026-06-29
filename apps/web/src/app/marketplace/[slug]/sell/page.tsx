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
  getCasdoorUserId,
  marketplaceHref,
  marketplaceJoinModeKey,
  marketplaceVerticalKey,
  MARKETPLACE_CATALOG_MODE_KEYS,
  resolveCurationMarketBackHref,
  resolveNativeMarketplaceSellPolicy,
  nativeMarketplaceSellStatusKey,
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
  const { t } = useI18n();
  const { toast } = useToast();
  const { isAuthenticated } = useUserStore();

  const slugParam = params.slug;
  const identifier = Array.isArray(slugParam) ? slugParam[0] : slugParam;

  const {
    marketplace,
    application,
    loading,
    error,
    isSubmitting,
    isWithdrawing,
    refresh,
    submitApplication,
    withdrawApplication,
  } = useNativeMarketplaceSell(identifier);

  const marketHref = marketplace
    ? marketplaceHref(marketplace.slug, marketplace.id)
    : `/marketplace/${identifier}`;
  const marketBackHref = resolveCurationMarketBackHref(marketHref);

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
  const isApproved = membershipStatus === 'approved';
  const isRejected = membershipStatus === 'rejected';
  const isSuspended = membershipStatus === 'suspended';
  const isApplied = membershipStatus === 'applied';
  const isLeft = membershipStatus === 'left';
  const isCollectibleMarketplace = isCollectibleMarketplaceVertical(marketplace?.vertical);

  const verticalLabel = marketplace ? t(marketplaceVerticalKey(marketplace.vertical)) : '';
  const joinLabel = marketplace ? t(marketplaceJoinModeKey(marketplace.joinMode)) : '';
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

  const admissionPolicyMessage = marketplace
    ? marketplace.sellerEntryMode === 'operator_invited'
      ? t('marketplace.sell.operatorInvitedPolicy')
      : marketplace.joinMode === 'invite'
        ? t('marketplace.sell.inviteOnlyPolicy')
        : t('marketplace.sell.selfServeNotAvailable')
    : '';

  const statusMessage = (() => {
    if (!application?.hasApplication) return null;
    if (isApproved) return t('marketplace.sell.alreadyApproved');
    if (isRejected) return t('marketplace.sell.statusRejected');
    if (isSuspended) return t('marketplace.sell.statusSuspended');
    if (isLeft) return t('marketplace.sell.statusLeft');
    if (isApplied) return t('marketplace.sell.applicationPending');
    return t('marketplace.sell.applicationPending');
  })();
  const decisionReason = application?.membership?.decisionReason?.trim();

  const applicationRequirementsMet = policy?.requiresProductGroups
    ? selectedGroupIds.length > 0
    : true;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <MobilePageHeader title={t('marketplace.sell.title')} />

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
                <Link href="/marketplace">
                  <Button variant="outline">{t('marketplace.title')}</Button>
                </Link>
              </HStack>
            </Card>
          )}

          {!loading && marketplace && policy && (
            <>
              <div className="mb-6">
                <h1 className="mb-2 text-2xl font-bold text-foreground sm:text-3xl">
                  {t('marketplace.sell.title')}
                </h1>
                <p className="text-sm text-muted-foreground sm:text-base">
                  {t('marketplace.sell.subtitle')}
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

              <Card className="mb-6 p-4 sm:p-5">
                <HStack gap="md" align="start">
                  <MarketplaceLogo
                    name={marketplace.name}
                    identifier={marketplace.id}
                    logoURL={marketplace.logoURL}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">
                      {t('marketplace.sell.applyingTo')}
                    </p>
                    <h2 className="text-lg font-bold text-foreground">{marketplace.name}</h2>
                    <HStack gap="xs" className="mt-2 flex-wrap">
                      <Badge variant="secondary">{verticalLabel}</Badge>
                      <Badge variant="outline">{joinLabel}</Badge>
                      <Badge variant="outline">{catalogLabel}</Badge>
                    </HStack>
                  </div>
                </HStack>
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
                  className="mb-6 border-primary/20 bg-primary/5 p-4"
                  data-testid="sell-status-card"
                >
                  <p className="text-sm text-foreground">{statusMessage}</p>
                  <p className="mt-1 text-sm font-medium text-primary">
                    {t(nativeMarketplaceSellStatusKey(membershipStatus))}
                  </p>
                  {application.autoApproved && isApproved && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      {t('marketplace.sell.autoApprovedMessage')}
                    </p>
                  )}
                  {(isRejected || isLeft) && policy.showSubmit && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      {t('marketplace.sell.reapplyHint')}
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
                  {isCollectibleMarketplace ? (
                    <p className="mt-2 text-sm text-muted-foreground">
                      {isApproved
                        ? t('marketplace.sell.collectibles.statusNextApprovedWithSubmissions')
                        : isRejected
                          ? t('marketplace.sell.collectibles.statusNextRejected')
                          : isSuspended
                            ? t('marketplace.sell.collectibles.statusNextSuspended')
                            : isApplied
                              ? t('marketplace.sell.collectibles.statusNextPendingBlocked')
                              : t('marketplace.sell.collectibles.statusNextDefault')}
                    </p>
                  ) : null}
                </Card>
              )}

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
                            <Link href="/settings/product-groups">
                              <Button>{t('marketplace.sell.manageProductGroups')}</Button>
                            </Link>
                            <Link href="/listing/new">
                              <Button variant="outline">
                                {t('marketplace.sell.createFirstProduct')}
                              </Button>
                            </Link>
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
