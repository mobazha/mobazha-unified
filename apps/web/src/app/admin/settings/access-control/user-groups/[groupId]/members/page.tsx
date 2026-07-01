'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { HStack, VStack } from '@/components/layouts';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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
} from '@/components/ui';
import { useUserGroups, useUserStore, useI18n, type UserGroupMember } from '@mobazha/core';
import { Loader2, ChevronLeft, Trash2, Users, UserPlus } from 'lucide-react';
import { SettingsReferrerBanner } from '@/components/SettingsContent';

export default function AdminUserGroupMembersPage() {
  const params = useParams();
  const groupId = parseInt(params.groupId as string);
  const { t } = useI18n();

  const { profile, isAuthenticated } = useUserStore();
  const ownerPeerID = profile?.peerID || '';

  const { groups, loadGroups, loadMembers, addMember, removeMember } = useUserGroups({
    ownerPeerID,
    autoLoad: false,
  });

  const [members, setMembers] = useState<UserGroupMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newMemberPeerID, setNewMemberPeerID] = useState('');
  const [adding, setAdding] = useState(false);

  const [removingMemberId, setRemovingMemberId] = useState<number | null>(null);

  const currentGroup = groups.find(g => g.id === groupId);

  useEffect(() => {
    const loadData = async () => {
      if (!isAuthenticated || !ownerPeerID || isNaN(groupId)) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        await loadGroups(ownerPeerID);
        const groupMembers = await loadMembers(groupId);
        setMembers(groupMembers);
      } catch (err) {
        setError(err instanceof Error ? err.message : t('common.loadFailed'));
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [isAuthenticated, ownerPeerID, groupId, loadGroups, loadMembers, t]);

  const handleAddMember = useCallback(async () => {
    if (!newMemberPeerID.trim()) return;

    setAdding(true);
    setError(null);

    try {
      const result = await addMember(groupId, newMemberPeerID.trim());
      if (result) {
        setMembers(prev => [...prev, result]);
        setShowAddModal(false);
        setNewMemberPeerID('');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.addFailed'));
    } finally {
      setAdding(false);
    }
  }, [groupId, newMemberPeerID, addMember, t]);

  const handleRemoveMember = useCallback(async () => {
    if (removingMemberId === null) return;

    setError(null);

    try {
      const success = await removeMember(groupId, removingMemberId);
      if (success) {
        setMembers(prev => prev.filter(m => m.id !== removingMemberId));
        setRemovingMemberId(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.removeFailed'));
    }
  }, [groupId, removingMemberId, removeMember, t]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!currentGroup) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground mb-4">
          {t('settings.accessControl.userGroupNotFound')}
        </p>
        <Link href="/admin/settings/access-control/user-groups">
          <Button>{t('common.back')}</Button>
        </Link>
      </Card>
    );
  }

  return (
    <div>
      <SettingsReferrerBanner />

      <div className="mb-6">
        <Link
          href="/admin/settings/access-control/user-groups"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          {t('settings.sidebar.userGroups')}
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-lg font-semibold">
            {currentGroup.name} - {t('common.members')}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {members.length} {t('common.members')}
          </p>
        </div>
        <Button onClick={() => setShowAddModal(true)} disabled={!isAuthenticated} size="sm">
          <UserPlus className="w-4 h-4 sm:mr-2" />
          <span className="hidden sm:inline">{t('settings.accessControl.addMember')}</span>
        </Button>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive p-4 rounded-lg mb-6">{error}</div>
      )}

      <Card className="p-4 sm:p-6">
        {members.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground mb-4">{t('settings.accessControl.noMembers')}</p>
            <Button onClick={() => setShowAddModal(true)}>
              <UserPlus className="w-4 h-4 mr-2" />
              {t('settings.accessControl.addFirstMember')}
            </Button>
          </div>
        ) : (
          <VStack gap="sm">
            {members.map(member => (
              <div
                key={member.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{member.peerID}</p>
                    <p className="text-xs text-muted-foreground">
                      {t('settings.accessControl.addedOn')}{' '}
                      {new Date(member.addedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive shrink-0"
                  onClick={() => setRemovingMemberId(member.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </VStack>
        )}
      </Card>

      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('settings.accessControl.addMember')}</DialogTitle>
          </DialogHeader>

          <VStack gap="md">
            <div>
              <label className="block text-sm font-medium mb-2">Peer ID</label>
              <Input
                value={newMemberPeerID}
                onChange={e => setNewMemberPeerID(e.target.value)}
                placeholder={t('settings.accessControl.peerIdPlaceholder')}
              />
              <p className="text-xs text-muted-foreground mt-2">
                {t('settings.accessControl.peerIdHint')}
              </p>
            </div>
          </VStack>

          <HStack justify="end" gap="sm" className="mt-6">
            <Button variant="ghost" onClick={() => setShowAddModal(false)} disabled={adding}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleAddMember} disabled={!newMemberPeerID.trim() || adding}>
              {adding && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {t('common.add')}
            </Button>
          </HStack>
        </DialogContent>
      </Dialog>

      <AlertDialog open={removingMemberId !== null} onOpenChange={() => setRemovingMemberId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('settings.accessControl.removeMember')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('settings.accessControl.removeMemberConfirm')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleRemoveMember}
            >
              {t('common.remove')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
