'use client';

import React, { useState } from 'react';
import Link from 'next/link';
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
import { ChevronLeft, Plus, Ban, UserX } from 'lucide-react';

interface BlockedUser {
  id: string;
  peerId: string;
  name: string;
  avatar?: string;
  blockedAt: string;
}

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
        <h1 className="text-xl font-semibold">{t('settings.sidebar.blocked')}</h1>
        <Button size="sm" onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          {t('settingsModal.blockUser')}
        </Button>
      </div>

      {blockedUsers.length === 0 ? (
        <Card className="p-8 text-center">
          <Ban className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">{t('settingsModal.noBlockedUsers')}</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {blockedUsers.map(user => (
            <Card key={user.id} className="p-4">
              <div className="flex items-center justify-between">
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
            </Card>
          ))}
        </div>
      )}

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
              {t('settingsModal.unblockConfirmDesc', { name: unblockTarget?.name })}
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
