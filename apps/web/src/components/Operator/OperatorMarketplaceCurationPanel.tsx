// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

'use client';

import { type FormEvent, type ReactNode, useMemo, useState } from 'react';
import {
  buildProductHref,
  formatListingSlugTitle,
  formatUserName,
  type MarketplaceCurationCandidates,
  type MarketplaceCurationCandidatesParams,
  type MarketplaceCurationItem,
  type MarketplaceCurationKind,
  type PublicMarketplaceListingRef,
  useCommunityMarketplaceEnrichment,
  useI18n,
} from '@mobazha/core';
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Loader2,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface OperatorMarketplaceCurationPanelProps {
  items: MarketplaceCurationItem[];
  candidates: MarketplaceCurationCandidates | null;
  loading: boolean;
  candidatesLoading?: boolean;
  error: string | null;
  working: string | null;
  isReadOnly: boolean;
  onRetry: () => Promise<void> | void;
  onAdd: (
    kind: MarketplaceCurationKind,
    payload: { peerID?: string; listingSlug?: string }
  ) => Promise<boolean | void> | boolean | void;
  onReorder: (kind: MarketplaceCurationKind, itemIDs: number[]) => Promise<void> | void;
  onToggle: (itemID: number, isActive: boolean) => Promise<void> | void;
  onRemove: (itemID: number) => Promise<void> | void;
  onLoadCandidates?: (
    params: MarketplaceCurationCandidatesParams
  ) => Promise<boolean | void> | boolean | void;
}

interface ListingCandidateOption {
  key: string;
  peerID: string;
  slug: string;
  title: string;
}

function listingKey(input: { peerID?: string; listingSlug?: string }): string {
  return `${input.peerID ?? ''}::${input.listingSlug ?? ''}`;
}

function listBySortOrder<T extends { sortOrder: number; id: number }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.id - b.id;
  });
}

function abbreviatePeerID(peerID: string): string {
  if (peerID.length <= 18) return peerID;
  return `${peerID.slice(0, 8)}…${peerID.slice(-6)}`;
}

export function OperatorMarketplaceCurationPanel({
  items,
  candidates,
  loading,
  candidatesLoading = false,
  error,
  working,
  isReadOnly,
  onRetry,
  onAdd,
  onReorder,
  onToggle,
  onRemove,
  onLoadCandidates = () => undefined,
}: OperatorMarketplaceCurationPanelProps) {
  const { t } = useI18n();
  const [selectedListingKey, setSelectedListingKey] = useState('');
  const [selectedSellerPeerID, setSelectedSellerPeerID] = useState('');
  const [selectedBannerKey, setSelectedBannerKey] = useState('');
  const serverCandidateQuery = candidates?.query ?? '';
  const [candidateQueryDraft, setCandidateQueryDraft] = useState({
    source: serverCandidateQuery,
    value: serverCandidateQuery,
  });
  const candidateQuery =
    candidateQueryDraft.source === serverCandidateQuery
      ? candidateQueryDraft.value
      : serverCandidateQuery;
  const actionLocked = isReadOnly || Boolean(working);
  const candidateActionLocked = actionLocked || candidatesLoading;

  const itemsByKind = useMemo(() => {
    return {
      listing: listBySortOrder(items.filter(item => item.kind === 'listing')),
      seller: listBySortOrder(items.filter(item => item.kind === 'seller')),
      banner: listBySortOrder(items.filter(item => item.kind === 'banner')),
    };
  }, [items]);

  const existingListingKeys = useMemo(
    () => new Set(itemsByKind.listing.map(item => listingKey(item))),
    [itemsByKind.listing]
  );
  const existingBannerKeys = useMemo(
    () => new Set(itemsByKind.banner.map(item => listingKey(item))),
    [itemsByKind.banner]
  );
  const existingSellerPeers = useMemo(
    () => new Set(itemsByKind.seller.map(item => item.peerID).filter(Boolean)),
    [itemsByKind.seller]
  );

  const enrichmentListingRefs = useMemo<PublicMarketplaceListingRef[]>(() => {
    const refs = new Map<string, PublicMarketplaceListingRef>();
    for (const candidate of candidates?.listings ?? []) {
      if (!candidate.peerID || !candidate.slug) continue;
      refs.set(listingKey({ peerID: candidate.peerID, listingSlug: candidate.slug }), {
        peerID: candidate.peerID,
        slug: candidate.slug,
      });
    }
    for (const item of items) {
      if (item.kind === 'seller' || !item.peerID || !item.listingSlug) continue;
      refs.set(listingKey(item), { peerID: item.peerID, slug: item.listingSlug });
    }
    return [...refs.values()];
  }, [candidates?.listings, items]);

  const enrichmentSellerPeerIDs = useMemo(() => {
    const peerIDs = new Set<string>();
    for (const candidate of candidates?.sellers ?? []) {
      if (candidate.peerID) peerIDs.add(candidate.peerID);
    }
    for (const item of itemsByKind.seller) {
      if (item.peerID) peerIDs.add(item.peerID);
    }
    return [...peerIDs];
  }, [candidates?.sellers, itemsByKind.seller]);

  const { listingPreviews, sellerProfiles } = useCommunityMarketplaceEnrichment(
    enrichmentListingRefs,
    enrichmentSellerPeerIDs
  );

  const enrichedListingLookup = useMemo(() => {
    const lookup = new Map<string, (typeof listingPreviews)[number]>();
    for (const preview of listingPreviews) {
      if (!preview.failed) {
        lookup.set(listingKey({ peerID: preview.peerID, listingSlug: preview.slug }), preview);
      }
    }
    return lookup;
  }, [listingPreviews]);

  const listingCandidates = useMemo<ListingCandidateOption[]>(() => {
    if (!candidates) return [];
    return candidates.listings
      .filter(candidate => candidate.slug && candidate.peerID)
      .map(candidate => ({
        key: listingKey({ peerID: candidate.peerID, listingSlug: candidate.slug }),
        peerID: candidate.peerID as string,
        slug: candidate.slug,
        title:
          enrichedListingLookup
            .get(listingKey({ peerID: candidate.peerID, listingSlug: candidate.slug }))
            ?.title?.trim() ||
          candidate.title?.trim() ||
          formatListingSlugTitle(candidate.slug) ||
          candidate.vendorName?.trim() ||
          t('marketplace.operator.curation.listingFallbackTitle'),
      }));
  }, [candidates, enrichedListingLookup, t]);

  const availableListingCandidates = useMemo(
    () => listingCandidates.filter(candidate => !existingListingKeys.has(candidate.key)),
    [existingListingKeys, listingCandidates]
  );
  const availableBannerCandidates = useMemo(
    () => listingCandidates.filter(candidate => !existingBannerKeys.has(candidate.key)),
    [existingBannerKeys, listingCandidates]
  );
  const availableSellerCandidates = useMemo(
    () =>
      (candidates?.sellers ?? []).filter(
        candidate => candidate.peerID && !existingSellerPeers.has(candidate.peerID)
      ),
    [candidates?.sellers, existingSellerPeers]
  );

  const listingLookup = useMemo(() => {
    const lookup = new Map<string, ListingCandidateOption>();
    for (const candidate of listingCandidates) lookup.set(candidate.key, candidate);
    return lookup;
  }, [listingCandidates]);

  function sellerDisplayName(peerID: string): string {
    const profileName = sellerProfiles[peerID]?.displayName?.trim();
    return (
      profileName ||
      formatUserName(
        { peerID },
        {
          fallback: t('marketplace.operator.curation.sellerFallbackTitle'),
          prefix: t('marketplace.operator.storeNamePrefix'),
        }
      )
    );
  }

  async function handleCandidateSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (candidateActionLocked) return;
    await onLoadCandidates({
      q: candidateQuery.trim() || undefined,
      page: 1,
      pageSize: candidates?.pageSize || 20,
    });
  }

  async function handleCandidatePage(page: number) {
    if (candidateActionLocked || page < 1 || page > (candidates?.totalPage || 1)) return;
    await onLoadCandidates({
      q: candidates?.query || undefined,
      page,
      pageSize: candidates?.pageSize || 20,
    });
  }

  async function handleAdd(kind: MarketplaceCurationKind) {
    if (actionLocked) return;
    if (kind === 'seller') {
      if (!selectedSellerPeerID) return;
      const result = await onAdd('seller', { peerID: selectedSellerPeerID });
      if (result !== false) setSelectedSellerPeerID('');
      return;
    }
    const selectedKey = kind === 'listing' ? selectedListingKey : selectedBannerKey;
    if (!selectedKey) return;
    const selectedCandidate = listingLookup.get(selectedKey);
    if (!selectedCandidate) return;
    const result = await onAdd(kind, {
      peerID: selectedCandidate.peerID,
      listingSlug: selectedCandidate.slug,
    });
    if (kind === 'listing' && result !== false) setSelectedListingKey('');
    if (kind === 'banner' && result !== false) setSelectedBannerKey('');
  }

  async function handleMove(kind: MarketplaceCurationKind, index: number, direction: -1 | 1) {
    if (actionLocked) return;
    const rows = itemsByKind[kind];
    const target = index + direction;
    if (target < 0 || target >= rows.length) return;
    const reordered = [...rows];
    const [moving] = reordered.splice(index, 1);
    reordered.splice(target, 0, moving);
    await onReorder(
      kind,
      reordered.map(item => item.id)
    );
  }

  function renderRow(item: MarketplaceCurationItem, index: number, kind: MarketplaceCurationKind) {
    const listingMeta = listingLookup.get(listingKey(item));
    const enrichedListing = enrichedListingLookup.get(listingKey(item));
    const listingTitle =
      enrichedListing?.title?.trim() ||
      listingMeta?.title ||
      formatListingSlugTitle(item.listingSlug || '') ||
      t('marketplace.operator.curation.listingFallbackTitle');
    const secondary = [item.peerID, item.listingSlug].filter(Boolean).join(' / ');
    const sellerPrimary = item.peerID
      ? sellerDisplayName(item.peerID)
      : t('marketplace.operator.curation.sellerFallbackTitle');
    const previewHref =
      kind === 'seller'
        ? item.peerID
          ? `/store/${encodeURIComponent(item.peerID)}`
          : null
        : item.peerID && item.listingSlug
          ? buildProductHref(item.listingSlug, item.peerID, { includePeerID: true })
          : null;

    return (
      <div
        key={item.id}
        className="rounded-lg border border-border/80 p-3"
        data-testid={`operator-curation-item-${kind}-${item.id}`}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">
              {kind === 'seller' ? sellerPrimary : listingTitle}
            </p>
            <p className="text-xs text-muted-foreground">
              {kind === 'seller'
                ? item.peerID || t('marketplace.operator.curation.sellerFallbackTitle')
                : secondary || t('marketplace.operator.curation.missingIdentifier')}
            </p>
            <Badge variant={item.isActive ? 'default' : 'secondary'}>
              {item.isActive
                ? t('marketplace.operator.curation.statusActive')
                : t('marketplace.operator.curation.statusInactive')}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="icon"
              variant="outline"
              onClick={() => void handleMove(kind, index, -1)}
              disabled={actionLocked || index === 0}
              aria-label={t('marketplace.operator.curation.moveUpAria')}
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="outline"
              onClick={() => void handleMove(kind, index, 1)}
              disabled={actionLocked || index === itemsByKind[kind].length - 1}
              aria-label={t('marketplace.operator.curation.moveDownAria')}
            >
              <ArrowDown className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void onToggle(item.id, !item.isActive)}
              disabled={actionLocked}
            >
              {item.isActive
                ? t('marketplace.operator.curation.deactivate')
                : t('marketplace.operator.curation.activate')}
            </Button>
            {previewHref ? (
              <Button size="sm" variant="outline" asChild>
                <a href={previewHref} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  {t('marketplace.operator.curation.previewOpen')}
                </a>
              </Button>
            ) : null}
            <Button
              size="icon"
              variant="outline"
              onClick={() => void onRemove(item.id)}
              disabled={actionLocked}
              aria-label={t('marketplace.operator.curation.removeAria')}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  function renderSection(
    kind: MarketplaceCurationKind,
    titleKey: string,
    descriptionKey: string,
    candidateCount: number,
    addDisabled: boolean,
    addControl: ReactNode,
    rows: MarketplaceCurationItem[]
  ) {
    return (
      <section className="space-y-3" data-testid={`operator-curation-section-${kind}`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-foreground">{t(titleKey)}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{t(descriptionKey)}</p>
          </div>
          <Badge variant="outline">
            {t('marketplace.operator.curation.candidateCount', { count: candidateCount })}
          </Badge>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {addControl}
          <Button
            size="sm"
            onClick={() => void handleAdd(kind)}
            disabled={addDisabled}
            data-testid={`operator-curation-add-${kind}`}
          >
            <Plus className="mr-2 h-4 w-4" />
            {t('marketplace.operator.curation.add')}
          </Button>
        </div>
        {rows.length === 0 ? (
          <p className="rounded-md border border-dashed border-border/80 p-3 text-sm text-muted-foreground">
            {t('marketplace.operator.curation.empty')}
          </p>
        ) : (
          <div className="space-y-2">{rows.map((item, index) => renderRow(item, index, kind))}</div>
        )}
      </section>
    );
  }

  return (
    <Card className="mt-6" data-testid="operator-curation-panel">
      <CardHeader>
        <CardTitle>{t('marketplace.operator.curation.title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-sm text-muted-foreground">{t('marketplace.operator.curation.intro')}</p>
        {isReadOnly ? (
          <p className="text-sm text-muted-foreground">
            {t('marketplace.operator.readOnlyArchived')}
          </p>
        ) : null}
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t('marketplace.operator.curation.loading')}
          </div>
        ) : error ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
            <p className="text-sm text-destructive">
              {t('marketplace.operator.curation.loadFailed')}
            </p>
            <Button size="sm" variant="outline" className="mt-2" onClick={() => void onRetry()}>
              {t('common.retry')}
            </Button>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="rounded-lg border border-border/80 p-4">
              <form
                className="flex flex-col gap-2 sm:flex-row sm:items-center"
                onSubmit={event => void handleCandidateSearch(event)}
              >
                <label className="sr-only" htmlFor="operator-curation-candidate-search">
                  {t('marketplace.operator.curation.searchCandidates')}
                </label>
                <input
                  id="operator-curation-candidate-search"
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm sm:max-w-md"
                  value={candidateQuery}
                  onChange={event =>
                    setCandidateQueryDraft({
                      source: serverCandidateQuery,
                      value: event.target.value,
                    })
                  }
                  placeholder={t('marketplace.operator.curation.searchCandidatesPlaceholder')}
                  disabled={candidateActionLocked}
                  data-testid="operator-curation-candidate-search"
                />
                <Button
                  type="submit"
                  size="sm"
                  variant="outline"
                  disabled={candidateActionLocked}
                  data-testid="operator-curation-candidate-search-submit"
                >
                  {candidatesLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="mr-2 h-4 w-4" />
                  )}
                  {t('marketplace.operator.curation.search')}
                </Button>
              </form>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
                <span data-testid="operator-curation-candidate-page-status">
                  {t('marketplace.operator.curation.pageStatus', {
                    page: candidates?.page || 1,
                    totalPage: candidates?.totalPage || 1,
                    total: candidates?.total || 0,
                  })}
                </span>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => void handleCandidatePage((candidates?.page || 1) - 1)}
                    disabled={candidateActionLocked || (candidates?.page || 1) <= 1}
                    aria-label={t('marketplace.operator.curation.previousPage')}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => void handleCandidatePage((candidates?.page || 1) + 1)}
                    disabled={
                      candidateActionLocked ||
                      (candidates?.page || 1) >= (candidates?.totalPage || 1)
                    }
                    aria-label={t('marketplace.operator.curation.nextPage')}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
            {renderSection(
              'listing',
              'marketplace.operator.curation.sections.listings',
              'marketplace.operator.curation.sections.listingsDesc',
              availableListingCandidates.length,
              candidateActionLocked ||
                availableListingCandidates.length === 0 ||
                !selectedListingKey,
              <select
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm sm:max-w-md"
                value={selectedListingKey}
                onChange={event => setSelectedListingKey(event.target.value)}
                disabled={candidateActionLocked || availableListingCandidates.length === 0}
                data-testid="operator-curation-select-listing"
              >
                <option value="">{t('marketplace.operator.curation.selectListing')}</option>
                {availableListingCandidates.map(candidate => (
                  <option key={candidate.key} value={candidate.key}>
                    {candidate.title} ({candidate.peerID} / {candidate.slug})
                  </option>
                ))}
              </select>,
              itemsByKind.listing
            )}
            {renderSection(
              'seller',
              'marketplace.operator.curation.sections.sellers',
              'marketplace.operator.curation.sections.sellersDesc',
              availableSellerCandidates.length,
              candidateActionLocked ||
                availableSellerCandidates.length === 0 ||
                !selectedSellerPeerID,
              <select
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm sm:max-w-md"
                value={selectedSellerPeerID}
                onChange={event => setSelectedSellerPeerID(event.target.value)}
                disabled={candidateActionLocked || availableSellerCandidates.length === 0}
                data-testid="operator-curation-select-seller"
              >
                <option value="">{t('marketplace.operator.curation.selectSeller')}</option>
                {availableSellerCandidates.map(candidate => (
                  <option key={candidate.peerID} value={candidate.peerID}>
                    {sellerDisplayName(candidate.peerID)} ({abbreviatePeerID(candidate.peerID)})
                  </option>
                ))}
              </select>,
              itemsByKind.seller
            )}
            {renderSection(
              'banner',
              'marketplace.operator.curation.sections.banners',
              'marketplace.operator.curation.sections.bannersDesc',
              availableBannerCandidates.length,
              candidateActionLocked || availableBannerCandidates.length === 0 || !selectedBannerKey,
              <select
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm sm:max-w-md"
                value={selectedBannerKey}
                onChange={event => setSelectedBannerKey(event.target.value)}
                disabled={candidateActionLocked || availableBannerCandidates.length === 0}
                data-testid="operator-curation-select-banner"
              >
                <option value="">{t('marketplace.operator.curation.selectBanner')}</option>
                {availableBannerCandidates.map(candidate => (
                  <option key={candidate.key} value={candidate.key}>
                    {candidate.title} ({candidate.peerID} / {candidate.slug})
                  </option>
                ))}
              </select>,
              itemsByKind.banner
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
