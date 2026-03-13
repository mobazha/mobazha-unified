'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
import { socialApi, useI18n } from '@mobazha/core';
import { AvatarCompat as Avatar } from '@/components/ui/avatar-compat';
import { SettingsPageHeader } from '@/components/SettingsLayout';
import { Plus, Ban, UserX, Loader2 } from 'lucide-react';

interface BlockedUser {
  peerId: string;
  name: string;
}

export default function BlockedSettingsPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [unblockTarget, setUnblockTarget] = useState<BlockedUser | null>(null);
  const [newPeerId, setNewPeerId] = useState('');
  const [isBlocking, setIsBlocking] = useState(false);
  const [isUnblocking, setIsUnblocking] = useState(false);

  const fetchBlockedUsers = useCallback(async () => {
    try {
      const peerIds = await socialApi.getBlockedNodes();
      let users: BlockedUser[] = peerIds.map(id => ({ peerId: id, name: '' }));

      if (peerIds.length > 0) {
        try {
          const profiles = await socialApi.fetchProfiles(peerIds);
          users = peerIds.map(id => {
            const profile = profiles.find(p => p.peerID === id);
            return {
              peerId: id,
              name: profile?.name || '',
            };
          });
        } catch {
          /* profiles are best-effort */
        }
      }

      setBlockedUsers(users);
    } catch {
      toast({
        title: t('common.error'),
        description: t('settingsModal.loadBlockedFailed', {
          defaultValue: 'Failed to load blocked users',
        }),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [t, toast]);

  useEffect(() => {
    fetchBlockedUsers();
  }, [fetchBlockedUsers]);

  const handleBlockUser = async () => {
    const trimmed = newPeerId.trim();
    if (!trimmed) {
      toast({
        title: t('common.error'),
        description: t('settingsModal.peerIdRequired'),
        variant: 'destructive',
      });
      return;
    }

    if (blockedUsers.some(u => u.peerId === trimmed)) {
      toast({
        title: t('common.error'),
        description: t('settingsModal.alreadyBlocked', {
          defaultValue: 'This user is already blocked',
        }),
        variant: 'destructive',
      });
      return;
    }

    setIsBlocking(true);
    try {
      const result = await socialApi.blockUser(trimmed);
      if (result.success) {
        setBlockedUsers(prev => [...prev, { peerId: trimmed, name: '' }]);
        setShowAddModal(false);
        setNewPeerId('');
        toast({ title: t('common.success'), description: t('settingsModal.userBlocked') });
      } else {
        toast({
          title: t('common.error'),
          description:
            result.error ||
            t('settingsModal.blockFailed', { defaultValue: 'Failed to block user' }),
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: t('common.error'),
        description: t('settingsModal.blockFailed', { defaultValue: 'Failed to block user' }),
        variant: 'destructive',
      });
    } finally {
      setIsBlocking(false);
    }
  };

  const handleUnblock = async () => {
    if (!unblockTarget) return;

    setIsUnblocking(true);
    try {
      const result = await socialApi.unblockUser(unblockTarget.peerId);
      if (result.success) {
        setBlockedUsers(prev => prev.filter(u => u.peerId !== unblockTarget.peerId));
        toast({ title: t('common.success'), description: t('settingsModal.userUnblocked') });
      } else {
        toast({
          title: t('common.error'),
          description:
            result.error ||
            t('settingsModal.unblockFailed', { defaultValue: 'Failed to unblock user' }),
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: t('common.error'),
        description: t('settingsModal.unblockFailed', { defaultValue: 'Failed to unblock user' }),
        variant: 'destructive',
      });
    } finally {
      setIsUnblocking(false);
      setUnblockTarget(null);
    }
  };

  const truncatePeerId = (id: string) =>
    id.length > 16 ? `${id.slice(0, 8)}...${id.slice(-6)}` : id;

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
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : blockedUsers.length === 0 ? (
          <div className="text-center py-4">
            <Ban className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">{t('settingsModal.noBlockedUsers')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {blockedUsers.map(user => (
              <div
                key={user.peerId}
                className="flex items-center justify-between py-3 first:pt-0 last:pb-0 [&:not(:last-child)]:border-b border-border"
              >
                <div className="flex items-center gap-3">
                  <Avatar name={user.name || user.peerId} size="md" />
                  <div>
                    {user.name && <p className="font-medium">{user.name}</p>}
                    <p className="text-xs text-muted-foreground font-mono" title={user.peerId}>
                      {truncatePeerId(user.peerId)}
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
            <Button className="w-full" onClick={handleBlockUser} disabled={isBlocking}>
              {isBlocking && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {t('settingsModal.block')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!unblockTarget} onOpenChange={() => setUnblockTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('settingsModal.unblockConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('settingsModal.unblockConfirmDesc', {
                name: unblockTarget?.name || truncatePeerId(unblockTarget?.peerId || ''),
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnblock} disabled={isUnblocking}>
              {isUnblocking && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {t('settingsModal.unblock')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
