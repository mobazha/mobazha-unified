'use client';

import React, { useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { moderatorDirectoryAddFromStoreHref } from '@/lib/routes/moderators';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  useToast,
} from '@/components/ui';
import {
  useI18n,
  useStoreModerators,
  useVerifiedModerators,
  useModeratorDetail,
  useModeratorPeerLookup,
  getImageUrl,
} from '@mobazha/core';
import type { Moderator as ApiModerator } from '@mobazha/core/services/api/moderators';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { Moderator } from '@/components/Payment/types';
import {
  ADDED_TO_STORE_BUTTON_CLASS,
  mapApiModeratorToModerator,
  formatModeratorFee,
  getModeratorDisplayName,
  getModeratorTrustMetrics,
} from '@/components/Moderators/moderatorDisplay';
import { ModeratorVerificationBadge } from '@/components/Moderators/ModeratorVerificationBadge';
import { ModeratorProfilePreview } from '@/components/Moderators/ModeratorProfilePreview';
import {
  Plus,
  Scale,
  Trash2,
  ChevronDown,
  RefreshCw,
  Loader2,
  Mail,
  Globe,
  MapPin,
  Check,
} from 'lucide-react';

function mapApiModeratorToCard(mod: ApiModerator, verifiedPeerIds: Set<string>): Moderator {
  return mapApiModeratorToModerator(mod, verifiedPeerIds);
}

function StatCell({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-lg bg-background/80 border border-border/60 p-3 text-center">
      <p
        className={cn(
          'text-lg font-bold tabular-nums',
          highlight ? 'text-primary' : 'text-foreground'
        )}
      >
        {value}
      </p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}

function StoreModeratorDetailPanel({
  moderator,
  isLoading,
}: {
  moderator: Moderator;
  isLoading?: boolean;
}) {
  const { t } = useI18n();
  const languages = moderator.languages ?? [];
  const bodyText = moderator.description || moderator.shortDescription;
  const showFullDescription =
    bodyText && bodyText.trim() !== (moderator.shortDescription ?? '').trim();
  const metrics = getModeratorTrustMetrics(moderator);

  const statItems: { label: string; value: string; highlight?: boolean }[] = [
    { label: t('moderator.fee'), value: metrics.fee, highlight: true },
    { label: t('settingsExtended.rating'), value: metrics.rating },
    { label: t('settingsExtended.disputes'), value: metrics.disputes },
    { label: t('settingsExtended.successRate'), value: metrics.successRate },
    { label: t('settingsExtended.avgResolution'), value: metrics.avgResolution },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        {t('settingsExtended.moderatorPreviewLoading')}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {moderator.peerID && (
        <div>
          <p className="text-xs font-medium text-foreground mb-1">
            {t('moderator.customPeerIdLabel')}
          </p>
          <p className="break-all font-mono text-xs text-muted-foreground">{moderator.peerID}</p>
        </div>
      )}

      {moderator.location && (
        <div>
          <p className="text-xs font-medium text-foreground mb-1">{t('profile.location')}</p>
          <p className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="w-3.5 h-3.5 flex-shrink-0" aria-hidden />
            <span>{moderator.location}</span>
          </p>
        </div>
      )}

      {showFullDescription && (
        <div>
          <p className="text-xs font-medium text-foreground mb-1.5">
            {t('settingsExtended.detailedDescription')}
          </p>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
            {bodyText}
          </p>
        </div>
      )}

      <div className={cn('grid gap-2.5', 'grid-cols-2 md:grid-cols-5')}>
        {statItems.map(item => (
          <StatCell
            key={item.label}
            label={item.label}
            value={item.value}
            highlight={item.highlight}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <p className="text-xs font-medium text-foreground mb-1.5">{t('moderator.language')}</p>
          {languages.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {languages.map(lang => (
                <Badge key={lang} variant="outline" className="text-xs">
                  {lang.toUpperCase()}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">{t('common.none')}</p>
          )}
        </div>

        <div>
          <p className="text-xs font-medium text-foreground mb-1.5">
            {t('settingsExtended.acceptedCryptocurrencies')}
          </p>
          {moderator.acceptedCurrencies && moderator.acceptedCurrencies.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {moderator.acceptedCurrencies.map(currency => (
                <Badge
                  key={currency}
                  variant="secondary"
                  className="text-xs bg-primary/10 text-primary"
                >
                  {currency}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">{t('common.none')}</p>
          )}
        </div>
      </div>

      {(moderator.contactInfo?.email || moderator.contactInfo?.website) && (
        <div>
          <p className="text-xs font-medium text-foreground mb-1.5">
            {t('settingsExtended.contactInfo')}
          </p>
          <div className="space-y-1.5 text-sm text-muted-foreground">
            {moderator.contactInfo.email && (
              <div className="inline-flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 flex-shrink-0" aria-hidden />
                <span>{moderator.contactInfo.email}</span>
              </div>
            )}
            {moderator.contactInfo.website && (
              <div className="inline-flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 flex-shrink-0" aria-hidden />
                <a
                  href={moderator.contactInfo.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline break-all"
                >
                  {moderator.contactInfo.website}
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      <div>
        <p className="text-xs font-medium text-foreground mb-1.5">
          {t('settingsExtended.moderatorTerms')}
        </p>
        {moderator.termsAndConditions ? (
          <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto">
            {moderator.termsAndConditions}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">{t('common.none')}</p>
        )}
      </div>
    </div>
  );
}

function ModeratorListRow({
  moderator,
  detailModerator,
  isDetailLoading,
  expanded,
  onToggle,
  onRemove,
  removeDisabled,
}: {
  moderator: Moderator;
  detailModerator?: Moderator | null;
  isDetailLoading?: boolean;
  expanded: boolean;
  onToggle: () => void;
  onRemove: () => void;
  removeDisabled?: boolean;
}) {
  const { t } = useI18n();
  const panelModerator = detailModerator ?? moderator;
  const avatarUrl = moderator.avatarHashes?.small
    ? getImageUrl(moderator.avatarHashes.small)
    : undefined;
  const displayName = getModeratorDisplayName(moderator, 'User');
  const feeText = formatModeratorFee(moderator);

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="flex items-stretch">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          className={cn(
            'flex flex-1 items-center gap-3 p-4 min-h-[72px] text-left transition-colors',
            'hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset'
          )}
        >
          <Avatar className="w-11 h-11 flex-shrink-0">
            <AvatarImage src={avatarUrl} alt={displayName} />
            <AvatarFallback className="bg-primary/10 text-primary text-base">
              {displayName[0] || 'M'}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-medium text-foreground truncate">{displayName}</span>
              <ModeratorVerificationBadge moderator={moderator} />
            </div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-0.5">
              {moderator.location && (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="w-3 h-3 flex-shrink-0" aria-hidden />
                  {moderator.location}
                </span>
              )}
              {feeText && (
                <span className="text-xs text-muted-foreground">
                  {moderator.location ? '· ' : ''}
                  {t('moderator.fee')} {feeText}
                </span>
              )}
              {moderator.shortDescription && (
                <span className="text-xs text-muted-foreground line-clamp-1">
                  {feeText ? `· ${moderator.shortDescription}` : moderator.shortDescription}
                </span>
              )}
            </div>
          </div>

          <ChevronDown
            className={cn(
              'w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform duration-200',
              expanded && 'rotate-180'
            )}
            aria-hidden
          />
        </button>

        <Button
          variant="ghost"
          size="icon"
          aria-label={t('settingsExtended.removeModerator')}
          disabled={removeDisabled}
          className="self-center mr-1 text-destructive hover:text-destructive min-h-[44px] min-w-[44px] flex-shrink-0"
          onClick={e => {
            e.stopPropagation();
            onRemove();
          }}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      {expanded && (
        <div className="border-t border-border bg-muted/20 px-4 py-4">
          <StoreModeratorDetailPanel moderator={panelModerator} isLoading={isDetailLoading} />
        </div>
      )}
    </div>
  );
}

export interface StoreModeratorsContentProps {
  addModalOpen?: boolean;
  onAddModalOpenChange?: (open: boolean) => void;
}

export function StoreModeratorsContent({
  addModalOpen: controlledAddOpen,
  onAddModalOpenChange,
}: StoreModeratorsContentProps = {}) {
  const { t } = useI18n();
  const { toast } = useToast();
  const { verifiedModerators } = useVerifiedModerators();
  const { moderators, isLoading, isSaving, error, refresh, addModerator, removeModerator } =
    useStoreModerators();

  const [internalAddOpen, setInternalAddOpen] = useState(false);
  const showAddModal = controlledAddOpen ?? internalAddOpen;
  const setShowAddModal = onAddModalOpenChange ?? setInternalAddOpen;

  const [expandedPeerID, setExpandedPeerID] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<Moderator | null>(null);
  const [newPeerId, setNewPeerId] = useState('');
  const peerLookup = useModeratorPeerLookup(newPeerId, { enabled: showAddModal });

  const { moderator: expandedDetail, isLoading: isExpandedDetailLoading } = useModeratorDetail(
    expandedPeerID ?? undefined
  );

  const cardModerators = useMemo(
    () => moderators.map(m => mapApiModeratorToCard(m, verifiedModerators)),
    [moderators, verifiedModerators]
  );
  const storePeerIds = useMemo(() => new Set(moderators.map(m => m.peerID)), [moderators]);

  const expandedDetailCard = useMemo(
    () => (expandedDetail ? mapApiModeratorToCard(expandedDetail, verifiedModerators) : null),
    [expandedDetail, verifiedModerators]
  );

  const previewModeratorCard = useMemo(
    () =>
      peerLookup.moderator ? mapApiModeratorToCard(peerLookup.moderator, verifiedModerators) : null,
    [peerLookup.moderator, verifiedModerators]
  );
  const previewIsAlreadyAdded = previewModeratorCard
    ? storePeerIds.has(previewModeratorCard.peerID)
    : false;

  const previewError = useMemo(() => {
    switch (peerLookup.status) {
      case 'truncated':
        return t('settingsExtended.moderatorPeerIdFormatHint');
      case 'not_found':
        return t('settingsExtended.moderatorNotFound');
      case 'not_moderator':
        return t('settingsExtended.moderatorNotConfigured');
      default:
        return null;
    }
  }, [peerLookup.status, t]);

  const resetAddModalState = useCallback(() => {
    setNewPeerId('');
  }, []);

  const handleAddModerator = useCallback(async () => {
    const peerID = newPeerId.trim();
    if (!peerID || !previewModeratorCard) return;
    if (previewIsAlreadyAdded) return;

    const result = await addModerator(peerID);
    if (!result.success) {
      const message =
        result.error === 'Moderator already added'
          ? t('settingsExtended.moderatorAlreadyAdded')
          : result.error === 'Profile is not a moderator'
            ? t('settingsExtended.moderatorNotConfigured')
            : result.error || t('settingsExtended.saveFailed');
      toast({ title: t('common.error'), description: message, variant: 'destructive' });
      return;
    }

    setShowAddModal(false);
    resetAddModalState();
    await refresh();
    toast({ title: t('common.success'), description: t('settingsModal.moderatorAdded') });
  }, [
    newPeerId,
    previewModeratorCard,
    previewIsAlreadyAdded,
    addModerator,
    refresh,
    toast,
    t,
    resetAddModalState,
    setShowAddModal,
  ]);

  const handleRemoveModerator = useCallback(async () => {
    if (!removeTarget) return;

    const result = await removeModerator(removeTarget.peerID);
    if (!result.success) {
      toast({
        title: t('common.error'),
        description: result.error || t('settingsExtended.deleteFailed'),
        variant: 'destructive',
      });
      return;
    }

    if (expandedPeerID === removeTarget.peerID) {
      setExpandedPeerID(null);
    }
    toast({ title: t('common.success'), description: t('settingsModal.moderatorRemoved') });
    setRemoveTarget(null);
  }, [removeTarget, removeModerator, toast, t, expandedPeerID]);

  if (isLoading) {
    return (
      <div className="space-y-2 max-w-2xl" data-testid="store-moderators-loading">
        <Skeleton className="h-[72px] w-full rounded-xl" />
        <Skeleton className="h-[72px] w-full rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-4 md:p-6 max-w-2xl">
        <p className="text-sm text-muted-foreground mb-4">
          {t('settingsExtended.storeModeratorsLoadFailed')}
        </p>
        <Button variant="outline" onClick={() => refresh()} className="min-h-[44px]">
          <RefreshCw className="w-4 h-4 mr-2" />
          {t('common.retry')}
        </Button>
      </Card>
    );
  }

  return (
    <>
      {cardModerators.length === 0 ? (
        <Card className="p-4 md:p-6 max-w-2xl">
          <div className="text-center py-8 max-w-md mx-auto">
            <Scale className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="font-medium text-foreground">{t('settingsModal.noModerators')}</p>
            <p className="text-sm text-muted-foreground mt-2">
              {t('settingsExtended.storeModeratorsEmptyDesc')}
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center mt-6">
              <Button asChild className="min-h-[44px]">
                <Link href={moderatorDirectoryAddFromStoreHref()}>
                  {t('moderator.findModerators')}
                </Link>
              </Button>
              <Button
                variant="outline"
                className="min-h-[44px]"
                onClick={() => setShowAddModal(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                {t('settingsModal.addModerator')}
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <div className="max-w-2xl space-y-2">
          <div className="flex flex-col gap-3 mb-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              {t('settingsExtended.storeModeratorExpandHint')}
            </p>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:ml-auto">
              <Button variant="outline" size="sm" asChild className="min-h-[44px]">
                <Link href={moderatorDirectoryAddFromStoreHref()}>
                  {t('moderator.findModerators')}
                </Link>
              </Button>
              <Button
                size="sm"
                onClick={() => setShowAddModal(true)}
                disabled={isSaving}
                className="min-h-[44px]"
              >
                <Plus className="w-4 h-4 mr-2" />
                {t('settingsModal.addModerator')}
              </Button>
            </div>
          </div>

          {cardModerators.map(moderator => (
            <ModeratorListRow
              key={moderator.peerID}
              moderator={moderator}
              detailModerator={expandedPeerID === moderator.peerID ? expandedDetailCard : null}
              isDetailLoading={expandedPeerID === moderator.peerID && isExpandedDetailLoading}
              expanded={expandedPeerID === moderator.peerID}
              onToggle={() =>
                setExpandedPeerID(prev => (prev === moderator.peerID ? null : moderator.peerID))
              }
              onRemove={() => setRemoveTarget(moderator)}
              removeDisabled={isSaving}
            />
          ))}
        </div>
      )}

      <Dialog
        open={showAddModal}
        onOpenChange={open => {
          setShowAddModal(open);
          if (!open) resetAddModalState();
        }}
      >
        <DialogContent className="!bottom-0 !top-auto max-h-[92dvh] w-full !max-w-none !translate-y-0 rounded-t-2xl p-4 sm:!bottom-auto sm:!top-[50%] sm:max-h-[85vh] sm:!max-w-2xl sm:!translate-y-[-50%] sm:rounded-lg sm:p-6">
          <DialogHeader className="pr-8">
            <DialogTitle>{t('settingsModal.addModerator')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{t('settingsModal.addModeratorDesc')}</p>
            <p className="text-xs text-muted-foreground">
              {t('settingsExtended.moderatorPeerIdFormatHint')}
            </p>
            <Button variant="link" asChild className="h-auto p-0 text-primary">
              <Link
                href={moderatorDirectoryAddFromStoreHref()}
                onClick={() => setShowAddModal(false)}
              >
                {t('settingsExtended.addFromMarketplace')}
              </Link>
            </Button>
            <Input
              value={newPeerId}
              onChange={e => setNewPeerId(e.target.value)}
              placeholder={t('moderator.customPeerIdPlaceholder')}
              disabled={isSaving}
              className="font-mono text-sm"
            />

            {peerLookup.isLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                {t('settingsExtended.moderatorPreviewLoading')}
              </div>
            )}

            {previewError && !peerLookup.isLoading && (
              <p className="text-sm text-destructive" role="alert">
                {previewError}
              </p>
            )}

            {previewModeratorCard && peerLookup.isReady && (
              <ModeratorProfilePreview moderator={previewModeratorCard} className="bg-card" />
            )}

            <Button
              className={cn(
                'w-full min-h-[44px]',
                previewIsAlreadyAdded && ADDED_TO_STORE_BUTTON_CLASS
              )}
              variant={previewIsAlreadyAdded ? 'outline' : 'default'}
              onClick={handleAddModerator}
              disabled={
                isSaving || peerLookup.isLoading || !peerLookup.isReady || previewIsAlreadyAdded
              }
            >
              {previewIsAlreadyAdded ? (
                <>
                  <Check className="w-4 h-4 mr-1.5" />
                  {t('moderator.addedToStore')}
                </>
              ) : (
                t('common.add')
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!removeTarget} onOpenChange={() => setRemoveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('settingsExtended.removeModerator')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('settingsExtended.removeModeratorDesc', { name: removeTarget?.name || '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveModerator} disabled={isSaving}>
              {t('settingsExtended.remove')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export interface StoreModeratorsHeaderProps {
  onAdd: () => void;
}
