'use client';

import React, { useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { moderatorDirectoryAddFromStoreHref } from '@/lib/routes/moderators';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
} from '@mobazha/core';
import type { Moderator as ApiModerator } from '@mobazha/core/services/api/moderators';
import type { Moderator } from '@/components/Payment/types';
import {
  ADDED_TO_STORE_BADGE_CLASS,
  mapApiModeratorToModerator,
} from '@/components/Moderators/moderatorDisplay';
import { ModeratorProfilePreview } from '@/components/Moderators/ModeratorProfilePreview';
import { ModeratorExpandableRow } from '@/components/Moderators/ModeratorExpandableRow';
import { Plus, Scale, Trash2, RefreshCw, Loader2, Check } from 'lucide-react';

function mapApiModeratorToCard(mod: ApiModerator, verifiedPeerIds: Set<string>): Moderator {
  return mapApiModeratorToModerator(mod, verifiedPeerIds);
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
            <ModeratorExpandableRow
              key={moderator.peerID}
              moderator={moderator}
              detailModerator={expandedPeerID === moderator.peerID ? expandedDetailCard : null}
              isDetailLoading={expandedPeerID === moderator.peerID && isExpandedDetailLoading}
              expanded={expandedPeerID === moderator.peerID}
              onToggle={() =>
                setExpandedPeerID(prev => (prev === moderator.peerID ? null : moderator.peerID))
              }
              trailing={
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t('settingsExtended.removeModerator')}
                  disabled={isSaving}
                  className="min-h-[44px] min-w-[44px] text-destructive hover:text-destructive"
                  onClick={() => setRemoveTarget(moderator)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              }
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

            {previewIsAlreadyAdded ? (
              <div className="flex justify-center">
                <Badge
                  variant="outline"
                  className={cn('min-h-[44px] px-4 text-sm', ADDED_TO_STORE_BADGE_CLASS)}
                >
                  <Check className="mr-2 h-4 w-4" aria-hidden />
                  {t('moderator.addedToStore')}
                </Badge>
              </div>
            ) : (
              <Button
                className="w-full min-h-[44px]"
                onClick={handleAddModerator}
                disabled={isSaving || peerLookup.isLoading || !peerLookup.isReady}
              >
                {t('common.add')}
              </Button>
            )}
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
