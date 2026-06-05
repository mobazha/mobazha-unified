'use client';

import React, { useMemo, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Container, VStack } from '@/components/layouts';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input-compat';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useToast,
} from '@/components/ui';
import {
  useI18n,
  useModeratorDirectory,
  useStoreModerators,
  useModeratorPeerLookup,
  useModeratorDetail,
  useVerifiedModerators,
} from '@mobazha/core';
import type { Moderator as ApiModerator } from '@mobazha/core/services/api/moderators';
import {
  ADDED_TO_STORE_BADGE_CLASS,
  mapApiModeratorToModerator,
} from '@/components/Moderators/moderatorDisplay';
import { ModeratorProfilePreview } from '@/components/Moderators/ModeratorProfilePreview';
import { ModeratorExpandableRow } from '@/components/Moderators/ModeratorExpandableRow';
import {
  Search,
  CheckCircle,
  Filter,
  Loader2,
  RefreshCw,
  Plus,
  Check,
  ChevronRight,
} from 'lucide-react';

import { MODERATOR_ROUTES, moderatorDetailHref } from '@/lib/routes/moderators';
import { cn } from '@/lib/utils';

function mapFeePercent(mod: ApiModerator): number {
  return mod.fee?.percentage ?? 0;
}

export interface ModeratorDirectoryViewProps {
  forceAddToStore?: boolean;
  returnToOverride?: string;
  detailHrefForModerator?: (peerID: string, returnTo: string) => string;
}

export function ModeratorDirectoryView({
  forceAddToStore = false,
  returnToOverride,
  detailHrefForModerator,
}: ModeratorDirectoryViewProps = {}) {
  const { t } = useI18n();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const intent = searchParams.get('intent');
  const returnTo =
    returnToOverride || searchParams.get('returnTo') || MODERATOR_ROUTES.storeSettings;
  const showAddToStore = forceAddToStore || intent === 'add-to-store';

  const { moderators, isLoading, error, refresh, isFetching } = useModeratorDirectory();
  const { verifiedModerators } = useVerifiedModerators();
  const verifiedPeerIds = useMemo(() => new Set(verifiedModerators), [verifiedModerators]);
  const { moderators: storeModerators, addModerator, isSaving } = useStoreModerators();
  const storePeerIds = useMemo(
    () => new Set(storeModerators.map(m => m.peerID)),
    [storeModerators]
  );

  const [directorySearch, setDirectorySearch] = useState('');
  const [peerIdInput, setPeerIdInput] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('all');
  const [maxFee, setMaxFee] = useState<string>('all');
  const [verifiedOnly, setVerifiedOnly] = useState(true);
  const [sortBy, setSortBy] = useState<'rating' | 'fee'>('rating');
  const [activeMode, setActiveMode] = useState<'directory' | 'custom'>('directory');
  const [addingPeerID, setAddingPeerID] = useState<string | null>(null);
  const [expandedPeerID, setExpandedPeerID] = useState<string | null>(null);
  const peerIdInputRef = useRef<HTMLInputElement>(null);
  const peerLookup = useModeratorPeerLookup(peerIdInput);
  const lookupResult = peerLookup.moderator;
  const lookupStatus = peerLookup.status;

  const { moderator: expandedDetail, isLoading: isExpandedDetailLoading } = useModeratorDetail(
    expandedPeerID ?? undefined
  );

  const expandedDetailCard = useMemo(
    () => (expandedDetail ? mapApiModeratorToModerator(expandedDetail, verifiedPeerIds) : null),
    [expandedDetail, verifiedPeerIds]
  );

  const allLanguages = useMemo(
    () => Array.from(new Set(moderators.flatMap(m => m.languages || []))).sort(),
    [moderators]
  );

  const catalogEmpty = !isLoading && !error && moderators.length === 0;
  const currentMode = catalogEmpty ? 'custom' : activeMode;
  const showDirectoryFilters = currentMode === 'directory' && !catalogEmpty;
  const showSidebar = showDirectoryFilters;

  const filteredModerators = useMemo(() => {
    const query = directorySearch.trim().toLowerCase();
    const base = moderators.filter(mod => {
      if (query) {
        const haystack = [mod.name, mod.handle, mod.description, mod.shortDescription]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      if (selectedLanguage !== 'all' && !(mod.languages || []).includes(selectedLanguage)) {
        return false;
      }
      if (maxFee !== 'all' && mapFeePercent(mod) > Number(maxFee)) {
        return false;
      }
      if (verifiedOnly && !mod.verified) {
        return false;
      }
      return true;
    });

    return base.sort((a, b) => {
      if (sortBy === 'fee') {
        return mapFeePercent(a) - mapFeePercent(b);
      }
      const ratingDiff = (b.stats?.rating ?? 0) - (a.stats?.rating ?? 0);
      if (ratingDiff !== 0) return ratingDiff;
      return (b.stats?.ratingCount ?? 0) - (a.stats?.ratingCount ?? 0);
    });
  }, [moderators, directorySearch, selectedLanguage, maxFee, verifiedOnly, sortBy]);

  const handleAddToStore = useCallback(
    async (peerID: string) => {
      setAddingPeerID(peerID);
      const result = await addModerator(peerID);
      setAddingPeerID(null);

      if (!result.success) {
        toast({
          title: t('common.error'),
          description:
            result.error === 'Moderator already added'
              ? t('settingsExtended.moderatorAlreadyAdded')
              : result.error === 'Profile is not a moderator'
                ? t('settingsExtended.moderatorNotConfigured')
                : result.error || t('settingsExtended.saveFailed'),
          variant: 'destructive',
        });
        return;
      }

      toast({ title: t('common.success'), description: t('settingsModal.moderatorAdded') });
      if (showAddToStore) {
        router.push(returnTo);
      }
    },
    [addModerator, toast, t, showAddToStore, router, returnTo]
  );

  const clearAllFilters = () => {
    setDirectorySearch('');
    setPeerIdInput('');
    setSelectedLanguage('all');
    setMaxFee('all');
    setVerifiedOnly(true);
    setSortBy('rating');
  };

  const focusPeerIdInput = () => {
    setActiveMode('custom');
    peerIdInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    window.requestAnimationFrame(() => {
      peerIdInputRef.current?.focus();
    });
  };

  const resolveDetailHref = useCallback(
    (peerID: string) =>
      detailHrefForModerator
        ? detailHrefForModerator(peerID, returnTo)
        : moderatorDetailHref(
            peerID,
            showAddToStore ? { intent: 'add-to-store', returnTo } : undefined
          ),
    [detailHrefForModerator, returnTo, showAddToStore]
  );

  const customLookupPanel = (
    <Card className="border border-border/70 bg-surface/40 p-5">
      <div className="flex max-w-2xl flex-col gap-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            {t('moderator.customLookupTitle')}
          </h3>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {t('moderator.customLookupHint')}
          </p>
        </div>

        <div>
          <label className="sr-only">{t('moderator.customPeerIdLabel')}</label>
          <Input
            ref={peerIdInputRef}
            value={peerIdInput}
            onChange={e => setPeerIdInput(e.target.value)}
            placeholder={t('moderator.customPeerIdPlaceholder')}
            className="font-mono text-sm"
          />
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            {t('moderator.customLookupReady')}
          </p>
        </div>

        {!peerIdInput.trim() ? null : lookupStatus === 'truncated' ? (
          <p className="text-sm leading-6 text-destructive" role="alert">
            {t('moderator.customLookupNeedFullPeerID')}
          </p>
        ) : lookupStatus === 'loading' ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            {t('moderator.directoryLookupSearching')}
          </div>
        ) : lookupStatus === 'not_found' ? (
          <p className="text-sm leading-6 text-destructive" role="alert">
            {t('moderator.directoryLookupNotFound')}
          </p>
        ) : lookupStatus === 'not_moderator' ? (
          <p className="text-sm leading-6 text-destructive" role="alert">
            {t('moderator.directoryLookupNotModerator')}
          </p>
        ) : lookupResult ? (
          <ModeratorProfilePreview
            moderator={mapApiModeratorToModerator(lookupResult, verifiedPeerIds)}
            actions={
              showAddToStore ? (
                storePeerIds.has(lookupResult.peerID) ? (
                  <Badge
                    variant="outline"
                    className={cn('min-h-[36px] px-3', ADDED_TO_STORE_BADGE_CLASS)}
                  >
                    <Check className="h-4 w-4" aria-hidden />
                    {t('moderator.addedToStore')}
                  </Badge>
                ) : (
                  <Button
                    type="button"
                    className="min-h-[44px]"
                    disabled={isSaving && addingPeerID === lookupResult.peerID}
                    onClick={() => handleAddToStore(lookupResult.peerID)}
                  >
                    {isSaving && addingPeerID === lookupResult.peerID ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    {t('moderator.addToStore')}
                  </Button>
                )
              ) : undefined
            }
          />
        ) : null}
      </div>
    </Card>
  );

  return (
    <Container size="xl">
      <div className={cn('grid grid-cols-1 gap-6', showSidebar && 'lg:grid-cols-4')}>
        {showSidebar && (
          <div className="lg:col-span-1">
            <Card className="sticky top-4 border border-border/60 p-4 shadow-sm">
              <div className="mb-4 flex items-center gap-2 border-b border-border pb-4">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold text-foreground">{t('filter.filters')}</h3>
              </div>

              <VStack gap="lg">
                {showDirectoryFilters && (
                  <div>
                    <label className="mb-2 block text-sm font-medium text-foreground">
                      {t('moderator.searchDirectoryLabel')}
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={directorySearch}
                        onChange={e => setDirectorySearch(e.target.value)}
                        placeholder={t('moderator.searchPlaceholder')}
                        className="pl-9"
                      />
                    </div>
                  </div>
                )}

                {showDirectoryFilters && (
                  <div>
                    <label className="mb-2 block text-sm font-medium text-foreground">
                      {t('moderator.language')}
                    </label>
                    <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('moderator.allLanguages')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('moderator.allLanguages')}</SelectItem>
                        {allLanguages.map(lang => (
                          <SelectItem key={lang} value={lang}>
                            {lang.toUpperCase()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {showDirectoryFilters && (
                  <div>
                    <label className="mb-2 block text-sm font-medium text-foreground">
                      {t('moderator.maxFee')}
                    </label>
                    <Select value={maxFee} onValueChange={setMaxFee}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('moderator.anyFee')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('moderator.anyFee')}</SelectItem>
                        <SelectItem value="0.5">
                          {t('moderator.maxFeeOption', { fee: '0.5' })}
                        </SelectItem>
                        <SelectItem value="1">
                          {t('moderator.maxFeeOption', { fee: '1' })}
                        </SelectItem>
                        <SelectItem value="1.5">
                          {t('moderator.maxFeeOption', { fee: '1.5' })}
                        </SelectItem>
                        <SelectItem value="2">
                          {t('moderator.maxFeeOption', { fee: '2' })}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {showDirectoryFilters && (
                  <label className="group flex min-h-[44px] cursor-pointer items-center gap-3">
                    <input
                      type="checkbox"
                      checked={verifiedOnly}
                      onChange={e => setVerifiedOnly(e.target.checked)}
                      className="sr-only"
                    />
                    <div
                      role="checkbox"
                      aria-checked={verifiedOnly}
                      tabIndex={0}
                      className={`flex h-5 w-5 items-center justify-center rounded border-2 transition-all ${
                        verifiedOnly
                          ? 'border-primary bg-primary'
                          : 'border-muted-foreground/40 group-hover:border-primary/60'
                      }`}
                      onClick={() => setVerifiedOnly(!verifiedOnly)}
                      onKeyDown={e => {
                        if (e.key === ' ' || e.key === 'Enter') {
                          e.preventDefault();
                          setVerifiedOnly(v => !v);
                        }
                      }}
                    >
                      {verifiedOnly && (
                        <CheckCircle className="h-3.5 w-3.5 text-primary-foreground" />
                      )}
                    </div>
                    <span className="text-sm text-foreground">{t('moderator.verifiedOnly')}</span>
                  </label>
                )}

                <Button variant="outline" className="min-h-[44px] w-full" onClick={clearAllFilters}>
                  {t('moderator.resetFilters')}
                </Button>
              </VStack>
            </Card>
          </div>
        )}

        <div className={cn(showSidebar && 'lg:col-span-3')}>
          <div className="mb-4 inline-flex rounded-md border border-border bg-surface/60 p-1">
            <button
              type="button"
              disabled={catalogEmpty}
              className={cn(
                'rounded px-4 py-2 text-sm font-medium transition-colors',
                currentMode === 'directory'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
                catalogEmpty && 'cursor-not-allowed opacity-50 hover:text-muted-foreground'
              )}
              onClick={() => {
                if (!catalogEmpty) setActiveMode('directory');
              }}
            >
              {t('moderator.recommendedDirectoryTitle')}
              {catalogEmpty ? ' 0' : ''}
            </button>
            <button
              type="button"
              className={cn(
                'rounded px-4 py-2 text-sm font-medium transition-colors',
                currentMode === 'custom'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              onClick={focusPeerIdInput}
            >
              {t('moderator.customTabTitle')}
            </button>
          </div>

          {currentMode === 'custom' ? (
            customLookupPanel
          ) : (
            <>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {t('moderator.recommendedDirectoryTitle')}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t('moderator.moderatorsFound', { count: filteredModerators.length })}
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <Select
                    value={sortBy}
                    onValueChange={value => setSortBy(value as 'rating' | 'fee')}
                  >
                    <SelectTrigger className="min-h-[44px] w-[180px]">
                      <SelectValue placeholder={t('moderator.sortBy')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rating">{t('moderator.highestRating')}</SelectItem>
                      <SelectItem value="fee">{t('moderator.lowestFee')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="min-h-[44px] min-w-[44px]"
                    aria-label={t('common.retry')}
                    onClick={() => refresh()}
                    disabled={isFetching}
                  >
                    <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </div>

              {filteredModerators.length > 0 && (
                <p className="mb-3 text-xs text-muted-foreground">
                  {t('moderator.directoryExpandHint')}
                </p>
              )}

              {isLoading ? (
                <div className="flex flex-col items-center py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="mt-3 text-sm text-muted-foreground">
                    {t('payment.loadingModerators')}
                  </p>
                </div>
              ) : error ? (
                <Card className="p-6 text-center">
                  <p className="mb-4 text-sm text-muted-foreground">
                    {t('moderator.directoryError')}
                  </p>
                  <Button variant="outline" onClick={() => refresh()} className="min-h-[44px]">
                    {t('common.retry')}
                  </Button>
                </Card>
              ) : filteredModerators.length === 0 ? (
                <Card className="space-y-3 p-8 text-center">
                  {lookupStatus === 'loading' ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      <p className="text-muted-foreground">
                        {t('moderator.directoryLookupSearching')}
                      </p>
                    </div>
                  ) : lookupStatus === 'truncated' ? (
                    <>
                      <p className="text-muted-foreground">
                        {t('moderator.customLookupNeedFullPeerID')}
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        className="min-h-[44px]"
                        onClick={focusPeerIdInput}
                      >
                        {t('moderator.customLookupAction')}
                      </Button>
                    </>
                  ) : lookupStatus === 'not_found' ? (
                    <>
                      <p className="text-muted-foreground">
                        {t('moderator.directoryLookupNotFound')}
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        className="min-h-[44px]"
                        onClick={focusPeerIdInput}
                      >
                        {t('moderator.customLookupAction')}
                      </Button>
                    </>
                  ) : lookupStatus === 'not_moderator' ? (
                    <p className="text-muted-foreground">
                      {t('moderator.directoryLookupNotModerator')}
                    </p>
                  ) : catalogEmpty ? (
                    <p className="font-medium text-foreground">
                      {t('moderator.directoryUnavailable')}
                    </p>
                  ) : (
                    <>
                      <p className="text-muted-foreground">
                        {t('moderator.directoryFilteredEmpty')}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {t('moderator.directoryEmptyHint')}
                      </p>
                      <div className="flex flex-col justify-center gap-2 pt-2 sm:flex-row">
                        <Button
                          type="button"
                          variant="outline"
                          className="min-h-[44px]"
                          onClick={clearAllFilters}
                        >
                          {t('moderator.resetFilters')}
                        </Button>
                      </div>
                    </>
                  )}
                </Card>
              ) : (
                <VStack gap="sm">
                  {filteredModerators.map(moderator => {
                    const cardModerator = mapApiModeratorToModerator(moderator, verifiedPeerIds);
                    const isInStore = storePeerIds.has(moderator.peerID);
                    const isExpanded = expandedPeerID === moderator.peerID;
                    const detailHref = resolveDetailHref(moderator.peerID);

                    return (
                      <ModeratorExpandableRow
                        key={moderator.peerID}
                        moderator={cardModerator}
                        detailModerator={isExpanded ? expandedDetailCard : null}
                        isDetailLoading={isExpanded && isExpandedDetailLoading}
                        expanded={isExpanded}
                        onToggle={() =>
                          setExpandedPeerID(prev =>
                            prev === moderator.peerID ? null : moderator.peerID
                          )
                        }
                        showAddedBadge={showAddToStore && isInStore}
                        trailing={
                          showAddToStore && !isInStore ? (
                            <Button
                              size="sm"
                              className="min-h-[44px] whitespace-nowrap"
                              disabled={isSaving && addingPeerID === moderator.peerID}
                              onClick={() => handleAddToStore(moderator.peerID)}
                            >
                              {isSaving && addingPeerID === moderator.peerID ? (
                                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                              ) : (
                                <Plus className="mr-1.5 h-4 w-4" />
                              )}
                              {t('moderator.addToStore')}
                            </Button>
                          ) : undefined
                        }
                        expandedFooter={
                          <Link
                            href={detailHref}
                            className="inline-flex min-h-[44px] items-center gap-1 text-sm font-medium text-primary hover:text-primary/80"
                          >
                            {t('moderator.viewFullProfile')}
                            <ChevronRight className="h-4 w-4" aria-hidden />
                          </Link>
                        }
                      />
                    );
                  })}
                </VStack>
              )}
            </>
          )}
        </div>
      </div>
    </Container>
  );
}
