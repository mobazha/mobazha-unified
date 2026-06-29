'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  MARKETPLACE_CATALOG_MODE_KEYS,
  MARKETPLACE_DISCOVERABILITY_KEYS,
  MARKETPLACE_DOMAIN_KIND_KEYS,
  MARKETPLACE_DOMAIN_VERIFICATION_KEYS,
  MARKETPLACE_LIFECYCLE_STATUS_KEYS,
  MARKETPLACE_MEMBERSHIP_STATUS_KEYS,
  formatUserName,
  useI18n,
  useOperatorMarketplace,
} from '@mobazha/core';
import type { MarketplaceStoreMembership } from '@mobazha/core';
import { Header, Footer } from '@/components';
import { OperatorMarketplaceSettingsCard } from '@/components/Operator/OperatorMarketplaceSettingsCard';
import { Container } from '@/components/layouts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, Check, Loader2, Send, ShieldCheck } from 'lucide-react';

type MembershipFilter =
  | 'all'
  | 'pending'
  | 'applied'
  | 'accepted'
  | 'invited'
  | 'approved'
  | 'rejected'
  | 'suspended';

const PENDING_STATUSES: ReadonlySet<MarketplaceStoreMembership['status']> = new Set([
  'applied',
  'accepted',
]);

const STORE_STATUS_PRIORITY: Record<MarketplaceStoreMembership['status'], number> = {
  applied: 0,
  accepted: 1,
  invited: 2,
  approved: 3,
  rejected: 4,
  suspended: 5,
  left: 6,
};

export default function MarketplaceOperatorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params.id ?? '');
  const { t, formatDate } = useI18n();
  const { toast } = useToast();
  const {
    marketplace,
    stores,
    reviewEvents,
    counts,
    loading,
    loadFailed,
    reviewEventsError,
    working,
    refresh,
    publish,
    update,
    archive,
    invite,
    reviewSeller,
  } = useOperatorMarketplace(id);
  const [peerID, setPeerID] = useState('');
  const [membershipFilter, setMembershipFilter] = useState<MembershipFilter>('all');
  const [approveTarget, setApproveTarget] = useState<MarketplaceStoreMembership | null>(null);
  const [reasonTarget, setReasonTarget] = useState<MarketplaceStoreMembership | null>(null);
  const [reasonAction, setReasonAction] = useState<'rejected' | 'suspended' | null>(null);
  const [reasonInput, setReasonInput] = useState('');
  const [reasonTouched, setReasonTouched] = useState(false);
  const isArchived = marketplace?.status === 'archived';
  const trimmedReason = reasonInput.trim();
  const reasonTooLong = trimmedReason.length > 1000;
  const reasonInvalid = trimmedReason.length === 0 || reasonTooLong;
  const acceptedCount = useMemo(
    () => stores.filter(store => store.status === 'accepted').length,
    [stores]
  );

  const filterCounts = useMemo(
    () => ({
      all: stores.length,
      pending: stores.filter(store => PENDING_STATUSES.has(store.status)).length,
      applied: counts.applied,
      accepted: acceptedCount,
      invited: counts.invited,
      approved: counts.approved,
      rejected: counts.rejected,
      suspended: counts.suspended,
    }),
    [acceptedCount, counts, stores]
  );

  const sortedStores = useMemo(() => {
    return [...stores].sort((a, b) => {
      const statusOrderDelta = STORE_STATUS_PRIORITY[a.status] - STORE_STATUS_PRIORITY[b.status];
      if (statusOrderDelta !== 0) return statusOrderDelta;
      const aTime =
        Date.parse(a.appliedAt ?? a.acceptedAt ?? a.invitedAt ?? a.createdAt ?? '') || 0;
      const bTime =
        Date.parse(b.appliedAt ?? b.acceptedAt ?? b.invitedAt ?? b.createdAt ?? '') || 0;
      return bTime - aTime;
    });
  }, [stores]);

  const visibleStores = useMemo(() => {
    if (membershipFilter === 'all') return sortedStores;
    if (membershipFilter === 'pending') {
      return sortedStores.filter(store => PENDING_STATUSES.has(store.status));
    }
    return sortedStores.filter(store => store.status === membershipFilter);
  }, [membershipFilter, sortedStores]);

  const reviewEventsByPeerID = useMemo(() => {
    const map = new Map<string, typeof reviewEvents>();
    for (const event of reviewEvents) {
      const bucket = map.get(event.peerID);
      if (bucket) {
        bucket.push(event);
      } else {
        map.set(event.peerID, [event]);
      }
    }
    for (const [, bucket] of map) {
      bucket.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
    }
    return map;
  }, [reviewEvents]);

  const filterMeta: Array<{ key: MembershipFilter; labelKey: string }> = [
    { key: 'all', labelKey: 'marketplace.operator.filterAll' },
    { key: 'pending', labelKey: 'marketplace.operator.filterPending' },
    { key: 'applied', labelKey: 'marketplace.operator.filterApplied' },
    { key: 'accepted', labelKey: 'marketplace.operator.filterAccepted' },
    { key: 'invited', labelKey: 'marketplace.operator.filterInvited' },
    { key: 'approved', labelKey: 'marketplace.operator.filterApproved' },
    { key: 'rejected', labelKey: 'marketplace.operator.filterRejected' },
    { key: 'suspended', labelKey: 'marketplace.operator.filterSuspended' },
  ];

  function resetReasonDialog() {
    setReasonTarget(null);
    setReasonAction(null);
    setReasonInput('');
    setReasonTouched(false);
  }

  async function handlePublish() {
    try {
      await publish();
      toast({ title: t('marketplace.operator.publishSuccess') });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('marketplace.operator.publishFailedTitle'),
        description: error instanceof Error ? error.message : t('common.retry'),
      });
    }
  }

  async function handleInvite() {
    const value = peerID.trim();
    if (!value) return;
    try {
      await invite(value);
      setPeerID('');
      toast({
        title: t('marketplace.operator.inviteSuccess'),
        description: t('marketplace.operator.inviteSuccessDesc'),
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('marketplace.operator.inviteFailedTitle'),
        description: error instanceof Error ? error.message : t('common.retry'),
      });
    }
  }

  async function handleReview(
    store: MarketplaceStoreMembership,
    status: 'approved' | 'rejected' | 'suspended',
    reason?: string
  ): Promise<boolean> {
    try {
      await reviewSeller(store, status, reason);
      toast({
        title:
          status === 'approved'
            ? t('marketplace.operator.approveSuccess')
            : status === 'rejected'
              ? t('marketplace.operator.rejectSuccess')
              : t('marketplace.operator.suspendSuccess'),
      });
      return true;
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('marketplace.operator.reviewFailedTitle'),
        description: error instanceof Error ? error.message : t('common.retry'),
      });
      return false;
    }
  }

  async function handleApproveConfirm() {
    if (!approveTarget || isArchived) return;
    const succeeded = await handleReview(approveTarget, 'approved');
    if (succeeded) {
      setApproveTarget(null);
    }
  }

  async function handleReasonSubmit() {
    if (!reasonTarget || !reasonAction || reasonInvalid || isArchived) {
      setReasonTouched(true);
      return;
    }
    const succeeded = await handleReview(reasonTarget, reasonAction, trimmedReason);
    if (succeeded) {
      resetReasonDialog();
    }
  }

  async function handleSaveSettings(data: Parameters<typeof update>[0]) {
    try {
      const updated = await update(data);
      toast({ title: t('marketplace.operator.saveSuccess') });
      return updated;
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('marketplace.operator.saveFailedTitle'),
        description: error instanceof Error ? error.message : t('common.retry'),
      });
      return null;
    }
  }

  async function handleArchive() {
    try {
      await archive();
      toast({ title: t('marketplace.operator.archiveSuccess') });
      router.push('/operator/marketplaces');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('marketplace.operator.archiveFailedTitle'),
        description: error instanceof Error ? error.message : t('common.retry'),
      });
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex justify-center py-24">
          <Loader2 className="h-7 w-7 animate-spin" />
        </div>
      </div>
    );
  }

  if (loadFailed || !marketplace) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="py-10">
          <Container size="md">
            <Card>
              <CardContent className="space-y-4 py-10 text-center">
                <p className="text-muted-foreground">
                  {t('marketplace.operator.detailLoadFailed')}
                </p>
                <Button asChild variant="outline">
                  <Link href="/operator/marketplaces">
                    {t('marketplace.operator.backToConsole')}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </Container>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" data-testid="operator-marketplace-detail">
      <Header />
      <main className="py-10">
        <Container size="xl">
          <Link
            href="/operator/marketplaces"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('marketplace.operator.backToConsole')}
          </Link>
          <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold">{marketplace.name}</h1>
                <Badge>{t(MARKETPLACE_LIFECYCLE_STATUS_KEYS[marketplace.status])}</Badge>
              </div>
              <p className="mt-2 text-muted-foreground">
                {marketplace.description || t('marketplace.operator.noDescription')}
              </p>
            </div>
            {marketplace.status === 'draft' && !isArchived && (
              <Button onClick={() => void handlePublish()} disabled={Boolean(working)}>
                {working === 'publish' ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ShieldCheck className="mr-2 h-4 w-4" />
                )}
                {t('marketplace.operator.publish')}
              </Button>
            )}
          </div>

          <div className="mt-8">
            <OperatorMarketplaceSettingsCard
              key={marketplace.id}
              marketplace={marketplace}
              working={working}
              onSave={handleSaveSettings}
              onArchive={handleArchive}
            />
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>{t('marketplace.operator.publishAndDomains')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p>
                  {t('marketplace.operator.discoverability')}:{' '}
                  {t(MARKETPLACE_DISCOVERABILITY_KEYS[marketplace.discoverability])}
                </p>
                <p>
                  {t('marketplace.operator.catalogMode')}:{' '}
                  {t(MARKETPLACE_CATALOG_MODE_KEYS[marketplace.catalogMode])}
                </p>
                {marketplace.domains.map(domain => (
                  <div key={domain.host} className="rounded-md border p-3">
                    <div className="font-medium">{domain.host}</div>
                    <div className="mt-1 text-muted-foreground">
                      {t(MARKETPLACE_DOMAIN_KIND_KEYS[domain.kind])} ·{' '}
                      {t(MARKETPLACE_DOMAIN_VERIFICATION_KEYS[domain.verificationStatus])}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>{t('marketplace.operator.storeAdmission')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>{t('marketplace.operator.waitingCount', { count: counts.waiting })}</p>
                <p>{t('marketplace.operator.approvedCount', { count: counts.approved })}</p>
                <p className="text-muted-foreground">
                  {t('marketplace.operator.inviteNotApproval')}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>{t('marketplace.operator.responsibilityBoundary')}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {t('marketplace.operator.responsibilityDesc')}
              </CardContent>
            </Card>
          </div>

          {!isArchived ? (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>{t('marketplace.operator.inviteStore')}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 sm:flex-row">
                <Input
                  value={peerID}
                  onChange={event => setPeerID(event.target.value)}
                  placeholder={t('marketplace.operator.peerIdPlaceholder')}
                />
                <Button
                  onClick={() => void handleInvite()}
                  disabled={!peerID.trim() || Boolean(working)}
                >
                  <Send className="mr-2 h-4 w-4" />
                  {t('marketplace.operator.sendInvite')}
                </Button>
              </CardContent>
            </Card>
          ) : null}

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>{t('marketplace.operator.applicationReviewWorkspace')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {isArchived ? (
                <p className="text-sm text-muted-foreground">
                  {t('marketplace.operator.readOnlyArchived')}
                </p>
              ) : null}
              <div className="flex flex-wrap gap-2" data-testid="operator-membership-filters">
                {filterMeta.map(filter => {
                  const active = membershipFilter === filter.key;
                  return (
                    <Button
                      key={filter.key}
                      size="sm"
                      variant={active ? 'default' : 'outline'}
                      aria-pressed={active}
                      onClick={() => setMembershipFilter(filter.key)}
                      data-testid={`operator-filter-${filter.key}`}
                    >
                      <span>{t(filter.labelKey)}</span>
                      <span
                        className="ml-2 text-xs opacity-80"
                        data-testid={`operator-filter-count-${filter.key}`}
                      >
                        {filterCounts[filter.key]}
                      </span>
                    </Button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                {t('marketplace.operator.pendingFirstHint')}
              </p>
              {reviewEventsError ? (
                <div
                  className="rounded-md border border-destructive/30 bg-destructive/5 p-3"
                  data-testid="operator-review-events-error"
                >
                  <p className="text-xs text-destructive">
                    {t('marketplace.operator.reviewHistoryLoadFailed')}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2"
                    onClick={() => void refresh()}
                    disabled={Boolean(working)}
                    data-testid="operator-review-events-retry"
                  >
                    {t('common.retry')}
                  </Button>
                </div>
              ) : null}
              {stores.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">
                  {t('marketplace.operator.noStoresYet')}
                </p>
              ) : visibleStores.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">
                  {t('marketplace.operator.noStoresMatchFilter')}
                </p>
              ) : (
                visibleStores.map(store => {
                  const storeReviewEvents = reviewEventsByPeerID.get(store.peerID) ?? [];
                  const canApprove =
                    !isArchived && (store.status === 'accepted' || store.status === 'applied');
                  const canReject =
                    !isArchived && (store.status === 'accepted' || store.status === 'applied');
                  const canSuspend = !isArchived && store.status === 'approved';
                  const appliedAt = store.appliedAt;
                  const groupedItems = store.productGroups.reduce(
                    (sum, group) => sum + (group.itemCount ?? 0),
                    0
                  );
                  return (
                    <div
                      key={store.id}
                      data-testid="operator-membership-row"
                      data-peerid={store.peerID}
                      className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="space-y-2">
                        <div className="text-sm font-medium">
                          {formatUserName(
                            { peerID: store.peerID },
                            { prefix: t('marketplace.operator.storeNamePrefix') }
                          )}
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <Badge variant="outline">
                            {t(MARKETPLACE_MEMBERSHIP_STATUS_KEYS[store.status])}
                          </Badge>
                          {store.isVisible && (
                            <span className="text-xs text-muted-foreground">
                              {t('marketplace.operator.catalogVisible')}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {appliedAt ? (
                            <p>
                              {t('marketplace.operator.appliedAt', { date: formatDate(appliedAt) })}
                            </p>
                          ) : null}
                          {store.reviewedAt ? (
                            <p>
                              {t('marketplace.operator.reviewedAt', {
                                date: formatDate(store.reviewedAt),
                              })}
                            </p>
                          ) : null}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          <p>
                            {store.productGroups.length > 0
                              ? t('marketplace.operator.productGroupsCount', {
                                  count: store.productGroups.length,
                                  items: groupedItems,
                                })
                              : store.productGroupIDs.length > 0
                                ? t('marketplace.operator.productGroupsSummary', {
                                    count: store.productGroupIDs.length,
                                  })
                                : marketplace.catalogMode === 'open'
                                  ? t('marketplace.operator.productGroupsFullCatalog')
                                  : t('marketplace.operator.productGroupsNoneSelectedCurated')}
                          </p>
                          {store.productGroups.length > 0 ? (
                            <ul className="mt-2 space-y-1">
                              {store.productGroups.map(group => (
                                <li key={group.id} className="rounded-md border px-2 py-1">
                                  <p className="text-foreground">
                                    {t('marketplace.operator.productGroupWithCount', {
                                      name: group.name,
                                      count: group.itemCount,
                                    })}
                                  </p>
                                  {group.description ? (
                                    <p className="text-muted-foreground">{group.description}</p>
                                  ) : null}
                                </li>
                              ))}
                            </ul>
                          ) : null}
                        </div>
                        {store.decisionReason ? (
                          <p className="text-xs text-muted-foreground">
                            {t('marketplace.operator.decisionReasonLabel', {
                              reason: store.decisionReason,
                            })}
                          </p>
                        ) : null}
                        <details
                          className="rounded-md border border-border/70 p-2 text-xs"
                          data-testid={`operator-review-history-${store.peerID}`}
                        >
                          <summary className="cursor-pointer list-none font-medium text-foreground">
                            {t('marketplace.operator.reviewHistoryTitle', {
                              count: storeReviewEvents.length,
                            })}
                          </summary>
                          <div className="mt-2 space-y-2">
                            {storeReviewEvents.length === 0 ? (
                              <p className="text-muted-foreground">
                                {t('marketplace.operator.reviewHistoryEmpty')}
                              </p>
                            ) : (
                              storeReviewEvents.map(event => (
                                <div
                                  key={event.id}
                                  className="rounded-md border border-border/60 p-2"
                                >
                                  <p className="text-foreground">
                                    {t('marketplace.operator.reviewHistoryTransition', {
                                      previous: t(
                                        MARKETPLACE_MEMBERSHIP_STATUS_KEYS[event.previousStatus]
                                      ),
                                      current: t(MARKETPLACE_MEMBERSHIP_STATUS_KEYS[event.status]),
                                    })}
                                  </p>
                                  <p className="mt-1 text-muted-foreground">
                                    {t('marketplace.operator.reviewHistoryBy', {
                                      actor: formatUserName(
                                        { peerID: event.actorID },
                                        {
                                          fallback: t('marketplace.operator.reviewActorFallback'),
                                          prefix: t('marketplace.operator.reviewActorPrefix'),
                                        }
                                      ),
                                      date: formatDate(event.createdAt),
                                    })}
                                  </p>
                                  {event.reason ? (
                                    <p className="mt-1 text-muted-foreground">
                                      {t('marketplace.operator.reviewHistoryReason', {
                                        reason: event.reason,
                                      })}
                                    </p>
                                  ) : null}
                                </div>
                              ))
                            )}
                          </div>
                        </details>
                      </div>
                      <div className="flex gap-2">
                        {canApprove ? (
                          <Button
                            size="sm"
                            onClick={() => setApproveTarget(store)}
                            disabled={Boolean(working)}
                            data-testid={`operator-approve-${store.peerID}`}
                          >
                            <Check className="mr-1 h-4 w-4" />
                            {t('marketplace.operator.approve')}
                          </Button>
                        ) : null}
                        {canReject ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setReasonTarget(store);
                              setReasonAction('rejected');
                              setReasonInput('');
                              setReasonTouched(false);
                            }}
                            disabled={Boolean(working)}
                            data-testid={`operator-reject-${store.peerID}`}
                          >
                            {t('marketplace.operator.reject')}
                          </Button>
                        ) : null}
                        {canSuspend ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setReasonTarget(store);
                              setReasonAction('suspended');
                              setReasonInput('');
                              setReasonTouched(false);
                            }}
                            disabled={Boolean(working)}
                            data-testid={`operator-suspend-${store.peerID}`}
                          >
                            {t('marketplace.operator.suspend')}
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </Container>
      </main>
      <AlertDialog
        open={Boolean(approveTarget)}
        onOpenChange={open => (!open ? setApproveTarget(null) : undefined)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('marketplace.operator.approveConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('marketplace.operator.approveConfirmDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={Boolean(working)}>{t('common.cancel')}</AlertDialogCancel>
            <Button
              onClick={() => void handleApproveConfirm()}
              type="button"
              disabled={Boolean(working)}
              data-testid="operator-approve-confirm"
            >
              {t('marketplace.operator.approve')}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Dialog
        open={Boolean(reasonTarget && reasonAction)}
        onOpenChange={open => {
          if (!open) resetReasonDialog();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t(
                reasonAction === 'suspended'
                  ? 'marketplace.operator.reasonDialogTitleSuspend'
                  : 'marketplace.operator.reasonDialogTitleReject'
              )}
            </DialogTitle>
            <DialogDescription>{t('marketplace.operator.reasonDialogDesc')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label htmlFor="review-reason" className="text-sm font-medium text-foreground">
              {t('marketplace.operator.reasonLabel')}
            </label>
            <Textarea
              id="review-reason"
              value={reasonInput}
              maxLength={1000}
              onChange={event => setReasonInput(event.target.value)}
              onBlur={() => setReasonTouched(true)}
              placeholder={t(
                reasonAction === 'suspended'
                  ? 'marketplace.operator.reasonPlaceholderSuspend'
                  : 'marketplace.operator.reasonPlaceholderReject'
              )}
              data-testid="operator-review-reason-input"
            />
            <p className="text-xs text-muted-foreground">
              {t('marketplace.operator.reasonCharCount', { count: trimmedReason.length })}
            </p>
            {reasonTouched && reasonInvalid ? (
              <p className="text-xs text-destructive">
                {reasonTooLong
                  ? t('marketplace.operator.reasonLength')
                  : t('marketplace.operator.reasonRequired')}
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetReasonDialog} disabled={Boolean(working)}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={() => void handleReasonSubmit()}
              disabled={Boolean(working) || reasonInvalid}
              data-testid="operator-review-reason-submit"
            >
              {reasonAction === 'suspended'
                ? t('marketplace.operator.submitSuspend')
                : t('marketplace.operator.submitReject')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Footer />
    </div>
  );
}
