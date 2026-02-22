'use client';

import React, { useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { useI18n } from '@mobazha/core';
import { SettingsPageHeader } from '@/components/SettingsLayout';
import { ModeratorCard } from '@/components/Payment/ModeratorCard';
import type { Moderator } from '@/components/Payment/types';
import { Plus, Scale, Trash2 } from 'lucide-react';
import { AvatarCompat as Avatar } from '@/components/ui/avatar-compat';

const mockStoreModerators: Moderator[] = [
  {
    peerID: 'QmABC123...',
    name: 'Trusted Moderator',
    description: 'Experienced dispute resolution specialist with 5+ years in e-commerce mediation.',
    languages: ['en', 'zh'],
    fee: {
      feeType: 'percentage',
      percentage: 1,
    },
    verifiedMod: true,
    stats: {
      rating: 4.8,
      ratingCount: 156,
      disputesHandled: 89,
      averageResolutionTime: 48,
      successRate: 95,
    },
  },
];

export default function StoreModeratorsPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const [moderators, setModerators] = useState<Moderator[]>(mockStoreModerators);
  const [showAddModal, setShowAddModal] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<Moderator | null>(null);
  const [selectedModerator, setSelectedModerator] = useState<Moderator | null>(null);
  const [newPeerId, setNewPeerId] = useState('');

  const handleAddModerator = useCallback(() => {
    if (!newPeerId.trim()) {
      toast({
        title: t('common.error'),
        description: t('settingsModal.peerIdRequired'),
        variant: 'destructive',
      });
      return;
    }

    const newModerator: Moderator = {
      peerID: newPeerId.trim(),
      name: 'New Moderator',
      fee: {
        feeType: 'percentage',
        percentage: 1,
      },
    };

    setModerators(prev => [...prev, newModerator]);
    setShowAddModal(false);
    setNewPeerId('');
    toast({ title: t('common.success'), description: t('settingsModal.moderatorAdded') });
  }, [newPeerId, toast, t]);

  const handleRemoveModerator = useCallback(() => {
    if (removeTarget) {
      setModerators(prev => prev.filter(m => m.peerID !== removeTarget.peerID));
      toast({ title: t('common.success'), description: t('settingsModal.moderatorRemoved') });
      setRemoveTarget(null);
    }
  }, [removeTarget, toast, t]);

  return (
    <div>
      <SettingsPageHeader
        title={t('settingsExtended.storeModerators')}
        description={t('settingsExtended.storeModeratorsDesc')}
        backHref="/settings/store"
        actions={
          <Button size="sm" onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            {t('settingsModal.addModerator')}
          </Button>
        }
      />

      {moderators.length === 0 ? (
        <Card className="p-4 md:p-6">
          <div className="text-center py-8">
            <Scale className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">{t('settingsModal.noModerators')}</p>
            <Button className="mt-4" onClick={() => setShowAddModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              {t('settingsModal.addModerator')}
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {moderators.map(moderator => (
            <div key={moderator.peerID} className="relative group">
              <ModeratorCard
                moderator={moderator}
                selected={selectedModerator?.peerID === moderator.peerID}
                onClick={() =>
                  setSelectedModerator(prev =>
                    prev?.peerID === moderator.peerID ? null : moderator
                  )
                }
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-3 right-3 text-destructive hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={e => {
                  e.stopPropagation();
                  setRemoveTarget(moderator);
                }}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Selected moderator detail */}
      {selectedModerator && (
        <div className="mt-6">
          <div className="mb-4">
            <h2 className="text-base font-semibold">{t('settingsExtended.moderatorDetails')}</h2>
          </div>
          <Card className="p-4 md:p-6 space-y-4">
            <div className="flex items-center gap-3">
              <Avatar name={selectedModerator.name} size="lg" />
              <div>
                <p className="font-semibold text-lg">{selectedModerator.name}</p>
                <p className="text-xs text-muted-foreground font-mono">
                  {selectedModerator.peerID}
                </p>
              </div>
            </div>

            {selectedModerator.description && (
              <div>
                <p className="text-sm font-medium mb-1">
                  {t('settingsExtended.detailedDescription')}
                </p>
                <p className="text-sm text-muted-foreground">{selectedModerator.description}</p>
              </div>
            )}

            {selectedModerator.stats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 rounded-lg bg-muted text-center">
                  <p className="text-lg font-bold">{selectedModerator.stats.rating}</p>
                  <p className="text-xs text-muted-foreground">{t('settingsExtended.rating')}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted text-center">
                  <p className="text-lg font-bold">{selectedModerator.stats.disputesHandled}</p>
                  <p className="text-xs text-muted-foreground">{t('settingsExtended.disputes')}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted text-center">
                  <p className="text-lg font-bold">{selectedModerator.stats.successRate}%</p>
                  <p className="text-xs text-muted-foreground">
                    {t('settingsExtended.successRate')}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-muted text-center">
                  <p className="text-lg font-bold">
                    {selectedModerator.stats.averageResolutionTime}h
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t('settingsExtended.avgResolution')}
                  </p>
                </div>
              </div>
            )}

            {selectedModerator.termsAndConditions && (
              <div>
                <p className="text-sm font-medium mb-1">{t('settingsExtended.moderatorTerms')}</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {selectedModerator.termsAndConditions}
                </p>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Add Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('settingsModal.addModerator')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{t('settingsModal.addModeratorDesc')}</p>
            <Input
              value={newPeerId}
              onChange={e => setNewPeerId(e.target.value)}
              placeholder={t('settingsModal.enterPeerId')}
            />
            <Button className="w-full" onClick={handleAddModerator}>
              {t('common.add')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Remove Confirmation */}
      <AlertDialog open={!!removeTarget} onOpenChange={() => setRemoveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('settingsExtended.removeModerator')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('settingsExtended.removeModeratorDesc', {
                name: removeTarget?.name || '',
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveModerator}>
              {t('settingsExtended.remove')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
