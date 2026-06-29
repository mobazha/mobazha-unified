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
  useCommunityMarketplaceSell,
  useProductGroups,
  useUserStore,
  useI18n,
  getCasdoorUserId,
  marketplacePlatformKey,
  marketplaceHref,
  resolveCurationMarketBackHref,
  isHosted,
  isCollectibleMarketplaceVertical,
  startCasdoorLogin,
  type ProductGroup,
} from '@mobazha/core';
import { useToast } from '@/components/ui/use-toast';
import { ChevronLeft, ClipboardList, Loader2, Package, Store } from 'lucide-react';

function statusLabel(t: (key: string) => string, status?: string): string {
  switch (status) {
    case 'approved':
      return t('marketplace.sell.statusApproved');
    case 'rejected':
      return t('marketplace.sell.statusRejected');
    case 'suspended':
      return t('marketplace.sell.statusSuspended');
    case 'pending':
    default:
      return t('marketplace.sell.statusPending');
  }
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

  const { marketplace, application, loading, error, submitApplication } =
    useCommunityMarketplaceSell(identifier);

  const marketHref = marketplace
    ? marketplaceHref(marketplace.slug, marketplace.publicID)
    : `/marketplace/${identifier}`;
  const marketBackHref = resolveCurationMarketBackHref(marketHref);

  const casdoorUserId = getCasdoorUserId();
  const productGroupUserID = casdoorUserId || '';
  const {
    groups: productGroups,
    loading: groupsLoading,
    loadGroups,
  } = useProductGroups({ userID: productGroupUserID, autoLoad: false });

  const [selectedGroupIds, setSelectedGroupIds] = useState<number[]>([]);
  const [isApplying, setIsApplying] = useState(false);

  useEffect(() => {
    if (isAuthenticated && productGroupUserID) {
      void loadGroups(productGroupUserID);
    }
  }, [isAuthenticated, productGroupUserID, loadGroups]);

  useEffect(() => {
    if (application?.productGroupIDs?.length) {
      setSelectedGroupIds(application.productGroupIDs);
    }
  }, [application?.productGroupIDs]);

  const applicationStatus = application?.status;
  const isApproved = applicationStatus === 'approved';
  const isRejected = applicationStatus === 'rejected';
  const isSuspended = applicationStatus === 'suspended';
  const isPending = application?.hasApplication && !isApproved && !isRejected && !isSuspended;
  const canSubmit = selectedGroupIds.length > 0 && !isApproved && !isApplying;
  const isCollectibleMarketplace = isCollectibleMarketplaceVertical(marketplace?.vertical);

  const platformName = marketplace ? t(marketplacePlatformKey(marketplace.platform)) : '';

  const toggleGroup = (id: number) => {
    if (isApproved) return;
    setSelectedGroupIds(prev =>
      prev.includes(id) ? prev.filter(gid => gid !== id) : [...prev, id]
    );
  };

  const handleApply = async () => {
    if (!canSubmit) return;
    setIsApplying(true);
    try {
      await submitApplication(selectedGroupIds);
      toast({
        title: t('common.success'),
        description: t('marketplace.applicationSubmitted'),
        variant: 'success',
      });
      router.push(marketBackHref);
    } catch (err) {
      toast({
        title: t('common.error'),
        description: err instanceof Error ? err.message : t('common.error'),
        variant: 'destructive',
      });
    } finally {
      setIsApplying(false);
    }
  };

  const groupsWithItems = useMemo(
    () => productGroups.filter(g => (g.itemCount ?? 0) > 0),
    [productGroups]
  );

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
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </Card>
          )}

          {!loading && (error || !marketplace) && (
            <Card className="p-8 text-center">
              <Store className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {error || t('marketplace.detail.unavailableDesc')}
              </p>
              <Link href="/marketplace" className="mt-4 inline-block">
                <Button variant="outline">{t('marketplace.title')}</Button>
              </Link>
            </Card>
          )}

          {!loading && marketplace && (
            <>
              <div className="mb-6">
                <h1 className="mb-2 text-2xl font-bold text-foreground sm:text-3xl">
                  {t('marketplace.sell.title')}
                </h1>
                <p className="text-sm text-muted-foreground sm:text-base">
                  {t('marketplace.sell.subtitle')}
                </p>
              </div>

              <Card className="mb-6 p-4 sm:p-5">
                <HStack gap="md" align="start">
                  <MarketplaceLogo
                    name={marketplace.name}
                    publicID={marketplace.publicID}
                    logoURL={marketplace.logoURL}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">
                      {t('marketplace.sell.applyingTo')}
                    </p>
                    <h2 className="text-lg font-bold text-foreground">{marketplace.name}</h2>
                    <Badge variant="secondary" className="mt-2">
                      {platformName}
                    </Badge>
                  </div>
                </HStack>
              </Card>

              {isCollectibleMarketplace ? (
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

              {!isAuthenticated && (
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

              {isAuthenticated && application?.hasApplication && (
                <Card className="mb-6 border-primary/20 bg-primary/5 p-4">
                  <p className="text-sm text-foreground">
                    {isApproved
                      ? t('marketplace.sell.alreadyApproved')
                      : isRejected
                        ? t('marketplace.sell.statusRejected')
                        : isSuspended
                          ? t('marketplace.sell.statusSuspended')
                          : t('marketplace.sell.applicationPending')}
                  </p>
                  <p className="mt-1 text-sm font-medium text-primary">
                    {statusLabel(t, applicationStatus)}
                  </p>
                  {isCollectibleMarketplace ? (
                    <p className="mt-2 text-sm text-muted-foreground">
                      {isApproved
                        ? t('marketplace.sell.collectibles.statusNextApprovedWithSubmissions')
                        : isRejected
                          ? t('marketplace.sell.collectibles.statusNextRejected')
                          : isSuspended
                            ? t('marketplace.sell.collectibles.statusNextSuspended')
                            : isPending
                              ? t('marketplace.sell.collectibles.statusNextPendingBlocked')
                              : t('marketplace.sell.collectibles.statusNextDefault')}
                    </p>
                  ) : null}
                </Card>
              )}

              {isAuthenticated && isCollectibleMarketplace && isApproved && (
                <CollectibleCardSubmissionsWorkspace enabled={isAuthenticated && isApproved} />
              )}

              {isAuthenticated && (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                  <div className="space-y-6 lg:col-span-2">
                    <Card className="p-4 sm:p-6">
                      <h2 className="mb-2 text-lg font-semibold text-foreground">
                        {t('marketplace.sell.selectProductGroups')}
                      </h2>
                      <p className="mb-4 text-sm text-muted-foreground">
                        {t('marketplace.sell.selectProductGroupsDesc')}
                      </p>

                      {groupsLoading ? (
                        <div className="flex justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        </div>
                      ) : groupsWithItems.length > 0 ? (
                        <ProductGroupPicker
                          groups={groupsWithItems}
                          selectedIds={selectedGroupIds}
                          onToggle={toggleGroup}
                          disabled={isApproved}
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
                              {t('marketplace.sell.emptyGroupsDesc')}
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
                            {t('marketplace.sell.productsSelected')}
                          </span>
                          <span className="font-medium text-foreground">
                            {selectedGroupIds.length}
                          </span>
                        </HStack>
                        <HStack justify="between">
                          <span className="text-sm text-muted-foreground">
                            {t('marketplace.sell.profileComplete')}
                          </span>
                          <span
                            className={`font-medium ${
                              selectedGroupIds.length > 0 ? 'text-primary' : 'text-warning'
                            }`}
                          >
                            {selectedGroupIds.length > 0 ? t('common.yes') : t('common.no')}
                          </span>
                        </HStack>
                      </VStack>

                      {!canSubmit && !isApproved && selectedGroupIds.length === 0 && (
                        <p className="mb-3 text-xs text-muted-foreground">
                          {t('marketplace.sell.completeHint')}
                        </p>
                      )}

                      <Button className="w-full" disabled={!canSubmit} onClick={handleApply}>
                        {isApplying ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            {t('common.submitting')}
                          </>
                        ) : (
                          t('marketplace.sell.submitApplication')
                        )}
                      </Button>

                      <p className="mt-4 text-center text-xs text-muted-foreground">
                        {t('marketplace.sell.termsAgreement')}
                      </p>
                    </Card>

                    <Card className="p-4 sm:p-5">
                      <h3 className="mb-4 font-semibold text-foreground">
                        {t('marketplace.sell.whatHappensNext')}
                      </h3>
                      <VStack gap="md" className="text-sm text-muted-foreground">
                        <p>1. {t('marketplace.sell.step1')}</p>
                        <p>2. {t('marketplace.sell.step2')}</p>
                        <p>3. {t('marketplace.sell.step3')}</p>
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
