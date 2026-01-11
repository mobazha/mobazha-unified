'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, useToast } from '@/components/ui';
import { useI18n } from '@mobazha/core';
import { AvatarCompat as Avatar } from '@/components/ui/avatar-compat';
import { ChevronLeft, Plus, Scale, Trash2 } from 'lucide-react';

interface Moderator {
  id: string;
  peerId: string;
  name: string;
  avatar?: string;
  fee: string;
  addedAt: string;
}

const mockModerators: Moderator[] = [
  {
    id: '1',
    peerId: 'QmABC123...',
    name: 'Trusted Moderator',
    fee: '1%',
    addedAt: '2025-01-01',
  },
];

export default function ModerationSettingsPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const [moderators, setModerators] = useState<Moderator[]>(mockModerators);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPeerId, setNewPeerId] = useState('');

  const handleAddModerator = () => {
    if (!newPeerId.trim()) {
      toast({
        title: t('common.error'),
        description: t('settingsModal.peerIdRequired'),
        variant: 'destructive',
      });
      return;
    }

    const newModerator: Moderator = {
      id: Date.now().toString(),
      peerId: newPeerId.trim(),
      name: 'New Moderator',
      fee: '1%',
      addedAt: new Date().toISOString().split('T')[0],
    };

    setModerators([...moderators, newModerator]);
    setShowAddModal(false);
    setNewPeerId('');
    toast({ title: t('common.success'), description: t('settingsModal.moderatorAdded') });
  };

  const handleRemoveModerator = (id: string) => {
    setModerators(moderators.filter(m => m.id !== id));
    toast({ title: t('common.success'), description: t('settingsModal.moderatorRemoved') });
  };

  return (
    <div>
      {/* 移动端返回按钮 */}
      <div className="lg:hidden mb-4">
        <Link
          href="/settings"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>{t('common.back')}</span>
        </Link>
      </div>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold">{t('settings.sidebar.moderation')}</h1>
        <Button size="sm" onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          {t('settingsModal.addModerator')}
        </Button>
      </div>

      <Card className="p-4 mb-6 bg-muted/50">
        <p className="text-sm text-muted-foreground">{t('settingsModal.moderationDesc')}</p>
      </Card>

      {moderators.length === 0 ? (
        <Card className="p-8 text-center">
          <Scale className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">{t('settingsModal.noModerators')}</p>
          <Button className="mt-4" onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            {t('settingsModal.addModerator')}
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {moderators.map(moderator => (
            <Card key={moderator.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar name={moderator.name} size="md" />
                  <div>
                    <p className="font-medium">{moderator.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{moderator.peerId}</p>
                    <p className="text-xs text-muted-foreground">
                      {t('settingsModal.fee')}: {moderator.fee}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive"
                  onClick={() => handleRemoveModerator(moderator.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('settingsModal.addModerator')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-3">
                {t('settingsModal.addModeratorDesc')}
              </p>
              <Input
                value={newPeerId}
                onChange={e => setNewPeerId(e.target.value)}
                placeholder={t('settingsModal.enterPeerId')}
              />
            </div>
            <Button className="w-full" onClick={handleAddModerator}>
              {t('common.add')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
