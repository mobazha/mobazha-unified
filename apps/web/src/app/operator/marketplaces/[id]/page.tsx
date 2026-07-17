// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  ApiError,
  MARKETPLACE_BUYER_ACCESS_MODE_KEYS,
  MARKETPLACE_CATALOG_MODE_KEYS,
  MARKETPLACE_DISCOVERABILITY_KEYS,
  MARKETPLACE_DOMAIN_KIND_KEYS,
  MARKETPLACE_DOMAIN_VERIFICATION_KEYS,
  MARKETPLACE_LIFECYCLE_STATUS_KEYS,
  MARKETPLACE_MEMBERSHIP_STATUS_KEYS,
  MARKETPLACE_SELLER_ENTRY_MODE_KEYS,
  MARKETPLACE_SELLER_REVIEW_MODE_KEYS,
  formatUserName,
  useCommunityMarketplaceEnrichment,
  useI18n,
  useOperatorMarketplace,
  useRuntimeCapability,
} from '@mobazha/core';
import type {
  MarketplaceSellerResolveCandidate,
  MarketplaceStoreMembership,
  PublicMarketplaceListingRef,
} from '@mobazha/core';
import { resolveMarketplaceSellers } from '@mobazha/core/services/api/marketplace';
import { getImageUrl } from '@mobazha/core/services/api/config';
import { Header, Footer } from '@/components';
import { OperatorEarningsCard } from '@/components/Operator/OperatorEarningsCard';
import { OperatorMetricsRow } from '@/components/Operator/OperatorMetricsRow';
import { OperatorInviteLinkPanel } from '@/components/Operator/OperatorInviteLinkPanel';
import { OperatorMarketplaceCurationPanel } from '@/components/Operator/OperatorMarketplaceCurationPanel';
import { OperatorMarketplaceSettingsCard } from '@/components/Operator/OperatorMarketplaceSettingsCard';
import { OperatorSharePanel } from '@/components/Operator/OperatorSharePanel';
import { Container } from '@/components/layouts';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Loader2,
  PauseCircle,
  PlayCircle,
  Send,
  ShieldCheck,
} from 'lucide-react';

type MembershipFilter =
  | 'all'
  | 'pending'
  | 'applied'
  | 'accepted'
  | 'invited'
  | 'approved'
  | 'rejected'
  | 'suspended';

type OperatorTab = 'overview' | 'curation' | 'sellers' | 'settings';

const VALID_OPERATOR_TABS = ['overview', 'curation', 'sellers', 'settings'] as const;

function resolveSellerCandidateAvatarUrl(
  candidate: MarketplaceSellerResolveCandidate
): string | undefined {
  const hash =
    candidate.avatarHashes?.medium?.trim() ||
    candidate.avatarHashes?.small?.trim() ||
    candidate.avatarHashes?.tiny?.trim() ||
    '';
  return hash ? getImageUrl(hash, candidate.peerID) : undefined;
}

function resolveOperatorTab(tabParam: string | null): OperatorTab {
  if (tabParam && (VALID_OPERATOR_TABS as readonly string[]).includes(tabParam)) {
    return tabParam as OperatorTab;
  }
  return 'overview';
}

const PENDING_STATUSES: ReadonlySet<MarketplaceStoreMembership['status']> = new Set([
  'applied',
  'accepted',
]);

// One shared empty array, so clearing candidates twice is a no-op to React.
// A fresh [] would compare unequal every time and force a re-render on every
// run of the effect below, which is one unstable dependency away from an
// unbounded render loop — and that loop blocks the event loop, so it spins the
// CPU rather than surfacing as a timeout.
const NO_CANDIDATES: readonly MarketplaceSellerResolveCandidate[] = [];
const NO_LISTING_REFS: PublicMarketplaceListingRef[] = [];

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
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const id = String(params.id ?? '');
  const { t, formatDate } = useI18n();
  const { toast } = useToast();
  const canCurate = useRuntimeCapability('marketplace.curation');
  const canReviewSellers = useRuntimeCapability('marketplace.sellerReview');
  const canManageCustomDomains = useRuntimeCapability('marketplace.customDomains');
  const canPublishReleases = useRuntimeCapability('marketplace.releasePublishing');
  const canViewAttribution = useRuntimeCapability('marketplace.attribution');
  const derivedTab = useMemo(() => {
    const requested = resolveOperatorTab(searchParams.get('tab'));
    return requested === 'curation' && !canCurate ? 'overview' : requested;
  }, [canCurate, searchParams]);
  const [activeTab, setActiveTab] = useState<OperatorTab>(derivedTab);
  useEffect(() => {
    setActiveTab(derivedTab);
  }, [derivedTab]);

  const syncTabToUrl = useCallback(
    (tab: OperatorTab) => {
      const params = new URLSearchParams(searchParams.toString());
      if (tab === 'overview') {
        params.delete('tab');
      } else {
        params.set('tab', tab);
      }
      const nextQuery = params.toString();
      if (nextQuery === searchParams.toString()) return;
      const href = nextQuery ? `${pathname}?${nextQuery}` : pathname;
      router.replace(href, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const handleTabChange = useCallback(
    (value: string) => {
      const tab = value as OperatorTab;
      setActiveTab(tab);
      syncTabToUrl(tab);
    },
    [syncTabToUrl]
  );

  // Metric cards are doors, not posters: each lands on the detail view that
  // explains its number (funnel card, earnings card, or the sellers tab).
  const handleMetricNavigate = useCallback(
    (target: 'funnel' | 'earnings' | 'sellers') => {
      if (target === 'sellers') {
        handleTabChange('sellers');
        return;
      }
      const anchorId =
        target === 'funnel' ? 'operator-attribution-funnel' : 'operator-earnings-anchor';
      document.getElementById(anchorId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },
    [handleTabChange]
  );
  const {
    marketplace,
    stores,
    reviewEvents,
    counts,
    loading,
    loadFailed,
    reviewEventsError,
    attributionSummary,
    attributionSummaryError,
    attributionSummaryLoading,
    curationItems,
    curationCandidates,
    curationLoading,
    curationCandidatesLoading,
    curationError,
    working,
    refresh,
    publish,
    suspend,
    resume,
    update,
    archive,
    invite,
    reviewSeller,
    verifyCustomDomain,
    addCurationItem,
    reorderCurationByKind,
    toggleCurationItem,
    removeCurationItem,
    loadCurationCandidates,
  } = useOperatorMarketplace(id, {
    curation: canCurate,
    sellerReview: canReviewSellers,
    customDomains: canManageCustomDomains,
    releasePublishing: canPublishReleases,
    attribution: canViewAttribution,
  });
  // Resolve store display names/avatars for the review list — operators
  // recognize "Atelier Kimura", never a raw peer ID.
  const storePeerIDs = useMemo(() => stores.map(store => store.peerID).filter(Boolean), [stores]);
  const { sellerProfiles: storeProfiles } = useCommunityMarketplaceEnrichment(
    NO_LISTING_REFS,
    storePeerIDs
  );

  const [inviteQuery, setInviteQuery] = useState('');
  const [sellerIdMode, setSellerIdMode] = useState(false);
  const [sellerIdInput, setSellerIdInput] = useState('');
  const [resolveCandidates, setResolveCandidates] =
    useState<readonly MarketplaceSellerResolveCandidate[]>(NO_CANDIDATES);
  const [selectedCandidate, setSelectedCandidate] =
    useState<MarketplaceSellerResolveCandidate | null>(null);
  const [resolveLoading, setResolveLoading] = useState(false);
  const [resolveUnavailable, setResolveUnavailable] = useState(false);
  const [resolveEmpty, setResolveEmpty] = useState(false);
  const resolveRequestSeqRef = useRef(0);
  const [membershipFilter, setMembershipFilter] = useState<MembershipFilter>('all');
  const [approveTarget, setApproveTarget] = useState<MarketplaceStoreMembership | null>(null);
  const [reasonTarget, setReasonTarget] = useState<MarketplaceStoreMembership | null>(null);
  const [reasonAction, setReasonAction] = useState<'rejected' | 'suspended' | null>(null);
  const [reasonInput, setReasonInput] = useState('');
  const [reasonTouched, setReasonTouched] = useState(false);
  const isArchived = marketplace?.status === 'archived';
  const curationReadOnly = isArchived;
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

  const resetInviteState = useCallback(() => {
    setInviteQuery('');
    setSellerIdInput('');
    setResolveCandidates(NO_CANDIDATES);
    setSelectedCandidate(null);
    setResolveLoading(false);
    setResolveUnavailable(false);
    setResolveEmpty(false);
  }, []);

  useEffect(() => {
    if (sellerIdMode) {
      setResolveCandidates(NO_CANDIDATES);
      setSelectedCandidate(null);
      setResolveLoading(false);
      setResolveUnavailable(false);
      setResolveEmpty(false);
      return;
    }

    const query = inviteQuery.trim();
    if (query.length < 2) {
      setResolveCandidates(NO_CANDIDATES);
      setSelectedCandidate(null);
      setResolveLoading(false);
      setResolveUnavailable(false);
      setResolveEmpty(false);
      return;
    }

    let cancelled = false;
    const requestSeq = ++resolveRequestSeqRef.current;
    const timer = window.setTimeout(() => {
      void (async () => {
        setResolveLoading(true);
        setResolveUnavailable(false);
        setResolveEmpty(false);
        try {
          const result = await resolveMarketplaceSellers(id, { query });
          if (cancelled || requestSeq !== resolveRequestSeqRef.current) return;
          const candidates = result.candidates ?? [];
          setResolveCandidates(candidates);
          setSelectedCandidate(prev =>
            prev && candidates.some(c => c.peerID === prev.peerID) ? prev : null
          );
          setResolveEmpty(candidates.length === 0);
        } catch (error) {
          if (cancelled || requestSeq !== resolveRequestSeqRef.current) return;
          const searchDown =
            error instanceof ApiError &&
            (error.status === 503 ||
              error.code === 'SERVICE_UNAVAILABLE' ||
              error.message === 'search_unavailable');
          setResolveCandidates(NO_CANDIDATES);
          setSelectedCandidate(null);
          setResolveEmpty(false);
          setResolveUnavailable(searchDown);
          if (!searchDown) {
            toast({
              variant: 'destructive',
              title: t('marketplace.operator.inviteFailedTitle'),
              description: error instanceof Error ? error.message : t('common.retry'),
            });
          }
        } finally {
          if (!cancelled && requestSeq === resolveRequestSeqRef.current) {
            setResolveLoading(false);
          }
        }
      })();
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [id, inviteQuery, sellerIdMode, t, toast]);

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

  async function handleSuspend() {
    try {
      await suspend();
      toast({ title: t('marketplace.operator.suspendMarketplaceSuccess') });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('marketplace.operator.suspendMarketplaceFailedTitle'),
        description: error instanceof Error ? error.message : t('common.retry'),
      });
    }
  }

  async function handleResume() {
    try {
      await resume();
      toast({ title: t('marketplace.operator.resumeMarketplaceSuccess') });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('marketplace.operator.resumeMarketplaceFailedTitle'),
        description: error instanceof Error ? error.message : t('common.retry'),
      });
    }
  }

  async function handleInvite() {
    const value = sellerIdMode ? sellerIdInput.trim() : (selectedCandidate?.peerID ?? '').trim();
    if (!value) return;
    try {
      await invite(value);
      resetInviteState();
      setSellerIdMode(false);
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

  async function handleVerifyCustomDomain() {
    try {
      const response = await verifyCustomDomain();
      if (!response) return;

      if (response.result === 'verified') {
        toast({
          title: t('marketplace.operator.customDomainVerifySuccessTitle'),
          description: t('marketplace.operator.customDomainVerifySuccessDesc'),
        });
        return;
      }

      if (response.result === 'pending' || response.result === 'record_not_found') {
        toast({
          title: t('marketplace.operator.customDomainVerifyPendingTitle'),
          description: t(
            response.result === 'record_not_found'
              ? 'marketplace.operator.customDomainVerifyRecordNotFound'
              : 'marketplace.operator.customDomainVerifyPendingDesc'
          ),
        });
        return;
      }

      toast({
        variant: 'destructive',
        title: t('marketplace.operator.customDomainVerifyFailedTitle'),
        description: t(
          response.result === 'challenge_unavailable'
            ? 'marketplace.operator.customDomainVerifyChallengeUnavailable'
            : 'marketplace.operator.customDomainVerifyLookupFailed'
        ),
      });
    } catch {
      toast({
        variant: 'destructive',
        title: t('marketplace.operator.customDomainVerifyFailedTitle'),
        description: t('marketplace.operator.customDomainVerifyLookupFailed'),
      });
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

  async function handleAddCurationItem(
    kind: Parameters<typeof addCurationItem>[0],
    payload: Parameters<typeof addCurationItem>[1]
  ) {
    if (curationReadOnly) return false;
    try {
      await addCurationItem(kind, payload);
      toast({ title: t('marketplace.operator.curation.addSuccess') });
      return true;
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('marketplace.operator.curation.addFailedTitle'),
        description: error instanceof Error ? error.message : t('common.retry'),
      });
      return false;
    }
  }

  async function handleReorderCurationByKind(
    kind: Parameters<typeof reorderCurationByKind>[0],
    itemIDs: Parameters<typeof reorderCurationByKind>[1]
  ) {
    if (curationReadOnly) return;
    try {
      await reorderCurationByKind(kind, itemIDs);
      toast({ title: t('marketplace.operator.curation.reorderSuccess') });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('marketplace.operator.curation.reorderFailedTitle'),
        description: error instanceof Error ? error.message : t('common.retry'),
      });
    }
  }

  async function handleToggleCurationItem(
    itemID: Parameters<typeof toggleCurationItem>[0],
    isActive: Parameters<typeof toggleCurationItem>[1]
  ) {
    if (curationReadOnly) return;
    try {
      await toggleCurationItem(itemID, isActive);
      toast({ title: t('marketplace.operator.curation.toggleSuccess') });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('marketplace.operator.curation.toggleFailedTitle'),
        description: error instanceof Error ? error.message : t('common.retry'),
      });
    }
  }

  async function handleRemoveCurationItem(itemID: Parameters<typeof removeCurationItem>[0]) {
    if (curationReadOnly) return;
    try {
      await removeCurationItem(itemID);
      toast({ title: t('marketplace.operator.curation.removeSuccess') });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('marketplace.operator.curation.removeFailedTitle'),
        description: error instanceof Error ? error.message : t('common.retry'),
      });
    }
  }

  async function handleLoadCurationCandidates(params: {
    q?: string;
    page?: number;
    pageSize?: number;
  }) {
    try {
      await loadCurationCandidates(params);
      return true;
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('marketplace.operator.curation.candidatesLoadFailedTitle'),
        description: error instanceof Error ? error.message : t('common.retry'),
      });
      return false;
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

  const hasVerifiedDomain = marketplace.domains.some(
    domain => domain.verificationStatus === 'verified'
  );
  const hasApprovedVisibleSeller = stores.some(
    store => store.status === 'approved' && store.isVisible
  );
  // Publishing with zero sellers is allowed (cold-start launch): the buyer
  // home renders an honest empty state and the live URL is the recruiting
  // asset. Having a visible seller is a soft recommendation, not a gate —
  // matching hosting's validateMarketplacePublishReadiness. The flag below
  // only picks the checklist copy, it no longer blocks publish.
  const requiresApprovedVisibleSeller = marketplace.sellerEntryMode === 'operator_invited';
  const launchChecklistReady = hasVerifiedDomain;
  const isDraft = marketplace.status === 'draft';
  const isSuspended = marketplace.status === 'suspended';
  const hasPublishedDraftChanges =
    marketplace.status === 'published' && marketplace.hasUnpublishedChanges;
  const canPublish = isDraft && launchChecklistReady && !isArchived;
  const canResumeMarketplace = isSuspended && launchChecklistReady && !isArchived;

  // Phase-aware "what should I do next" for a published marketplace. One
  // suggestion at a time, ordered by operational urgency; disappears entirely
  // once the market is humming.
  const activeCuratedListings = curationItems.filter(
    item => item.kind === 'listing' && item.isActive
  ).length;
  const overviewNextStep = (() => {
    if (marketplace.status !== 'published' || isArchived) return null;
    if (counts.waiting > 0) {
      return {
        title: t('marketplace.operator.nextStepReviewTitle', {
          defaultValue: `${counts.waiting} seller application${counts.waiting > 1 ? 's' : ''} waiting`,
          count: counts.waiting,
        }),
        body: t('marketplace.operator.nextStepReviewBody', {
          defaultValue: 'Sellers are waiting on your decision before they can go on sale.',
        }),
        cta: t('marketplace.operator.nextStepReviewCta', { defaultValue: 'Review sellers' }),
        action: () => handleTabChange('sellers'),
      };
    }
    if (counts.approved === 0) {
      return {
        title: t('marketplace.operator.nextStepRecruitTitle', {
          defaultValue: 'Recruit your first seller',
        }),
        body: t('marketplace.operator.nextStepRecruitBody', {
          defaultValue: 'Mint an invite link and share it where your community already is.',
        }),
        cta: t('marketplace.operator.nextStepRecruitCta', { defaultValue: 'Invite sellers' }),
        action: () => handleTabChange('sellers'),
      };
    }
    if (canCurate && activeCuratedListings === 0) {
      return {
        title: t('marketplace.operator.nextStepCurateTitle', {
          defaultValue: 'Feature your first products',
        }),
        body: t('marketplace.operator.nextStepCurateBody', {
          defaultValue: 'Pick what buyers see first — curated homepages convert better.',
        }),
        cta: t('marketplace.operator.nextStepCurateCta', { defaultValue: 'Curate homepage' }),
        action: () => handleTabChange('curation'),
      };
    }
    return null;
  })();
  const showLaunchChecklist = isDraft || isSuspended;

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
              {marketplace.description ? (
                <p className="mt-2 text-muted-foreground">{marketplace.description}</p>
              ) : (
                // An empty value is an invitation, not a shrug: link straight
                // to where it gets fixed instead of stating the absence.
                <button
                  type="button"
                  onClick={() => handleTabChange('settings')}
                  className="mt-2 text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                  data-testid="operator-add-positioning"
                >
                  {t('marketplace.operator.addPositioningCta', {
                    defaultValue: '+ Add a positioning line buyers will see',
                  })}
                </button>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {!isArchived ? (
                <Button asChild variant="outline" data-testid="operator-marketplace-preview-link">
                  <Link href={`/operator/marketplaces/${marketplace.id}/preview`}>
                    {t('marketplace.operator.previewDraft')}
                  </Link>
                </Button>
              ) : null}
              {canPublishReleases &&
              (marketplace.status === 'draft' || hasPublishedDraftChanges) &&
              !isArchived ? (
                <Button
                  onClick={() => void handlePublish()}
                  disabled={Boolean(working) || (isDraft && !canPublish)}
                  data-testid="operator-marketplace-publish"
                >
                  {working === 'publish' ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ShieldCheck className="mr-2 h-4 w-4" />
                  )}
                  {hasPublishedDraftChanges
                    ? t('marketplace.operator.publishChanges')
                    : t('marketplace.operator.publish')}
                </Button>
              ) : null}
              {canPublishReleases && marketplace.status === 'published' && !isArchived ? (
                <Button
                  variant="ghost"
                  className="text-muted-foreground"
                  onClick={() => void handleSuspend()}
                  disabled={Boolean(working)}
                  data-testid="operator-marketplace-suspend"
                >
                  {working === 'suspend' ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <PauseCircle className="mr-2 h-4 w-4" />
                  )}
                  {t('marketplace.operator.suspendMarketplace')}
                </Button>
              ) : null}
              {canPublishReleases && marketplace.status === 'suspended' && !isArchived ? (
                <Button
                  onClick={() => void handleResume()}
                  disabled={Boolean(working) || !canResumeMarketplace}
                  data-testid="operator-marketplace-resume"
                >
                  {working === 'resume' ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <PlayCircle className="mr-2 h-4 w-4" />
                  )}
                  {t('marketplace.operator.resumeMarketplace')}
                </Button>
              ) : null}
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={handleTabChange} className="mt-8">
            <TabsList
              className="flex h-auto w-full flex-wrap justify-start gap-1 p-1"
              aria-label={t('marketplace.operator.tabs.ariaLabel')}
            >
              <TabsTrigger value="overview" data-testid="operator-tab-overview">
                {t('marketplace.operator.tabs.overview')}
              </TabsTrigger>
              {canCurate ? (
                <TabsTrigger value="curation" data-testid="operator-tab-curation">
                  {t('marketplace.operator.tabs.curation')}
                </TabsTrigger>
              ) : null}
              <TabsTrigger value="sellers" data-testid="operator-tab-sellers">
                {t('marketplace.operator.tabs.sellers')}
              </TabsTrigger>
              <TabsTrigger value="settings" data-testid="operator-tab-settings">
                {t('marketplace.operator.tabs.settings')}
              </TabsTrigger>
            </TabsList>

            <TabsContent
              value="overview"
              className="mt-6"
              data-testid="operator-tab-content-overview"
            >
              {marketplace.status === 'published' ? (
                // Published = a running business: lead with performance, not
                // configuration. Setup guidance only returns for draft/suspended.
                <OperatorMetricsRow
                  marketplaceId={marketplace.id}
                  summary={attributionSummary}
                  summaryLoading={attributionSummaryLoading}
                  approvedSellers={counts.approved}
                  pendingSellers={counts.waiting}
                  onNavigate={handleMetricNavigate}
                />
              ) : (
                <Card data-testid="operator-overview-readiness">
                  <CardHeader>
                    <CardTitle>{t('marketplace.operator.overviewReadinessTitle')}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <p>
                      {t('marketplace.operator.overviewStatusLabel')}:{' '}
                      <span className="font-medium text-foreground">
                        {t(MARKETPLACE_LIFECYCLE_STATUS_KEYS[marketplace.status])}
                      </span>
                    </p>
                    <p className="text-muted-foreground">
                      {hasVerifiedDomain
                        ? t('marketplace.operator.launchChecklistDomainReady')
                        : t('marketplace.operator.launchChecklistDomainMissing')}
                    </p>
                    <p className="text-muted-foreground">
                      {requiresApprovedVisibleSeller
                        ? hasApprovedVisibleSeller
                          ? t('marketplace.operator.launchChecklistSellerReady')
                          : t('marketplace.operator.launchChecklistSellerMissing')
                        : hasApprovedVisibleSeller
                          ? t('marketplace.operator.launchChecklistSellerReady')
                          : t('marketplace.operator.launchChecklistSellerSelfServe')}
                    </p>
                    {showLaunchChecklist && isDraft && !canPublish ? (
                      <p
                        className="text-xs text-muted-foreground"
                        data-testid="operator-publish-disabled-hint"
                      >
                        {t('marketplace.operator.publishBlockedHint')}
                      </p>
                    ) : null}
                    {showLaunchChecklist && isSuspended && !canResumeMarketplace ? (
                      <p
                        className="text-xs text-muted-foreground"
                        data-testid="operator-resume-disabled-hint"
                      >
                        {t('marketplace.operator.resumeBlockedHint')}
                      </p>
                    ) : null}
                  </CardContent>
                </Card>
              )}

              {overviewNextStep ? (
                <Card
                  className="mt-6 border-primary/25 bg-primary/5"
                  data-testid="operator-next-step-card"
                >
                  <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <div>
                      <p className="text-sm font-medium">{overviewNextStep.title}</p>
                      <p className="text-sm text-muted-foreground">{overviewNextStep.body}</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={overviewNextStep.action}
                      data-testid="operator-next-step-cta"
                    >
                      {overviewNextStep.cta}
                    </Button>
                  </CardContent>
                </Card>
              ) : null}

              {marketplace.status === 'published' ? (
                <div className="mt-6">
                  <OperatorSharePanel
                    marketplaceId={marketplace.id}
                    slug={marketplace.slug || marketplace.id}
                  />
                </div>
              ) : null}

              {canViewAttribution ? (
                <Card
                  className="mt-6 scroll-mt-24"
                  id="operator-attribution-funnel"
                  data-testid="operator-attribution-funnel-card"
                >
                  <CardHeader>
                    <CardTitle>{t('marketplace.operator.attributionFunnelTitle')}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    {attributionSummaryLoading ? (
                      <p
                        className="text-muted-foreground"
                        data-testid="operator-attribution-summary-loading"
                      >
                        {t('marketplace.operator.attributionSummaryLoading')}
                      </p>
                    ) : attributionSummaryError ? (
                      <div
                        className="rounded-md border border-destructive/30 bg-destructive/5 p-3"
                        data-testid="operator-attribution-summary-error"
                      >
                        <p className="text-xs text-destructive">
                          {t('marketplace.operator.attributionSummaryLoadFailed')}
                        </p>
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-2"
                          onClick={() => void refresh()}
                          disabled={Boolean(working)}
                          data-testid="operator-attribution-summary-retry"
                        >
                          {t('common.retry')}
                        </Button>
                      </div>
                    ) : attributionSummary?.hasData ? (
                      <div className="space-y-3" data-testid="operator-attribution-has-data">
                        {(() => {
                          const summary = attributionSummary;
                          const rows: Array<{
                            key: string;
                            label: string;
                            count: number;
                            rate?: number | null;
                            testId?: string;
                          }> = [
                            {
                              key: 'visits',
                              label: t('marketplace.operator.attributionVisits', {
                                defaultValue: 'Visits',
                              }),
                              count: summary.visits ?? 0,
                            },
                            {
                              key: 'clicks',
                              label: t('marketplace.operator.attributionListingClicks'),
                              count: summary.listingClicks,
                              rate: summary.listingClickRate,
                            },
                            {
                              key: 'handoffs',
                              label: t('marketplace.operator.attributionCheckoutHandoffs'),
                              count: summary.checkoutHandoffs,
                              rate: summary.checkoutHandoffRate,
                            },
                            {
                              key: 'orders',
                              label: t('marketplace.operator.attributionOrders', {
                                defaultValue: 'Attributed orders',
                              }),
                              count: summary.orders ?? 0,
                              testId: 'operator-attribution-orders',
                            },
                          ];
                          const maxCount = Math.max(1, ...rows.map(row => row.count));
                          return rows.map(row => (
                            <div key={row.key} data-testid={`operator-attribution-row-${row.key}`}>
                              <div className="flex items-baseline justify-between gap-4">
                                <span className="text-muted-foreground">{row.label}</span>
                                <span className="tabular-nums">
                                  <span data-testid={row.testId}>{row.count}</span>
                                  {row.rate !== undefined ? (
                                    <span className="ml-2 text-xs text-muted-foreground">
                                      {row.rate == null ? '—' : `${(row.rate * 100).toFixed(1)}%`}
                                    </span>
                                  ) : null}
                                </span>
                              </div>
                              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                                <div
                                  className="h-full rounded-full bg-primary/70"
                                  style={{
                                    width:
                                      row.count > 0
                                        ? `${Math.max(3, (row.count / maxCount) * 100)}%`
                                        : '0%',
                                  }}
                                />
                              </div>
                            </div>
                          ));
                        })()}
                        {attributionSummary.sources && attributionSummary.sources.length > 0 ? (
                          <div
                            className="overflow-x-auto pt-2"
                            data-testid="operator-attribution-sources"
                          >
                            <p className="mb-1 text-xs text-muted-foreground">
                              {t('marketplace.operator.attributionSourcesTitle', {
                                defaultValue: 'By share source',
                              })}
                            </p>
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="text-left text-muted-foreground">
                                  <th className="py-1 pr-2 font-normal">
                                    {t('marketplace.operator.attributionSource', {
                                      defaultValue: 'Source',
                                    })}
                                  </th>
                                  <th className="py-1 pr-2 font-normal">
                                    {t('marketplace.operator.attributionVisits', {
                                      defaultValue: 'Visits',
                                    })}
                                  </th>
                                  <th className="py-1 pr-2 font-normal">
                                    {t('marketplace.operator.attributionCheckoutHandoffs')}
                                  </th>
                                  <th className="py-1 font-normal">
                                    {t('marketplace.operator.attributionOrders', {
                                      defaultValue: 'Attributed orders',
                                    })}
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {attributionSummary.sources.map(source => (
                                  <tr
                                    key={`${source.source}|${source.medium ?? ''}|${source.campaign ?? ''}`}
                                    className="border-t border-border"
                                  >
                                    <td className="py-1 pr-2">
                                      {source.source ||
                                        t('marketplace.operator.attributionSourceDirect', {
                                          defaultValue: 'direct',
                                        })}
                                      {source.campaign ? (
                                        <span className="text-muted-foreground">
                                          {' '}
                                          · {source.campaign}
                                        </span>
                                      ) : null}
                                    </td>
                                    <td className="py-1 pr-2 tabular-nums">
                                      {source.visits ?? source.impressions}
                                    </td>
                                    <td className="py-1 pr-2 tabular-nums">
                                      {source.checkoutHandoffs}
                                    </td>
                                    <td className="py-1 tabular-nums">{source.orders}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : null}
                      </div>
                    ) : attributionSummary?.hasData === false ? (
                      <p
                        className="text-muted-foreground"
                        data-testid="operator-attribution-no-data"
                      >
                        {t('marketplace.operator.attributionNoData')}
                      </p>
                    ) : null}
                    <p
                      className="text-xs text-muted-foreground"
                      data-testid="operator-attribution-note"
                    >
                      {t('marketplace.operator.attributionCheckoutMeaning')}
                    </p>
                  </CardContent>
                </Card>
              ) : null}

              {canViewAttribution ? (
                <div id="operator-earnings-anchor" className="scroll-mt-24">
                  <OperatorEarningsCard
                    marketplaceId={marketplace.id}
                    commissionBps={marketplace.operatorCommissionBps ?? 0}
                  />
                </div>
              ) : null}

              {/* Read-once knowledge, collapsed by default — it should never
                  outrank live business data in the visual hierarchy. */}
              <details
                className="mt-6 rounded-lg border border-border px-4 py-3"
                data-testid="operator-responsibility-boundary"
              >
                <summary className="cursor-pointer text-sm font-medium">
                  {t('marketplace.operator.responsibilityBoundary')}
                </summary>
                <p className="mt-2 text-sm text-muted-foreground">
                  {t('marketplace.operator.responsibilityDesc')}
                </p>
              </details>
            </TabsContent>

            {canCurate ? (
              <TabsContent
                value="curation"
                className="mt-6"
                data-testid="operator-tab-content-curation"
              >
                <OperatorMarketplaceCurationPanel
                  items={curationItems}
                  candidates={curationCandidates}
                  loading={curationLoading}
                  candidatesLoading={curationCandidatesLoading}
                  error={curationError}
                  working={working}
                  isReadOnly={Boolean(curationReadOnly)}
                  onRetry={refresh}
                  onAdd={handleAddCurationItem}
                  onReorder={handleReorderCurationByKind}
                  onToggle={handleToggleCurationItem}
                  onRemove={handleRemoveCurationItem}
                  onLoadCandidates={handleLoadCurationCandidates}
                />
              </TabsContent>
            ) : null}

            <TabsContent
              value="sellers"
              className="mt-6"
              data-testid="operator-tab-content-sellers"
            >
              {/* Recruiting leads the tab (the counts live in the review
                  filters below — a separate counters card was redundant). */}
              {!isArchived ? <OperatorInviteLinkPanel marketplaceId={marketplace.id} /> : null}

              {!isArchived ? (
                <Card className="mt-6" data-testid="operator-invite-store-card">
                  <CardHeader>
                    <CardTitle>{t('marketplace.operator.inviteStore')}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      {t('marketplace.operator.inviteStoreHint')}{' '}
                      {t('marketplace.operator.inviteNotApproval')}
                    </p>
                    {!sellerIdMode ? (
                      <>
                        <div className="flex flex-col gap-3 sm:flex-row">
                          <Input
                            value={inviteQuery}
                            onChange={event => {
                              setInviteQuery(event.target.value);
                              setSelectedCandidate(null);
                            }}
                            placeholder={t('marketplace.operator.inviteQueryPlaceholder')}
                            data-testid="operator-invite-query"
                          />
                          <Button
                            onClick={() => void handleInvite()}
                            disabled={!selectedCandidate || Boolean(working) || resolveLoading}
                            data-testid="operator-invite-send"
                          >
                            {resolveLoading ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Send className="mr-2 h-4 w-4" />
                            )}
                            {selectedCandidate
                              ? t('marketplace.operator.inviteConfirm')
                              : t('marketplace.operator.sendInvite')}
                          </Button>
                        </div>
                        {resolveLoading ? (
                          <p className="text-sm text-muted-foreground">
                            {t('marketplace.operator.inviteResolving')}
                          </p>
                        ) : null}
                        {resolveUnavailable ? (
                          <div
                            className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-sm"
                            data-testid="operator-invite-search-unavailable"
                          >
                            <p className="font-medium">
                              {t('marketplace.operator.inviteSearchUnavailable')}
                            </p>
                            <p className="mt-1 text-muted-foreground">
                              {t('marketplace.operator.inviteSearchUnavailableHint')}
                            </p>
                          </div>
                        ) : null}
                        {resolveEmpty && !resolveUnavailable && !resolveLoading ? (
                          <div
                            className="rounded-md border border-border bg-muted/40 p-3 text-sm"
                            data-testid="operator-invite-no-matches"
                          >
                            <p className="font-medium">
                              {t('marketplace.operator.inviteNoMatches')}
                            </p>
                            <p className="mt-1 text-muted-foreground">
                              {t('marketplace.operator.inviteNoMatchesHint')}
                            </p>
                          </div>
                        ) : null}
                        {resolveCandidates.length > 0 ? (
                          <div className="space-y-2" data-testid="operator-invite-candidates">
                            <p className="text-xs text-muted-foreground">
                              {t('marketplace.operator.invitePickCandidate')}
                            </p>
                            {resolveCandidates.map(candidate => {
                              const selected = selectedCandidate?.peerID === candidate.peerID;
                              const displayName = formatUserName(
                                {
                                  name: candidate.name || candidate.handle,
                                  peerID: candidate.peerID,
                                },
                                {
                                  fallback: t('marketplace.operator.storeNamePrefix'),
                                  prefix: 'Store',
                                }
                              );
                              const avatarUrl = resolveSellerCandidateAvatarUrl(candidate);
                              return (
                                <button
                                  key={candidate.peerID}
                                  type="button"
                                  onClick={() => setSelectedCandidate(candidate)}
                                  className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                                    selected
                                      ? 'border-primary bg-primary/5'
                                      : 'border-border hover:border-primary/40'
                                  }`}
                                  data-testid={`operator-invite-candidate-${candidate.peerID}`}
                                  aria-pressed={selected}
                                >
                                  <Avatar className="h-10 w-10">
                                    {avatarUrl ? (
                                      <AvatarImage src={avatarUrl} alt={displayName} />
                                    ) : null}
                                    <AvatarFallback>
                                      {displayName.slice(0, 1).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate font-medium text-foreground">
                                      {displayName}
                                    </p>
                                    {candidate.handle ? (
                                      <p className="truncate text-xs text-muted-foreground">
                                        @{candidate.handle}
                                      </p>
                                    ) : (
                                      <p className="truncate text-xs text-muted-foreground">
                                        {formatUserName(
                                          { peerID: candidate.peerID },
                                          { prefix: 'Store' }
                                        )}
                                      </p>
                                    )}
                                  </div>
                                  {selected ? <Check className="h-4 w-4 text-primary" /> : null}
                                </button>
                              );
                            })}
                          </div>
                        ) : null}
                      </>
                    ) : (
                      <div className="flex flex-col gap-3 sm:flex-row">
                        <Input
                          value={sellerIdInput}
                          onChange={event => setSellerIdInput(event.target.value)}
                          placeholder={t('marketplace.operator.sellerIdPlaceholder')}
                          data-testid="operator-invite-seller-id"
                        />
                        <Button
                          onClick={() => void handleInvite()}
                          disabled={!sellerIdInput.trim() || Boolean(working)}
                          data-testid="operator-invite-send-seller-id"
                        >
                          <Send className="mr-2 h-4 w-4" />
                          {t('marketplace.operator.sendInvite')}
                        </Button>
                      </div>
                    )}
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        setSellerIdMode(prev => !prev);
                        setSelectedCandidate(null);
                        setResolveCandidates(NO_CANDIDATES);
                        setResolveEmpty(false);
                        setResolveUnavailable(false);
                      }}
                      data-testid="operator-invite-advanced-toggle"
                    >
                      <ChevronDown
                        className={`h-3.5 w-3.5 transition-transform ${sellerIdMode ? 'rotate-180' : ''}`}
                      />
                      {t('marketplace.operator.sellerIdAdvanced')}
                    </button>
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
                  {canReviewSellers && reviewEventsError ? (
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
                        canReviewSellers &&
                        !isArchived &&
                        (store.status === 'accepted' || store.status === 'applied');
                      const canReject =
                        canReviewSellers &&
                        !isArchived &&
                        (store.status === 'accepted' || store.status === 'applied');
                      const canSuspend =
                        canReviewSellers && !isArchived && store.status === 'approved';
                      const canResumeSeller =
                        canReviewSellers && !isArchived && store.status === 'suspended';
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
                            <div className="flex items-center gap-2 text-sm font-medium">
                              <Avatar className="h-7 w-7">
                                {storeProfiles[store.peerID]?.avatarUrl ? (
                                  <AvatarImage
                                    src={storeProfiles[store.peerID]!.avatarUrl}
                                    alt=""
                                  />
                                ) : null}
                                <AvatarFallback className="text-xs">
                                  {(storeProfiles[store.peerID]?.displayName || 'S')
                                    .slice(0, 1)
                                    .toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span>
                                {storeProfiles[store.peerID]?.displayName?.trim() ||
                                  formatUserName(
                                    { peerID: store.peerID },
                                    { prefix: t('marketplace.operator.storeNamePrefix') }
                                  )}
                              </span>
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
                                  {t('marketplace.operator.appliedAt', {
                                    date: formatDate(appliedAt),
                                  })}
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
                            {canReviewSellers ? (
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
                                              MARKETPLACE_MEMBERSHIP_STATUS_KEYS[
                                                event.previousStatus
                                              ]
                                            ),
                                            current: t(
                                              MARKETPLACE_MEMBERSHIP_STATUS_KEYS[event.status]
                                            ),
                                          })}
                                        </p>
                                        <p className="mt-1 text-muted-foreground">
                                          {t('marketplace.operator.reviewHistoryBy', {
                                            actor: formatUserName(
                                              { peerID: event.actorID },
                                              {
                                                fallback: t(
                                                  'marketplace.operator.reviewActorFallback'
                                                ),
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
                            ) : null}
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
                            {canResumeSeller ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => void handleReview(store, 'approved')}
                                disabled={Boolean(working)}
                                data-testid={`operator-resume-seller-${store.peerID}`}
                              >
                                {t('marketplace.operator.resumeSeller')}
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent
              value="settings"
              className="mt-6"
              data-testid="operator-tab-content-settings"
            >
              <OperatorMarketplaceSettingsCard
                key={marketplace.id}
                marketplace={marketplace}
                working={working}
                onSave={handleSaveSettings}
                onVerifyCustomDomain={handleVerifyCustomDomain}
                onArchive={handleArchive}
                customDomainsEnabled={canManageCustomDomains}
              />

              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>{t('marketplace.operator.publishAndDomains')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <p>
                    {t('marketplace.operator.buyerAccessMode')}:{' '}
                    {t(MARKETPLACE_BUYER_ACCESS_MODE_KEYS[marketplace.buyerAccessMode])}
                  </p>
                  <p>
                    {t('marketplace.operator.discoverability')}:{' '}
                    {t(MARKETPLACE_DISCOVERABILITY_KEYS[marketplace.discoverability])}
                  </p>
                  <p>
                    {t('marketplace.operator.catalogMode')}:{' '}
                    {t(MARKETPLACE_CATALOG_MODE_KEYS[marketplace.catalogMode])}
                  </p>
                  <p>
                    {t('marketplace.operator.sellerEntryMode')}:{' '}
                    {t(MARKETPLACE_SELLER_ENTRY_MODE_KEYS[marketplace.sellerEntryMode])}
                  </p>
                  <p>
                    {t('marketplace.operator.sellerReviewMode')}:{' '}
                    {t(MARKETPLACE_SELLER_REVIEW_MODE_KEYS[marketplace.sellerReviewMode])}
                  </p>
                  {marketplace.domains.map(domain => (
                    <div key={domain.host} className="rounded-md border p-3">
                      <div className="font-medium">{domain.host}</div>
                      <div className="mt-1 text-muted-foreground">
                        {t(MARKETPLACE_DOMAIN_KIND_KEYS[domain.kind])} ·{' '}
                        {t(MARKETPLACE_DOMAIN_VERIFICATION_KEYS[domain.verificationStatus])}
                      </div>
                      {domain.verificationStatus === 'verified' && domain.verifiedAt ? (
                        <div className="mt-1 text-muted-foreground">
                          {t('marketplace.operator.customDomainVerifiedAt', {
                            date: formatDate(domain.verifiedAt),
                          })}
                        </div>
                      ) : null}
                    </div>
                  ))}
                  {showLaunchChecklist ? (
                    <div
                      className="space-y-2 rounded-md border border-border bg-muted/30 p-3"
                      data-testid="operator-launch-checklist"
                    >
                      <p className="font-medium text-foreground">
                        {t('marketplace.operator.launchChecklistTitle')}
                      </p>
                      <p className="text-muted-foreground">
                        {hasVerifiedDomain
                          ? t('marketplace.operator.launchChecklistDomainReady')
                          : t('marketplace.operator.launchChecklistDomainMissing')}
                      </p>
                      <p className="text-muted-foreground">
                        {requiresApprovedVisibleSeller
                          ? hasApprovedVisibleSeller
                            ? t('marketplace.operator.launchChecklistSellerReady')
                            : t('marketplace.operator.launchChecklistSellerMissing')
                          : hasApprovedVisibleSeller
                            ? t('marketplace.operator.launchChecklistSellerReady')
                            : t('marketplace.operator.launchChecklistSellerSelfServe')}
                      </p>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
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
