'use client';

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Container, HStack, VStack } from '@/components/layouts';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/components/ui';
import { useI18n, useModeratorDetail, useStoreModerators, getImageUrl } from '@mobazha/core';
import { formatUserName, truncatePeerId } from '@mobazha/core/utils/identity';
import { ChevronLeft, Shield, Star, Loader2, Check, Plus, Mail, Globe } from 'lucide-react';
import {
  resolveModeratorBackNav,
  isStoreSettingsReturn,
  MODERATOR_ROUTES,
} from '@/lib/routes/moderators';

type DetailTab = 'about' | 'reviews' | 'terms';

function formatFeePercent(percentage?: number): string {
  if (percentage === undefined || percentage === null) return '—';
  return `${percentage}%`;
}

export function ModeratorDetailView({ peerID }: { peerID: string }) {
  const { t } = useI18n();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get('returnTo') || MODERATOR_ROUTES.storeSettings;
  const fromStoreFlow = searchParams.get('intent') === 'add-to-store';
  const fromStoreSettings = isStoreSettingsReturn(returnTo);
  const backNav = resolveModeratorBackNav(searchParams);

  const { moderator, reviews, isLoading, isReviewsLoading, error } = useModeratorDetail(peerID);
  const { moderators: storeModerators, addModerator, isSaving } = useStoreModerators();
  const isInStore = storeModerators.some(m => m.peerID === peerID);

  const [activeTab, setActiveTab] = useState<DetailTab>('about');
  const [isAdding, setIsAdding] = useState(false);

  const handleAddToStore = useCallback(async () => {
    setIsAdding(true);
    const result = await addModerator(peerID);
    setIsAdding(false);

    if (!result.success) {
      toast({
        title: t('common.error'),
        description:
          result.error === 'Moderator already added'
            ? t('settingsExtended.moderatorAlreadyAdded')
            : result.error || t('settingsExtended.saveFailed'),
        variant: 'destructive',
      });
      return;
    }

    toast({ title: t('common.success'), description: t('settingsModal.moderatorAdded') });
    if (fromStoreFlow) {
      router.push(returnTo);
    }
  }, [addModerator, peerID, toast, t, fromStoreFlow, router, returnTo]);

  if (isLoading) {
    return (
      <Container size="xl">
        <div className="flex flex-col items-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="mt-3 text-sm text-muted-foreground">{t('payment.loadingModerators')}</p>
        </div>
      </Container>
    );
  }

  if (error || !moderator) {
    return (
      <Container size="xl">
        <Link
          href={backNav.href}
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 min-h-[44px]"
        >
          <ChevronLeft className="w-4 h-4" />
          {t(backNav.labelKey)}
        </Link>
        <Card className="p-8 text-center">
          <h2 className="text-lg font-semibold">{t('moderator.notFound')}</h2>
          <p className="text-sm text-muted-foreground mt-2">{t('moderator.notFoundDesc')}</p>
        </Card>
      </Container>
    );
  }

  const displayName = formatUserName(
    { name: moderator.name, handle: moderator.handle, peerID: moderator.peerID },
    { fallback: 'User' }
  );
  const avatarUrl = moderator.avatarHashes?.medium
    ? getImageUrl(moderator.avatarHashes.medium)
    : moderator.avatarHashes?.small
      ? getImageUrl(moderator.avatarHashes.small)
      : undefined;
  const shortDescription =
    moderator.shortDescription || moderator.description || t('settingsExtended.profileUnavailable');
  const hasRating = (moderator.stats?.ratingCount ?? 0) > 0;
  return (
    <Container size="xl">
      <Link
        href={backNav.href}
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 min-h-[44px]"
      >
        <ChevronLeft className="w-4 h-4" />
        {t(backNav.labelKey)}
      </Link>

      {fromStoreSettings && isInStore && (
        <Card className="mb-6 p-4 border-primary/20 bg-primary/5">
          <p className="text-sm text-foreground">{t('moderator.storeSettingsContextBanner')}</p>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-4 md:p-6">
            <HStack gap="lg" align="start">
              <Avatar className="w-24 h-24">
                <AvatarImage src={avatarUrl} alt={displayName} />
                <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                  {displayName[0] || 'M'}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <h1 className="text-2xl font-bold text-foreground">{displayName}</h1>
                  {moderator.verified && (
                    <Badge variant="secondary" className="bg-primary/10 text-primary gap-1">
                      <Shield className="w-3.5 h-3.5" />
                      {t('payment.verified')}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground font-mono mb-2">
                  {truncatePeerId(moderator.peerID, 8)}
                </p>
                <p className="text-muted-foreground mb-4">{shortDescription}</p>

                {hasRating && moderator.stats && (
                  <div className="inline-flex items-center gap-2 rounded-lg bg-muted/60 px-3 py-2">
                    <Star className="w-4 h-4 text-warning fill-warning/20" />
                    <span className="font-semibold">{moderator.stats.rating.toFixed(1)}</span>
                    <span className="text-sm text-muted-foreground">
                      ({moderator.stats.ratingCount} {t('settingsExtended.rating')})
                    </span>
                  </div>
                )}
              </div>
            </HStack>
          </Card>

          <Card>
            <div className="border-b border-border">
              <HStack gap="none">
                {(
                  [
                    ['about', t('moderator.tabAbout')],
                    ['reviews', t('moderator.tabReviews')],
                    ['terms', t('moderator.tabTerms')],
                  ] as const
                ).map(([tab, label]) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 md:px-6 py-4 text-sm font-medium transition-colors min-h-[44px] ${
                      activeTab === tab
                        ? 'text-primary border-b-2 border-primary'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </HStack>
            </div>

            <div className="p-4 md:p-6">
              {activeTab === 'about' && (
                <div className="space-y-6">
                  {moderator.description && (
                    <p className="text-muted-foreground whitespace-pre-wrap">
                      {moderator.description}
                    </p>
                  )}

                  {moderator.languages && moderator.languages.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-foreground mb-2">
                        {t('moderator.language')}
                      </h3>
                      <HStack gap="sm">
                        {moderator.languages.map(lang => (
                          <Badge key={lang} variant="outline">
                            {lang.toUpperCase()}
                          </Badge>
                        ))}
                      </HStack>
                    </div>
                  )}

                  {moderator.acceptedCurrencies && moderator.acceptedCurrencies.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-foreground mb-2">
                        {t('settingsExtended.acceptedCryptocurrencies')}
                      </h3>
                      <HStack gap="sm" className="flex-wrap">
                        {moderator.acceptedCurrencies.map(currency => (
                          <Badge
                            key={currency}
                            variant="secondary"
                            className="bg-primary/10 text-primary"
                          >
                            {currency}
                          </Badge>
                        ))}
                      </HStack>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'reviews' && (
                <VStack gap="lg">
                  {isReviewsLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  ) : reviews.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      {t('moderator.noReviewsForModerator')}
                    </p>
                  ) : (
                    reviews.map(review => (
                      <div
                        key={review.id}
                        className="border-b border-border pb-4 last:border-0 last:pb-0"
                      >
                        <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                          <span className="font-medium text-foreground">
                            {formatUserName(
                              {
                                name: review.reviewer.name,
                                peerID: review.reviewer.peerID,
                              },
                              { fallback: 'User' }
                            )}
                          </span>
                          <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map(i => (
                              <Star
                                key={i}
                                className={`w-4 h-4 ${
                                  i <= review.rating
                                    ? 'text-warning fill-warning/30'
                                    : 'text-muted-foreground/30'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        {review.comment && (
                          <p className="text-muted-foreground text-sm">{review.comment}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          {new Date(review.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    ))
                  )}
                </VStack>
              )}

              {activeTab === 'terms' && (
                <div className="text-muted-foreground whitespace-pre-wrap">
                  {moderator.termsAndConditions || t('settingsExtended.profileUnavailable')}
                </div>
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-4 md:p-6">
            <h3 className="font-semibold text-foreground mb-4">{t('payment.moderatorFee')}</h3>
            <div className="text-center py-2">
              <p className="text-4xl font-bold text-primary">
                {formatFeePercent(moderator.fee?.percentage)}
              </p>
              <p className="text-muted-foreground mt-1 text-sm">
                {t('moderator.feeOfTransaction')}
              </p>
            </div>
            {isInStore ? (
              <Button variant="secondary" className="w-full mt-4 min-h-[44px]" disabled>
                <Check className="w-4 h-4 mr-2" />
                {fromStoreSettings ? t('moderator.inYourStore') : t('moderator.addedToStore')}
              </Button>
            ) : (
              !fromStoreSettings && (
                <Button
                  className="w-full mt-4 min-h-[44px]"
                  size="lg"
                  disabled={isSaving || isAdding}
                  onClick={handleAddToStore}
                >
                  {isSaving || isAdding ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4 mr-2" />
                  )}
                  {t('moderator.addToStore')}
                </Button>
              )
            )}
          </Card>

          {(moderator.contactInfo?.email ||
            moderator.contactInfo?.website ||
            moderator.contactInfo?.social?.twitter ||
            moderator.contactInfo?.social?.telegram) && (
            <Card className="p-4 md:p-6">
              <h3 className="font-semibold text-foreground mb-4">
                {t('moderator.contactInformation')}
              </h3>
              <VStack gap="md" className="text-sm text-muted-foreground">
                {moderator.contactInfo.email && (
                  <HStack gap="sm" align="center">
                    <Mail className="w-4 h-4 flex-shrink-0" />
                    <span>{moderator.contactInfo.email}</span>
                  </HStack>
                )}
                {moderator.contactInfo.website && (
                  <HStack gap="sm" align="center">
                    <Globe className="w-4 h-4 flex-shrink-0" />
                    <a
                      href={moderator.contactInfo.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline break-all"
                    >
                      {moderator.contactInfo.website}
                    </a>
                  </HStack>
                )}
                {moderator.contactInfo.social?.twitter && (
                  <p>Twitter: {moderator.contactInfo.social.twitter}</p>
                )}
                {moderator.contactInfo.social?.telegram && (
                  <p>Telegram: {moderator.contactInfo.social.telegram}</p>
                )}
              </VStack>
            </Card>
          )}
        </div>
      </div>
    </Container>
  );
}
