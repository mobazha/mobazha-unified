'use client';

import React, { useMemo, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Container, HStack, VStack } from '@/components/layouts';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  useI18n,
  useModeratorDirectory,
  useStoreModerators,
  useModeratorPeerLookup,
  useVerifiedModerators,
  getImageUrl,
} from '@mobazha/core';
import type { Moderator as ApiModerator } from '@mobazha/core/services/api/moderators';
import { formatUserName } from '@mobazha/core/utils/identity';
import {
  ADDED_TO_STORE_BUTTON_CLASS,
  getModeratorTrustMetrics,
  mapApiModeratorToModerator,
} from '@/components/Moderators/moderatorDisplay';
import { ModeratorProfilePreview } from '@/components/Moderators/ModeratorProfilePreview';
import {
  Search,
  CheckCircle,
  Star,
  Shield,
  Filter,
  Loader2,
  RefreshCw,
  Plus,
  Check,
} from 'lucide-react';

import { MODERATOR_ROUTES, moderatorDetailHref } from '@/lib/routes/moderators';
import { cn } from '@/lib/utils';

function mapFeePercent(mod: ApiModerator): number {
  return mod.fee?.percentage ?? 0;
}

function ModeratorDirectoryCard({
  moderator,
  showAddToStore,
  isInStore,
  isAdding,
  onAddToStore,
  detailHref,
}: {
  moderator: ApiModerator;
  showAddToStore: boolean;
  isInStore: boolean;
  isAdding: boolean;
  onAddToStore: (peerID: string) => void;
  detailHref: string;
}) {
  const { t } = useI18n();
  const displayName = formatUserName(
    { name: moderator.name, handle: moderator.handle, peerID: moderator.peerID },
    { fallback: 'User' }
  );
  const avatarUrl = moderator.avatarHashes?.small
    ? getImageUrl(moderator.avatarHashes.small)
    : undefined;
  const feePercent = mapFeePercent(moderator);
  const ratingCount = moderator.stats?.ratingCount ?? 0;
  const description =
    moderator.shortDescription || moderator.description || t('settingsExtended.profileUnavailable');
  const metrics = getModeratorTrustMetrics(mapApiModeratorToModerator(moderator));

  return (
    <Card className="group relative p-4 border border-border/60 shadow-sm transition-all duration-200 hover:shadow-lg hover:border-primary/30">
      <HStack gap="lg" align="start">
        <div className="relative flex-shrink-0">
          <Avatar className="w-16 h-16 ring-2 ring-border/50 group-hover:ring-primary/30 transition-all">
            <AvatarImage src={avatarUrl} alt={displayName} />
            <AvatarFallback className="bg-primary/10 text-primary text-lg">
              {displayName[0] || 'M'}
            </AvatarFallback>
          </Avatar>
          {moderator.verified && (
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-info rounded-full flex items-center justify-center ring-2 ring-background">
              <CheckCircle className="w-4 h-4 text-white" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <Link href={detailHref} className="min-w-0 flex-1 group/link">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-foreground group-hover/link:text-primary transition-colors truncate">
                  {displayName}
                </h3>
                {moderator.verified && (
                  <Badge
                    variant="secondary"
                    className="bg-primary/10 text-primary text-xs h-5 gap-0.5"
                  >
                    <Shield className="w-3 h-3" />
                    {t('payment.verified')}
                  </Badge>
                )}
              </div>
            </Link>
            <div className="text-right flex-shrink-0">
              <div className="text-lg font-bold text-primary">{feePercent}%</div>
              <div className="text-xs text-muted-foreground">{t('moderator.fee')}</div>
              <div className="text-[10px] text-muted-foreground/80 max-w-[7rem] leading-tight mt-0.5">
                {t('moderator.feeDisputeNote')}
              </div>
            </div>
          </div>

          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{description}</p>

          <div className="flex flex-wrap items-center gap-2 mt-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1 rounded-full bg-muted/60 px-2 py-1">
              <Star className="w-3.5 h-3.5 text-warning fill-warning/20" />
              {metrics.rating}
              {ratingCount > 0 ? ` (${ratingCount})` : ''}
            </span>
            <span className="rounded-full bg-muted/60 px-2 py-1">
              {t('settingsExtended.disputes')}: {metrics.disputes}
            </span>
            <span className="rounded-full bg-muted/60 px-2 py-1">
              {t('settingsExtended.successRate')}: {metrics.successRate}
            </span>
            <span className="rounded-full bg-muted/60 px-2 py-1">
              {t('settingsExtended.avgResolution')}: {metrics.avgResolution}
            </span>
            {moderator.languages?.slice(0, 3).map((lang: string) => (
              <Badge key={lang} variant="outline" className="text-xs h-5">
                {lang.toUpperCase()}
              </Badge>
            ))}
          </div>
        </div>
      </HStack>

      {showAddToStore && (
        <div className="mt-4 pt-4 border-t border-border flex justify-end">
          {isInStore ? (
            <Button
              variant="outline"
              size="sm"
              disabled
              className={cn('min-h-[44px]', ADDED_TO_STORE_BUTTON_CLASS)}
            >
              <Check className="w-4 h-4 mr-1.5" />
              {t('moderator.addedToStore')}
            </Button>
          ) : (
            <Button
              size="sm"
              className="min-h-[44px]"
              disabled={isAdding}
              onClick={() => onAddToStore(moderator.peerID)}
            >
              {isAdding ? (
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-1.5" />
              )}
              {t('moderator.addToStore')}
            </Button>
          )}
        </div>
      )}
    </Card>
  );
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
  const peerIdInputRef = useRef<HTMLInputElement>(null);
  const peerLookup = useModeratorPeerLookup(peerIdInput);
  const lookupResult = peerLookup.moderator;
  const lookupStatus = peerLookup.status;

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
                <Button
                  type="button"
                  variant={storePeerIds.has(lookupResult.peerID) ? 'outline' : 'default'}
                  className={cn(
                    'min-h-[44px]',
                    storePeerIds.has(lookupResult.peerID) && ADDED_TO_STORE_BUTTON_CLASS
                  )}
                  disabled={
                    storePeerIds.has(lookupResult.peerID) ||
                    (isSaving && addingPeerID === lookupResult.peerID)
                  }
                  onClick={() => handleAddToStore(lookupResult.peerID)}
                >
                  {storePeerIds.has(lookupResult.peerID) ? (
                    <Check className="w-4 h-4" />
                  ) : isSaving && addingPeerID === lookupResult.peerID ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  {storePeerIds.has(lookupResult.peerID)
                    ? t('moderator.addedToStore')
                    : t('moderator.addToStore')}
                </Button>
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
            <Card className="sticky top-4 p-4 border border-border/60 shadow-sm">
              <div className="flex items-center gap-2 pb-4 border-b border-border mb-4">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <h3 className="font-semibold text-foreground">{t('filter.filters')}</h3>
              </div>

              <VStack gap="lg">
                {showDirectoryFilters && (
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">
                      {t('moderator.searchDirectoryLabel')}
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
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
                    <label className="text-sm font-medium text-foreground mb-2 block">
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
                    <label className="text-sm font-medium text-foreground mb-2 block">
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
                  <label className="flex items-center gap-3 cursor-pointer group min-h-[44px]">
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
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                        verifiedOnly
                          ? 'bg-primary border-primary'
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
                        <CheckCircle className="w-3.5 h-3.5 text-primary-foreground" />
                      )}
                    </div>
                    <span className="text-sm text-foreground">{t('moderator.verifiedOnly')}</span>
                  </label>
                )}

                <Button variant="outline" className="w-full min-h-[44px]" onClick={clearAllFilters}>
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
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-border gap-3 flex-wrap">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {t('moderator.recommendedDirectoryTitle')}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t('moderator.moderatorsFound', { count: filteredModerators.length })}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  <Select
                    value={sortBy}
                    onValueChange={value => setSortBy(value as 'rating' | 'fee')}
                  >
                    <SelectTrigger className="w-[180px] min-h-[44px]">
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
                    <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </div>

              {isLoading ? (
                <div className="flex flex-col items-center py-16">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <p className="mt-3 text-sm text-muted-foreground">
                    {t('payment.loadingModerators')}
                  </p>
                </div>
              ) : error ? (
                <Card className="p-6 text-center">
                  <p className="text-sm text-muted-foreground mb-4">
                    {t('moderator.directoryError')}
                  </p>
                  <Button variant="outline" onClick={() => refresh()} className="min-h-[44px]">
                    {t('common.retry')}
                  </Button>
                </Card>
              ) : filteredModerators.length === 0 ? (
                <Card className="p-8 text-center space-y-3">
                  {lookupStatus === 'loading' ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
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
                    <>
                      <p className="text-foreground font-medium">
                        {t('moderator.directoryUnavailable')}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-muted-foreground">
                        {t('moderator.directoryFilteredEmpty')}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {t('moderator.directoryEmptyHint')}
                      </p>
                      <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
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
                <VStack gap="md">
                  {filteredModerators.map(moderator => {
                    const detailHref = detailHrefForModerator
                      ? detailHrefForModerator(moderator.peerID, returnTo)
                      : moderatorDetailHref(
                          moderator.peerID,
                          showAddToStore ? { intent: 'add-to-store', returnTo } : undefined
                        );
                    return (
                      <ModeratorDirectoryCard
                        key={moderator.peerID}
                        moderator={moderator}
                        showAddToStore={showAddToStore}
                        isInStore={storePeerIds.has(moderator.peerID)}
                        isAdding={isSaving && addingPeerID === moderator.peerID}
                        onAddToStore={handleAddToStore}
                        detailHref={detailHref}
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
