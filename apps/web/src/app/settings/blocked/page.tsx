'use client';

import React, { useState } from 'react';
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
import { AvatarCompat as Avatar } from '@/components/ui/avatar-compat';
import { SettingsPageHeader } from '@/components/SettingsLayout';
import { Plus, Ban, UserX } from 'lucide-react';

interface BlockedUser {
  id: string;
  peerId: string;
  name: string;
  avatar?: string;
  blockedAt: string;
}

// TODO: 集成真实 API - 替换 mock 数据，使用后端黑名单管理 API
const mockBlockedUsers: BlockedUser[] = [
  {
    id: '1',
    peerId: 'QmYjL9N8X...',
    name: 'Spammer123',
    blockedAt: '2025-01-05',
  },
  {
    id: '2',
    peerId: 'QmZkM7P9Y...',
    name: 'BadActor',
    blockedAt: '2025-01-03',
  },
];

export default function BlockedSettingsPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>(mockBlockedUsers);
  const [showAddModal, setShowAddModal] = useState(false);
  const [unblockTarget, setUnblockTarget] = useState<BlockedUser | null>(null);
  const [newPeerId, setNewPeerId] = useState('');

  const handleBlockUser = () => {
    if (!newPeerId.trim()) {
      toast({
        title: t('common.error'),
        description: t('settingsModal.peerIdRequired'),
        variant: 'destructive',
      });
      return;
    }

    const newBlockedUser: BlockedUser = {
      id: Date.now().toString(),
      peerId: newPeerId.trim(),
      name: 'Unknown User',
      blockedAt: new Date().toISOString().split('T')[0],
    };

    setBlockedUsers([...blockedUsers, newBlockedUser]);
    setShowAddModal(false);
    setNewPeerId('');
    toast({ title: t('common.success'), description: t('settingsModal.userBlocked') });
  };

  const handleUnblock = () => {
    if (unblockTarget) {
      setBlockedUsers(blockedUsers.filter(u => u.id !== unblockTarget.id));
      toast({ title: t('common.success'), description: t('settingsModal.userUnblocked') });
      setUnblockTarget(null);
    }
  };

  return (
    <div>
      <SettingsPageHeader
        title={t('settings.sidebar.blocked')}
        description={t('settingsModal.blockedDescription')}
        actions={
          <Button size="sm" onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            {t('settingsModal.blockUser')}
          </Button>
        }
      />

      <Card className="p-4 md:p-6">
        {blockedUsers.length === 0 ? (
          <div className="text-center py-4">
            <Ban className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">{t('settingsModal.noBlockedUsers')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {blockedUsers.map(user => (
              <div
                key={user.id}
                className="flex items-center justify-between py-3 first:pt-0 last:pb-0 [&:not(:last-child)]:border-b border-border"
              >
                <div className="flex items-center gap-3">
                  <Avatar name={user.name} size="md" />
                  <div>
                    <p className="font-medium">{user.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{user.peerId}</p>
                    <p className="text-xs text-muted-foreground">
                      {t('settingsModal.blockedOn')}: {user.blockedAt}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setUnblockTarget(user)}
                  className="text-destructive border-destructive hover:bg-destructive/10"
                >
                  <UserX className="w-4 h-4 mr-2" />
                  {t('settingsModal.unblock')}
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Add Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('settingsModal.blockUser')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-3">
                {t('settingsModal.blockUserDesc')}
              </p>
              <Input
                value={newPeerId}
                onChange={e => setNewPeerId(e.target.value)}
                placeholder={t('settingsModal.enterPeerId')}
              />
            </div>
            <Button className="w-full" onClick={handleBlockUser}>
              {t('settingsModal.block')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Unblock Confirmation */}
      <AlertDialog open={!!unblockTarget} onOpenChange={() => setUnblockTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('settingsModal.unblockConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('settingsModal.unblockConfirmDesc', { name: unblockTarget?.name || '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnblock}>
              {t('settingsModal.unblock')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
