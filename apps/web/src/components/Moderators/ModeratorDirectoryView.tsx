'use client';

import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
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
  getImageUrl,
  moderatorsApi,
  isFullPeerID,
} from '@mobazha/core';
import type { Moderator as ApiModerator } from '@mobazha/core/services/api/moderators';
import { formatUserName } from '@mobazha/core/utils/identity';
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
  const rating = moderator.stats?.rating ?? 0;
  const ratingCount = moderator.stats?.ratingCount ?? 0;
  const description =
    moderator.shortDescription || moderator.description || t('settingsExtended.profileUnavailable');

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
            </div>
          </div>

          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{description}</p>

          <div className="flex flex-wrap items-center gap-3 mt-3 text-sm text-muted-foreground">
            {ratingCount > 0 && (
              <span className="inline-flex items-center gap-1">
                <Star className="w-4 h-4 text-warning fill-warning/20" />
                {rating.toFixed(1)} ({ratingCount})
              </span>
            )}
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
            <Button variant="secondary" size="sm" disabled className="min-h-[44px]">
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

export function ModeratorDirectoryView() {
  const { t } = useI18n();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const intent = searchParams.get('intent');
  const returnTo = searchParams.get('returnTo') || MODERATOR_ROUTES.storeSettings;
  const showAddToStore = intent === 'add-to-store';

  const { moderators, isLoading, error, refresh, isFetching } = useModeratorDirectory();
  const { moderators: storeModerators, addModerator, isSaving } = useStoreModerators();
  const storePeerIds = useMemo(
    () => new Set(storeModerators.map(m => m.peerID)),
    [storeModerators]
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('all');
  const [maxFee, setMaxFee] = useState<string>('all');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'rating' | 'fee'>('rating');
  const [addingPeerID, setAddingPeerID] = useState<string | null>(null);
  const [lookupResult, setLookupResult] = useState<ApiModerator | null>(null);
  const [lookupStatus, setLookupStatus] = useState<
    'idle' | 'loading' | 'not_found' | 'not_moderator'
  >('idle');
  const lookupTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const allLanguages = useMemo(
    () => Array.from(new Set(moderators.flatMap(m => m.languages || []))).sort(),
    [moderators]
  );

  const filteredModerators = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const base = moderators.filter(mod => {
      if (query && !isFullPeerID(searchQuery.trim())) {
        const haystack = [mod.name, mod.handle, mod.description, mod.shortDescription, mod.peerID]
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

    const merged =
      lookupResult && !base.some(m => m.peerID === lookupResult.peerID)
        ? [lookupResult, ...base]
        : base;

    return merged.sort((a, b) => {
      if (sortBy === 'fee') {
        return mapFeePercent(a) - mapFeePercent(b);
      }
      const ratingDiff = (b.stats?.rating ?? 0) - (a.stats?.rating ?? 0);
      if (ratingDiff !== 0) return ratingDiff;
      return (b.stats?.ratingCount ?? 0) - (a.stats?.ratingCount ?? 0);
    });
  }, [moderators, searchQuery, selectedLanguage, maxFee, verifiedOnly, sortBy, lookupResult]);

  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (lookupTimerRef.current) clearTimeout(lookupTimerRef.current);

    if (!isFullPeerID(trimmed)) {
      lookupTimerRef.current = setTimeout(() => {
        setLookupResult(null);
        setLookupStatus('idle');
      }, 0);
      return () => {
        if (lookupTimerRef.current) clearTimeout(lookupTimerRef.current);
      };
    }

    lookupTimerRef.current = setTimeout(async () => {
      setLookupStatus('loading');
      const result = await moderatorsApi.lookupModeratorCandidate(trimmed);
      if (result.status === 'found') {
        setLookupResult(result.moderator);
        setLookupStatus('idle');
      } else if (result.status === 'not_moderator') {
        setLookupResult(null);
        setLookupStatus('not_moderator');
      } else {
        setLookupResult(null);
        setLookupStatus('not_found');
      }
    }, 400);

    return () => {
      if (lookupTimerRef.current) clearTimeout(lookupTimerRef.current);
    };
  }, [searchQuery]);

  const sortLabels: Record<string, string> = {
    rating: t('moderator.highestRating'),
    fee: t('moderator.lowestFee'),
  };

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
    setSearchQuery('');
    setSelectedLanguage('all');
    setMaxFee('all');
    setVerifiedOnly(false);
    setSortBy('rating');
  };

  return (
    <Container size="xl">
      {showAddToStore && (
        <Card className="mb-6 p-4 border-primary/20 bg-primary/5">
          <p className="text-sm text-foreground">{t('moderator.addToStoreBanner')}</p>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <Card className="sticky top-4 p-4 border border-border/60 shadow-sm">
            <div className="flex items-center gap-2 pb-4 border-b border-border mb-4">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <h3 className="font-semibold text-foreground">{t('filter.filters')}</h3>
            </div>

            <VStack gap="lg">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  {t('common.search')}
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder={t('moderator.searchPlaceholder')}
                    className="pl-9"
                  />
                </div>
              </div>

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
                    <SelectItem value="1">{t('moderator.maxFeeOption', { fee: '1' })}</SelectItem>
                    <SelectItem value="1.5">
                      {t('moderator.maxFeeOption', { fee: '1.5' })}
                    </SelectItem>
                    <SelectItem value="2">{t('moderator.maxFeeOption', { fee: '2' })}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

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
                  {verifiedOnly && <CheckCircle className="w-3.5 h-3.5 text-primary-foreground" />}
                </div>
                <span className="text-sm text-foreground">{t('moderator.verifiedOnly')}</span>
              </label>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  {t('moderator.sortBy')}
                </label>
                <Select
                  value={sortBy}
                  onValueChange={value => setSortBy(value as 'rating' | 'fee')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rating">{t('moderator.highestRating')}</SelectItem>
                    <SelectItem value="fee">{t('moderator.lowestFee')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button variant="outline" className="w-full min-h-[44px]" onClick={clearAllFilters}>
                {t('moderator.resetFilters')}
              </Button>
            </VStack>
          </Card>
        </div>

        <div className="lg:col-span-3">
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-border gap-3 flex-wrap">
            <p className="text-sm text-muted-foreground">
              {t('moderator.moderatorsFound', { count: filteredModerators.length })}
            </p>
            <div className="flex items-center gap-2">
              <p className="text-sm text-muted-foreground">
                {t('moderator.sortedBy', { label: sortLabels[sortBy] })}
              </p>
              <Button variant="ghost" size="icon" onClick={() => refresh()} disabled={isFetching}>
                <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="mt-3 text-sm text-muted-foreground">{t('payment.loadingModerators')}</p>
            </div>
          ) : error ? (
            <Card className="p-6 text-center">
              <p className="text-sm text-muted-foreground mb-4">{t('moderator.directoryError')}</p>
              <Button variant="outline" onClick={() => refresh()} className="min-h-[44px]">
                {t('common.retry')}
              </Button>
            </Card>
          ) : filteredModerators.length === 0 ? (
            <Card className="p-8 text-center space-y-2">
              {lookupStatus === 'loading' ? (
                <p className="text-muted-foreground">{t('moderator.directoryLookupSearching')}</p>
              ) : lookupStatus === 'not_found' ? (
                <p className="text-muted-foreground">{t('moderator.directoryLookupNotFound')}</p>
              ) : lookupStatus === 'not_moderator' ? (
                <p className="text-muted-foreground">
                  {t('moderator.directoryLookupNotModerator')}
                </p>
              ) : (
                <>
                  <p className="text-muted-foreground">{t('moderator.directoryEmpty')}</p>
                  <p className="text-sm text-muted-foreground">
                    {t('moderator.directoryEmptyHint')}
                  </p>
                </>
              )}
            </Card>
          ) : (
            <VStack gap="md">
              {filteredModerators.map(moderator => {
                const detailHref = moderatorDetailHref(
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
        </div>
      </div>
    </Container>
  );
}
